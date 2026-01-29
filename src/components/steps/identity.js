/**
 * Identity step component
 */

import { state, saveDebounced, SCHOOL_OPTIONS, AWARD_TYPE_OPTIONS, getAwardStandards, getAwardStandard } from '../../state/store.js';
import { escapeHtml } from '../../utils/dom.js';
import { getDevModeToggleHtml, wireDevModeToggle } from '../dev-mode.js';
import { uid } from '../../utils/uid.js';
import { accordionControlsHtml, wireAccordionControls, captureOpenCollapseIds } from './shared.js';

// Cache award standards for quick selector rendering
let standardsCache = [];
let standardsLoaded = false;

/**
 * Render the list of elective definitions (each contains groups) as an accordion
 */
function renderElectiveDefinitionsList(p, openCollapseIds) {
  const definitions = p.electiveDefinitions || [];
  if (definitions.length === 0) {
    return `<div class="alert alert-light mb-0">No elective definitions yet. Add definitions to create specialization tracks.</div>`;
  }
  
  return `
    ${accordionControlsHtml('electiveDefinitionsAccordion')}
    <div class="accordion" id="electiveDefinitionsAccordion">
      ${definitions.map((def, defIdx) => {
        const groupInputs = (def.groups || []).map((grp, grpIdx) => `
          <div class="row g-2 mb-2 align-items-center" data-group-row="${grp.id}">
            <div class="col-auto">
              <span class="badge text-bg-secondary">${grpIdx + 1}</span>
            </div>
            <div class="col-md-3">
              <input class="form-control form-control-sm" 
                data-elective-group-code="${grp.id}" 
                data-definition-id="${def.id}"
                value="${escapeHtml(grp.code || "")}" 
                placeholder="Code">
            </div>
            <div class="col">
              <input class="form-control form-control-sm" 
                data-elective-group-name="${grp.id}" 
                data-definition-id="${def.id}"
                value="${escapeHtml(grp.name || "")}" 
                placeholder="Group name (e.g., Data Analytics Track)">
            </div>
            <div class="col-auto">
              <button class="btn btn-sm btn-outline-danger" 
                data-remove-elective-group="${grp.id}" 
                data-definition-id="${def.id}"
                title="Remove group">&times;</button>
            </div>
          </div>
        `).join("");

        const defName = def.name || `Elective Definition ${defIdx + 1}`;
        const defCode = def.code || "";
        const headingId = `electiveDef_${def.id}_heading`;
        const collapseId = `electiveDef_${def.id}_collapse`;
        const isActive = openCollapseIds.has(collapseId) ? true : (openCollapseIds.size === 0 && defIdx === 0);

        return `
          <div class="accordion-item">
            <h2 class="accordion-header" id="${headingId}">
              <button class="accordion-button ${isActive ? "" : "collapsed"} w-100" type="button" data-bs-toggle="collapse" data-bs-target="#${collapseId}" aria-expanded="${isActive}" aria-controls="${collapseId}">
                <div class="d-flex w-100 align-items-center gap-2">
                  <div class="flex-grow-1">
                    <div class="fw-semibold" data-def-header-label="${def.id}">${escapeHtml(defCode ? `[${defCode}] ${defName}` : defName)}</div>
                    <div class="small text-secondary">${Number(def.credits || 0)} cr • ${(def.groups || []).length} group(s)</div>
                  </div>
                  <div class="header-actions d-flex align-items-center gap-2 me-2">
                    <span class="btn btn-sm btn-outline-danger" data-remove-elective-definition="${def.id}" role="button">Remove</span>
                  </div>
                </div>
              </button>
            </h2>
            <div id="${collapseId}" class="accordion-collapse collapse ${isActive ? "show" : ""}" aria-labelledby="${headingId}">
              <div class="accordion-body">
                <div class="row g-2 mb-3">
                  <div class="col-md-2">
                    <label class="form-label small mb-1">Code</label>
                    <input class="form-control form-control-sm" 
                      data-definition-code="${def.id}" 
                      value="${escapeHtml(defCode)}" 
                      placeholder="e.g., ELEC1">
                  </div>
                  <div class="col-md-5">
                    <label class="form-label small mb-1">Name</label>
                    <input class="form-control form-control-sm" 
                      data-definition-name="${def.id}" 
                      value="${escapeHtml(def.name || "")}" 
                      placeholder="e.g., Year 3 Specialization">
                  </div>
                  <div class="col-md-3">
                    <label class="form-label small mb-1">Credits (all groups)</label>
                    <div class="input-group input-group-sm">
                      <input type="number" class="form-control" 
                        data-definition-credits="${def.id}" 
                        value="${Number(def.credits || 0)}" 
                        min="0" step="5" placeholder="Credits">
                      <span class="input-group-text">cr</span>
                    </div>
                  </div>
                </div>
                <label class="form-label small mb-1">Groups (students choose one)</label>
                <div class="small text-muted mb-2">Code &bull; Name</div>
                ${groupInputs || '<div class="text-muted small mb-2">No groups in this definition yet.</div>'}
                <button class="btn btn-outline-secondary btn-sm" data-add-group-to-definition="${def.id}">+ Add group</button>
              </div>
            </div>
          </div>
        `;
      }).join("")}
    </div>
  `;
}

