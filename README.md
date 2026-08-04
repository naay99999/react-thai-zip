# react-thaizip

CLI scaffold tool for adding Thai address React components powered by [`thaizip`](https://www.npmjs.com/package/thaizip).

```bash
npx react-thaizip init
npx react-thaizip add
```

`init` detects your React or Next.js project structure, package manager, Tailwind CSS, JavaScript/TypeScript preference, and whether `thaizip` is installed. It writes `thaizip.config.json`, which `add` uses when generating components.

## Components

```bash
npx react-thaizip add
npx react-thaizip add ThaiAddressPostalCodeForm
npx react-thaizip add ThaiAddressDisplayFields
npx react-thaizip add ThaiAddressCascadeSelect
```

Shorter aliases also resolve to the same components:

```bash
npx react-thaizip add autocomplete
npx react-thaizip add postal
npx react-thaizip add cascade
npx react-thaizip add fields
```

Legacy aliases from older docs are also supported:

```bash
npx react-thaizip add ThaiAddressPostalForm
npx react-thaizip add ThaiAddressSearch
npx react-thaizip add ThaiAddressForm
```

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

Prefer scaffolding straight to Thai labels instead of overriding `texts` yourself? Pass `--lang th` to `add` and the generated component's `defaultTexts` will be pre-filled in Thai:

```bash
npx react-thaizip add ThaiAddressCascadeSelect --lang th
```

## `ThaiAddressCascadeSelect`: `onClear`

`ThaiAddressCascadeSelect` accepts an optional `onClear` callback that fires whenever the user resets the province or district selection (clearing any dependent district/sub-district/postal-code state):

```tsx
<ThaiAddressCascadeSelect
  onSelect={(result) => console.log(result)}
  onClear={() => console.log('selection cleared')}
/>
```
