import process from "node:process";

const baseUrl = new URL(process.env.HTTP_HARDENING_BASE_URL?.trim() || "http://127.0.0.1:3000");
const path = process.env.HTTP_HARDENING_PATH?.trim() || "/api/health/live";
const url = new URL(path, baseUrl);
const response = await fetch(url, {
  headers: { "x-request-id": "hardening-verification" },
  cache: "no-store",
  signal: AbortSignal.timeout(10_000),
});

const errors = [];
if (response.status !== 200) errors.push(`expected HTTP 200, received ${response.status}`);

const requiredHeaders = {
  "x-content-type-options": "nosniff",
  "referrer-policy": "strict-origin-when-cross-origin",
  "x-frame-options": "SAMEORIGIN",
  "x-permitted-cross-domain-policies": "none",
  "cross-origin-opener-policy": "same-origin-allow-popups",
  "cross-origin-resource-policy": "same-site",
  "content-security-policy": "frame-ancestors 'self'",
  "strict-transport-security": "max-age=63072000",
  "permissions-policy": "camera=()",
  "cache-control": "no-store",
  "x-request-id": "hardening-verification",
};

for (const [name, expectedFragment] of Object.entries(requiredHeaders)) {
  const value = response.headers.get(name) ?? "";
  if (!value.includes(expectedFragment)) errors.push(`${name} is missing or invalid`);
}

if (!response.headers.get("server-timing")) errors.push("server-timing is missing");
if (response.headers.get("access-control-allow-origin") === "*") {
  errors.push("wildcard access-control-allow-origin is forbidden");
}

const result = {
  status: errors.length === 0 ? "passed" : "failed",
  target: url.toString(),
  http_status: response.status,
  errors,
};
process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
if (errors.length > 0) process.exitCode = 1;
