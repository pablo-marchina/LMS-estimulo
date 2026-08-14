import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const [manager, route] = await Promise.all([
  readFile("apps/web/components/admin-program-manager.tsx", "utf8"),
  readFile("apps/web/app/api/admin/programs/route.ts", "utf8"),
]);

test("program manager keeps async form state stable and handles transport failures", () => {
  assert.match(manager, /const formElement = event\.currentTarget/u);
  assert.match(manager, /if \(ok\) formElement\.reset\(\)/u);
  assert.doesNotMatch(manager, /if \(ok\) event\.currentTarget\.reset\(\)/u);
  assert.match(manager, /catch \(error\)/u);
  assert.match(manager, /finally \{\s*setSaving\(false\);\s*\}/u);
  assert.match(manager, /finally \{\s*setLoading\(false\);\s*\}/u);
  assert.match(manager, /load\(\{ preserveMessage: true \}\)/u);
  assert.match(manager, /role="status" aria-live="polite"/u);
});

test("program API preserves gateway failure semantics instead of flattening all writes to HTTP 400", () => {
  assert.match(route, /ServerRpcError/u);
  assert.match(route, /const code = error\.code/u);
  assert.match(route, /INTERFACE_PREVIEW_WRITE_BLOCKED/u);
  assert.match(route, /code === "23503"/u);
  assert.match(route, /code === "RATE_LIMITED"/u);
  assert.match(route, /code === "RPC_GATEWAY_TIMEOUT"/u);
  assert.match(route, /RPC_GATEWAY_UNAVAILABLE/u);
  assert.match(route, /event: "admin_program_save_failed"/u);
  assert.match(route, /"x-request-id": requestId/u);
  assert.doesNotMatch(route, /return NextResponse\.json\(\{ error: friendly \}, \{ status: 400 \}\)/u);
});
