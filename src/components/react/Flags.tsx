/**
 * Flags component - displays validation errors and warnings.
 * Provides clickable navigation to the step with the issue.
 * @module components/react/Flags
 */

import { useMemo } from "react";

import { useProgramme } from "../../hooks/useStore";
import { activeSteps } from "../../state/store";
import { validateProgramme } from "../../utils/validation";
import { Icon } from "../ui/Icon";

/** Validation flag from validateProgramme */
interface ValidationFlag {
  type: "error" | "warn";
  msg: string;
  step: string;
}

/** Step definition from store */
interface Step {
  key: string;
  title: string;
}

export interface FlagsProps {
  /** Callback to navigate to a specific step */
  onGoToStep: (stepKey: string) => void;
}

/**
 * Renders a single flag item.
 */
function FlagItem({
  flag,
  index,
  stepTitle,
  onGoToStep,
}: {
  flag: ValidationFlag;
  index: number;
  stepTitle: string;
  onGoToStep?: (stepKey: string) => void;
}) {
  const isClickable = stepTitle && onGoToStep;
  const isError = flag.type === "error";

  const handleClick = () => {
    if (isClickable) {
      onGoToStep(flag.step);
      const content = document.getElementById("content");
      if (content) {
        content.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if ((e.key === "Enter" || e.key === " ") && isClickable) {
      e.preventDefault();
      handleClick();
    }
  };

  return (
    <div
      className={`flag-item flag-${flag.type}`}
      data-testid={`flag-${flag.type}-${index}`}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      style={isClickable ? { cursor: "pointer" } : undefined}
      role={isClickable ? "button" : undefined}
      tabIndex={isClickable ? 0 : undefined}
      aria-label={
        isClickable
          ? `${isError ? "Error" : "Warning"}: ${flag.msg}. Click to go to ${stepTitle}`
          : undefined
      }
    >
      <div className="d-flex align-items-start gap-2">
        <span className={`tag tag-${flag.type}`}>
          <Icon name="warning" /> {isError ? "ERROR" : "WARN"}
        </span>
        <div className="flex-grow-1">
          <div className="small">{flag.msg}</div>
          {stepTitle && (
            <div className="flag-step-link small text-muted">
              <Icon name="arrow-right" /> {stepTitle}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * Flags component for displaying validation errors and warnings.
 *
 * @example
 * ```tsx
 * <Flags onGoToStep={(stepKey) => navigateToStep(stepKey)} />
 * ```
 */
export function Flags({ onGoToStep }: FlagsProps) {
  const { programme, revision } = useProgramme();

  const flags = useMemo(() => {
    return validateProgramme(programme) as ValidationFlag[];
  }, [revision]); // eslint-disable-line react-hooks/exhaustive-deps -- revision tracks programme mutations

  const steps = useMemo(() => activeSteps() as Step[], []);

  const errors = useMemo(() => flags.filter((f) => f.type === "error"), [flags]);
  const warnings = useMemo(() => flags.filter((f) => f.type === "warn"), [flags]);

  // Helper to get step title from step key
  const getStepTitle = (stepKey: string): string => {
    const step = steps.find((s) => s.key === stepKey);
    return step?.title ?? "";
  };

  // No flags - show success message
  if (flags.length === 0) {
    return (
      <div role="alert" data-testid="flags-container">
        <div className="flag-item flag-ok" data-testid="flag-ok">
          <span className="tag tag-ok">OK</span>
          <div className="small">No flags — programme looks good!</div>
        </div>
      </div>
    );
  }

  // Build summary parts
  const summaryParts: React.ReactNode[] = [];
  if (errors.length > 0) {
    summaryParts.push(
      <span key="errors" className="text-danger fw-bold">
        {errors.length} error{errors.length > 1 ? "s" : ""}
      </span>,
    );
  }
  if (warnings.length > 0) {
    summaryParts.push(
      <span key="warnings" className="text-warning fw-bold">
        {warnings.length} warning{warnings.length > 1 ? "s" : ""}
      </span>,
    );
  }

  return (
    <div role="alert" data-testid="flags-container">
      {/* Summary header */}
      <div className="flags-summary mb-2 small" data-testid="flags-summary">
        {summaryParts.reduce<React.ReactNode[]>((acc, part, idx) => {
          if (idx > 0) {
            acc.push(<span key={`sep-${idx}`}> · </span>);
          }
          acc.push(part);
          return acc;
        }, [])}
      </div>

      {/* Flag items */}
      {flags.map((flag, idx) => (
        <FlagItem
          key={`${flag.type}-${flag.step}-${idx}`}
          flag={flag}
          index={idx}
          stepTitle={getStepTitle(flag.step)}
          onGoToStep={onGoToStep}
        />
      ))}
    </div>
  );
}

export default Flags;
