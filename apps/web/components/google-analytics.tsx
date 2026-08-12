import Script from "next/script";

const measurementId = process.env.NEXT_PUBLIC_GOOGLE_ANALYTICS_ID?.trim() ?? "";
const validMeasurementId = /^G-[A-Z0-9]{6,20}$/u.test(measurementId) ? measurementId : "";

export function GoogleAnalytics() {
  if (!validMeasurementId) return null;
  return <>
    <Script src={`https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(validMeasurementId)}`} strategy="afterInteractive" />
    <Script id="google-analytics" strategy="afterInteractive">{`
      window.dataLayer = window.dataLayer || [];
      function gtag(){dataLayer.push(arguments);}
      gtag('js', new Date());
      gtag('config', '${validMeasurementId}', { send_page_view: true });
    `}</Script>
  </>;
}
