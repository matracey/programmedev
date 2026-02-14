/**
 * Accordion container component.
 * Wraps accordion items and manages expansion state.
 * @module components/ui/Accordion/Accordion
 */

import type { ReactNode } from "react";
import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { Accordion as BsAccordion } from "react-bootstrap";

export interface AccordionContextValue {
  /** Set of currently expanded item keys */
  expandedKeys: Set<string>;
  /** Toggle expansion state of an item */
  toggleItem: (key: string) => void;
  /** Expand all items */
  expandAll: () => void;
  /** Collapse all items */
  collapseAll: () => void;
  /** Register an item key */
  registerItem: (key: string) => void;
}

const AccordionContext = createContext<AccordionContextValue | null>(null);

// Export context for use in AccordionControls
export { AccordionContext };

/**
 * Hook to access accordion context.
 * Must be used within an Accordion component.
 */
export function useAccordion(): AccordionContextValue {
  const context = useContext(AccordionContext);
  if (!context) {
    throw new Error("useAccordion must be used within an Accordion component");
  }
  return context;
}

export interface AccordionProps {
  /** Unique ID for the accordion */
  id: string;
  /** Accordion items */
  children: ReactNode;
  /** Keys of items that should be expanded by default */
  defaultExpandedKeys?: string[];
  /** Additional CSS classes */
  className?: string;
  /** Test ID for the accordion */
  "data-testid"?: string;
  /** Aria labelledby ID */
  "aria-labelledby"?: string;
}

/**
 * Accordion container component.
 *
 * @example
 * ```tsx
 * <Accordion id="my-accordion" defaultExpandedKeys={["item-1"]}>
 *   <AccordionItem eventKey="item-1" title="First Item">
 *     Content for first item
 *   </AccordionItem>
 *   <AccordionItem eventKey="item-2" title="Second Item">
 *     Content for second item
 *   </AccordionItem>
 * </Accordion>
 * ```
 */
export function Accordion({
  id,
  children,
  defaultExpandedKeys = [],
  className = "",
  "data-testid": testId,
  "aria-labelledby": ariaLabelledby,
}: AccordionProps) {
  // Track whether the initial defaultExpandedKeys was empty
  const initialDefaultWasEmpty = useRef(defaultExpandedKeys.length === 0);

  // Start with defaultExpandedKeys if provided on initial render
  const [expandedKeys, setExpandedKeys] = useState<Set<string>>(() => new Set(defaultExpandedKeys));
  const [registeredKeys, setRegisteredKeys] = useState<Set<string>>(new Set());

  // When defaultExpandedKeys changes from empty to non-empty AFTER initial mount
  // (items added dynamically), auto-expand those items.
  useEffect(() => {
    if (initialDefaultWasEmpty.current && defaultExpandedKeys.length > 0) {
      setExpandedKeys(new Set(defaultExpandedKeys));
      initialDefaultWasEmpty.current = false;
    }
  }, [defaultExpandedKeys]);

  const toggleItem = useCallback((key: string) => {
    setExpandedKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  }, []);

  const expandAll = useCallback(() => {
    setExpandedKeys(new Set(registeredKeys));
  }, [registeredKeys]);

  const collapseAll = useCallback(() => {
    setExpandedKeys(new Set());
  }, []);

  const registerItem = useCallback((key: string) => {
    setRegisteredKeys((prev) => {
      if (prev.has(key)) {
        return prev;
      }
      const next = new Set(prev);
      next.add(key);
      return next;
    });
  }, []);

  const contextValue: AccordionContextValue = {
    expandedKeys,
    toggleItem,
    expandAll,
    collapseAll,
    registerItem,
  };

  // Convert expandedKeys to activeKey format for Bootstrap
  const activeKey = Array.from(expandedKeys);

  return (
    <AccordionContext.Provider value={contextValue}>
      <BsAccordion
        id={id}
        activeKey={activeKey}
        alwaysOpen
        className={`bg-body${className ? ` ${className}` : ""}`}
        data-testid={testId}
        aria-labelledby={ariaLabelledby}
      >
        {children}
      </BsAccordion>
    </AccordionContext.Provider>
  );
}

export default Accordion;
