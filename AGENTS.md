# AGENTS.md

Guidelines for AI coding agents working with this codebase.

## Project Overview

**QQI Programme Design Studio** — A web application for designing academic programmes compliant with Quality and Qualifications Ireland (QQI) standards.

- **Tech Stack**: Vanilla JavaScript (ES2022+), Vite, Bootstrap 5, Playwright
- **Type Checking**: TypeScript via JSDoc annotations (strict mode)
- **No Framework**: Manual DOM manipulation, component-based architecture

## Commands

```bash
npm run dev          # Start dev server at http://localhost:5173
npm run build        # Production build to dist/
npm run test:e2e     # Run Playwright end-to-end tests

# TypeScript checking (run after changes)
npx tsc -p jsconfig.json --noEmit
```

## Directory Structure

```text
src/
├── components/
│   ├── steps/           # Wizard step components (16 files)
│   │   ├── identity.js  # Programme identity (title, award, NFQ level)
│   │   ├── outcomes.js  # Programme Learning Outcomes (PLOs)
│   │   ├── versions.js  # Programme versions and delivery modes
│   │   ├── stages.js    # Stage/year structure
│   │   ├── structure.js # Modules (credits, code, title)
│   │   ├── electives.js # Elective group definitions
│   │   ├── mimlos.js    # Module learning outcomes
│   │   ├── assessments.js
│   │   ├── reading-lists.js
│   │   ├── effort-hours.js
│   │   ├── schedule.js
│   │   ├── mapping.js   # PLO ↔ Module mapping
│   │   ├── traceability.js
│   │   ├── snapshot.js  # QQI export summary
│   │   ├── shared.js    # Shared utilities
│   │   └── index.js     # Step registry
│   ├── header.js
│   ├── steps.js         # Sidebar navigation
│   ├── flags.js         # Validation warnings
│   ├── nav.js           # Next/Previous buttons
│   └── dev-mode.js
├── export/
│   ├── json.js          # Import/export JSON
│   └── word.js          # Word document export
├── lib/
│   └── lo-lint.js       # Learning outcome linter
├── reports/
│   └── assessment-reports.js
├── state/
│   └── store.js         # Central state management
├── utils/
│   ├── helpers.js
│   ├── validation.js
│   ├── migrate-programme.js
│   ├── dom.js
│   └── uid.js
├── types.d.ts           # TypeScript type definitions
├── main.js              # Application entry point
└── style.css

e2e/                     # Playwright tests
├── XX-feature.spec.js   # Numbered test files
└── fixtures/            # Test data
```

## Coding Conventions

### JavaScript Style

```javascript
// @ts-check at top of every file
// @ts-check

// ES2022+ syntax required
const arr = data ?? [];           // Nullish coalescing
obj.prop ??= defaultValue;        // Nullish assignment
value?.nested?.prop;              // Optional chaining

// JSDoc for all exported functions
/**
 * Brief description of what the function does.
 *
 * @param {Programme} p - The programme data
 * @param {string} id - The module ID
 * @returns {Module | undefined} The found module
 */
export function findModule(p, id) {
  return (p.modules ?? []).find(m => m.id === id);
}

// Inline type casts for callbacks
(p.modules ?? []).forEach((/** @type {Module} */ m) => {
  // m is typed as Module here
});

// DOM element casting
const input = /** @type {HTMLInputElement} */ (document.getElementById('myInput'));
```

### HTML Templates

```javascript
// Always escape user content
import { escapeHtml } from '../utils/dom.js';

const html = `
  <div class="card">
    <h5>${escapeHtml(module.title)}</h5>
    <p>${escapeHtml(module.description ?? '')}</p>
  </div>
`;

// Use data-* attributes for event binding
const button = `<button data-remove-module="${m.id}">Remove</button>`;

// Wire events after rendering
document.querySelectorAll('[data-remove-module]').forEach(btn => {
  /** @type {HTMLElement} */ (btn).onclick = () => {
    const id = btn.getAttribute('data-remove-module');
    // handle removal
  };
});
```

## Type System

Types are defined in `src/types.d.ts`. Key interfaces:

- **Programme** — Root data structure with all programme information
- **Module** — Individual module (code, title, credits, assessments, mimlos)
- **PLO** — Programme Learning Outcome with standard mappings
- **ProgrammeVersion** — Version with stages, delivery mode, patterns
- **Stage** — Year/stage with assigned modules
- **ModuleAssessment** — Assessment with type, weighting, integrity options

### Adding New Properties

1. Add to `types.d.ts` with appropriate type
2. Make optional if not always present: `newProp?: string`
3. Use nullish coalescing when accessing: `obj.newProp ?? defaultValue`

