/**
 * React hooks for integrating with the legacy state store.
 * Provides hooks for accessing programme state and saving changes.
 * @module hooks/useStore
 */

import { useCallback, useEffect, useRef, useState } from "react";

import { saveNow, state } from "../state/store.js";

// Simple subscription system for state changes
type Listener = () => void;
const listeners = new Set<Listener>();

/**
 * Subscribe to state changes.
 * @param listener - Function to call when state changes
 * @returns Unsubscribe function
 */
function subscribe(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/**
 * Notify all listeners of a state change.
 * Call this after modifying the state.
 */
export function notifyStateChange(): void {
  listeners.forEach((listener) => listener());
}

// Global revision counter to help with memoization
let stateRevision = 0;

/**
 * Get the current state revision.
 * Use this as a dependency in useMemo to properly invalidate caches
 * when state changes via mutation.
 */
export function getStateRevision(): number {
  return stateRevision;
}

/**
 * Hook to access the current programme state.
 * Re-renders the component when the state changes.
 *
 * @returns The current programme state and a revision number for memoization
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const { programme, revision } = useProgramme();
 *   const computed = useMemo(() => expensiveCalc(programme), [revision]);
 *   return <div>{programme.title}</div>;
 * }
 * ```
 */
export function useProgramme(): { programme: Programme; revision: number } {
  // Force re-render when revision changes by using a simple state
  const [revision, setRevision] = useState(stateRevision);

  useEffect(() => {
    const handleChange = () => {
      stateRevision++;
      setRevision(stateRevision);
    };
    listeners.add(handleChange);
    return () => {
      listeners.delete(handleChange);
    };
  }, []);

  return { programme: state.programme, revision };
}

/**
 * Hook to get the current step index.
 *
 * @returns The current step index
 */
export function useStepIndex(): number {
  const [stepIndex, setStepIndex] = useState(state.stepIndex);

  useEffect(() => {
    const checkStepIndex = () => {
      if (state.stepIndex !== stepIndex) {
        setStepIndex(state.stepIndex);
      }
    };
    return subscribe(checkStepIndex);
  }, [stepIndex]);

  return stepIndex;
}

/**
 * Hook that provides a debounced save function.
 * Useful for input fields where you want to save on every keystroke
 * but without excessive saves.
 *
 * @param delayMs - Debounce delay in milliseconds (default: 400)
 * @returns A debounced save function
 *
 * @example
 * ```tsx
 * function TitleInput() {
 *   const programme = useProgramme();
 *   const updateProgramme = useUpdateProgramme();
 *   const saveDebounced = useSaveDebounced();
 *
 *   const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
 *     updateProgramme({ title: e.target.value });
 *     saveDebounced();
 *   };
 *
 *   return <input value={programme.title} onChange={handleChange} />;
 * }
 * ```
 */
export function useSaveDebounced(delayMs = 400): (onSaved?: () => void) => void {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, []);

  return useCallback(
    (onSaved?: () => void) => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
      timerRef.current = setTimeout(() => {
        saveNow();
        onSaved?.();
      }, delayMs);
    },
    [delayMs],
  );
}

/**
 * Hook to update programme state.
 * Provides a convenient way to update fields without automatic save.
 * Call saveDebounced() manually after updating to persist changes.
 *
 * @returns An update function that modifies state
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const programme = useProgramme();
 *   const updateProgramme = useUpdateProgramme();
 *   const saveDebounced = useSaveDebounced();
 *
 *   const handleChange = (value: string) => {
 *     updateProgramme({ title: value });
 *     saveDebounced();
 *   };
 * }
 * ```
 */
export function useUpdateProgramme(): (updates: Partial<Programme>) => void {
  return useCallback((updates: Partial<Programme>) => {
    Object.assign(state.programme, updates);
    notifyStateChange();
  }, []);
}

/**
 * Hook to trigger the global render function.
 * Useful when React components need to trigger a full legacy re-render.
 *
 * @returns A function to trigger global render
 */
export function useGlobalRender(): () => void {
  return useCallback(() => {
    const win = window as Window & { render?: () => void | Promise<void> };
    win.render?.();
  }, []);
}
