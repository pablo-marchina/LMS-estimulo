"use client";

import { Button } from "@/components/ui/button";

export function PrintCertificateButton() {
  return (
    <Button
      aria-label="Imprimir ou salvar o certificado em PDF"
      className="no-print"
      title="Imprimir ou salvar o certificado em PDF"
      type="button"
      onClick={() => window.print()}
    >
      Imprimir ou salvar em PDF
    </Button>
  );
}