## State Management

```javascript
import { state, saveDebounced } from '../state/store.js';

// Access programme data
const p = state.programme;

// Modify and save
p.title = 'New Title';
saveDebounced();  // Debounced save to localStorage

// Trigger re-render
window.render?.();
```

### Important State Patterns

```javascript
// Always ensure arrays exist before use
if (!p.modules) p.modules = [];
// Or use nullish assignment
p.modules ??= [];

// Safe iteration
(p.modules ?? []).forEach(m => { /* ... */ });

// Finding items
const module = (p.modules ?? []).find(m => m.id === targetId);
```

## Testing

Tests use Playwright in `e2e/` directory.

```javascript
// e2e/XX-feature.spec.js
import { test, expect } from '@playwright/test';

test('should do something', async ({ page }) => {
  await page.goto('/');
  
  // Use data-testid for selectors
  await page.click('[data-testid="add-module-btn"]');
  await expect(page.locator('[data-testid="module-item"]')).toHaveCount(1);
});
```

Run tests:

```bash
# Start dev server first (in separate terminal)
npm run dev

# Run tests
npm run test:e2e
```

## Do's and Don'ts

### ✅ Do

- Run `npm run build` after changes to verify compilation
- Run `npx tsc -p jsconfig.json --noEmit` to check types
- Use existing helpers from `src/utils/`
- Follow nullish coalescing patterns (`??`, `??=`)
- Add JSDoc comments to new functions
- Use `data-testid` attributes for testable elements
- Escape HTML with `escapeHtml()` for user content

### ❌ Don't

- Use `@ts-nocheck` or `@ts-ignore` without strong justification
- Use `||` for null/undefined checks (use `??` instead)
- Skip null guards on optional array properties
- Add dependencies without clear justification
- Modify `types.d.ts` without updating affected code
- Use inline styles (use Bootstrap utilities or CSS classes)

## Common Tasks

### Adding a New Step Component

1. Create `src/components/steps/new-step.js`
2. Export `renderNewStep()` and `wireNewStep()` functions
3. Register in `src/components/steps/index.js`
4. Add step definition to `STEPS` array in `src/components/steps.js`

### Adding a New Field to Programme

1. Add type to `Programme` interface in `types.d.ts`
2. Initialize in `defaultProgramme()` in `store.js` if needed
3. Handle in migration if loading old data (`migrate-programme.js`)
4. Add UI in appropriate step component

## UI Patterns

### Accordion Pattern

This codebase uses Bootstrap 5 accordions extensively for expandable/collapsible content. Follow these patterns for consistency:

#### Basic Accordion Structure

```javascript
import { accordionControlsHtml, wireAccordionControls, captureOpenCollapseIds, updateAccordionHeader } from './shared.js';

// Before rendering, capture which items are expanded (preserves state across re-renders)
const openCollapseIds = captureOpenCollapseIds('myAccordionId');

// Render accordion with expand/collapse all controls
const html = `
  ${accordionControlsHtml('myAccordionId')}
  <div class="accordion" id="myAccordionId" aria-labelledby="my-heading">
    ${items.map((item, idx) => renderAccordionItem(item, idx, openCollapseIds)).join('')}
  </div>
`;

// Wire up the expand/collapse all buttons after rendering
wireAccordionControls('myAccordionId');
```

#### Accordion Item with Header Actions

Header actions (Remove buttons, Add buttons, badges, etc.) are positioned to the right of the expand/collapse content using a flex layout. Actions are placed **inside** the accordion-button.

**⚠️ IMPORTANT: Use `<span role="button">`, not `<button>`**

HTML does not allow `<button>` elements nested inside other `<button>` elements. If you use a `<button>` for header actions, the browser will move it outside the accordion-button, breaking the layout. Always use `<span>` with `role="button"` and `tabindex="0"` for accessibility:

