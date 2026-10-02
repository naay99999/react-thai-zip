---
title: Use react-thaizip with AI
description: Help an AI agent scaffold and compose Thai address components from the real project source
---

Have the agent use the CLI to add components to your React or Next.js project, then build the form by importing those generated files. The components become source files in your project; they are not runtime exports from the `react-thaizip` package.

## Choose a component

| Task | `add` target | Component |
| --- | --- | --- |
| Search by address text or postal code | `autocomplete` | `ThaiAddressAutocomplete` |
| Select province → district → sub-district | `cascade-select` | `ThaiAddressCascadeSelect` |
| Also capture house number and street details | `address-form` | `ThaiAddressForm` |
| Show a saved address | `address-display` | `ThaiAddressDisplay` |
| Use the cascade with react-hook-form | `address-form-field` | `ThaiAddressFormField` |

Read each component's behavior and props in the Components section before choosing, particularly `ResolvedThaiAddress | null`, form hidden inputs, and resets during a partial cascade selection.

## Set up the target project

Run these commands from the root of a React or Next.js project with Tailwind CSS v3 or v4 already installed:

```bash
npx react-thaizip init
npx react-thaizip add autocomplete
```

`init` writes `thaizip.config.json` v4 and selects a vanilla or shadcn/ui template from the project's `components.json`. `add` installs dependencies and prints the import path for the generated file. Use that actual path: the destination and `.tsx`/`.jsx` extension depend on the project. Avoid `--overwrite` until you have reviewed any source you previously edited.

## Prompt for a coding agent

Copy this into an agent that can access the target project, replacing the task in brackets:

```text
Build [a checkout address form] in this project using react-thaizip.

1. Inspect package.json, Tailwind, components.json, and thaizip.config.json first.
2. If the project is not configured yet, run npx react-thaizip init from its root.
3. Choose the appropriate component and run npx react-thaizip add <target>.
4. Use the import path printed by the CLI. Import the component from the scaffolded project file.
5. Follow that component's documented API. For a form, handle null, validation, submit, and reset.
6. Do not recreate the scaffolded component implementation or overwrite edited files without reviewing the diff.
7. Run the project's typecheck/build, then report the files created and verification result.
```

If the agent can read the web, give it this page or `/llms.txt` with the task. Each docs page also offers Copy Markdown for sharing just that page.

## Use the generated file

This example assumes the CLI wrote to `components/` at the project root. Use the import path printed by `add` if your project differs:

```tsx
'use client'

import { useState } from 'react'
import type { ResolvedThaiAddress } from 'thaizip'
import { ThaiAddressAutocomplete } from './components/thai-address-autocomplete'

export function AddressField() {
  const [address, setAddress] = useState<ResolvedThaiAddress | null>(null)

  return (
    <ThaiAddressAutocomplete
      name="address"
      value={address}
      onValueChange={setAddress}
    />
  )
}
```

`onValueChange` receives `null` when the selected address is cleared. With `name="address"`, the component renders hidden inputs named `address-subdistrict`, `address-district`, `address-province`, and `address-zipcode`. See [Forms](/en/docs/guides/forms) for submission examples.

## Check the agent's result

- The component came from `add`, and its import points to a real file in the project.
- Installed `thaizip` is at least `0.7.5`, with the dependencies and shadcn primitives requested by the CLI.
- The form handles `null`, validation, and reset; its hidden inputs or react-hook-form value match the chosen submission method.
- Typecheck/build runs, and at least one real address selection has been tried.

For command failures, see [Troubleshooting](/en/docs/troubleshooting), the [CLI reference](/en/docs/reference/cli), and [Configuration](/en/docs/reference/config).
