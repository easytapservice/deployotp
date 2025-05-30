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

app.post('/send-otp', async (req, res) => {
  const { email } = req.body;

  const { error } = await supabase.auth.signInWithOtp({ email });

  if (error) return res.status(400).json({ error: error.message });

  res.json({ message: 'OTP sent to email!' });
});

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
