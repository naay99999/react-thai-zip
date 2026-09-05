'use client'

import type { Control, FieldPath, FieldValues, RegisterOptions } from 'react-hook-form'
import { Controller } from 'react-hook-form'
import type { ResolvedThaiAddress } from 'thaizip'
import { cn } from '@/lib/utils'
// Plain same-directory relative import (shadcn-style file reuse, not an npm import) — both
// files land in the same componentDir at scaffold time. This import relies on
// thai-address-cascade-select.tsx's filename and its `ThaiAddressCascadeSelect`/
// `ThaiAddressCascadeSelectTexts` export names, same coupling as thai-address-form.tsx's
// (this shadcn directory's own copy of that pairing — kept in lockstep separately from vanilla).
import { ThaiAddressCascadeSelect } from './thai-address-cascade-select'
import type { ThaiAddressCascadeSelectTexts } from './thai-address-cascade-select'

type AddressLocale = 'th' | 'en'

const DEFAULT_INVALID_TEXT: Record<AddressLocale, string> = {
  th: 'ข้อมูลไม่ถูกต้อง',
  en: 'This field is invalid.',
}

export type ThaiAddressFormFieldProps<TFieldValues extends FieldValues = FieldValues> = {
  control: Control<TFieldValues>
  name: FieldPath<TFieldValues>
  rules?: Omit<
    RegisterOptions<TFieldValues, FieldPath<TFieldValues>>,
    'valueAsNumber' | 'valueAsDate' | 'setValueAs' | 'disabled'
  >
  /** Drives the embedded cascade's option labels and default texts. Defaults to `'th'`. */
  locale?: AddressLocale
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
 * react-hook-form `Controller` wrapper around the shadcn-style `ThaiAddressCascadeSelect`.
 * See the vanilla `thai-address-form-field.tsx` for the full rationale — this file mirrors
 * it exactly except for which cascade-select sibling it imports.
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
            value={(field.value as ResolvedThaiAddress | null | undefined) ?? null}
            onValueChange={field.onChange}
            onBlur={field.onBlur}
            locale={locale}
            texts={texts}
            disabled={disabled}
            aria-invalid={fieldState.invalid || undefined}
            labelClassName={labelClassName}
            triggerClassName={triggerClassName}
            popupClassName={popupClassName}
            itemClassName={itemClassName}
          />
          {fieldState.error && (
            <p role="alert" className={cn('text-sm text-destructive', errorClassName)}>
              {fieldState.error.message || DEFAULT_INVALID_TEXT[locale ?? 'th']}
            </p>
          )}
        </div>
      )}
    />
  )
}
