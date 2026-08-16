import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const [
  carousel,
  journeys,
  rewards,
  bannerRoute,
  coverRoute,
  thumbnailRoute,
  rewardRoute,
  interfaceImageRoute,
  certificatePreviewRoute,
  bannerStorage,
  rewardStorage,
] = await Promise.all([
  readFile("apps/web/components/announcement-carousel.tsx", "utf8"),
  readFile("apps/web/app/empreendedor/jornadas/page.tsx", "utf8"),
  readFile("apps/web/app/empreendedor/recompensas/rewards-experience.tsx", "utf8"),
  readFile("apps/web/app/api/announcements/[announcementId]/image/route.ts", "utf8"),
  readFile("apps/web/app/api/journey-covers/[journeyVersionId]/[variant]/route.ts", "utf8"),
  readFile("apps/web/app/api/activity-thumbnails/[stepInstanceId]/route.ts", "utf8"),
  readFile("apps/web/app/api/rewards/[rewardId]/image/route.ts", "utf8"),
  readFile("apps/web/app/api/interface-content/image/route.ts", "utf8"),
  readFile("apps/web/app/api/certificate-template-previews/[fileObjectId]/route.ts", "utf8"),
  readFile("apps/web/lib/storage/announcement-banners.ts", "utf8"),
  readFile("apps/web/lib/storage/reward-images.ts", "utf8"),
]);

const cachedPrivateRoutes = [bannerRoute, coverRoute, thumbnailRoute, rewardRoute, interfaceImageRoute, certificatePreviewRoute];

test("authenticated image redirects are reusable, private and segregated by session", () => {
  for (const source of cachedPrivateRoutes) {
    assert.match(source, /private, max-age=300/u);
    assert.doesNotMatch(source, /cache-control[^\n]*public/u);
    assert.match(source, /vary[^\n]*Cookie|headers\.set\("vary", "Cookie"\)/u);
  }
  assert.match(bannerStorage, /ANNOUNCEMENT_BANNER_SIGNED_URL_SECONDS = 900/u);
  assert.match(rewardStorage, /REWARD_IMAGE_SIGNED_URL_SECONDS = 900/u);
  assert.match(coverRoute, /SIGNED_URL_SECONDS = 900/u);
  assert.match(thumbnailRoute, /SIGNED_URL_SECONDS = 900/u);
  assert.match(interfaceImageRoute, /SIGNED_URL_SECONDS = 900/u);
  assert.match(certificatePreviewRoute, /SIGNED_URL_SECONDS = 900/u);
});

test("critical artwork loads first while secondary catalog imagery is deferred", () => {
  assert.match(carousel, /loading=\{priority \? "eager" : "lazy"\}/u);
  assert.match(carousel, /fetchPriority=\{priority \? "high" : "auto"\}/u);
  assert.match(journeys, /loading="eager" fetchPriority="high" decoding="async"/u);
  assert.match(journeys, /loading="lazy" decoding="async"/u);
  assert.match(rewards, /loading="lazy" decoding="async"/u);
});

test("image-only announcements do not cover uploaded artwork with UI overlays", () => {
  assert.match(carousel, /const imageOnly = announcement\.display_mode === "image_only"/u);
  assert.match(carousel, /\{!imageOnly \? <>/u);
  assert.doesNotMatch(carousel, /imageOnly \? "!bg-/u);
});
