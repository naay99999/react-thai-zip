# Security Policy

## Supported versions

Only the latest published version of `react-thaizip` receives security fixes.

## Reporting a vulnerability

Please **do not** open a public issue. Report it privately through
[GitHub private vulnerability reporting](https://github.com/naay99999/react-thai-zip/security/advisories/new).

Include the affected version, a minimal reproduction, and the impact you
expect. You should get an initial response within 7 days.

## What the CLI does on your machine

- `init` / `add` install `thaizip` (a bounded `^0.7.x` range) and the
  packages a component declares, through your own package manager.
- In a shadcn/ui project, `add` may download and run the pinned
  `shadcn@4.21.0` CLI to add missing primitives. It asks first unless you
  pass `--yes`.
- Files are only written inside the project root; paths from
  `thaizip.config.json` are validated and symlinks are not followed out of
  the project.

## Release integrity

Releases are published from `.github/workflows/release-please.yml` using npm
trusted publishing with provenance. Verify a release with
`npm audit signatures`.
