/**
 * React Sidebar component.
 * Renders workflow step navigation tabs with icons and back/next buttons.
 * @module components/react/Sidebar
 */

import React from "react";
import { ListGroup } from "react-bootstrap";

import { useProgramme } from "../../hooks/useStore";
import { activeSteps, state } from "../../state/store.js";
import { Icon } from "../ui";
import { NavButtons } from "./NavButtons";

/**
 * Icon mapping for each step key.
 */
const STEP_ICONS: Record<string, string> = {
  identity: "identification-card",
  outcomes: "list-checks",
  versions: "git-branch",
  stages: "stairs",
  structure: "cube",
  electives: "path",
  mimlos: "graduation-cap",
  "effort-hours": "clock",
  assessments: "exam",
  "reading-lists": "books",
  schedule: "calendar",
  mapping: "graph",
  traceability: "flow-arrow",
  snapshot: "file-doc",
};

export interface SidebarProps {
  /** The currently active step key */
  currentStep: string;
  /** Callback when step changes */
  onStepChange: (stepKey: string) => void;
}

/**
 * Sidebar component for workflow step navigation.
 * Displays step tabs with icons and handles navigation.
 */
export function Sidebar({ currentStep, onStepChange }: SidebarProps): React.JSX.Element {
  // Subscribe to programme state for mode-dependent steps
  const { programme } = useProgramme();

  // Get active steps based on current mode
  const steps = activeSteps();

  // Find current step index
  const currentIndex = steps.findIndex((s) => s.key === currentStep);

  // Navigation handlers
  const handleBack = () => {
    if (currentIndex > 0) {
      const prevStep = steps[currentIndex - 1];
      onStepChange(prevStep.key);
    }
  };

  const handleNext = () => {
    if (currentIndex < steps.length - 1) {
      const nextStep = steps[currentIndex + 1];
      onStepChange(nextStep.key);
    }
  };

  const handleStepClick = (stepKey: string) => {
    onStepChange(stepKey);
  };

  const isBackDisabled = currentIndex <= 0;
  const isNextDisabled = currentIndex >= steps.length - 1;

  return (
    <nav aria-labelledby="workflow-heading">
      {/* Step list */}
      <ListGroup
        as="div"
        id="stepList"
        role="tablist"
        aria-label="Programme design steps"
        data-testid="step-list"
      >
        {steps.map((step, idx) => {
          const isActive = step.key === currentStep;
          const iconName = STEP_ICONS[step.key] ?? "circle";

          return (
            <ListGroup.Item
              key={step.key}
              action
              as="button"
              type="button"
              active={isActive}
              role="tab"
              aria-selected={isActive}
              aria-controls="content"
              aria-current={isActive ? "step" : undefined}
              data-testid={`step-${step.key}`}
              onClick={() => handleStepClick(step.key)}
            >
              <Icon name={iconName} className="me-2" />
              {idx + 1}. {step.title}
            </ListGroup.Item>
          );
        })}
      </ListGroup>

      {/* Navigation buttons */}
      <NavButtons
        isBackDisabled={isBackDisabled}
        isNextDisabled={isNextDisabled}
        onBack={handleBack}
        onNext={handleNext}
        size="sm"
        backVariant="outline-secondary"
        nextVariant="outline-secondary"
        backIcon="caret-left"
        nextIcon="caret-right"
        className="d-flex justify-content-between mt-3"
        data-testid="sidebar-nav"
      />
    </nav>
  );
}

export default Sidebar;
