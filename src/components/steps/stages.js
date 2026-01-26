/**
 * Stages Step Component (Preact)
 * 
 * Handles stage structure for programme versions.
 */

import { useState, useCallback } from 'preact/hooks';
import { useSignalEffect } from '@preact/signals';
import { html } from '../../lib/htm.js';
import { 
  saveDebounced, 
  defaultStage,
  programmeSignal,
  selectedVersionIdSignal,
  mutateProgramme,
} from '../../state/store.js';
import { sumStageCredits } from '../../utils/helpers.js';
import { AccordionControls, AccordionItem, useAccordionState } from './shared-preact.js';

// ============================================================================
// PREACT COMPONENTS
// ============================================================================

/**
 * StageModuleCheck component - Module assignment checkbox with semester input
 */
function StageModuleCheck({ module, stage, picked, onToggle, onSemesterChange }) {
  const checked = !!picked;
  const semVal = picked?.semester || '';
  
  return html`
    <div class="border rounded p-2 mb-2">
      <div class="form-check">
        <input 
          class="form-check-input" 
          type="checkbox" 
          id="st_${stage.id}_mod_${module.id}"
          checked=${checked}
          onChange=${(e) => onToggle(stage.id, module.id, e.target.checked)}
        />
        <label class="form-check-label" for="st_${stage.id}_mod_${module.id}">
          ${module.code ? `${module.code} — ` : ''}${module.title} 
          <span class="text-secondary small">(${Number(module.credits || 0)} cr)</span>
        </label>
      </div>
      ${checked && html`
        <div class="mt-2">
          <label class="form-label small mb-1">Semester / timing tag (optional)</label>
          <input 
            class="form-control form-control-sm" 
            value=${semVal}
            onInput=${(e) => onSemesterChange(stage.id, module.id, e.target.value)}
            placeholder="e.g., S1 / S2 / Year / Block 1"
          />
        </div>
      `}
    </div>
  `;
}

/**
 * StageItem component - Single stage accordion item
 */
