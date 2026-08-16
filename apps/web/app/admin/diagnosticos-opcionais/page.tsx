import AdminDiagnosticPage from "../diagnostico/page";

export const dynamic = "force-dynamic";

export default function AdminOptionalDiagnosticsPage() {
  return <AdminDiagnosticPage searchParams={Promise.resolve({ tipo: "opcionais" })} />;
}
