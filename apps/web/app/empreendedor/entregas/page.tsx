import { redirect } from "next/navigation";

export default function ParticipantSubmissionsPage() {
  redirect("/empreendedor/perfil?aba=entregas#materiais-enviados");
}
