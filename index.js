// index.js
const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const { createClient } = require('@supabase/supabase-js');

dotenv.config(); // Make sure your .env file has SUPABASE_URL and SUPABASE_ANON_KEY
const app = express();
const PORT = process.env.PORT || 3000; // Railway will set process.env.PORT

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

app.use(cors()); // Enable Cross-Origin Resource Sharing
app.use(express.json()); // Middleware to parse JSON request bodies

// Endpoint to request an OTP
app.post('/send-otp', async (req, res) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ error: 'Email is required.' });
  }

  // This tells Supabase to generate an OTP and send it to the user's email.
  // Supabase will use the email template you've configured (hopefully to show {{ .Token }}).
  const { error } = await supabase.auth.signInWithOtp({
    email: email
  });

  if (error) {
    console.error('Supabase signInWithOtp error:', error.message);
    return res.status(400).json({ error: 'Failed to send OTP. ' + error.message });
  }

  res.json({ message: 'OTP has been sent to your email! Please check your inbox.' });
});

// Endpoint to verify the OTP submitted by the user
app.post('/verify-otp', async (req, res) => {
  const { email, otp } = req.body; // 'otp' is the numerical code the user received and submitted

  if (!email || !otp) {
    return res.status(400).json({ error: 'Email and OTP are required.' });
  }

  // Verify the OTP with Supabase.
  // 'token' here refers to the OTP code the user provided.
  // 'type: email' is generally used for OTPs sent via email for passwordless login.
  const { data, error } = await supabase.auth.verifyOtp({
    email: email,
    token: otp,
    type: 'email' // This type should be appropriate for verifying the code from signInWithOtp.
  });

  if (error) {
    console.error('Supabase verifyOtp error:', error.message);
    // Send a user-friendly error message.
    return res.status(400).json({ error: 'Invalid OTP. It may have expired or been entered incorrectly.' });
  }

  // If verification is successful, 'data.session' will contain the user's session,
  // and 'data.user' will contain user details.
  if (data && data.session) {
    res.json({
      message: 'OTP verified successfully! User is authenticated.',
      session: data.session, // You can send the session object to your client
      user: data.user       // You can also send user details
    });
  } else if (data && !data.session) {
    // This might occur if the OTP was valid for something else (e.g., email change confirmation)
    // but didn't result in a login session for this flow.
    console.warn('OTP verified but no session returned. Data:', data);
    res.status(400).json({ error: 'OTP was correct, but login could not be completed with this OTP.' });
  } else {
    // Fallback for any other unexpected scenario where there's no error but also no session/data.
    console.error('OTP verification did not result in a session or an explicit error. Data:', data);
    res.status(400).json({ error: 'OTP could not be verified. Please try again.' });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});