/**
 * Versions Step Component (Preact)
 * 
 * Handles programme versions (FT/PT/Online) with delivery patterns.
 */

import { useCallback, useState } from 'preact/hooks';
import { useSignalEffect } from '@preact/signals';
import { html } from '../../lib/htm.js';
import { 
  saveDebounced, 
  defaultVersion,
  programmeSignal,
  selectedVersionIdSignal,
  mutateProgramme,
} from '../../state/store.js';
import { defaultPatternFor, sumPattern } from '../../utils/helpers.js';
import { tagHtml } from '../../utils/dom.js';
import { AccordionControls, AccordionItem, useAccordionState } from './shared-preact.js';

const MOD_DEFS = [
  { key: "F2F", label: "Face-to-face" },
  { key: "BLENDED", label: "Blended" },
  { key: "ONLINE", label: "Fully online" },
];

// ============================================================================
// PREACT COMPONENTS
// ============================================================================

/**
 * DeliveryPattern component - Pattern percentages for a modality
 */
function DeliveryPattern({ version, modality, onUpdate }) {
  const pattern = (version.deliveryPatterns || {})[modality] || defaultPatternFor(modality);
  const total = sumPattern(pattern);
  const isValid = total === 100;
  
  const handleChange = (field, value) => {
    onUpdate(version.id, 'pattern', { modality, field, value: Number(value || 0) });
  };

  return html`
    <div class="card mt-2">
      <div class="card-body">
        <div class="d-flex align-items-center justify-content-between">
          <div class="fw-semibold">${modality} delivery pattern (must total 100%)</div>
          <span class="small">
            <span dangerouslySetInnerHTML=${{ __html: tagHtml(isValid ? 'ok' : 'warn') }}></span>
            <span class="text-secondary">${total}%</span>
          </span>
        </div>
        <div class="row g-2 mt-2">
          <div class="col-md-4">
            <label class="form-label">Synchronous Online Classes %</label>
            <input 
              type="number" 
              min="0" 
              max="100" 
              class="form-control" 
              value=${Number(pattern.syncOnlinePct || 0)}
              onInput=${(e) => handleChange('syncOnlinePct', e.target.value)}
            />
          </div>
          <div class="col-md-4">
            <label class="form-label">Asynchronous Directed Learning %</label>
            <input 
              type="number" 
              min="0" 
              max="100" 
              class="form-control" 
              value=${Number(pattern.asyncDirectedPct || 0)}
              onInput=${(e) => handleChange('asyncDirectedPct', e.target.value)}
            />
          </div>
          <div class="col-md-4">
            <label class="form-label">On Campus Learning Event %</label>
            <input 
              type="number" 
              min="0" 
              max="100" 
              class="form-control" 
              value=${Number(pattern.onCampusPct || 0)}
              onInput=${(e) => handleChange('onCampusPct', e.target.value)}
            />
          </div>
        </div>
      </div>
    </div>
  `;
}

/**
 * VersionItem component - Single version accordion item
 */
