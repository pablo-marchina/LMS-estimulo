import AdminOverviewPage from "../page";

export default function IntegrationsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  return <AdminOverviewPage searchParams={searchParams} />;
}
