/**
 * Reading Lists step component
 * 
 * Fields: author, title, publisher, year, isbn, type (core/recommended/supplementary), notes
 * Features:
 * - Outdated warning: Resources older than 5 years show "⚠ X years old" badge
 * - ISBN lookup with Open Library API and Google Books fallback
 * - Type options: "Core / Essential", "Recommended", "Supplementary"
 * - Module-level summary showing outdated count and total item count
 * - Module picker for MODULE_EDITOR mode
 */

import { state, saveDebounced, editableModuleIds, getSelectedModuleId } from '../../state/store.js';
import { escapeHtml } from '../../utils/dom.js';
import { getDevModeToggleHtml, wireDevModeToggle } from '../dev-mode.js';
import { accordionControlsHtml, wireAccordionControls } from './shared.js';

/**
 * Render the Reading Lists step
 */
export function renderReadingListsStep() {
  const p = state.programme;
  const content = document.getElementById("content");
  if (!content) return;

  const devModeToggleHtml = getDevModeToggleHtml();
  const currentYear = new Date().getFullYear();

  const editableIds = editableModuleIds();
  const selectedId = getSelectedModuleId();
  const isModuleEditor = p.mode === "MODULE_EDITOR";
  const canPickModule = (isModuleEditor && editableIds.length > 1);
  const modulesForEdit = (p.modules || []).filter(m => editableIds.includes(m.id));

  const modulePicker = canPickModule ? `
    <div class="row g-3 mb-3">
      <div class="col-md-6">
        <label class="form-label fw-semibold">Assigned module</label>
        <select class="form-select" id="readingListModulePicker">
          ${modulesForEdit.map(m => `<option value="${m.id}" ${m.id === selectedId ? "selected" : ""}>${escapeHtml(m.code || "")} — ${escapeHtml(m.title || "")}</option>`).join("")}
        </select>
      </div>
    </div>
  ` : "";

  const blocks = modulesForEdit.map((m, idx) => {
    m.readingList = m.readingList || [];
    const isHidden = (isModuleEditor && editableIds.length > 1 && m.id !== selectedId);

    const items = m.readingList.map((item, i) => {
      const yearNum = Number(item.year) || 0;
      const isOld = yearNum > 0 && (currentYear - yearNum) > 5;
      const oldWarning = isOld ? `<span class="badge text-bg-warning ms-2" title="This resource is more than 5 years old">⚠ ${currentYear - yearNum} years old</span>` : '';
      
      return `
        <div class="card border-0 bg-light mb-2">
          <div class="card-body py-2">
            <div class="d-flex justify-content-between align-items-start mb-2">
              <div class="d-flex align-items-center gap-2">
                <span class="fw-semibold small">Resource ${i + 1}</span>
                ${oldWarning}
              </div>
              <button class="btn btn-outline-danger btn-sm" data-remove-reading="${m.id}" data-reading-index="${i}">Remove</button>
            </div>
            <div class="row g-2">
              <div class="col-md-4">
                <label class="form-label small">Author(s)</label>
                <input class="form-control form-control-sm" data-reading-field="author" data-reading-module="${m.id}" data-reading-index="${i}" value="${escapeHtml(item.author || '')}" placeholder="e.g., Smith, J. & Jones, M.">
              </div>
              <div class="col-md-4">
                <label class="form-label small">Title</label>
                <input class="form-control form-control-sm" data-reading-field="title" data-reading-module="${m.id}" data-reading-index="${i}" value="${escapeHtml(item.title || '')}" placeholder="Book or article title">
              </div>
              <div class="col-md-2">
                <label class="form-label small">Publisher</label>
                <input class="form-control form-control-sm" data-reading-field="publisher" data-reading-module="${m.id}" data-reading-index="${i}" value="${escapeHtml(item.publisher || '')}" placeholder="Publisher name">
              </div>
              <div class="col-md-2">
                <label class="form-label small">Year</label>
                <input type="number" min="1900" max="${currentYear + 1}" class="form-control form-control-sm" data-reading-field="year" data-reading-module="${m.id}" data-reading-index="${i}" value="${item.year || ''}" placeholder="${currentYear}">
              </div>
            </div>
            <div class="row g-2 mt-1">
              <div class="col-md-4">
                <label class="form-label small">ISBN <button type="button" class="btn btn-link btn-sm p-0 ms-1" data-lookup-isbn="${m.id}" data-isbn-index="${i}" title="Look up book details by ISBN">🔍 Lookup</button></label>
                <input class="form-control form-control-sm" data-reading-field="isbn" data-reading-module="${m.id}" data-reading-index="${i}" value="${escapeHtml(item.isbn || '')}" placeholder="e.g., 978-0-13-468599-1">
              </div>
              <div class="col-md-4">
                <label class="form-label small">Type</label>
                <select class="form-select form-select-sm" data-reading-field="type" data-reading-module="${m.id}" data-reading-index="${i}">
                  <option value="core" ${(item.type || 'core') === 'core' ? 'selected' : ''}>Core / Essential</option>
                  <option value="recommended" ${item.type === 'recommended' ? 'selected' : ''}>Recommended</option>
                  <option value="supplementary" ${item.type === 'supplementary' ? 'selected' : ''}>Supplementary</option>
                </select>
              </div>
              <div class="col-md-4">
                <label class="form-label small">Notes (optional)</label>
                <input class="form-control form-control-sm" data-reading-field="notes" data-reading-module="${m.id}" data-reading-index="${i}" value="${escapeHtml(item.notes || '')}" placeholder="e.g., Chapters 1-5">
              </div>
            </div>
          </div>
        </div>
      `;
    }).join('');

    // Count warnings for this module
    const oldCount = m.readingList.filter(item => {
      const yearNum = Number(item.year) || 0;
      return yearNum > 0 && (currentYear - yearNum) > 5;
    }).length;
    const warningBadge = oldCount > 0 ? `<span class="badge text-bg-warning">${oldCount} outdated</span>` : '';

    const headingId = `reading_${m.id}_heading`;
    const collapseId = `reading_${m.id}_collapse`;
    return `
      <div class="accordion-item bg-body" ${isHidden ? 'style="display:none"' : ''} data-module-card="${m.id}">
        <h2 class="accordion-header" id="${headingId}">
          <button class="accordion-button ${idx === 0 ? '' : 'collapsed'}" type="button" data-bs-toggle="collapse" data-bs-target="#${collapseId}" aria-expanded="${idx === 0}" aria-controls="${collapseId}">
            <div class="d-flex justify-content-between align-items-center w-100">
              <div class="fw-semibold">${escapeHtml((m.code ? m.code + ' — ' : '') + m.title)}</div>
              <div class="d-flex gap-2 align-items-center">
                ${warningBadge}
                <span class="badge text-bg-secondary">${m.readingList.length} item${m.readingList.length !== 1 ? 's' : ''}</span>
              </div>
            </div>
          </button>
        </h2>
        <div id="${collapseId}" class="accordion-collapse collapse ${idx === 0 ? 'show' : ''}" aria-labelledby="${headingId}">
          <div class="accordion-body">
            <div class="small text-secondary mb-3">Add core and recommended reading for this module. Resources older than 5 years will be flagged.</div>
            ${items || '<div class="small text-secondary mb-2">No reading list items yet.</div>'}
            <button class="btn btn-outline-secondary btn-sm" data-add-reading="${m.id}">+ Add reading</button>
          </div>
        </div>
      </div>
    `;
  }).join('');

  content.innerHTML = devModeToggleHtml + `
    <div class="card shadow-sm">
      <div class="card-body">
        <h5 class="card-title mb-3">Reading Lists</h5>
        <div class="small text-secondary mb-3">Define core and recommended reading for each module. Items published more than 5 years ago will be flagged for review.</div>
        ${modulePicker}
        ${accordionControlsHtml('readingAccordion')}
        <div class="accordion" id="readingAccordion">
          ${modulesForEdit.length ? blocks : '<div class="small text-secondary">No modules available.</div>'}
        </div>
      </div>
    </div>
  `;

  wireDevModeToggle(() => window.render?.());
  wireAccordionControls('readingAccordion');
  wireReadingListsStep();
}

