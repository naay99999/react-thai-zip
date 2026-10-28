import {
  CodeBlockTab,
  CodeBlockTabs,
  CodeBlockTabsList,
  CodeBlockTabsTrigger,
} from '@fumadocs/base-ui/components/codeblock'
import { ServerCodeBlock } from '@fumadocs/base-ui/components/codeblock.rsc'
import { toPackageManager, PACKAGE_MANAGERS } from '~/lib/package-manager'

/**
 * An npm command shown as npm / pnpm / yarn / bun tabs. Shares its persisted
 * tab group with the ```npm code blocks in MDX (remarkNpm in lib/source.ts),
 * so picking a package manager once switches every command on the site.
 */
export function PackageManagerCommand({ command }: { command: string }) {
  return (
    <CodeBlockTabs defaultValue="npm" groupId="package-manager" persist>
      <CodeBlockTabsList>
        {PACKAGE_MANAGERS.map((manager) => (
          <CodeBlockTabsTrigger key={manager} value={manager}>
            {manager}
          </CodeBlockTabsTrigger>
        ))}
      </CodeBlockTabsList>
      {PACKAGE_MANAGERS.map((manager) => (
        <CodeBlockTab key={manager} value={manager}>
          <ServerCodeBlock lang="bash" code={toPackageManager(command, manager)} />
        </CodeBlockTab>
      ))}
    </CodeBlockTabs>
  )
}