```javascript
function renderAccordionItem(item, idx, openCollapseIds) {
  const headingId = `item_${item.id}_heading`;
  const collapseId = `collapse_item_${item.id}`;
  const isActive = openCollapseIds.has(collapseId) || (openCollapseIds.size === 0 && idx === 0);
  
  return `
    <div class="accordion-item bg-body" data-testid="item-${item.id}">
      <h2 class="accordion-header" id="${headingId}">
        <button class="accordion-button ${isActive ? '' : 'collapsed'} w-100" 
                type="button" 
                data-bs-toggle="collapse" 
                data-bs-target="#${collapseId}" 
                aria-expanded="${isActive}" 
                aria-controls="${collapseId}"
                data-testid="item-accordion-${item.id}">
          <div class="d-flex w-100 align-items-center gap-2">
            <!-- Main content (grows to fill space) -->
            <div class="flex-grow-1">
              <div class="fw-semibold">${escapeHtml(item.title)}</div>
              <div class="small text-secondary">${escapeHtml(item.subtitle)}</div>
            </div>
            <!-- Header actions (positioned right, before expand icon) -->
            <div class="header-actions d-flex align-items-center gap-2 me-2">
              <!-- ✅ CORRECT: Use <span> with role="button" -->
              <span class="btn btn-sm btn-outline-primary" role="button" tabindex="0"
                    data-add-subitem="${item.id}" 
                    aria-label="Add subitem to ${escapeHtml(item.title)}"
                    data-testid="add-subitem-${item.id}">
                <i class="ph ph-plus" aria-hidden="true"></i> Add
              </span>
              <span class="badge text-bg-success">Status OK</span>
              <span class="btn btn-sm btn-outline-danger" role="button" tabindex="0"
                    data-remove-item="${item.id}" 
                    aria-label="Remove ${escapeHtml(item.title)}"
                    data-testid="remove-item-${item.id}">
                <i class="ph ph-trash" aria-hidden="true"></i> Remove
              </span>
              <!-- ❌ WRONG: Do NOT use <button> - browser will move it outside -->
            </div>
          </div>
        </button>
      </h2>
      <div id="${collapseId}" class="accordion-collapse collapse ${isActive ? 'show' : ''}" 
           aria-labelledby="${headingId}">
        <div class="accordion-body">
          <!-- Accordion content here -->
        </div>
      </div>
    </div>
  `;
}
```

#### Key Accordion Patterns

1. **Preserve expansion state**: Use `captureOpenCollapseIds()` before re-rendering and check against it when setting `isActive`
2. **Default first item open**: When `openCollapseIds` is empty, default to opening the first item: `(openCollapseIds.size === 0 && idx === 0)`
3. **Header actions layout**: Use `d-flex w-100 align-items-center gap-2` on a wrapper div inside the accordion-button
4. **Action positioning**: Use `flex-grow-1` on main content and place actions in a `header-actions` div with `me-2` margin
5. **Expand/collapse all**: Always include `accordionControlsHtml(accordionId)` above the accordion
6. **In-place header updates**: Use `updateAccordionHeader(headingId, { title, subtitle })` from `shared.js` to update headers without re-rendering (preserves input focus)
7. **Use `<span role="button">` for actions**: Never use `<button>` inside the accordion-button - use `<span>` with `role="button"` and `tabindex="0"`

#### Wiring Header Action Event Handlers

Since header actions use `<span>` instead of `<button>`, you must handle both click and keyboard events for accessibility:

```javascript
// Wire action buttons (use stopPropagation to prevent accordion toggle)
document.querySelectorAll('[data-add-subitem]').forEach(btn => {
  const handler = (e) => {
    e.stopPropagation(); // Prevent accordion toggle
    const id = btn.getAttribute('data-add-subitem');
    // Handle add action...
  };
  /** @type {HTMLElement} */ (btn).onclick = handler;
  /** @type {HTMLElement} */ (btn).onkeydown = (/** @type {KeyboardEvent} */ e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handler(e);
    }
  };
});

// Same pattern for remove buttons
document.querySelectorAll('[data-remove-item]').forEach(btn => {
  const handler = (e) => {
    e.stopPropagation();
    const id = btn.getAttribute('data-remove-item');
    // Handle removal...
  };
  /** @type {HTMLElement} */ (btn).onclick = handler;
  /** @type {HTMLElement} */ (btn).onkeydown = (/** @type {KeyboardEvent} */ e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handler(e);
    }
  };
});
```

### Debugging

```javascript
// Programme state is exposed for debugging
console.log(window.__pds_state?.programme);

// Or in browser console
__pds_state.programme
```

### Icons

