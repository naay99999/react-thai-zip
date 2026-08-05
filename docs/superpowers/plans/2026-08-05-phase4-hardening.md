# Phase 4: Hardening Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Close the deferred/parked findings from Phases 1–3: add a CI workflow (the spec's "templates are typechecked in CI" is still unmet), fix small CLI robustness gaps, polish the templates' accessibility, backfill RTL test coverage, and correct doc inaccuracies.

**Architecture:** Four independent-ish tasks executed in order: CI workflow → CLI/util fixes → template polish + test backfill → docs. No new features; every behavior fix ships with a covering test.

**Tech Stack:** GitHub Actions, TypeScript, vitest + RTL/jsdom, existing CLI utils.

## Global Constraints

- Branch: `chore/hardening` (branched from `main` at `5eeeb90`). Work in place, no worktrees.
- `CORE_PACKAGE_NAME = 'thaizip'`, `CORE_PACKAGE_VERSION = '>=0.7.0'`, `MINIMUM_THAIZIP_VERSION = '0.7.0'` — values unchanged (only misleading *comments* around them change).
- Conventional Commits per task: Task 1 `ci:`-equivalent is `chore:`; Task 2 and 3 are `fix:` (they change shipped behavior); Task 4 is `docs:`. No `feat`/`feat!` in this phase.
- Verification quartet for every task: `npm test && npm run typecheck && npm run typecheck:templates && npm run build`.
- Templates stay token-only styled; no new npm dependencies anywhere (in particular no `@testing-library/jest-dom` — tests use plain-DOM assertions).
- Test counts before this phase: 104 tests across 16 files.

---

### Task 1: CI workflow

The repo's only workflow is `release-please.yml` (release/publish on push to main). Nothing runs tests or the template typecheck on push/PR — the design spec's testing section ("Templates are typechecked in CI") is unmet.

**Files:**
- Create: `.github/workflows/ci.yml`

**Interfaces:**
- Produces: a `CI` workflow running the verification quartet on pushes to `main` and all pull requests. Later tasks don't depend on it, but the merged branch will be validated by it once pushed.

- [ ] **Step 1: Write the workflow**

Create `.github/workflows/ci.yml`:

```yaml
name: CI

on:
  push:
    branches: [main]
  pull_request:

jobs:
  verify:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm

      - run: npm ci
      - run: npm test
      - run: npm run typecheck
      - run: npm run typecheck:templates
      - run: npm run build
```

- [ ] **Step 2: Validate locally**

Run: `npx --yes yaml-lint .github/workflows/ci.yml 2>/dev/null || node -e "const yaml=require('js-yaml');yaml.load(require('fs').readFileSync('.github/workflows/ci.yml','utf8'));console.log('yaml ok')"` — if neither tool is available, a careful visual check against the block above suffices (the YAML is copied verbatim). Also run the quartet itself once to confirm the four commands the workflow calls all pass on this checkout.

- [ ] **Step 3: Commit**

```bash
git add .github/workflows/ci.yml
git commit -m "chore: add CI workflow running tests, typechecks, and build"
```

---

### Task 2: CLI robustness fixes

Six small confirmed defects in `src/`, each with a covering test. All were parked during Phases 1–3 and re-verified against the current code on 2026-08-05.

