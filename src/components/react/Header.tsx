/**
 * React Header component.
 * Renders the application header with programme title, completion badge,
 * save status, and action buttons (export, import, reset, theme toggle).
 * @module components/react/Header
 */

import React, { useCallback, useEffect, useRef, useState } from "react";

import { Badge, Button, ButtonGroup, Navbar, OverlayTrigger, Popover } from "react-bootstrap";

import { exportProgrammeToJson, importProgrammeFromJson } from "../../export/json";
import { notifyStateChange, useProgramme } from "../../hooks/useStore";
import { activeSteps, resetProgramme, saveNow, state } from "../../state/store";
import { completionPercent, validateProgramme } from "../../utils/validation";
import { Icon } from "../ui";

// ============================================================================
// Types
// ============================================================================

/** Validation flag from validateProgramme */
interface ValidationFlag {
  type: "error" | "warn";
  msg: string;
  step: string;
}

/** Step definition */
interface Step {
  key: string;
  title: string;
}

/** Props for Header component */
export interface HeaderProps {
  /** Callback when navigation to a step is requested */
  onNavigateToStep?: (stepKey: string) => void;
}

// ============================================================================
// Helper Components
// ============================================================================

/**
 * Completion badge with popover showing validation items.
 */
interface CompletionBadgeProps {
  percentage: number;
  flags: ValidationFlag[];
  onNavigateToStep?: (stepKey: string) => void;
}

const CompletionBadge: React.FC<CompletionBadgeProps> = ({
  percentage,
  flags,
  onNavigateToStep,
}) => {
  const badgeVariant = percentage >= 75 ? "success" : percentage >= 40 ? "warning" : "secondary";

  // Group flags by step
  const flagsByStep = flags.reduce<Record<string, ValidationFlag[]>>((acc, flag) => {
    if (!acc[flag.step]) {
      acc[flag.step] = [];
    }
    acc[flag.step].push(flag);
    return acc;
  }, {});

  // Get step titles
  const stepMap: Record<string, string> = {};
  activeSteps().forEach((s: Step) => {
    stepMap[s.key] = s.title;
  });

  const popoverContent = (
    <div className="completion-popover-content">
      {flags.length === 0 ? (
        <div className="small text-success fw-bold">All requirements met!</div>
      ) : (
        Object.entries(flagsByStep).map(([step, items]) => (
          <div key={step} className="mb-2">
            {onNavigateToStep ? (
              <button
                type="button"
                className="btn btn-link fw-semibold text-primary p-0 text-start text-decoration-none"
                onClick={() => onNavigateToStep(step)}
              >
                {stepMap[step] || step}
              </button>
            ) : (
              <div className="fw-semibold text-primary">
                {stepMap[step] || step}
              </div>
            )}
            {items.map((flag, idx) => (
              <div
                key={idx}
                className={`${flag.type === "error" ? "text-danger" : "text-warning"} ms-2 mb-1 small`}
              >
                {flag.type === "error" ? "!" : "i"} {flag.msg}
              </div>
            ))}
          </div>
        ))
      )}
    </div>
  );

  const popover = (
    <Popover id="completion-popover">
      <Popover.Header as="h3">
        {percentage === 100 ? "All complete!" : "Items to complete"}
      </Popover.Header>
      <Popover.Body>{popoverContent}</Popover.Body>
    </Popover>
  );

  return (
    <OverlayTrigger trigger={["hover", "focus"]} placement="bottom" overlay={popover}>
      <Badge
        bg={badgeVariant}
        id="completionBadge"
        data-testid="completion-badge"
        style={{ cursor: percentage === 100 ? "default" : "pointer" }}
        tabIndex={0}
        role="status"
        aria-label={`Programme ${percentage}% complete`}
      >
        {percentage}% complete
      </Badge>
    </OverlayTrigger>
  );
};

/**
 * Save status display.
 */
interface SaveStatusProps {
  saving: boolean;
  lastSaved: string | null;
}

const SaveStatus: React.FC<SaveStatusProps> = ({ saving, lastSaved }) => {
  const statusText = saving
    ? "Saving…"
    : lastSaved
      ? `Saved ${new Date(lastSaved).toLocaleString()}`
      : "Not saved yet";

  return (
    <span
      id="saveStatus"
      className="text-secondary small"
      data-testid="save-status"
      role="status"
      aria-live="polite"
    >
      {statusText}
    </span>
  );
};

/**
 * Theme toggle button (dark/light mode).
 */
interface ThemeToggleProps {
  theme: "light" | "dark";
  onToggle: () => void;
}

const ThemeToggle: React.FC<ThemeToggleProps> = ({ theme, onToggle }) => {
  return (
    <Button
      variant="outline-secondary"
      size="sm"
      onClick={onToggle}
      aria-label={`Switch to ${theme === "light" ? "dark" : "light"} mode`}
      data-testid="theme-toggle"
    >
      <Icon name={theme === "light" ? "moon" : "sun"} aria-hidden />
    </Button>
  );
};

