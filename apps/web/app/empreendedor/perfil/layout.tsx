import type { ReactNode } from "react";
import { ParticipantProfileTabs } from "@/components/participant-profile-tabs";
import { PageHeader } from "@/components/ui/page-header";

export default function ParticipantProfileLayout({ children }: { children: ReactNode }) {
  return <div className="mx-auto max-w-[1400px] px-5 py-8 lg:px-9 lg:py-10">
    <PageHeader cmsKey="participant.page.perfil.header" eyebrow="Minha conta" title="Perfil" description="Consulte seu diagnóstico, atualize suas informações e acompanhe suas entregas." />
    <ParticipantProfileTabs />
    {children}
  </div>;
}
