"use client";

import { useState } from "react";
import { Input, Label, Select } from "@/components/ui/input";

export function CertificateTemplatePositioning() {
  const [nameY, setNameY] = useState(53);
  const [journeyY, setJourneyY] = useState(40);
  const [textColor, setTextColor] = useState("primary");
  const colorClass = textColor === "white" ? "text-white" : "text-primary";

  return (
    <section className="grid gap-5 rounded-xl border border-border bg-surface-muted/45 p-5" aria-labelledby="certificate-position-title">
      <div>
        <h3 id="certificate-position-title" className="font-semibold text-ink">Posicionamento no template</h3>
        <p className="mt-1 text-sm leading-6 text-muted">A imagem enviada ocupa toda a página. O sistema centraliza os textos horizontalmente e usa as alturas abaixo, medidas a partir da base do certificado. Data de emissão e código de validação ficam no rodapé.</p>
      </div>

      <div className="relative aspect-[1.414/1] overflow-hidden rounded-lg border border-border bg-white shadow-inner" aria-label="Prévia do posicionamento dos textos">
        <div className="absolute inset-0 grid place-items-center text-xs text-muted">Prévia do template horizontal</div>
        <div className={`absolute inset-x-6 text-center text-lg font-black ${colorClass}`} style={{ bottom: `${nameY}%`, transform: "translateY(50%)" }}>NOME DO PARTICIPANTE</div>
        <div className={`absolute inset-x-6 text-center text-sm font-semibold ${colorClass}`} style={{ bottom: `${journeyY}%`, transform: "translateY(50%)" }}>NOME DA JORNADA</div>
        <div className="absolute inset-x-6 bottom-4 flex justify-between text-[10px] text-muted"><span>Data de emissão</span><span>Código de validação</span></div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Label>Altura do nome: {nameY}%<Input name="name_y_percent" type="range" min={15} max={80} value={nameY} onChange={(event) => setNameY(Number(event.target.value))} /></Label>
        <Label>Altura da jornada: {journeyY}%<Input name="journey_y_percent" type="range" min={15} max={80} value={journeyY} onChange={(event) => setJourneyY(Number(event.target.value))} /></Label>
        <Label>Cor dos textos<Select name="text_color" value={textColor} onChange={(event) => setTextColor(event.target.value)}><option value="primary">Azul Estímulo</option><option value="white">Branco</option></Select></Label>
      </div>
    </section>
  );
}
