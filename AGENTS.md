# AGENTS.md

Guidelines for AI coding agents working with this codebase.

## Project Overview

**QQI Programme Design Studio** — A web application for designing academic programmes compliant with Quality and Qualifications Ireland (QQI) standards.

- **Tech Stack**: React 18, TypeScript (strict mode), Vite, Bootstrap 5 + react-bootstrap, Vitest, Playwright
- **UI Framework**: React with functional components, hooks, and react-bootstrap
- **State Management**: Mutable singleton store (`src/state/store.ts`) with `useProgramme()` hook for React re-renders
- **Type Checking**: TypeScript in strict mode — all source files are `.ts`/`.tsx` (no `.js` in `src/`)
- **Styling**: Bootstrap 5 utilities and CSS classes (no inline styles)
- **Icons**: [Phosphor Icons](https://phosphoricons.com/) via CSS classes

## Commands

```bash
npm run dev            # Start dev server
npm run build          # Production build to dist/

# Testing
npm run test:unit      # Run Vitest unit tests
npm run test:unit:watch # Run Vitest in watch mode
npm run test:coverage  # Run unit tests with coverage report
npm run test:e2e       # Run Playwright end-to-end tests

# Code quality
npm run format         # Format code with Prettier
npm run format:check   # Check formatting without changes
npx tsc --noEmit       # TypeScript type checking
npx eslint "src/**/*.{ts,tsx}" "e2e/**/*.js"  # Lint checking
```

## Directory Structure

```text
src/
├── App.tsx                    # Root React component (step routing, layout)
├── index.tsx                  # Entry point (React root, theme, state load)
├── template.ts                # Template page entry point (schedule/descriptor export)
├── style.css                  # Global styles
├── types.d.ts                 # Global TypeScript type definitions
├── components/
│   ├── react/                 # App-level React components
│   │   ├── Header.tsx         # App header (title, import/export, theme)
│   │   ├── Sidebar.tsx        # Step navigation sidebar
│   │   ├── Flags.tsx          # Validation warnings panel
│   │   ├── NavButtons.tsx     # Next/Previous step buttons
│   │   └── index.ts           # Barrel export
│   ├── steps/react/           # Wizard step components (14 steps)
│   │   ├── IdentityStep.tsx   # Programme identity (title, award, NFQ level)
│   │   ├── OutcomesStep.tsx   # Programme Learning Outcomes (PLOs)
│   │   ├── VersionsStep.tsx   # Programme versions and delivery modes
│   │   ├── StagesStep.tsx     # Stage/year structure
│   │   ├── StructureStep.tsx  # Modules (credits, code, title)
│   │   ├── ElectivesStep.tsx  # Elective group definitions
│   │   ├── MimlosStep.tsx     # Module learning outcomes
│   │   ├── AssessmentsStep.tsx
│   │   ├── ReadingListsStep.tsx
│   │   ├── EffortHoursStep.tsx
│   │   ├── ScheduleStep.tsx
│   │   ├── MappingStep.tsx    # PLO ↔ MIMLO mapping
│   │   ├── TraceabilityStep.tsx # Traceability matrix + Sankey diagram
│   │   └── SnapshotStep.tsx   # QQI export summary
│   └── ui/                    # Reusable UI components
│       ├── Accordion/         # Custom accordion (Accordion, AccordionItem, AccordionControls)
│       ├── Form/              # Form components (FormField, FormInput, FormSelect)
│       ├── Alert.tsx          # Warning/info alert
│       ├── Icon.tsx           # Phosphor icon wrapper
│       ├── SectionCard.tsx    # Card wrapper for step sections
│       └── index.ts           # Barrel export
├── hooks/
│   └── useStore.ts            # useProgramme() hook for React state sync
├── state/
│   └── store.ts               # Central state management (singleton, localStorage)
├── utils/
│   ├── validation.ts          # Programme validation rules
│   ├── helpers.ts             # Formatting, delivery patterns, MIMLO/PLO utils
│   ├── migrate-programme.ts   # Schema migration (v1→v2→v3→v4)
│   ├── dom.ts                 # escapeHtml, tagHtml
│   └── uid.ts                 # Unique ID generation
├── lib/
│   └── lo-lint.ts             # Learning outcome linter (vague verb detection)
├── export/
│   ├── json.ts                # Import/export programme JSON
│   ├── word.ts                # Word document export (docxtemplater)
│   └── schedule-docx.ts       # Schedule DOCX export (docx.js)
├── reports/
│   └── assessment-reports.ts  # Assessment report HTML generation
├── template/
│   ├── schedule-html.ts       # Schedule table HTML rendering
│   └── module-descriptors-html.ts  # Module descriptor HTML rendering
└── test/
    └── setup.ts               # Vitest test setup

e2e/                           # Playwright end-to-end tests
├── XX-feature.spec.js         # Numbered test files
└── fixtures/                  # Test data and helpers
    ├── test-fixtures.js       # Custom test helpers (loadProgrammeData, getProgrammeData)
    └── test-data.js           # Sample programme data
```

## Coding Conventions

### TypeScript Style

```typescript
// K&R style braces — ALWAYS use braces, even for single statements
function example() {
  if (condition) {
    return value; // ✅ Correct — has braces
  }
  // if (condition) return value;  // ❌ Wrong — missing braces
}

// ES2022+ syntax required
const arr = data ?? []; // Nullish coalescing
obj.prop ??= defaultValue; // Nullish assignment
value?.nested?.prop; // Optional chaining

// Explicit type annotations on all exported functions
export function findModule(p: Programme, id: string): Module | undefined {
  return (p.modules ?? []).find((m) => m.id === id);
}

// Import without file extensions (bundler resolution)
import { uid } from "../utils/uid";
import { state, saveDebounced } from "../state/store";
```

### React Components

```tsx
// Functional components with explicit types
interface MyStepProps {
  onSave?: () => void;
}

export const MyStep: React.FC<MyStepProps> = ({ onSave }) => {
  const { programme, updateProgramme } = useProgramme();

  return (
    <SectionCard title="My Step" icon="ph-gear">
      {/* content */}
    </SectionCard>
  );
};

// Use react-bootstrap components, not raw HTML
import { Button, Form, Badge, ButtonGroup } from "react-bootstrap";

// Use data-testid for testable elements
<Button data-testid="add-module-btn" onClick={handleAdd}>
  <i className="ph ph-plus" aria-hidden="true" /> Add Module
</Button>;
```

### Accordion Pattern

The codebase uses a custom `Accordion` component wrapping react-bootstrap. Key rules:

```tsx
import { Accordion, AccordionItem, AccordionControls } from "../../ui/Accordion";

// AccordionControls MUST be inside <Accordion> to access context
<Accordion
  id="modulesAccordion"
  defaultExpandedKeys={[firstModuleId]}
>
  <AccordionControls />  {/* ✅ Inside Accordion */}
  {modules.map((mod) => (
    <AccordionItem
      key={mod.id}
      eventKey={mod.id}
      title={mod.title}
      subtitle={`${mod.credits} credits`}
      headerActions={<Badge>{mod.mimlos?.length ?? 0} MIMLOs</Badge>}
    >
      {/* Item content */}
    </AccordionItem>
  ))}
</Accordion>

// ❌ WRONG — controls outside Accordion cannot access context
<AccordionControls />
<Accordion id="myAccordion">...</Accordion>
```

## Type System

Types are defined in `src/types.d.ts` as global declarations. Key interfaces:

- **Programme** — Root data structure with all programme information
- **Module** — Individual module (code, title, credits, assessments, mimlos)
- **PLO** — Programme Learning Outcome with standard mappings
- **ProgrammeVersion** — Version with stages, delivery mode, patterns
- **Stage** — Year/stage with assigned modules
- **ModuleAssessment** — Assessment with type, weighting, integrity options
- **ElectiveDefinition** / **ElectiveGroup** — Elective structure

These types are globally available — do **not** import them.

### Adding New Properties

1. Add to `types.d.ts` with appropriate type
2. Make optional if not always present: `newProp?: string`
3. Use nullish coalescing when accessing: `obj.newProp ?? defaultValue`

## State Management

```typescript
import { state, saveDebounced, saveNow } from "../state/store";
import { useProgramme } from "../hooks/useStore";

// In React components — use the hook for reactive updates
const { programme, updateProgramme } = useProgramme();

// Direct state access (for non-React code or read-only)
const p = state.programme;

// Save patterns
saveDebounced(); // 400ms debounce for text inputs
saveDebounced(() => {
  /* callback after save */
});
saveNow(); // Immediate save for critical operations
```

## Testing

### Unit Tests (Vitest + React Testing Library)

Unit tests live alongside source files as `*.test.ts` / `*.test.tsx`.

```typescript
// src/utils/myUtil.test.ts
import { describe, expect, it, vi } from "vitest";
import { myFunction } from "./myUtil";

describe("myFunction", () => {
  it("does the thing", () => {
    expect(myFunction("input")).toBe("expected");
  });
});
```

```tsx
// src/components/steps/react/MyStep.test.tsx
import { render, screen, fireEvent, act } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { MyStep } from "./MyStep";

// Mock the store
vi.mock("../../../state/store", async () => {
  const actual = await vi.importActual("../../../state/store");
  return { ...actual, saveNow: vi.fn() };
});
```

### Code Coverage

The project enforces **90% code coverage thresholds** across all metrics (statements, branches, functions, lines) via `vitest.config.ts`. When adding new code, ensure comprehensive tests are written to maintain this standard. Run `npm run test:coverage` to check coverage.

### E2E Tests (Playwright)

E2E tests are in `e2e/` and use custom fixtures:

```javascript
import { test, expect, loadProgrammeData, getProgrammeData } from "./fixtures/test-fixtures.js";

test("should load and edit programme", async ({ page }) => {
  await loadProgrammeData(page, testData);
  await page.getByTestId("step-structure").click();
  await page.waitForTimeout(300);
  await page.getByTestId("add-module-btn").click();
  await page.waitForTimeout(600); // 400ms debounce + buffer
  const data = await getProgrammeData(page);
  expect(data.modules.length).toBe(1);
});
```

Key E2E patterns:

- Use `data-testid` selectors (not labels — flags panel causes duplicates)
- Wait 600ms after actions for debounced save
- Use `loadProgrammeData()` / `getProgrammeData()` for state setup/verification
- Each test starts with cleared localStorage

## Git Workflow

### Commit Early, Often, and Atomically

**This is critical.** Every commit must be a small, self-contained unit of work that passes all checks independently.

- **Atomic commits**: One logical change per commit (e.g., adding a type, adding a utility function, updating a single component). Never batch unrelated changes.
- **Green state**: Every commit must compile, lint, and pass unit tests. Never leave the repo broken between commits.
- **Conventional Commits** format is mandatory:
  - `feat(scope): description` — new features
  - `fix(scope): description` — bug fixes
  - `refactor(scope): description` — non-functional changes
  - `test(scope): description` — adding or updating tests
  - `docs(scope): description` — documentation only
  - Scope examples: `identity`, `structure`, `mapping`, `export`, `validation`, `e2e`, `ui`, `state`
- **Before each commit**, run the validation checklist (see below). Do not commit code that fails unit tests.
- Branch names: `feat/short-description`, `fix/short-description`, `refactor/short-description`

### Pull Requests

On completion of a task, **raise a pull request** against the target branch.

- The PR title should follow Conventional Commits format
- The PR description must include:
  - A summary of the changes made
  - Screenshots of any visual changes — inject these as **base64-encoded images** directly in the PR description markdown (e.g., `![Description](data:image/png;base64,...)`)
  - **Do not commit screenshot files** to the repository
- To capture screenshots for the PR, use Playwright's browser automation to navigate to relevant pages and take screenshots, then base64-encode the image data and embed it in the PR description

## Validation Checklist

Run these checks before **every** commit:

1. **Unit tests pass**: `npm run test:unit` — all tests green
2. **Build succeeds**: `npm run build` — no compilation errors
3. **Formatting clean**: `npm run format` (or `npm run format:check`)
4. **TypeScript clean**: `npx tsc --noEmit` — no type errors in source code

For final validation before raising a PR, also run:

5. **E2E tests pass**: `npm run test:e2e` (requires dev server running)
6. **Coverage maintained**: `npm run test:coverage` — meets 90% thresholds

## Do's and Don'ts

### ✅ Do

- Write unit tests for all new code — maintain 90% coverage
- Commit early, often, and atomically — one logical change per commit
- Run unit tests before every commit
- Use existing UI components from `src/components/ui/`
- Use existing helpers from `src/utils/`
- Follow nullish coalescing patterns (`??`, `??=`)
- Use `data-testid` attributes for testable elements
- Use `escapeHtml()` for any user content rendered as raw HTML
- Use K&R style braces (opening brace on same line as statement)
- Use Phosphor icon classes with `aria-hidden="true"` for decorative icons
- Place `AccordionControls` inside `<Accordion>` (never outside)

### ❌ Don't

- Commit code that fails unit tests
- Batch unrelated changes into a single commit
- Use `@ts-nocheck` or `@ts-ignore` without strong justification
- Use `||` for null/undefined checks (use `??` instead)
- Skip null guards on optional array properties
- Add dependencies without clear justification
- Modify `types.d.ts` without updating affected code
- Use inline styles (use Bootstrap utilities or CSS classes)
- Use Allman style braces (opening brace on its own line)
- Create `.js` files in `src/` — all source must be TypeScript
- Import files with `.js` extension — use extensionless imports
- Place `AccordionControls` outside `<Accordion>` — it needs context

## Common Tasks

### Adding a New Step Component

1. Create `src/components/steps/react/NewStep.tsx` with a React functional component
2. Create `src/components/steps/react/NewStep.test.tsx` with comprehensive tests
3. Register in `STEP_COMPONENTS` in `src/App.tsx`
4. Add step definition to `steps` array in `src/state/store.ts`

### Adding a New Field to Programme

1. Add type to `Programme` interface in `types.d.ts`
2. Initialize in `defaultProgramme()` in `store.ts` if needed
3. Handle in migration if loading old data (`migrate-programme.ts`)
4. Add UI in appropriate step component
5. Add validation rules in `validation.ts` if applicable
6. Write tests for each change

### Adding a New UI Component

1. Create `src/components/ui/NewComponent.tsx`
2. Create `src/components/ui/NewComponent.test.tsx`
3. Export from `src/components/ui/index.ts`
4. Prefer react-bootstrap primitives where possible

### UID Generation

Always use `uid()` for generating unique identifiers:

```typescript
import { uid } from "../utils/uid";

const moduleId = uid("mod"); // "mod_550e8400-e29b-..."
const ploId = uid("plo"); // "plo_550e8400-e29b-..."
const assessmentId = uid("asm"); // "asm_550e8400-e29b-..."
```

### Validation System

```typescript
import { validateProgramme } from "../utils/validation";
import type { ValidationFlag } from "../utils/validation";

const flags: ValidationFlag[] = validateProgramme(state.programme);
// Returns: Array<{ type: "error" | "warn"; msg: string; step: string }>
```

### Application Modes

```typescript
import { setMode, activeSteps } from "../state/store";

setMode("PROGRAMME_OWNER"); // Full access
setMode("MODULE_EDITOR", ["mod_abc", "mod_def"]); // Restricted
const steps = activeSteps(); // Returns filtered step list for current mode
```

## Planning Large Changes

When a task spans multiple files or introduces a new subsystem:

1. **Plan first.** Outline the phases and atomic steps before writing code.
2. **Small steps within phases.** Each commit should compile, lint, and pass tests on its own.
3. **Maintain green state.** Never leave the repo in a broken state between commits — if a refactor temporarily breaks imports, fix them in the same commit.
4. **Verify after each phase.** Run the full validation checklist before continuing to the next phase.
5. **Raise a PR on completion** with screenshots of any visual changes.

## Common Pitfalls

- **Debounced save timing in tests:** When testing user input, wait 600ms after actions for the debounced save (400ms) to complete plus buffer time.
- **AccordionControls outside Accordion:** `AccordionControls` uses `useContext(AccordionContext)` — if placed outside `<Accordion>`, the context is null and expand/collapse all silently does nothing.
- **Missing null guards:** Always use `??` or `??=` for optional arrays before iteration: `(p.modules ?? []).forEach(...)`.
- **HTML escaping:** Always use `escapeHtml()` for user-provided content rendered as raw HTML to prevent XSS.
- **Test selector conflicts:** Use `data-testid` attributes rather than labels — the flags panel can cause duplicate label matches.
- **File extensions in imports:** Never use `.js` or `.ts` extensions in import paths — use extensionless imports with bundler resolution.
- **Store mock paths in tests:** When mocking the store in tests with `vi.mock(...)`, use the extensionless path (e.g., `"../../../state/store"` not `"../../../state/store.js"`).

## Dependencies Policy

- Do **not** add new packages without clear justification — prefer the existing stack.
- Prefer lightweight, well-maintained packages over large frameworks.
- Pin major versions in `package.json` (e.g., `"vite": "^5.0.0"` not `"*"`).
- After installing a new dependency, run the full validation checklist to ensure nothing breaks.
