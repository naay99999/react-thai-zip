# Changelog

## [0.2.1](https://github.com/naay99999/react-thai-zip/compare/react-thaizip-v0.2.0...react-thaizip-v0.2.1) (2026-05-05)


### Features

* add component registry and init command ([9e5cfb9](https://github.com/naay99999/react-thai-zip/commit/9e5cfb9687e6d7e8eb831e0e13adc8be0f370417))
* release 0.2.0 — multi-target add, onClear for CascadeSelect, bun.lock detection ([06c31f7](https://github.com/naay99999/react-thai-zip/commit/06c31f76b2d880ca7195de7042771144762da66f))

## [0.2.0](https://github.com/naay99999/react-thai-zip/releases/tag/v0.2.0) - 2026-05-05

### Features

- `add` command now accepts multiple component targets at once — e.g. `npx react-thaizip add autocomplete cascade-select`
- `ThaiAddressCascadeSelect` template (TS + JS) now accepts an `onClear` prop that fires whenever the province or district selection is reset

### Bug Fixes

- Bun package-manager detection now recognises `bun.lock` (the text lockfile introduced in Bun 1.2) in addition to the legacy `bun.lockb` binary lockfile
- `CORE_PACKAGE_VERSION` updated to `^0.4.0` to track the latest `thaizip` release
- `ThaiAddressCascadeSelect` and `ThaiAddressPostalCodeForm` templates: labels are now associated with their inputs via `useId` + `htmlFor`/`id`, improving accessibility
- Template labels localised to Thai (จังหวัด, อำเภอ/เขต, ตำบล/แขวง, รหัสไปรษณีย์)
- Clear button in `ThaiAddressAutocomplete` uses the `✕` glyph instead of the ASCII `x`

---

## [0.1.2](https://github.com/naay99999/react-thai-zip/compare/react-thaizip-v0.1.1...react-thaizip-v0.1.2) (2026-04-21)

### Features

* add component registry and init command ([9e5cfb9](https://github.com/naay99999/react-thai-zip/commit/9e5cfb9687e6d7e8eb831e0e13adc8be0f370417))

---

## [0.1.1] - 2025-12-01

### Bug Fixes

- Initial working release of the scaffold CLI

---

## [0.1.0] - 2025-12-01

### Features

- Initial release — `npx react-thaizip init` and `npx react-thaizip add <component>` commands
- Component registry with four templates: `ThaiAddressAutocomplete`, `ThaiAddressPostalCodeForm`, `ThaiAddressCascadeSelect`, `ThaiAddressDisplayFields`
- TypeScript and JavaScript template variants
- Package-manager detection (npm / yarn / pnpm / bun)
- Next.js App Router and Pages Router project-structure detection
- Tailwind detection and optional install
