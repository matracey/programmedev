/**
 * AccordionControls component.
 * Provides expand/collapse all buttons for accordion.
 * @module components/ui/Accordion/AccordionControls
 */

import { useContext } from "react";
import { Button } from "react-bootstrap";

import { Icon } from "../Icon";
import { AccordionContext } from "./Accordion";

export interface AccordionControlsProps {
  /** Accordion ID (optional - for aria relationship) */
  accordionId?: string;
  /** Callback to expand all items (if not using context) */
  onExpandAll?: () => void;
  /** Callback to collapse all items (if not using context) */
  onCollapseAll?: () => void;
  /** Additional CSS classes */
  className?: string;
}

/**
 * AccordionControls component that provides expand/collapse all functionality.
 * Can be used with or without an Accordion context.
 *
 * @example
 * ```tsx
 * // Inside an Accordion (uses context)
 * <Accordion id="my-accordion">
 *   <AccordionControls />
 *   <AccordionItem id="1" title="Item 1">Content</AccordionItem>
 * </Accordion>
 *
 * // Outside an Accordion (uses callbacks)
 * <AccordionControls
 *   accordionId="my-accordion"
 *   onExpandAll={() => setExpanded(allIds)}
 *   onCollapseAll={() => setExpanded(new Set())}
 * />
 * <Accordion id="my-accordion">...</Accordion>
 * ```
 */
export function AccordionControls({
  accordionId,
  onExpandAll,
  onCollapseAll,
  className = "",
}: AccordionControlsProps) {
  const context = useContext(AccordionContext);

  // Use context if available, otherwise use direct callbacks
  const handleExpandAll = onExpandAll ?? context?.expandAll ?? (() => {});
  const handleCollapseAll = onCollapseAll ?? context?.collapseAll ?? (() => {});

  return (
    <div className={`d-flex justify-content-end gap-2 mb-2${className ? ` ${className}` : ""}`}>
      <Button
        variant="link"
        size="sm"
        className="p-0 m-0 text-decoration-none"
        onClick={handleExpandAll}
        data-testid="accordion-expand-all"
        aria-controls={accordionId}
      >
        <Icon name="arrows-out-simple" className="me-1" aria-hidden />
        Expand all
      </Button>
      <span className="text-secondary opacity-50">|</span>
      <Button
        variant="link"
        size="sm"
        className="p-0 m-0 text-decoration-none"
        onClick={handleCollapseAll}
        data-testid="accordion-collapse-all"
        aria-controls={accordionId}
      >
        <Icon name="arrows-in-simple" className="me-1" aria-hidden />
        Collapse all
      </Button>
    </div>
  );
}

export default AccordionControls;
