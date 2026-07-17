import { LEGAL } from "./legal";
import type { Mail } from "./mailer";

// Email templates. Keep them simple, inline-styled, and provide a text fallback.
export function verificationEmail(to: string, verifyUrl: string): Mail {
  const subject = `Verify your email · ${LEGAL.siteName}`;
  const text =
    `Welcome to ${LEGAL.siteName}!\n\n` +
    `Confirm your email address to start posting reviews:\n${verifyUrl}\n\n` +
    `This link expires in 24 hours. If you didn't sign up, you can ignore this email.`;
  const html = `
  <div style="font-family:system-ui,-apple-system,Segoe UI,sans-serif;max-width:520px;margin:0 auto;color:#1a1d23">
    <h2 style="margin:0 0 8px">Welcome to ${LEGAL.siteName}</h2>
    <p style="margin:0 0 16px">Confirm your email address to start posting anonymous reviews.</p>
    <p style="margin:0 0 16px">
      <a href="${verifyUrl}" style="display:inline-block;background:#1e5eff;color:#fff;padding:11px 20px;border-radius:8px;text-decoration:none;font-weight:600">
        Verify my email
      </a>
    </p>
    <p style="color:#667085;font-size:13px;word-break:break-all">Or paste this link into your browser:<br>${verifyUrl}</p>
    <p style="color:#667085;font-size:13px">This link expires in 24 hours. If you didn't sign up, you can ignore this email.</p>
  </div>`;
  return { to, subject, text, html };
}

export function institutionalVerifyEmail(to: string, link: string, institutionName: string): Mail {
  const subject = `Confirm your ${institutionName} email · ${LEGAL.siteName}`;
  const text =
    `Confirm you work (or worked) at ${institutionName} to add a Verified employee badge to your reviews:\n${link}\n\n` +
    `This link expires in 30 minutes. If you didn't request this, ignore this email.`;
  const html = `
  <div style="font-family:system-ui,-apple-system,Segoe UI,sans-serif;max-width:520px;margin:0 auto;color:#1a1d23">
    <h2 style="margin:0 0 8px">Confirm your ${institutionName} email</h2>
    <p style="margin:0 0 16px">Click below to add a <b>Verified employee</b> badge to your ${LEGAL.siteName} reviews.</p>
    <p style="margin:0 0 16px">
      <a href="${link}" style="display:inline-block;background:#1e5eff;color:#fff;padding:11px 20px;border-radius:8px;text-decoration:none;font-weight:600">
        Verify &amp; get my badge
      </a>
    </p>
    <p style="color:#667085;font-size:13px;word-break:break-all">Or paste this link:<br>${link}</p>
    <p style="color:#667085;font-size:13px">This link expires in 30 minutes. If you didn't request this, ignore it.</p>
  </div>`;
  return { to, subject, text, html };
}
