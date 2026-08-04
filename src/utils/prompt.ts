import prompts from 'prompts'

/**
 * Confirmation prompt shared by `init` and `add`. When `yes` is true, skips
 * the interactive prompt entirely and returns `initial` — this is what makes
 * `--yes` a real non-interactive mode rather than just pre-filling answers.
 */
export async function confirm(message: string, initial: boolean, yes?: boolean): Promise<boolean> {
  if (yes) return initial

  const response = await prompts({
    type: 'confirm',
    name: 'value',
    message,
    initial,
  })

  return Boolean(response.value)
}
