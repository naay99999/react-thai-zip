import { stripTypes, toJsExtension } from '../src/utils/stripTypes.js'

describe('stripTypes', () => {
  it('erases a type alias', () => {
    const code = `type AddressLocale = 'th' | 'en'\n\nexport const foo = 'bar'`
    const out = stripTypes(code, 'test.tsx')
    expect(out).not.toContain('AddressLocale')
    expect(out).toContain("foo = 'bar'")
  })

  it('erases typed function parameters and return annotations', () => {
    const code = `function getName(id: string): string {
  return 'test'
}`
    const out = stripTypes(code, 'test.ts')
    expect(out).toContain('function getName')
    expect(out).not.toContain(': string')
  })

  it('fully elides import type statements', () => {
    const code = `import type { Control } from 'react-hook-form'
import { useEffect } from 'react'

export function MyComponent() {
  useEffect(() => {}, [])
  return null
}`
    const out = stripTypes(code, 'test.tsx')
    expect(out).not.toContain('import type')
    expect(out).toContain("import { useEffect } from 'react'")
  })

  it('narrows mixed import { x, type Y } to import { x }', () => {
    const code = `import { Controller, type Control } from 'react-hook-form'

export function MyComponent() {
  return <Controller />
}`
    const out = stripTypes(code, 'test.tsx')
    expect(out).toContain('import { Controller }')
    expect(out).not.toContain('type Control')
  })

  it('removes as type casts', () => {
    const code = `const value = field.value as ResolvedThaiAddress | null`
    const out = stripTypes(code, 'test.tsx')
    expect(out).toContain('const value = field.value')
    expect(out).not.toContain('as ResolvedThaiAddress')
  })

  it('erases generic type parameters with extends constraint', () => {
    const code = `export function ThaiAddressFormField<TFieldValues extends FieldValues = FieldValues>({
  control,
}: ThaiAddressFormFieldProps<TFieldValues>) {
  return <div>{control}</div>
}`
    const out = stripTypes(code, 'test.tsx')
    // The function should still exist, but without the generic syntax
    expect(out).toContain('export function ThaiAddressFormField')
    // No leftover < or > from the generic
    expect(out).not.toContain('TFieldValues')
    expect(out).not.toContain('extends FieldValues')
  })

  it('preserves JSX in the output', () => {
    const code = `export function MyComponent() {
  return <div className="test"><address>Bangkok</address></div>
}`
    const out = stripTypes(code, 'test.tsx')
    expect(out).toContain('<div')
    expect(out).toContain('<address>')
    expect(out).toContain('</address>')
    expect(out).toContain('</div>')
    // Ensure JSX is not transpiled to React.createElement or jsx()
    expect(out).not.toMatch(/createElement|jsx|jsxs/)
  })

  it('preserves comments in the output', () => {
    const code = `// This is a comment
export const foo = 'bar' // inline comment`
    const out = stripTypes(code, 'test.ts')
    expect(out).toContain('// This is a comment')
    expect(out).toContain('// inline comment')
  })

  it('preserves string literals with non-ASCII characters', () => {
    const code = `const label = 'จังหวัด' // Thai text
const name = "ซอย"`
    const out = stripTypes(code, 'test.tsx')
    expect(out).toContain('จังหวัด')
    expect(out).toContain('ซอย')
  })

  it('preserves import/export specifiers exactly as authored', () => {
    const code = `import { cn } from '@/lib/utils'
import { useThaiAddressIndex } from '@/hooks/use-thai-address-index'
export { ThaiAddressAutocomplete } from './thai-address-autocomplete'

export function MyComponent() {
  const className = cn('test')
  const index = useThaiAddressIndex()
  return <div className={className}>{index}</div>
}`
    const out = stripTypes(code, 'test.tsx')
    expect(out).toContain("from '@/lib/utils'")
    expect(out).toContain("from '@/hooks/use-thai-address-index'")
    expect(out).toContain("from './thai-address-autocomplete'")
  })

  it('handles complex type annotations on object properties', () => {
    const code = `type ThaiAddressFormFieldProps<T extends FieldValues = FieldValues> = {
  control: Control<T>
  name: FieldPath<T>
  rules?: RegisterOptions<T, FieldPath<T>>
}`
    const out = stripTypes(code, 'test.tsx')
    expect(out).not.toContain('type ThaiAddressFormFieldProps')
    expect(out).not.toContain('Control<T>')
    expect(out).not.toContain('FieldPath')
  })

  it('handles Omit and other utility types', () => {
    const code = `type MyProps = Omit<
  RegisterOptions<TFieldValues, FieldPath<TFieldValues>>,
  'valueAsNumber' | 'valueAsDate' | 'setValueAs' | 'disabled'
>`
    const out = stripTypes(code, 'test.tsx')
    expect(out).not.toContain('type MyProps')
    expect(out).not.toContain('Omit')
  })
})

describe('toJsExtension', () => {
  it('converts .tsx to .jsx', () => {
    expect(toJsExtension('thai-address-autocomplete.tsx')).toBe('thai-address-autocomplete.jsx')
  })

  it('converts .ts to .js', () => {
    expect(toJsExtension('utils.ts')).toBe('utils.js')
  })

  it('passes through non-TS filenames unchanged', () => {
    expect(toJsExtension('package.json')).toBe('package.json')
    expect(toJsExtension('README.md')).toBe('README.md')
    expect(toJsExtension('style.css')).toBe('style.css')
  })

  it('handles files with multiple dots in the name', () => {
    expect(toJsExtension('config.test.ts')).toBe('config.test.js')
    expect(toJsExtension('component.stories.tsx')).toBe('component.stories.jsx')
  })
})
