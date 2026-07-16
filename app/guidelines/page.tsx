import LegalPage from "@/components/LegalPage";
import { LEGAL } from "@/lib/legal";

export const metadata = { title: "Content Guidelines" };

export default function GuidelinesPage() {
  return (
    <LegalPage title="Community &amp; Content Guidelines">
      <p>
        {LEGAL.siteName} only works if reviews are honest and fair. These guidelines keep the Platform
        credible and protect both reviewers and the people they write about. They apply to reviews,
        salary reports, interview experiences, and official responses.
      </p>

      <h2>The core principle</h2>
      <p>
        Share your <strong>own, genuine, first-hand experience</strong> — the good and the bad. A
        review can be strongly negative; it just has to be true and about your experience, not an
        attack on a person.
      </p>

      <h2>Do</h2>
      <ul>
        <li>Write from direct experience as a current or former employee or scholar.</li>
        <li>Be specific and factual (“salary was delayed by two months, twice”).</li>
        <li>Include both pros and cons where you can — balance builds trust.</li>
        <li>Refer to <strong>roles</strong> (“the HoD”, “the accounts office”), never a person’s name.</li>
        <li>Keep salary and interview details accurate and relevant.</li>
      </ul>

      <h2>Don’t</h2>
      <ul>
        <li><strong>Name or identify individuals.</strong> No personal names, phone numbers, emails, or details that single someone out.</li>
        <li>Make unverifiable allegations of specific crimes against a named person.</li>
        <li>Post defamatory, hateful, obscene, or discriminatory content.</li>
        <li>Post fake, paid, coerced, or retaliatory reviews, or reviews of a place you never worked.</li>
        <li>Reveal confidential information you were obliged to keep (protect yourself, too).</li>
        <li>Post the same review repeatedly or try to manipulate ratings.</li>
      </ul>

      <h2>Why “no names”?</h2>
      <p>
        Naming individuals exposes you to defamation risk and can cause real harm. Describing roles
        and systems conveys the same useful information while keeping reviews fair and lawful. Reviews
        that name people will be edited or removed.
      </p>

      <h2>How moderation works</h2>
      <ul>
        <li>Every submission is reviewed before it appears publicly.</li>
        <li>Automated checks flag phone numbers, emails, and obvious policy breaches.</li>
        <li>A moderator may publish, decline, or ask that a submission be revised.</li>
        <li>Anyone can report a published review; reported content is re-reviewed.</li>
        <li>Institutions get one official right of reply per review — never the ability to hide it.</li>
      </ul>

      <h2>Reporting</h2>
      <p>
        Use the “Report” link on any review, or contact us via <a href="/grievance">Grievance &amp;
        Takedown</a>. We act on genuine reports promptly.
      </p>
    </LegalPage>
  );
}
