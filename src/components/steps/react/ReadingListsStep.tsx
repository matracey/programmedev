/**
 * React version of the Reading Lists step component.
 * Manages module reading resources with ISBN lookup, outdated warnings, and resource types.
 * @module components/steps/react/ReadingListsStep
 */

import React, { useCallback, useState } from "react";
import { Badge, Button, Card, Col, Form, Row } from "react-bootstrap";
import {
  Accordion,
  AccordionControls,
  AccordionItem,
  Alert,
  HeaderAction,
  Icon,
  SectionCard,
} from "../../ui";
import { useProgramme, useSaveDebounced, useUpdateProgramme } from "../../../hooks/useStore";
import { editableModuleIds, getSelectedModuleId, state } from "../../../state/store";
import { uid } from "../../../utils/uid";

// ============================================================================
// Types
// ============================================================================

/** Reading list item */
interface ReadingItem {
  id: string;
  author?: string;
  title?: string;
  publisher?: string;
  year?: string;
  isbn?: string;
  type?: string;
  notes?: string;
}

/** Module with reading list */
interface ModuleWithReading {
  id: string;
  title: string;
  code?: string;
  readingList?: ReadingItem[];
}

/** Props for ReadingItemCard component */
interface ReadingItemCardProps {
  item: ReadingItem;
  index: number;
  moduleId: string;
  currentYear: number;
  onFieldChange: (moduleId: string, index: number, field: string, value: string) => void;
  onRemove: (moduleId: string, index: number) => void;
  onIsbnLookup: (moduleId: string, index: number) => void;
}

// ============================================================================
// Sub-components
// ============================================================================

/**
 * Single reading list item card with all input fields.
 */
