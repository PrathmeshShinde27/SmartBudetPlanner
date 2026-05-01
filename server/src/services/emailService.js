import { Resend } from 'resend';
import { config } from '../config.js';

const resend = config.resendApiKey ? new Resend(config.resendApiKey) : null;

export async function sendOtpEmail({ to, otp, purpose }) {
  const subject = purpose === 'reset_password' ? 'Reset your Smart Budget Planner password' : 'Verify your Smart Budget Planner email';
  const intro = purpose === 'reset_password' ? 'Use this OTP to reset your password.' : 'Use this OTP to verify your email address.';
  const html = `
    <div style="font-family:Arial,sans-serif;line-height:1.6;color:#102033">
      <h2>${subject}</h2>
      <p>${intro}</p>
      <p style="font-size:28px;font-weight:700;letter-spacing:6px;color:#0284c7">${otp}</p>
      <p>This OTP expires in 10 minutes.</p>
      <p>Created by Prathmesh Shinde · <a href="https://prathmeshshinde.com">prathmeshshinde.com</a></p>
    </div>
  `;

  if (!resend) {
    console.log(`[DEV OTP] ${purpose} for ${to}: ${otp}`);
    return;
  }

  await resend.emails.send({
    from: config.emailFrom,
    to,
    subject,
    html
  });
}
