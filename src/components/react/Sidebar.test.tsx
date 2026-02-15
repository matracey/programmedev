/**
 * Tests for the Sidebar component.
 * @module components/react/Sidebar.test
 */

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { Sidebar, SidebarProps } from "./Sidebar";

// Mock the store module
vi.mock("../../state/store", () => ({
  state: {
    programme: {
      mode: "PROGRAMME_OWNER",
    },
    stepIndex: 0,
  },
  activeSteps: () => [
    { key: "identity", title: "Identity" },
    { key: "outcomes", title: "PLOs" },
    { key: "versions", title: "Programme Versions" },
    { key: "stages", title: "Stage Structure" },
    { key: "structure", title: "Credits & Modules" },
  ],
}));

// Mock the useStore hooks
vi.mock("../../hooks/useStore", () => ({
  useProgramme: () => ({
    mode: "PROGRAMME_OWNER",
    title: "Test Programme",
    modules: [],
    plos: [],
  }),
}));

describe("Sidebar", () => {
  const defaultProps: SidebarProps = {
    currentStep: "identity",
    onStepChange: vi.fn(),
  };

  afterEach(() => {
    vi.clearAllMocks();
    cleanup();
  });

  it("renders all steps from activeSteps", () => {
    render(<Sidebar {...defaultProps} />);

    const stepButtons = screen.getAllByRole("tab");
    expect(stepButtons.length).toBe(5);
  });

  it("highlights the current step as active", () => {
    render(<Sidebar {...defaultProps} currentStep="outcomes" />);

    const activeButton = screen.getByTestId("step-outcomes");
    expect(activeButton.classList.contains("active")).toBe(true);
  });

  it("calls onStepChange when a step is clicked", () => {
    const onStepChange = vi.fn();
    render(<Sidebar {...defaultProps} onStepChange={onStepChange} />);

    fireEvent.click(screen.getByTestId("step-outcomes"));

    expect(onStepChange).toHaveBeenCalledWith("outcomes");
  });

  it("disables back button on first step", () => {
    render(<Sidebar {...defaultProps} currentStep="identity" />);

    const backBtn = screen.getByTestId("back-btn") as HTMLButtonElement;
    expect(backBtn.disabled).toBe(true);
  });

  it("disables next button on last step", () => {
    render(<Sidebar {...defaultProps} currentStep="structure" />);

    const nextBtn = screen.getByTestId("next-btn") as HTMLButtonElement;
    expect(nextBtn.disabled).toBe(true);
  });

  it("calls onStepChange with previous step when back is clicked", () => {
    const onStepChange = vi.fn();
    render(<Sidebar currentStep="outcomes" onStepChange={onStepChange} />);

    fireEvent.click(screen.getByTestId("back-btn"));

    expect(onStepChange).toHaveBeenCalledWith("identity");
  });

  it("calls onStepChange with next step when next is clicked", () => {
    const onStepChange = vi.fn();
    render(<Sidebar currentStep="identity" onStepChange={onStepChange} />);

    fireEvent.click(screen.getByTestId("next-btn"));

    expect(onStepChange).toHaveBeenCalledWith("outcomes");
  });

  it("renders step icons", () => {
    render(<Sidebar {...defaultProps} />);

    const identityStep = screen.getByTestId("step-identity");
    const identityIcon = identityStep.querySelector("i");
    expect(identityIcon?.classList.contains("ph-identification-card")).toBe(true);
  });

  it("sets correct aria attributes on active step", () => {
    render(<Sidebar {...defaultProps} />);

    const activeStep = screen.getByTestId("step-identity");
    expect(activeStep.getAttribute("aria-selected")).toBe("true");
    expect(activeStep.getAttribute("aria-current")).toBe("step");
  });
});
