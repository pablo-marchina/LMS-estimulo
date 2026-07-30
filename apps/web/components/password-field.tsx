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
  const [visible, setVisible] = useState(true);

  return (
    <label className="grid gap-1.5 text-sm font-medium text-ink" htmlFor={inputId}>
      <span>{label}</span>
      <span className="relative block">
        <Input
          {...props}
          id={inputId}
          type={visible ? "text" : "password"}
          className={cn("pr-12", className)}
        />
        <button
          type="button"
          className="absolute inset-y-0 right-1 my-1 grid w-10 place-items-center rounded-md text-muted transition hover:bg-surface-muted hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--color-ring)"
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
