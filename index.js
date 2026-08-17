require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');

const app = express();
app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '5mb' }));

// Authentication
const authenticate = (req, res, next) => {
  const apiKey = req.headers['x-api-key'];
  if (!apiKey || apiKey !== process.env.API_KEY) {
    return res.status(401).json({
      success: false,
      message: 'Unauthorized - Invalid or missing API Key'
    });
  }
  next();
};

// Health check
app.get('/', (req, res) => {
  res.json({ status: 'Email Proxy is running (Resend)' });
});

// Send Email using Resend
app.post('/api/v1/send-email', authenticate, async (req, res) => {
  try {
    const { to, subject, text, html } = req.body;

    if (!to || !subject || (!text && !html)) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: to, subject, and text/html'
      });
    }

    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: process.env.FROM_EMAIL,   // Must be a verified domain or onboarding@resend.dev
        to: [to],
        subject: subject,
        text: text,
        html: html
      })
    });

    const data = await response.json();

    if (!response.ok) {
      return res.status(500).json({
        success: false,
        message: 'Failed to send email',
        error: data
      });
    }

    res.json({
      success: true,
      message: 'Email sent successfully',
      id: data.id
    });

  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to send email',
      error: error.message
    });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Email Proxy running on port ${PORT}`);
});