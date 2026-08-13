"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Label, Select } from "@/components/ui/input";

type DiagnosticVersionOption = {
  value: string;
  label: string;
};

export function DiagnosticVersionSelector({ value, options }: { value: string; options: DiagnosticVersionOption[] }) {
  const router = useRouter();
  const [selected, setSelected] = useState(value);

  function change(next: string) {
    setSelected(next);
    const query = new URLSearchParams({ tipo: "principal" });
    if (next) query.set("versao", next);
    router.push(`/admin/diagnostico?${query.toString()}`);
  }

  return (
    <Label className="min-w-72 flex-1">
      Diagnóstico que deseja abrir
      <Select value={selected} onChange={(event) => change(event.target.value)}>
        <option value="">Criar o primeiro diagnóstico</option>
        {options.map((option) => <option value={option.value} key={option.value}>{option.label}</option>)}
      </Select>
      <span className="text-[11px] font-normal text-muted">A versão em uso pode ser aberta e revisada. Ao salvar mudanças nela, a plataforma cria ou atualiza um rascunho; a versão publicada não é alterada silenciosamente.</span>
    </Label>
  );
}
