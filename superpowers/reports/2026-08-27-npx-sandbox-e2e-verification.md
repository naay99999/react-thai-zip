# npx sandbox end-to-end verification — 2026-08-27

Consolidated record of the `worktree-npx-sandbox-e2e` verification effort: a real
`npx`-driven scaffold of `react-thaizip` into a fresh Next.js 16 / Tailwind v4
sandbox app, followed by full functional and restyling verification of both
scaffolded components. This report consolidates the four per-task reports
produced during that effort (originally only under the gitignored
`.superpowers/sdd/users-naay-workspace-naay-thai-zip-lib-foamy-pearl/` directory)
into one tracked file so the evidence survives worktree removal.

Related commits on this branch: `5e2d2a2` (fix), `e10f595` (regression test).
Plan: `.claude/plans/users-naay-workspace-naay-thai-zip-lib-foamy-pearl.md`.

## 1. Severe CLI bug found + fix (Task 1)

**Symptom.** Running the packaged CLI through its own `bin` entry — which npm
always sets up as a symlink, e.g.
`<npx-cache>/node_modules/.bin/react-thaizip -> ../react-thaizip/dist/cli.js` —
produced **no output and exit code 0** for every command, including `--version`.
Direct `node dist/cli.js --version` from the repo worked fine, which is what
had masked the bug through 6 published releases and 135 previously-green tests
(none of which invoked the CLI through a symlinked bin).

**Root cause.** `src/cli.ts`'s self-invocation guard compared
`import.meta.url` to `pathToFileURL(process.argv[1])` directly:

```ts
if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  main().catch(...)
}
```

Node's ESM loader resolves `import.meta.url` through symlinks to the file's
real path, but `process.argv[1]` retains the path as invoked (the symlink).
Direct `node dist/cli.js` (no symlink) makes the two match. Invocation via
**any** symlinked bin — exactly how npm/npx/yarn/pnpm always install/link a
package's `bin` entry — makes them never match, so `main()` is never called
and the process silently exits 0. This means the previously-published
`react-thaizip` npm package was **non-functional for essentially all real
users** (`npx react-thaizip ...`, global install, `npm link` all symlink the
bin) for all 6 releases to date.

**Fix location.** `src/cli.ts`, replacing the direct comparison with a
realpath-resolved comparison (falling back to the un-resolved path if
`realpathSync` throws), and exporting/parameterizing the check so it is
directly unit-testable:

```ts
export function isEntryPoint(
  invoked: string | undefined = process.argv[1],
  moduleUrl: string = import.meta.url,
): boolean {
  if (!invoked) return false
  try {
    return moduleUrl === pathToFileURL(realpathSync(invoked)).href
  } catch {
    return moduleUrl === pathToFileURL(invoked).href
  }
}

if (isEntryPoint()) {
  main().catch(...)
}
```

**Confirmation.** After the fix: `npm run typecheck` clean, `npm run
typecheck:templates` clean, full `npm test` 142/142 passed (17 test files,
including 7 new `isEntryPoint` regression tests in `tests/cli.test.ts` that
build a real `fs.symlinkSync` fixture and prove the pre-fix logic fails the
symlink case), `npm run build` + `npm pack` re-packed cleanly, and a full
clean re-run of the real npx flow (`npx --yes --package="$TARBALL"
react-thaizip --version/init/add`) against a freshly regenerated
`apps/sandbox` all passed — including confirming the actual installed
npx-cache copy of the bin contained the fix (not a stale cached copy).

