import Link from "next/link";

export const metadata = {
  title: "User Guide",
  description: "How to use CampusSamiksha — find institutions, read and write honest reviews, share salary and interview data, and get verified.",
};

function Shot({ src, alt, cap }: { src: string; alt: string; cap: string }) {
  return (
    <figure className="shot">
      <img src={src} alt={alt} loading="lazy" />
      <figcaption>{cap}</figcaption>
    </figure>
  );
}

export default function GuidePage() {
  return (
    <div className="guide">
      <span className="eyebrow">User guide</span>
      <h1 style={{ fontSize: 38, margin: "10px 0 12px" }}>How to use CampusSamiksha</h1>
      <p className="lead">
        Everything you need to find an academic employer, read honest reviews, and share your own
        experience — anonymously. This takes about five minutes to skim.
      </p>

      <nav className="toc">
        <span className="eyebrow">On this page</span>
        <ol>
          <li><a href="#what">What CampusSamiksha is</a></li>
          <li><a href="#account">Create your account</a></li>
          <li><a href="#find">Find an institution</a></li>
          <li><a href="#profile">Read a profile</a></li>
          <li><a href="#review">Write a review</a></li>
          <li><a href="#salary">Share salary &amp; interviews</a></li>
          <li><a href="#verified">Get a verified badge</a></li>
          <li><a href="#institutions">For institutions</a></li>
          <li><a href="#moderators">For moderators</a></li>
          <li><a href="#privacy">Your privacy &amp; the rules</a></li>
          <li><a href="#faq">FAQ</a></li>
        </ol>
      </nav>

      <h2 id="what"><span className="idx">01</span>What CampusSamiksha is</h2>
      <p>
        CampusSamiksha is a place where people who work — or worked — at India&rsquo;s universities,
        colleges and research institutes review them as <strong>employers</strong>. Faculty,
        non-teaching staff and research scholars share what pay, workload, management and research
        life are really like, so the next person can decide before they join.
      </p>
      <p>
        It covers <strong>three kinds of contributor</strong>, and each rates the things that matter
        to their role: teaching faculty, non-teaching staff, and research scholars.
      </p>
      <div className="callout trust">
        <b>The promise:</b> your reviews are anonymous. Your name is never shown next to your review
        and is never given to the institution.
      </div>

      <h2 id="account"><span className="idx">02</span>Create your account</h2>
      <p>You need a verified account to post — but you can browse and read everything without one.</p>
      <ol>
        <li>Click <strong>Sign up</strong> (top-right), enter an email and a password of at least 8 characters. A display handle is optional.</li>
        <li>We email you a verification link. Click it to confirm your address.</li>
        <li>That&rsquo;s it — you can now write reviews and share data. Missed the email? Any &ldquo;verify your email&rdquo; screen has a <strong>Resend</strong> button.</li>
      </ol>
      <Shot src="/guide-img/signup.png" alt="CampusSamiksha sign-up form" cap="Sign up — email, password, optional handle." />

      <h2 id="find"><span className="idx">03</span>Find an institution</h2>
      <p>
        Search from the homepage by <strong>name, acronym, city or state</strong>. Acronyms work, so
        &ldquo;IIT&rdquo;, &ldquo;NIT&rdquo; or &ldquo;VIT&rdquo; find the right places, and a state
        name like &ldquo;Kerala&rdquo; lists institutions there. The directory already holds 13,000+
        AICTE-approved institutions.
      </p>
      <Shot src="/guide-img/search.png" alt="Search results for IIT" cap="Search matches names, acronyms, cities and states." />
      <p>Each result shows the institution&rsquo;s type, location, and its overall rating — or &ldquo;Not yet reviewed&rdquo; if it&rsquo;s waiting for its first review.</p>

      <h2 id="profile"><span className="idx">04</span>Read a profile</h2>
      <p>An institution&rsquo;s page is built to be read like a report card:</p>
      <ul>
        <li><strong>The score card</strong> — the overall rating out of 5 and the share of reviewers who would recommend working there.</li>
        <li><strong>Ratings by role</strong> — each contributor type&rsquo;s average on the parameters relevant to it, shown as meters.</li>
        <li><strong>Reviews</strong> — the written pros and cons, with a &ldquo;Verified employee&rdquo; badge where the reviewer proved their employment.</li>
        <li><strong>Salaries</strong> — a median figure and individual data points.</li>
        <li><strong>Interview experiences</strong> — what the hiring process was like.</li>
      </ul>
      <Shot src="/guide-img/institution.png" alt="A populated institution profile" cap="A full profile: score card, per-role rating meters, reviews, salary and interview sections." />

      <h2 id="review"><span className="idx">05</span>Write a review</h2>
      <ol>
        <li>On any institution&rsquo;s page, click <strong>Write a review</strong>.</li>
        <li>Choose whether you are (or were) <strong>teaching faculty, non-teaching staff, or a research scholar</strong> — the rating questions change to fit your role.</li>
        <li>Add your role, department and dates, then rate each parameter and give an overall score.</li>
        <li>Write the <strong>pros</strong> and <strong>cons</strong> (at least 20 characters each), and any advice.</li>
        <li>Submit. Your review enters moderation and goes live once approved.</li>
      </ol>
      <Shot src="/guide-img/review-form.png" alt="The review form" cap="The form adapts its rating parameters to your reviewer role." />
      <div className="callout">
        <b>Keep it fair:</b> write from your own first-hand experience, and describe <strong>roles,
        not people</strong> (&ldquo;the HoD&rdquo;, &ldquo;the accounts office&rdquo;) — never a
        person&rsquo;s name. Reviews that name individuals are edited or removed.
      </div>

      <h2 id="salary"><span className="idx">06</span>Share salary &amp; interview data</h2>
      <p>
        From an institution&rsquo;s page, use <strong>Share your salary</strong> or <strong>Share
        yours</strong> under interview experiences. Salary entries are anonymous and shown as
        aggregates and a median; you can also flag whether pay arrived on time. Interview entries
        capture the process, outcome and difficulty — the things a candidate most wants to know.
      </p>
      <Shot src="/guide-img/salary-form.png" alt="The salary form" cap="Salary data is anonymous and shown in aggregate." />

      <h2 id="verified"><span className="idx">07</span>Get a &ldquo;Verified employee&rdquo; badge</h2>
      <p>
        A badge tells readers your review is from someone who genuinely worked there. Go to <strong>Get
        verified</strong>, pick the institution, and upload one proof — an appointment letter, payslip,
        ID card, or institutional-email screenshot.
      </p>
      <Shot src="/guide-img/verify.png" alt="The verification upload page" cap="Upload one document to earn a Verified employee badge." />
      <div className="callout trust">
        <b>We don&rsquo;t keep your document.</b> A moderator views it only to confirm your
        affiliation, then it is <strong>permanently deleted</strong>. We keep only the badge — never
        the file. You may redact salary figures or anything else you don&rsquo;t want seen.
      </div>

      <h2 id="institutions"><span className="idx">08</span>For institutions</h2>
      <p>
        Represent an institution? On its page, click <strong>Work here? Claim this profile</strong>
        and submit an official email. Once a moderator approves it, you can post <strong>one official
        response per review</strong>.
      </p>
      <div className="callout">
        <b>You can reply, not rewrite.</b> Claiming lets you respond to feedback — it never lets you
        edit, hide, or remove honest reviews. Claimed profiles show an &ldquo;Officially
        responds&rdquo; badge.
      </div>

      <h2 id="moderators"><span className="idx">09</span>For moderators</h2>
      <p>
        Moderators keep the platform honest. The console at <strong>/admin</strong> shows queues for
        pending reviews, reports, claims, official responses, verification uploads, and salary and
        interview submissions.
      </p>
      <Shot src="/guide-img/admin.png" alt="The moderation dashboard" cap="The moderation dashboard — live counts for every queue." />
      <p>
        Open the <strong>review queue</strong> to approve or reject each submission. Approving a
        review publishes it and recalculates the institution&rsquo;s scores; rejecting keeps it off
        the site. Every action is logged.
      </p>
      <Shot src="/guide-img/admin-reviews.png" alt="The review moderation queue" cap="Approve or reject each pending review; scores update on approval." />

      <h2 id="privacy"><span className="idx">10</span>Your privacy &amp; the rules</h2>
      <table>
        <thead><tr><th>What you might worry about</th><th>How it works</th></tr></thead>
        <tbody>
          <tr><td>Will my employer know it was me?</td><td>No. Your identity is never shown publicly or shared with the institution.</td></tr>
          <tr><td>Is my verification document stored?</td><td>No. It is deleted right after a moderator confirms it. Only the badge remains.</td></tr>
          <tr><td>Can an institution delete a bad review?</td><td>No. They can post one official reply, nothing more.</td></tr>
          <tr><td>What happens to a review that names someone?</td><td>It is edited or removed. Describe roles, not individuals.</td></tr>
          <tr><td>How do I report something?</td><td>Use the <strong>Report</strong> link on any review, or the <Link href="/grievance">Grievance &amp; Takedown</Link> page.</td></tr>
        </tbody>
      </table>
      <p className="small muted">
        See also: <Link href="/guidelines">Content Guidelines</Link> · <Link href="/privacy">Privacy Policy</Link> · <Link href="/terms">Terms</Link>.
      </p>

      <h2 id="faq"><span className="idx">11</span>FAQ</h2>
      <h3>Do I need an account to read reviews?</h3>
      <p>No. Reading and searching are open to everyone. You only need a verified account to post.</p>
      <h3>Why isn&rsquo;t my review showing yet?</h3>
      <p>Every submission is checked by a moderator first. Once approved, it appears and updates the institution&rsquo;s scores.</p>
      <h3>My institution isn&rsquo;t listed. Can I add it?</h3>
      <p>The directory covers 13,000+ AICTE-approved institutions. If yours is missing, contact us and we&rsquo;ll add it.</p>
      <h3>Can I review more than one institution?</h3>
      <p>Yes — one review per institution you&rsquo;ve worked at. You can edit your review rather than post a second one.</p>
      <h3>Is it free?</h3>
      <p>Yes, for everyone.</p>

      <hr style={{ margin: "40px 0 20px" }} />
      <p className="muted">
        Ready to start? <Link href="/">Browse institutions</Link> or <Link href="/signup">create an account</Link>.
      </p>
    </div>
  );
}
