"use client";

import { Suspense, useEffect, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import Script from "next/script";

const measurementId = process.env.NEXT_PUBLIC_GOOGLE_ANALYTICS_ID?.trim() ?? "";
const validMeasurementId = /^G-[A-Z0-9]{6,20}$/u.test(measurementId) ? measurementId : "";

type AnalyticsWindow = Window & {
  gtag?: (...args: unknown[]) => void;
};

function GoogleAnalyticsPageView({ ready }: { ready: boolean }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const search = searchParams.toString();

  useEffect(() => {
    if (!ready || !validMeasurementId) return;
    const analyticsWindow = window as AnalyticsWindow;
    if (typeof analyticsWindow.gtag !== "function") return;
    const pagePath = search ? `${pathname}?${search}` : pathname;
    analyticsWindow.gtag("event", "page_view", {
      page_path: pagePath,
      page_location: window.location.href,
      page_title: document.title,
    });
  }, [pathname, ready, search]);

  return null;
}

export function GoogleAnalytics() {
  const [ready, setReady] = useState(false);
  if (!validMeasurementId) return null;

  return <>
    <Script src={`https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(validMeasurementId)}`} strategy="afterInteractive" />
    <Script id="google-analytics" strategy="afterInteractive" onReady={() => setReady(true)}>{`
      window.dataLayer = window.dataLayer || [];
      function gtag(){dataLayer.push(arguments);}
      gtag('js', new Date());
      gtag('config', '${validMeasurementId}', { send_page_view: false });
    `}</Script>
    <Suspense fallback={null}>
      <GoogleAnalyticsPageView ready={ready} />
    </Suspense>
  </>;
}
