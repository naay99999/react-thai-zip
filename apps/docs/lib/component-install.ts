import { readFile } from 'node:fs/promises'
import path from 'node:path'
import {
  resolveRegistryItem,
  resolveWithDependencies,
  selectVariant,
  type TargetDirKey,
} from '../../../src/registry'
import type { ComponentStyle, ShadcnBase } from '../../../src/utils/config'
import { docsRoot } from './paths'

export type DocsLocale = 'th' | 'en'
export type InstallVariantKey = 'vanilla' | ShadcnBase

export type InstallFile = {
  /** Default location in a scaffolded project, e.g. `components/thai-address-form.tsx`. */
  target: string
  /** Path under `templates/`, e.g. `react/ts/thai-address-form.tsx`. */
  source: string
}

export type InstallVariant = {
  key: InstallVariantKey
  dependencies: string[]
  shadcnPrimitives: string[]
  files: InstallFile[]
}

const VARIANTS: { key: InstallVariantKey; style: ComponentStyle; base: ShadcnBase | '' }[] = [
  { key: 'vanilla', style: 'vanilla', base: '' },
  { key: 'base', style: 'shadcn', base: 'base' },
  { key: 'radix', style: 'shadcn', base: 'radix' },
  { key: 'aria', style: 'shadcn', base: 'aria' },
]

export const VARIANT_LABELS: Record<InstallVariantKey, string> = {
  vanilla: 'Vanilla',
  base: 'shadcn/ui · Base UI',
  radix: 'shadcn/ui · Radix',
  aria: 'shadcn/ui · React Aria',
}

const TARGET_DIRS: Record<TargetDirKey, string> = {
  componentDir: 'components',
  libDir: 'lib',
  hooksDir: 'hooks',
}

const templatesDirectory = path.join(docsRoot, '../../templates')
const TEMPLATES_URL = 'https://github.com/naay99999/react-thai-zip/blob/main/templates'

/**
 * What `react-thaizip add <component>` would write for each style, derived from
 * the CLI's own registry so the manual steps can't drift from the CLI.
 * Components without shadcn variants (address-display) return only `vanilla`.
 */
export function getInstallVariants(component: string): InstallVariant[] {
  const item = resolveRegistryItem(component)
  if (!item) throw new Error(`Unknown component: ${component}`)
  const items = resolveWithDependencies([item])

  const variants = VARIANTS.map(({ key, style, base }) => {
    const dependencies = new Set<string>()
    const shadcnPrimitives = new Set<string>()
    const files: InstallFile[] = []
    for (const entry of items) {
      const selected = selectVariant(entry, style, base)
      selected.dependencies.forEach((dependency) => dependencies.add(dependency))
      selected.shadcnPrimitives.forEach((primitive) => shadcnPrimitives.add(primitive))
      for (const file of selected.files) {
        files.push({ target: `${TARGET_DIRS[file.target.dir]}/${file.target.file}`, source: file.source })
      }
    }
    return { key, dependencies: [...dependencies], shadcnPrimitives: [...shadcnPrimitives], files }
  })

  return item.shadcn ? variants : variants.slice(0, 1)
}

export async function readTemplate(source: string): Promise<string> {
  return (await readFile(path.join(templatesDirectory, source), 'utf8')).trim()
}

export const INSTALL_COPY = {
  th: {
    manual: 'ติดตั้งเอง',
    cliNote:
      'CLI เลือกไฟล์ให้ตาม style ที่ `init` บันทึกไว้: โปรเจกต์ที่มี `components.json` ของ shadcn/ui จะได้ไฟล์ที่ประกอบจาก primitives ของ shadcn (Base UI, Radix หรือ React Aria) นอกนั้นได้แบบ vanilla',
    installDependencies: 'ติดตั้ง dependencies',
    addPrimitives: 'เพิ่ม shadcn/ui primitives ที่คอมโพเนนต์ใช้',
    copyFiles: 'คัดลอกไฟล์ต่อไปนี้ลงในโปรเจกต์',
    updateImports:
      'แก้ import `@/lib/...` และ `@/hooks/...` ให้ตรงกับตำแหน่งไฟล์ในโปรเจกต์ (CLI แก้ให้อัตโนมัติ)',
    tokens: 'แบบ vanilla ต้องมี design tokens ใน global stylesheet ด้วย ดู [การปรับแต่ง](/docs/guides/customization#tokens-ที่-init-เพิ่ม)',
    source: 'ซอร์ส',
  },
  en: {
    manual: 'Manual',
    cliNote:
      'The CLI picks files based on the style `init` recorded: projects with a shadcn/ui `components.json` get files composed from shadcn primitives (Base UI, Radix, or React Aria); everything else gets the vanilla files.',
    installDependencies: 'Install the dependencies',
    addPrimitives: 'Add the shadcn/ui primitives the component uses',
    copyFiles: 'Copy these files into your project',
    updateImports:
      'Update the `@/lib/...` and `@/hooks/...` imports to match where the files live in your project (the CLI does this for you).',
    tokens: 'The vanilla style also needs the design tokens in your global stylesheet — see [Customization](/en/docs/guides/customization#tokens-inserted-by-init).',
    source: 'source',
  },
} as const

/** Markdown version of `<ComponentInstall />` for `.md` pages and llms-full.txt. */
export function renderInstallMarkdown(component: string, locale: DocsLocale, siteUrl: string): string {
  const copy = INSTALL_COPY[locale]
  const absolute = (markdown: string) => markdown.replace(/\]\(\//g, `](${siteUrl}/`)
  const sections = ['**CLI**', '', '```bash', `npx react-thaizip add ${component}`, '```', '', copy.cliNote]

  for (const variant of getInstallVariants(component)) {
    const steps = [`1. ${copy.installDependencies}: \`npm install ${variant.dependencies.join(' ')}\``]
    if (variant.shadcnPrimitives.length > 0) {
      steps.push(`1. ${copy.addPrimitives}: \`npx shadcn@latest add ${variant.shadcnPrimitives.join(' ')}\``)
    }
    steps.push(`1. ${copy.copyFiles}:`)
    for (const file of variant.files) {
      steps.push(`   - \`${file.target}\` — [${copy.source}](${TEMPLATES_URL}/${file.source})`)
    }
    steps.push(`1. ${copy.updateImports}`)
    if (variant.key === 'vanilla') steps.push(`1. ${absolute(copy.tokens)}`)
    sections.push('', `**${copy.manual} — ${VARIANT_LABELS[variant.key]}**`, '', ...steps)
  }

  return sections.join('\n')
}
