import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const [card, table, reports, engagement, mediaGateway, mediaEdge, previewRoute] = await Promise.all([
  readFile("apps/web/components/ui/card.tsx", "utf8"),
  readFile("apps/web/components/ui/table.tsx", "utf8"),
  readFile("apps/web/app/admin/relatorios/page.tsx", "utf8"),
  readFile("apps/web/app/admin/engajamento/page.tsx", "utf8"),
  readFile("apps/web/lib/rpc/media-gateway.ts", "utf8"),
  readFile("supabase/functions/authenticated-media-rpc/index.ts", "utf8"),
  readFile("apps/web/app/api/certificate-template-previews/[fileObjectId]/route.ts", "utf8"),
]);

test("shared admin surfaces can shrink before wide content scrolls internally", () => {
  assert.match(card, /min-w-0 max-w-full rounded-xl/u);
  assert.match(card, /mb-4 flex min-w-0/u);
  assert.match(table, /w-full min-w-0 max-w-full overflow-x-auto/u);
  assert.match(reports, /className="grid min-w-0 gap-6"/u);
});

test("announcement management contains intrinsic mobile width without clipping its form", () => {
  assert.match(engagement, /className="grid min-w-0 gap-6"/u);
  assert.match(engagement, /<section className="grid min-w-0 gap-4"/u);
  assert.match(engagement, /<details className="min-w-0 max-w-full overflow-hidden/u);
  assert.match(engagement, /<summary className="flex min-w-0 cursor-pointer list-none flex-wrap/u);
  assert.match(engagement, /sm:flex-nowrap/u);
  assert.match(engagement, /<StatusPill className="shrink-0"/u);
});

test("certificate template preview RPC is allowlisted on the dedicated media gateway used by runtime", () => {
  assert.match(mediaGateway, /"get_admin_certificate_template_preview_download"/u);
  assert.match(previewRoute, /invokeMediaDescriptorGateway<Descriptor>\("get_admin_certificate_template_preview_download"/u);
  assert.match(mediaEdge, /const allowed = new Set\(\[/u);
  assert.match(mediaEdge, /"get_admin_certificate_template_preview_download"/u);
  assert.match(mediaEdge, /args\.p_actor_user_account_id = userAccountId/u);
});
