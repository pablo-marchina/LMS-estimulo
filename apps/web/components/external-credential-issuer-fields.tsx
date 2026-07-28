"use client";

import { useState } from "react";
import { Input, Label, Select } from "@/components/ui/input";
import { participantCopy } from "@/lib/content/participant-copy";
import type { ExternalCredentialIssuer } from "@/lib/credentials/extended-runtime";

export function ExternalCredentialIssuerFields({ issuers }: { issuers: ExternalCredentialIssuer[] }) {
  const [selected, setSelected] = useState("");
  const usesOther = selected === "other";

  return (
    <>
      <Label>
        {participantCopy.certificates.fields.institution}
        <Select name="issuer_code" required value={selected} onChange={(event) => setSelected(event.target.value)}>
          <option value="">Selecione uma instituição</option>
          {issuers.map((issuer) => <option key={issuer.code} value={issuer.code}>{issuer.name}</option>)}
        </Select>
      </Label>
      {usesOther ? (
        <Label>
          {participantCopy.certificates.fields.otherInstitution}
          <Input name="issuer_other" required minLength={2} maxLength={160} placeholder="Digite o nome da instituição" />
        </Label>
      ) : null}
    </>
  );
}
