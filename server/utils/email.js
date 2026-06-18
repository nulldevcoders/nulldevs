'use strict';

const nodemailer = require('nodemailer');
const logger     = require('../utils/logger');

let transporter = null;

/**
 * Lazily create the transporter on first use.
 * If SMTP creds aren't set, fall back to logging (dev mode).
 */
function getTransporter() {
  if (transporter) return transporter;

  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS } = process.env;

  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) {
    logger.warn('SMTP not configured — emails will be logged to console only.');
    return null;
  }

  transporter = nodemailer.createTransport({
    host:   SMTP_HOST,
    port:   parseInt(SMTP_PORT || '587', 10),
    secure: parseInt(SMTP_PORT || '587', 10) === 465,
    auth: { user: SMTP_USER, pass: SMTP_PASS },
    tls:  { rejectUnauthorized: process.env.NODE_ENV === 'production' },
    pool:  true,
    maxConnections: 5,
    rateDelta: 20000,
    rateLimit: 5,
  });

  return transporter;
}

/**
 * Send the internal notification email to the team
 */
async function sendContactNotification({ name, email, company, service, budget, message, ip, timestamp }) {
  const t = getTransporter();

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background:#f6f8fa; margin:0; padding:32px 0; }
    .wrap { max-width:600px; margin:0 auto; background:#fff; border-radius:12px; overflow:hidden; border:1px solid #e8ecf2; }
    .header { background:#0A0D14; padding:28px 32px; }
    .logo { color:#fff; font-size:18px; font-weight:800; letter-spacing:.16em; }
    .logo span { color:#1FD1B0; }
    .badge { display:inline-block; background:rgba(31,209,176,.15); color:#1FD1B0; font-size:11px; font-weight:600; letter-spacing:.1em; text-transform:uppercase; padding:4px 10px; border-radius:20px; margin-top:8px; }
    .body { padding:32px; }
    .label { font-size:11px; font-weight:600; letter-spacing:.1em; text-transform:uppercase; color:#9aa3b2; margin-bottom:4px; }
    .value { font-size:16px; color:#0A0D14; font-weight:500; margin-bottom:20px; }
    .message-box { background:#f6f8fa; border-radius:8px; padding:16px; border-left:3px solid #1FD1B0; }
    .message-text { font-size:15px; color:#3d4451; line-height:1.6; margin:0; }
    .meta { margin-top:24px; padding-top:20px; border-top:1px solid #e8ecf2; font-size:12px; color:#9aa3b2; }
    .footer { background:#f6f8fa; padding:16px 32px; font-size:12px; color:#9aa3b2; border-top:1px solid #e8ecf2; }
  </style>
</head>
<body>
  <div class="wrap">
    <div class="header">
      <div class="logo">NULL<span>DEVS</span></div>
      <div class="badge">New Lead 🚀</div>
    </div>
    <div class="body">
      <div class="label">Name</div>
      <div class="value">${escHtml(name)}</div>

      <div class="label">Email</div>
      <div class="value"><a href="mailto:${escHtml(email)}" style="color:#1FD1B0">${escHtml(email)}</a></div>

      ${company ? `<div class="label">Company</div><div class="value">${escHtml(company)}</div>` : ''}
      ${service ? `<div class="label">Service</div><div class="value">${escHtml(service)}</div>` : ''}
      ${budget  ? `<div class="label">Budget</div><div class="value">${escHtml(budget)}</div>` : ''}

      <div class="label">Message</div>
      <div class="message-box">
        <p class="message-text">${escHtml(message).replace(/\n/g, '<br>')}</p>
      </div>

      <div class="meta">
        Submitted at ${timestamp} · IP: ${ip || 'unknown'}
      </div>
    </div>
    <div class="footer">
      NULL DEVS · Reply directly to this email to respond to ${escHtml(name)}
    </div>
  </div>
</body>
</html>`.trim();

  const text = [
    'NEW LEAD — NULL DEVS',
    '─'.repeat(40),
    `Name:    ${name}`,
    `Email:   ${email}`,
    company ? `Company: ${company}` : null,
    service ? `Service: ${service}` : null,
    budget  ? `Budget:  ${budget}`  : null,
    '',
    'Message:',
    message,
    '',
    `Submitted: ${timestamp}`,
    `IP: ${ip || 'unknown'}`,
  ].filter(l => l !== null).join('\n');

  const mailOptions = {
    from:     `"NULL DEVS Contact" <${process.env.CONTACT_FROM || process.env.SMTP_USER}>`,
    to:       process.env.CONTACT_TO || process.env.SMTP_USER,
    replyTo:  `"${name}" <${email}>`,
    subject:  `[NULL DEVS] New inquiry from ${name}${company ? ` @ ${company}` : ''}`,
    text,
    html,
  };

  if (!t) {
    logger.info('📧 [EMAIL LOG — SMTP not configured]\n', text);
    return { logged: true };
  }

  const info = await t.sendMail(mailOptions);
  logger.info(`Email sent: ${info.messageId}`);
  return info;
}

/**
 * Send auto-reply to the person who submitted the form
 */
async function sendAutoReply({ name, email }) {
  const t = getTransporter();

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background:#f6f8fa; margin:0; padding:32px 0; }
    .wrap { max-width:600px; margin:0 auto; background:#fff; border-radius:12px; overflow:hidden; border:1px solid #e8ecf2; }
    .header { background:#0A0D14; padding:32px; text-align:center; }
    .logo { color:#fff; font-size:22px; font-weight:800; letter-spacing:.16em; }
    .logo span { color:#1FD1B0; }
    .tagline { color:#9aa3b2; font-size:13px; margin-top:6px; }
    .body { padding:40px 32px; }
    h2 { font-size:24px; color:#0A0D14; margin:0 0 12px; font-weight:700; }
    p { font-size:15px; color:#5F6673; line-height:1.65; margin:0 0 16px; }
    .cta { display:inline-block; background:#0A0D14; color:#fff !important; text-decoration:none; padding:14px 28px; border-radius:12px; font-weight:600; font-size:15px; margin-top:8px; }
    .bullet { display:flex; align-items:flex-start; gap:12px; margin-bottom:10px; }
    .dot { width:7px; height:7px; border-radius:50%; background:#1FD1B0; flex-shrink:0; margin-top:6px; }
    .bullet-text { font-size:14.5px; color:#5F6673; }
    .footer { background:#f6f8fa; padding:20px 32px; text-align:center; font-size:12px; color:#9aa3b2; border-top:1px solid #e8ecf2; }
  </style>
</head>
<body>
  <div class="wrap">
    <div class="header">
      <div class="logo">NULL<span>DEVS</span></div>
      <div class="tagline">AI-native software engineering</div>
    </div>
    <div class="body">
      <h2>Thanks, ${escHtml(name)}. We've got your message.</h2>
      <p>We'll review your inquiry and get back to you within <strong>1 business day</strong>. In the meantime, here's what to expect:</p>

      <div class="bullet"><div class="dot"></div><div class="bullet-text"><strong>Discovery call</strong> — A 30-min session to understand your goals, constraints, and what success looks like.</div></div>
      <div class="bullet"><div class="dot"></div><div class="bullet-text"><strong>Technical proposal</strong> — A clear scope, architecture recommendation, and timeline—no boilerplate.</div></div>
      <div class="bullet"><div class="dot"></div><div class="bullet-text"><strong>Partnership</strong> — If it's a fit, we get started fast. Most projects kick off within a week.</div></div>

      <p style="margin-top:24px;">If you have anything to add or want to reach us directly:</p>
      <a href="mailto:hello@nulldevs.io" class="cta">Reply to this email →</a>
    </div>
    <div class="footer">
      NULL DEVS · Engineered, not templated.<br>
      <a href="https://nulldevs.io" style="color:#1FD1B0">nulldevs.io</a>
    </div>
  </div>
</body>
</html>`.trim();

  const mailOptions = {
    from:    `"NULL DEVS" <${process.env.CONTACT_FROM || process.env.SMTP_USER}>`,
    to:      `"${name}" <${email}>`,
    subject: `We received your message — NULL DEVS`,
    text: `Hi ${name},\n\nThanks for reaching out! We've received your message and will get back to you within 1 business day.\n\nIn the meantime, if you need anything urgently, just reply to this email.\n\nBest,\nThe NULL DEVS Team\nhello@nulldevs.io`,
    html,
  };

  if (!t) {
    logger.info(`📧 [AUTO-REPLY LOG] Would send to ${email}`);
    return { logged: true };
  }

  return t.sendMail(mailOptions);
}

function escHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

module.exports = { sendContactNotification, sendAutoReply };
