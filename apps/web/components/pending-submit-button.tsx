"use client";

import { useFormStatus } from "react-dom";
import { Button, type ButtonProps } from "@/components/ui/button";

export type PendingSubmitButtonProps = ButtonProps & {
  pendingLabel?: string;
};

export function PendingSubmitButton({
  pendingLabel = "Processando…",
  children,
  disabled,
  type = "submit",
  ...props
}: PendingSubmitButtonProps) {
  const { pending } = useFormStatus();

  return (
    <Button
      {...props}
      type={type}
      disabled={disabled || pending}
      loading={pending}
      aria-disabled={disabled || pending || undefined}
    >
      {pending ? pendingLabel : children}
    </Button>
  );
}
