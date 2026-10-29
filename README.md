# react-thaizip

[![npm version](https://img.shields.io/npm/v/react-thaizip.svg)](https://www.npmjs.com/package/react-thaizip)
[![license](https://img.shields.io/npm/l/react-thaizip.svg)](https://github.com/naay99999/react-thai-zip/blob/main/LICENSE)

A CLI that adds ready-to-use Thai address components to your React project, shadcn/ui-style — powered by [`thaizip`](https://www.npmjs.com/package/thaizip).

📚 **[Documentation and live demos](https://thai-zip.vercel.app/en/docs/react)** · Using a coding agent? Point it at [`llms.txt`](https://thai-zip.vercel.app/llms.txt)

![react-thaizip demo — typing "ลาดพร้าว" and "ladprao" in the scaffolded ThaiAddressAutocomplete component and selecting a suggestion](.github/assets/demo.gif)

## Quick start

> Requires a React project with Tailwind CSS (v3 or v4).

```bash
npx react-thaizip init
npx react-thaizip add autocomplete
```

```tsx
import { ThaiAddressAutocomplete } from '@/components/thai-address-autocomplete'

<ThaiAddressAutocomplete name="address" onValueChange={(address) => console.log(address)} />
```

The component is copied into your codebase, so you own it and can edit it freely.

## Components

| Name | Component | What it does |
|---|---|---|
| `autocomplete` | `ThaiAddressAutocomplete` | Search-as-you-type address input |
| `cascade-select` | `ThaiAddressCascadeSelect` | Province → district → subdistrict dropdowns |
| `address-form` | `ThaiAddressForm` | House number, moo, soi, street + cascade |
| `address-display` | `ThaiAddressDisplay` | Read-only formatted address |
| `address-form-field` | `ThaiAddressFormField` | react-hook-form field |

```bash
npx react-thaizip add                  # pick interactively
npx react-thaizip add cascade-select   # or name one (or several)
```

Works with plain Tailwind or your existing shadcn/ui setup (Base UI, Radix, or React Aria) — detected automatically. Thai and English labels built in.

## Learn more

- [Getting started](https://thai-zip.vercel.app/en/docs/react)
- [Components](https://thai-zip.vercel.app/en/docs/react/autocomplete) — props and examples
- [Customization](https://thai-zip.vercel.app/en/docs/react/customization) · [CLI](https://thai-zip.vercel.app/en/docs/react/cli)
- [thaizip core API](https://thai-zip.vercel.app/en/docs) — the search library underneath

## License

MIT
