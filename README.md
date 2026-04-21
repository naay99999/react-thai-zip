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

Legacy aliases from older docs are also supported:

```bash
npx react-thaizip add autocomplete
npx react-thaizip add ThaiAddressPostalForm
npx react-thaizip add ThaiAddressSearch
npx react-thaizip add ThaiAddressForm
```