This project uses [Phosphor Icons](https://phosphoricons.com/) via CSS classes. Always include `aria-hidden="true"` for decorative icons:

```javascript
// Icon with text (decorative)
`<button><i class="ph ph-plus" aria-hidden="true"></i> Add Item</button>`

// Common icons used:
// ph-plus         Add/create
// ph-trash        Remove/delete
// ph-warning      Error/warning
// ph-arrow-right  Navigation indicator
// ph-download-simple  Export/download
// ph-sun / ph-moon    Theme toggle
// ph-arrows-out-simple / ph-arrows-in-simple  Expand/collapse
```

### Validation System

The `validateProgramme()` function in `src/utils/validation.js` returns an array of validation flags:

```javascript
import { validateProgramme } from '../utils/validation.js';

const flags = validateProgramme(state.programme);
// Returns: Array<{ type: "error" | "warn", msg: string, step: string }>

// Example flags:
// { type: "error", msg: "Programme title is missing.", step: "identity" }
// { type: "warn", msg: "Award type is missing.", step: "identity" }

// Render flags in the sidebar
import { renderFlags } from '../components/flags.js';
renderFlags(flags, goToStep);  // goToStep is a function(stepKey) that navigates
```

Validation is re-run on each `render()` call. To update flags after field changes without full re-render, call `renderFlags()` directly.

### Application Modes

The app supports two modes controlled by `state.programme.mode`:

```javascript
import { setMode, activeSteps } from '../state/store.js';

// PROGRAMME_OWNER (default) - Full access to all steps and editing
setMode("PROGRAMME_OWNER");

// MODULE_EDITOR - Restricted to specific steps and assigned modules
setMode("MODULE_EDITOR", ["mod_abc123", "mod_def456"]);

// Get currently visible steps (respects mode)
const steps = activeSteps();  // Returns filtered step list for current mode

// Check current mode
if (state.programme.mode === "MODULE_EDITOR") {
  // Show limited UI
}
```

Module Editor mode:
- Only shows steps: MIMLOs, Assessments, Mapping, Snapshot
- Only allows editing of assigned modules
- Locks programme-level fields (title, credits, PLOs, etc.)

### Dev Mode Toggle

Steps can include a toggle to switch between modes (only visible with `?dev=true` URL param):

```javascript
import { getDevModeToggleHtml, wireDevModeToggle } from '../dev-mode.js';

export async function renderMyStep() {
  const devModeToggleHtml = getDevModeToggleHtml();
  
  content.innerHTML = devModeToggleHtml + `
    <div class="card">
      <!-- Step content -->
    </div>
  `;
  
  // Wire the toggle to trigger re-render on mode change
  wireDevModeToggle(() => window.render?.());
  wireMyStep();
}
```

### UID Generation

Always use `uid()` for generating unique identifiers:

```javascript
import { uid } from '../utils/uid.js';

// Generate IDs with semantic prefixes
const moduleId = uid("mod");      // "mod_550e8400-e29b-..."
const ploId = uid("plo");         // "plo_550e8400-e29b-..."
const assessmentId = uid("asm");  // "asm_550e8400-e29b-..."
const groupId = uid("egrp");      // "egrp_550e8400-e29b-..."
const definitionId = uid("edef"); // "edef_550e8400-e29b-..."

// Use when creating new items
p.modules.push({
  id: uid("mod"),
  title: "New Module",
  credits: 0,
  // ...
});
```

### Save Patterns

Use `saveDebounced()` for input fields (400ms debounce), with optional callback for post-save actions:

```javascript
import { state, saveDebounced, saveNow } from '../state/store.js';

// For text inputs - debounced to avoid excessive saves during typing
input.addEventListener('input', (e) => {
  state.programme.title = e.target.value;
  saveDebounced(() => {
    // Optional: update flags or UI after save completes
    updateFlagsAndHeader();
  });
});

// For selects/checkboxes - can save immediately if preferred
select.onchange = () => {
  state.programme.awardType = select.value;
  saveDebounced();  // Still use debounced for consistency
  window.render?.();  // Re-render to update dependent UI
};

// For critical operations - save immediately
saveNow();  // Synchronous save to localStorage
```

### Playwright Test Fixtures

Tests use custom fixtures from `e2e/fixtures/test-fixtures.js`:

```javascript
// Import custom test and helpers
import { test, expect, loadProgrammeData, getProgrammeData } from './fixtures/test-fixtures.js';
import { higherDiplomaComputing } from './fixtures/test-data.js';

test.describe('My Feature', () => {
  test('should load programme data', async ({ page }) => {
    // Load complete test programme (auto-reloads page)
    await loadProgrammeData(page, higherDiplomaComputing);
    
    // Verify data was loaded
    const data = await getProgrammeData(page);
    expect(data.title).toBe('Higher Diploma in Computing');
  });

  test('should start fresh', async ({ page }) => {
    // Each test starts with cleared localStorage automatically
    // Navigate to step using data-testid
    await page.getByTestId('step-structure').click();
    await page.waitForTimeout(300);
    
    // Add item and wait for debounced save
    await page.getByTestId('add-module-btn').click();
    await page.waitForTimeout(600);  // 400ms debounce + buffer
    
    // Verify in localStorage
    const data = await getProgrammeData(page);
    expect(data.modules.length).toBe(1);
  });
});
```

Key testing patterns:
- Use `data-testid` attributes, not labels (flags panel causes conflicts)
- Wait 600ms after actions for debounced save to complete
- Use `loadProgrammeData()` to set up test state
- Use `getProgrammeData()` to verify localStorage
