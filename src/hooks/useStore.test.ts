import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { state } from "../state/store";
import {
  notifyStateChange,
  useProgramme,
  useSaveDebounced,
  useStepIndex,
  useUpdateProgramme,
} from "./useStore";

// Mock the store module
vi.mock("../state/store", async () => {
  const actual = await vi.importActual("../state/store");
  return {
    ...actual,
    saveNow: vi.fn(),
  };
});

describe("useStore hooks", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    // Reset state to default
    state.programme = {
      schemaVersion: 3,
      id: "test",
      title: "Test Programme",
      awardType: "",
      awardTypeIsOther: false,
      nfqLevel: null,
      school: "",
      awardStandardIds: [],
      awardStandardNames: [],
      totalCredits: 0,
      electiveDefinitions: [],
    } as Programme;
    state.stepIndex = 0;
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  describe("useProgramme", () => {
    it("returns the current programme state and revision", () => {
      const { result } = renderHook(() => useProgramme());
      expect(result.current.programme.title).toBe("Test Programme");
      expect(typeof result.current.revision).toBe("number");
    });

    it("updates when notifyStateChange is called", () => {
      const { result } = renderHook(() => useProgramme());
      expect(result.current.programme.title).toBe("Test Programme");
      const initialRevision = result.current.revision;

      act(() => {
        state.programme.title = "Updated Title";
        notifyStateChange();
      });

      expect(result.current.programme.title).toBe("Updated Title");
      expect(result.current.revision).toBeGreaterThan(initialRevision);
    });
  });

  describe("useStepIndex", () => {
    it("returns the current step index", () => {
      const { result } = renderHook(() => useStepIndex());
      expect(result.current).toBe(0);
    });

    it("updates when step index changes and notifyStateChange is called", () => {
      const { result } = renderHook(() => useStepIndex());
      expect(result.current).toBe(0);

      act(() => {
        state.stepIndex = 2;
        notifyStateChange();
      });

      expect(result.current).toBe(2);
    });
  });

  describe("useSaveDebounced", () => {
    it("returns a debounced save function", () => {
      const { result } = renderHook(() => useSaveDebounced());
      expect(typeof result.current).toBe("function");
    });

    it("saveDebounced delays the save by the specified time", async () => {
      const { saveNow } = await import("../state/store");
      const { result } = renderHook(() => useSaveDebounced(400));
      const onSaved = vi.fn();

      act(() => {
        result.current(onSaved);
      });

      // Should not have saved yet
      expect(saveNow).not.toHaveBeenCalled();
      expect(onSaved).not.toHaveBeenCalled();

      // Advance time past debounce delay
      act(() => {
        vi.advanceTimersByTime(400);
      });

      expect(saveNow).toHaveBeenCalledTimes(1);
      expect(onSaved).toHaveBeenCalledTimes(1);
    });

    it("saveDebounced resets the timer on subsequent calls", async () => {
      const { saveNow } = await import("../state/store");
      const { result } = renderHook(() => useSaveDebounced(400));

      act(() => {
        result.current();
      });

      // Advance partway
      act(() => {
        vi.advanceTimersByTime(200);
      });

      // Call again - should reset timer
      act(() => {
        result.current();
      });

      // Advance past first timeout but not second
      act(() => {
        vi.advanceTimersByTime(200);
      });

      expect(saveNow).not.toHaveBeenCalled();

      // Advance to complete second timeout
      act(() => {
        vi.advanceTimersByTime(200);
      });

      expect(saveNow).toHaveBeenCalledTimes(1);
    });
  });

  describe("useUpdateProgramme", () => {
    it("updates programme state with partial updates", async () => {
      const { result } = renderHook(() => useUpdateProgramme());

      act(() => {
        result.current({ title: "New Title" });
      });

      expect(state.programme.title).toBe("New Title");
    });

    it("notifies state change after update", async () => {
      const { result: programmeResult } = renderHook(() => useProgramme());
      const { result: updateResult } = renderHook(() => useUpdateProgramme());

      expect(programmeResult.current.programme.title).toBe("Test Programme");

      act(() => {
        updateResult.current({ title: "Updated Title" });
      });

      expect(programmeResult.current.programme.title).toBe("Updated Title");
    });
  });
});
