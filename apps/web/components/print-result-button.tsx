"use client";

import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";

export function PrintResultButton({ label = "Baixar resultado" }: { label?: string }) {
  return <Button type="button" variant="secondary" size="sm" icon={<Download size={15} />} onClick={() => window.print()} data-behavior-id="diagnostic-result-download">{label}</Button>;
}
