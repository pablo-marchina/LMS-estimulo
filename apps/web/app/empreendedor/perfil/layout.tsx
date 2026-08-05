import type { ReactNode } from "react";
import { ParticipantProfileMaterials } from "@/components/participant-profile-materials";

export default function ParticipantProfileLayout({ children }: { children: ReactNode }) {
  return (
    <>
      {children}
      <ParticipantProfileMaterials />
    </>
  );
}
