/**
 * Identity Step Component (Preact)
 * 
 * Handles programme identity fields: title, award type, NFQ level, credits, etc.
 */

import { useState, useEffect, useCallback } from 'preact/hooks';
import { useSignalEffect } from '@preact/signals';
import { html } from '../../lib/htm.js';
import { 
  saveDebounced, 
  SCHOOL_OPTIONS, 
  AWARD_TYPE_OPTIONS, 
  getAwardStandards, 
  getAwardStandard,
  programmeSignal,
  mutateProgramme,
} from '../../state/store.js';
import { uid } from '../../utils/uid.js';
import { AccordionControls, AccordionItem, Card, useAccordionState } from './shared-preact.js';

// Cache award standards for quick selector rendering
let standardsCache = [];
let standardsLoaded = false;

// ============================================================================
// PREACT COMPONENTS
// ============================================================================

/**
 * ElectiveGroup component - Single group within an elective definition
 */
function ElectiveGroup({ group, groupIdx, defId, onUpdate }) {
  const handleCodeChange = (e) => {
    onUpdate('groupCode', defId, group.id, e.target.value);
  };
  
  const handleNameChange = (e) => {
    onUpdate('groupName', defId, group.id, e.target.value);
  };
  
  const handleRemove = () => {
    onUpdate('removeGroup', defId, group.id);
  };

  return html`
    <div class="row g-2 mb-2 align-items-center">
      <div class="col-auto">
        <span class="badge text-bg-secondary">${groupIdx + 1}</span>
      </div>
      <div class="col-md-3">
        <input 
          class="form-control form-control-sm" 
          value=${group.code || ''}
          onInput=${handleCodeChange}
          placeholder="Code"
        />
      </div>
      <div class="col">
        <input 
          class="form-control form-control-sm" 
          value=${group.name || ''}
          onInput=${handleNameChange}
          placeholder="Group name (e.g., Data Analytics Track)"
        />
      </div>
      <div class="col-auto">
        <button 
          class="btn btn-sm btn-outline-danger" 
          onClick=${handleRemove}
          title="Remove group"
        >×</button>
      </div>
    </div>
  `;
}

/**
 * ElectiveDefinition component - Single elective definition with groups
 */
function ElectiveDefinition({ def, defIdx, isOpen, onToggle, onUpdate }) {
  const defName = def.name || `Elective Definition ${defIdx + 1}`;
  const defCode = def.code || '';
  const headerLabel = defCode ? `[${defCode}] ${defName}` : defName;
  
  const handleCodeChange = (e) => onUpdate('defCode', def.id, null, e.target.value);
  const handleNameChange = (e) => onUpdate('defName', def.id, null, e.target.value);
  const handleCreditsChange = (e) => onUpdate('defCredits', def.id, null, Number(e.target.value || 0));
  const handleAddGroup = () => onUpdate('addGroup', def.id);
  const handleRemove = () => onUpdate('removeDef', def.id);

  const headerContent = html`
    <div class="fw-semibold">${headerLabel}</div>
    <div class="small text-secondary">${Number(def.credits || 0)} cr • ${(def.groups || []).length} group(s)</div>
  `;
  
  const headerActions = html`
    <span class="btn btn-sm btn-outline-danger" data-remove-elective-definition=${def.id} onClick=${handleRemove}>Remove</span>
  `;

  return html`
    <${AccordionItem}
      id=${`electiveDef_${def.id}`}
      isOpen=${isOpen}
      onToggle=${() => onToggle(`electiveDef_${def.id}`)}
      headerContent=${headerContent}
      headerActions=${headerActions}
    >
      <div class="row g-2 mb-3">
        <div class="col-md-2">
          <label class="form-label small mb-1">Code</label>
          <input 
            class="form-control form-control-sm" 
            value=${defCode}
            onInput=${handleCodeChange}
            placeholder="e.g., ELEC1"
          />
        </div>
        <div class="col-md-5">
          <label class="form-label small mb-1">Name</label>
          <input 
            class="form-control form-control-sm" 
            value=${def.name || ''}
            onInput=${handleNameChange}
            placeholder="e.g., Year 3 Specialization"
          />
        </div>
        <div class="col-md-3">
          <label class="form-label small mb-1">Credits (all groups)</label>
          <div class="input-group input-group-sm">
            <input 
              type="number" 
              class="form-control" 
              value=${Number(def.credits || 0)}
              onInput=${handleCreditsChange}
              min="0" 
              step="5" 
              placeholder="Credits"
            />
            <span class="input-group-text">cr</span>
          </div>
        </div>
      </div>
      <label class="form-label small mb-1">Groups (students choose one)</label>
      <div class="small text-muted mb-2">Code • Name</div>
      ${(def.groups || []).length === 0 
        ? html`<div class="text-muted small mb-2">No groups in this definition yet.</div>`
        : (def.groups || []).map((grp, grpIdx) => html`
            <${ElectiveGroup} 
              key=${grp.id}
              group=${grp} 
              groupIdx=${grpIdx} 
              defId=${def.id}
              onUpdate=${onUpdate}
            />
          `)
      }
      <button class="btn btn-outline-secondary btn-sm" onClick=${handleAddGroup}>+ Add group</button>
    <//>
  `;
}

