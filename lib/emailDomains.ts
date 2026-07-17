// Email-domain helpers: block throwaway signups, and recognise institutional
// (academic) addresses for the instant Verified-employee badge.

const DISPOSABLE = new Set([
  "mailinator.com", "10minutemail.com", "guerrillamail.com", "guerrillamail.info", "grr.la",
  "sharklasers.com", "yopmail.com", "tempmail.com", "temp-mail.org", "trashmail.com",
  "getnada.com", "maildrop.cc", "dispostable.com", "fakeinbox.com", "throwawaymail.com",
  "mintemail.com", "mohmal.com", "emailondeck.com", "spamgourmet.com", "tempinbox.com",
  "mailnesia.com", "33mail.com", "moakt.com", "tempr.email", "20minutemail.com", "spam4.me",
  "mailcatch.com", "tempmailo.com", "discard.email", "getairmail.com", "byom.de",
]);

export function emailDomain(email: string): string {
  const m = /@([^@]+)$/.exec(email.trim().toLowerCase());
  return m ? m[1] : "";
}

export function isDisposableEmail(email: string): boolean {
  return DISPOSABLE.has(emailDomain(email));
}

// Academic address patterns: Indian (.ac.in / .edu.in / .res.in / .ernet.in) and
// international (.edu, .ac.<cc>, .edu.<cc>, e.g. .ac.uk, .edu.au).
export function isAcademicEmail(email: string): boolean {
  const d = emailDomain(email);
  return (
    /\.ac\.in$/.test(d) ||
    /\.edu\.in$/.test(d) ||
    /\.res\.in$/.test(d) ||
    /\.ernet\.in$/.test(d) ||
    /\.edu$/.test(d) ||
    /\.ac\.[a-z]{2}$/.test(d) ||
    /\.edu\.[a-z]{2}$/.test(d)
  );
}
