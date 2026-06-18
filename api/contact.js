'use strict';

const nodemailer = require('nodemailer');

// ─── Rate limiting (in-memory, per serverless instance) ──────────────────────
const ipMap = new Map();
function isRateLimited(ip) {
  const now = Date.now();
  const windowMs = 60 * 60 * 1000; // 1 hour
  const max = 5;
  const entry = ipMap.get(ip) || { count: 0, start: now };
  if (now - entry.start > windowMs) {
    ipMap.set(ip, { count: 1, start: now });
    return false;
  }
  if (entry.count >= max) return true;
  ipMap.set(ip, { count: entry.count + 1, start: entry.start });
  return false;
}

// ─── Validation ───────────────────────────────────────────────────────────────
function validateEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function escHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#039;');
}

// ─── Spam detection ───────────────────────────────────────────────────────────
const SPAM = [/\b(viagra|casino|crypto pump|forex|loan offer)\b/i, /\b(click here|buy now|earn money fast)\b/i];
function isSpam(fields) {
  const text = Object.values(fields).join(' ');
  return SPAM.some(re => re.test(text));
}

// ─── Email ────────────────────────────────────────────────────────────────────
function getTransporter() {
  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS } = process.env;
  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) return null;
  return nodemailer.createTransport({
    host: SMTP_HOST,
    port: parseInt(SMTP_PORT || '587', 10),
    secure: parseInt(SMTP_PORT || '587', 10) === 465,
    auth: { user: SMTP_USER, pass: SMTP_PASS },
    tls: { rejectUnauthorized: true },
  });
}

async function sendNotification({ name, email, company, service, budget, message, ip, timestamp }) {
  const t = getTransporter();
  const html = `
<!DOCTYPE html><html><head><meta charset="utf-8">
<style>body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#f6f8fa;margin:0;padding:32px 0}
.wrap{max-width:600px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;border:1px solid #e8ecf2}
.header{background:#0A0D14;padding:28px 32px}.logo{color:#fff;font-size:18px;font-weight:800;letter-spacing:.16em}
.logo span{color:#1FD1B0}.badge{display:inline-block;background:rgba(31,209,176,.15);color:#1FD1B0;font-size:11px;font-weight:600;letter-spacing:.1em;text-transform:uppercase;padding:4px 10px;border-radius:20px;margin-top:8px}
.body{padding:32px}.label{font-size:11px;font-weight:600;letter-spacing:.1em;text-transform:uppercase;color:#9aa3b2;margin-bottom:4px}
.value{font-size:16px;color:#0A0D14;font-weight:500;margin-bottom:20px}
.msg{background:#f6f8fa;border-radius:8px;padding:16px;border-left:3px solid #1FD1B0;font-size:15px;color:#3d4451;line-height:1.6}
.meta{margin-top:24px;padding-top:20px;border-top:1px solid #e8ecf2;font-size:12px;color:#9aa3b2}
.footer{background:#f6f8fa;padding:16px 32px;font-size:12px;color:#9aa3b2;border-top:1px solid #e8ecf2}</style></head>
<body><div class="wrap">
<div class="header"><div class="logo">NULL<span>DEVS</span></div><div class="badge">New Lead 🚀</div></div>
<div class="body">
<div class="label">Name</div><div class="value">${escHtml(name)}</div>
<div class="label">Email</div><div class="value"><a href="mailto:${escHtml(email)}" style="color:#1FD1B0">${escHtml(email)}</a></div>
${company ? `<div class="label">Company</div><div class="value">${escHtml(company)}</div>` : ''}
${service ? `<div class="label">Service</div><div class="value">${escHtml(service)}</div>` : ''}
${budget  ? `<div class="label">Budget</div><div class="value">${escHtml(budget)}</div>` : ''}
<div class="label">Message</div><div class="msg">${escHtml(message).replace(/\n/g,'<br>')}</div>
<div class="meta">Submitted: ${timestamp} · IP: ${ip}</div>
</div>
<div class="footer">NULL DEVS · Reply to respond to ${escHtml(name)}</div>
</div></body></html>`;

  const text = `NEW LEAD — NULL DEVS\nName: ${name}\nEmail: ${email}\n${company?'Company: '+company+'\n':''}${service?'Service: '+service+'\n':''}${budget?'Budget: '+budget+'\n':''}\nMessage:\n${message}\n\nSubmitted: ${timestamp}`;

  if (!t) { console.log('📧 [LOG - no SMTP]\n', text); return; }

  await t.sendMail({
    from: `"NULL DEVS" <${process.env.CONTACT_FROM || process.env.SMTP_USER}>`,
    to: process.env.CONTACT_TO || process.env.SMTP_USER,
    replyTo: `"${name}" <${email}>`,
    subject: `[NULL DEVS] New inquiry from ${name}${company ? ' @ ' + company : ''}`,
    text, html,
  });
}

