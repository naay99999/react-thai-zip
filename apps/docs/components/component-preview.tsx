import { ServerCodeBlock } from '@fumadocs/base-ui/components/codeblock.rsc'
import { examples } from '~/examples/registry'
import { readExampleSource } from '~/lib/examples'
import { cn } from '~/lib/cn'
import type { DocsLocale } from '~/lib/component-install'
import { CollapsibleCode } from './collapsible-code'

const COPY = {
  th: { viewCode: 'ดูโค้ด', hideCode: 'ซ่อนโค้ด' },
  en: { viewCode: 'View Code', hideCode: 'Hide Code' },
} as const

/** Maximum width of the live example, centered in the preview area. */
const SIZES = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-2xl',
} as const

/**
 * Renders `examples/<name>.tsx` live, with that same file's source collapsed
 * underneath — so the code always matches the demo. Templates imported by the
 * example render in the style picked on the site (see `components/style-switch`).
 */
export async function ComponentPreview({
  name,
  lang = 'th',
  size = 'md',
}: {
  name: string
  lang?: DocsLocale
  size?: keyof typeof SIZES
}) {
  const Example = examples[name]
  if (!Example) throw new Error(`Unknown example: ${name}`)
  const code = await readExampleSource(name)
  const copy = COPY[lang]

  return (
    <div className="not-prose my-6 overflow-hidden rounded-xl border bg-fd-card">
      <div className="tz-preview">
        <div className={cn('w-full', SIZES[size])}>
          <Example />
        </div>
      </div>
      <CollapsibleCode expandLabel={copy.viewCode} collapseLabel={copy.hideCode} className="border-t">
        <ServerCodeBlock code={code} lang="tsx" codeblock={{ className: 'my-0 rounded-none border-0' }} />
      </CollapsibleCode>
    </div>
  )
}