const ReadingItemCard: React.FC<ReadingItemCardProps> = ({
  item,
  index,
  moduleId,
  currentYear,
  onFieldChange,
  onRemove,
  onIsbnLookup,
}) => {
  const [isbnLookupLoading, setIsbnLookupLoading] = useState(false);

  const yearNum = Number(item.year) || 0;
  const isOld = yearNum > 0 && currentYear - yearNum > 5;
  const yearsOld = currentYear - yearNum;

  const handleIsbnLookup = async () => {
    setIsbnLookupLoading(true);
    try {
      await onIsbnLookup(moduleId, index);
    } finally {
      setIsbnLookupLoading(false);
    }
  };

  return (
    <Card className="border-0 bg-light mb-2" data-testid={`reading-item-${moduleId}-${index}`}>
      <Card.Body className="py-2">
        <div className="d-flex justify-content-between align-items-start mb-2">
          <div className="d-flex align-items-center gap-2">
            <span className="fw-semibold small">Resource {index + 1}</span>
            {isOld && (
              <Badge bg="warning" title="This resource is more than 5 years old">
                ⚠ {yearsOld} years old
              </Badge>
            )}
          </div>
          <Button
            variant="outline-danger"
            size="sm"
            onClick={() => onRemove(moduleId, index)}
            aria-label={`Remove reading item ${index + 1}`}
            data-testid={`reading-remove-${moduleId}-${index}`}
          >
            <Icon name="trash" aria-hidden /> Remove
          </Button>
        </div>

        <Row className="g-2">
          <Col md={4}>
            <Form.Label className="small" htmlFor={`reading-author-${moduleId}-${index}`}>
              Author(s)
            </Form.Label>
            <Form.Control
              size="sm"
              id={`reading-author-${moduleId}-${index}`}
              value={item.author ?? ""}
              onChange={(e) => onFieldChange(moduleId, index, "author", e.target.value)}
              placeholder="e.g., Smith, J. & Jones, M."
              data-testid={`reading-author-${moduleId}-${index}`}
            />
          </Col>
          <Col md={4}>
            <Form.Label className="small" htmlFor={`reading-title-${moduleId}-${index}`}>
              Title
            </Form.Label>
            <Form.Control
              size="sm"
              id={`reading-title-${moduleId}-${index}`}
              value={item.title ?? ""}
              onChange={(e) => onFieldChange(moduleId, index, "title", e.target.value)}
              placeholder="Book or article title"
              data-testid={`reading-title-${moduleId}-${index}`}
            />
          </Col>
          <Col md={2}>
            <Form.Label className="small" htmlFor={`reading-publisher-${moduleId}-${index}`}>
              Publisher
            </Form.Label>
            <Form.Control
              size="sm"
              id={`reading-publisher-${moduleId}-${index}`}
              value={item.publisher ?? ""}
              onChange={(e) => onFieldChange(moduleId, index, "publisher", e.target.value)}
              placeholder="Publisher name"
              data-testid={`reading-publisher-${moduleId}-${index}`}
            />
          </Col>
          <Col md={2}>
            <Form.Label className="small" htmlFor={`reading-year-${moduleId}-${index}`}>
              Year
            </Form.Label>
            <Form.Control
              type="number"
              size="sm"
              id={`reading-year-${moduleId}-${index}`}
              value={item.year ?? ""}
              onChange={(e) => onFieldChange(moduleId, index, "year", e.target.value)}
              min={1900}
              max={currentYear + 1}
              placeholder={String(currentYear)}
              data-testid={`reading-year-${moduleId}-${index}`}
            />
          </Col>
        </Row>

        <Row className="g-2 mt-1">
          <Col md={4}>
            <Form.Label className="small" htmlFor={`reading-isbn-${moduleId}-${index}`}>
              ISBN{" "}
              <Button
                variant="link"
                size="sm"
                className="p-0 ms-1"
                onClick={handleIsbnLookup}
                disabled={isbnLookupLoading}
                title="Look up book details by ISBN"
                aria-label={`Look up book details by ISBN for item ${index + 1}`}
                data-testid={`reading-isbn-lookup-${moduleId}-${index}`}
              >
                {isbnLookupLoading ? (
                  "⏳ Looking up..."
                ) : (
                  <>
                    <Icon name="magnifying-glass" aria-hidden /> Lookup
                  </>
                )}
              </Button>
            </Form.Label>
            <Form.Control
              size="sm"
              id={`reading-isbn-${moduleId}-${index}`}
              value={item.isbn ?? ""}
              onChange={(e) => onFieldChange(moduleId, index, "isbn", e.target.value)}
              placeholder="e.g., 978-0-13-468599-1"
              data-testid={`reading-isbn-${moduleId}-${index}`}
            />
          </Col>
          <Col md={4}>
            <Form.Label className="small" htmlFor={`reading-type-${moduleId}-${index}`}>
              Type
            </Form.Label>
            <Form.Select
              size="sm"
              id={`reading-type-${moduleId}-${index}`}
              value={item.type ?? "core"}
              onChange={(e) => onFieldChange(moduleId, index, "type", e.target.value)}
              data-testid={`reading-type-${moduleId}-${index}`}
            >
              <option value="core">Core / Essential</option>
              <option value="recommended">Recommended</option>
              <option value="supplementary">Supplementary</option>
            </Form.Select>
          </Col>
          <Col md={4}>
            <Form.Label className="small" htmlFor={`reading-notes-${moduleId}-${index}`}>
              Notes (optional)
            </Form.Label>
            <Form.Control
              size="sm"
              id={`reading-notes-${moduleId}-${index}`}
              value={item.notes ?? ""}
              onChange={(e) => onFieldChange(moduleId, index, "notes", e.target.value)}
              placeholder="e.g., Chapters 1-5"
              data-testid={`reading-notes-${moduleId}-${index}`}
            />
          </Col>
        </Row>
      </Card.Body>
    </Card>
  );
};

// ============================================================================
// Main Component
// ============================================================================

/**
 * Reading Lists step component for React.
 * Manages reading resources per module with ISBN lookup and age warnings.
 */
