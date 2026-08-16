import type { ReactNode } from "react";
import { ParticipantProfileTabs } from "@/components/participant-profile-tabs";
import { PageHeader } from "@/components/ui/page-header";

export default function ParticipantProfileLayout({ children }: { children: ReactNode }) {
  return <div className="mx-auto max-w-[1200px] px-4 pb-24 pt-8 sm:px-6 sm:pt-12">
    <PageHeader cmsKey="participant.page.perfil.header" eyebrow="Minha conta" title="Perfil" description="Consulte seu diagnóstico, atualize suas informações e acompanhe suas entregas." />
    <ParticipantProfileTabs />
    {children}
  </div>;
}
