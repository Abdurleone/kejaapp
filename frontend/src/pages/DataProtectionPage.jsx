export default function DataProtectionPage() {
  return (
    <div className="view active-view legal-page">
      <div className="view-header">
        <div>
          <h2>Data protection</h2>
          <p>How KejaApp handles your personal data under the Kenya Data Protection Act, 2019.</p>
        </div>
      </div>

      <section className="panel stack">
        <h3>Who&apos;s responsible for your data</h3>
        <p className="muted-copy">
          KejaApp is the data controller for the personal data described here, and aims to align its handling of that
          data with the <strong>Kenya Data Protection Act, 2019</strong>, enforced by the{" "}
          <strong>Office of the Data Protection Commissioner (ODPC)</strong>.
        </p>
      </section>

      <section className="panel stack">
        <h3>What we collect, and why</h3>
        <p className="muted-copy">
          Account details, listing/business data, and the inquiries, viewing requests, reviews, and mover requests
          you create are collected to operate the specific feature you used them for — never for an undisclosed
          purpose. KejaApp does not ask for national ID/passport numbers, financial account or card details, health
          information, or other sensitive personal data as defined by the Act.
        </p>
      </section>

      <section className="panel stack">
        <h3>Your rights as a data subject</h3>
        <p className="muted-copy">
          Consistent with the Act (s. 26), you have the right to be informed, to access your own data, to correct it,
          to have it deleted, to object to or restrict its processing, and to receive a copy of it in a portable
          format. Delete your account any time from the Account page, or reach every other right via{" "}
          <strong>privacy@kejaapp.com</strong>.
        </p>
      </section>

      <section className="panel stack">
        <h3>Breach notification</h3>
        <p className="muted-copy">
          If a personal data breach occurs, KejaApp commits to notifying the ODPC within 72 hours of becoming aware,
          where the breach is likely to pose a risk, and to notifying affected users directly where that risk is
          high.
        </p>
      </section>

      <section className="panel stack">
        <h3>Full policy</h3>
        <p className="muted-copy">
          This page is a summary. Read the full{" "}
          <code>docs/data-protection-policy.md</code> in the project repository for the complete policy, including
          third-party processors, retention periods, and international transfer safeguards.
        </p>
      </section>
    </div>
  );
}
