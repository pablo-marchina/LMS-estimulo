import BoostLandingPage from "./_landing-pages/boost-2026-08-16";
import ClassicLandingPage from "./_landing-pages/classic-2026-08-15";
import { getPublicPlatformSettings } from "@/lib/platform-settings/runtime";

export const dynamic = "force-dynamic";

export default async function PublicLandingPage() {
  const settings = await getPublicPlatformSettings();

  if (settings.landing_page_version === "boost_2026_08_16") {
    return <BoostLandingPage />;
  }

  return <ClassicLandingPage />;
}
