import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { Accordion } from "./Accordion";
import { AccordionControls } from "./AccordionControls";
import { AccordionItem, HeaderAction } from "./AccordionItem";

describe("Accordion", () => {
  describe("Accordion container", () => {
    it("renders children", () => {
      render(
        <Accordion id="test-accordion">
          <AccordionItem eventKey="1" title="Item 1">
            Content 1
          </AccordionItem>
        </Accordion>,
      );

      expect(screen.getByText("Item 1")).toBeInTheDocument();
    });

    it("expands items in defaultExpandedKeys", () => {
      render(
        <Accordion id="test-accordion" defaultExpandedKeys={["1"]}>
          <AccordionItem eventKey="1" title="Item 1">
            Content 1
          </AccordionItem>
          <AccordionItem eventKey="2" title="Item 2">
            Content 2
          </AccordionItem>
        </Accordion>,
      );

      // Item 1 should be expanded
      const item1Header = screen.getByText("Item 1").closest("button");
      expect(item1Header).toHaveAttribute("aria-expanded", "true");

      // Item 2 should be collapsed
      const item2Header = screen.getByText("Item 2").closest("button");
      expect(item2Header).toHaveAttribute("aria-expanded", "false");
    });

    it("applies data-testid", () => {
      render(
        <Accordion id="test" data-testid="my-accordion">
          <AccordionItem eventKey="1" title="Item">
            Content
          </AccordionItem>
        </Accordion>,
      );

      expect(screen.getByTestId("my-accordion")).toBeInTheDocument();
    });
  });

  describe("AccordionItem", () => {
    it("renders title and content", () => {
      render(
        <Accordion id="test">
          <AccordionItem eventKey="1" title="Test Title">
            Test Content
          </AccordionItem>
        </Accordion>,
      );

      expect(screen.getByText("Test Title")).toBeInTheDocument();
    });

    it("renders subtitle when provided", () => {
      render(
        <Accordion id="test">
          <AccordionItem eventKey="1" title="Title" subtitle="Subtitle text">
            Content
          </AccordionItem>
        </Accordion>,
      );

      expect(screen.getByText("Subtitle text")).toBeInTheDocument();
    });

    it("toggles expansion on click", () => {
      render(
        <Accordion id="test">
          <AccordionItem eventKey="1" title="Item 1">
            Content
          </AccordionItem>
        </Accordion>,
      );

      const header = screen.getByText("Item 1").closest("button")!;
      expect(header).toHaveAttribute("aria-expanded", "false");

      fireEvent.click(header);
      expect(header).toHaveAttribute("aria-expanded", "true");

      fireEvent.click(header);
      expect(header).toHaveAttribute("aria-expanded", "false");
    });

    it("toggles expansion on Enter key", () => {
      render(
        <Accordion id="test">
          <AccordionItem eventKey="1" title="Item 1">
            Content
          </AccordionItem>
        </Accordion>,
      );

      const header = screen.getByText("Item 1").closest("button")!;
      expect(header).toHaveAttribute("aria-expanded", "false");

      fireEvent.keyDown(header, { key: "Enter" });
      expect(header).toHaveAttribute("aria-expanded", "true");
    });

    it("renders header actions", () => {
      const handleClick = vi.fn();
      render(
        <Accordion id="test">
          <AccordionItem
            eventKey="1"
            title="Item"
            headerActions={
              <HeaderAction onClick={handleClick} label="Remove" data-testid="remove-btn" />
            }
          >
            Content
          </AccordionItem>
        </Accordion>,
      );

      expect(screen.getByTestId("remove-btn")).toBeInTheDocument();
    });

    it("header actions don't toggle accordion", () => {
      const handleClick = vi.fn();
      render(
        <Accordion id="test">
          <AccordionItem
            eventKey="1"
            title="Item"
            headerActions={
              <HeaderAction onClick={handleClick} label="Remove" data-testid="remove-btn" />
            }
          >
            Content
          </AccordionItem>
        </Accordion>,
      );

      const header = screen.getByText("Item").closest("button")!;
      expect(header).toHaveAttribute("aria-expanded", "false");

      // Click the action button
      fireEvent.click(screen.getByTestId("remove-btn"));

      // Accordion should still be collapsed
      expect(header).toHaveAttribute("aria-expanded", "false");
      expect(handleClick).toHaveBeenCalled();
    });
  });

  describe("HeaderAction", () => {
    it("renders with label and icon", () => {
      render(
        <Accordion id="test">
          <AccordionItem
            eventKey="1"
            title="Item"
            headerActions={
              <HeaderAction onClick={() => {}} icon="trash" label="Remove" data-testid="btn" />
            }
          >
            Content
          </AccordionItem>
        </Accordion>,
      );

      const btn = screen.getByTestId("btn");
      expect(btn).toHaveTextContent("Remove");
      expect(btn.querySelector(".ph-trash")).toBeInTheDocument();
    });

    it("handles keyboard activation", () => {
      const handleClick = vi.fn();
      render(
        <Accordion id="test">
          <AccordionItem
            eventKey="1"
            title="Item"
            headerActions={<HeaderAction onClick={handleClick} label="Remove" data-testid="btn" />}
          >
            Content
          </AccordionItem>
        </Accordion>,
      );

      const btn = screen.getByTestId("btn");
      fireEvent.keyDown(btn, { key: "Enter" });
      expect(handleClick).toHaveBeenCalled();
    });

    it("applies variant class", () => {
      render(
        <Accordion id="test">
          <AccordionItem
            eventKey="1"
            title="Item"
            headerActions={
              <HeaderAction
                onClick={() => {}}
                label="Delete"
                variant="outline-danger"
                data-testid="btn"
              />
            }
          >
            Content
          </AccordionItem>
        </Accordion>,
      );

      expect(screen.getByTestId("btn")).toHaveClass("btn-outline-danger");
    });
  });

  describe("AccordionControls", () => {
    it("renders expand/collapse all buttons", () => {
      render(
        <Accordion id="test">
          <AccordionControls />
          <AccordionItem eventKey="1" title="Item">
            Content
          </AccordionItem>
        </Accordion>,
      );

      expect(screen.getByTestId("accordion-expand-all")).toBeInTheDocument();
      expect(screen.getByTestId("accordion-collapse-all")).toBeInTheDocument();
    });

    it("expands all items when expand all is clicked", () => {
      render(
        <Accordion id="test">
          <AccordionControls />
          <AccordionItem eventKey="1" title="Item 1">
            Content 1
          </AccordionItem>
          <AccordionItem eventKey="2" title="Item 2">
            Content 2
          </AccordionItem>
        </Accordion>,
      );

      // Both should start collapsed
      const item1Header = screen.getByText("Item 1").closest("button")!;
      const item2Header = screen.getByText("Item 2").closest("button")!;

      expect(item1Header).toHaveAttribute("aria-expanded", "false");
      expect(item2Header).toHaveAttribute("aria-expanded", "false");

      // Click expand all
      fireEvent.click(screen.getByTestId("accordion-expand-all"));

      expect(item1Header).toHaveAttribute("aria-expanded", "true");
      expect(item2Header).toHaveAttribute("aria-expanded", "true");
    });

    it("collapses all items when collapse all is clicked", () => {
      render(
        <Accordion id="test" defaultExpandedKeys={["1", "2"]}>
          <AccordionControls />
          <AccordionItem eventKey="1" title="Item 1">
            Content 1
          </AccordionItem>
          <AccordionItem eventKey="2" title="Item 2">
            Content 2
          </AccordionItem>
        </Accordion>,
      );

      // Both should start expanded
      const item1Header = screen.getByText("Item 1").closest("button")!;
      const item2Header = screen.getByText("Item 2").closest("button")!;

      expect(item1Header).toHaveAttribute("aria-expanded", "true");
      expect(item2Header).toHaveAttribute("aria-expanded", "true");

      // Click collapse all
      fireEvent.click(screen.getByTestId("accordion-collapse-all"));

      expect(item1Header).toHaveAttribute("aria-expanded", "false");
      expect(item2Header).toHaveAttribute("aria-expanded", "false");
    });

    it("expands first item by default when defaultExpandedKeys has one key", () => {
      render(
        <Accordion id="test" defaultExpandedKeys={["1"]}>
          <AccordionItem eventKey="1" title="Item 1">
            Content 1
          </AccordionItem>
          <AccordionItem eventKey="2" title="Item 2">
            Content 2
          </AccordionItem>
          <AccordionItem eventKey="3" title="Item 3">
            Content 3
          </AccordionItem>
        </Accordion>,
      );

      const item1Header = screen.getByText("Item 1").closest("button")!;
      const item2Header = screen.getByText("Item 2").closest("button")!;
      const item3Header = screen.getByText("Item 3").closest("button")!;

      expect(item1Header).toHaveAttribute("aria-expanded", "true");
      expect(item2Header).toHaveAttribute("aria-expanded", "false");
      expect(item3Header).toHaveAttribute("aria-expanded", "false");
    });

    it("expand all then collapse all round-trips correctly", () => {
      render(
        <Accordion id="test" defaultExpandedKeys={["1"]}>
          <AccordionControls />
          <AccordionItem eventKey="1" title="Item 1">
            Content 1
          </AccordionItem>
          <AccordionItem eventKey="2" title="Item 2">
            Content 2
          </AccordionItem>
        </Accordion>,
      );

      const item1Header = screen.getByText("Item 1").closest("button")!;
      const item2Header = screen.getByText("Item 2").closest("button")!;

      // Item 1 expanded, Item 2 collapsed
      expect(item1Header).toHaveAttribute("aria-expanded", "true");
      expect(item2Header).toHaveAttribute("aria-expanded", "false");

      // Expand all
      fireEvent.click(screen.getByTestId("accordion-expand-all"));
      expect(item1Header).toHaveAttribute("aria-expanded", "true");
      expect(item2Header).toHaveAttribute("aria-expanded", "true");

      // Collapse all
      fireEvent.click(screen.getByTestId("accordion-collapse-all"));
      expect(item1Header).toHaveAttribute("aria-expanded", "false");
      expect(item2Header).toHaveAttribute("aria-expanded", "false");

      // Expand all again
      fireEvent.click(screen.getByTestId("accordion-expand-all"));
      expect(item1Header).toHaveAttribute("aria-expanded", "true");
      expect(item2Header).toHaveAttribute("aria-expanded", "true");
    });
  });
});
