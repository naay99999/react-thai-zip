# Changelog

## [0.3.5](https://github.com/naay99999/react-thai-zip/compare/react-thaizip-v0.3.4...react-thaizip-v0.3.5) (2026-09-03)


### Features

* add --npm flag to sandbox script for testing the published package ([7db591a](https://github.com/naay99999/react-thai-zip/commit/7db591a7ed1b763a30a1fdc21b5ad4056467f9a5))
* add ThaiAddressDisplay registry component ([24f09bb](https://github.com/naay99999/react-thai-zip/commit/24f09bbffd82b540ce5ef6d44fbc0fc49287a70f))
* add ThaiAddressForm registry component ([fc5d93c](https://github.com/naay99999/react-thai-zip/commit/fc5d93c85413e895caa1a6d689bc959f4002c9b6))
* add ThaiAddressFormField registry component ([49b51a1](https://github.com/naay99999/react-thai-zip/commit/49b51a12f3beb5e58e159efe33b5f6c7b7d420a9))
* add TS-stripping and TypeScript detection utils for JS scaffold output ([d0aa0da](https://github.com/naay99999/react-thai-zip/commit/d0aa0da70dbd005863bbc7fbca560ed6b5dfb8cf))
* allow typescript: false in thaizip.config.json for JS-target scaffolds ([e2baa6f](https://github.com/naay99999/react-thai-zip/commit/e2baa6f6ad2d9ee93fc3a7b4c5723e11b2a4516a))
* detect target project language (TS/JS) in react-thaizip init ([14a6711](https://github.com/naay99999/react-thai-zip/commit/14a6711f0a1cc11b95fdee43bba1c9cb4545401c))
* scaffold JavaScript output for JS-target projects in react-thaizip add ([4212444](https://github.com/naay99999/react-thai-zip/commit/4212444e3b07dbef8f3bab3ccea1f0e919f0d81e))


### Bug Fixes

* address code-review findings in ThaiAddressForm/FormField templates ([722004c](https://github.com/naay99999/react-thai-zip/commit/722004c93f6df5700686ed18c482b0aaca42e5cb))
* address final review findings — controlled-mode deadlock, required wiring, add.ts coverage, doc fixes ([31adae6](https://github.com/naay99999/react-thai-zip/commit/31adae68de9c610420d7238b27f54df73766785f))
* address final review findings — docs accuracy, runtime-dep note, stripTypes diagnostics ([5e3dce8](https://github.com/naay99999/react-thai-zip/commit/5e3dce83faca8a20c3770ed73a7ca65e1047defc))
* auto-detect libDir/hooksDir like componentDir, pin sandbox turbopack root ([795b1f1](https://github.com/naay99999/react-thai-zip/commit/795b1f1d283ae17ec0129aa665ce97e0129094bd))
* romanize ThaiAddressDisplay street words under locale="en", document new components in CLAUDE.md, widen cli.test.ts help coverage ([3f87e8b](https://github.com/naay99999/react-thai-zip/commit/3f87e8b74c13e1e07120d45f54a0aa6c8523afa2))
* stop ThaiAddressFormField from forwarding name to the embedded cascade ([66aeda1](https://github.com/naay99999/react-thai-zip/commit/66aeda1bc477006e4f9f12dd379d9c08e4c8a886))

## [0.3.4](https://github.com/naay99999/react-thai-zip/compare/react-thaizip-v0.3.3...react-thaizip-v0.3.4) (2026-08-29)


### Features

* **add:** let --overwrite refresh lib/hook files and warn when they are stale ([5bb2932](https://github.com/naay99999/react-thai-zip/commit/5bb29321eb821ff692bd98945101fa918049e586))
* **init:** summarize detected settings and defer manual steps to the end ([c5762c6](https://github.com/naay99999/react-thai-zip/commit/c5762c675c95b420f9def9411f1793308c5cf65f))

## [0.3.3](https://github.com/naay99999/react-thai-zip/compare/react-thaizip-v0.3.2...react-thaizip-v0.3.3) (2026-08-28)


### Bug Fixes

* keep scaffolded files inside the project root ([9dfcc53](https://github.com/naay99999/react-thai-zip/commit/9dfcc533256521b778c3e74db6664fe333aabaef))
* keep scaffolded files inside the project root ([31872ab](https://github.com/naay99999/react-thai-zip/commit/31872abf41de944355417175e9e38fc070106a6f))

## [0.3.2](https://github.com/naay99999/react-thai-zip/compare/react-thaizip-v0.3.1...react-thaizip-v0.3.2) (2026-08-27)


### Bug Fixes

* install the repo root's node_modules for apps/docs builds ([bd113bb](https://github.com/naay99999/react-thai-zip/commit/bd113bba2d52fbc7a083e93f929d417548d4c983))
* make apps/docs build reliably on Vercel ([877a6fb](https://github.com/naay99999/react-thai-zip/commit/877a6fb4ca0604579e2c06577abf08f7e58a2976))
* render English docs content via dir-based i18n parser ([03478f0](https://github.com/naay99999/react-thai-zip/commit/03478f0457d19fe40f3ff894f8ad8b1a4db9be8f))
* resolve symlinked bin path before comparing to import.meta.url ([5e2d2a2](https://github.com/naay99999/react-thai-zip/commit/5e2d2a2e93ed6201a3893384c057e5ea1d254981))

## [0.3.1](https://github.com/naay99999/react-thai-zip/compare/react-thaizip-v0.3.0...react-thaizip-v0.3.1) (2026-08-19)


### Features

* add npm run sandbox generator for CLI testing ([b998a16](https://github.com/naay99999/react-thai-zip/commit/b998a169800b604072f5752eabd2e3c1bb6ee715))
* **docs:** add Core API link to docs navigation ([f64ade3](https://github.com/naay99999/react-thai-zip/commit/f64ade3bee870628c0be077f67599ae2f36f6d98))
* **docs:** add sidebar navigation, /docs links, and landing page ([f24e71c](https://github.com/naay99999/react-thai-zip/commit/f24e71ccad7c2a9c49cef6227f9da8cfd404675c))
* **docs:** replace Starlight with Fumadocs app shell ([e98c926](https://github.com/naay99999/react-thai-zip/commit/e98c926754a9c7428e62ea69dffbed66400a0413))

## [0.3.0](https://github.com/naay99999/react-thai-zip/compare/react-thaizip-v0.2.1...react-thaizip-v0.3.0) (2026-08-05)


### ⚠ BREAKING CHANGES

* cascade v2 — Base UI Select, @base-ui/react migration, ResolvedThaiAddress value model
* ThaiAddressCascadeSelect drops onSelect/onClear and the slate-styled native selects; it now emits ResolvedThaiAddress via onValueChange, follows locale, and scaffolds shared lib/hook files.
* migrate Base UI dependency to @base-ui/react ^1.7.0
* autocomplete v2 — Base UI Combobox, shared registry items, import rewriting
* autocomplete v2 — Base UI registry entry, transitive scaffold, import rewriting
* registry v2 — multi-file registry, config v2, Tailwind v4, CLI flags
* add v2 — multi-file scaffolding, per-item version gate on thaizip 0.7, --yes/--overwrite
* init v2 — Tailwind prerequisite, token writing, v2 config, --yes
* config v2 with libDir/hooksDir/tailwind, validation, and legacy migration
* remove JS templates, PostalCodeForm/DisplayFields, --lang, Tailwind auto-install, and dead code

### Features

* add --lang flag to scaffold components with Thai default labels ([74a1ef1](https://github.com/naay99999/react-thai-zip/commit/74a1ef1c6bad5858499ac116042b0a7fdc9fd01f))
* add --yes/--overwrite/--help/--version flags to the CLI ([9d27d9d](https://github.com/naay99999/react-thai-zip/commit/9d27d9d77a99e1f97dca5fa4e0356a88ad5f6ec1))
* add customizable texts prop and ARIA combobox to address components ([b3e7e26](https://github.com/naay99999/react-thai-zip/commit/b3e7e26debf1efb583dc18de47efcdeb30111182))
* add utils and use-thai-address-index shared registry items ([badfbc0](https://github.com/naay99999/react-thai-zip/commit/badfbc0186ee3e4325e167b919221dbc629febfb))
* add v2 — multi-file scaffolding, per-item version gate on thaizip 0.7, --yes/--overwrite ([454f1d8](https://github.com/naay99999/react-thai-zip/commit/454f1d83b4c30d215b0c6a89f0006aee4068628c))
* autocomplete v2 — Base UI Combobox, shared registry items, import rewriting ([a103da5](https://github.com/naay99999/react-thai-zip/commit/a103da550f32823d4bc62d14ef5a468732ed428b))
* autocomplete v2 — Base UI registry entry, transitive scaffold, import rewriting ([0882e9e](https://github.com/naay99999/react-thai-zip/commit/0882e9ebca675e4af3135ba02a064112657f0f5e))
* cascade v2 — Base UI Select, @base-ui/react migration, ResolvedThaiAddress value model ([5eeeb90](https://github.com/naay99999/react-thai-zip/commit/5eeeb90ec2b2a777dfd459f315512a5c72490cc5))
* cascade-select v2 — Base UI Select, ResolvedThaiAddress value model ([dda77b0](https://github.com/naay99999/react-thai-zip/commit/dda77b0b1d2697d9fbf5c6c65fc1fa4a18632bfb))
* config v2 with libDir/hooksDir/tailwind, validation, and legacy migration ([ae463b3](https://github.com/naay99999/react-thai-zip/commit/ae463b3ae992d0bb12f9166e4745c31afdc26a98))
* detect Tailwind v3 vs v4 and locate the global CSS file ([4e3fce1](https://github.com/naay99999/react-thai-zip/commit/4e3fce15d40dae4bc2523c27dc47d9a45b66b479))
* init v2 — Tailwind prerequisite, token writing, v2 config, --yes ([412b771](https://github.com/naay99999/react-thai-zip/commit/412b771130a5e235bf5d34a97b37fef71aa146b1))
* migrate Base UI dependency to @base-ui/react ^1.7.0 ([da2047f](https://github.com/naay99999/react-thai-zip/commit/da2047f2025a5128506f83f8ae6f0c5b5911db14))
* multi-file registry model with transitive dependency resolution ([8005084](https://github.com/naay99999/react-thai-zip/commit/80050844919aedfab500acc75b14a629a6400a36))
* new ThaiAddressAutocomplete template on Base UI Combobox + template typecheck rig ([fb3c103](https://github.com/naay99999/react-thai-zip/commit/fb3c10320c9f8cf774eb5032681e46cf20677252))
* new ThaiAddressCascadeSelect template on Base UI Select + cascade API ([6eec915](https://github.com/naay99999/react-thai-zip/commit/6eec915cd71f3bb0600849daad60888cb9cf957a))
* registry v2 — multi-file registry, config v2, Tailwind v4, CLI flags ([58c9742](https://github.com/naay99999/react-thai-zip/commit/58c9742c5f36e9c68d17b025631a2b84cda5f706))
* remove JS templates, PostalCodeForm/DisplayFields, --lang, Tailwind auto-install, and dead code ([857bc79](https://github.com/naay99999/react-thai-zip/commit/857bc79fda1cceb626591a8b956a63f85752a765))
* shadcn design-token writer for Tailwind v3 and v4 ([068783c](https://github.com/naay99999/react-thai-zip/commit/068783c742b5988f2df2d3002f68647f725be5ef))


### Bug Fixes

* apply aria-invalid to every cascade trigger; backfill template RTL coverage ([3aaf8a0](https://github.com/naay99999/react-thai-zip/commit/3aaf8a089868ff5556f492d22e6c536ae2cefcb8))
* CLI hardening — install error handling, pinned core install, Tailwind v3 fallback, per-command help ([2976860](https://github.com/naay99999/react-thai-zip/commit/297686047583a70eb3694dbf8cb59df56e61f5ff))
* enable class-based dark mode in the Tailwind v4 token block ([1051b2a](https://github.com/naay99999/react-thai-zip/commit/1051b2a20c85f367f9d95eb3a4ff73c9ceb715e8))
* exclude hidden address inputs from submission when disabled ([93f81f1](https://github.com/naay99999/react-thai-zip/commit/93f81f1ed9f50c19da4ad34c4d1b600506a7ff43))
* guard against selectSuggestion returning null, unpin registryVersion in test ([4c8be4c](https://github.com/naay99999/react-thai-zip/commit/4c8be4cb032d7ecad3d89a0b9397b653920729e6))
* keep in-progress cascade picks when controlled value echoes null ([e0ff9ab](https://github.com/naay99999/react-thai-zip/commit/e0ff9aba5474651cc840b2be8a372b025358ede8))
* print valid export names in the post-scaffold import hint ([6f3de69](https://github.com/naay99999/react-thai-zip/commit/6f3de6973da8d47296e4c84b95e26fa57efbfbc7))
* require thaizip &gt;=0.6.0 and block scaffolding on older versions ([578ee11](https://github.com/naay99999/react-thai-zip/commit/578ee111dfbb8b24feda8bc7d2286268e78f1f68))
* require thaizip &gt;=0.6.0 and block scaffolding on older versions ([97ce01e](https://github.com/naay99999/react-thai-zip/commit/97ce01eb3b55ad9abe8ae6383dd17979f2580f6a))
* surface init-bailout in add, reject legacy typescript:false configs, filter help to components ([b95a398](https://github.com/naay99999/react-thai-zip/commit/b95a398bb3fe4276ddb77357f0e328a2566d7cbe))
* sync Base UI Combobox selection state with component selection; RTL repros ([6012643](https://github.com/naay99999/react-thai-zip/commit/60126438ffbf74bf756fef53357f8ca5e2a644a8))
* validate migrated config before persisting; update 0.7.0 gate wording ([8d30cee](https://github.com/naay99999/react-thai-zip/commit/8d30ceefb8924116744e500c7c63e63490d52fe8))

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
