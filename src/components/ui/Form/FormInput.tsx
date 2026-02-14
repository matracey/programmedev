/**
 * FormInput component - text/number input with validation support.
 * @module components/ui/Form/FormInput
 */

import type { ChangeEvent, HTMLInputTypeAttribute } from "react";
import { Form, InputGroup } from "react-bootstrap";

export interface FormInputProps {
  /** Unique ID for the input */
  id: string;
  /** Current value */
  value: string | number;
  /** Change handler */
  onChange: (value: string) => void;
  /** Input type */
  type?: HTMLInputTypeAttribute;
  /** Placeholder text */
  placeholder?: string;
  /** Whether the field is disabled */
  disabled?: boolean;
  /** Whether the field is required */
  required?: boolean;
  /** Whether the field is read-only */
  readOnly?: boolean;
  /** Minimum value (for number inputs) */
  min?: number;
  /** Maximum value (for number inputs) */
  max?: number;
  /** Step value (for number inputs) */
  step?: number;
  /** Size variant */
  size?: "sm" | "lg";
  /** Suffix text (e.g., "credits") */
  suffix?: string;
  /** Prefix text */
  prefix?: string;
  /** Additional CSS classes */
  className?: string;
  /** Test ID */
  "data-testid"?: string;
  /** Aria describedby ID */
  "aria-describedby"?: string;
  /** Aria label */
  "aria-label"?: string;
}

/**
 * FormInput component for text and number inputs.
 *
 * @example
 * ```tsx
 * // Text input
 * <FormInput
 *   id="title"
 *   value={title}
 *   onChange={setTitle}
 *   placeholder="Enter programme title"
 * />
 *
 * // Number input with suffix
 * <FormInput
 *   id="credits"
 *   type="number"
 *   value={credits}
 *   onChange={(v) => setCredits(Number(v))}
 *   min={0}
 *   step={5}
 *   suffix="cr"
 * />
 * ```
 */
export function FormInput({
  id,
  value,
  onChange,
  type = "text",
  placeholder,
  disabled = false,
  required = false,
  readOnly = false,
  min,
  max,
  step,
  size,
  suffix,
  prefix,
  className = "",
  "data-testid": testId,
  "aria-describedby": ariaDescribedby,
  "aria-label": ariaLabel,
}: FormInputProps) {
  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    onChange(e.target.value);
  };

  const input = (
    <Form.Control
      id={id}
      type={type}
      value={value}
      onChange={handleChange}
      placeholder={placeholder}
      disabled={disabled}
      required={required}
      readOnly={readOnly}
      min={min}
      max={max}
      step={step}
      size={size}
      className={!suffix && !prefix ? className || undefined : undefined}
      data-testid={testId}
      aria-describedby={ariaDescribedby}
      aria-label={ariaLabel}
      aria-required={required}
    />
  );

  if (suffix || prefix) {
    return (
      <InputGroup size={size} className={className || undefined}>
        {prefix && <InputGroup.Text>{prefix}</InputGroup.Text>}
        {input}
        {suffix && <InputGroup.Text>{suffix}</InputGroup.Text>}
      </InputGroup>
    );
  }

  return input;
}

export default FormInput;
