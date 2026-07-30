import Link from "next/link";
import { CircleHelp } from "lucide-react";

export function SupportButton() {
  return (
    <Link
      href="/ajuda"
      className="fixed bottom-5 right-5 z-50 inline-flex min-h-11 items-center gap-2 rounded-full border border-primary/20 bg-white px-4 py-2.5 text-sm font-bold text-primary shadow-lg transition hover:-translate-y-0.5 hover:bg-primary-soft focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--color-ring)"
      aria-label="Abrir ajuda e suporte"
    >
      <CircleHelp size={19} aria-hidden="true" />
      <span className="hidden sm:inline">Ajuda</span>
    </Link>
  );
}
