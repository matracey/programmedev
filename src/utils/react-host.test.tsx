import { act } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { getActiveRootCount, mountReact, unmountAllReactRoots } from "./react-host";

// Test component
function TestComponent({ message }: { message: string }) {
  return <div data-testid="test-component">{message}</div>;
}

describe("react-host", () => {
  let container: HTMLElement;

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
  });

  afterEach(() => {
    act(() => {
      unmountAllReactRoots();
    });
    container.remove();
  });

  describe("mountReact", () => {
    it("mounts a React component into the target element", () => {
      act(() => {
        mountReact(TestComponent, { message: "Hello" }, container);
      });

      expect(container.querySelector('[data-testid="test-component"]')).toHaveTextContent("Hello");
    });

    it("clears existing content before mounting", () => {
      container.innerHTML = "<span>Old content</span>";

      act(() => {
        mountReact(TestComponent, { message: "New content" }, container);
      });

      expect(container.querySelector("span")).toBeNull();
      expect(container.querySelector('[data-testid="test-component"]')).toHaveTextContent(
        "New content",
      );
    });

    it("unmounts previous React root when remounting to same element", () => {
      act(() => {
        mountReact(TestComponent, { message: "First" }, container);
      });
      expect(getActiveRootCount()).toBe(1);

      act(() => {
        mountReact(TestComponent, { message: "Second" }, container);
      });
      expect(getActiveRootCount()).toBe(1);
      expect(container.querySelector('[data-testid="test-component"]')).toHaveTextContent("Second");
    });

    it("returns a cleanup function that unmounts the component", () => {
      let cleanup: () => void;
      act(() => {
        cleanup = mountReact(TestComponent, { message: "Test" }, container);
      });
      expect(getActiveRootCount()).toBe(1);

      act(() => {
        cleanup();
      });
      expect(getActiveRootCount()).toBe(0);
    });
  });

  describe("unmountAllReactRoots", () => {
    it("unmounts all active React roots", () => {
      const container1 = document.createElement("div");
      const container2 = document.createElement("div");
      document.body.appendChild(container1);
      document.body.appendChild(container2);

      act(() => {
        mountReact(TestComponent, { message: "One" }, container1);
        mountReact(TestComponent, { message: "Two" }, container2);
      });
      expect(getActiveRootCount()).toBe(2);

      act(() => {
        unmountAllReactRoots();
      });
      expect(getActiveRootCount()).toBe(0);

      container1.remove();
      container2.remove();
    });
  });

  describe("getActiveRootCount", () => {
    it("returns the correct count of active roots", () => {
      expect(getActiveRootCount()).toBe(0);

      act(() => {
        mountReact(TestComponent, { message: "Test" }, container);
      });
      expect(getActiveRootCount()).toBe(1);
    });
  });
});