function VersionItem({ version, index, isOpen, onToggle, onUpdate, onRemove }) {
  const intakeVal = (version.intakes || []).join(', ');
  const selectedMod = version.deliveryModality || '';
  const modSummary = selectedMod 
    ? (MOD_DEFS.find(m => m.key === selectedMod)?.label || selectedMod) 
    : 'Choose modality';
  
  const proctorYes = (version.onlineProctoredExams || 'TBC') === 'YES';
  
  const headerContent = html`
    <div class="fw-semibold">Version ${index + 1}: ${version.label || '(untitled)'}</div>
    <div class="small text-secondary">
      ${version.code || 'No code'} • ${modSummary} • ${intakeVal || 'No intakes'}
    </div>
  `;
  
  const headerActions = html`
    <span class="btn btn-sm btn-outline-danger" onClick=${(e) => { e.stopPropagation(); onRemove(version.id); }}>Remove</span>
  `;

  return html`
    <${AccordionItem}
      id=${`ver_${version.id}`}
      isOpen=${isOpen}
      onToggle=${() => onToggle(`ver_${version.id}`)}
      headerContent=${headerContent}
      headerActions=${headerActions}
    >
      <div class="row g-3">
        <div class="col-md-6">
          <label class="form-label fw-semibold">Version label</label>
          <input 
            class="form-control" 
            id=${`vlabel_${version.id}`}
            value=${version.label || ''}
            onInput=${(e) => onUpdate(version.id, 'label', e.target.value)}
          />
        </div>
        <div class="col-md-2">
          <label class="form-label fw-semibold">Code</label>
          <input 
            class="form-control" 
            id=${`vcode_${version.id}`}
            value=${version.code || ''}
            onInput=${(e) => onUpdate(version.id, 'code', e.target.value)}
          />
        </div>
        <div class="col-md-4">
          <label class="form-label fw-semibold">Duration</label>
          <input 
            class="form-control" 
            id=${`vduration_${version.id}`}
            value=${version.duration || ''}
            onInput=${(e) => onUpdate(version.id, 'duration', e.target.value)}
            placeholder="e.g., 1 year FT / 2 years PT"
          />
        </div>
        <div class="col-md-6">
          <label class="form-label fw-semibold">Intakes</label>
          <input 
            class="form-control" 
            id=${`vintakes_${version.id}`}
            value=${intakeVal}
            onInput=${(e) => onUpdate(version.id, 'intakes', e.target.value)}
            placeholder="Comma-separated, e.g., Sep, Jan"
          />
        </div>
        <div class="col-md-3">
          <label class="form-label fw-semibold">Target cohort size</label>
          <input 
            type="number" 
            min="0" 
            class="form-control" 
            id=${`vcohort_${version.id}`}
            value=${Number(version.targetCohortSize || 0)}
            onInput=${(e) => onUpdate(version.id, 'targetCohortSize', Number(e.target.value || 0))}
          />
        </div>
        <div class="col-md-3">
          <label class="form-label fw-semibold">Number of groups</label>
          <input 
            type="number" 
            min="0" 
            class="form-control" 
            id=${`vgroups_${version.id}`}
            value=${Number(version.numberOfGroups || 0)}
            onInput=${(e) => onUpdate(version.id, 'numberOfGroups', Number(e.target.value || 0))}
          />
        </div>
        <div class="col-12">
          <label class="form-label fw-semibold">Delivery modality</label>
          <div>
            ${MOD_DEFS.map(m => html`
              <div class="form-check form-check-inline">
                <input 
                  class="form-check-input" 
                  type="radio" 
                  name="vmod_${version.id}" 
                  id="vmod_${version.id}_${m.key}" 
                  value=${m.key}
                  checked=${selectedMod === m.key}
                  onChange=${() => onUpdate(version.id, 'deliveryModality', m.key)}
                />
                <label class="form-check-label" for="vmod_${version.id}_${m.key}">${m.label}</label>
              </div>
            `)}
          </div>
          ${selectedMod 
            ? html`<${DeliveryPattern} version=${version} modality=${selectedMod} onUpdate=${onUpdate} />`
            : html`<div class="small text-secondary mt-2">Select a delivery modality to define delivery patterns.</div>`
          }
        </div>
        <div class="col-12">
          <label class="form-label fw-semibold">Delivery notes</label>
          <textarea 
            class="form-control" 
            rows="3" 
            value=${version.deliveryNotes || ''}
            onInput=${(e) => onUpdate(version.id, 'deliveryNotes', e.target.value)}
            placeholder="High-level plan: where learning happens, key touchpoints."
          />
        </div>
        <div class="col-md-4">
          <label class="form-label fw-semibold">Online proctored exams?</label>
          <select 
            class="form-select" 
            id=${`vproctor_${version.id}`}
            value=${version.onlineProctoredExams || 'TBC'}
            onChange=${(e) => onUpdate(version.id, 'onlineProctoredExams', e.target.value)}
          >
            <option value="TBC">TBC</option>
            <option value="NO">No</option>
            <option value="YES">Yes</option>
          </select>
        </div>
        ${proctorYes && html`
          <div class="col-12">
            <label class="form-label fw-semibold">Proctoring notes</label>
            <textarea 
              class="form-control" 
              rows="2" 
              value=${version.onlineProctoredExamsNotes || ''}
              onInput=${(e) => onUpdate(version.id, 'onlineProctoredExamsNotes', e.target.value)}
              placeholder="What is proctored, when, and why?"
            />
          </div>
        `}
        <div class="col-12">
          <div class="small text-secondary">
            Stages in this version: <span class="fw-semibold">${(version.stages || []).length}</span> (define in the next step).
          </div>
        </div>
      </div>
    <//>
  `;
}

