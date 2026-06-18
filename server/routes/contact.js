'use strict';

const express    = require('express');
const rateLimit  = require('express-rate-limit');
const { body, validationResult } = require('express-validator');
const validator  = require('validator');
const logger     = require('../utils/logger');
const { sendContactNotification, sendAutoReply } = require('../utils/email');

const router = express.Router();

// Per-route rate limiter — 5 submissions per IP per hour
const contactLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max:      parseInt(process.env.CONTACT_RATE_LIMIT_MAX || '5', 10),
  standardHeaders: true,
  legacyHeaders:   false,
  message: { success: false, message: "You've sent too many messages. Please wait an hour and try again." },
  keyGenerator: (req) => req.ip || req.connection.remoteAddress || 'unknown',
});

// Validation rules
const contactValidation = [
  body('name')
    .trim()
    .notEmpty().withMessage('Name is required.')
    .isLength({ min: 2, max: 100 }).withMessage('Name must be between 2 and 100 characters.'),

  body('email')
    .trim()
    .notEmpty().withMessage('Email is required.')
    .isEmail().withMessage('Please enter a valid email address.')
    .normalizeEmail({ gmail_remove_dots: false })
    .isLength({ max: 254 }).withMessage('Email is too long.'),

  body('message')
    .trim()
    .notEmpty().withMessage('Message is required.')
    .isLength({ min: 20, max: 5000 }).withMessage('Message must be between 20 and 5000 characters.'),

  body('company')
    .optional({ checkFalsy: true })
    .trim()
    .isLength({ max: 120 }).withMessage('Company name is too long.')
    .escape(),

  body('service')
    .optional({ checkFalsy: true })
    .trim()
    .isIn(['', 'custom-web-app', 'ai-integration', 'ai-product', 'automation', 'business-software', 'consulting'])
    .withMessage('Invalid service selection.'),

  body('budget')
    .optional({ checkFalsy: true })
    .trim()
    .isLength({ max: 100 }).withMessage('Budget field is too long.'),

  // Honeypot — bots fill this, humans never see it
  body('website')
    .optional({ checkFalsy: true })
    .isEmpty().withMessage('Submission rejected.'),
];

// Spam patterns
const SPAM_PATTERNS = [
  /\b(viagra|casino|crypto|bitcoin|nft|forex|loan|investment opportunity)\b/i,
  /\b(click here|buy now|limited offer|earn money fast)\b/i,
];

function detectSpam(fields) {
  const combined = Object.values(fields).join(' ');
  return SPAM_PATTERNS.some(re => re.test(combined));
}

// POST /api/contact
router.post('/', contactLimiter, contactValidation, async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(422).json({
        success: false,
        message: errors.array()[0].msg,
        errors:  errors.array().map(e => ({ field: e.path, message: e.msg })),
      });
    }

    const { name, email, company, service, budget, message, website } = req.body;

    // Honeypot check
    if (website) {
      logger.warn(`Honeypot triggered from IP ${req.ip}`);
      return res.json({ success: true, message: "Message received. We'll be in touch soon!" });
    }

    // Spam check
    if (detectSpam({ name, email, company: company || '', message })) {
      logger.warn(`Spam detected from ${req.ip}: ${email}`);
      return res.status(422).json({
        success: false,
        message: 'Your message was flagged as potential spam. Please contact us directly at null.point.errors@gmail.com.',
      });
    }

    if (!validator.isEmail(email)) {
      return res.status(422).json({ success: false, message: 'Invalid email address.' });
    }

    logger.info('Contact form submission:', {
      name: name.substring(0, 50),
      email: email.substring(0, 80),
      ip: req.ip,
    });

    const timestamp = new Date().toLocaleString('en-US', {
      timeZone: 'UTC', dateStyle: 'full', timeStyle: 'long',
    });

    await Promise.allSettled([
      sendContactNotification({ name, email, company, service, budget, message, ip: req.ip, timestamp }),
      sendAutoReply({ name, email }),
    ]);

    return res.status(200).json({
      success: true,
      message: "Message received! We'll be in touch within 1 business day.",
    });

  } catch (err) {
    next(err);
  }
});

router.get('/', (_req, res) => {
  res.json({ success: true, message: 'Contact endpoint ready. Use POST to submit.' });
});

module.exports = router;
