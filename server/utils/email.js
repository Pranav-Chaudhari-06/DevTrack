const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

const FROM   = `DevTrack <${process.env.SMTP_USER}>`;
const CLIENT = process.env.CLIENT_URL || 'http://localhost:5173';

async function sendVerificationEmail(email, name, token) {
  const url = `${CLIENT}/verify-email?token=${token}`;
  await transporter.sendMail({
    from:    FROM,
    to:      email,
    subject: 'Verify your DevTrack email',
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px;background:#0d1530;color:#e2e8f0;border-radius:12px;">
        <h2 style="color:#818cf8;margin-top:0;">Welcome to DevTrack, ${name}!</h2>
        <p>Click the button below to verify your email address. This link expires in <strong>24 hours</strong>.</p>
        <a href="${url}"
           style="display:inline-block;margin:16px 0;padding:12px 28px;background:linear-gradient(135deg,#6366f1,#8b5cf6);color:#fff;border-radius:8px;text-decoration:none;font-weight:600;">
          Verify Email
        </a>
        <p style="color:#94a3b8;font-size:13px;">Or copy this link:<br/><a href="${url}" style="color:#818cf8;">${url}</a></p>
        <hr style="border-color:#1e2d4a;margin:24px 0;"/>
        <p style="color:#64748b;font-size:12px;">If you didn't create a DevTrack account, you can safely ignore this email.</p>
      </div>
    `,
  });
}

async function sendPasswordResetEmail(email, name, token) {
  const url = `${CLIENT}/reset-password?token=${token}`;
  await transporter.sendMail({
    from:    FROM,
    to:      email,
    subject: 'Reset your DevTrack password',
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px;background:#0d1530;color:#e2e8f0;border-radius:12px;">
        <h2 style="color:#818cf8;margin-top:0;">Password reset request</h2>
        <p>Hi ${name}, click the button below to set a new password. This link expires in <strong>1 hour</strong>.</p>
        <a href="${url}"
           style="display:inline-block;margin:16px 0;padding:12px 28px;background:linear-gradient(135deg,#6366f1,#8b5cf6);color:#fff;border-radius:8px;text-decoration:none;font-weight:600;">
          Reset Password
        </a>
        <p style="color:#94a3b8;font-size:13px;">Or copy this link:<br/><a href="${url}" style="color:#818cf8;">${url}</a></p>
        <hr style="border-color:#1e2d4a;margin:24px 0;"/>
        <p style="color:#64748b;font-size:12px;">If you didn't request a password reset, you can safely ignore this email.</p>
      </div>
    `,
  });
}

module.exports = { sendVerificationEmail, sendPasswordResetEmail };
