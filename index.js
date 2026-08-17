require('dotenv').config();
const express = require('express');
const nodemailer = require('nodemailer');
const cors = require('cors');
const helmet = require('helmet');

const app = express();

app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '5mb' }));

// Authentication + Debug
const authenticate = (req, res, next) => {
  const apiKey = req.headers['x-api-key'];

  console.log("==============================");
  console.log("Received API Key :", apiKey);
  console.log("Expected API Key :", process.env.API_KEY);
  console.log("==============================");

  if (!apiKey || apiKey !== process.env.API_KEY) {
    return res.status(401).json({
      success: false,
      message: 'Unauthorized - Invalid or missing API Key'
    });
  }
  next();
};

// SMTP Transporter
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT) || 465,
  secure: true,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  },
  tls: {
    rejectUnauthorized: false
  },
  // Force IPv4
  family: 4
});
// Health check
app.get('/', (req, res) => {
  res.json({ status: 'Email Proxy is running' });
});

// Send Email endpoint
app.post('/api/v1/send-email', authenticate, async (req, res) => {
  try {
    const { to, subject, text, html, cc, bcc } = req.body;

    if (!to || !subject || (!text && !html)) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: to, subject, and text/html'
      });
    }

    const mailOptions = {
      from: `"${process.env.FROM_NAME}" <${process.env.FROM_EMAIL}>`,
      to,
      subject,
      text,
      html,
      cc,
      bcc
    };

    const info = await transporter.sendMail(mailOptions);

    res.json({
      success: true,
      message: 'Email sent successfully',
      messageId: info.messageId
    });

  } catch (error) {
    console.error('Error sending email:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to send email',
      error: error.message
    });
  }
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Email Proxy running on port ${PORT}`);
});