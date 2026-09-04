"use client";

import { useMemo, useState } from "react";
import { Input, Label } from "@/components/ui/input";
import { formatCnpj, formatCpf } from "@/lib/identity/tax-id-format-core.mjs";

export function CpfField() {
  const [value, setValue] = useState("");

  return (
    <div className="grid gap-1.5">
      <Label>
        CPF
        <Input
          name="cpf"
          inputMode="numeric"
          autoComplete="off"
          placeholder="000.000.000-00"
          value={value}
          onChange={(event) => setValue(formatCpf(event.currentTarget.value))}
          minLength={14}
          maxLength={14}
          pattern="[0-9]{3}\.[0-9]{3}\.[0-9]{3}-[0-9]{2}"
          required
        />
      </Label>
    </div>
  );
}

export function CnpjField({ defaultValue = "" }: { defaultValue?: string }) {
  const initialValue = useMemo(() => formatCnpj(defaultValue), [defaultValue]);
  const [value, setValue] = useState(initialValue);

  return (
    <Label>
      CNPJ <span className="font-normal text-muted">(opcional)</span>
      <Input
        name="cnpj"
        inputMode="numeric"
        autoComplete="off"
        placeholder="00.000.000/0000-00"
        value={value}
        onChange={(event) => setValue(formatCnpj(event.currentTarget.value))}
        maxLength={18}
        pattern="[0-9]{2}\.[0-9]{3}\.[0-9]{3}/[0-9]{4}-[0-9]{2}"
      />
    </Label>
  );
}
