/**
 * Unit tests for ReadingListsStep React component.
 */

import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { state } from "../../../state/store";
import { ReadingListsStep } from "./ReadingListsStep";

// Store module mock functions
const mockEditableModuleIds = vi.fn(() => ["mod_1", "mod_2"]);
const mockGetSelectedModuleId = vi.fn(() => "mod_1");

// Mock the store module
vi.mock("../../../state/store", async () => {
  const actual = await vi.importActual("../../../state/store");
  return {
    ...actual,
    saveNow: vi.fn(),
    editableModuleIds: () => mockEditableModuleIds(),
    getSelectedModuleId: () => mockGetSelectedModuleId(),
  };
});

// Mock uid to return predictable IDs
vi.mock("../../../utils/uid.js", () => ({
  uid: vi.fn((prefix: string) => `${prefix}_test_${Math.random().toString(36).slice(2, 8)}`),
}));

// Mock fetch for ISBN lookup
global.fetch = vi.fn();

describe("ReadingListsStep", () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    // Reset mock return values
    mockEditableModuleIds.mockReturnValue(["mod_1", "mod_2"]);
    mockGetSelectedModuleId.mockReturnValue("mod_1");
    // Reset state to default with modules
    state.programme = {
      schemaVersion: 3,
      id: "test",
      title: "Test Programme",
      awardType: "Higher Diploma",
      awardTypeIsOther: false,
      nfqLevel: 8,
      school: "Computing",
      awardStandardIds: [],
      awardStandardNames: [],
      totalCredits: 60,
      electiveDefinitions: [],
      intakeMonths: [],
      modules: [
        {
          id: "mod_1",
          title: "Introduction to Programming",
          code: "COMP101",
          credits: 10,
          readingList: [],
        },
        {
          id: "mod_2",
          title: "Database Systems",
          code: "COMP201",
          credits: 10,
          readingList: [],
        },
      ],
      plos: [],
      ploToMimlos: {},
    } as Programme;
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  describe("Rendering", () => {
    it("renders the Reading Lists card with title", () => {
      render(<ReadingListsStep />);

      expect(screen.getByText("Reading Lists")).toBeInTheDocument();
    });

    it("renders the info alert about flagging old resources", () => {
      render(<ReadingListsStep />);

      expect(
        screen.getByText(/Items published more than 5 years ago will be flagged/i),
      ).toBeInTheDocument();
    });

    it("renders accordion with module items", () => {
      render(<ReadingListsStep />);

      expect(screen.getByText(/COMP101 — Introduction to Programming/i)).toBeInTheDocument();
      expect(screen.getByText(/COMP201 — Database Systems/i)).toBeInTheDocument();
    });

    it("shows no modules message when no modules available", () => {
      mockEditableModuleIds.mockReturnValue([]);
      state.programme.modules = [];

      render(<ReadingListsStep />);

      expect(screen.getByText(/No modules available/i)).toBeInTheDocument();
    });

    it("shows empty reading list message when module has no reading items", () => {
      render(<ReadingListsStep />);

      // Both modules show this message since neither has reading items
      expect(screen.getAllByText(/No reading list items yet/i).length).toBeGreaterThan(0);
    });
  });

  describe("Adding reading items", () => {
    it("adds a reading item to a module", async () => {
      render(<ReadingListsStep />);

      const addBtn = screen.getByTestId("reading-add-mod_1");
      await act(async () => {
        fireEvent.click(addBtn);
        vi.advanceTimersByTime(400);
      });

      expect(state.programme.modules?.[0].readingList?.length).toBe(1);
      expect(state.programme.modules?.[0].readingList?.[0].type).toBe("core");
    });
  });

  describe("Reading item fields", () => {
    beforeEach(() => {
      state.programme.modules![0].readingList = [
        {
          id: "reading_1",
          author: "",
          title: "",
          publisher: "",
          year: "",
          isbn: "",
          type: "core",
          notes: "",
        },
      ];
    });

    it("updates author field", async () => {
      render(<ReadingListsStep />);

      const authorInput = screen.getByTestId("reading-author-mod_1-0");
      await act(async () => {
        fireEvent.change(authorInput, { target: { value: "Smith, J." } });
        vi.advanceTimersByTime(400);
      });

      expect(state.programme.modules?.[0].readingList?.[0].author).toBe("Smith, J.");
    });

    it("updates title field", async () => {
      render(<ReadingListsStep />);

      const titleInput = screen.getByTestId("reading-title-mod_1-0");
      await act(async () => {
        fireEvent.change(titleInput, { target: { value: "Clean Code" } });
        vi.advanceTimersByTime(400);
      });

      expect(state.programme.modules?.[0].readingList?.[0].title).toBe("Clean Code");
    });

    it("updates year field", async () => {
      render(<ReadingListsStep />);

      const yearInput = screen.getByTestId("reading-year-mod_1-0");
      await act(async () => {
        fireEvent.change(yearInput, { target: { value: "2020" } });
        vi.advanceTimersByTime(400);
      });

      expect(state.programme.modules?.[0].readingList?.[0].year).toBe("2020");
    });

    it("updates type field", async () => {
      render(<ReadingListsStep />);

      const typeSelect = screen.getByTestId("reading-type-mod_1-0");
      await act(async () => {
        fireEvent.change(typeSelect, { target: { value: "recommended" } });
        vi.advanceTimersByTime(400);
      });

      expect(state.programme.modules?.[0].readingList?.[0].type).toBe("recommended");
    });
  });

  describe("Removing reading items", () => {
    beforeEach(() => {
      state.programme.modules![0].readingList = [
        {
          id: "reading_1",
          author: "Smith, J.",
          title: "Test Book",
          publisher: "Publisher",
          year: "2020",
          isbn: "",
          type: "core",
          notes: "",
        },
      ];
    });

    it("removes a reading item", async () => {
      render(<ReadingListsStep />);

      const removeBtn = screen.getByTestId("reading-remove-mod_1-0");
      await act(async () => {
        fireEvent.click(removeBtn);
        vi.advanceTimersByTime(400);
      });

      expect(state.programme.modules?.[0].readingList?.length).toBe(0);
    });
  });

  describe("Outdated warnings", () => {
    it("shows warning badge for old resources", () => {
      const currentYear = new Date().getFullYear();
      state.programme.modules![0].readingList = [
        {
          id: "reading_1",
          author: "Smith, J.",
          title: "Old Book",
          publisher: "Publisher",
          year: String(currentYear - 7),
          isbn: "",
          type: "core",
          notes: "",
        },
      ];

      render(<ReadingListsStep />);

      expect(screen.getByText(/7 years old/i)).toBeInTheDocument();
      expect(screen.getByText(/1 outdated/i)).toBeInTheDocument();
    });

    it("does not show warning for recent resources", () => {
      const currentYear = new Date().getFullYear();
      state.programme.modules![0].readingList = [
        {
          id: "reading_1",
          author: "Smith, J.",
          title: "New Book",
          publisher: "Publisher",
          year: String(currentYear - 2),
          isbn: "",
          type: "core",
          notes: "",
        },
      ];

      render(<ReadingListsStep />);

      expect(screen.queryByText(/years old/i)).not.toBeInTheDocument();
      expect(screen.queryByText(/outdated/i)).not.toBeInTheDocument();
    });
  });

  describe("ISBN lookup", () => {
    beforeEach(() => {
      state.programme.modules![0].readingList = [
        {
          id: "reading_1",
          author: "",
          title: "",
          publisher: "",
          year: "",
          isbn: "9780132350884",
          type: "core",
          notes: "",
        },
      ];
    });

    it("shows alert when ISBN is empty", async () => {
      state.programme.modules![0].readingList![0].isbn = "";
      const alertSpy = vi.spyOn(window, "alert").mockImplementation(() => {});

      render(<ReadingListsStep />);

      const lookupBtn = screen.getByTestId("reading-isbn-lookup-mod_1-0");
      await act(async () => {
        fireEvent.click(lookupBtn);
      });

      expect(alertSpy).toHaveBeenCalledWith("Please enter an ISBN first.");
      alertSpy.mockRestore();
    });

    it("shows alert for invalid ISBN format", async () => {
      state.programme.modules![0].readingList![0].isbn = "invalid";
      const alertSpy = vi.spyOn(window, "alert").mockImplementation(() => {});

      render(<ReadingListsStep />);

      const lookupBtn = screen.getByTestId("reading-isbn-lookup-mod_1-0");
      await act(async () => {
        fireEvent.click(lookupBtn);
      });

      expect(alertSpy).toHaveBeenCalledWith(
        "Invalid ISBN format. Please enter a valid 10 or 13 digit ISBN.",
      );
      alertSpy.mockRestore();
    });
  });

  describe("Accessibility", () => {
    beforeEach(() => {
      state.programme.modules![0].readingList = [
        {
          id: "reading_1",
          author: "",
          title: "",
          publisher: "",
          year: "",
          isbn: "",
          type: "core",
          notes: "",
        },
      ];
    });

    it("has proper form labels for reading item fields", () => {
      render(<ReadingListsStep />);

      expect(screen.getByLabelText(/Author\(s\)/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/^Title$/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Publisher/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Year/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Type/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Notes/i)).toBeInTheDocument();
    });

    it("has accessible add reading button", () => {
      render(<ReadingListsStep />);

      const addBtn = screen.getByTestId("reading-add-mod_1");
      expect(addBtn).toHaveAttribute(
        "aria-label",
        "Add reading item to Introduction to Programming",
      );
    });

    it("has accessible remove button", () => {
      render(<ReadingListsStep />);

      const removeBtn = screen.getByTestId("reading-remove-mod_1-0");
      expect(removeBtn).toHaveAttribute("aria-label", "Remove reading item 1");
    });
  });
});
