// Temporary QA branch shim: run the focused real-user quick-check validation
// through the already-trusted Production visual capture workflow.
process.env.E2E_TARGET_URL = "https://lms-estimulo-web.vercel.app";
await import("./quick-check-user-validation.mjs");
