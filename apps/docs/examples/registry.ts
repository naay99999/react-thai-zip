import type { ComponentType } from 'react'
import AddressDisplayDemo from './address-display-demo'
import AddressDisplayEmpty from './address-display-empty'
import AddressDisplayEmptyEn from './address-display-empty-en'
import AddressDisplayEn from './address-display-en'
import AddressDisplayMinimal from './address-display-minimal'
import AddressDisplayMinimalEn from './address-display-minimal-en'
import AddressDisplayMultiLine from './address-display-multi-line'
import AddressDisplayMultiLineEn from './address-display-multi-line-en'
import AddressDisplayStyled from './address-display-styled'
import AddressDisplayStyledEn from './address-display-styled-en'
import AddressFormControlled from './address-form-controlled'
import AddressFormControlledEn from './address-form-controlled-en'
import AddressFormDemo from './address-form-demo'
import AddressFormDisabled from './address-form-disabled'
import AddressFormEn from './address-form-en'
import AddressFormFieldDemo from './address-form-field-demo'
import AddressFormFieldDisabled from './address-form-field-disabled'
import AddressFormFieldEn from './address-form-field-en'
import AddressFormFieldFull from './address-form-field-full'
import AddressFormFieldFullEn from './address-form-field-full-en'
import AddressFormFieldValidation from './address-form-field-validation'
import AddressFormFieldValidationEn from './address-form-field-validation-en'
import AddressFormInvalid from './address-form-invalid'
import AddressFormSubmit from './address-form-submit'
import AddressFormSubmitEn from './address-form-submit-en'
import AddressFormTexts from './address-form-texts'
import AddressFormTextsEn from './address-form-texts-en'
import AutocompleteControlled from './autocomplete-controlled'
import AutocompleteControlledEn from './autocomplete-controlled-en'
import AutocompleteDemo from './autocomplete-demo'
import AutocompleteDisabled from './autocomplete-disabled'
import AutocompleteEn from './autocomplete-en'
import AutocompleteInvalid from './autocomplete-invalid'
import AutocompleteLabel from './autocomplete-label'
import AutocompleteLabelEn from './autocomplete-label-en'
import AutocompleteStyled from './autocomplete-styled'
import AutocompleteStyledEn from './autocomplete-styled-en'
import AutocompleteTexts from './autocomplete-texts'
import AutocompleteTextsEn from './autocomplete-texts-en'
import CascadeSelectControlled from './cascade-select-controlled'
import CascadeSelectControlledEn from './cascade-select-controlled-en'
import CascadeSelectDemo from './cascade-select-demo'
import CascadeSelectDisabled from './cascade-select-disabled'
import CascadeSelectEn from './cascade-select-en'
import CascadeSelectInvalid from './cascade-select-invalid'
import CascadeSelectTexts from './cascade-select-texts'
import CascadeSelectTextsEn from './cascade-select-texts-en'
import FormAutocomplete from './form-autocomplete'
import FormAutocompleteEn from './form-autocomplete-en'
import FormCascadeSelect from './form-cascade-select'
import FormCascadeSelectEn from './form-cascade-select-en'

/**
 * Every example rendered by `<ComponentPreview name="..." />`. The key is the
 * example's file name in this directory; its source is what the preview's code block and
 * the page markdown show.
 */
export const examples: Record<string, ComponentType> = {
  'address-display-demo': AddressDisplayDemo,
  'address-display-empty': AddressDisplayEmpty,
  'address-display-empty-en': AddressDisplayEmptyEn,
  'address-display-en': AddressDisplayEn,
  'address-display-minimal': AddressDisplayMinimal,
  'address-display-minimal-en': AddressDisplayMinimalEn,
  'address-display-multi-line': AddressDisplayMultiLine,
  'address-display-multi-line-en': AddressDisplayMultiLineEn,
  'address-display-styled': AddressDisplayStyled,
  'address-display-styled-en': AddressDisplayStyledEn,
  'address-form-controlled': AddressFormControlled,
  'address-form-controlled-en': AddressFormControlledEn,
  'address-form-demo': AddressFormDemo,
  'address-form-disabled': AddressFormDisabled,
  'address-form-en': AddressFormEn,
  'address-form-field-demo': AddressFormFieldDemo,
  'address-form-field-disabled': AddressFormFieldDisabled,
  'address-form-field-en': AddressFormFieldEn,
  'address-form-field-full': AddressFormFieldFull,
  'address-form-field-full-en': AddressFormFieldFullEn,
  'address-form-field-validation': AddressFormFieldValidation,
  'address-form-field-validation-en': AddressFormFieldValidationEn,
  'address-form-invalid': AddressFormInvalid,
  'address-form-submit': AddressFormSubmit,
  'address-form-submit-en': AddressFormSubmitEn,
  'address-form-texts': AddressFormTexts,
  'address-form-texts-en': AddressFormTextsEn,
  'autocomplete-controlled': AutocompleteControlled,
  'autocomplete-controlled-en': AutocompleteControlledEn,
  'autocomplete-demo': AutocompleteDemo,
  'autocomplete-disabled': AutocompleteDisabled,
  'autocomplete-en': AutocompleteEn,
  'autocomplete-invalid': AutocompleteInvalid,
  'autocomplete-label': AutocompleteLabel,
  'autocomplete-label-en': AutocompleteLabelEn,
  'autocomplete-styled': AutocompleteStyled,
  'autocomplete-styled-en': AutocompleteStyledEn,
  'autocomplete-texts': AutocompleteTexts,
  'autocomplete-texts-en': AutocompleteTextsEn,
  'cascade-select-controlled': CascadeSelectControlled,
  'cascade-select-controlled-en': CascadeSelectControlledEn,
  'cascade-select-demo': CascadeSelectDemo,
  'cascade-select-disabled': CascadeSelectDisabled,
  'cascade-select-en': CascadeSelectEn,
  'cascade-select-invalid': CascadeSelectInvalid,
  'cascade-select-texts': CascadeSelectTexts,
  'cascade-select-texts-en': CascadeSelectTextsEn,
  'form-autocomplete': FormAutocomplete,
  'form-autocomplete-en': FormAutocompleteEn,
  'form-cascade-select': FormCascadeSelect,
  'form-cascade-select-en': FormCascadeSelectEn,
}
