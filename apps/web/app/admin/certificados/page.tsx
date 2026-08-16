import AdminGamificationPage from "../gamificacao/page";

export const dynamic = "force-dynamic";

export default function AdminCertificatesPage() {
  return <AdminGamificationPage searchParams={Promise.resolve({ tipo: "certificados" })} />;
}
