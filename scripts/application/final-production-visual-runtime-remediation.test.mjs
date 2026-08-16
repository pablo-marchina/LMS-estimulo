import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const [card, table, reports, engagement, extensionsRuntime, extensionsEdge, previewRoute] = await Promise.all([
  readFile("apps/web/components/ui/card.tsx", "utf8"),
  readFile("apps/web/components/ui/table.tsx", "utf8"),
  readFile("apps/web/app/admin/relatorios/page.tsx", "utf8"),
  readFile("apps/web/app/admin/engajamento/page.tsx", "utf8"),
  readFile("apps/web/lib/extensions/runtime.ts", "utf8"),
  readFile("supabase/functions/platform-extensions-rpc/index.ts", "utf8"),
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

test("certificate template preview RPC is allowlisted on the same gateway used by runtime", () => {
  assert.match(extensionsRuntime, /"get_admin_certificate_template_preview_download"/u);
  assert.match(previewRoute, /certificateTemplatePreviewDownload/u);
  assert.match(extensionsEdge, /const allowed = new Set\(\[/u);
  assert.match(extensionsEdge, /"get_admin_certificate_template_preview_download"/u);
  assert.match(extensionsEdge, /args\.p_actor_user_account_id = userAccountId/u);
});
