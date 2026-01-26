/**
 * Structure (Credits & Modules) Step Component (Preact)
 * 
 * Manages programme credits and module definitions.
 */

import { useState } from 'preact/hooks';
import { useSignalEffect } from '@preact/signals';
import { html } from '../../lib/htm.js';
import { 
  saveDebounced,
  programmeSignal,
  mutateProgramme,
} from '../../state/store.js';
import { uid } from '../../utils/uid.js';
import { AccordionControls, AccordionItem, useAccordionState } from './shared-preact.js';

// ============================================================================
// PREACT COMPONENTS
// ============================================================================

/**
 * ModuleItem component - Single module accordion item
 */
function ModuleItem({ module, index, isOpen, onToggle, onUpdate, onRemove }) {
  const titlePreview = (module.title || '').trim() || 'Module';
  const codePreview = (module.code || '').trim();
  const creditsPreview = Number(module.credits || 0);
  const isElective = module.isElective === true;
  
  const typeBadge = isElective 
    ? html`<span class="badge text-bg-info me-2" title="Elective">E</span>`
    : html`<span class="badge text-bg-primary me-2" title="Mandatory">M</span>`;
  
  const headerContent = html`
    <div class="fw-semibold">${typeBadge}Module ${index + 1}${codePreview ? `: ${codePreview}` : ''}</div>
    <div class="small text-secondary">${titlePreview} • ${creditsPreview} cr</div>
  `;
  
  const headerActions = html`
    <span class="btn btn-sm btn-outline-danger" data-remove-module=${module.id} onClick=${(e) => { e.stopPropagation(); onRemove(module.id); }}>Remove</span>
  `;

  return html`
    <${AccordionItem}
      id=${`module_${module.id}`}
      isOpen=${isOpen}
      onToggle=${() => onToggle(`module_${module.id}`)}
      headerContent=${headerContent}
      headerActions=${headerActions}
    >
      <div class="row g-3">
        <div class="col-md-2">
          <label class="form-label fw-semibold">Type</label>
          <select 
            class="form-select" 
            data-module-field="isElective"
            data-module-id=${module.id}
            value=${isElective ? 'true' : 'false'}
            onChange=${(e) => onUpdate(module.id, 'isElective', e.target.value === 'true')}
          >
            <option value="false">Mandatory</option>
            <option value="true">Elective</option>
          </select>
        </div>
        <div class="col-md-2">
          <label class="form-label fw-semibold">Code (opt.)</label>
          <input 
            class="form-control" 
            data-module-field="code"
            data-module-id=${module.id}
            value=${module.code || ''}
            ref=${(el) => { if (el) el.setAttribute('value', module.code || ''); }}
            onInput=${(e) => onUpdate(module.id, 'code', e.target.value)}
          />
        </div>
        <div class="col-md-5">
          <label class="form-label fw-semibold">Title</label>
          <input 
            class="form-control" 
            data-module-field="title"
            data-module-id=${module.id}
            value=${module.title || ''}
            onInput=${(e) => onUpdate(module.id, 'title', e.target.value)}
          />
        </div>
        <div class="col-md-3">
          <label class="form-label fw-semibold">Credits</label>
          <input 
            type="number" 
            class="form-control" 
            data-module-field="credits"
            data-module-id=${module.id}
            value=${Number(module.credits || 0)}
            onInput=${(e) => onUpdate(module.id, 'credits', Number(e.target.value || 0))}
          />
        </div>
      </div>
    <//>
  `;
}

/**
 * StructureStep Preact component - Main credits & modules form
 */
