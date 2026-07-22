"use client";

import { Button } from "@/components/ui/button";

export function PrintCertificateButton() {
  return (
    <Button className="no-print" type="button" onClick={() => window.print()}>
      Imprimir ou salvar em PDF
    </Button>
  );
}