export const ReadingListsStep: React.FC = () => {
  const { programme } = useProgramme();
  const updateProgramme = useUpdateProgramme();
  const saveDebounced = useSaveDebounced();

  const currentYear = new Date().getFullYear();

  // Get editable modules based on mode
  const editableIds = editableModuleIds();
  const selectedId = getSelectedModuleId();
  const isModuleEditor = programme.mode === "MODULE_EDITOR";
  const canPickModule = isModuleEditor && editableIds.length > 1;
  const modulesForEdit = (programme.modules ?? []).filter((m) =>
    editableIds.includes(m.id),
  ) as ModuleWithReading[];

  // Track expanded accordion items
  const [expandedModules, setExpandedModules] = useState<Set<string>>(() => {
    const firstModule = modulesForEdit[0];
    return new Set(firstModule ? [firstModule.id] : []);
  });

  // Helper to update flags and header without full re-render
  const updateFlagsAndHeader = useCallback(() => {
    // No-op: React components auto-update via useSyncExternalStore
  }, []);

  // ============================================================================
  // Event handlers
  // ============================================================================

  const handleModulePickerChange = useCallback((moduleId: string) => {
    state.selectedModuleId = moduleId;
    const win = window as Window & { render?: () => void | Promise<void> };
    win.render?.();
  }, []);

  const handleAddReading = useCallback(
    (moduleId: string) => {
      const modules = [...(programme.modules ?? [])];
      const m = modules.find((x) => x.id === moduleId);
      if (!m) {
        return;
      }
      m.readingList ??= [];
      m.readingList.push({
        id: uid("reading"),
        author: "",
        title: "",
        publisher: "",
        year: "",
        isbn: "",
        type: "core",
        notes: "",
      });
      updateProgramme({ modules });
      saveDebounced(updateFlagsAndHeader);
    },
    [programme.modules, updateProgramme, saveDebounced, updateFlagsAndHeader],
  );

  const handleRemoveReading = useCallback(
    (moduleId: string, index: number) => {
      const modules = [...(programme.modules ?? [])];
      const m = modules.find((x) => x.id === moduleId);
      if (!m || !m.readingList) {
        return;
      }
      m.readingList = m.readingList.filter((_, i) => i !== index);
      updateProgramme({ modules });
      saveDebounced(updateFlagsAndHeader);
    },
    [programme.modules, updateProgramme, saveDebounced, updateFlagsAndHeader],
  );

  const handleFieldChange = useCallback(
    (moduleId: string, index: number, field: string, value: string) => {
      const modules = [...(programme.modules ?? [])];
      const m = modules.find((x) => x.id === moduleId);
      if (!m || !m.readingList || !m.readingList[index]) {
        return;
      }
      (m.readingList[index] as Record<string, unknown>)[field] = value;
      updateProgramme({ modules });
      saveDebounced(updateFlagsAndHeader);
    },
    [programme.modules, updateProgramme, saveDebounced, updateFlagsAndHeader],
  );

  const handleIsbnLookup = useCallback(
    async (moduleId: string, index: number) => {
      const modules = [...(programme.modules ?? [])];
      const m = modules.find((x) => x.id === moduleId);
      if (!m || !m.readingList || !m.readingList[index]) {
        return;
      }

      const item = m.readingList[index];
      let isbn = (item.isbn ?? "").trim();

      if (!isbn) {
        alert("Please enter an ISBN first.");
        return;
      }

      // Clean ISBN - remove hyphens and spaces
      isbn = isbn.replace(/[-\s]/g, "");

      // Basic ISBN validation (10 or 13 digits)
      if (!/^(\d{10}|\d{13}|\d{9}X)$/i.test(isbn)) {
        alert("Invalid ISBN format. Please enter a valid 10 or 13 digit ISBN.");
        return;
      }

      try {
        // Try Open Library API first
        const response = await fetch(
          `https://openlibrary.org/api/books?bibkeys=ISBN:${isbn}&format=json&jscmd=data`,
        );
        const data = await response.json();
        const bookData = data[`ISBN:${isbn}`];

        if (bookData) {
          // Extract authors
          let authors = "";
          if (bookData.authors && bookData.authors.length > 0) {
            authors = bookData.authors
              .map((a: { name?: string } | string) => (typeof a === "string" ? a : a.name))
              .join(" & ");
          } else if (bookData.by_statement) {
            authors = bookData.by_statement;
          }

          // Extract publisher
          let publisher = "";
          if (bookData.publishers && bookData.publishers.length > 0) {
            const pub = bookData.publishers[0];
            publisher = typeof pub === "string" ? pub : pub.name;
          }

          // Extract year
          let year = "";
          if (bookData.publish_date) {
            const yearMatch = bookData.publish_date.match(/\b(19|20)\d{2}\b/);
            if (yearMatch) {
              year = yearMatch[0];
            }
          }

          // Update the reading list item
          if (authors) {
            item.author = authors;
          }
          if (bookData.title) {
            item.title = bookData.title;
          }
          if (publisher) {
            item.publisher = publisher;
          }
          if (year) {
            item.year = year;
          }

          updateProgramme({ modules });
          saveDebounced(updateFlagsAndHeader);
        } else {
          // Try Google Books API as fallback
          const gResponse = await fetch(
            `https://www.googleapis.com/books/v1/volumes?q=isbn:${isbn}`,
          );
          const gData = await gResponse.json();

          if (gData.items && gData.items.length > 0) {
            const vol = gData.items[0].volumeInfo;

            if (vol.authors) {
              item.author = vol.authors.join(" & ");
            }
            if (vol.title) {
              item.title = vol.title;
            }
            if (vol.publisher) {
              item.publisher = vol.publisher;
            }
            if (vol.publishedDate) {
              const yearMatch = vol.publishedDate.match(/\d{4}/);
              if (yearMatch) {
                item.year = yearMatch[0];
              }
            }

            updateProgramme({ modules });
            saveDebounced(updateFlagsAndHeader);
          } else {
            alert("Book not found. Please check the ISBN or enter details manually.");
          }
        }
      } catch (err) {
        console.error("ISBN lookup error:", err);
        alert("Failed to look up ISBN. Please check your connection or enter details manually.");
      }
    },
    [programme.modules, updateProgramme, saveDebounced, updateFlagsAndHeader],
  );

  const toggleModule = useCallback((moduleId: string) => {
    setExpandedModules((prev) => {
      const next = new Set(prev);
      if (next.has(moduleId)) {
        next.delete(moduleId);
      } else {
        next.add(moduleId);
      }
      return next;
    });
  }, []);

  // ============================================================================
  // Render
  // ============================================================================

  return (
    <SectionCard title="Reading Lists" icon="books">
      <Alert variant="light" icon="lightbulb" className="mb-3">
        Define core and recommended reading for each module. Items published more than 5 years ago
        will be flagged for review.
      </Alert>

      {/* Module picker for MODULE_EDITOR mode */}
      {canPickModule && (
        <Row className="g-3 mb-3">
          <Col md={6}>
            <Form.Label className="fw-semibold" htmlFor="readingListModulePicker">
              Assigned module
            </Form.Label>
            <Form.Select
              id="readingListModulePicker"
              value={selectedId}
              onChange={(e) => handleModulePickerChange(e.target.value)}
              aria-label="Select module for reading list"
              data-testid="reading-list-module-picker"
            >
              {modulesForEdit.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.code ? `${m.code} — ` : ""}
                  {m.title}
                </option>
              ))}
            </Form.Select>
          </Col>
        </Row>
      )}

      {modulesForEdit.length === 0 ? (
        <Alert variant="info" className="mb-0">
          <Icon name="info" className="me-2" aria-hidden />
          No modules available.
        </Alert>
      ) : (
        <>
          <Accordion
            id="readingAccordion"
            defaultExpandedKeys={Array.from(expandedModules)}
            data-testid="reading-accordion"
          >
            <AccordionControls accordionId="readingAccordion" />
            {modulesForEdit.map((m) => {
              const isHidden = isModuleEditor && editableIds.length > 1 && m.id !== selectedId;
              if (isHidden) {
                return null;
              }

              const readingList = m.readingList ?? [];
              const oldCount = readingList.filter((item) => {
                const yearNum = Number(item.year) || 0;
                return yearNum > 0 && currentYear - yearNum > 5;
              }).length;

              const moduleTitle = (m.code ? `${m.code} — ` : "") + m.title;
              const subtitle = (
                <div className="d-flex gap-2 align-items-center">
                  {oldCount > 0 && <Badge bg="warning">{oldCount} outdated</Badge>}
                  <Badge bg="secondary">
                    {readingList.length} item{readingList.length !== 1 ? "s" : ""}
                  </Badge>
                </div>
              );

              return (
                <AccordionItem
                  key={m.id}
                  eventKey={m.id}
                  title={moduleTitle}
                  subtitle={subtitle}
                  subtitlePosition="right"
                  data-testid={`reading-module-${m.id}`}
                >
                  <div className="small text-secondary mb-3">
                    Add core and recommended reading for this module. Resources older than 5 years
                    will be flagged.
                  </div>

                  {readingList.length === 0 ? (
                    <div className="small text-secondary mb-2">No reading list items yet.</div>
                  ) : (
                    readingList.map((item, i) => (
                      <ReadingItemCard
                        key={item.id || `${m.id}-${i}`}
                        item={item}
                        index={i}
                        moduleId={m.id}
                        currentYear={currentYear}
                        onFieldChange={handleFieldChange}
                        onRemove={handleRemoveReading}
                        onIsbnLookup={handleIsbnLookup}
                      />
                    ))
                  )}

                  <Button
                    variant="outline-secondary"
                    size="sm"
                    onClick={() => handleAddReading(m.id)}
                    aria-label={`Add reading item to ${m.title}`}
                    data-testid={`reading-add-${m.id}`}
                  >
                    <Icon name="plus" aria-hidden /> Add reading
                  </Button>
                </AccordionItem>
              );
            })}
          </Accordion>
        </>
      )}
    </SectionCard>
  );
};

export default ReadingListsStep;
