# Visual capture workflow

The repository includes a Playwright-based visual capture workflow for reviewing the real Estímulo interface in deterministic desktop and mobile viewports.

## What it captures

- Optional external visual reference landing page.
- Public Estímulo routes: `/`, `/entrar`, and `/cadastro`.
- Authenticated participant routes under `/empreendedor`.
- Authenticated administrator routes under `/admin`.
- Internal participant/admin links discovered during the crawl, up to the configured page cap.
- One representative instance of each known dynamic participant template (journey, module, trail, lesson, diagnostic, activity, competency, and validation) instead of redundant screenshots for every data instance.
- Full-page PNG screenshots at 1440x1000 (desktop) and 390x844 (mobile).
- A `visual-manifest.json` containing the requested/final URLs, status codes, titles, headings, rendered dimensions, horizontal-overflow warnings, failures, and screenshot paths.

The workflow never writes credentials into the artifact.

## Running it

Open **Actions → Production visual capture → Run workflow**.

`target_url` is optional. When omitted, the workflow uses the `E2E_PRODUCTION_URL` repository secret. This lets the same workflow audit production or a specific preview deployment without changing source code.

`reference_url` is optional and defaults to the Estímulo Lovable reference landing page. Set it to an empty value to skip the external reference.

The existing E2E participant/admin credentials are read from GitHub Actions secrets.

## Artifact

Every run uploads an artifact named `production-visual-capture-<run id>` for 14 days. Its directory structure is:

```text
artifacts/e2e-visual/
  reference/
    desktop/landing.png
    mobile/landing.png
  public/
    desktop/*.png
    mobile/*.png
  participant/
    desktop/*.png
    mobile/*.png
  admin/
    desktop/*.png
    mobile/*.png
  visual-manifest.json
```

Because screenshots are generated evidence, they stay out of Git through the repository's existing `artifacts/` ignore rule.

## Review principle

This workflow is evidence generation, not a pixel-diff gate. A visual reviewer should inspect the artifact and compare the product against the intended reference/design. Functional CI remains responsible for application correctness; visual evidence complements it by exposing layout, responsive, rendering, overflow, and hierarchy regressions that source-level checks cannot prove.
