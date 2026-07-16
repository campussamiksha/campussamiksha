import LegalPage from "@/components/LegalPage";
import { LEGAL } from "@/lib/legal";

export const metadata = { title: "Terms of Service" };

export default function TermsPage() {
  return (
    <LegalPage title="Terms of Service">
      <p>
        These Terms govern your use of {LEGAL.siteName} (the “Platform”), operated by {LEGAL.entity}
        (“we”, “us”). By creating an account or using the Platform you agree to these Terms. If you do
        not agree, do not use the Platform.
      </p>

      <h2>1. What the Platform is</h2>
      <p>
        {LEGAL.siteName} lets current and former employees and research scholars of academic
        institutions in India share anonymous, first-hand reviews, salary data, and interview
        experiences, to help others make informed decisions before joining an employer. We host and
        moderate user-generated content; we do not author it and do not endorse it.
      </p>

      <h2>2. Eligibility &amp; accounts</h2>
      <ul>
        <li>You must be at least 18 years old and able to form a binding contract.</li>
        <li>You must provide a valid email and keep your credentials secure. You are responsible for activity under your account.</li>
        <li>One person, one account. Creating multiple accounts to manipulate content is prohibited.</li>
      </ul>

      <h2>3. Your content and the rules for it</h2>
      <p>You are solely responsible for what you post. You represent that each contribution:</p>
      <ul>
        <li>describes your own genuine, first-hand experience;</li>
        <li>is truthful and not misleading;</li>
        <li>does <strong>not</strong> name, identify, or target any individual — refer to roles (e.g. “the HoD”), not people;</li>
        <li>does not contain defamatory statements, unverifiable allegations of crime, hate speech, obscenity, or content that is unlawful under Indian law;</li>
        <li>does not disclose another person’s private or confidential information;</li>
        <li>does not infringe any third party’s intellectual property or contractual/confidentiality obligations.</li>
      </ul>
      <p>See our <a href="/guidelines">Content Guidelines</a> for detail. We may moderate, decline, or remove content that violates these Terms.</p>

      <h2>4. Licence to your content</h2>
      <p>
        You retain ownership of your content. You grant us a non-exclusive, royalty-free, worldwide
        licence to host, store, reproduce, display, and distribute it on and through the Platform for
        the purpose of operating and promoting the service. This licence ends when the content is
        removed, except for backups retained for a reasonable period and where retention is required
        by law.
      </p>

      <h2>5. Anonymity</h2>
      <p>
        We do not display your identity on your reviews and do not disclose it to the reviewed
        institution. We may disclose account information only where required by a valid legal order or
        to comply with applicable law. See the <a href="/privacy">Privacy Policy</a>.
      </p>

      <h2>6. Institutions and right of reply</h2>
      <p>
        A verified representative of an institution may claim its profile and post one official
        response per review. Representatives may reply to reviews; they cannot edit, hide, or remove
        genuine reviews. Attempting to solicit, incentivise, or suppress reviews is prohibited.
      </p>

      <h2>7. Intermediary status</h2>
      <p>
        We are an “intermediary” under the Information Technology Act, 2000 and operate as a neutral
        host of third-party content. We rely on the safe-harbour protection of Section 79 and observe
        due diligence under the Information Technology (Intermediary Guidelines and Digital Media
        Ethics Code) Rules, 2021, including a grievance-redressal mechanism (see
        <a href="/grievance"> Grievance &amp; Takedown</a>).
      </p>

      <h2>8. Prohibited conduct</h2>
      <ul>
        <li>Posting fake, paid, coerced, or retaliatory content.</li>
        <li>Scraping, bulk-harvesting, or automated access without permission.</li>
        <li>Attempting to de-anonymise reviewers, or misusing the Platform to harass anyone.</li>
        <li>Uploading malware, or interfering with the Platform’s security or operation.</li>
      </ul>

      <h2>9. Disclaimers</h2>
      <p>
        Content reflects the personal opinions and experiences of individual users. We do not verify
        the accuracy of every statement and make no warranty as to it. The Platform is provided “as
        is” without warranties of any kind to the maximum extent permitted by law.
      </p>

      <h2>10. Limitation of liability</h2>
      <p>
        To the maximum extent permitted by law, we are not liable for any indirect, incidental, or
        consequential damages, or for user-generated content. Nothing in these Terms limits liability
        that cannot be limited under applicable law.
      </p>

      <h2>11. Termination</h2>
      <p>We may suspend or terminate accounts that violate these Terms or the law. You may close your account at any time.</p>

      <h2>12. Governing law</h2>
      <p>
        These Terms are governed by the laws of India. Subject to applicable law, the courts at
        {" "}{LEGAL.jurisdiction} shall have exclusive jurisdiction.
      </p>

      <h2>13. Changes &amp; contact</h2>
      <p>
        We may update these Terms; material changes will be notified on the Platform. Questions:
        {" "}<a href={`mailto:${LEGAL.contactEmail}`}>{LEGAL.contactEmail}</a>.
      </p>
    </LegalPage>
  );
}
