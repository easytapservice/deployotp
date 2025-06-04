const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const nodemailer = require('nodemailer');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// 🔐 Middleware to check Supabase API key
app.use((req, res, next) => {
  const authHeader = req.headers['authorization'];
  const apiKey = authHeader && authHeader.startsWith('Bearer ')
    ? authHeader.split(' ')[1]
    : null;

  const validKey = process.env.SUPABASE_KEY;

  if (!apiKey || apiKey !== validKey) {
    return res.status(401).json({ error: 'Unauthorized: Invalid or missing API key.' });
  }

  next();
});



// In-memory OTP store (use Redis or DB in production)
const otpStore = new Map();

// Email transporter configuration
const transporter = nodemailer.createTransport({
  service: 'gmail',
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

  otpStore.set(email, { otp, expiresAt });

  try {
    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: email,
      subject: 'Your OTP Code',
      html: `
        <div style="font-family: Arial, sans-serif; background-color: #eeeeee; padding: 40px 0;">
          <div style="max-width: 600px; margin: auto; background-color: #ffffff; border-radius: 8px; border: 1px solid #ddd; padding: 20px;">
            <div style="text-align: center; margin-bottom: 20px;">
              <img src="https://iglsabilpyvarzdadocj.supabase.co/storage/v1/object/sign/learn/Group%2011557.png?token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCIsImtpZCI6InN0b3JhZ2UtdXJsLXNpZ25pbmcta2V5XzBhNDZjYWRiLTUzN2MtNDMzOC05YThiLWFkNmU3ZTQ5ODNiYSJ9.eyJ1cmwiOiJsZWFybi9Hcm91cCAxMTU1Ny5wbmciLCJpYXQiOjE3NDg1OTc3NDksImV4cCI6MTc4MDEzMzc0OX0.AhliWvzTSwk6XYOYzxJfmuY5Z2tbo_LfDcFgtltIRAw" alt="Your Logo" style="max-width: 150px; height: auto;" />
            </div>
            <h2 style="color: #333; text-align: center;">Your One-Time Password (OTP)</h2>
            <p style="text-align: center;">Use the following OTP to proceed. This code is valid for <strong>5 minutes</strong>.</p>
            <div style="font-size: 32px; font-weight: bold; letter-spacing: 4px; color:rgb(10, 204, 178); margin: 30px 0; text-align: center;">
              ${otp}
            </div>
            <p style="text-align: center;">If you did not request this, please ignore this email.</p>
            <hr style="margin: 30px 0; border: none; border-top: 1px solid #ccc;" />
            <p style="font-size: 12px; color: #777; text-align: center;">— Be Easy Be Happy —</p>
          </div>
        </div>
      `
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

  otpStore.delete(email);
  res.json({ message: 'OTP verified successfully!' });
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