// ============================================================================
// Main Component
// ============================================================================

/**
 * Header component for the Programme Design Studio.
 * Displays programme title, completion status, and action buttons.
 */
export const Header: React.FC<HeaderProps> = ({ onNavigateToStep }) => {
  const { programme } = useProgramme();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Local state for theme
  const [theme, setTheme] = useState<"light" | "dark">(() => {
    if (typeof document !== "undefined") {
      return (
        (document.documentElement.getAttribute("data-bs-theme") as "light" | "dark") || "light"
      );
    }
    return "light";
  });

  // Local state for saving status (synced from global state)
  const [saving, setSaving] = useState(state.saving);
  const [lastSaved, setLastSaved] = useState<string | null>(state.lastSaved);

  // Sync saving state from global state
  useEffect(() => {
    const interval = setInterval(() => {
      if (state.saving !== saving) {
        setSaving(state.saving);
      }
      if (state.lastSaved !== lastSaved) {
        setLastSaved(state.lastSaved);
      }
    }, 100);
    return () => clearInterval(interval);
  }, [saving, lastSaved]);

  // Compute completion and validation flags
  const completion = completionPercent(programme);
  const flags = validateProgramme(programme) as ValidationFlag[];

  // Programme title display
  const displayTitle = programme.title?.trim() || "New Programme (Draft)";

  // ============================================================================
  // Event Handlers
  // ============================================================================

  const handleExport = useCallback(() => {
    exportProgrammeToJson(programme);
  }, [programme]);

  const handleFileChange = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    const result = await importProgrammeFromJson(file);
    if (result.success && result.programme) {
      // Update state with imported programme
      Object.assign(state.programme, result.programme);
      saveNow();
      // Notify React of state change
      notifyStateChange();
      // Trigger global re-render for any legacy components
      const win = window as Window & { render?: () => void | Promise<void> };
      win.render?.();
    } else {
      alert(`Import failed: ${result.error || "Unknown error"}`);
    }

    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }, []);

  const handleReset = useCallback(() => {
    if (window.confirm("Are you sure you want to reset? All data will be lost.")) {
      resetProgramme();
      // Notify React of state change
      notifyStateChange();
      // Trigger global re-render for any legacy components
      const win = window as Window & { render?: () => void | Promise<void> };
      win.render?.();
    }
  }, []);

  const handleThemeToggle = useCallback(() => {
    const newTheme = theme === "light" ? "dark" : "light";
    setTheme(newTheme);
    document.documentElement.setAttribute("data-bs-theme", newTheme);
    localStorage.setItem("theme", newTheme);
  }, [theme]);

  // ============================================================================
  // Render
  // ============================================================================

  return (
    <Navbar
      expand="lg"
      className="border-bottom bg-body sticky-top"
      data-testid="header"
      role="banner"
      aria-label="Main navigation"
    >
      <div className="container-fluid">
        {/* Brand - stacked text on left (matching original layout) */}
        <div className="d-flex flex-column">
          <span className="small text-secondary fw-semibold">NCI Programme Design Studio v2</span>
          <span
            id="programmeTitleNav"
            className="h5 mb-0"
            data-testid="programme-title"
            aria-live="polite"
          >
            {displayTitle}
          </span>
        </div>

        {/* Action Buttons - all in a row on the right */}
        <div
          className="d-flex align-items-center gap-2 flex-wrap"
          role="toolbar"
          aria-label="Programme actions"
        >
          <CompletionBadge
            percentage={completion}
            flags={flags}
            onNavigateToStep={onNavigateToStep}
          />
          <SaveStatus saving={saving} lastSaved={lastSaved} />

          {/* Export/Import/Reset Button Group */}
          <ButtonGroup size="sm" aria-label="Programme file actions">
            {/* Export Button */}
            <Button
              variant="outline-secondary"
              onClick={handleExport}
              data-testid="export-btn"
              aria-label="Export programme as JSON"
            >
              <Icon name="download-simple" aria-hidden /> Export
            </Button>

            {/* Import Button */}
            <Button
              variant="outline-secondary"
              as="label"
              className="mb-0"
              style={{ cursor: "pointer" }}
            >
              <Icon name="upload-simple" aria-hidden /> Import
              <input
                ref={fileInputRef}
                type="file"
                accept=".json,application/json"
                onChange={handleFileChange}
                hidden
                data-testid="import-input"
                aria-label="Import programme from JSON file"
              />
            </Button>

            {/* Reset Button */}
            <Button
              variant="outline-danger"
              onClick={handleReset}
              data-testid="reset-btn"
              aria-label="Reset programme to defaults"
            >
              <Icon name="arrow-counter-clockwise" aria-hidden /> Reset
            </Button>
          </ButtonGroup>

          {/* Theme Toggle */}
          <ThemeToggle theme={theme} onToggle={handleThemeToggle} />
        </div>
      </div>
    </Navbar>
  );
};

export default Header;
