import type { ReactNode } from 'react'
import type { ResolvedThaiAddress } from 'thaizip'
import './demos.css'

export type DemoLocale = 'th' | 'en'

export type DemoFrameProps = {
  title: string
  description: string
  children: ReactNode
}

export function DemoFrame({ title, description, children }: DemoFrameProps) {
  return (
    <section className="tz-demo" aria-label={title}>
      <div className="tz-demo-copy">
        <strong>{title}</strong>
        <p>{description}</p>
      </div>
      {children}
    </section>
  )
}

export function DemoOutput({
  label,
  value,
}: {
  label: string
  value: ResolvedThaiAddress | Record<string, FormDataEntryValue> | null
}) {
  return (
    <div className="tz-demo-output" aria-live="polite">
      <strong>{label}</strong>
      <pre>{value === null ? 'null' : JSON.stringify(value, null, 2)}</pre>
    </div>
  )
}