**Files:**
- Modify: `src/commands/init.ts` (install try/catch at lines 68–74; "see README" message at line 60)
- Modify: `src/commands/add.ts` (pinned core install spec at line 96; skip-log at line 133)
- Modify: `src/utils/detectTailwind.ts` (v3 package.json-only fallback after line 58)
- Modify: `src/utils/tokens.ts` (trailing newline at line 131)
- Modify: `src/utils/config.ts` (stale `thaizip/react` comments at lines 9–19)
- Modify: `src/cli.ts` (help/version precedence, per-command help, help column padding)
- Test: `tests/init.test.ts`, `tests/add.test.ts`, `tests/detectTailwind.test.ts`, `tests/tokens.test.ts`, `tests/cli.test.ts` (extend the existing files; check each file's existing mocking patterns first and follow them)

**Interfaces:**
- Consumes: existing `installPackage(specs, { cwd, pm })` from `src/utils/install.js`; `CORE_PACKAGE_NAME`/`CORE_PACKAGE_VERSION` from `src/utils/config.js`; `parseCliArgs`/`main` exports from `src/cli.ts`.
- Produces: `printHelp(command?: string)` behavior — `--help` with `init`/`add` as the command prints command-scoped usage; bare `--help` prints global usage. Task 4's docs describe this.

- [ ] **Step 1: Write the failing tests**

Add to the existing test files (follow each file's current setup/mocking conventions — e.g. `tests/init.test.ts` and `tests/add.test.ts` already mock `installPackage` and `prompts`; reuse those harnesses rather than inventing new ones):

1. `tests/init.test.ts` — **install failure exits cleanly**: mock `installPackage` to reject with `new Error('registry down')`; run `initProject` in a temp dir that has a Tailwind v4 CSS file (so init reaches the install step) and `yes: true`. Assert `process.exitCode === 1`, the error output contains a manual install hint including `thaizip@>=0.7.0`, no `thaizip.config.json` was written, and no unhandled rejection escapes (i.e. the promise resolves).
2. `tests/add.test.ts` — **core package installed with pinned range**: in the existing missing-dependency scenario, assert the mocked `installPackage` was called with `'thaizip@>=0.7.0'` (not bare `'thaizip'`) while other packages stay bare names.
3. `tests/add.test.ts` — **skip log names the path**: in the existing already-exists/skip scenario, capture console output and assert the skip line contains the relative directory path (e.g. `app/components/thai-address-autocomplete.tsx`), not just the bare filename.
4. `tests/detectTailwind.test.ts` — **v3 via package.json only**: temp dir with `package.json` containing `"tailwindcss": "^3.4.0"` in devDependencies, no config file, no CSS files. Assert `detectTailwind(dir)` resolves to `{ version: 3, cssPath: null }` (today it resolves to `null`).
5. `tests/tokens.test.ts` — **appended block ends with newline**: extend the existing `ensureTokens` test to assert the resulting file content ends with `'\n'`.
6. `tests/cli.test.ts` — four new cases:
   - `parse/main` precedence: `main(['--help', '--version'])` prints usage (capture console.log; output contains `'Usage:'`), NOT the bare version string.
   - `main(['add', '--help'])` prints add-scoped usage: contains `'react-thaizip add'` and the component list (`'autocomplete'`, `'cascade-select'`), and does NOT invoke `addComponents` (mock it and assert not called).
   - `main(['init', '--help'])` prints init-scoped usage: contains `'react-thaizip init'` and does NOT contain the component list.
   - padding: in global help output, the two component lines have their descriptions starting at the same column (regex both lines with `/^  (\S+)\s+/` and assert equal prefix lengths).

- [ ] **Step 2: Run them to verify they fail**

Run: `npx vitest run tests/init.test.ts tests/add.test.ts tests/detectTailwind.test.ts tests/tokens.test.ts tests/cli.test.ts`
Expected: the new cases FAIL (install failure currently rejects unhandled / bare `thaizip` spec / filename-only skip log / `null` detection / no trailing `\n` / version-before-help + no per-command help + ragged columns).

- [ ] **Step 3: Implement the fixes**

`src/commands/init.ts` — wrap the install (replace lines 68–74):

```ts
  if (!(await hasPackageDependency(CORE_PACKAGE_NAME, cwd))) {
    const shouldInstall = await confirm('thaizip is not installed. Install it?', true, yes)

    if (shouldInstall) {
      const spec = `${CORE_PACKAGE_NAME}@${CORE_PACKAGE_VERSION}`
      try {
        await installPackage([spec], { cwd, pm })
      } catch (error) {
        const hint = pm === 'npm' ? `npm i '${spec}'` : `${pm} add '${spec}'`
        console.error(`\nFailed to install ${CORE_PACKAGE_NAME}.`)
        console.error(`Install it manually (${hint}), then re-run npx react-thaizip init.`)
        if (error instanceof Error) console.error(`\n${error.message}`)
        process.exitCode = 1
        return
      }
    }
  }
```

`src/commands/init.ts` line 60 — the "see README" pointer targets no real section; the tokens are printed right below anyway:

```ts
    console.log('\nNo global CSS file was found. Add these design tokens to your global CSS manually:')
```

`src/commands/add.ts` — pin the core package spec at install time (init already installs `thaizip@>=0.7.0`; `add` installing bare `thaizip` is inconsistent). Replace line 96:

```ts
      const installSpecs = missingDependencies.map((dependency) =>
        dependency === CORE_PACKAGE_NAME ? `${CORE_PACKAGE_NAME}@${CORE_PACKAGE_VERSION}` : dependency,
      )
      await installPackage(installSpecs, { cwd, pm: config.packageManager })
```

and add `CORE_PACKAGE_VERSION` to the existing `../utils/config.js` import on line 7.

`src/commands/add.ts` line 133 — include the directory in the skip log:

```ts
        console.log(`\nSkipped ${path.relative(cwd, destination)} (already exists).`)
```

`src/utils/detectTailwind.ts` — v3 package.json-only fallback. After the config-file loop (line 58), before `return null`:

```ts
  if (range) {
    const anchor = extractVersionAnchor(range)
    if (anchor && Number(anchor.split('.')[0]) === 3) {
      return { version: 3, cssPath: null }
    }
  }
```

(`range` is already in scope from line 38 — do not re-read package.json.)

`src/utils/tokens.ts` line 131 — end the file with a newline:

```ts
  await writeFile(cssAbsolutePath, content + '\n' + buildTokenBlock(version) + '\n')
```

`src/utils/config.ts` lines 9–19 — the comments claim thaizip 0.7 "replaced the `thaizip/react` subpath import", but the current autocomplete template imports `useThaiAddressAutocomplete` from `'thaizip/react'` (the subpath is alive and used). Replace both comment blocks:

```ts
// thaizip 0.7.0 introduced the cascade/enumeration API and bilingual (en/th)
// labels that the scaffolded templates rely on. Left as an open-ended floor
// rather than a caret range so it doesn't exclude the real "latest" tag.
export const CORE_PACKAGE_VERSION = '>=0.7.0'
// Minimum thaizip version required for the cascade/enumeration API and
// bilingual labels used by every scaffolded component. Kept separate from
// CORE_PACKAGE_VERSION (a range string) so version-gate logic has a single
// plain version to compare against.
export const MINIMUM_THAIZIP_VERSION = '0.7.0'
```

`src/cli.ts` — three changes:

1. Swap precedence in `main` (help before version):

```ts
  if (flags.help) {
    printHelp(command)
    return
  }

  if (flags.version) {
    console.log(await getRegistryVersion())
    return
  }
```

2. Per-command help + padded component columns — replace `printHelp`:

```ts
const GLOBAL_FLAG_LINES = [
  '  --yes, -y        Skip confirmation prompts',
  '  --overwrite      Overwrite existing files without prompting',
  '  --help, -h       Print this help message',
  '  --version, -v    Print the CLI version',
]

function componentLines(): string[] {
  const components = registryItems.filter((item) => item.type === 'component')
  const width = Math.max(...components.map((item) => item.name.length))
  return components.map((item) => `  ${item.name.padEnd(width + 2)}${item.description}`)
}

function printHelp(command?: string): void {
  if (command === 'init') {
    console.log(
      [
        'Usage:',
        '  react-thaizip init [--yes]',
        '',
        'Detects your project layout and Tailwind setup, writes design tokens,',
        'installs thaizip, and creates thaizip.config.json.',
        '',
        'Flags:',
        '  --yes, -y        Skip confirmation prompts',
      ].join('\n'),
    )
    return
  }

  if (command === 'add') {
    console.log(
      [
        'Usage:',
        '  react-thaizip add [component...] [--yes] [--overwrite]',
        '',
        'Flags:',
        '  --yes, -y        Skip confirmation prompts',
        '  --overwrite      Overwrite existing component files without prompting',
        '',
        'Components:',
        ...componentLines(),
      ].join('\n'),
    )
    return
  }

  console.log(
    [
      'Usage:',
      '  react-thaizip init [--yes]',
      '  react-thaizip add [component...] [--yes] [--overwrite]',
      '',
      'Flags:',
      ...GLOBAL_FLAG_LINES,
      '',
      'Components:',
      ...componentLines(),
    ].join('\n'),
  )
}
```

- [ ] **Step 4: Run the new tests to verify they pass**

Run: `npx vitest run tests/init.test.ts tests/add.test.ts tests/detectTailwind.test.ts tests/tokens.test.ts tests/cli.test.ts`
Expected: PASS, including all pre-existing cases in those files.

- [ ] **Step 5: Full verification quartet**

Run: `npm test && npm run typecheck && npm run typecheck:templates && npm run build`
Expected: all green.

- [ ] **Step 6: Commit**

```bash
git add -A -- src tests
git commit -m "fix: CLI hardening — install error handling, pinned core install, Tailwind v3 fallback, per-command help

init exits 1 with a manual install hint when the thaizip install fails
instead of surfacing an unhandled rejection; add installs thaizip with the
same >=0.7.0 range init uses; detectTailwind recognizes v3 declared only
in package.json; token blocks end with a newline; skip logs name the full
relative path; --help wins over --version, gains per-command output, and
aligns the component columns."
```

---

### Task 3: Template polish + RTL test backfill

Closes the deferred template findings (aria-invalid only on the province trigger) and the RTL coverage gaps parked since Phase 2/3.

**Files:**
- Modify: `templates/react/ts/thai-address-cascade-select.tsx` (pass `ariaInvalid` to the district and subdistrict `CascadeField`s; JSDoc scope notes)
- Modify: `tests/thai-address-cascade-select.test.tsx` (aria-invalid test, district-level partial-pick test)
- Modify: `tests/thai-address-autocomplete.test.tsx` (locale/controlled/hidden-input/clear-by-emptying tests)
- Create: `tests/thai-address-autocomplete-loading.test.tsx` (loading/error branches with a mocked `thaizip/data` — separate file because `vi.mock` is module-wide and the main file needs the real index)
- Modify: `tsconfig.json` (`exclude`) and `tsconfig.templates.json` (`include`) — add the new test file, mirroring the existing test-file entries

**Interfaces:**
- Consumes: `ThaiAddressCascadeSelectProps['aria-invalid']` already exists and currently reaches only the province trigger; `useThaiAddressIndex` drives the loading/error branches; `DEFAULT_TEXTS` in both templates carry th/en sets.
- Produces: `aria-invalid` applied to all three cascade triggers (behavior change, `fix:`).

- [ ] **Step 1: Write the failing template tests**

In `tests/thai-address-cascade-select.test.tsx` add two tests (reuse the file's existing helpers — `getTriggers`, `pickOption`, `isDisabled`, the `beforeAll` chain fixtures, and its controlled-harness pattern):

```tsx
  it('applies aria-invalid to all three triggers', async () => {
    render(<ThaiAddressCascadeSelect aria-invalid />)
    const triggers = await screen.findAllByRole('combobox')
    for (const trigger of triggers) {
      expect(trigger.getAttribute('aria-invalid')).toBe('true')
    }
  })

  it('keeps an in-progress district re-pick in controlled mode', async () => {
    const user = userEvent.setup()
    render(<ControlledHarness />) // the same controlled harness component the existing controlled tests use
    const { provinceTrigger, districtTrigger, subdistrictTrigger } = await getTriggers()
    await pickOption(user, provinceTrigger, province.nameTh)
    await waitFor(() => expect(isDisabled(districtTrigger)).toBe(false))
    await pickOption(user, districtTrigger, amphure.nameTh)
    await waitFor(() => expect(isDisabled(subdistrictTrigger)).toBe(false))
    await pickOption(user, subdistrictTrigger, tambon.nameTh)
    // full selection committed; now re-pick a different district — the null echo
    // must not wipe the new district pick
    const index = await loadDefaultIndex()
    const otherAmphure = listAmphures(index, province.id)[1]
    await pickOption(user, districtTrigger, otherAmphure.nameTh)
    await waitFor(() => expect(districtTrigger.textContent).toContain(otherAmphure.nameTh))
    expect(provinceTrigger.textContent).toContain(province.nameTh)
  })
```

(If the existing controlled tests define their harness inline per-test rather than as a shared `ControlledHarness`, follow that same inline pattern. If `listAmphures(index, province.id)` has fewer than 2 entries for the fixture province, pick a different province in `beforeAll` — assert `amphures.length >= 2` there so the failure mode is explicit.)

In `tests/thai-address-autocomplete.test.tsx` add three tests (reuse its `getReadyInput`, `DEFAULT_ADDRESS`, `sampleRecord`/`sampleLabel` fixtures and its popup-interaction patterns):

```tsx
  it("renders English placeholder and suggestion labels when locale='en'", async () => {
    const user = userEvent.setup()
    render(<ThaiAddressAutocomplete locale="en" />)
    const input = await getReadyInput()
    expect(input.placeholder).toBe('Type sub-district, district, province or postal code')
    await user.type(input, sampleRecord.tambonNameEn.slice(0, 4))
    const option = await screen.findByRole('option', { name: new RegExp(escapeRegExp(sampleRecord.tambonNameEn), 'i') })
    expect(option).toBeTruthy()
  })

  it('re-syncs the visible text when a controlled value is set and cleared', async () => {
    function Harness() {
      const [value, setValue] = React.useState<ResolvedThaiAddress | null>(null)
      return (
        <div>
          <ThaiAddressAutocomplete value={value} onValueChange={setValue} />
          <button type="button" onClick={() => setValue(DEFAULT_ADDRESS)}>set</button>
          <button type="button" onClick={() => setValue(null)}>unset</button>
        </div>
      )
    }
    const user = userEvent.setup()
    render(<Harness />)
    const input = await getReadyInput()
    await user.click(screen.getByRole('button', { name: 'set' }))
    await waitFor(() => expect(input.value).toBe(DEFAULT_ADDRESS_LABEL))
    await user.click(screen.getByRole('button', { name: 'unset' }))
    await waitFor(() => expect(input.value).toBe(''))
  })

  it('populates the hidden inputs after a selection and nulls the value when the input is emptied', async () => {
    const onValueChange = vi.fn()
    const user = userEvent.setup()
    render(<ThaiAddressAutocomplete name="addr" onValueChange={onValueChange} />)
    const input = await getReadyInput()
    await user.type(input, sampleRecord.tambonNameTh.slice(0, 4))
    const option = await screen.findByRole('option', { name: new RegExp(escapeRegExp(sampleRecord.tambonNameTh)) })
    await user.click(option)
    await waitFor(() =>
      expect((document.querySelector('input[name="addr-zipcode"]') as HTMLInputElement).value).toBe(sampleRecord.zipCode),
    )
    expect((document.querySelector('input[name="addr-province"]') as HTMLInputElement).value).toBe(sampleRecord.provinceNameTh)
    expect(onValueChange).toHaveBeenCalledTimes(1)
    await user.clear(input)
    await waitFor(() => expect(onValueChange).toHaveBeenLastCalledWith(null))
  })
```

(Adjust imports at the top of the file as needed: `React`, `ResolvedThaiAddress` type is already imported; typing enough characters to surface the fixture record as an option may need the same query length the existing tests use — follow their lead. If `sampleRecord`'s name is too common to appear in the option list, the existing tests' approach of matching by regex against the full label is the fallback.)

Create `tests/thai-address-autocomplete-loading.test.tsx`:

```tsx
// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import { ThaiAddressAutocomplete } from '../templates/react/ts/thai-address-autocomplete'

// Module-wide mock: this file exercises the loading and error branches only,
// so it must NOT share a module graph with the real-index tests.
const loadDefaultIndex = vi.hoisted(() => vi.fn())
vi.mock('thaizip/data', () => ({ loadDefaultIndex }))

afterEach(() => {
  cleanup()
  loadDefaultIndex.mockReset()
})

describe('ThaiAddressAutocomplete — index loading states', () => {
  it('renders a disabled aria-busy input while the index loads', async () => {
    loadDefaultIndex.mockReturnValue(new Promise(() => {})) // never settles
    render(<ThaiAddressAutocomplete />)
    const input = screen.getByRole('textbox') as HTMLInputElement
    expect(input.disabled).toBe(true)
    expect(input.getAttribute('aria-busy')).toBe('true')
  })

  it('shows the error alert, fires onError, and retry reloads', async () => {
    const onError = vi.fn()
    loadDefaultIndex.mockRejectedValueOnce(new Error('offline'))
    render(<ThaiAddressAutocomplete onError={onError} />)
    const alert = await screen.findByRole('alert')
    expect(alert.textContent).toContain('โหลดข้อมูลที่อยู่ไม่สำเร็จ')
    await waitFor(() => expect(onError).toHaveBeenCalledTimes(1))

    loadDefaultIndex.mockReturnValue(new Promise(() => {}))
    const { default: userEvent } = await import('@testing-library/user-event')
    await userEvent.setup().click(screen.getByRole('button', { name: 'ลองใหม่' }))
    await waitFor(() => expect(screen.queryByRole('alert')).toBeNull())
    expect((screen.getByRole('textbox') as HTMLInputElement).disabled).toBe(true)
  })
})
```

(The loading-state input renders as `role="textbox"` because the Base UI Combobox subtree — which supplies `role="combobox"` — only mounts once the index resolves. If `getByRole('textbox')` doesn't match the placeholder input, query by placeholder text instead: `screen.getByPlaceholderText('กำลังโหลดข้อมูล...')`.)

Add `tests/thai-address-autocomplete-loading.test.tsx` to `tsconfig.json`'s `exclude` array and `tsconfig.templates.json`'s `include` array, next to the existing test-file entries.

- [ ] **Step 2: Run them to verify the right ones fail**

Run: `npx vitest run tests/thai-address-cascade-select.test.tsx tests/thai-address-autocomplete.test.tsx tests/thai-address-autocomplete-loading.test.tsx`
Expected: the aria-invalid test FAILS (district/subdistrict triggers lack the attribute). The others may already pass (they pin existing behavior) — that is fine; they exist to lock the contracts. Any *other* failure is a real bug or a wrong assumption in the test — investigate before touching the template, and report what you found.

- [ ] **Step 3: Wire aria-invalid to all three triggers**

In `templates/react/ts/thai-address-cascade-select.tsx`, add `ariaInvalid={ariaInvalid}` to the district and subdistrict `CascadeField` invocations (the province one already has it), and update the props JSDoc:

```tsx
  /** Marks all three select triggers invalid (e.g. after failed form validation). */
  'aria-invalid'?: React.AriaAttributes['aria-invalid']
  /** Blur handler for the province trigger (the cascade's primary control). */
  onBlur?: React.FocusEventHandler<HTMLButtonElement>
```

(`onBlur` and `ref` intentionally stay province-only — the JSDoc now says so.)

- [ ] **Step 4: Run the template tests to verify they pass**

Run: `npx vitest run tests/thai-address-cascade-select.test.tsx tests/thai-address-autocomplete.test.tsx tests/thai-address-autocomplete-loading.test.tsx`
Expected: all pass.

- [ ] **Step 5: Full verification quartet**

Run: `npm test && npm run typecheck && npm run typecheck:templates && npm run build`
Expected: all green.

- [ ] **Step 6: Commit**

```bash
git add templates tests tsconfig.json tsconfig.templates.json
git commit -m "fix: apply aria-invalid to every cascade trigger; backfill template RTL coverage

Coverage added: cascade district-level controlled re-pick, autocomplete
locale='en' labels, controlled value set/clear resync, hidden-input
population, clear-by-emptying, and the index loading/error/retry branches."
```

---

### Task 4: Docs accuracy pass

**Files:**
- Modify: `README.md` (line 88 false claim; CLI flags section per-command help)
- Modify: `CLAUDE.md` (CLI flags section; Build details / commands section CI note; cascade `aria-invalid` scope)

**Interfaces:**
- Consumes: Task 2's per-command help behavior; Task 3's all-triggers `aria-invalid`.

- [ ] **Step 1: Fix README**

Replace line 88 (`Every generated component ships with English default labels...`) with:

```markdown
Every generated component ships with Thai default labels (`locale` defaults to `'th'`); pass `locale="en"` to switch to the built-in English set. The optional `texts` prop overrides any subset of the active set:
```

In the CLI flags section (after the flag bullets around line 33), add:

```markdown
- `init --help` / `add --help` — print command-scoped usage (`add --help` includes the component list)
```

- [ ] **Step 2: Fix CLAUDE.md**

- In the "CLI flags" code block, append two lines: `react-thaizip init --help` and `react-thaizip add --help`, and below the bullets add: `- \`--help\` after a command prints command-scoped usage; \`--help\` wins over \`--version\` when both are passed`.
- In the cascade component bullet, change the `aria-invalid` mention to note it applies to all three triggers (e.g. `aria-invalid` (all three triggers)).
- In "Build details" (or a new short "CI" line under Commands), add: `- .github/workflows/ci.yml runs npm test + both typechecks + build on pushes to main and all PRs; release-please.yml handles releases.`

- [ ] **Step 3: Verify and sweep**

Run: `npm test 2>&1 | tail -3` (docs-only change — quartet unaffected, one test run is enough) and `grep -n "English default" README.md` (expect no match).

- [ ] **Step 4: Commit**

```bash
git add README.md CLAUDE.md
git commit -m "docs: correct default-locale claim, document per-command help and CI"
```
