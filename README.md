# react-thaizip

CLI scaffold tool for adding Thai address React components powered by [`thaizip`](https://www.npmjs.com/package/thaizip).

```bash
npx react-thaizip init
npx react-thaizip add
```

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

Running `add` with no targets prompts an interactive multiselect. `add` also requires `thaizip` >= 0.7.0 (the version that added the cascade/enumeration API and bilingual labels the templates rely on) — if an older version is already installed, `add` reports the version it found and exits without writing files.

## Customizing labels (`texts` prop)

Every generated component ships with English default labels and accepts an optional `texts` prop for overriding any subset of them — useful for Thai-language UIs or other locales:

```tsx
<ThaiAddressCascadeSelect
  texts={{
    provinceLabel: 'จังหวัด',
    districtLabel: 'อำเภอ/เขต',
    subdistrictLabel: 'ตำบล/แขวง',
    postalCodeLabel: 'รหัสไปรษณีย์',
  }}
/>
```

`texts` is `Partial<Texts>`, so you only need to supply the keys you want to change — anything you omit falls back to the English default. Each component exports its own `Texts` type covering its labels, placeholders, and status messages (e.g. `loadingText`, `errorText`).

## `ThaiAddressCascadeSelect`: `onClear`

`ThaiAddressCascadeSelect` accepts an optional `onClear` callback that fires whenever the user resets the province or district selection (clearing any dependent district/sub-district/postal-code state):

```tsx
<ThaiAddressCascadeSelect
  onSelect={(result) => console.log(result)}
  onClear={() => console.log('selection cleared')}
/>
```
