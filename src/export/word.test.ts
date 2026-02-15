import { describe, expect, it, vi, beforeEach } from "vitest";

const mockSetData = vi.fn();
const mockRender = vi.fn();
const mockGenerate = vi.fn().mockReturnValue(new Blob());
const mockGetZip = vi.fn().mockReturnValue({ generate: mockGenerate });

vi.mock("docxtemplater", () => {
  const DocxtemplaterMock = vi.fn(function (this: Record<string, unknown>) {
    this.setData = mockSetData;
    this.render = mockRender;
    this.getZip = mockGetZip;
  });
  return { default: DocxtemplaterMock };
});

vi.mock("pizzip", () => {
  const PizZipMock = vi.fn(function () {
    /* empty zip */
  });
  return { default: PizZipMock };
});

vi.mock("file-saver", () => ({
  saveAs: vi.fn(),
}));

import Docxtemplater from "docxtemplater";
import PizZip from "pizzip";
import { saveAs } from "file-saver";
import { exportProgrammeDescriptorWord, exportProgrammeToWord } from "./word";

function makeProgramme(overrides: Partial<Programme> = {}): Programme {
  return { title: "Test Programme", totalCredits: 60, ...overrides } as Programme;
}

function mockFetchSuccess(): void {
  vi.spyOn(globalThis, "fetch").mockResolvedValue({
    ok: true,
    arrayBuffer: () => Promise.resolve(new ArrayBuffer(8)),
  } as Response);
}

describe("exportProgrammeDescriptorWord", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    mockSetData.mockClear();
    mockRender.mockClear();
    mockGenerate.mockClear().mockReturnValue(new Blob());
    mockGetZip.mockClear().mockReturnValue({ generate: mockGenerate });
  });

  it("fetches the Word template", async () => {
    mockFetchSuccess();
    await exportProgrammeDescriptorWord(makeProgramme());

    expect(globalThis.fetch).toHaveBeenCalledWith("./assets/programme_descriptor_template.docx");
  });

  it("creates a document with programme data", async () => {
    mockFetchSuccess();
    const p = makeProgramme({
      title: "Higher Diploma",
      nfqLevel: 8,
      awardType: "Major",
      totalCredits: 120,
    });

    await exportProgrammeDescriptorWord(p);

    expect(PizZip).toHaveBeenCalled();
    expect(Docxtemplater).toHaveBeenCalled();
    expect(mockSetData).toHaveBeenCalledWith(
      expect.objectContaining({
        programme_title: "Higher Diploma",
        nfq_level: 8,
        award_class: "Major",
        ects: "120",
      }),
    );
    expect(mockRender).toHaveBeenCalled();
  });

  it("saves with a sanitized filename", async () => {
    mockFetchSuccess();
    const p = makeProgramme({ title: "Test / Programme (v2)" });

    await exportProgrammeDescriptorWord(p);

    expect(saveAs).toHaveBeenCalledWith(
      expect.any(Blob),
      "Test_Programme_v2_programme_descriptor.docx",
    );
  });

  it("uses default filename when title is empty", async () => {
    mockFetchSuccess();
    const p = makeProgramme({ title: "" });

    await exportProgrammeDescriptorWord(p);

    expect(saveAs).toHaveBeenCalledWith(expect.any(Blob), "programme_programme_descriptor.docx");
  });

  it("throws when fetch fails", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: false,
      status: 404,
    } as Response);

    await expect(exportProgrammeDescriptorWord(makeProgramme())).rejects.toThrow(
      "Failed to load Word template",
    );
  });

  it("includes PLO data in the template", async () => {
    mockFetchSuccess();
    const p = makeProgramme({
      plos: [
        { id: "plo1", text: "Outcome 1", standardMappings: [{ thread: "T1", criteria: "C1" }] },
        { id: "plo2", text: "Outcome 2" },
      ],
    });

    await exportProgrammeDescriptorWord(p);

    expect(mockSetData).toHaveBeenCalledWith(
      expect.objectContaining({
        miplos: "1. Outcome 1\n2. Outcome 2",
      }),
    );
  });
});

describe("exportProgrammeToWord", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    mockSetData.mockClear();
    mockRender.mockClear();
    mockGenerate.mockClear().mockReturnValue(new Blob());
    mockGetZip.mockClear().mockReturnValue({ generate: mockGenerate });
  });

  it("delegates to exportProgrammeDescriptorWord on success", async () => {
    mockFetchSuccess();

    await exportProgrammeToWord(makeProgramme());

    expect(globalThis.fetch).toHaveBeenCalled();
    expect(saveAs).toHaveBeenCalled();
  });

  it("handles errors gracefully without throwing", async () => {
    vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("Network error"));
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.spyOn(globalThis, "alert").mockImplementation(() => {});

    await expect(exportProgrammeToWord(makeProgramme())).resolves.toBeUndefined();

    expect(console.error).toHaveBeenCalledWith("Word export failed:", expect.any(Error));
    expect(globalThis.alert).toHaveBeenCalledWith(expect.stringContaining("Word export failed"));
  });
});
