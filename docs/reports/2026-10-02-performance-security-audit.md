# Performance and security audit: `react-thaizip`

**Date:** 2026-10-02  
**Revision:** `2260562` (`main`), package version `0.3.7`  
**Scope:** CLI source, generated React templates, package/release configuration, and a targeted scan of `apps/docs`. This is a source and local behavior audit, not a penetration test or a current dependency-advisory assessment.

## Summary

| ID | Area | Priority | Finding |
| --- | --- | --- | --- |
| S1 | Security | Medium | `init` and config migration can write through project symlinks to files outside the project. |
| S2 | Supply chain | Medium | Missing shadcn primitives trigger execution of mutable `shadcn@latest`. |
| P1 | Performance | Medium | Generated interactive components load and build the address index as soon as they mount. |
| P2 | Performance | Low | TypeScript is lazy at runtime but remains a 23 MB installed dependency for every CLI consumer. |
| S3 | Release hardening | Low | Publishing uses tag-pinned GitHub Actions and an npm token, without trusted publishing/provenance. |

The earlier [August security/performance audit](../../superpowers/reports/2026-08-28-security-performance-audit.md) and [September measured performance audit](../../superpowers/reports/2026-09-11-performance-audit-measured.md) are useful history, but several conclusions are stale for this revision. `add` now rejects unsafe configured destinations, the CLI loads TypeScript only on JavaScript-target scaffolds, the published CLI has no sourcemap, and installed `thaizip@0.7.5` has a separate dynamic `defaultData.js` module. The remaining index issue is **when** that separate module is requested and built, not a claim that it remains bundled into initial JavaScript.

## Findings

### S1 — Other CLI writes bypass the component path guard (Medium)

**Evidence.** `src/commands/add.ts:153-159` calls both lexical and symlink-aware containment checks for generated files. `src/commands/init.ts:84-85` sends a detected CSS path straight to `ensureTokens`; `src/utils/tokens.ts:124-132` reads and writes it through symlinks. `src/utils/config.ts:224-239` rewrites a migrated `thaizip.config.json` through `writeConfig` (`:253-255`) without checking the config file's real path. The latter occurs before `add` reaches its protected component write loop.

**Reproduced locally with the built CLI.** In a temporary project, `app/globals.css` was a symlink to a sibling `outside.css` containing `@import "tailwindcss";`. Running `node dist/cli.js init --yes` exited 0 and appended the design-token block to `outside.css`. In a second temporary project, `thaizip.config.json` was a symlink to a sibling v3 config file. Running `node dist/cli.js add address-display --yes` exited 0 and migrated that outside file to v4 before writing components. Both fixtures were removed after the check.

**Impact and conditions.** A project checkout containing a crafted symlink can cause the CLI to modify a writable file outside its project. The CSS case needs a detectable Tailwind marker in the linked file; the migration case needs an older valid config. This is a local, project-content-controlled write, not a remote input path.

**Recommendation.** Apply `assertPathInsideRoot` and `assertRealPathInsideRoot` to every CLI write target, including CSS and config. For files that may be replaced concurrently, open with no-follow semantics or recheck at the point of writing; a preflight realpath check alone does not close a time-of-check/time-of-use race. Add regression tests for both symlink cases.

### S2 — Mutable remote CLI is executed during `add` (Medium)

**Evidence.** `src/utils/shadcnPrimitives.ts:31-49` invokes `shadcn@latest add` whenever required primitive files are missing. `src/utils/detectPM.ts:69-83` maps npm to `npx --yes`, which suppresses npm's package-install prompt. The shadcn version used at a future run is therefore not tied to this CLI release or the target project's lockfile. It can also change generated code and transitive dependencies between otherwise identical scaffold runs.

**Impact and conditions.** This affects shadcn-style projects only when a requested primitive is missing. It is a reproducibility and supply-chain exposure, not evidence of a compromised package. `--yes` additionally passes `-y` to shadcn itself; without `--yes`, shadcn may still show its own prompts.

**Recommendation.** Pin an audited shadcn CLI version for each `react-thaizip` release, document when it changes, and show the exact command/version before execution. Keep the existing argument-array spawn (`src/utils/install.ts:12-17`), which avoids shell interpolation.

### P1 — Address data work begins on mount (Medium)

**Evidence.** The generated `templates/react/ts/hooks/use-thai-address-index.ts:25-40` calls `loadDefaultIndex()` in a mount effect. Autocomplete and cascade templates, including the three shadcn variants, call this hook while rendering. In the installed `thaizip@0.7.5`, `dist/data.js:207` dynamically imports `./defaultData.js`; the latter is 529,182 bytes raw and 120,907 bytes when gzipped in a local standalone-file check. The loader deduplicates in-flight work, so multiple mounted fields do not imply multiple index builds.

**Impact.** A page containing a mounted but unused interactive address field requests and builds the full index before the user engages with it. Splitting the module protects initial bundle size, but does not defer this network and main-thread work past mount. The exact browser transfer size and latency were not remeasured for this revision; standalone gzip is only a size indicator.

