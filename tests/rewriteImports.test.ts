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
