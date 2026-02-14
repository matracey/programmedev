/**
 * Icon component - wrapper for Phosphor icons.
 * Provides a consistent interface for rendering icons with proper accessibility.
 * @module components/ui/Icon
 */

import React, { type HTMLAttributes } from "react";

export interface IconProps extends HTMLAttributes<HTMLElement> {
  /** The Phosphor icon name (without 'ph-' prefix), e.g., "plus", "trash", "warning" */
  name: string;
  /** Icon weight variant */
  weight?: "regular" | "bold" | "light" | "thin" | "fill" | "duotone";
  /** Additional CSS classes */
  className?: string;
  /** Whether the icon is decorative (hidden from screen readers). Defaults to true. */
  decorative?: boolean;
  /** Accessible label for non-decorative icons */
  label?: string;
}

/**
 * Icon component that renders Phosphor icons.
 *
 * @example
 * ```tsx
 * // Decorative icon (default)
 * <Icon name="plus" />
 *
 * // Bold weight
 * <Icon name="trash" weight="bold" />
 *
 * // Accessible icon with label
 * <Icon name="warning" decorative={false} label="Warning" />
 * ```
 */
export function Icon({
  name,
  weight = "regular",
  className = "",
  decorative = true,
  label,
  ...props
}: IconProps) {
  const weightClass = weight === "regular" ? "ph" : `ph-${weight}`;
  const iconClass = `${weightClass} ph-${name}${className ? ` ${className}` : ""}`;

  return (
    <i
      className={iconClass}
      aria-hidden={decorative}
      aria-label={!decorative ? label : undefined}
      role={!decorative ? "img" : undefined}
      {...props}
    />
  );
}

export default Icon;
