import { ServerCodeBlock } from 'fumadocs-ui/components/codeblock.rsc'
import { Tab, Tabs } from 'fumadocs-ui/components/tabs'
import { examples } from '~/examples/registry'
import { readExampleSource } from '~/lib/examples'
import type { DocsLocale } from '~/lib/component-install'

const COPY = {
  th: { preview: 'ตัวอย่าง', code: 'โค้ด' },
  en: { preview: 'Preview', code: 'Code' },
} as const

/**
 * Renders `examples/<name>.tsx` live in a Preview tab and its exact source in a
 * Code tab — both come from the same file, so the code always matches the demo.
 */
export async function ComponentPreview({ name, lang = 'th' }: { name: string; lang?: DocsLocale }) {
  const Example = examples[name]
  if (!Example) throw new Error(`Unknown example: ${name}`)
  const code = await readExampleSource(name)
  const copy = COPY[lang]

  return (
    <Tabs items={[copy.preview, copy.code]} groupId="component-preview" persist>
      <Tab value={copy.preview}>
        <div className="tz-preview not-prose">
          <Example />
        </div>
      </Tab>
      <Tab value={copy.code}>
        <ServerCodeBlock code={code} lang="tsx" codeblock={{ title: `${name}.tsx` }} />
      </Tab>
    </Tabs>
  )
}
