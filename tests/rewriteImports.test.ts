import { rewriteTemplateImports } from '../src/utils/rewriteImports.js'
import type { ThaiZipConfig } from '../src/utils/config.js'

const baseV2Config: ThaiZipConfig = {
  typescript: true,
  componentDir: 'app/components',
  libDir: 'lib',
  hooksDir: 'hooks',
  packageManager: 'npm',
  tailwind: { version: 4, css: 'app/globals.css' },
  registryVersion: '0.1.0',
}

describe('rewriteTemplateImports', () => {
  it('rewrites @/lib/* to a relative path from the destination directory', () => {
    const out = rewriteTemplateImports("import { cn } from '@/lib/utils'", '/p/app/components', baseV2Config, '/p')
    expect(out).toBe("import { cn } from '../../lib/utils'")
  })

  it('rewrites @/hooks/* to a relative path from the destination directory', () => {
    const out = rewriteTemplateImports(
      "import { useThaiAddressIndex } from '@/hooks/use-thai-address-index'",
      '/p/app/components',
      baseV2Config,
      '/p',
    )
    expect(out).toBe("import { useThaiAddressIndex } from '../../hooks/use-thai-address-index'")
  })

  it('handles same-directory targets', () => {
    const config = { ...baseV2Config, componentDir: 'src', libDir: 'src', hooksDir: 'src' }
    const out = rewriteTemplateImports("import { cn } from '@/lib/utils'", '/p/src', config, '/p')
    expect(out).toBe("import { cn } from './utils'")
  })

  it('rewrites multiple occurrences in the same file, preserving quote style', () => {
    const content = `import { cn } from '@/lib/utils'\nimport { useThaiAddressIndex } from "@/hooks/use-thai-address-index"\n`
    const out = rewriteTemplateImports(content, '/p/app/components', baseV2Config, '/p')
    expect(out).toContain("from '../../lib/utils'")
    expect(out).toContain('from "../../hooks/use-thai-address-index"')
    expect(out).not.toContain('@/')
  })

  it('leaves unrelated import specifiers untouched', () => {
    const content = `import * as React from 'react'\nimport { Combobox } from '@base-ui/react/combobox'\n`
    const out = rewriteTemplateImports(content, '/p/app/components', baseV2Config, '/p')
    expect(out).toBe(content)
  })

  it('rewrites nested rest paths under @/lib and @/hooks', () => {
    const out = rewriteTemplateImports("import x from '@/lib/nested/thing'", '/p/app/components', baseV2Config, '/p')
    expect(out).toBe("import x from '../../lib/nested/thing'")
  })
})

describe('rewriteTemplateImports string-literal safety', () => {
  // S2: the rewritten specifier used to be spliced between the original quote
  // characters unescaped, so a quote inside libDir/hooksDir broke out of the
  // string literal and turned the scaffolded component into an injection sink.
  // The whole point is that the emitted specifier stays ONE string literal:
  // the injected text may still appear, but only as inert characters inside
  // it. These patterns match a well-formed literal, so the pre-fix output
  // (which closed the literal early and continued with real statements) fails
  // them while the escaped output passes.
  const singleQuotedLiteral = /^'(?:[^'\\]|\\.)*'$/
  const doubleQuotedLiteral = /^"(?:[^"\\]|\\.)*"$/

  it('escapes a quote in the computed path instead of terminating the string literal', () => {
    const config = { ...baseV2Config, libDir: "lib'; require('child_process').execSync('touch /tmp/pwned'); '" }
    const out = rewriteTemplateImports("import { cn } from '@/lib/utils'", '/p/app/components', config, '/p')

    expect(out.replace('import { cn } from ', '')).toMatch(singleQuotedLiteral)
  })

  it('escapes a double quote when the template used double quotes', () => {
    const config = { ...baseV2Config, libDir: 'lib"; evil()' }
    const out = rewriteTemplateImports('import { cn } from "@/lib/utils"', '/p/app/components', config, '/p')

    expect(out.replace('import { cn } from ', '')).toMatch(doubleQuotedLiteral)
  })

  it('escapes backslashes so they cannot form an escape sequence of their own', () => {
    const config = { ...baseV2Config, libDir: 'li\\b' }
    const out = rewriteTemplateImports("import { cn } from '@/lib/utils'", '/p/app/components', config, '/p')

    expect(out).toContain('\\\\')
  })

  it('escapes newlines so an injected line cannot become its own statement', () => {
    const config = { ...baseV2Config, libDir: "lib'\nevil()\n//" }
    const out = rewriteTemplateImports("import { cn } from '@/lib/utils'", '/p/app/components', config, '/p')

    expect(out.split('\n')).toHaveLength(1)
  })

  it('refuses to emit a specifier that escapes the project root', () => {
    expect(() =>
      rewriteTemplateImports("import x from '@/lib/../../../../etc/evil'", '/p/app/components', baseV2Config, '/p'),
    ).toThrow(/outside the project/i)
  })
})
