# Phase 3: Cascade Select v2 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Migrate the Base UI dependency to `@base-ui/react` and rebuild `ThaiAddressCascadeSelect` on Base UI Select ×3 with the thaizip cascade API, shadcn tokens, `ResolvedThaiAddress` value model, and full form integration.

**Architecture:** Task 1 swaps the deprecated `@base-ui-components/react@1.0.0-rc.0` for `@base-ui/react@^1.7.0` everywhere (verified: `'input-change'` reason strings, `onInputValueChange(value, eventDetails)` signature, and the `./combobox` subpath export are all unchanged, so the autocomplete's reason-filter fix carries over verbatim). Task 2 authors the new kebab-cased template + RTL tests. Task 3 rewires the registry entry, deletes the legacy template, and updates docs.

**Tech Stack:** TypeScript, Base UI (`@base-ui/react` Select), thaizip >= 0.7.0 enumeration API (`listProvinces`/`listAmphures`/`listTambons`), Tailwind tokens + `cn()`, vitest + RTL/jsdom.

## Global Constraints

- Branch: `feat/cascade-v2` (branched from `main` at `a103da5`). **Worktree agents: before doing anything, verify `git log --oneline -1` shows the current `feat/cascade-v2` tip; if the worktree branched from a stale base, run `git merge --ff-only feat/cascade-v2` first.**
- `thaizip` floor stays `0.7.0` (`MINIMUM_THAIZIP_VERSION`); `CORE_PACKAGE_VERSION` stays `>=0.7.0`. Do not touch these.
- Base UI package is `@base-ui/react` pinned `^1.7.0` after Task 1. The old name `@base-ui-components/react` must not survive anywhere except historical plan docs (`docs/superpowers/plans/2026-08-05-phase2-*.md` stays as-is — it's a record).
- Templates are TypeScript-only, styled exclusively via shadcn token utilities (`bg-background`, `border-input`, `text-muted-foreground`, ...) + `cn()`. No hardcoded slate/red palette classes.
- Templates author imports against `@/lib/utils` and `@/hooks/use-thai-address-index` (rewritten at scaffold time; typechecked via `tsconfig.templates.json`).
- Conventional Commits; breaking CLI/template behavior uses `feat!:`.
- Verification quartet for every task: `npm test`, `npm run typecheck`, `npm run typecheck:templates`, `npm run build`.

---

### Task 1: Migrate `@base-ui-components/react` → `@base-ui/react@^1.7.0`

`@base-ui-components/react` is deprecated on npm ("Package was renamed to @base-ui/react") and frozen at `1.0.0-rc.0`; `@base-ui/react` is at `1.7.0`. Every scaffold currently prints a deprecation warning into the user's project. Pre-verified compatibility facts (do NOT re-derive, but the test suite re-proves them): the `./combobox` subpath export exists in 1.7.0, `onInputValueChange?: (value: string, eventDetails) => void` is unchanged, and the reason constant `'input-change'` still exists (`internals/reason-parts.mjs`: `export const inputChange = 'input-change'`).

**Files:**
- Modify: `package.json` (devDependencies) + `package-lock.json` (via `npm install`)
- Modify: `templates/react/ts/thai-address-autocomplete.tsx:4`
- Modify: `src/registry.ts:28` (autocomplete `dependencies`)
- Modify: `tests/registry.test.ts:26`, `tests/rewriteImports.test.ts:45`, `tests/add.test.ts:32` and `tests/add.test.ts:229`
- Modify: `CLAUDE.md:105`, `CLAUDE.md:118`, `README.md:10`, `README.md:58`
- Modify: `docs/superpowers/specs/2026-08-05-react-thai-zip-redesign-design.md` (amendment block at top)

**Interfaces:**
- Produces: devDependency `"@base-ui/react": "^1.7.0"`; template import `import { Combobox } from '@base-ui/react/combobox'`; registry `dependencies: ['thaizip', '@base-ui/react']`. Task 2 and 3 import from `@base-ui/react/select` and list `@base-ui/react` as a registry dependency — they depend on this task being merged first.

- [ ] **Step 1: Flip the registry test expectation first (failing test)**

In `tests/registry.test.ts` line 26 change:

```ts
    expect(item?.dependencies).toEqual(['thaizip', '@base-ui/react'])
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npx vitest run tests/registry.test.ts`
Expected: FAIL — received `['thaizip', '@base-ui-components/react']`.

- [ ] **Step 3: Swap the dependency**

```bash
npm uninstall @base-ui-components/react
npm install --save-dev @base-ui/react@^1.7.0
```

Confirm `package.json` devDependencies now contain `"@base-ui/react": "^1.7.0"` and no `@base-ui-components/react` remains.

- [ ] **Step 4: Update source, template, tests, docs**

- `src/registry.ts:28` → `dependencies: ['thaizip', '@base-ui/react'],`
- `templates/react/ts/thai-address-autocomplete.tsx:4` → `import { Combobox } from '@base-ui/react/combobox'`
- `tests/rewriteImports.test.ts:45` → the fixture string becomes `import { Combobox } from '@base-ui/react/combobox'`
- `tests/add.test.ts:32` and `:229` → key `'@base-ui/react': '^1.0.0',` (these are fake installed-package fixtures; the version literal is irrelevant, only the name matters)
- `CLAUDE.md:105` and `:118`, `README.md:10` and `:58` → replace `@base-ui-components/react` with `@base-ui/react`
- Append to the amendment block at the top of `docs/superpowers/specs/2026-08-05-react-thai-zip-redesign-design.md`:

```markdown
**Amendment (Phase 3, 2026-08-05):** the Base UI package is `@base-ui/react`
(pinned `^1.7.0`), not `@base-ui-components/react` — the latter was deprecated
on npm ("renamed to @base-ui/react") and frozen at `1.0.0-rc.0`. All template
imports and registry `dependencies` use the new name. The Combobox API relied
on by the autocomplete (`onInputValueChange` signature, `'input-change'`
reason) is unchanged in 1.7.x.
```

Then sanity-sweep: `grep -rn "@base-ui-components" --exclude-dir=node_modules --exclude-dir=dist --exclude-dir=.claude .` must only match `docs/superpowers/plans/2026-08-05-phase2-*.md` (historical record) and this plan file.

- [ ] **Step 5: Full verification quartet**

Run: `npm test && npm run typecheck && npm run typecheck:templates && npm run build`
Expected: all green — in particular `tests/thai-address-autocomplete.test.tsx` (real Base UI interaction tests) proves the 1.7.0 Combobox still honors the reason-filter behavior.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat!: migrate Base UI dependency to @base-ui/react ^1.7.0

The old @base-ui-components/react package is deprecated on npm and frozen
at 1.0.0-rc.0; scaffolds now install @base-ui/react instead."
```

---

### Task 2: New `thai-address-cascade-select.tsx` template on Base UI Select + RTL tests

Rewrites the legacy `ThaiAddressCascadeSelect.tsx` (native `<select>`s, manual `index.records` scans, slate palette, `onSelect`/`onClear` callbacks) as a new kebab-cased template using Base UI Select ×3, the thaizip enumeration API, tokens, and the same prop conventions as `thai-address-autocomplete.tsx`. The legacy file is NOT deleted in this task (Task 3 does that when the registry flips over).

**Files:**
- Create: `templates/react/ts/thai-address-cascade-select.tsx`
- Test: `tests/thai-address-cascade-select.test.tsx`

**Interfaces:**
- Consumes: `@base-ui/react/select` (Task 1); `useThaiAddressIndex(): { index: TrigramIndex | null, error: Error | null, isLoading: boolean, retry: () => void }` from `@/hooks/use-thai-address-index`; `cn(...inputs)` from `@/lib/utils`; `listProvinces(index): ProvinceSummary[]`, `listAmphures(index, provinceId): AmphureSummary[]`, `listTambons(index, amphureId): TambonSummary[]` from `thaizip` (`ProvinceSummary/AmphureSummary = { id, nameTh, nameEn, ... }`, `TambonSummary` additionally has `zipCode: string`).
- Produces: named export `ThaiAddressCascadeSelect` with props `ThaiAddressCascadeSelectProps` (below). Task 3's registry entry points at this file and relies on the `@/lib/utils` + `@/hooks/use-thai-address-index` import specifiers being rewritable.

- [ ] **Step 1: Write the failing RTL test file**

Create `tests/thai-address-cascade-select.test.tsx`. Reuse the jsdom polyfill preamble from `tests/thai-address-autocomplete.test.tsx` verbatim (ResizeObserver, pointer-capture, scrollIntoView stubs — Base UI Select needs the same ones). Derive a real cascade chain from the bundled index instead of hardcoding names:

```tsx
// @vitest-environment jsdom
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { loadDefaultIndex } from 'thaizip/data'
import { listAmphures, listProvinces, listTambons } from 'thaizip'
import type { AmphureSummary, ProvinceSummary, ResolvedThaiAddress, TambonSummary } from 'thaizip'
import { ThaiAddressCascadeSelect } from '../templates/react/ts/thai-address-cascade-select'

if (!('ResizeObserver' in globalThis)) {
  class ResizeObserverStub {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
  globalThis.ResizeObserver = ResizeObserverStub as unknown as typeof ResizeObserver
}
for (const method of ['hasPointerCapture', 'setPointerCapture', 'releasePointerCapture'] as const) {
  if (!(method in Element.prototype)) {
    // @ts-expect-error -- test-environment polyfill
    Element.prototype[method] = () => (method === 'hasPointerCapture' ? false : undefined)
  }
}
if (!('scrollIntoView' in Element.prototype)) {
  // @ts-expect-error -- test-environment polyfill
  Element.prototype.scrollIntoView = () => {}
}

let province: ProvinceSummary
let amphure: AmphureSummary
let tambon: TambonSummary
let expectedAddress: ResolvedThaiAddress

beforeAll(async () => {
  const index = await loadDefaultIndex()
  province = listProvinces(index)[0]
  amphure = listAmphures(index, province.id)[0]
  tambon = listTambons(index, amphure.id)[0]
  expectedAddress = {
    tambon: tambon.nameTh,
    tambonEn: tambon.nameEn,
    amphure: amphure.nameTh,
    amphureEn: amphure.nameEn,
    province: province.nameTh,
    provinceEn: province.nameEn,
    zipCode: tambon.zipCode,
    subdistrict: tambon.nameTh,
    subdistrictEn: tambon.nameEn,
    district: amphure.nameTh,
    districtEn: amphure.nameEn,
    postalCode: tambon.zipCode,
  }
})

afterEach(() => {
  cleanup()
})

// No @testing-library/jest-dom in this repo — assert via plain DOM properties,
// same as tests/thai-address-autocomplete.test.tsx.
function isDisabled(el: HTMLElement): boolean {
  return (el as HTMLButtonElement).disabled || el.getAttribute('data-disabled') !== null
}

function hiddenInput(nameAttr: string): HTMLInputElement {
  const input = document.querySelector<HTMLInputElement>(`input[name="${nameAttr}"]`)
  if (!input) throw new Error(`hidden input ${nameAttr} not found`)
  return input
}

async function getTriggers() {
  // Three comboboxes render in DOM order: province, district, subdistrict.
  // (Base UI Select triggers have role="combobox" per ARIA 1.2.)
  const triggers = await screen.findAllByRole('combobox')
  expect(triggers).toHaveLength(3)
  await waitFor(() => expect(isDisabled(triggers[0])).toBe(false))
  return { provinceTrigger: triggers[0], districtTrigger: triggers[1], subdistrictTrigger: triggers[2] }
}

async function pickOption(user: ReturnType<typeof userEvent.setup>, trigger: HTMLElement, optionName: string) {
  await user.click(trigger)
  const listbox = await screen.findByRole('listbox')
  await user.click(within(listbox).getByRole('option', { name: optionName }))
  await waitFor(() => expect(screen.queryByRole('listbox')).toBeNull())
}

describe('ThaiAddressCascadeSelect — cascade flow', () => {
  it('walks province > district > subdistrict, emits ResolvedThaiAddress, and shows the zip', async () => {
    const onValueChange = vi.fn()
    const user = userEvent.setup()
    render(<ThaiAddressCascadeSelect onValueChange={onValueChange} name="addr" />)

    const { provinceTrigger, districtTrigger, subdistrictTrigger } = await getTriggers()
    expect(isDisabled(districtTrigger)).toBe(true)
    expect(isDisabled(subdistrictTrigger)).toBe(true)

    await pickOption(user, provinceTrigger, province.nameTh)
    await waitFor(() => expect(isDisabled(districtTrigger)).toBe(false))
    expect(onValueChange).not.toHaveBeenCalled()

    await pickOption(user, districtTrigger, amphure.nameTh)
    await waitFor(() => expect(isDisabled(subdistrictTrigger)).toBe(false))

    await pickOption(user, subdistrictTrigger, tambon.nameTh)
    await waitFor(() => expect(onValueChange).toHaveBeenCalledWith(expectedAddress))

    expect(screen.getByDisplayValue(tambon.zipCode)).toBeTruthy()

    expect(hiddenInput('addr-province').value).toBe(province.nameTh)
    expect(hiddenInput('addr-district').value).toBe(amphure.nameTh)
    expect(hiddenInput('addr-subdistrict').value).toBe(tambon.nameTh)
    expect(hiddenInput('addr-zipcode').value).toBe(tambon.zipCode)
  })

  it('fires onValueChange(null) and resets children when a parent select invalidates the value', async () => {
    const onValueChange = vi.fn()
    const user = userEvent.setup()
    render(<ThaiAddressCascadeSelect onValueChange={onValueChange} />)

    const { provinceTrigger, districtTrigger, subdistrictTrigger } = await getTriggers()
    await pickOption(user, provinceTrigger, province.nameTh)
    await waitFor(() => expect(isDisabled(districtTrigger)).toBe(false))
    await pickOption(user, districtTrigger, amphure.nameTh)
    await waitFor(() => expect(isDisabled(subdistrictTrigger)).toBe(false))
    await pickOption(user, subdistrictTrigger, tambon.nameTh)
    await waitFor(() => expect(onValueChange).toHaveBeenCalledWith(expectedAddress))
    onValueChange.mockClear()

    // Picking a *different* province must reset the children and null the value.
    const index = await loadDefaultIndex()
    const otherProvince = listProvinces(index)[1]
    await pickOption(user, provinceTrigger, otherProvince.nameTh)

    await waitFor(() => expect(onValueChange).toHaveBeenCalledWith(null))
    expect(isDisabled(subdistrictTrigger)).toBe(true)
    expect(screen.queryByDisplayValue(tambon.zipCode)).toBeNull()
  })

  it('pre-selects the full chain from defaultValue and disables hidden inputs when disabled', async () => {
    render(<ThaiAddressCascadeSelect defaultValue={expectedAddress} name="addr" disabled />)

    const triggers = await screen.findAllByRole('combobox')
    await waitFor(() => expect(triggers[0].textContent).toContain(province.nameTh))
    expect(triggers[1].textContent).toContain(amphure.nameTh)
    expect(triggers[2].textContent).toContain(tambon.nameTh)
    expect(screen.getByDisplayValue(tambon.zipCode)).toBeTruthy()

    for (const suffix of ['province', 'district', 'subdistrict', 'zipcode'] as const) {
      expect(hiddenInput(`addr-${suffix}`).disabled).toBe(true)
    }
  })

  it("renders English option labels and texts when locale='en'", async () => {
    const user = userEvent.setup()
    render(<ThaiAddressCascadeSelect locale="en" />)

    const { provinceTrigger } = await getTriggers()
    expect(provinceTrigger.textContent).toContain('Select province')

    await user.click(provinceTrigger)
    const listbox = await screen.findByRole('listbox')
    expect(within(listbox).getByRole('option', { name: province.nameEn })).toBeTruthy()
  })
})
```

Notes for the implementer:
- The repo does NOT have `@testing-library/jest-dom` — that's why the assertions above are plain-DOM (`.disabled`, `.textContent`, `toBeNull()`). Do not add it.
- If jsdom clicking proves flaky for Base UI Select (popup not opening), fall back to keyboard interaction (`trigger.focus()` + `user.keyboard('{Enter}')` / arrow keys) — the assertion targets stay the same.
- `isDisabled` checks both the native `disabled` attribute and `data-disabled` because Base UI may render either depending on the part's configuration; if the rendered trigger clearly uses only one, simplify is fine but keep the helper.

- [ ] **Step 2: Run it to verify it fails**

Run: `npx vitest run tests/thai-address-cascade-select.test.tsx`
Expected: FAIL — cannot resolve `../templates/react/ts/thai-address-cascade-select`.

- [ ] **Step 3: Write the template**

Create `templates/react/ts/thai-address-cascade-select.tsx`. Follow `thai-address-autocomplete.tsx` conventions exactly: outer component owns loading/error, `Ready` subcomponent mounts once the index is final; token-only styling; th/en default text sets; 4 hidden inputs wired to `disabled`.

```tsx
'use client'

import * as React from 'react'
import { Select } from '@base-ui/react/select'
import { listAmphures, listProvinces, listTambons } from 'thaizip'
import type {
  AmphureSummary,
  ProvinceSummary,
  ResolvedThaiAddress,
  TambonSummary,
  TrigramIndex,
} from 'thaizip'
import { cn } from '@/lib/utils'
import { useThaiAddressIndex } from '@/hooks/use-thai-address-index'

type AddressLocale = 'th' | 'en'

type ThaiAddressCascadeSelectTexts = {
  provinceLabel: string
  districtLabel: string
  subdistrictLabel: string
  zipLabel: string
  provincePlaceholder: string
  districtPlaceholder: string
  subdistrictPlaceholder: string
  loadingText: string
  errorText: string
  retryLabel: string
}

export type ThaiAddressCascadeSelectProps = {
  /** Controlled resolved address. Pass `null` to clear a controlled cascade. */
  value?: ResolvedThaiAddress | null
  /** Uncontrolled seed value; pre-selects the full province > district > subdistrict chain. */
  defaultValue?: ResolvedThaiAddress | null
  onValueChange?: (address: ResolvedThaiAddress | null) => void
  /** When set, renders 4 hidden inputs: `${name}-subdistrict|-district|-province|-zipcode`. */
  name?: string
  /** Drives option labels and the default texts. Defaults to `'th'`. */
  locale?: AddressLocale
  texts?: Partial<ThaiAddressCascadeSelectTexts>
  disabled?: boolean
  required?: boolean
  onBlur?: React.FocusEventHandler<HTMLButtonElement>
  onError?: (error: Error) => void
  'aria-invalid'?: React.AriaAttributes['aria-invalid']
  /** Applied to the root grid wrapper element. */
  className?: string
  labelClassName?: string
  triggerClassName?: string
  popupClassName?: string
  itemClassName?: string
  /** Forwarded to the province trigger button (the cascade's primary control). */
  ref?: React.Ref<HTMLButtonElement>
}

const DEFAULT_TEXTS: Record<AddressLocale, ThaiAddressCascadeSelectTexts> = {
  th: {
    provinceLabel: 'จังหวัด',
    districtLabel: 'อำเภอ/เขต',
    subdistrictLabel: 'ตำบล/แขวง',
    zipLabel: 'รหัสไปรษณีย์',
    provincePlaceholder: 'เลือกจังหวัด',
    districtPlaceholder: 'เลือกอำเภอ/เขต',
    subdistrictPlaceholder: 'เลือกตำบล/แขวง',
    loadingText: 'กำลังโหลดข้อมูล...',
    errorText: 'โหลดข้อมูลที่อยู่ไม่สำเร็จ',
    retryLabel: 'ลองใหม่',
  },
  en: {
    provinceLabel: 'Province',
    districtLabel: 'District',
    subdistrictLabel: 'Sub-district',
    zipLabel: 'Postal code',
    provincePlaceholder: 'Select province',
    districtPlaceholder: 'Select district',
    subdistrictPlaceholder: 'Select sub-district',
    loadingText: 'Loading address data...',
    errorText: 'Failed to load address data',
    retryLabel: 'Retry',
  },
}

type Option = { id: number; nameTh: string; nameEn: string }

function optionName(option: Option, locale: AddressLocale): string {
  return locale === 'en' ? option.nameEn : option.nameTh
}

function buildResolved(
  province: ProvinceSummary,
  amphure: AmphureSummary,
  tambon: TambonSummary,
): ResolvedThaiAddress {
  return {
    tambon: tambon.nameTh,
    tambonEn: tambon.nameEn,
    amphure: amphure.nameTh,
    amphureEn: amphure.nameEn,
    province: province.nameTh,
    provinceEn: province.nameEn,
    zipCode: tambon.zipCode,
    subdistrict: tambon.nameTh,
    subdistrictEn: tambon.nameEn,
    district: amphure.nameTh,
    districtEn: amphure.nameEn,
    postalCode: tambon.zipCode,
  }
}

type SelectionIds = { provinceId: number | null; amphureId: number | null; tambonId: number | null }

const EMPTY_SELECTION: SelectionIds = { provinceId: null, amphureId: null, tambonId: null }

/**
 * Maps a `ResolvedThaiAddress` (names only — the type carries no ids) back onto
 * enumeration-API ids by exact Thai-name match down the chain. Returns the empty
 * selection when any link fails to match, so a stale/foreign address degrades to
 * an unselected cascade instead of a half-selected one.
 */
function selectionFromAddress(index: TrigramIndex, address: ResolvedThaiAddress | null): SelectionIds {
  if (!address) return EMPTY_SELECTION
  const province = listProvinces(index).find((entry) => entry.nameTh === address.province)
  if (!province) return EMPTY_SELECTION
  const amphure = listAmphures(index, province.id).find((entry) => entry.nameTh === address.district)
  if (!amphure) return EMPTY_SELECTION
  const tambon = listTambons(index, amphure.id).find((entry) => entry.nameTh === address.subdistrict)
  if (!tambon) return EMPTY_SELECTION
  return { provinceId: province.id, amphureId: amphure.id, tambonId: tambon.id }
}

export function ThaiAddressCascadeSelect({
  locale = 'th',
  texts,
  disabled = false,
  className,
  labelClassName,
  triggerClassName,
  onError,
  ref,
  ...rest
}: ThaiAddressCascadeSelectProps) {
  const resolvedTexts = React.useMemo<ThaiAddressCascadeSelectTexts>(
    () => ({ ...DEFAULT_TEXTS[locale], ...texts }),
    [locale, texts],
  )

  const { index, error, retry } = useThaiAddressIndex()

  React.useEffect(() => {
    if (error) onError?.(error)
  }, [error, onError])

  if (error) {
    return (
      <div
        role="alert"
        className={cn(
          'flex flex-col items-start gap-2 rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive',
          className,
        )}
      >
        <p>{resolvedTexts.errorText}</p>
        <button
          type="button"
          onClick={retry}
          className="inline-flex items-center rounded-md border border-input bg-background px-3 py-1.5 text-sm font-medium text-foreground shadow-sm transition-colors hover:bg-accent hover:text-accent-foreground"
        >
          {resolvedTexts.retryLabel}
        </button>
      </div>
    )
  }

  // Same rationale as thai-address-autocomplete.tsx: mount the index-consuming
  // subtree only once `index` is final and stable.
  if (!index) {
    return (
      <div aria-busy="true" className={cn('grid w-full grid-cols-1 gap-4 sm:grid-cols-2', className)}>
        {[resolvedTexts.provinceLabel, resolvedTexts.districtLabel, resolvedTexts.subdistrictLabel, resolvedTexts.zipLabel].map(
          (label) => (
            <div key={label} className="flex flex-col gap-1.5">
              <span className={cn('text-sm font-medium text-foreground', labelClassName)}>{label}</span>
              <button
                type="button"
                disabled
                className={cn(
                  'flex h-9 w-full items-center rounded-md border border-input bg-background px-3 py-1 text-sm text-muted-foreground shadow-sm outline-none disabled:cursor-not-allowed disabled:opacity-50',
                  triggerClassName,
                )}
              >
                {resolvedTexts.loadingText}
              </button>
            </div>
          ),
        )}
      </div>
    )
  }

  return (
    <ThaiAddressCascadeSelectReady
      {...rest}
      index={index}
      locale={locale}
      texts={resolvedTexts}
      disabled={disabled}
      className={className}
      labelClassName={labelClassName}
      triggerClassName={triggerClassName}
      ref={ref}
    />
  )
}

type ReadyProps = Omit<ThaiAddressCascadeSelectProps, 'texts' | 'onError'> & {
  index: TrigramIndex
  locale: AddressLocale
  texts: ThaiAddressCascadeSelectTexts
}

function ThaiAddressCascadeSelectReady({
  index,
  value,
  defaultValue,
  onValueChange,
  name,
  locale,
  texts,
  disabled = false,
  required = false,
  onBlur,
  'aria-invalid': ariaInvalid,
  className,
  labelClassName,
  triggerClassName,
  popupClassName,
  itemClassName,
  ref,
}: ReadyProps) {
  const id = React.useId()
  const isControlled = value !== undefined

  const [selection, setSelection] = React.useState<SelectionIds>(() =>
    selectionFromAddress(index, isControlled ? (value ?? null) : (defaultValue ?? null)),
  )
  const { provinceId, amphureId, tambonId } = selection

  // Controlled mode: re-map ids whenever the caller swaps `value` (including -> null).
  // Runs only on `value` identity changes, so in-progress partial picks (which never
  // emit a value) are not wiped between renders.
  React.useEffect(() => {
    if (!isControlled) return
    setSelection(selectionFromAddress(index, value ?? null))
  }, [isControlled, index, value])

  const provinces = React.useMemo(() => {
    const collator = new Intl.Collator(locale === 'en' ? 'en' : 'th')
    return [...listProvinces(index)].sort((a, b) => collator.compare(optionName(a, locale), optionName(b, locale)))
  }, [index, locale])
  const amphures = React.useMemo(() => {
    if (provinceId === null) return []
    const collator = new Intl.Collator(locale === 'en' ? 'en' : 'th')
    return [...listAmphures(index, provinceId)].sort((a, b) => collator.compare(optionName(a, locale), optionName(b, locale)))
  }, [index, provinceId, locale])
  const tambons = React.useMemo(() => {
    if (amphureId === null) return []
    const collator = new Intl.Collator(locale === 'en' ? 'en' : 'th')
    return [...listTambons(index, amphureId)].sort((a, b) => collator.compare(optionName(a, locale), optionName(b, locale)))
  }, [index, amphureId, locale])

  const selectedProvince = provinceId === null ? null : (provinces.find((entry) => entry.id === provinceId) ?? null)
  const selectedAmphure = amphureId === null ? null : (amphures.find((entry) => entry.id === amphureId) ?? null)
  const selectedTambon = tambonId === null ? null : (tambons.find((entry) => entry.id === tambonId) ?? null)

  const resolvedAddress: ResolvedThaiAddress | null = isControlled
    ? (value ?? null)
    : selectedProvince && selectedAmphure && selectedTambon
      ? buildResolved(selectedProvince, selectedAmphure, selectedTambon)
      : null

  const hadFullSelection = tambonId !== null

  function handleProvinceChange(nextId: number | null) {
    setSelection({ provinceId: nextId, amphureId: null, tambonId: null })
    if (hadFullSelection) onValueChange?.(null)
  }

  function handleAmphureChange(nextId: number | null) {
    setSelection((current) => ({ provinceId: current.provinceId, amphureId: nextId, tambonId: null }))
    if (hadFullSelection) onValueChange?.(null)
  }

  function handleTambonChange(nextId: number | null) {
    setSelection((current) => ({ ...current, tambonId: nextId }))
    if (nextId === null) {
      if (hadFullSelection) onValueChange?.(null)
      return
    }
    const tambon = tambons.find((entry) => entry.id === nextId)
    if (tambon && selectedProvince && selectedAmphure) {
      onValueChange?.(buildResolved(selectedProvince, selectedAmphure, tambon))
    }
  }

  const zipValue = selectedTambon?.zipCode ?? ''

  return (
    <div className={cn('grid w-full grid-cols-1 gap-4 sm:grid-cols-2', className)}>
      <CascadeField
        labelId={`${id}-province-label`}
        label={texts.provinceLabel}
        placeholder={texts.provincePlaceholder}
        options={provinces}
        value={provinceId}
        selected={selectedProvince}
        onChange={handleProvinceChange}
        disabled={disabled}
        required={required}
        locale={locale}
        triggerRef={ref}
        onBlur={onBlur}
        ariaInvalid={ariaInvalid}
        labelClassName={labelClassName}
        triggerClassName={triggerClassName}
        popupClassName={popupClassName}
        itemClassName={itemClassName}
      />
      <CascadeField
        labelId={`${id}-district-label`}
        label={texts.districtLabel}
        placeholder={texts.districtPlaceholder}
        options={amphures}
        value={amphureId}
        selected={selectedAmphure}
        onChange={handleAmphureChange}
        disabled={disabled || provinceId === null}
        required={required}
        locale={locale}
        labelClassName={labelClassName}
        triggerClassName={triggerClassName}
        popupClassName={popupClassName}
        itemClassName={itemClassName}
      />
      <CascadeField
        labelId={`${id}-subdistrict-label`}
        label={texts.subdistrictLabel}
        placeholder={texts.subdistrictPlaceholder}
        options={tambons}
        value={tambonId}
        selected={selectedTambon}
        onChange={handleTambonChange}
        disabled={disabled || amphureId === null}
        required={required}
        locale={locale}
        labelClassName={labelClassName}
        triggerClassName={triggerClassName}
        popupClassName={popupClassName}
        itemClassName={itemClassName}
      />

      <div className="flex flex-col gap-1.5">
        <label htmlFor={`${id}-zip`} className={cn('text-sm font-medium text-foreground', labelClassName)}>
          {texts.zipLabel}
        </label>
        <input
          id={`${id}-zip`}
          readOnly
          tabIndex={-1}
          value={zipValue}
          className={cn(
            'flex h-9 w-full rounded-md border border-input bg-muted px-3 py-1 text-sm text-muted-foreground shadow-sm outline-none',
            triggerClassName,
          )}
        />
      </div>

      {name && (
        <>
          <input type="hidden" name={`${name}-subdistrict`} value={resolvedAddress?.subdistrict ?? ''} disabled={disabled} />
          <input type="hidden" name={`${name}-district`} value={resolvedAddress?.district ?? ''} disabled={disabled} />
          <input type="hidden" name={`${name}-province`} value={resolvedAddress?.province ?? ''} disabled={disabled} />
          <input type="hidden" name={`${name}-zipcode`} value={resolvedAddress?.zipCode ?? ''} disabled={disabled} />
        </>
      )}
    </div>
  )
}

type CascadeFieldProps = {
  labelId: string
  label: string
  placeholder: string
  options: Option[]
  value: number | null
  selected: Option | null
  onChange: (next: number | null) => void
  disabled: boolean
  required: boolean
  locale: AddressLocale
  triggerRef?: React.Ref<HTMLButtonElement>
  onBlur?: React.FocusEventHandler<HTMLButtonElement>
  ariaInvalid?: React.AriaAttributes['aria-invalid']
  labelClassName?: string
  triggerClassName?: string
  popupClassName?: string
  itemClassName?: string
}

function CascadeField({
  labelId,
  label,
  placeholder,
  options,
  value,
  selected,
  onChange,
  disabled,
  required,
  locale,
  triggerRef,
  onBlur,
  ariaInvalid,
  labelClassName,
  triggerClassName,
  popupClassName,
  itemClassName,
}: CascadeFieldProps) {
  return (
    <div className="flex flex-col gap-1.5">
      <span id={labelId} className={cn('text-sm font-medium text-foreground', labelClassName)}>
        {label}
      </span>
      <Select.Root value={value} onValueChange={(next) => onChange(next)} disabled={disabled} required={required}>
        <Select.Trigger
          ref={triggerRef}
          aria-labelledby={labelId}
          aria-invalid={ariaInvalid}
          onBlur={onBlur}
          className={cn(
            'flex h-9 w-full items-center justify-between gap-2 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm outline-none transition-colors focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50',
            triggerClassName,
          )}
        >
          <span className={cn('truncate', selected === null && 'text-muted-foreground')}>
            {selected ? optionName(selected, locale) : placeholder}
          </span>
          <Select.Icon className="shrink-0 text-muted-foreground">▾</Select.Icon>
        </Select.Trigger>
        <Select.Portal>
          <Select.Positioner sideOffset={4} className="z-50 outline-none">
            <Select.Popup
              className={cn(
                'max-h-64 w-[var(--anchor-width)] overflow-auto rounded-md border border-border bg-popover p-1 text-popover-foreground shadow-md',
                popupClassName,
              )}
            >
              <Select.List>
                {options.map((option) => (
                  <Select.Item
                    key={option.id}
                    value={option.id}
                    label={optionName(option, locale)}
                    className={cn(
                      'flex cursor-default items-center rounded-sm px-2 py-1.5 text-sm outline-none data-[highlighted]:bg-accent data-[highlighted]:text-accent-foreground',
                      itemClassName,
                    )}
                  >
                    <Select.ItemText>{optionName(option, locale)}</Select.ItemText>
                  </Select.Item>
                ))}
              </Select.List>
            </Select.Popup>
          </Select.Positioner>
        </Select.Portal>
      </Select.Root>
    </div>
  )
}
```

Implementer notes (verified against the installed `@base-ui/react@1.7.0` types, re-check if anything fails to compile):
- `Select.Root` props used: `value` (`number | null`), `onValueChange(value, eventDetails)`, `disabled`, `required`. `Select.Trigger` renders a `<button>` and forwards `ref`/`onBlur`/aria props.
- Available parts: `Root/Trigger/Value/Icon/Portal/Positioner/Popup/List/Item/ItemIndicator/ItemText/...`. We deliberately render the selected label as a plain `<span>` instead of `<Select.Value>` — the value is a numeric id, and `Select.Value` would render the raw number unless given an `items` map.
- If `Select.List` rejects plain `{options.map(...)}` children in 1.7.0, render the items directly inside `Select.Popup` (List is optional for static children).
- If passing `null` as the initial `value` warns about uncontrolled→controlled switching, use `value={value}` consistently from the start (it is always `number | null`, never `undefined`) — that is already the case in the code above.

- [ ] **Step 4: Typecheck the template standalone**

Run: `npm run typecheck:templates`
Expected: PASS (the `@/lib`, `@/hooks` aliases come from `tsconfig.templates.json`; `vitest.config.ts` already maps the same aliases for the test import).

- [ ] **Step 5: Run the RTL tests to verify they pass**

Run: `npx vitest run tests/thai-address-cascade-select.test.tsx`
Expected: 4 passing tests. If Base UI Select interactions misbehave under jsdom, iterate per the fallback note in Step 1 — do not weaken assertions about `onValueChange` payloads or the null-on-invalidation contract.

- [ ] **Step 6: Full verification quartet**

Run: `npm test && npm run typecheck && npm run typecheck:templates && npm run build`
Expected: all green (legacy `ThaiAddressCascadeSelect.tsx` still exists and still compiles; both templates coexist until Task 3).

- [ ] **Step 7: Commit**

```bash
git add templates/react/ts/thai-address-cascade-select.tsx tests/thai-address-cascade-select.test.tsx
git commit -m "feat: new ThaiAddressCascadeSelect template on Base UI Select + cascade API"
```

---

### Task 3: Rewire the registry entry, delete the legacy template, update docs

**Files:**
- Modify: `src/registry.ts:32-43` (the `cascade-select` item)
- Delete: `templates/react/ts/ThaiAddressCascadeSelect.tsx`
- Modify: `tests/registry.test.ts` (cascade-entry expectations — find them with `grep -n "cascade" tests/registry.test.ts`)
- Modify: `tests/add.test.ts` if any fixture references `ThaiAddressCascadeSelect.tsx` (find with `grep -n "CascadeSelect" tests/add.test.ts`)
- Modify: `CLAUDE.md` (component registry section, Components section, template tree), `README.md` (component list)

**Interfaces:**
- Consumes: Task 2's `templates/react/ts/thai-address-cascade-select.tsx` with named export `ThaiAddressCascadeSelect`; Task 1's `@base-ui/react` dependency name.
- Produces: the final Phase 3 registry — both components on Base UI, both sharing `utils` + `use-thai-address-index`.

- [ ] **Step 1: Update the registry test expectations first (failing test)**

In `tests/registry.test.ts`, update (or add, if not present) the cascade-entry assertions to:

```ts
  it('cascade-select points at the Base UI template and shares the lib/hook items', () => {
    const item = resolveRegistryItem('cascade')
    expect(item?.files).toEqual([
      {
        source: 'react/ts/thai-address-cascade-select.tsx',
        target: { dir: 'componentDir', file: 'thai-address-cascade-select.tsx' },
      },
    ])
    expect(item?.dependencies).toEqual(['thaizip', '@base-ui/react'])
    expect(item?.registryDependencies).toEqual(['utils', 'use-thai-address-index'])
    expect(item?.exportName).toBe('ThaiAddressCascadeSelect')
  })
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npx vitest run tests/registry.test.ts`
Expected: FAIL — files/dependencies still point at the legacy template.

- [ ] **Step 3: Rewire the registry item and delete the legacy template**

In `src/registry.ts` replace the `cascade-select` entry with:

```ts
  {
    name: 'cascade-select',
    description: 'Province > district > sub-district select flow (Base UI Select)',
    aliases: ['cascade', 'cascade-select', 'thai-address-cascade-select', 'ThaiAddressCascadeSelect'],
    type: 'component',
    files: [{ source: 'react/ts/thai-address-cascade-select.tsx', target: { dir: 'componentDir', file: 'thai-address-cascade-select.tsx' } }],
    dependencies: ['thaizip', '@base-ui/react'],
    registryDependencies: ['utils', 'use-thai-address-index'],
    exportName: 'ThaiAddressCascadeSelect',
  },
```

(The stale comment above `exportName` about "once this file kebab-cases in Phase 3" gets removed — it has happened.)

Then:

```bash
git rm templates/react/ts/ThaiAddressCascadeSelect.tsx
```

Fix any `tests/add.test.ts` fixtures that referenced the old filename (per the grep in **Files**).

- [ ] **Step 4: Run the full suite and fix fallout**

Run: `npm test && npm run typecheck && npm run typecheck:templates && npm run build`
Expected: all green. `add cascade-select` paths in `tests/add.test.ts` now scaffold 3 files (component + utils + hook) — if a test asserted the old single-file behavior, update it to expect the transitive files, mirroring how the autocomplete tests do it.

- [ ] **Step 5: Update CLAUDE.md and README.md**

- `CLAUDE.md`: in the architecture tree replace `ThaiAddressCascadeSelect.tsx     # legacy province > district > sub-district select` with `thai-address-cascade-select.tsx  # Base UI Select ×3 cascade (imports \`@/lib/utils\` + \`@/hooks/use-thai-address-index\`)`; in "Component registry" update the cascade bullet to note `registryDependencies: ['utils', 'use-thai-address-index']`; replace the Components-section cascade bullet with a prop summary matching the autocomplete bullet's style: controlled/uncontrolled `value`/`defaultValue`/`onValueChange` (`ResolvedThaiAddress | null`), `name` (4 hidden inputs), `locale`, `texts`, `disabled`/`required`/`onBlur`/`onError`/`aria-invalid`, className slots (`className`/`labelClassName`/`triggerClassName`/`popupClassName`/`itemClassName`), `ref` forwarded to the province trigger, `onValueChange(null)` on invalidating parent change.
- `README.md`: update the `cascade-select` component bullet — Base UI Select, scaffolds 3 files, installs `thaizip` + `@base-ui/react` + `clsx` + `tailwind-merge`, same as the autocomplete bullet's structure.

- [ ] **Step 6: Final verification quartet**

Run: `npm test && npm run typecheck && npm run typecheck:templates && npm run build`
Expected: all green.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat!: cascade-select v2 — Base UI Select, ResolvedThaiAddress value model

BREAKING CHANGE: ThaiAddressCascadeSelect drops onSelect/onClear and the
slate-styled native selects; it now emits ResolvedThaiAddress via
onValueChange, follows locale, and scaffolds shared lib/hook files."
```
