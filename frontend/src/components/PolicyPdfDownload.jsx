export default function PolicyPdfDownload() {
  return (
    <section className="panel stack no-print">
      <h3>Download a copy</h3>
      <p className="muted-copy">
        Use your browser&apos;s print dialog to save this page as a PDF for your own records - choose
        &quot;Save as PDF&quot; as the destination.
      </p>
      <button className="secondary-button" type="button" onClick={() => window.print()}>
        Download PDF
      </button>
    </section>
  );
}