async function sendAutoReply({ name, email }) {
  const t = getTransporter();
  const html = `
<!DOCTYPE html><html><head><meta charset="utf-8">
<style>body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#f6f8fa;margin:0;padding:32px 0}
.wrap{max-width:600px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;border:1px solid #e8ecf2}
.header{background:#0A0D14;padding:32px;text-align:center}.logo{color:#fff;font-size:22px;font-weight:800;letter-spacing:.16em}
.logo span{color:#1FD1B0}.tag{color:#9aa3b2;font-size:13px;margin-top:6px}
.body{padding:40px 32px}h2{font-size:24px;color:#0A0D14;margin:0 0 12px;font-weight:700}
p{font-size:15px;color:#5F6673;line-height:1.65;margin:0 0 16px}
.cta{display:inline-block;background:#0A0D14;color:#fff!important;text-decoration:none;padding:14px 28px;border-radius:12px;font-weight:600;font-size:15px;margin-top:8px}
.bullet{display:flex;align-items:flex-start;gap:12px;margin-bottom:10px}
.dot{width:7px;height:7px;border-radius:50%;background:#1FD1B0;flex-shrink:0;margin-top:6px}
.bt{font-size:14.5px;color:#5F6673}
.footer{background:#f6f8fa;padding:20px 32px;text-align:center;font-size:12px;color:#9aa3b2;border-top:1px solid #e8ecf2}</style></head>
<body><div class="wrap">
<div class="header"><div class="logo">NULL<span>DEVS</span></div><div class="tag">AI-native software engineering</div></div>
<div class="body">
<h2>Thanks, ${escHtml(name)}. We've got your message.</h2>
<p>We'll review your inquiry and get back to you within <strong>1 business day</strong>. Here's what to expect:</p>
<div class="bullet"><div class="dot"></div><div class="bt"><strong>Discovery call</strong> — 30 mins to understand your goals and what success looks like.</div></div>
<div class="bullet"><div class="dot"></div><div class="bt"><strong>Technical proposal</strong> — A clear scope, architecture recommendation, and timeline.</div></div>
<div class="bullet"><div class="dot"></div><div class="bt"><strong>Partnership</strong> — If it's a fit, we get started fast. Most projects kick off within a week.</div></div>
<p style="margin-top:24px">Want to add anything?</p>
<a href="mailto:null.point.errors@gmail.com" class="cta">Reply to this email →</a>
</div>
<div class="footer">NULL DEVS · Engineered, not templated.<br>
<a href="https://nulldevs.vercel.app" style="color:#1FD1B0">nulldevs.vercel.app</a></div>
</div></body></html>`;

  if (!t) { console.log(`📧 [AUTO-REPLY LOG] Would send to ${email}`); return; }

  await t.sendMail({
    from: `"NULL DEVS" <${process.env.CONTACT_FROM || process.env.SMTP_USER}>`,
    to: `"${name}" <${email}>`,
    subject: `We received your message — NULL DEVS`,
    text: `Hi ${name},\n\nThanks for reaching out! We'll get back to you within 1 business day.\n\nBest,\nNULL DEVS\nnull.point.errors@gmail.com`,
    html,
  });
}

// ─── Main handler ─────────────────────────────────────────────────────────────
module.exports = async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  if (req.method === 'GET') {
    return res.status(200).json({ success: true, message: 'Contact endpoint ready.' });
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: 'Method not allowed.' });
  }

  // Rate limit
  const ip = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.socket?.remoteAddress || 'unknown';
  if (isRateLimited(ip)) {
    return res.status(429).json({ success: false, message: 'Too many messages. Please wait an hour and try again.' });
  }

  const { name, email, company, service, budget, message, website } = req.body || {};

  // Honeypot
  if (website) {
    return res.status(200).json({ success: true, message: 'Message received!' });
  }

  // Validate
  if (!name || String(name).trim().length < 2) {
    return res.status(422).json({ success: false, message: 'Please enter your name.' });
  }
  if (!email || !validateEmail(String(email).trim())) {
    return res.status(422).json({ success: false, message: 'Please enter a valid email address.' });
  }
  if (!message || String(message).trim().length < 20) {
    return res.status(422).json({ success: false, message: 'Message must be at least 20 characters.' });
  }
  if (String(message).length > 5000) {
    return res.status(422).json({ success: false, message: 'Message is too long.' });
  }

  // Spam
  if (isSpam({ name, email, message: message || '', company: company || '' })) {
    return res.status(422).json({ success: false, message: 'Message flagged as spam. Email us directly at null.point.errors@gmail.com' });
  }

  const timestamp = new Date().toLocaleString('en-US', { timeZone: 'UTC', dateStyle: 'full', timeStyle: 'long' });

  try {
    await Promise.allSettled([
      sendNotification({ name: String(name).trim(), email: String(email).trim(), company: company || '', service: service || '', budget: budget || '', message: String(message).trim(), ip, timestamp }),
      sendAutoReply({ name: String(name).trim(), email: String(email).trim() }),
    ]);

    return res.status(200).json({ success: true, message: "Message received! We'll be in touch within 1 business day." });
  } catch (err) {
    console.error('Contact handler error:', err);
    return res.status(500).json({ success: false, message: 'Something went wrong. Please try again.' });
  }
};
