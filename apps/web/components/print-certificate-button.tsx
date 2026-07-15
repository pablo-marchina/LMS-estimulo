"use client";

export function PrintCertificateButton() {
  return <button className="button button--primary no-print" type="button" onClick={() => window.print()}>
    Imprimir ou salvar em PDF
  </button>;
}