/**
 * VersionsStep Preact component - Main versions form
 */
export function VersionsStep({ onRender }) {
  // Force re-render when programme signal changes
  const [, forceRender] = useState(0);
  useSignalEffect(() => {
    // Access signal value to subscribe
    programmeSignal.value;
    forceRender(n => n + 1);
  });
  
  const programme = programmeSignal.value;
  const versions = Array.isArray(programme.versions) ? programme.versions : [];
  const { openIds, isOpen, toggle, expandAll, collapseAll } = useAccordionState('versions');
  
  const handleAddVersion = () => {
    const v = defaultVersion();
    mutateProgramme(p => {
      const currentVersions = Array.isArray(p.versions) ? p.versions : [];
      p.versions = [...currentVersions, v];
    });
    selectedVersionIdSignal.value = v.id;
    saveDebounced();
    if (onRender) onRender();
  };
  
  const handleRemoveVersion = (versionId) => {
    mutateProgramme(p => {
      p.versions = (p.versions || []).filter(x => x.id !== versionId);
    });
    if (selectedVersionIdSignal.value === versionId) {
      selectedVersionIdSignal.value = (programme.versions[0]?.id) || null;
    }
    saveDebounced();
    if (onRender) onRender();
  };
  
  const handleUpdateVersion = (versionId, field, value) => {
    mutateProgramme(p => {
      const v = (p.versions || []).find(x => x.id === versionId);
      if (!v) return;
      
      if (field === 'intakes') {
        v.intakes = value.split(',').map(x => x.trim()).filter(Boolean);
      } else if (field === 'deliveryModality') {
        v.deliveryModality = value;
        if (!v.deliveryPatterns) v.deliveryPatterns = {};
        if (!v.deliveryPatterns[value]) v.deliveryPatterns[value] = defaultPatternFor(value);
      } else if (field === 'pattern') {
        const { modality, field: patField, value: patValue } = value;
        if (!v.deliveryPatterns) v.deliveryPatterns = {};
        if (!v.deliveryPatterns[modality]) v.deliveryPatterns[modality] = defaultPatternFor(modality);
        v.deliveryPatterns[modality][patField] = patValue;
      } else {
        v[field] = value;
      }
    });
    saveDebounced();
  };
  
  const allIds = versions.map(v => `ver_${v.id}`);

  return html`
    <div class="d-flex align-items-center justify-content-between flex-wrap gap-2">
      <div>
        <h4 class="mb-1">Programme Versions</h4>
        <div class="text-secondary">Create versions (e.g., FT/PT/Online). Each version can have different delivery patterns, capacity, intakes and stage structure.</div>
      </div>
      <button class="btn btn-dark" onClick=${handleAddVersion}>+ Add version</button>
    </div>
    
    ${versions.length > 0 && html`
      <${AccordionControls} 
        accordionId="versionsAccordion"
        onExpandAll=${() => expandAll(allIds)} 
        onCollapseAll=${collapseAll} 
      />
    `}
    
    <div class="mt-2 accordion" id="versionsAccordion">
      ${versions.length === 0 
        ? html`<div class="alert alert-info mb-0">No versions yet. Add at least one version to continue.</div>`
        : versions.map((v, idx) => html`
            <${VersionItem}
              key=${v.id}
              version=${v}
              index=${idx}
              isOpen=${isOpen(`ver_${v.id}`) || (selectedVersionIdSignal.value === v.id) || (openIds.size === 0 && idx === 0)}
              onToggle=${toggle}
              onUpdate=${handleUpdateVersion}
              onRemove=${handleRemoveVersion}
            />
          `)
      }
    </div>
  `;
}
