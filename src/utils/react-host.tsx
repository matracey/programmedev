/**
 * React Host Adapter for incremental migration.
 * Provides utilities to mount React components inside the legacy DOM structure.
 * @module utils/react-host
 */

import type { ComponentType } from "react";
import { createElement } from "react";
import { createRoot, type Root } from "react-dom/client";

// Store active React roots to enable proper cleanup
const activeRoots = new Map<HTMLElement, Root>();

/**
 * Mounts a React component into a target DOM element.
 * Handles cleanup of any existing React root at the same target.
 *
 * @param Component - The React component to mount
 * @param props - Props to pass to the component
 * @param targetElement - The DOM element to mount into
 * @returns A cleanup function to unmount the component
 */
export function mountReact<P extends object>(
  Component: ComponentType<P>,
  props: P,
  targetElement: HTMLElement,
): () => void {
  // Clean up any existing React root at this target
  const existingRoot = activeRoots.get(targetElement);
  if (existingRoot) {
    existingRoot.unmount();
    activeRoots.delete(targetElement);
  }

  // Clear the target element's contents
  targetElement.innerHTML = "";

  // Create a new React root and render the component
  const root = createRoot(targetElement);
  activeRoots.set(targetElement, root);
  root.render(createElement(Component, props));

  // Return a cleanup function
  return () => {
    const currentRoot = activeRoots.get(targetElement);
    if (currentRoot) {
      currentRoot.unmount();
      activeRoots.delete(targetElement);
    }
  };
}

/**
 * Unmounts all active React roots.
 * Useful for cleanup during testing or when transitioning pages.
 */
export function unmountAllReactRoots(): void {
  activeRoots.forEach((root) => {
    root.unmount();
  });
  activeRoots.clear();
}

/**
 * Gets the count of active React roots.
 * Useful for debugging and testing.
 */
export function getActiveRootCount(): number {
  return activeRoots.size;
}
