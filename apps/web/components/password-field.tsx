"use client";

import { Eye, EyeOff } from "lucide-react";
import { useId, useState, type InputHTMLAttributes } from "react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type PasswordFieldProps = Omit<InputHTMLAttributes<HTMLInputElement>, "type"> & {
  label?: string;
  help?: string;
};

export function PasswordField({ id, label = "Senha", help, className, ...props }: PasswordFieldProps) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const [visible, setVisible] = useState(false);

  return (
    <label className="grid w-full min-w-0 gap-1.5 text-sm font-medium text-ink" htmlFor={inputId}>
      <span>{label}</span>
      <span className="relative block w-full min-w-0">
        <Input
          {...props}
          id={inputId}
          type={visible ? "text" : "password"}
          className={cn("w-full pr-12", className)}
        />
        <button
          type="button"
          className="absolute right-2 top-1/2 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-md text-muted transition hover:bg-surface-muted hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--color-ring)"
          aria-label={visible ? "Ocultar senha" : "Mostrar senha"}
          aria-pressed={visible}
          onClick={() => setVisible((current) => !current)}
        >
          {visible ? <EyeOff size={18} aria-hidden="true" /> : <Eye size={18} aria-hidden="true" />}
        </button>
      </span>
      {help ? <span className="text-xs font-normal leading-5 text-muted">{help}</span> : null}
    </label>
  );
}
