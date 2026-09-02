'use client'

import type { Control, FieldPath, FieldValues, RegisterOptions } from 'react-hook-form'
import { Controller } from 'react-hook-form'
import type { ResolvedThaiAddress } from 'thaizip'
import { cn } from '@/lib/utils'
// Plain same-directory relative import (shadcn-style file reuse, not an npm import) — both
// files land in the same componentDir at scaffold time. This import relies on
// thai-address-cascade-select.tsx's filename and its `ThaiAddressCascadeSelect`/
// `ThaiAddressCascadeSelectTexts` export names, same coupling as thai-address-form.tsx's.
import { ThaiAddressCascadeSelect } from './thai-address-cascade-select'
import type { ThaiAddressCascadeSelectTexts } from './thai-address-cascade-select'

export type ThaiAddressFormFieldProps<TFieldValues extends FieldValues = FieldValues> = {
  control: Control<TFieldValues>
  name: FieldPath<TFieldValues>
  /**
   * Forwarded to react-hook-form's `Controller`. Omits the value-transform options (they only
   * make sense for primitive-valued fields — this field's value is always a
   * `ResolvedThaiAddress | null`) and `disabled`, which this component exposes as its own prop
   * instead so it can be forwarded to the embedded cascade's triggers.
   */
  rules?: Omit<
    RegisterOptions<TFieldValues, FieldPath<TFieldValues>>,
    'valueAsNumber' | 'valueAsDate' | 'setValueAs' | 'disabled'
  >
  /** Drives the embedded cascade's option labels and default texts. Defaults to `'th'`. */
  locale?: 'th' | 'en'
  texts?: Partial<ThaiAddressCascadeSelectTexts>
  disabled?: boolean
  /** Applied to the wrapper `<div>` around the cascade and its validation message. */
  className?: string
  labelClassName?: string
  triggerClassName?: string
  popupClassName?: string
  itemClassName?: string
  /** Class name for the `role="alert"` validation message rendered below the cascade. */
  errorClassName?: string
}

/**
 * react-hook-form `Controller` wrapper around `ThaiAddressCascadeSelect`.
 *
 * Deliberately different shape from `ThaiAddressForm`/`ThaiAddressAutocomplete`/
 * `ThaiAddressCascadeSelect`, which all expose a plain `value`/`defaultValue`/`onValueChange`
 * pair and (when `name` is set) render hidden inputs for native `<form>` submission. This
 * component instead hands its field entirely to react-hook-form: pass `control`/`name`/`rules`
 * the same way you would to RHF's own `useController`, and read the result via RHF's
 * `handleSubmit` — no hidden inputs are rendered here.
 */
export function ThaiAddressFormField<TFieldValues extends FieldValues = FieldValues>({
  control,
  name,
  rules,
  locale,
  texts,
  disabled,
  className,
  labelClassName,
  triggerClassName,
  popupClassName,
  itemClassName,
  errorClassName,
}: ThaiAddressFormFieldProps<TFieldValues>) {
  return (
    <Controller
      control={control}
      name={name}
      rules={rules}
      render={({ field, fieldState }) => (
        <div className={className}>
          <ThaiAddressCascadeSelect
            ref={field.ref}
            // RHF's `FieldPath<TFieldValues>` doesn't statically constrain the value type at
            // that path without a much heavier generic helper (out of scope here) — this
            // component is only meant to be pointed at a `ResolvedThaiAddress | null` field, and
            // this cast documents that assumption.
            value={field.value as ResolvedThaiAddress | null}
            onValueChange={field.onChange}
            onBlur={field.onBlur}
            name={field.name}
            locale={locale}
            texts={texts}
            disabled={disabled}
            aria-invalid={fieldState.invalid || undefined}
            labelClassName={labelClassName}
            triggerClassName={triggerClassName}
            popupClassName={popupClassName}
            itemClassName={itemClassName}
          />
          {fieldState.error?.message && (
            <p role="alert" className={cn('text-sm text-destructive', errorClassName)}>
              {fieldState.error.message}
            </p>
          )}
        </div>
      )}
    />
  )
}
