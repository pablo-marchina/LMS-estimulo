import { redirect } from "next/navigation";

export default function OptionalDiagnosticsRedirect() {
  redirect("/admin/diagnostico?tipo=opcionais");
}
