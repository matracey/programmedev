/**
 * SectionCard component - standard Bootstrap card wrapper with title and icon.
 * Used for grouping related content in workflow steps.
 * @module components/ui/SectionCard
 */

import type { ReactNode } from "react";
import { Card } from "react-bootstrap";

import { Icon, type IconProps } from "./Icon";

export interface SectionCardProps {
  /** Card title text */
  title: string;
  /** Phosphor icon name for the title */
  icon?: string;
  /** Icon weight variant */
  iconWeight?: IconProps["weight"];
  /** Card body content */
  children: ReactNode;
  /** Optional action buttons to render in the card header */
  actions?: ReactNode;
  /** Additional CSS classes for the card */
  className?: string;
  /** ID for the card heading (for aria-labelledby) */
  headingId?: string;
  /** Test ID for the card */
  "data-testid"?: string;
}

/**
 * SectionCard component that wraps content in a Bootstrap card with a title.
 *
 * @example
 * ```tsx
 * <SectionCard
 *   title="Programme Identity"
 *   icon="identification-card"
 *   actions={<Button size="sm">Add</Button>}
 * >
 *   <Form>...</Form>
 * </SectionCard>
 * ```
 */
export function SectionCard({
  title,
  icon,
  iconWeight = "regular",
  children,
  actions,
  className = "",
  headingId,
  "data-testid": testId,
}: SectionCardProps) {
  return (
    <Card className={`shadow-sm${className ? ` ${className}` : ""}`} data-testid={testId}>
      <Card.Body>
        <div className="d-flex justify-content-between align-items-center mb-3">
          <Card.Title as="h5" className="mb-0" id={headingId}>
            {icon && <Icon name={icon} weight={iconWeight} className="me-2" />}
            {title}
          </Card.Title>
          {actions && <div className="card-actions">{actions}</div>}
        </div>
        {children}
      </Card.Body>
    </Card>
  );
}

export default SectionCard;
