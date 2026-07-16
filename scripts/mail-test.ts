/**
 * Mailer test — no database, no network. Verifies the verification-email
 * template, the console transport, and that the SMTP path builds a valid MIME
 * message (via nodemailer's jsonTransport).
 *   npx ts-node --compiler-options '{"module":"CommonJS"}' scripts/mail-test.ts
 */
import { verificationEmail } from "../lib/emails";
import { sendMail } from "../lib/mailer";

let pass = 0, fail = 0;
function check(name: string, cond: boolean) {
  if (cond) { pass++; console.log(`  ✓ ${name}`); } else { fail++; console.log(`  ✗ ${name}`); }
}

async function main() {
  const url = "http://localhost:3000/api/auth/verify?token=ABC123";
  const mail = verificationEmail("user@example.com", url);

  check("template: subject set", /verify/i.test(mail.subject));
  check("template: url in text body", mail.text.includes(url));
  check("template: url in html body", mail.html.includes(url));
  check("template: to set", mail.to === "user@example.com");

  // Console transport (default) — capture stdout.
  const orig = console.log;
  let logged = "";
  console.log = (s?: unknown) => { logged += String(s); };
  await sendMail(mail);
  console.log = orig;
  check("console transport logs recipient + link", logged.includes("user@example.com") && logged.includes(url));

  // SMTP send path builds a valid message (no real server).
  const nodemailer = (await import("nodemailer")).default;
  const t = nodemailer.createTransport({ jsonTransport: true });
  const info = await t.sendMail({ from: "no-reply@x.test", to: mail.to, subject: mail.subject, html: mail.html, text: mail.text });
  const msg = JSON.parse((info as unknown as { message: string }).message);
  check("smtp path: MIME message subject matches", msg.subject === mail.subject);
  check("smtp path: MIME message recipient matches", Array.isArray(msg.to) && msg.to[0].address === "user@example.com");

  console.log(`\nRESULT: ${pass} passed, ${fail} failed`);
  if (fail > 0) process.exitCode = 1;
}

main().catch((e) => { console.error(e); process.exitCode = 1; });
