#!/usr/bin/env node
import { execSync } from 'node:child_process'
import { access, constants, mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import readline from 'node:readline/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const sandboxDir = path.join(root, 'apps/sandbox')
const force = process.argv.includes('--force')
const npmArg = process.argv.find((a) => a === '--npm' || a.startsWith('--npm='))
const npmTag = npmArg ? (npmArg.includes('=') ? npmArg.split('=')[1] : 'latest') : null

const docsPkg = JSON.parse(await readFile(path.join(root, 'apps/docs/package.json'), 'utf8'))
const pick = (name) => docsPkg.dependencies?.[name] ?? docsPkg.devDependencies?.[name]
const versions = {}
for (const name of ['next', 'react', 'react-dom', 'tailwindcss', '@tailwindcss/postcss']) {
  const range = pick(name)
  if (!range) throw new Error(`apps/docs/package.json is missing ${name}`)
  versions[name] = range
}

async function exists(p) {
  try {
    await access(p, constants.F_OK)
    return true
  } catch {
    return false
  }
}

if (await exists(sandboxDir)) {
  if (!force) {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout })
    const answer = await rl.question('apps/sandbox already exists. Wipe and regenerate? [y/N] ')
    rl.close()
    if (!/^(y|yes)$/i.test(answer.trim())) {
      console.log('Aborted.')
      process.exit(0)
    }
  }
  await rm(sandboxDir, { recursive: true, force: true })
}

await mkdir(path.join(sandboxDir, 'app'), { recursive: true })

const pkg = {
  name: 'react-thaizip-sandbox',
  private: true,
  scripts: {
    dev: 'next dev',
    build: 'next build',
    start: 'next start',
  },
  dependencies: {
    next: versions.next,
    react: versions.react,
    'react-dom': versions['react-dom'],
  },
  devDependencies: {
    '@tailwindcss/postcss': versions['@tailwindcss/postcss'],
    tailwindcss: versions.tailwindcss,
  },
}

const files = {
  'package.json': `${JSON.stringify(pkg, null, 2)}\n`,
  'next.config.mjs': `import path from 'node:path';
import { fileURLToPath } from 'node:url';

const dirname = path.dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const config = {
  reactStrictMode: true,
  // Pin the Turbopack/Tailwind workspace root to this app. The monorepo root
  // (react-thai-zip/) also has its own package-lock.json, so without this Next.js
  // infers that as the root and scans/watches the whole monorepo instead of just
  // this app — which corrupts Tailwind's generated CSS with garbled class names
  // picked up from unrelated binary/minified files outside this directory.
  turbopack: { root: dirname },
};
export default config;
`,
  'postcss.config.mjs': `const config = {\n  plugins: { '@tailwindcss/postcss': {} },\n};\nexport default config;\n`,
  'tsconfig.json': `${JSON.stringify(
    {
      compilerOptions: {
        target: 'ESNext',
        lib: ['dom', 'dom.iterable', 'esnext'],
        allowJs: true,
        skipLibCheck: true,
        strict: true,
        noEmit: true,
        esModuleInterop: true,
        module: 'esnext',
        moduleResolution: 'bundler',
        resolveJsonModule: true,
        isolatedModules: true,
        jsx: 'preserve',
        incremental: true,
        plugins: [{ name: 'next' }],
      },
      include: ['next-env.d.ts', '**/*.ts', '**/*.tsx', '.next/types/**/*.ts'],
      exclude: ['node_modules'],
    },
    null,
    2,
  )}\n`,
  '.gitignore': 'node_modules/\n.next/\nout/\n',
  'app/layout.tsx': `import type { ReactNode } from 'react'
import './global.css'

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="th">
      <body>{children}</body>
    </html>
  )
}
`,
  'app/page.tsx': `export default function Page() {
  return (
    <main className="mx-auto max-w-3xl p-8">
      <h1 className="text-2xl font-bold">react-thaizip sandbox</h1>
      <p className="mt-2 text-sm opacity-70">
        Run the CLI, then import the scaffolded components here to test them.
      </p>
    </main>
  )
}
`,
  'app/global.css': `@import "tailwindcss";
`,
}

for (const [file, content] of Object.entries(files)) {
  await writeFile(path.join(sandboxDir, file), content)
}

console.log(`Sandbox created at apps/sandbox (next ${versions.next}).`)
console.log('Installing dependencies...')
execSync('npm install', { cwd: sandboxDir, stdio: 'inherit' })

if (npmTag) {
  console.log(`
Next steps — exercise the published npm package end to end:

  1. cd apps/sandbox
  2. npx react-thaizip@${npmTag} init --yes
  3. npx react-thaizip@${npmTag} add autocomplete cascade-select address-form address-display address-form-field --yes
  4. npm run dev                        # http://localhost:3000

Note: this pulls react-thaizip@${npmTag} from the npm registry, not your local src/ changes.
apps/sandbox is gitignored — wipe and regenerate any time with \`npm run sandbox\`.
`)
} else {
  console.log(`
Next steps — exercise the CLI end to end:

  1. npm run build                      # repo root — builds dist/cli.js
  2. cd apps/sandbox
  3. node ../../dist/cli.js init --yes
  4. node ../../dist/cli.js add autocomplete cascade-select address-form address-display address-form-field --yes
  5. npm run dev                        # http://localhost:3000

Tip: run \`npm run sandbox -- --npm\` instead to test the published npm package via npx.
apps/sandbox is gitignored — wipe and regenerate any time with \`npm run sandbox\`.
`)
}