export function StructureStep({ onRender }) {
  // Force re-render when programme signal changes
  const [, forceRender] = useState(0);
  useSignalEffect(() => {
    programmeSignal.value;
    forceRender(n => n + 1);
  });
  
  const programme = programmeSignal.value;
  const modules = programme.modules || [];
  const { openIds, isOpen, toggle, expandAll, collapseAll } = useAccordionState('modules');
  
  // Calculate credit summaries
  const mandatoryModules = modules.filter(m => !m.isElective);
  const electiveModules = modules.filter(m => m.isElective === true);
  const mandatoryCredits = mandatoryModules.reduce((acc, m) => acc + (Number(m.credits) || 0), 0);
  const electiveCredits = electiveModules.reduce((acc, m) => acc + (Number(m.credits) || 0), 0);
  const totalModuleCredits = mandatoryCredits + electiveCredits;
  const electiveDefinitionsCredits = (programme.electiveDefinitions || []).reduce((acc, def) => acc + (Number(def.credits) || 0), 0);
  const numDefinitions = (programme.electiveDefinitions || []).length;
  
  const handleAddModule = () => {
    mutateProgramme(p => {
      const currentModules = Array.isArray(p.modules) ? p.modules : [];
      p.modules = [...currentModules, { 
        id: uid('mod'), 
        code: '', 
        title: 'New module', 
        credits: 0, 
        isElective: false, 
        mimlos: [], 
        assessments: [] 
      }];
    });
    saveDebounced();
    if (onRender) onRender();
  };
  
  const handleRemoveModule = (moduleId) => {
    mutateProgramme(p => {
      p.modules = (p.modules || []).filter(m => m.id !== moduleId);
      // Remove from PLO mappings
      for (const ploId of Object.keys(p.ploToModules || {})) {
        p.ploToModules[ploId] = (p.ploToModules[ploId] || []).filter(mid => mid !== moduleId);
      }
      // Remove from elective groups
      (p.electiveDefinitions || []).forEach(def => {
        (def.groups || []).forEach(g => {
          g.moduleIds = (g.moduleIds || []).filter(mid => mid !== moduleId);
        });
      });
    });
    saveDebounced();
    if (onRender) onRender();
  };
  
  const handleUpdateModule = (moduleId, field, value) => {
    mutateProgramme(p => {
      const m = (p.modules || []).find(x => x.id === moduleId);
      if (m) m[field] = value;
    });
    saveDebounced();
    if (onRender) onRender();
  };
  
  const allIds = modules.map(m => `module_${m.id}`);
  const creditsSumMatch = totalModuleCredits === (programme.totalCredits || 0);

  return html`
    <div class="card shadow-sm">
      <div class="card-body">
        <div class="d-flex justify-content-between align-items-center mb-3">
          <h5 class="card-title mb-0">Credits & modules (QQI-critical)</h5>
          <button class="btn btn-dark btn-sm" id="addModuleBtn" onClick=${handleAddModule}>+ Add module</button>
        </div>

        <div class="row g-3 mb-3">
          <div class="col-md-3">
            <label class="form-label fw-semibold">Total programme credits</label>
            <input type="number" class="form-control" id="totalCredits" value=${Number(programme.totalCredits || 0)} disabled />
          </div>
          <div class="col-md-9">
            <label class="form-label fw-semibold">Credit summary</label>
            <div class="d-flex gap-3 flex-wrap align-items-center" style="min-height: 38px;">
              <span class="badge text-bg-primary fs-6">
                <span class="badge text-bg-light text-primary me-1">M</span> ${mandatoryCredits} cr (${mandatoryModules.length} modules)
              </span>
              <span class="badge text-bg-info fs-6">
                <span class="badge text-bg-light text-info me-1">E</span> ${electiveCredits} cr (${electiveModules.length} modules)
              </span>
              ${numDefinitions > 0 && html`
                <span class="badge text-bg-secondary fs-6">${numDefinitions} elective def(s) = ${electiveDefinitionsCredits} cr</span>
              `}
              <span class="badge ${creditsSumMatch ? 'text-bg-success' : 'text-bg-warning'} fs-6">
                Sum: ${totalModuleCredits} / ${programme.totalCredits || 0}
              </span>
            </div>
          </div>
        </div>

        <div class="small text-muted mb-3">
          <strong>Tip:</strong> Mark modules as <span class="badge text-bg-primary">M</span> Mandatory or <span class="badge text-bg-info">E</span> Elective. 
          Elective modules are assigned to groups in the "Electives" step.
        </div>

        ${modules.length > 0 && html`
          <${AccordionControls} 
            accordionId="modulesAccordion"
            onExpandAll=${() => expandAll(allIds)} 
            onCollapseAll=${collapseAll} 
          />
        `}
        
        <div class="accordion" id="modulesAccordion">
          ${modules.length === 0 
            ? html`<div class="alert alert-info mb-0">No modules added yet.</div>`
            : modules.map((m, idx) => html`
                <${ModuleItem}
                  key=${m.id}
                  module=${m}
                  index=${idx}
                  isOpen=${isOpen(`module_${m.id}`) || (openIds.size === 0 && idx === 0)}
                  onToggle=${toggle}
                  onUpdate=${handleUpdateModule}
                  onRemove=${handleRemoveModule}
                />
              `)
          }
        </div>
      </div>
    </div>
  `;
}
