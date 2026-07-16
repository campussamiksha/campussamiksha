// Pluggable email delivery. Default 'console' transport prints the message to
// the server log (dev). Set MAIL_TRANSPORT=smtp with SMTP_* vars for real
// delivery via nodemailer (loaded lazily so console mode needs no SMTP config).
export interface Mail {
  to: string;
  subject: string;
  html: string;
  text: string;
}

async function consoleSend(mail: Mail): Promise<void> {
  console.log(
    `\n──────── EMAIL (console transport) ────────\n` +
      `To:      ${mail.to}\n` +
      `Subject: ${mail.subject}\n\n` +
      `${mail.text}\n` +
      `───────────────────────────────────────────\n`,
  );
}

async function smtpSend(mail: Mail): Promise<void> {
  const nodemailer = (await import("nodemailer")).default;
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: process.env.SMTP_SECURE === "true",
    auth: process.env.SMTP_USER
      ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
      : undefined,
  });
  await transporter.sendMail({
    from: process.env.MAIL_FROM || "CampusSamiksha <no-reply@campussamiksha.in>",
    to: mail.to,
    subject: mail.subject,
    html: mail.html,
    text: mail.text,
  });
}

export async function sendMail(mail: Mail): Promise<void> {
  if (process.env.MAIL_TRANSPORT === "smtp") {
    await smtpSend(mail);
  } else {
    await consoleSend(mail);
  }
}
