/**
 * FormSelect component - select input with options.
 * @module components/ui/Form/FormSelect
 */

import type { ChangeEvent } from "react";
import { Form } from "react-bootstrap";

export interface SelectOption {
  /** Option value */
  value: string;
  /** Option display label */
  label: string;
  /** Whether the option is disabled */
  disabled?: boolean;
}

export interface FormSelectProps {
  /** Unique ID for the select */
  id: string;
  /** Current value */
  value: string;
  /** Change handler */
  onChange: (value: string) => void;
  /** Select options */
  options: SelectOption[];
  /** Placeholder option text */
  placeholder?: string;
  /** Whether the field is disabled */
  disabled?: boolean;
  /** Whether the field is required */
  required?: boolean;
  /** Size variant */
  size?: "sm" | "lg";
  /** Additional CSS classes */
  className?: string;
  /** Test ID */
  "data-testid"?: string;
  /** Aria describedby ID */
  "aria-describedby"?: string;
}

/**
 * FormSelect component for dropdown selection.
 *
 * @example
 * ```tsx
 * <FormSelect
 *   id="award-type"
 *   value={awardType}
 *   onChange={setAwardType}
 *   options={[
 *     { value: "bachelor", label: "Bachelor Degree" },
 *     { value: "master", label: "Master Degree" },
 *   ]}
 *   placeholder="Select an award type"
 * />
 * ```
 */
export function FormSelect({
  id,
  value,
  onChange,
  options,
  placeholder,
  disabled = false,
  required = false,
  size,
  className = "",
  "data-testid": testId,
  "aria-describedby": ariaDescribedby,
}: FormSelectProps) {
  const handleChange = (e: ChangeEvent<HTMLSelectElement>) => {
    onChange(e.target.value);
  };

  return (
    <Form.Select
      id={id}
      value={value}
      onChange={handleChange}
      disabled={disabled}
      required={required}
      size={size}
      className={className || undefined}
      data-testid={testId}
      aria-describedby={ariaDescribedby}
      aria-required={required}
    >
      {placeholder && (
        <option value="" disabled>
          {placeholder}
        </option>
      )}
      {options.map((option) => (
        <option key={option.value} value={option.value} disabled={option.disabled}>
          {option.label}
        </option>
      ))}
    </Form.Select>
  );
}

export default FormSelect;