/**
 * ElectiveDefinitionsList Preact component
 */
export function ElectiveDefinitionsList({ programme, onUpdate }) {
  const definitions = programme.electiveDefinitions || [];
  const { isOpen, toggle, expandAll, collapseAll } = useAccordionState('electiveDefinitions');
  
  if (definitions.length === 0) {
    return html`
      <div class="alert alert-light mb-0">
        No elective definitions yet. Add definitions to create specialization tracks.
      </div>
    `;
  }
  
  const allIds = definitions.map(d => `electiveDef_${d.id}`);

  return html`
    <${AccordionControls} 
      accordionId="electiveDefinitionsAccordion"
      onExpandAll=${() => expandAll(allIds)} 
      onCollapseAll=${collapseAll} 
    />
    <div class="accordion" id="electiveDefinitionsAccordion">
      ${definitions.map((def, defIdx) => html`
        <${ElectiveDefinition}
          key=${def.id}
          def=${def}
          defIdx=${defIdx}
          isOpen=${isOpen(`electiveDef_${def.id}`) || (definitions.length === 1 && defIdx === 0)}
          onToggle=${toggle}
          onUpdate=${onUpdate}
        />
      `)}
    </div>
  `;
}

/**
 * StandardSelector Preact component - For selecting QQI award standards
 */
function StandardSelector({ index, selectedId, standards, canRemove, onSelect, onRemove }) {
  return html`
    <div class="d-flex gap-2 mb-2 align-items-start">
      <select 
        class="form-select standard-selector" 
        value=${selectedId || ''}
        onChange=${(e) => onSelect(index, e.target.value)}
      >
        <option value="">Select a standard${index > 0 ? ' (optional)' : ''}</option>
        ${standards.map(s => {
          const id = s?.standard_id || '';
          const name = s?.standard_name || s?.standardName || id;
          return html`<option value=${id}>${name}</option>`;
        })}
      </select>
      ${canRemove && selectedId && html`
        <button 
          type="button" 
          class="btn btn-outline-danger" 
          onClick=${() => onRemove(index)}
        >
          Remove
        </button>
      `}
    </div>
  `;
}

/**
 * IdentityStep Preact component - Main identity form
 */