function StageItem({ stage, index, modules, isOpen, onToggle, onUpdate, onRemove, onModuleToggle, onSemesterChange }) {
  const exitOn = stage.exitAward?.enabled;
  const stageCreditSum = sumStageCredits(modules, stage.modules || []);
  const summaryName = stage.name || `Stage ${stage.sequence || ''}`;
  
  const headerContent = html`
    <div class="fw-semibold">${summaryName}</div>
    <div class="small text-secondary">
      Sequence ${Number(stage.sequence || 1)} • Target ${Number(stage.creditsTarget || 0)}cr • Assigned ${stageCreditSum}cr
    </div>
  `;
  
  const headerActions = html`
    <span class="btn btn-sm btn-outline-danger" onClick=${(e) => { e.stopPropagation(); onRemove(stage.id); }}>Remove stage</span>
  `;

  return html`
    <${AccordionItem}
      id=${`stage_${stage.id}`}
      isOpen=${isOpen}
      onToggle=${() => onToggle(`stage_${stage.id}`)}
      headerContent=${headerContent}
      headerActions=${headerActions}
    >
      <div class="row g-3">
        <div class="col-md-6">
          <label class="form-label fw-semibold">Stage name</label>
          <input 
            class="form-control" 
            id=${`stname_${stage.id}`}
            value=${stage.name || ''}
            onInput=${(e) => onUpdate(stage.id, 'name', e.target.value)}
          />
        </div>
        <div class="col-md-3">
          <label class="form-label fw-semibold">Sequence</label>
          <input 
            type="number" 
            min="1" 
            class="form-control" 
            id=${`stseq_${stage.id}`}
            value=${Number(stage.sequence || 1)}
            onInput=${(e) => onUpdate(stage.id, 'sequence', Number(e.target.value || 1))}
          />
        </div>
        <div class="col-md-3">
          <label class="form-label fw-semibold">Credits target</label>
          <input 
            type="number" 
            min="0" 
            class="form-control" 
            id=${`stcred_${stage.id}`}
            value=${Number(stage.creditsTarget || 0)}
            onInput=${(e) => onUpdate(stage.id, 'creditsTarget', Number(e.target.value || 0))}
          />
          <div class="small text-secondary mt-1">
            Assigned modules sum to <span class="fw-semibold">${stageCreditSum}</span> credits.
          </div>
        </div>
        <div class="col-12">
          <div class="form-check">
            <input 
              class="form-check-input" 
              type="checkbox" 
              id=${`stexit_${stage.id}`}
              checked=${exitOn}
              onChange=${(e) => onUpdate(stage.id, 'exitEnabled', e.target.checked)}
            />
            <label class="form-check-label fw-semibold" for=${`stexit_${stage.id}`}>
              Enable exit award for this stage
            </label>
          </div>
        </div>
        ${exitOn && html`
          <div class="col-12" id=${`stexitWrap_${stage.id}`}>
            <label class="form-label fw-semibold">Exit award title</label>
            <input 
              class="form-control" 
              id=${`stexitTitle_${stage.id}`}
              value=${stage.exitAward?.awardTitle || ''}
              onInput=${(e) => onUpdate(stage.id, 'exitTitle', e.target.value)}
            />
          </div>
        `}
        <div class="col-12">
          <label class="form-label fw-semibold">Modules in this stage</label>
          ${modules.length === 0 
            ? html`<div class="text-secondary">No modules defined yet (add modules in Credits & Modules).</div>`
            : modules.map(m => {
                const picked = (stage.modules || []).find(x => x.moduleId === m.id);
                return html`
                  <${StageModuleCheck}
                    key=${m.id}
                    module=${m}
                    stage=${stage}
                    picked=${picked}
                    onToggle=${onModuleToggle}
                    onSemesterChange=${onSemesterChange}
                  />
                `;
              })
          }
        </div>
      </div>
    <//>
  `;
}

/**
 * StagesStep Preact component - Main stages form
 */
