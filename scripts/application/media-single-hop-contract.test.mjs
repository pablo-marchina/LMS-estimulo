import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const [edge, client, banner, cover, thumbnail, reward, interfaceImage, carousel, integrationsAlias] = await Promise.all([
  readFile("supabase/functions/authenticated-media-rpc/index.ts", "utf8"),
  readFile("apps/web/lib/rpc/media-gateway.ts", "utf8"),
  readFile("apps/web/app/api/announcements/[announcementId]/image/route.ts", "utf8"),
  readFile("apps/web/app/api/journey-covers/[journeyVersionId]/[variant]/route.ts", "utf8"),
  readFile("apps/web/app/api/activity-thumbnails/[stepInstanceId]/route.ts", "utf8"),
  readFile("apps/web/app/api/rewards/[rewardId]/image/route.ts", "utf8"),
  readFile("apps/web/app/api/interface-content/image/route.ts", "utf8"),
  readFile("apps/web/components/announcement-carousel.tsx", "utf8"),
  readFile("apps/web/app/admin/integracoes/page.tsx", "utf8"),
]);

const operations = [
  "get_announcement_banner_download",
  "get_interface_content_image_download",
  "get_journey_cover_download",
  "get_participant_lesson_thumbnail_download",
  "get_reward_image_download",
].sort();

function edgeAllowlist() {
  const match = edge.match(/const allowed = new Set\(\[([\s\S]*?)\]\);/u);
  assert.ok(match, "media gateway allowlist must remain statically auditable");
  return Array.from(match[1].matchAll(/"([a-z0-9_]+)"/gu), (entry) => entry[1]).sort();
}

test("media edge gateway is read-only and always injects the authenticated actor", () => {
  assert.deepEqual(edgeAllowlist(), operations);
  assert.equal(operations.every((operation) => operation.startsWith("get_")), true);
  assert.match(edge, /args\.p_actor_user_account_id = userAccountId/u);
  assert.match(edge, /auth\.getUser\(token\)/u);
  assert.match(edge, /e14_resolve_identity/u);
});

test("server media client sends no actor and targets only the dedicated edge function", () => {
  assert.match(client, /authenticated-media-rpc/u);
  assert.match(client, /MediaDescriptorOperation/u);
  assert.doesNotMatch(client, /p_actor_user_account_id/u);
  assert.match(client, /createSessionClient/u);
});

test("normal media requests use one gateway while interface preview preserves the existing path", () => {
  for (const source of [banner, cover, thumbnail, reward, interfaceImage]) {
    assert.match(source, /INTERFACE_PREVIEW_REQUEST_HEADER/u);
    assert.match(source, /invokeMediaDescriptorGateway/u);
  }
  assert.match(banner, /engagementRuntime\.getAnnouncementBannerDownload/u);
  assert.match(cover, /invokeServerRpc<CoverDescriptor>\("get_journey_cover_download"/u);
  assert.match(thumbnail, /invokeServerRpc<Descriptor>\("get_participant_lesson_thumbnail_download"/u);
  assert.match(reward, /extensionsRuntime\.rewardImageDownload/u);
  assert.match(interfaceImage, /invokeServerRpc<Descriptor>\("get_interface_content_image_download"/u);
});

test("banner mobile aspect follows the asset that is actually available", () => {
  assert.match(carousel, /mobile_image_file_object_id \? "max-md:!aspect-\[4\/5\]" : "max-md:!aspect-\[8\/3\]"/u);
  assert.match(carousel, /media="\(max-width: 767px\)"/u);
  assert.match(carousel, /imageOnly/u);
});

test("legacy integrations alias renders overview without a redirect frame", () => {
  assert.match(integrationsAlias, /AdminOverviewPage/u);
  assert.doesNotMatch(integrationsAlias, /redirect\(/u);
});