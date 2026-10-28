import { ServerCodeBlock } from '@fumadocs/base-ui/components/codeblock.rsc'
import { Step, Steps } from '@fumadocs/base-ui/components/steps'
import { Tab, Tabs } from '@fumadocs/base-ui/components/tabs'
import { Fragment } from 'react'
import {
  getInstallVariants,
  INSTALL_COPY,
  readTemplate,
  VARIANT_LABELS,
  type DocsLocale,
  type InstallVariant,
} from '~/lib/component-install'
import { CollapsibleCode } from './collapsible-code'
import { StyleView } from './docs-style'
import { PackageManagerCommand } from './package-manager-command'

/** Inline markdown is limited to `code`, **bold** and [links](...) in the install copy. */
function InlineMarkdown({ text }: { text: string }) {
  const parts = text.split(/(`[^`]+`|\*\*[^*]+\*\*|\[[^\]]+\]\([^)]+\))/g)
  return parts.map((part, index) => {
    if (part.startsWith('`')) return <code key={index}>{part.slice(1, -1)}</code>
    if (part.startsWith('**')) return <strong key={index}>{part.slice(2, -2)}</strong>
    const link = /^\[([^\]]+)\]\(([^)]+)\)$/.exec(part)
    if (link) return <a key={index} href={link[2]}>{link[1]}</a>
    return <Fragment key={index}>{part}</Fragment>
  })
}

async function ManualSteps({ variant, lang }: { variant: InstallVariant; lang: DocsLocale }) {
  const copy = INSTALL_COPY[lang]
  const sources = await Promise.all(variant.files.map((file) => readTemplate(file.source)))

  return (
    <Steps>
      <Step>
        <p>{copy.installDependencies}</p>
        <PackageManagerCommand command={`npm install ${variant.dependencies.join(' ')}`} />
      </Step>
      {variant.shadcnPrimitives.length > 0 && (
        <Step>
          <p>{copy.addPrimitives}</p>
          <PackageManagerCommand command={`npx shadcn@latest add ${variant.shadcnPrimitives.join(' ')}`} />
        </Step>
      )}
      <Step>
        <p>{copy.copyFiles}</p>
        {variant.files.map((file, index) => (
          <CollapsibleCode
            key={file.target}
            expandLabel={copy.expand}
            collapseLabel={copy.collapse}
            className="my-4 overflow-hidden rounded-xl border"
          >
            <ServerCodeBlock
              lang={file.target.endsWith('.tsx') ? 'tsx' : 'ts'}
              code={sources[index]}
              codeblock={{
                title: file.target,
                className: 'my-0 rounded-none border-0',
                viewportProps: { className: 'max-h-none' },
              }}
            />
          </CollapsibleCode>
        ))}
      </Step>
      <Step>
        <p>
          <InlineMarkdown text={copy.updateImports} />
          {variant.key === 'vanilla' && (
            <>
              {' '}
              <InlineMarkdown text={copy.tokens} />
            </>
          )}
        </p>
      </Step>
    </Steps>
  )
}

/**
 * Installation section of a component page: the CLI command, plus manual steps
 * for the style picked at the top of the page (every style the CLI can
 * scaffold is derived from `src/registry.ts`).
 */
export function ComponentInstall({ name, lang = 'th' }: { name: string; lang?: DocsLocale }) {
  const copy = INSTALL_COPY[lang]
  const variants = getInstallVariants(name)
  const views = Object.fromEntries(
    variants.map((variant) => [
      variant.key,
      <>
        {variants.length > 1 && (
          <p className="text-sm text-fd-muted-foreground">
            <InlineMarkdown text={copy.styleNote.replace('{style}', VARIANT_LABELS[variant.key])} />
          </p>
        )}
        <ManualSteps variant={variant} lang={lang} />
      </>,
    ]),
  ) as Parameters<typeof StyleView>[0]['views']

  return (
    <Tabs items={[copy.command, copy.manual]} groupId="install-method" persist>
      <Tab value={copy.command}>
        <PackageManagerCommand command={`npx react-thaizip add ${name}`} />
        <p>
          <InlineMarkdown text={copy.cliNote} />
        </p>
      </Tab>
      <Tab value={copy.manual}>
        <StyleView views={views} />
      </Tab>
    </Tabs>
  )
}
