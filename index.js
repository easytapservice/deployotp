// index.js
const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const nodemailer = require('nodemailer');
const crypto = require('crypto');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// In-memory store (use Redis/DB in production)
const otpStore = new Map();

// Email transporter setup (use your own email credentials)
const transporter = nodemailer.createTransport({
  service: 'gmail', // or use your SMTP provider
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

// Generate a 6-digit OTP
function generateOtp() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// Endpoint to send OTP
app.post('/send-otp', async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: 'Email is required.' });

  const otp = generateOtp();
  const expiresAt = Date.now() + 5 * 60 * 1000; // valid for 5 minutes

  // Store OTP and expiry
  otpStore.set(email, { otp, expiresAt });

  try {
    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: email,
      subject: 'Your OTP Code',
      text: `Your OTP is: ${otp} (valid for 5 minutes)`
    });

    res.json({ message: 'OTP has been sent to your email.' });
  } catch (error) {
    console.error('Error sending email:', error.message);
    res.status(500).json({ error: 'Failed to send OTP email.' });
  }
});

// Endpoint to verify OTP
app.post('/verify-otp', (req, res) => {
  const { email, otp } = req.body;
  if (!email || !otp) return res.status(400).json({ error: 'Email and OTP are required.' });

  const record = otpStore.get(email);
  if (!record) return res.status(400).json({ error: 'No OTP requested for this email.' });

  if (Date.now() > record.expiresAt) {
    otpStore.delete(email);
    return res.status(400).json({ error: 'OTP has expired. Please request a new one.' });
  }

  if (record.otp !== otp) {
    return res.status(400).json({ error: 'Invalid OTP. Please check and try again.' });
  }

  // OTP is valid
  otpStore.delete(email);
  res.json({ message: 'OTP verified successfully!' });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
