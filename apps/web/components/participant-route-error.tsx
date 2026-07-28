"use client";

import { AlertTriangle, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export function ParticipantRouteError({ reset }: { reset: () => void }) {
  return (
    <div className="mx-auto grid w-full max-w-[1400px] gap-5 px-5 py-8 lg:px-9 lg:py-10" role="alert">
      <Card className="border-warning/30 bg-warning-soft/40">
        <div className="flex items-start gap-4">
          <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-white text-warning shadow-sm"><AlertTriangle size={22} /></span>
          <div>
            <h1 className="text-xl font-black text-secondary">Não foi possível carregar esta página</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-muted">Seus dados continuam salvos. Tente carregar novamente; se a indisponibilidade continuar, volte pelo menu principal.</p>
            <Button type="button" className="mt-5" icon={<RotateCcw size={16} />} onClick={reset}>Tentar novamente</Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