/**
 * Render the Identity step
 */
export function renderIdentityStep() {
  const p = state.programme;
  const content = document.getElementById("content");
  if (!content) return;
  
  const devModeToggleHtml = getDevModeToggleHtml();
  const openCollapseIds = captureOpenCollapseIds('electiveDefinitionsAccordion');
  
  const schoolOpts = SCHOOL_OPTIONS.map(s => 
    `<option value="${escapeHtml(s)}" ${p.school === s ? "selected" : ""}>${escapeHtml(s)}</option>`
  ).join("");
  
  const awardOpts = AWARD_TYPE_OPTIONS.map(a => {
    if (a === "Other") return `<option value="Other" ${p.awardTypeIsOther ? "selected" : ""}>Other (type below)</option>`;
    return `<option value="${escapeHtml(a)}" ${(!p.awardTypeIsOther && p.awardType === a) ? "selected" : ""}>${escapeHtml(a)}</option>`;
  }).join("");

  // Lazy-load standards once, then re-render to show options
  if (!standardsLoaded) {
    standardsLoaded = true;
    getAwardStandards().then(list => {
      standardsCache = Array.isArray(list) ? list : [];
      renderIdentityStep();
    }).catch(() => {
      standardsCache = [];
    });
  }

  content.innerHTML = devModeToggleHtml + `
    <div class="card shadow-sm">
      <div class="card-body">
        <h5 class="card-title mb-3">Identity (QQI-critical)</h5>
        <div class="row g-3">
          <div class="col-md-6">
            <label class="form-label fw-semibold">Programme title</label>
            <input class="form-control" id="titleInput" value="${escapeHtml(p.title)}">
          </div>
          <div class="col-md-6">
            <label class="form-label fw-semibold">Award type</label>
            <select class="form-select" id="awardSelect">
              <option value="" disabled ${(!p.awardType && !p.awardTypeIsOther) ? "selected" : ""}>Select an award type</option>
              ${awardOpts}
            </select>
            <div class="mt-2" id="awardOtherWrap" style="display:${p.awardTypeIsOther ? "block" : "none"}">
              <input class="form-control" id="awardOtherInput" value="${escapeHtml(p.awardTypeIsOther ? p.awardType : "")}" placeholder="Type the award type">
            </div>
          </div>
          <div class="col-md-4">
            <label class="form-label fw-semibold">NFQ level</label>
            <input type="number" min="6" max="9" step="1" class="form-control" id="levelInput" value="${p.nfqLevel ?? ""}">
          </div>
          <div class="col-md-4">
            <label class="form-label fw-semibold">Total credits (ECTS)</label>
            <input type="number" min="1" step="1" class="form-control" id="totalCreditsInput" value="${p.totalCredits ?? ""}" placeholder="e.g., 180 / 240">
          </div>
          <div class="col-md-4">
            <label class="form-label fw-semibold">School / Discipline</label>
            <select class="form-select" id="schoolSelect">
              <option value="" disabled ${!p.school ? "selected" : ""}>Select a School</option>
              ${schoolOpts}
            </select>
          </div>
          <div class="col-md-12">
            <label class="form-label fw-semibold">QQI award standard</label>
            <div id="standardSelectorsContainer"></div>
            <div class="form-text">Select up to two standards. These drive PLO mapping and autocompletion.</div>
          </div>
          <div class="col-12">
            <label class="form-label fw-semibold">Intake months</label>
            <input class="form-control" id="intakeInput" value="${escapeHtml((p.intakeMonths || []).join(", "))}" placeholder="Comma-separated, e.g., Sep, Jan">
          </div>
        </div>
      </div>
    </div>

    <div class="card shadow-sm mt-3">
      <div class="card-body">
        <div class="d-flex justify-content-between align-items-center mb-3">
          <h5 class="card-title mb-0">Elective Definitions</h5>
          <button class="btn btn-dark btn-sm" id="addElectiveDefinitionBtn">+ Add definition</button>
        </div>
        
        <div class="alert alert-light mb-3">
          <strong>How elective definitions work:</strong>
          <ul class="mb-0 mt-1 small">
            <li>Students complete <strong>every</strong> elective definition in the programme</li>
            <li>For each definition, students choose <strong>one group</strong> to complete</li>
            <li>All groups within a definition share the same credit requirement</li>
          </ul>
        </div>

        <div id="electiveDefinitionsList">
          ${renderElectiveDefinitionsList(p, openCollapseIds)}
        </div>
      </div>
    </div>
  `;
  
  wireDevModeToggle(() => window.render?.());
  wireAccordionControls('electiveDefinitionsAccordion');
  wireIdentityStep();
}