export function IdentityStep({ onRender }) {
  // Force re-render when programme signal changes
  const [, forceRender] = useState(0);
  useSignalEffect(() => {
    programmeSignal.value;
    forceRender(n => n + 1);
  });
  
  const programme = programmeSignal.value;
  const [standards, setStandards] = useState(standardsCache);
  const [standardsLoading, setStandardsLoading] = useState(!standardsLoaded);
  
  // Load standards on mount
  useEffect(() => {
    if (!standardsLoaded) {
      standardsLoaded = true;
      getAwardStandards().then(list => {
        standardsCache = Array.isArray(list) ? list : [];
        setStandards(standardsCache);
        setStandardsLoading(false);
      }).catch(() => {
        standardsCache = [];
        setStandards([]);
        setStandardsLoading(false);
      });
    }
  }, []);
  
  const doUpdate = useCallback(() => {
    if (onRender) onRender();
    saveDebounced(() => {
      if (onRender) onRender();
    });
  }, [onRender]);
  
  // Handlers for identity fields
  const handleTitleChange = (e) => {
    mutateProgramme(p => { p.title = e.target.value; });
    doUpdate();
  };
  
  const handleAwardChange = (e) => {
    mutateProgramme(p => {
      if (e.target.value === 'Other') {
        p.awardTypeIsOther = true;
        p.awardType = '';
      } else {
        p.awardTypeIsOther = false;
        p.awardType = e.target.value;
      }
    });
    doUpdate();
  };
  
  const handleAwardOtherChange = (e) => {
    mutateProgramme(p => {
      if (p.awardTypeIsOther) {
        p.awardType = e.target.value;
      }
    });
    doUpdate();
  };
  
  const handleLevelChange = (e) => {
    mutateProgramme(p => {
      p.nfqLevel = e.target.value ? Number(e.target.value) : null;
    });
    doUpdate();
  };
  
  const handleCreditsChange = (e) => {
    mutateProgramme(p => {
      p.totalCredits = Number(e.target.value || 0);
    });
    doUpdate();
  };
  
  const handleSchoolChange = (e) => {
    mutateProgramme(p => { p.school = e.target.value; });
    doUpdate();
  };
  
  const handleIntakeChange = (e) => {
    mutateProgramme(p => {
      p.intakeMonths = e.target.value.split(',').map(s => s.trim()).filter(Boolean);
    });
    doUpdate();
  };
  
  // Standard selection handlers
  const handleStandardSelect = async (index, value) => {
    mutateProgramme(p => {
      if (!Array.isArray(p.awardStandardIds)) p.awardStandardIds = [];
      if (!Array.isArray(p.awardStandardNames)) p.awardStandardNames = [];
      
      if (value) {
        p.awardStandardIds[index] = value;
        const std = standards.find(s => s?.standard_id === value);
        p.awardStandardNames[index] = std?.standard_name || std?.standardName || 'QQI Award Standard';
      } else {
        p.awardStandardIds.splice(index, 1);
        p.awardStandardNames.splice(index, 1);
      }
      p.awardStandardIds = p.awardStandardIds.filter(Boolean);
      p.awardStandardNames = p.awardStandardNames.filter(Boolean);
    });
    doUpdate();
  };
  
  const handleStandardRemove = (index) => {
    mutateProgramme(p => {
      p.awardStandardIds.splice(index, 1);
      p.awardStandardNames.splice(index, 1);
    });
    doUpdate();
  };
  
  // Elective definition handlers
  const handleElectiveUpdate = (action, defId, groupId, value) => {
    mutateProgramme(p => {
      if (!Array.isArray(p.electiveDefinitions)) p.electiveDefinitions = [];
      const def = p.electiveDefinitions.find(d => d.id === defId);
      
      switch (action) {
        case 'addDef': {
          const defNum = p.electiveDefinitions.length + 1;
          const defCode = `ELEC${defNum}`;
          p.electiveDefinitions = [...p.electiveDefinitions, {
            id: uid('edef'),
            name: '',
            code: defCode,
            credits: 0,
            groups: [{ id: uid('egrp'), name: '', code: `${defCode}-A`, moduleIds: [] }]
          }];
          break;
        }
        case 'removeDef':
          p.electiveDefinitions = p.electiveDefinitions.filter(d => d.id !== defId);
          break;
        case 'defCode':
          if (def) {
            const oldCode = def.code || '';
            def.code = value;
            // Update group codes
            if (oldCode) {
              (def.groups || []).forEach(grp => {
                if (grp.code && grp.code.startsWith(oldCode)) {
                  grp.code = value + grp.code.slice(oldCode.length);
                }
              });
            }
          }
          break;
        case 'defName':
          if (def) def.name = value;
          break;
        case 'defCredits':
          if (def) def.credits = value;
          break;
        case 'addGroup':
          if (def) {
            const currentGroups = Array.isArray(def.groups) ? def.groups : [];
            const defCode = def.code || '';
            const nextLetter = String.fromCharCode(65 + currentGroups.length);
            const groupCode = defCode ? `${defCode}-${nextLetter}` : '';
            def.groups = [...currentGroups, { id: uid('egrp'), name: '', code: groupCode, moduleIds: [] }];
          }
          break;
        case 'removeGroup':
          if (def) def.groups = (def.groups || []).filter(g => g.id !== groupId);
          break;
        case 'groupCode': {
          if (def) {
            const grp = (def.groups || []).find(g => g.id === groupId);
            if (grp) grp.code = value;
          }
          break;
        }
        case 'groupName': {
          if (def) {
            const grp = (def.groups || []).find(g => g.id === groupId);
            if (grp) grp.name = value;
          }
          break;
        }
      }
    });
    saveDebounced();
    if (onRender) onRender();
  };
  
  const handleAddDefinition = () => handleElectiveUpdate('addDef');
  
  // Render standard selectors
  const numSelectors = Math.min((programme.awardStandardIds?.length || 0) + 1, 2);
  const standardSelectors = [];
  for (let i = 0; i < numSelectors; i++) {
    const selectedId = programme.awardStandardIds?.[i] || '';
    const canRemove = i > 0 || (programme.awardStandardIds?.length || 0) > 1;
    standardSelectors.push(html`
      <${StandardSelector}
        key=${i}
        index=${i}
        selectedId=${selectedId}
        standards=${standards}
        canRemove=${canRemove}
        onSelect=${handleStandardSelect}
        onRemove=${handleStandardRemove}
      />
    `);
  }

  return html`
    <${Card} title="Identity (QQI-critical)">
      <div class="row g-3">
        <div class="col-md-6">
          <label class="form-label fw-semibold">Programme title</label>
          <input 
            class="form-control" 
            id="titleInput"
            value=${programme.title || ''}
            onInput=${handleTitleChange}
          />
        </div>
        <div class="col-md-6">
          <label class="form-label fw-semibold">Award type</label>
          <select 
            class="form-select" 
            id="awardSelect"
            value=${programme.awardTypeIsOther ? 'Other' : (programme.awardType || '')}
            onChange=${handleAwardChange}
          >
            <option value="" disabled>Select an award type</option>
            ${AWARD_TYPE_OPTIONS.map(a => 
              a === 'Other' 
                ? html`<option value="Other">Other (type below)</option>`
                : html`<option value=${a}>${a}</option>`
            )}
          </select>
          ${programme.awardTypeIsOther && html`
            <div class="mt-2">
              <input 
                class="form-control" 
                id="awardOtherInput"
                value=${programme.awardType || ''}
                onInput=${handleAwardOtherChange}
                placeholder="Type the award type"
              />
            </div>
          `}
        </div>
        <div class="col-md-4">
          <label class="form-label fw-semibold">NFQ level</label>
          <input 
            type="number" 
            min="6" 
            max="9" 
            step="1" 
            class="form-control" 
            id="levelInput"
            value=${programme.nfqLevel ?? ''}
            onInput=${handleLevelChange}
          />
        </div>
        <div class="col-md-4">
          <label class="form-label fw-semibold">Total credits (ECTS)</label>
          <input 
            type="number" 
            min="1" 
            step="1" 
            class="form-control" 
            id="totalCreditsInput"
            value=${programme.totalCredits ?? ''}
            onInput=${handleCreditsChange}
            placeholder="e.g., 180 / 240"
          />
        </div>
        <div class="col-md-4">
          <label class="form-label fw-semibold">School / Discipline</label>
          <select 
            class="form-select" 
            id="schoolSelect"
            value=${programme.school || ''}
            onChange=${handleSchoolChange}
          >
            <option value="" disabled>Select a School</option>
            ${SCHOOL_OPTIONS.map(s => html`<option value=${s}>${s}</option>`)}
          </select>
        </div>
        <div class="col-md-12">
          <label class="form-label fw-semibold">QQI award standard</label>
          <div id="standardSelectorsContainer">
            ${standardSelectors}
          </div>
          <div class="form-text">Select up to two standards. These drive PLO mapping and autocompletion.</div>
        </div>
        <div class="col-12">
          <label class="form-label fw-semibold">Intake months</label>
          <input 
            class="form-control" 
            id="intakeInput"
            value=${(programme.intakeMonths || []).join(', ')}
            onInput=${handleIntakeChange}
            placeholder="Comma-separated, e.g., Sep, Jan"
          />
        </div>
      </div>
    <//>

    <${Card} 
      title="Elective Definitions" 
      className="mt-3"
      headerActions=${html`
        <button class="btn btn-dark btn-sm" onClick=${handleAddDefinition}>+ Add definition</button>
      `}
    >
      <div class="alert alert-light mb-3">
        <strong>How elective definitions work:</strong>
        <ul class="mb-0 mt-1 small">
          <li>Students complete <strong>every</strong> elective definition in the programme</li>
          <li>For each definition, students choose <strong>one group</strong> to complete</li>
          <li>All groups within a definition share the same credit requirement</li>
        </ul>
      </div>
      <${ElectiveDefinitionsList} 
        programme=${programme} 
        onUpdate=${handleElectiveUpdate}
      />
    <//>
  `;
}
