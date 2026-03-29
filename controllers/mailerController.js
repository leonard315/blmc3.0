import nodemailer from 'nodemailer';

// In-memory verification store: { email => { code, expiresAt } }
const verificationStore = new Map();

async function createTransporter() {
  if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
    return nodemailer.createTransport({
      service: 'gmail',
      auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS }
    });
  }
  const testAccount = await nodemailer.createTestAccount();
  console.log('Using Ethereal test account for mailer', testAccount.user);
  return nodemailer.createTransport({
    host: 'smtp.ethereal.email',
    port: 587,
    auth: { user: testAccount.user, pass: testAccount.pass }
  });
}

export const sendSenderVerification = async (req, res) => {
  try {
    const { email } = req.body || {};
    if (!email) return res.status(400).json({ error: 'email is required' });

    // Only allow Gmail addresses for this verification flow
    if (!email.toLowerCase().endsWith('@gmail.com')) {
      return res.status(400).json({ error: 'only Gmail addresses are allowed for sender verification' });
    }

    const code = ('' + Math.floor(100000 + Math.random() * 900000)); // 6-digit
    const expiresAt = Date.now() + 15 * 60 * 1000; // 15 minutes
    verificationStore.set(email.toLowerCase(), { code, expiresAt });

    const transporter = await createTransporter();
    const mailOptions = {
      from: process.env.EMAIL_USER || 'no-reply@blmc.local',
      to: email,
      subject: 'Verify your Gmail for BLMC System',
      html: `<div style="font-family: Arial, sans-serif; padding: 12px;">
        <h3>Please verify your Gmail address</h3>
        <p>Use the following verification code to confirm this Gmail account as the sender for BLMC notifications:</p>
        <p style="font-size:20px; font-weight:700;">${code}</p>
        <p>This code expires in 15 minutes.</p>
        <p>If you did not request this, ignore this email.</p>
      </div>`
    };

    let previewUrl = null;
    try {
      const info = await transporter.sendMail(mailOptions);
      console.log('Verification mail sent:', info && info.messageId ? info.messageId : info);
      previewUrl = nodemailer.getTestMessageUrl(info) || null;
    } catch (sendErr) {
      console.error('Failed sending verification mail:', sendErr && sendErr.message ? sendErr.message : sendErr);
      return res.status(500).json({ error: 'failed to send verification email', details: sendErr && sendErr.message });
    }

    return res.json({ success: true, message: 'Verification email sent', previewUrl });
  } catch (err) {
    console.error('sendSenderVerification error:', err);
    res.status(500).json({ error: err.message || String(err) });
  }
};

export const confirmSenderVerification = async (req, res) => {
  try {
    const { email, code } = req.body || {};
    if (!email || !code) return res.status(400).json({ error: 'email and code are required' });

    const record = verificationStore.get(email.toLowerCase());
    if (!record) return res.status(400).json({ error: 'no verification pending for this email' });
    if (Date.now() > record.expiresAt) {
      verificationStore.delete(email.toLowerCase());
      return res.status(400).json({ error: 'verification code expired' });
    }
    if (record.code !== String(code)) return res.status(400).json({ error: 'invalid verification code' });

    // Verified — remove from store and respond success
    verificationStore.delete(email.toLowerCase());
    // Optionally: persist verified sender to DB or env — here we just return success
    return res.json({ success: true, message: 'Email verified' });
  } catch (err) {
    console.error('confirmSenderVerification error:', err);
    res.status(500).json({ error: err.message || String(err) });
  }
};

export default { sendSenderVerification, confirmSenderVerification };
