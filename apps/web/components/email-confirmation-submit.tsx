"use client";

import { useEffect, useRef } from "react";
import { confirmEmailAction } from "@/app/auth/confirm/actions";
import { Button } from "@/components/ui/button";

export function EmailConfirmationSubmit({
  tokenHash,
  type,
  code,
}: {
  tokenHash: string;
  type: string;
  code: string;
}) {
  const formRef = useRef<HTMLFormElement>(null);
  const submittedRef = useRef(false);

  useEffect(() => {
    if (submittedRef.current) return;
    submittedRef.current = true;
    formRef.current?.requestSubmit();
  }, []);

  return (
    <form ref={formRef} action={confirmEmailAction} className="grid gap-3">
      <input type="hidden" name="token_hash" value={tokenHash} />
      <input type="hidden" name="type" value={type} />
      <input type="hidden" name="code" value={code} />
      <p className="text-sm text-muted" role="status">Confirmando seu e-mail…</p>
      <Button size="lg" type="submit" className="w-full">
        Confirmar agora
      </Button>
    </form>
  );
}
