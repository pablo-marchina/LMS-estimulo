import { FileQuestion } from "lucide-react";
import { EstimuloBrand } from "@/components/estimulo-brand";
import { ButtonLink } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";

export default function NotFound() {
  return (
    <main className="grid min-h-screen place-items-center gap-6 bg-surface-muted p-6">
      <EstimuloBrand href="/" centered compact />
      <EmptyState
        icon={<FileQuestion size={20} aria-hidden="true" />}
        title="Conteúdo não encontrado"
        tone="warning"
        className="w-full max-w-md"
        action={
          <ButtonLink href="/empreendedor" variant="secondary">
            Voltar
          </ButtonLink>
        }
      >
        <p>O recurso solicitado não existe ou não está disponível para sua identidade.</p>
      </EmptyState>
    </main>
  );
}
