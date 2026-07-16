import LegalPage from "@/components/LegalPage";
import { LEGAL } from "@/lib/legal";

export const metadata = { title: "Grievance & Takedown" };

export default function GrievancePage() {
  return (
    <LegalPage title="Grievance Redressal &amp; Notice-and-Takedown">
      <p>
        {LEGAL.siteName} is an intermediary under the Information Technology Act, 2000 and follows the
        due-diligence and grievance-redressal requirements of the Information Technology (Intermediary
        Guidelines and Digital Media Ethics Code) Rules, 2021.
      </p>

      <h2>Grievance Officer</h2>
      <p>
        In accordance with Rule 3(2) of the IT Rules, 2021, the contact details of our Grievance
        Officer are:
      </p>
      <ul>
        <li><strong>Name:</strong> {LEGAL.grievanceOfficer}</li>
        <li><strong>Email:</strong> <a href={`mailto:${LEGAL.grievanceEmail}`}>{LEGAL.grievanceEmail}</a></li>
        <li><strong>Address:</strong> {LEGAL.entity}, {LEGAL.address}</li>
      </ul>

      <h2>Timelines</h2>
      <ul>
        <li>We <strong>acknowledge</strong> every complaint within <strong>24 hours</strong> of receipt.</li>
        <li>We <strong>resolve</strong> it within <strong>15 days</strong>.</li>
        <li>
          Complaints seeking removal of content that exposes an individual (e.g. impersonation, or
          content of a sexual/private nature) are acted upon on an expedited basis as required by law.
        </li>
      </ul>

      <h2>Who can complain, and about what</h2>
      <p>You can raise a grievance if content on the Platform, in your view:</p>
      <ul>
        <li>names, identifies, or targets an individual;</li>
        <li>is defamatory, false, or misleading;</li>
        <li>infringes your intellectual property or contractual rights;</li>
        <li>discloses private or confidential information;</li>
        <li>is otherwise unlawful or violates our <a href="/guidelines">Content Guidelines</a>.</li>
      </ul>

      <h2>What to include in your notice</h2>
      <p>To help us act quickly, please provide:</p>
      <ol>
        <li>Your name and contact details (and your role, if you represent an institution).</li>
        <li>The exact link (URL) to the content complained of.</li>
        <li>The specific words or elements at issue.</li>
        <li>The nature of the grievance and, where relevant, why the content is false or unlawful.</li>
        <li>Any supporting information, and a statement that the details you provide are accurate.</li>
      </ol>
      <p>
        Send this to <a href={`mailto:${LEGAL.grievanceEmail}`}>{LEGAL.grievanceEmail}</a>. Note:
        we do not disclose a reviewer’s identity to complainants; verified reviewers stay anonymous.
        Institutions are entitled to an official right of reply in addition to any grievance.
      </p>

      <h2>How we handle it</h2>
      <ul>
        <li>We acknowledge, review the content against the law and our Guidelines, and may remove, restrict, or retain it.</li>
        <li>We keep a record of the action taken for our audit trail.</li>
        <li>We will not misuse this process to suppress lawful, honest reviews.</li>
      </ul>

      <h2>Misuse</h2>
      <p>
        Filing false or bad-faith takedown notices to suppress genuine reviews is itself a violation
        and may be reported. We aim to protect honest speech and lawful rights in equal measure.
      </p>
    </LegalPage>
  );
}