**Recommendation.** Offer an explicit loading policy for generated components: retain eager loading where the field is immediately usable above the fold, and allow loading on first focus/interaction for deferred fields, with optional preloading before likely use. Measure first interaction latency and main-thread time in a production browser build before changing the default. Preserve the existing singleton/in-flight dedup behavior.

### P2 — TypeScript dominates cold CLI installation footprint (Low)

**Evidence.** `src/utils/stripTypes.ts:1-21` now loads TypeScript lazily with `createRequire`, so `--help` and TypeScript-target scaffolds avoid its startup cost. `package.json:40-44` still makes TypeScript an unconditional runtime dependency because JavaScript-target scaffolds need `transpileModule`. The local installed TypeScript directory is 23 MB; the CLI's own dry-run npm tarball is 39,090 bytes. Eight local `node dist/cli.js --help` runs had a 41.95 ms median on this machine (Node 26.4.0); this is not a cold `npx` benchmark.

**Impact.** Every fresh installation resolves and stores TypeScript even when the user only runs help, init, or a TypeScript-target add. This is primarily an installation/download footprint issue, not the old eager startup issue.

**Recommendation.** Keep TypeScript as a required dependency until an alternative JS transform or a robust on-demand installation path is designed. If cold `npx` performance is a priority, benchmark a replacement on both TSX and JSX templates before changing package dependencies.

### S3 — Release workflow hardening (Low)

**Evidence.** `.github/workflows/release-please.yml:18,29-39` uses `googleapis/release-please-action@v4`, `actions/checkout@v4`, and `actions/setup-node@v4`, then publishes with `NPM_TOKEN`. These tags can move, and the workflow does not configure npm trusted publishing/provenance. This is a release-chain hardening observation, not a demonstrated exploit.

**Recommendation.** Pin Actions to reviewed commit SHAs and consider npm trusted publishing with OIDC and provenance, after verifying the package's npm and GitHub settings. Keep token permissions limited per job.

## Checks and limits

- `npm run build`: passed; built `dist/cli.js` is 53,059 bytes with no sourcemap.
- `npm test`: 39 test files, 410 tests passed.
- `npm run typecheck` and `npm run typecheck:templates`: passed.
- `npm pack --dry-run --json` with a temporary npm cache: 24 files, 39,090-byte package; no fixture files or source maps in the listed tarball.
- Two temporary CLI fixtures confirmed S1. No production source was changed.
- `npm audit --omit=dev` could not run: this environment could not resolve `registry.npmjs.org` (`ENOTFOUND`). This report makes no claim that current dependencies are free of advisories.
- No fresh Lighthouse or production browser benchmark was run. P1's priority is based on current source behavior and local module size, not a measured Core Web Vitals change.

## Suggested order

1. Guard CSS and config writes, then add the two symlink regression tests (S1).
2. Pin and surface the shadcn CLI version (S2).
3. Benchmark eager versus interaction-triggered index loading in a production app before changing template behavior (P1).
4. Address release hardening (S3) and revisit the TypeScript install footprint (P2) when optimizing cold installation.

## Remediation progress (2026-10-02)

The findings and checks above describe the original audit. The changes below were made afterward in this workspace.

| Finding | Change |
| --- | --- |
| S1 | CSS and config writes now use project-root containment checks and no-follow file opens. Regression tests cover both outside-project symlinks. |
| S2 | Missing primitives invoke `shadcn@4.21.0`, matching the committed Radix/Aria fixtures; the exact command is printed. |
| P1 | Generated interactive components and form wrappers accept `indexLoad="visible"`; mount loading remains the default. A hook test verifies no load before viewport intersection. |
| P2 | JavaScript-target scaffolds use Sucrase. TypeScript is a development dependency; a packed-package JS-target smoke test generated JSX successfully. |
| S3 | CI and release Actions are pinned to commit SHAs. The publish job has scoped permissions, OIDC permission, npm CLI 11.17.0, and provenance enabled. The existing npm token remains as a fallback until the package's trusted publisher is configured on npmjs.com. |

The npm-side trusted publisher setting cannot be verified from this workspace. Configure the GitHub Actions trusted publisher for `naay99999/react-thai-zip`, workflow filename `release-please.yml`, and allow direct `npm publish`; after a successful OIDC release, remove `NPM_TOKEN` from the publish step and revoke the old token. See [npm's trusted publishing setup](https://docs.npmjs.com/trusted-publishers/).

**Post-remediation verification.** The full test suite passed (41 files, 419 tests), as did the package build, package and template typechecks, and documentation site build. The built CLI refused both original outside-project symlink fixtures without changing the external files. A packed-package JavaScript-target smoke test generated JSX successfully. Workflow YAML parsed, and `git diff --check` passed. The packed tarball contains 24 files and is 39,940 bytes. No production browser benchmark was run, so first-interaction latency for `indexLoad="visible"` remains unmeasured; the npm account's trusted publisher configuration also remains unverified.
