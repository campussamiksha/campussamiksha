import LegalPage from "@/components/LegalPage";
import { LEGAL } from "@/lib/legal";

export const metadata = { title: "Privacy Policy" };

export default function PrivacyPage() {
  return (
    <LegalPage title="Privacy Policy">
      <p>
        This policy explains how {LEGAL.entity} (“we”) collects, uses, and protects personal data on
        {" "}{LEGAL.siteName}, consistent with the Digital Personal Data Protection Act, 2023 (“DPDP
        Act”) and other applicable Indian law. Here, “you” includes reviewers, institution
        representatives, and visitors.
      </p>

      <h2>1. Data we collect</h2>
      <ul>
        <li><strong>Account data:</strong> email address, a hashed password, and an optional display handle.</li>
        <li><strong>Content you submit:</strong> reviews, ratings, salary data, interview experiences, and the employment context you provide (role, department, tenure period).</li>
        <li><strong>Verification documents (temporary):</strong> if you seek a “Verified employee” badge, the proof you upload (e.g. appointment letter, payslip, ID). See §4.</li>
        <li><strong>Technical data:</strong> a session cookie for login, and standard server logs (IP, device/browser) used for security and abuse prevention.</li>
      </ul>

      <h2>2. How we use it</h2>
      <ul>
        <li>To operate the Platform — publish (moderated) content, run search and aggregates.</li>
        <li>To authenticate you and keep the service secure.</li>
        <li>To detect and prevent fraud, spam, and manipulation of reviews.</li>
        <li>To communicate service messages (e.g. email verification).</li>
      </ul>
      <p>We rely on your consent and on legitimate uses permitted under the DPDP Act. You may withdraw consent (see §7).</p>

      <h2>3. Anonymity of reviewers</h2>
      <p>
        Your identity is <strong>never shown</strong> next to your content and is <strong>never
        disclosed to the reviewed institution</strong>. Internally your account is linked to your
        content only for moderation and abuse prevention. We disclose identity only where compelled
        by a valid legal order or as required by law.
      </p>

      <h2>4. Verification documents — kept only to check, then deleted</h2>
      <p>
        A verification document is visible only to a moderator, used solely to confirm your
        affiliation, and <strong>permanently deleted immediately after the review decision</strong>.
        Any document not acted upon is automatically deleted no later than 30 days after upload. We
        retain only the outcome — a badge — never the document itself.
      </p>

      <h2>5. Cookies</h2>
      <p>
        We use a single, strictly necessary session cookie to keep you logged in. We do not use it
        for advertising. Blocking it will prevent login.
      </p>

      <h2>6. Sharing</h2>
      <p>
        We do not sell your personal data. We share it only with service providers who process it on
        our behalf under confidentiality obligations (e.g. hosting), and where required by law.
        Aggregated or anonymised data that cannot identify you may be shared or published.
      </p>

      <h2>7. Your rights (DPDP Act)</h2>
      <ul>
        <li>Access and correction of your personal data.</li>
        <li>Erasure of your personal data, subject to legal retention needs.</li>
        <li>Withdrawal of consent, and grievance redressal.</li>
        <li>Nomination, in the event of death or incapacity, as provided under the DPDP Act.</li>
      </ul>
      <p>
        To exercise these, contact our Grievance Officer (see <a href="/grievance">Grievance &amp;
        Takedown</a>) or email <a href={`mailto:${LEGAL.contactEmail}`}>{LEGAL.contactEmail}</a>.
      </p>

      <h2>8. Retention</h2>
      <p>
        We keep account and content data for as long as your account is active or as needed to
        provide the service and meet legal obligations. Verification documents follow §4.
      </p>

      <h2>9. Security</h2>
      <p>
        Passwords are stored hashed; sessions use signed, http-only cookies; verification files are
        stored privately and are not web-served. No system is perfectly secure, but we take
        reasonable technical and organisational measures to protect your data.
      </p>

      <h2>10. Children</h2>
      <p>The Platform is not intended for anyone under 18, and we do not knowingly collect their data.</p>

      <h2>11. Changes &amp; contact</h2>
      <p>
        We may update this policy; material changes will be notified on the Platform. Data Fiduciary:
        {" "}{LEGAL.entity}, {LEGAL.address}. Contact: <a href={`mailto:${LEGAL.contactEmail}`}>{LEGAL.contactEmail}</a>.
      </p>
    </LegalPage>
  );
}
