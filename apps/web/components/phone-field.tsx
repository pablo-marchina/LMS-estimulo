"use client";

import { useMemo, useState } from "react";
import { Input, Label } from "@/components/ui/input";

function brazilianDigits(value: string) {
  const digits = value.replace(/\D/gu, "");
  if ((digits.length === 12 || digits.length === 13) && digits.startsWith("55")) return digits.slice(2);
  return digits.slice(0, 11);
}

function formatBrazilianPhone(value: string) {
  const digits = brazilianDigits(value);
  if (!digits) return "";
  if (digits.length <= 2) return `(${digits}`;

  const ddd = digits.slice(0, 2);
  const subscriber = digits.slice(2);
  if (subscriber.length <= 4) return `(${ddd}) ${subscriber}`;

  const split = subscriber.length > 8 ? 5 : 4;
  return `(${ddd}) ${subscriber.slice(0, split)}-${subscriber.slice(split)}`;
}

export function PhoneField({ defaultValue = "" }: { defaultValue?: string }) {
  const initialValue = useMemo(() => formatBrazilianPhone(defaultValue), [defaultValue]);
  const [value, setValue] = useState(initialValue);

  return (
    <Label>
      Telefone
      <Input
        name="telefone"
        type="tel"
        inputMode="tel"
        autoComplete="tel"
        placeholder="(00) 00000-0000"
        value={value}
        onChange={(event) => setValue(formatBrazilianPhone(event.currentTarget.value))}
        maxLength={15}
        aria-describedby="telefone-ajuda"
        required
      />
      <span id="telefone-ajuda" className="text-xs font-normal leading-5 text-muted">
        Informe o DDD e o número do celular ou telefone.
      </span>
    </Label>
  );
}