Regression coverage: reverting `isEntryPoint`'s body to the exact pre-fix
logic and re-running `tests/cli.test.ts` reproduced 2 failures
("returns true when invoked via a symlinked bin", "returns true when invoked
directly with no symlink involved" — the latter failing too because this
machine's tmp dir crosses an OS-level `/var` → `/private/var` symlink,
underscoring how broad the bug's blast radius was). Restoring the fix made
all 17 tests in that file pass again.

**Note on the npx invocation form.** The literal `npx "$TARBALL" init --yes`
form did not work in this environment — npm 11.17.0's `libnpmexec` arg
resolution misidentifies an existing local tarball path as an already-resolved
bin and hands it to `sh` directly (exit 126, "Permission denied"), which
reproduces for any local file path and is unrelated to `react-thaizip`'s
packaging. The equivalent that genuinely installs the tarball via
`pacote`/`Arborist` and resolves its `bin` field was used instead:

```bash
npx --yes --package="$TARBALL" react-thaizip init --yes
npx --yes --package="$TARBALL" react-thaizip add autocomplete cascade-select --yes
```

This is still real `npx`/`npm exec` — it goes through `npm pack`'s `files`
allow-list and real `bin` resolution from the tarball's `package.json`, and
does not fall back to `node dist/cli.js`.

### Post-scaffold checks (Task 1)

- Tarball contents: exactly the 8 expected files (`dist/cli.js` + map,
  `package.json`, `README.md`, both `.tsx` templates, `lib/utils.ts`,
  `hooks/use-thai-address-index.ts`) — nothing from `src/`/`tests/` leaked in.
- `thaizip.config.json` written by `init`:
  ```json
  {
    "typescript": true,
    "componentDir": "app/components",
    "libDir": "lib",
    "hooksDir": "hooks",
    "packageManager": "npm",
    "tailwind": { "version": 4, "css": "app/global.css" },
    "registryVersion": "0.3.1"
  }
  ```
- `package.json` dependencies after `add`: includes `@base-ui/react ^1.7.0`,
  `clsx ^2.1.1`, `tailwind-merge ^3.6.0`, `thaizip ^0.7.2`.
- `app/global.css` tokens: `@import "tailwindcss";` followed by the full
  shadcn-style token block (`:root` + `.dark`) and a closing `@theme inline`
  block.
- Highest-risk check — no leftover `@/lib`/`@/hooks` alias in
  `app/components/`: `grep -rn "@/lib\|@/hooks" app/components/` returned no
  output. Rewritten imports (`'../../lib/utils'`, `'../../hooks/use-thai-address-index'`)
  confirmed to resolve to real files on disk.
- `npm run build` (`next build`) inside `apps/sandbox` immediately after
  scaffolding compiled successfully with 0 errors.

"Import it from" output (verbatim):
```
autocomplete added successfully.
Import it from:
  import { ThaiAddressAutocomplete } from './app/components/thai-address-autocomplete'

cascade-select added successfully.
Import it from:
  import { ThaiAddressCascadeSelect } from './app/components/thai-address-cascade-select'
```

## 2. Demo page — full verbatim source (Task 2)

`apps/sandbox/app/page.tsx` (gitignored, disposable — preserved here as the
only durable copy) was overwritten with an interactive verification page
exercising 7 independently-identifiable instances (4 autocomplete variants:
default / custom classes / disabled / locale=en; 3 cascade variants: default /
custom classes / disabled), each wrapped in a shared `InstanceSection` helper
providing a heading, `data-testid`, an uncontrolled `<form>` with a "Read form
data" button (reads hidden `${name}-*` inputs via `FormData`), and live
`<pre>` panels for both `onValueChange` state and the read form data.

```tsx
'use client'

import * as React from 'react'
import type { ResolvedThaiAddress } from 'thaizip'
import { ThaiAddressAutocomplete } from './components/thai-address-autocomplete'
import { ThaiAddressCascadeSelect } from './components/thai-address-cascade-select'

type FormReadout = Record<string, FormDataEntryValue> | null

type InstanceSectionProps = {
  title: string
  testId: string
  children: (ctx: {
    value: ResolvedThaiAddress | null
    onValueChange: (next: ResolvedThaiAddress | null) => void
  }) => React.ReactNode
}

/**
 * Shared per-instance chrome: a heading (for both humans and later browser-automation
 * tasks to target), a `<form>` wrapping the component under test, a "Read form data"
 * button that reads the form's hidden `${name}-*` inputs via `FormData`, and two `<pre>`
 * blocks showing the live `onValueChange` state and the last-read form snapshot.
 */
function InstanceSection({ title, testId, children }: InstanceSectionProps) {
  const [value, setValue] = React.useState<ResolvedThaiAddress | null>(null)
  const [formData, setFormData] = React.useState<FormReadout>(null)
  const formRef = React.useRef<HTMLFormElement>(null)

  function readFormData() {
    if (!formRef.current) return
    setFormData(Object.fromEntries(new FormData(formRef.current).entries()))
  }

  return (
    <section data-testid={testId} className="flex flex-col gap-3 rounded-lg border border-border p-4">
      <h2 className="text-lg font-semibold">{title}</h2>
      <form
        ref={formRef}
        onSubmit={(event) => event.preventDefault()}
        className="flex flex-col gap-3"
      >
        {children({ value, onValueChange: setValue })}
        <div>
          <button
            type="button"
            onClick={readFormData}
            className="inline-flex items-center rounded-md border border-input bg-background px-3 py-1.5 text-sm font-medium shadow-sm transition-colors hover:bg-accent hover:text-accent-foreground"
          >
            Read form data
          </button>
        </div>
      </form>
      <div>
        <strong className="text-sm">onValueChange:</strong>
        <pre className="mt-1 overflow-auto rounded-md bg-muted p-2 text-xs">{JSON.stringify(value, null, 2)}</pre>
      </div>
      <div>
        <strong className="text-sm">Form data (FormData → JSON):</strong>
        <pre className="mt-1 overflow-auto rounded-md bg-muted p-2 text-xs">{JSON.stringify(formData, null, 2)}</pre>
      </div>
    </section>
  )
}

export default function Page() {
  return (
    <main className="mx-auto flex max-w-3xl flex-col gap-8 p-8">
      <div>
        <h1 className="text-2xl font-bold">react-thaizip sandbox</h1>
        <p className="mt-2 text-sm opacity-70">
          Interactive verification page for the scaffolded components. Each section below is an
          independently identifiable instance (see its heading / <code>data-testid</code>).
        </p>
      </div>

      <div>
        <h1 className="mb-4 text-xl font-bold">ThaiAddressAutocomplete</h1>
        <div className="flex flex-col gap-6">
          <InstanceSection title="Autocomplete — default" testId="autocomplete-default">
            {({ onValueChange }) => (
              <ThaiAddressAutocomplete name="autocomplete-default" onValueChange={onValueChange} />
            )}
          </InstanceSection>

          <InstanceSection title="Autocomplete — custom classes" testId="autocomplete-custom">
            {({ onValueChange }) => (
              <ThaiAddressAutocomplete
                name="autocomplete-custom"
                onValueChange={onValueChange}
                inputClassName="rounded-none border-2 border-fuchsia-500 focus-visible:ring-fuchsia-500"
                popupClassName="rounded-none border-2 border-fuchsia-500"
                itemClassName="rounded-none"
              />
            )}
          </InstanceSection>

          <InstanceSection title="Autocomplete — disabled" testId="autocomplete-disabled">
            {({ onValueChange }) => (
              <ThaiAddressAutocomplete name="autocomplete-disabled" onValueChange={onValueChange} disabled />
            )}
          </InstanceSection>

          <InstanceSection title="Autocomplete — locale=en" testId="autocomplete-locale-en">
            {({ onValueChange }) => (
              <ThaiAddressAutocomplete name="autocomplete-locale-en" onValueChange={onValueChange} locale="en" />
            )}
          </InstanceSection>
        </div>
      </div>

      <div>
        <h1 className="mb-4 text-xl font-bold">ThaiAddressCascadeSelect</h1>
        <div className="flex flex-col gap-6">
          <InstanceSection title="Cascade — default" testId="cascade-default">
            {({ onValueChange }) => (
              <ThaiAddressCascadeSelect name="cascade-default" onValueChange={onValueChange} />
            )}
          </InstanceSection>

          <InstanceSection title="Cascade — custom classes" testId="cascade-custom">
            {({ onValueChange }) => (
              <ThaiAddressCascadeSelect
                name="cascade-custom"
                onValueChange={onValueChange}
                triggerClassName="rounded-none border-2 border-emerald-500 focus-visible:ring-emerald-500"
                popupClassName="rounded-none border-2 border-emerald-500"
                itemClassName="rounded-none"
              />
            )}
          </InstanceSection>

          <InstanceSection title="Cascade — disabled" testId="cascade-disabled">
            {({ onValueChange }) => (
              <ThaiAddressCascadeSelect name="cascade-disabled" onValueChange={onValueChange} disabled />
            )}
          </InstanceSection>
        </div>
      </div>
    </main>
  )
}
```

Verified with `npm run build` inside `apps/sandbox` (Next.js 16.3.3,
Turbopack): compiled successfully, TypeScript check passed, static pages
generated, 0 errors.

## 3. Functional verification matrix (Task 3)

All exercised via `agent-browser` against the live dev server, driving real
clicks/typing and reading the actual DOM plus screenshots.

| Instance | Result | Key evidence |
|---|---|---|
| Autocomplete — default | PASS | Typing "บางรัก" opened a popup with 10 real Thai suggestions (`subdistrict > district > province zipcode`, e.g. `บางรัก > เขตบางรัก > กรุงเทพมหานคร 10500`); selecting one populated the input, `onValueChange` (full `ResolvedThaiAddress`), and all 4 hidden inputs via "Read form data"; the clear button reset the input, set `onValueChange` to `null`, and reset all 4 hidden fields to empty. |
| Autocomplete — locale=en | PASS | Placeholder and suggestions rendered in English ("Bang Rak > Khet Bang Rak > Bangkok 10500"); clear button label read "Clear address"; underlying resolved-address data retained canonical Thai field values regardless of display locale (by design). |
| Autocomplete — disabled | PASS | Accessibility snapshot showed `disabled` from the start; direct DOM check confirmed the value stayed empty and no listbox opened when text was attempted; all 4 hidden inputs also carried `disabled=""` with empty values. |
| Cascade — default | PASS | Province → district → sub-district cascade populated with real Thai names at each level (Bangkok → เขตบางรัก → บางรัก); zip auto-filled to `10500`; `onValueChange` and all 4 hidden inputs matched; changing the province mid-selection reset district/sub-district triggers, cleared the zip, set `onValueChange` to `null`, and reset all 4 hidden inputs. |
| Cascade — disabled | PASS | All three triggers reported `disabled` in the accessibility tree from the start; clicking the province trigger opened no listbox. |

**Anomaly (not a bug):** the first `npm run dev` in this worktree returned
HTTP 500 from a stale Turbopack `.next` dev cache (garbled CSS selector in the
compiled output) left over from an earlier session. `app/global.css` itself
was confirmed clean; deleting `apps/sandbox/.next` and restarting resolved it
with no source change. No `templates/react/ts/**` or `src/**` bug was found in
this task.

## 4. Restyle verification (Task 4)

### className-slot overrides (tailwind-merge dedup)

For every element checked, the custom override class is present **and** every
conflicting default utility class is completely absent — proving `cn()`
(clsx + tailwind-merge) dedupes rather than merely concatenates.

**Autocomplete** (`autocomplete-default` vs `autocomplete-custom`):

| Element | Default classes | Custom classes | Conflicting default absent? |
|---|---|---|---|
| `<input>` | `...rounded-md border border-input...focus-visible:ring-1 focus-visible:ring-ring...` | `...rounded-none border-2 border-fuchsia-500 focus-visible:ring-fuchsia-500...` | Yes — `rounded-md`, `border-input`, `focus-visible:ring-ring` all absent |
| Popup (`Combobox.Popup`) | `max-h-64 w-[var(--anchor-width)] overflow-auto rounded-md border border-border bg-popover p-1 text-popover-foreground shadow-md` | `max-h-64 w-[var(--anchor-width)] overflow-auto bg-popover p-1 text-popover-foreground shadow-md rounded-none border-2 border-fuchsia-500` | Yes — `rounded-md`, `border-border` absent |
| Suggestion item (`Combobox.Item`) | `flex cursor-default items-center justify-between gap-3 rounded-sm px-2 py-1.5 text-sm outline-none data-[highlighted]:bg-accent data-[highlighted]:text-accent-foreground` | same, minus `rounded-sm`, plus `rounded-none` | Yes — `rounded-sm` absent |

**CascadeSelect** (`cascade-default` vs `cascade-custom`, province trigger):

| Element | Default classes | Custom classes | Conflicting default absent? |
|---|---|---|---|
| Trigger (`Select.Trigger`) | `...rounded-md border border-input...focus-visible:ring-1 focus-visible:ring-ring...` | `...rounded-none border-2 border-emerald-500 focus-visible:ring-emerald-500...` | Yes |
| Popup (`Select.Popup`) | `max-h-64 w-[var(--anchor-width)] overflow-auto rounded-md border border-border bg-popover p-1 text-popover-foreground shadow-md` | same, minus `rounded-md`/`border-border`, plus `rounded-none border-2 border-emerald-500` | Yes |
| Option item (`Select.Item`) | `flex cursor-default items-center rounded-sm px-2 py-1.5 text-sm outline-none data-[highlighted]:bg-accent data-[highlighted]:text-accent-foreground` | same, minus `rounded-sm`, plus `rounded-none` | Yes |

Screenshots taken (session-local, not committed since `apps/sandbox` is
gitignored): `autocomplete-default-vs-custom.png` (rounded gray-bordered input
above a square fuchsia-bordered input, same typed query in both, confirming
the visual difference is real), `cascade-default-focused.png` vs
`cascade-custom-focused2.png` (default vs. emerald-bordered square popup, same
list content).

### CSS token check

Edited only the `:root` block of `apps/sandbox/app/global.css` (written by
`init`), with no component/template file touched:

```diff
- --primary: oklch(0.205 0 0);
+ --primary: oklch(0.6 0.25 300);
  ...
- --ring: oklch(0.708 0 0);
+ --ring: oklch(0.6 0.25 300);
- --radius: 0.625rem;
+ --radius: 0rem;
```

- **Before:** default autocomplete input and default cascade trigger, focused
  via keyboard Tab, showed a subtle neutral-gray focus ring and ~10px rounded
  corners.
- **After:** both showed a strongly saturated violet focus ring (matching the
  new `--ring`) and perfectly square corners (`radius: 0`) — with zero changes
  to any component/template file, proving the templates consume
  `ring-ring`/`rounded-md` (token-backed Tailwind v4 utilities mapped through
  `@theme inline`) rather than hardcoded values, and that
  `src/utils/tokens.ts`'s generated token block is wired correctly for
  Tailwind v4.

The edit was reverted immediately after confirmation; a `grep` after revert
confirmed the file matched the original Task 1 `init` output exactly.

## Bugs found across all four tasks

Only one: the severe CLI symlinked-bin entry-point bug documented in section 1
above (fixed in `5e2d2a2`, regression-tested in `e10f595`). No bugs were found
in `templates/react/ts/**` in Tasks 2–4 — the only anomaly (a stale Turbopack
dev cache in Task 3) was a local build-cache artifact, not a source defect.

## Closing confirmation

1. **Both components work end-to-end through a real `npx <tarball>` scaffold**
   into a fresh Next.js 16 / Tailwind v4 app, against real `thaizip` data, with
   correct hidden-input form integration. Confirmed: real npx-installed CLI
   (`npx --yes --package="$TARBALL" react-thaizip init/add --yes`) scaffolded
   both `ThaiAddressAutocomplete` and `ThaiAddressCascadeSelect` with no
   leftover `@/lib`/`@/hooks` aliases; both components resolved real Thai
   address data end-to-end in the browser (suggestion search, cascade
   drill-down, zip auto-fill); all 4 hidden `${name}-*` inputs stayed in sync
   with `onValueChange` state, including reset-to-empty on clear/invalidation;
   `disabled` correctly propagated to the underlying input/triggers and their
   hidden inputs; `locale="en"` correctly localized all UI text while
   preserving canonical resolved-address data.

2. **Both components are genuinely restylable** via `className` slots — with
   `tailwind-merge` conflict resolution verified directly in the rendered DOM
   (every conflicting default utility class removed, not just the override
   appended) across 6 distinct elements (input/popup/item for autocomplete,
   trigger/popup/item for cascade) — and via CSS custom-property token edits,
   which restyled both components' focus ring and corner radius with **zero**
   component-code changes, confirming the templates are correctly wired to the
   Tailwind v4 `@theme inline` token pipeline written by `init`.

**Out of scope for this pass** (unchanged from the plan): yarn/pnpm/bun
install paths, Tailwind v3, JS-not-TS templates — this verification pass
covered npm + TypeScript + Tailwind v4 only.
