// index.js
const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const { createClient } = require('@supabase/supabase-js');

dotenv.config();
const app = express();
const PORT = process.env.PORT || 3000;

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

app.use(cors());
app.use(express.json());

// Existing endpoint to send OTP
app.post('/send-otp', async (req, res) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ error: 'Email is required.' });
  }

  const { error } = await supabase.auth.signInWithOtp({
    email: email,
    // Optionally, you can add options here if needed, e.g., for redirect URL with magic links
    // options: {
    //   emailRedirectTo: 'YOUR_FRONTEND_VERIFICATION_URL',
    // }
  });

  if (error) {
    console.error('Supabase signInWithOtp error:', error.message);
    return res.status(400).json({ error: error.message });
  }

  res.json({ message: 'OTP sent to email! Please check your inbox.' });
});

// New endpoint to verify OTP
app.post('/verify-otp', async (req, res) => {
  const { email, otp } = req.body; // 'otp' is the token/code submitted by the user

  if (!email || !otp) {
    return res.status(400).json({ error: 'Email and OTP are required.' });
  }

  // The 'type' parameter is important.
  // For email OTPs sent via signInWithOtp (for passwordless login),
  // 'email' or 'magiclink' are common types.
  // If your Supabase project is configured to send a 6-digit code for this flow,
  // 'email' is often the correct type. Test to confirm.
  // Other types include 'signup', 'sms', 'recovery', etc., for different OTP scenarios.
  const { data, error } = await supabase.auth.verifyOtp({
    email: email,
    token: otp,
    type: 'email' // Adjust this type if necessary based on your Supabase OTP flow
                   // For example, if signInWithOtp is used for sign-ups and sends a code, 'signup' might be it.
                   // For passwordless login, 'email' or 'magiclink' are common.
  });

  if (error) {
    console.error('Supabase verifyOtp error:', error.message);
    // Provide a user-friendly error. Avoid reflecting Supabase-specific errors directly if too technical.
    return res.status(400).json({ error: 'Invalid OTP, it may have expired or been entered incorrectly.' });
  }

  // If successful, 'data' will contain the session and user information.
  // A session object in data.session means the user is now authenticated.
  if (data && data.session) {
    res.json({
      message: 'OTP verified successfully! User is authenticated.',
      session: data.session, // You might want to send this to the client
      user: data.user       // And user details
    });
  } else if (data && !data.session) {
    // This case might happen if the OTP is valid for a different flow (e.g. email change confirmation)
    // but doesn't result in a login session. Or if it's a partial success.
    console.warn('OTP verified but no session returned. Data:', data);
    res.status(400).json({ error: 'OTP verified, but login could not be completed.' });
  }
  else {
    // Fallback for unexpected scenarios where there's no error but also no session.
    console.error('OTP verification did not return a session or an explicit error. Data:', data);
    res.status(400).json({ error: 'OTP could not be verified.' });
  }
});

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));ad