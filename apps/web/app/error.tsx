"use client";

import { AlertTriangle } from "lucide-react";
import { EstimuloBrand } from "@/components/estimulo-brand";
import { Button, ButtonLink } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";

export default function ErrorPage({ reset }: { error: Error; reset: () => void }) {
  return (
    <main className="grid min-h-screen place-items-center gap-6 bg-surface-muted p-6">
      <EstimuloBrand href="/" centered compact />
      <EmptyState
        icon={<AlertTriangle size={20} aria-hidden="true" />}
        title="Não foi possível carregar esta etapa"
        tone="warning"
        className="w-full max-w-md"
        action={
          <div className="flex flex-wrap justify-center gap-3">
            <Button onClick={reset}>Tentar novamente</Button>
            <ButtonLink href="/" variant="secondary">
              Voltar ao início
            </ButtonLink>
          </div>
        }
      >
        <p>Nenhum dado foi alterado. Tente novamente.</p>
      </EmptyState>
    </main>
  );
}