/**
 * Wire Identity step event handlers
 */
export function wireIdentityStep(onUpdate) {
  const p = state.programme;
  const doUpdate = () => {
    window.render?.(); // Update immediately to show changed value
    saveDebounced(() => {
      window.render?.(); // Update again after save to show save status
      onUpdate?.();
    });
  };
  
  const titleInput = document.getElementById("titleInput");
  if (titleInput) {
    titleInput.addEventListener("input", (e) => {
      p.title = e.target.value;
      doUpdate();
    });
  }
  
  const awardSelect = document.getElementById("awardSelect");
  const awardOtherWrap = document.getElementById("awardOtherWrap");
  const awardOtherInput = document.getElementById("awardOtherInput");
  
  if (awardSelect) {
    awardSelect.addEventListener("change", (e) => {
      if (e.target.value === "Other") {
        p.awardTypeIsOther = true;
        p.awardType = awardOtherInput?.value || "";
        if (awardOtherWrap) awardOtherWrap.style.display = "block";
      } else {
        p.awardTypeIsOther = false;
        p.awardType = e.target.value;
        if (awardOtherWrap) awardOtherWrap.style.display = "none";
      }
      doUpdate();
    });
  }
  
  if (awardOtherInput) {
    awardOtherInput.addEventListener("input", (e) => {
      if (p.awardTypeIsOther) {
        p.awardType = e.target.value;
        doUpdate();
      }
    });
  }
  
  const levelInput = document.getElementById("levelInput");
  if (levelInput) {
    levelInput.addEventListener("input", (e) => {
      p.nfqLevel = e.target.value ? Number(e.target.value) : null;
      doUpdate();
    });
  }
  
  const totalCreditsInput = document.getElementById("totalCreditsInput");
  if (totalCreditsInput) {
    totalCreditsInput.addEventListener("input", (e) => {
      p.totalCredits = Number(e.target.value || 0);
      doUpdate();
    });
  }
  
  const schoolSelect = document.getElementById("schoolSelect");
  if (schoolSelect) {
    schoolSelect.addEventListener("change", (e) => {
      p.school = e.target.value;
      doUpdate();
    });
  }
  
  // Ensure arrays exist for standards
  if (!Array.isArray(p.awardStandardIds)) p.awardStandardIds = [];
  if (!Array.isArray(p.awardStandardNames)) p.awardStandardNames = [];

  const standardsContainer = document.getElementById("standardSelectorsContainer");
  if (standardsContainer) {
    const renderStandardSelectors = () => {
      const numSelectors = Math.min((p.awardStandardIds.length || 0) + 1, 2);
      let html = "";

      for (let i = 0; i < numSelectors; i++) {
        const selectedId = p.awardStandardIds[i] || "";
        const canRemove = i > 0 || p.awardStandardIds.length > 1;

        const optionList = (standardsCache || []).map(s => {
          const id = s?.id || "";
          const name = s?.name || id;
          return `<option value="${escapeHtml(id)}" ${selectedId === id ? "selected" : ""}>${escapeHtml(name)}</option>`;
        }).join("") || `<option value="qqi-computing-l6-9" ${selectedId === "qqi-computing-l6-9" ? "selected" : ""}>Computing (Levels 6-9)</option>`;

        html += `
          <div class="d-flex gap-2 mb-2 align-items-start">
            <select class="form-select standard-selector" data-index="${i}">
              <option value="" ${!selectedId ? "selected" : ""}>Select a standard${i > 0 ? " (optional)" : ""}</option>
              ${optionList}
            </select>
            ${canRemove && selectedId ? `<button type="button" class="btn btn-outline-danger remove-standard" data-index="${i}">Remove</button>` : ""}
          </div>
        `;
      }

      standardsContainer.innerHTML = html;

      standardsContainer.querySelectorAll('.standard-selector').forEach(sel => {
        sel.addEventListener('change', async (e) => {
          const index = Number(e.target.getAttribute('data-index')) || 0;
          const newValue = e.target.value;

          if (newValue) {
            p.awardStandardIds[index] = newValue;
            try {
              const s = await getAwardStandard(newValue);
              p.awardStandardNames[index] = s?.name || "QQI Award Standard";
            } catch (err) {
              console.warn('Failed to load standard', err);
              p.awardStandardNames[index] = "QQI Award Standard";
            }
          } else {
            p.awardStandardIds.splice(index, 1);
            p.awardStandardNames.splice(index, 1);
          }

          p.awardStandardIds = p.awardStandardIds.filter(Boolean);
          p.awardStandardNames = p.awardStandardNames.filter(Boolean);

          doUpdate();
          renderStandardSelectors();
        });
      });

      standardsContainer.querySelectorAll('.remove-standard').forEach(btn => {
        btn.addEventListener('click', (e) => {
          const index = Number(e.target.getAttribute('data-index')) || 0;
          p.awardStandardIds.splice(index, 1);
          p.awardStandardNames.splice(index, 1);
          doUpdate();
          renderStandardSelectors();
        });
      });
    };

    renderStandardSelectors();
  }
  
  const intakeInput = document.getElementById("intakeInput");
  if (intakeInput) {
    intakeInput.addEventListener("input", (e) => {
      p.intakeMonths = e.target.value.split(",").map(s => s.trim()).filter(Boolean);
      doUpdate();
    });
  }

  // Elective definitions
  const addElectiveDefinitionBtn = document.getElementById("addElectiveDefinitionBtn");
  if (addElectiveDefinitionBtn) {
    addElectiveDefinitionBtn.onclick = () => {
      if (!Array.isArray(p.electiveDefinitions)) p.electiveDefinitions = [];
      const defNum = p.electiveDefinitions.length + 1;
      const defCode = `ELEC${defNum}`;
      p.electiveDefinitions.push({ 
        id: uid("edef"), 
        name: "",
        code: defCode,
        credits: 0, 
        groups: [{ id: uid("egrp"), name: "", code: `${defCode}-A`, moduleIds: [] }] 
      });
      saveDebounced();
      window.render?.();
    };
  }

  // Remove definition
  document.querySelectorAll("[data-remove-elective-definition]").forEach(btn => {
    btn.onclick = () => {
      const defId = btn.getAttribute("data-remove-elective-definition");
      p.electiveDefinitions = (p.electiveDefinitions || []).filter(d => d.id !== defId);
      saveDebounced();
      window.render?.();
    };
  });

  // Add group to definition
  document.querySelectorAll("[data-add-group-to-definition]").forEach(btn => {
    btn.onclick = () => {
      const defId = btn.getAttribute("data-add-group-to-definition");
      const def = (p.electiveDefinitions || []).find(d => d.id === defId);
      if (!def) return;
      if (!Array.isArray(def.groups)) def.groups = [];
      // Auto-generate group code from definition code
      const defCode = def.code || "";
      const nextLetter = String.fromCharCode(65 + def.groups.length); // A, B, C...
      const groupCode = defCode ? `${defCode}-${nextLetter}` : "";
      def.groups.push({ id: uid("egrp"), name: "", code: groupCode, moduleIds: [] });
      saveDebounced();
      window.render?.();
    };
  });

  // Remove group from definition
  document.querySelectorAll("[data-remove-elective-group]").forEach(btn => {
    btn.onclick = () => {
      const grpId = btn.getAttribute("data-remove-elective-group");
      const defId = btn.getAttribute("data-definition-id");
      const def = (p.electiveDefinitions || []).find(d => d.id === defId);
      if (!def) return;
      def.groups = (def.groups || []).filter(g => g.id !== grpId);
      saveDebounced();
      window.render?.();
    };
  });

  // Definition name input
  document.querySelectorAll("[data-definition-name]").forEach(inp => {
    inp.addEventListener("input", (e) => {
      const defId = inp.getAttribute("data-definition-name");
      const def = (p.electiveDefinitions || []).find(d => d.id === defId);
      if (!def) return;
      def.name = e.target.value;
      // Update header label dynamically
      const defIdx = (p.electiveDefinitions || []).indexOf(def);
      const defName = def.name || `Elective Definition ${defIdx + 1}`;
      const defCode = def.code || "";
      const headerLabel = document.querySelector(`[data-def-header-label="${defId}"]`);
      if (headerLabel) {
        headerLabel.textContent = defCode ? `[${defCode}] ${defName}` : defName;
      }
      saveDebounced();
    });
  });

  // Definition code input - with cascade to groups
  document.querySelectorAll("[data-definition-code]").forEach(inp => {
    inp.addEventListener("input", (e) => {
      const defId = inp.getAttribute("data-definition-code");
      const def = (p.electiveDefinitions || []).find(d => d.id === defId);
      if (!def) return;
      const oldCode = def.code || "";
      const newCode = e.target.value;
      def.code = newCode;
      // Update header label dynamically
      const defIdx = (p.electiveDefinitions || []).indexOf(def);
      const defName = def.name || `Elective Definition ${defIdx + 1}`;
      const headerLabel = document.querySelector(`[data-def-header-label="${defId}"]`);
      if (headerLabel) {
        headerLabel.textContent = newCode ? `[${newCode}] ${defName}` : defName;
      }
      // Update group codes that start with the old definition code
      if (oldCode) {
        (def.groups || []).forEach(grp => {
          if (grp.code && grp.code.startsWith(oldCode)) {
            grp.code = newCode + grp.code.slice(oldCode.length);
          }
        });
      }
      saveDebounced();
      window.render?.(); // Re-render to show updated group codes
    });
  });

  // Definition credits input
  document.querySelectorAll("[data-definition-credits]").forEach(inp => {
    inp.addEventListener("input", (e) => {
      const defId = inp.getAttribute("data-definition-credits");
      const def = (p.electiveDefinitions || []).find(d => d.id === defId);
      if (!def) return;
      def.credits = Number(e.target.value || 0);
      saveDebounced();
    });
  });

  // Group code input
  document.querySelectorAll("[data-elective-group-code]").forEach(inp => {
    inp.addEventListener("input", (e) => {
      const grpId = inp.getAttribute("data-elective-group-code");
      const defId = inp.getAttribute("data-definition-id");
      const def = (p.electiveDefinitions || []).find(d => d.id === defId);
      if (!def) return;
      const grp = (def.groups || []).find(g => g.id === grpId);
      if (!grp) return;
      grp.code = e.target.value;
      saveDebounced();
    });
  });

  // Group name input
  document.querySelectorAll("[data-elective-group-name]").forEach(inp => {
    inp.addEventListener("input", (e) => {
      const grpId = inp.getAttribute("data-elective-group-name");
      const defId = inp.getAttribute("data-definition-id");
      const def = (p.electiveDefinitions || []).find(d => d.id === defId);
      if (!def) return;
      const grp = (def.groups || []).find(g => g.id === grpId);
      if (!grp) return;
      grp.name = e.target.value;
      saveDebounced();
    });
  });
}