/**
 * Wire Reading Lists step event handlers
 */
function wireReadingListsStep() {
  const p = state.programme;

  // Module picker
  const picker = document.getElementById("readingListModulePicker");
  if (picker) {
    picker.onchange = () => {
      state.selectedModuleId = picker.value;
      window.render?.();
    };
  }

  // Add reading
  document.querySelectorAll("[data-add-reading]").forEach(btn => {
    btn.onclick = () => {
      const mid = btn.getAttribute("data-add-reading");
      const m = p.modules.find(x => x.id === mid);
      if (!m) return;
      m.readingList = m.readingList || [];
      m.readingList.push({
        id: 'reading_' + crypto.randomUUID(),
        author: '',
        title: '',
        publisher: '',
        year: '',
        isbn: '',
        type: 'core',
        notes: ''
      });
      saveDebounced();
      window.render?.();
    };
  });

  // Remove reading
  document.querySelectorAll("[data-remove-reading]").forEach(btn => {
    btn.onclick = () => {
      const mid = btn.getAttribute("data-remove-reading");
      const idx = Number(btn.getAttribute("data-reading-index"));
      const m = p.modules.find(x => x.id === mid);
      if (!m) return;
      m.readingList = (m.readingList || []).filter((_, i) => i !== idx);
      saveDebounced();
      window.render?.();
    };
  });

  // Reading fields (author, title, publisher, year, isbn, notes)
  document.querySelectorAll("[data-reading-field]").forEach(inp => {
    inp.addEventListener("input", (e) => {
      const mid = inp.getAttribute("data-reading-module");
      const idx = Number(inp.getAttribute("data-reading-index"));
      const field = inp.getAttribute("data-reading-field");
      const m = p.modules.find(x => x.id === mid);
      if (!m) return;
      m.readingList = m.readingList || [];
      if (!m.readingList[idx]) return;
      m.readingList[idx][field] = (field === 'year') ? (e.target.value || '') : e.target.value;
      saveDebounced();
      // Re-render if year changed to update warning badges
      if (field === 'year') window.render?.();
    });
  });

  // Reading type (select change handler)
  document.querySelectorAll("[data-reading-field][data-reading-field='type']").forEach(sel => {
    sel.addEventListener("change", (e) => {
      const mid = sel.getAttribute("data-reading-module");
      const idx = Number(sel.getAttribute("data-reading-index"));
      const m = p.modules.find(x => x.id === mid);
      if (!m) return;
      m.readingList = m.readingList || [];
      if (!m.readingList[idx]) return;
      m.readingList[idx].type = e.target.value;
      saveDebounced();
    });
  });

  // ISBN Lookup using Open Library API with Google Books fallback
  document.querySelectorAll("[data-lookup-isbn]").forEach(btn => {
    btn.onclick = async () => {
      const mid = btn.getAttribute("data-lookup-isbn");
      const idx = Number(btn.getAttribute("data-isbn-index"));
      const m = p.modules.find(x => x.id === mid);
      if (!m || !m.readingList || !m.readingList[idx]) return;

      const item = m.readingList[idx];
      let isbn = (item.isbn || '').trim();
      
      if (!isbn) {
        alert('Please enter an ISBN first.');
        return;
      }

      // Clean ISBN - remove hyphens and spaces
      isbn = isbn.replace(/[-\s]/g, '');
      
      // Basic ISBN validation (10 or 13 digits)
      if (!/^(\d{10}|\d{13}|\d{9}X)$/i.test(isbn)) {
        alert('Invalid ISBN format. Please enter a valid 10 or 13 digit ISBN.');
        return;
      }

      btn.disabled = true;
      btn.textContent = '⏳ Looking up...';

      try {
        // Try Open Library API first
        const response = await fetch(`https://openlibrary.org/api/books?bibkeys=ISBN:${isbn}&format=json&jscmd=data`);
        const data = await response.json();
        const bookData = data[`ISBN:${isbn}`];

        if (bookData) {
          // Extract authors - check authors array first, then fall back to by_statement
          let authors = '';
          if (bookData.authors && bookData.authors.length > 0) {
            authors = bookData.authors.map(a => typeof a === 'string' ? a : a.name).join(' & ');
          } else if (bookData.by_statement) {
            authors = bookData.by_statement;
          }
          
          // Extract publisher - handle both {name: "..."} and plain string formats
          let publisher = '';
          if (bookData.publishers && bookData.publishers.length > 0) {
            const pub = bookData.publishers[0];
            publisher = typeof pub === 'string' ? pub : pub.name;
          }
          
          // Extract year from publish_date (handles various formats like "04 / 10 / 2025", "2025", "January 1, 2025")
          let year = '';
          if (bookData.publish_date) {
            const yearMatch = bookData.publish_date.match(/\b(19|20)\d{2}\b/);
            if (yearMatch) year = yearMatch[0];
          }

          // Update the reading list item
          if (authors) item.author = authors;
          if (bookData.title) item.title = bookData.title;
          if (publisher) item.publisher = publisher;
          if (year) item.year = year;

          saveDebounced();
          window.render?.();
        } else {
          // Try Google Books API as fallback
          const gResponse = await fetch(`https://www.googleapis.com/books/v1/volumes?q=isbn:${isbn}`);
          const gData = await gResponse.json();
          
          if (gData.items && gData.items.length > 0) {
            const vol = gData.items[0].volumeInfo;
            
            if (vol.authors) item.author = vol.authors.join(' & ');
            if (vol.title) item.title = vol.title;
            if (vol.publisher) item.publisher = vol.publisher;
            if (vol.publishedDate) {
              const yearMatch = vol.publishedDate.match(/\d{4}/);
              if (yearMatch) item.year = yearMatch[0];
            }

            saveDebounced();
            window.render?.();
          } else {
            alert('Book not found. Please check the ISBN or enter details manually.');
            btn.disabled = false;
            btn.textContent = '🔍 Lookup';
          }
        }
      } catch (err) {
        console.error('ISBN lookup error:', err);
        alert('Failed to look up ISBN. Please check your connection or enter details manually.');
        btn.disabled = false;
        btn.textContent = '🔍 Lookup';
      }
    };
  });
}