export function StagesStep({ onRender }) {
  // Force re-render when programme signal changes
  const [, forceRender] = useState(0);
  useSignalEffect(() => {
    programmeSignal.value;
    forceRender(n => n + 1);
  });
  
  const programme = programmeSignal.value;
  const versions = Array.isArray(programme.versions) ? programme.versions : [];
  const modules = programme.modules || [];
  const { openIds, isOpen, toggle, expandAll, collapseAll } = useAccordionState('stages');
  
  if (versions.length === 0) {
    return html`<div class="alert alert-warning">Add at least one Programme Version first.</div>`;
  }
  
  if (!selectedVersionIdSignal.value) selectedVersionIdSignal.value = versions[0].id;
  const currentVersion = versions.find(x => x.id === selectedVersionIdSignal.value) || versions[0];
  const stages = (currentVersion.stages || []).sort((a, b) => Number(a.sequence || 0) - Number(b.sequence || 0));
  
  const handleVersionChange = (e) => {
    selectedVersionIdSignal.value = e.target.value;
    saveDebounced();
    if (onRender) onRender();
  };
  
  const handleAddStage = () => {
    mutateProgramme(p => {
      const v = (p.versions || []).find(x => x.id === selectedVersionIdSignal.value);
      if (!v) return;
      const currentStages = Array.isArray(v.stages) ? v.stages : [];
      const nextSeq = currentStages.length + 1;
      const s = defaultStage(nextSeq);
      if ((p.totalCredits || 0) > 0 && currentStages.length === 0) {
        s.creditsTarget = (p.totalCredits % 60 === 0) ? 60 : 0;
      }
      v.stages = [...currentStages, s];
    });
    saveDebounced();
    if (onRender) onRender();
  };
  
  const handleRemoveStage = (stageId) => {
    mutateProgramme(p => {
      const v = (p.versions || []).find(x => x.id === selectedVersionIdSignal.value);
      if (!v) return;
      v.stages = (v.stages || []).filter(x => x.id !== stageId);
    });
    saveDebounced();
    if (onRender) onRender();
  };
  
  const handleUpdateStage = (stageId, field, value) => {
    mutateProgramme(p => {
      const v = (p.versions || []).find(x => x.id === selectedVersionIdSignal.value);
      if (!v) return;
      const s = (v.stages || []).find(x => x.id === stageId);
      if (!s) return;
      
      if (field === 'exitEnabled') {
        if (!s.exitAward) s.exitAward = { enabled: false, awardTitle: '' };
        s.exitAward.enabled = value;
      } else if (field === 'exitTitle') {
        if (!s.exitAward) s.exitAward = { enabled: false, awardTitle: '' };
        s.exitAward.awardTitle = value;
      } else {
        s[field] = value;
      }
    });
    saveDebounced();
  };
  
  const handleModuleToggle = (stageId, moduleId, checked) => {
    mutateProgramme(p => {
      const v = (p.versions || []).find(x => x.id === selectedVersionIdSignal.value);
      if (!v) return;
      const s = (v.stages || []).find(x => x.id === stageId);
      if (!s) return;
      const currentModules = Array.isArray(s.modules) ? s.modules : [];
      
      if (checked && !currentModules.find(x => x.moduleId === moduleId)) {
        s.modules = [...currentModules, { moduleId, semester: '' }];
      }
      if (!checked) {
        s.modules = currentModules.filter(x => x.moduleId !== moduleId);
      }
    });
    saveDebounced();
    if (onRender) onRender();
  };
  
  const handleSemesterChange = (stageId, moduleId, value) => {
    mutateProgramme(p => {
      const v = (p.versions || []).find(x => x.id === selectedVersionIdSignal.value);
      if (!v) return;
      const s = (v.stages || []).find(x => x.id === stageId);
      if (!s) return;
      const entry = (s.modules || []).find(x => x.moduleId === moduleId);
      if (entry) entry.semester = value;
    });
    saveDebounced();
  };
  
  const allIds = stages.map(s => `stage_${s.id}`);

  return html`
    <div class="d-flex align-items-center justify-content-between flex-wrap gap-2">
      <div>
        <h4 class="mb-1">Stage Structure</h4>
        <div class="text-secondary">Define stages for the selected programme version and assign modules to each stage.</div>
      </div>
      <div class="d-flex gap-2 align-items-center">
        <select class="form-select" id="stageVersionSelect" style="min-width: 260px;" value=${currentVersion.id} onChange=${handleVersionChange}>
          ${versions.map(v => html`
            <option value=${v.id}>${v.code || ''}${v.code ? ' — ' : ''}${v.label || ''}</option>
          `)}
        </select>
        <button class="btn btn-dark" id="addStageBtn" onClick=${handleAddStage}>+ Add stage</button>
      </div>
    </div>
    
    ${stages.length > 0 && html`
      <${AccordionControls} 
        accordionId="stagesAccordion"
        onExpandAll=${() => expandAll(allIds)} 
        onCollapseAll=${collapseAll} 
      />
    `}
    
    <div class="mt-2 accordion" id="stagesAccordion">
      ${stages.length === 0 
        ? html`<div class="alert alert-info mb-0">No stages yet for this version. Add a stage to begin.</div>`
        : stages.map((s, idx) => html`
            <${StageItem}
              key=${s.id}
              stage=${s}
              index=${idx}
              modules=${modules}
              isOpen=${isOpen(`stage_${s.id}`) || (openIds.size === 0 && idx === 0)}
              onToggle=${toggle}
              onUpdate=${handleUpdateStage}
              onRemove=${handleRemoveStage}
              onModuleToggle=${handleModuleToggle}
              onSemesterChange=${handleSemesterChange}
            />
          `)
      }
    </div>
  `;
}
