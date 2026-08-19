# react-thaizip

CLI scaffold tool for adding Thai address React components powered by [`thaizip`](https://www.npmjs.com/package/thaizip).

📚 [Documentation and live component demos](https://react-thai-zip.vercel.app)

```bash
npx react-thaizip init
npx react-thaizip add autocomplete
```

`add autocomplete` installs `thaizip`, `@base-ui/react`, `clsx`, and `tailwind-merge`, then scaffolds 3 files: the component plus its two shared dependencies (`lib/utils.ts` and `hooks/use-thai-address-index.ts`).

## Prerequisite: Tailwind CSS

Your project must already have Tailwind CSS (v3 or v4) installed — `init` detects it but does not install it for you. If no Tailwind setup is found, `init` prints a pointer to https://tailwindcss.com/docs/installation and exits; install Tailwind first, then re-run `init`.

`init` detects your React or Next.js project structure, package manager, and Tailwind version, then:
- writes `thaizip.config.json`, which `add` uses when generating components
- appends the shadcn-style design tokens (CSS custom properties) to your global CSS file — or prints them for manual copy if no global CSS file is found
- on Tailwind v3, also prints a `theme.extend` config snippet to add to `tailwind.config.{js,ts}` by hand (v3 has no `@theme inline`)

## CLI flags

```
npx react-thaizip init [--yes]
npx react-thaizip add [component...] [--yes] [--overwrite]
npx react-thaizip --help
npx react-thaizip --version
```

- `--yes`, `-y` — skip confirmation prompts (`init` and `add`)
- `--overwrite` — overwrite existing component files without prompting (`add` only)
- `--help`, `-h` — print usage and the list of available components
- `--version`, `-v` — print the CLI's own version
- `init --help` / `add --help` — print command-scoped usage (`add --help` includes the component list)

## Components

```bash
npx react-thaizip add
npx react-thaizip add ThaiAddressAutocomplete
npx react-thaizip add ThaiAddressCascadeSelect
```

Shorter aliases also resolve to the same components:

```bash
npx react-thaizip add autocomplete
npx react-thaizip add cascade-select
```

Multiple targets can be passed at once:

```bash
npx react-thaizip add autocomplete cascade-select
```

Running `add` with no targets prompts an interactive multiselect (only these two components are listed — `--help` shows the same list). `add` also requires `thaizip` >= 0.7.0 (the version that added the cascade/enumeration API and bilingual labels the templates rely on) — if an older version is already installed, `add` reports the version it found and exits without writing files.

- **`autocomplete`** (`ThaiAddressAutocomplete`) — free-text address search built on [Base UI](https://base-ui.com/react/components/combobox)'s `Combobox`. Scaffolds 3 files: the component (`<componentDir>/thai-address-autocomplete.tsx`) plus its two shared dependencies, `<libDir>/utils.ts` (`cn()` helper) and `<hooksDir>/use-thai-address-index.ts` (loads the bundled thaizip index) — pulled in automatically, no need to `add` them by name. Installs `thaizip`, `@base-ui/react`, `clsx`, and `tailwind-merge`.
- **`cascade-select`** (`ThaiAddressCascadeSelect`) — province > district > sub-district cascade built on [Base UI](https://base-ui.com/react/components/select)'s `Select` (×3). Scaffolds 3 files: the component (`<componentDir>/thai-address-cascade-select.tsx`) plus its two shared dependencies, `<libDir>/utils.ts` and `<hooksDir>/use-thai-address-index.ts` — pulled in automatically, no need to `add` them by name. Installs `thaizip`, `@base-ui/react`, `clsx`, and `tailwind-merge`.

### `ThaiAddressAutocomplete` props

| Prop | Purpose |
|---|---|
| `value` / `defaultValue` / `onValueChange` | Controlled or uncontrolled `ResolvedThaiAddress \| null` selection |
| `name` | When set, renders 4 hidden inputs: `${name}-subdistrict`, `-district`, `-province`, `-zipcode` |
| `locale` | `'th'` (default) or `'en'` — drives suggestion labels and default `texts` |
| `texts` | `Partial<Texts>` — override any subset of the default labels/status messages |
| `limit` / `debounce` / `threshold` | Passed through to the underlying search hook |
| `disabled` / `required` / `onBlur` / `onError` | Standard field wiring; `onError` fires if the bundled address index fails to load |
| `className` / `inputClassName` / `popupClassName` / `itemClassName` | Class-name slots for the wrapper, input, popup, and each suggestion item |
| `ref` | Forwarded to the underlying `<input>` |

### `ThaiAddressCascadeSelect` props

| Prop | Purpose |
|---|---|
| `value` / `defaultValue` / `onValueChange` | Controlled or uncontrolled `ResolvedThaiAddress \| null` selection. Changing a parent select in a way that invalidates a full selection fires `onValueChange(null)` and resets the downstream selects |
| `name` | When set, renders 4 hidden inputs: `${name}-subdistrict`, `-district`, `-province`, `-zipcode` |
| `locale` | `'th'` (default) or `'en'` — drives option labels and default `texts` |
| `texts` | `Partial<Texts>` — override any subset of the default labels/status messages |
| `disabled` / `required` / `onBlur` / `onError` / `aria-invalid` | Standard field wiring; `onError` fires if the bundled address index fails to load |
| `className` / `labelClassName` / `triggerClassName` / `popupClassName` / `itemClassName` | Class-name slots for the wrapper, labels, each select trigger, popup, and each option item |
| `ref` | Forwarded to the province select's trigger button |

## Customizing labels (`texts` prop)

Every generated component ships with Thai default labels (`locale` defaults to `'th'`); pass `locale="en"` to switch to the built-in English set. The optional `texts` prop overrides any subset of the active set:

```tsx
<ThaiAddressCascadeSelect
  locale="en"
  texts={{
    provinceLabel: 'Province',
    districtLabel: 'District',
    subdistrictLabel: 'Sub-district',
    zipLabel: 'Postal code',
  }}
/>
```

`texts` is `Partial<Texts>`, so you only need to supply the keys you want to change — anything you omit falls back to the locale's default. Each component exports its own `Texts` type covering its labels, placeholders, and status messages (e.g. `loadingText`, `errorText`).
