import { ServerCodeBlock } from 'fumadocs-ui/components/codeblock.rsc'
import { Step, Steps } from 'fumadocs-ui/components/steps'
import { Tab, Tabs } from 'fumadocs-ui/components/tabs'
import { Fragment } from 'react'
import {
  getInstallVariants,
  INSTALL_COPY,
  readTemplate,
  VARIANT_LABELS,
  type DocsLocale,
  type InstallVariant,
} from '~/lib/component-install'

/** Inline markdown is limited to `code` and [links](...) in the install copy. */
function InlineMarkdown({ text }: { text: string }) {
  const parts = text.split(/(`[^`]+`|\[[^\]]+\]\([^)]+\))/g)
  return parts.map((part, index) => {
    if (part.startsWith('`')) return <code key={index}>{part.slice(1, -1)}</code>
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
        <ServerCodeBlock lang="bash" code={`npm install ${variant.dependencies.join(' ')}`} />
      </Step>
      {variant.shadcnPrimitives.length > 0 && (
        <Step>
          <p>{copy.addPrimitives}</p>
          <ServerCodeBlock lang="bash" code={`npx shadcn@latest add ${variant.shadcnPrimitives.join(' ')}`} />
        </Step>
      )}
      <Step>
        <p>{copy.copyFiles}</p>
        {variant.files.map((file, index) => (
          <ServerCodeBlock
            key={file.target}
            lang={file.target.endsWith('.tsx') ? 'tsx' : 'ts'}
            code={sources[index]}
            codeblock={{ title: file.target, viewportProps: { className: 'max-h-96' } }}
          />
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
 * for every style the CLI can scaffold (derived from `src/registry.ts`).
 */
export function ComponentInstall({ name, lang = 'th' }: { name: string; lang?: DocsLocale }) {
  const copy = INSTALL_COPY[lang]
  const variants = getInstallVariants(name)

  return (
    <Tabs items={['CLI', copy.manual]} groupId="install-method" persist>
      <Tab value="CLI">
        <ServerCodeBlock lang="bash" code={`npx react-thaizip add ${name}`} />
        <p>
          <InlineMarkdown text={copy.cliNote} />
        </p>
      </Tab>
      <Tab value={copy.manual}>
        {variants.length === 1 ? (
          <ManualSteps variant={variants[0]} lang={lang} />
        ) : (
          <Tabs items={variants.map((variant) => VARIANT_LABELS[variant.key])} groupId="component-style" persist>
            {variants.map((variant) => (
              <Tab key={variant.key} value={VARIANT_LABELS[variant.key]}>
                <ManualSteps variant={variant} lang={lang} />
              </Tab>
            ))}
          </Tabs>
        )}
      </Tab>
    </Tabs>
  )
}
