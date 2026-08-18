import PolicyPdfDownload from "../components/PolicyPdfDownload.jsx";

export default function TermsPage() {
  return (
    <div className="view active-view legal-page">
      <div className="view-header">
        <div>
          <h2>Terms of service</h2>
          <p>The agreement between you and JakezApp when you create an account or use the app.</p>
        </div>
      </div>

      <section className="panel stack">
        <h3>What JakezApp is</h3>
        <p className="muted-copy">
          JakezApp connects tenants, landlords, agencies, and movers. JakezApp does not own or manage any listed property, is not a party to any tenancy or moving-service agreement formed through it, and does not process, hold, or mediate any rent, deposit, agency fee, or mover payment — those are arranged directly between the parties involved.
        </p>
      </section>

      <section className="panel stack">
        <h3>Accounts and listings</h3>
        <p className="muted-copy">
          You&apos;re responsible for the accuracy of what you submit — your registration details, and, if you&apos;re a landlord, agency, or mover, your listings or business profile. A &quot;Verified&quot; badge reflects JakezApp&apos;s admin review of submitted business documents; it&apos;s a trust signal, not a guarantee of listing accuracy or service quality.
        </p>
        <p className="muted-copy">
          Reviews are written by tenants and can&apos;t be deleted by the property owner or an admin, though owners may respond publicly.
        </p>
      </section>

      <section className="panel stack">
        <h3>Enforcement and disclaimers</h3>
        <p className="muted-copy">
          Accounts that violate JakezApp&apos;s Acceptable Use Policy may be suspended or banned, with a logged reason visible to the affected user. JakezApp is provided &quot;as is,&quot; and is not responsible for the conduct of other users or the outcome of any arrangement you make with them.
        </p>
        <p className="muted-copy">
          These terms are governed by the laws of Kenya. Disputes between you and another user are not mediated by JakezApp.
        </p>
      </section>

      <PolicyPdfDownload />
    </div>
  );
}
