/**
 * FormField component - label + input wrapper with accessibility.
 * @module components/ui/Form/FormField
 */

import type { ReactNode } from "react";
import { Form } from "react-bootstrap";

export interface FormFieldProps {
  /** Field label text */
  label: string;
  /** Unique ID for the input (used for label association) */
  htmlFor: string;
  /** The form control element */
  children: ReactNode;
  /** Help text displayed below the input */
  helpText?: string;
  /** Whether the field is required */
  required?: boolean;
  /** Additional CSS classes for the wrapper */
  className?: string;
  /** Column size for Bootstrap grid */
  column?: string;
}

/**
 * FormField component that wraps an input with a label and optional help text.
 *
 * @example
 * ```tsx
 * <FormField label="Programme Title" htmlFor="title" required>
 *   <FormInput id="title" value={title} onChange={handleChange} />
 * </FormField>
 * ```
 */
export function FormField({
  label,
  htmlFor,
  children,
  helpText,
  required = false,
  className = "",
  column,
}: FormFieldProps) {
  const wrapperClass = column ? `col-${column}${className ? ` ${className}` : ""}` : className;

  return (
    <div className={wrapperClass || undefined}>
      <Form.Label htmlFor={htmlFor} className="form-label fw-semibold">
        {label}
        {required && <span className="text-danger ms-1">*</span>}
      </Form.Label>
      {children}
      {helpText && (
        <Form.Text className="text-muted" id={`${htmlFor}-help`}>
          {helpText}
        </Form.Text>
      )}
    </div>
  );
}

export default FormField;
