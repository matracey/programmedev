/**
 * Outcomes (PLOs) Step Component (Preact)
 * 
 * Handles Programme Learning Outcomes with standard mappings.
 */

import { useState, useEffect, useCallback } from 'preact/hooks';
import { useSignalEffect } from '@preact/signals';
import { html } from '../../lib/htm.js';
import { 
  saveDebounced, 
  getAwardStandard, 
  getAwardStandards,
  programmeSignal,
  mutateProgramme,
} from '../../state/store.js';
import { uid } from '../../utils/uid.js';
import { lintLearningOutcome } from '../../lib/lo-lint.js';
import { AccordionControls, AccordionItem, BloomsGuidance, Card, useAccordionState } from './shared-preact.js';

// Track selected standard per PLO for multi-standard support
const ploSelectedStandards = {};

// ============================================================================
// PREACT COMPONENTS
// ============================================================================

/**
 * LintWarnings component - Shows learning outcome lint warnings
 */
function LintWarnings({ text }) {
  const lintResult = lintLearningOutcome(text || '');
  const warnings = lintResult.issues.filter(i => i.severity === 'warn');
  
  if (warnings.length === 0) return null;
  
  return html`
    <div class="plo-lint-warnings mt-2">
      ${warnings.map(issue => html`
        <div class="alert alert-warning py-1 px-2 mb-1 small">
          <strong>⚠️ "${issue.match}"</strong> — ${issue.message}
          ${issue.suggestions.length > 0 && html`
            <br/><em>Try: ${issue.suggestions.join(', ')}</em>
          `}
        </div>
      `)}
    </div>
  `;
}

/**
 * PLOMapping component - Shows a single PLO's standard mappings
 */
function PLOMappings({ plo, programme, onRemoveMapping }) {
  const mappings = plo.standardMappings || [];
  const hasMultipleStandards = (programme.awardStandardIds || []).length > 1;
  
  if (mappings.length === 0) {
    return html`<div class="small text-secondary">No mappings yet for this PLO.</div>`;
  }
  
  if (hasMultipleStandards) {
    // Group by standard
    const byStandard = {};
    mappings.forEach((m, i) => {
      const stdId = m.standardId || (programme.awardStandardIds || [])[0] || 'default';
      if (!byStandard[stdId]) byStandard[stdId] = [];
      byStandard[stdId].push({ ...m, index: i });
    });
    
    return html`
      ${Object.entries(byStandard).map(([stdId, stdMappings]) => {
        const stdIdx = (programme.awardStandardIds || []).indexOf(stdId);
        const stdName = (programme.awardStandardNames || [])[stdIdx] || stdId;
        return html`
          <div class="mb-2">
            <div class="small fw-semibold text-primary mb-1">${stdName}</div>
            <div>
              ${stdMappings.map(m => html`
                <span class="badge text-bg-light border me-2 mb-2">
                  ${m.criteria} / ${m.thread}
                  <button 
                    type="button" 
                    class="btn btn-sm btn-link text-danger p-0 ms-2" 
                    onClick=${() => onRemoveMapping(plo.id, m.index)}
                    title="Remove"
                  >×</button>
                </span>
              `)}
            </div>
          </div>
        `;
      })}
    `;
  }
  
  return html`
    ${mappings.map((m, i) => html`
      <span class="badge text-bg-light border me-2 mb-2">
        ${m.criteria} / ${m.thread}
        <button 
          type="button" 
          class="btn btn-sm btn-link text-danger p-0 ms-2" 
          onClick=${() => onRemoveMapping(plo.id, i)}
          title="Remove"
        >×</button>
      </span>
    `)}
  `;
}

/**
 * PLOMappingUI component - Handles criteria/thread selection for PLO mapping
 */
function PLOMappingUI({ plo, programme, onAddMapping }) {
  const [standard, setStandard] = useState(null);
  const [criteriaList, setCriteriaList] = useState([]);
  const [threadList, setThreadList] = useState([]);
  const [selectedCriteria, setSelectedCriteria] = useState('');
  const [selectedThread, setSelectedThread] = useState('');
  const [description, setDescription] = useState('');
  
  const standardId = programme.awardStandardIds?.[0];
  const nfqLevel = String(programme.nfqLevel || '');
  
  // Load standard data on mount or when standardId changes
  useEffect(() => {
    if (!standardId) return;
    
    getAwardStandard(standardId).then(std => {
      setStandard(std);
      const criteria = Object.keys(std?.index || {}).sort((a, b) => a.localeCompare(b));
      setCriteriaList(criteria);
    }).catch(err => {
      console.warn('Failed to load standard:', err);
    });
  }, [standardId]);
  
  // Update thread list when criteria changes
  useEffect(() => {
    if (!standard || !selectedCriteria) {
      setThreadList([]);
      setDescription('');
      return;
    }
    
    const threads = Object.keys(standard.index?.[selectedCriteria] || {}).sort((a, b) => a.localeCompare(b));
    setThreadList(threads);
    setSelectedThread('');
    setDescription('');
  }, [standard, selectedCriteria]);
  
  // Update description when thread changes
  useEffect(() => {
    if (!standard || !selectedCriteria || !selectedThread) {
      setDescription('');
      return;
    }
    
    const desc = standard.index?.[selectedCriteria]?.[selectedThread]?.[nfqLevel] || '';
    setDescription(desc || (selectedCriteria && selectedThread ? 'No descriptor found for this level.' : ''));
  }, [standard, selectedCriteria, selectedThread, nfqLevel]);
  
  const handleAddMapping = () => {
    if (!selectedCriteria || !selectedThread) return;
    onAddMapping(plo.id, selectedCriteria, selectedThread, standardId);
    setSelectedCriteria('');
    setSelectedThread('');
    setDescription('');
  };

  return html`
    <div class="row g-2 mb-2 align-items-center">
      <div class="col-md-4">
        <select 
          class="form-select form-select-sm" 
          data-plo-map-criteria=${plo.id}
          value=${selectedCriteria}
          onChange=${(e) => setSelectedCriteria(e.target.value)}
        >
          <option value="">Select criteria...</option>
          ${criteriaList.map(c => html`<option value=${c}>${c}</option>`)}
        </select>
      </div>
      <div class="col-md-4">
        <select 
          class="form-select form-select-sm" 
          data-plo-map-thread=${plo.id}
          value=${selectedThread}
          onChange=${(e) => setSelectedThread(e.target.value)}
        >
          <option value="">Select thread...</option>
          ${threadList.map(t => html`<option value=${t}>${t}</option>`)}
        </select>
      </div>
      <div class="col-auto">
        <button 
          type="button" 
          class="btn btn-outline-primary btn-sm" 
          data-add-plo-map=${plo.id}
          onClick=${handleAddMapping}
          disabled=${!selectedCriteria || !selectedThread}
        >Add mapping</button>
      </div>
    </div>
    <div class="small text-secondary mt-2" data-plo-map-desc=${plo.id}>${description}</div>
  `;
}

/**
 * PLOItem component - Single PLO accordion item
 */
function PLOItem({ plo, index, programme, isOpen, onToggle, onUpdate, onRemove, onAddMapping }) {
  const preview = (plo.text || '').trim();
  const previewShort = preview.length > 120 ? `${preview.slice(0, 120)}…` : (preview || 'No text yet');
  
  const handleTextChange = (e) => {
    onUpdate(plo.id, 'text', e.target.value);
  };
  
  const handleRemoveMapping = (ploId, mappingIndex) => {
    onUpdate(ploId, 'removeMapping', mappingIndex);
  };
  
  const headerContent = html`
    <div class="fw-semibold">PLO ${index + 1}</div>
    <div class="small text-secondary">${previewShort}</div>
  `;
  
  const headerActions = html`
    <span class="btn btn-outline-danger btn-sm" data-remove-plo=${plo.id} onClick=${(e) => { e.stopPropagation(); onRemove(plo.id); }}>Remove</span>
  `;
  
  const hasStandards = programme.awardStandardIds && programme.awardStandardIds.length > 0;

  return html`
    <${AccordionItem}
      id=${`plo_${plo.id}`}
      isOpen=${isOpen}
      onToggle=${() => onToggle(`plo_${plo.id}`)}
      headerContent=${headerContent}
      headerActions=${headerActions}
    >
      <textarea 
        class="form-control" 
        rows="3" 
        placeholder="e.g., Analyse… / Design and implement…"
        data-plo-id=${plo.id}
        value=${plo.text || ''}
        onInput=${handleTextChange}
      />
      <${LintWarnings} text=${plo.text} />
      
      <div class="mt-3">
        <div class="fw-semibold small mb-2">Map this PLO to QQI award standards</div>
        ${!hasStandards 
          ? html`<div class="small text-danger">Select a QQI award standard in Identity to enable mapping.</div>`
          : html`
              <${PLOMappingUI} 
                plo=${plo} 
                programme=${programme} 
                onAddMapping=${onAddMapping}
              />
              <div class="mt-2" data-plo-map-list=${plo.id}>
                <${PLOMappings} 
                  plo=${plo} 
                  programme=${programme} 
                  onRemoveMapping=${handleRemoveMapping}
                />
              </div>
            `
        }
      </div>
    <//>
  `;
}

/**
 * OutcomesStep Preact component - Main PLOs form
 */
export function OutcomesStep({ onRender }) {
  // Force re-render when programme signal changes
  const [, forceRender] = useState(0);
  useSignalEffect(() => {
    programmeSignal.value;
    forceRender(n => n + 1);
  });
  
  const programme = programmeSignal.value;
  const { openIds, isOpen, toggle, expandAll, collapseAll } = useAccordionState('plos');
  
  const plos = programme.plos || [];
  
  const doUpdate = useCallback(() => {
    if (onRender) onRender();
    saveDebounced(() => {
      if (onRender) onRender();
    });
  }, [onRender]);
  
  const handleAddPLO = () => {
    mutateProgramme(p => {
      const currentPlos = Array.isArray(p.plos) ? p.plos : [];
      p.plos = [...currentPlos, { id: uid('plo'), text: '', standardMappings: [] }];
    });
    saveDebounced();
    if (onRender) onRender();
  };
  
  const handleRemovePLO = (ploId) => {
    mutateProgramme(p => {
      p.plos = (p.plos || []).filter(o => o.id !== ploId);
      delete p.ploToModules[ploId];
    });
    delete ploSelectedStandards[ploId];
    saveDebounced();
    if (onRender) onRender();
  };
  
  const handleUpdatePLO = (ploId, field, value) => {
    mutateProgramme(p => {
      const plo = (p.plos || []).find(o => o.id === ploId);
      if (!plo) return;
      
      if (field === 'text') {
        plo.text = value;
      } else if (field === 'removeMapping') {
        plo.standardMappings = (plo.standardMappings || []).filter((_, idx) => idx !== value);
      }
    });
    saveDebounced();
  };
  
  const handleAddMapping = (ploId, criteria, thread, standardId) => {
    mutateProgramme(p => {
      const plo = (p.plos || []).find(o => o.id === ploId);
      if (!plo) return;
      if (!Array.isArray(plo.standardMappings)) plo.standardMappings = [];
      
      // Avoid duplicate mappings
      const exists = plo.standardMappings.some(m => 
        m.criteria === criteria && m.thread === thread && m.standardId === standardId
      );
      if (!exists) {
        plo.standardMappings.push({ criteria, thread, standardId });
      }
    });
    saveDebounced();
    if (onRender) onRender();
  };
  
  const allIds = plos.map(p => `plo_${p.id}`);

  return html`
    <${Card} 
      title="Programme Learning Outcomes (PLOs) (QQI-critical)"
      headerActions=${html`<button class="btn btn-dark btn-sm" onClick=${handleAddPLO}>+ Add PLO</button>`}
    >
      <${BloomsGuidance} level=${programme.nfqLevel} contextLabel="Programme Learning Outcomes" />
      <div class="small text-muted mb-3">Aim for ~6–12 clear, assessable outcomes. Keep them measurable and assessable.</div>
      
      ${plos.length > 0 && html`
        <${AccordionControls} 
          accordionId="ploAccordion"
          onExpandAll=${() => expandAll(allIds)} 
          onCollapseAll=${collapseAll} 
        />
      `}
      
      <div class="accordion" id="ploAccordion">
        ${plos.length === 0 
          ? html`<div class="alert alert-info mb-0">No PLOs added yet.</div>`
          : plos.map((plo, idx) => html`
              <${PLOItem}
                key=${plo.id}
                plo=${plo}
                index=${idx}
                programme=${programme}
                isOpen=${isOpen(`plo_${plo.id}`) || (openIds.size === 0 && idx === 0)}
                onToggle=${toggle}
                onUpdate=${handleUpdatePLO}
                onRemove=${handleRemovePLO}
                onAddMapping=${handleAddMapping}
              />
            `)
        }
      </div>
      
      <hr class="my-4"/>
      <h6 class="mb-2">PLO ↔ Award Standard Mapping Snapshot</h6>
      <div id="ploMappingSnapshot" class="small">
        ${plos.length === 0 
          ? html`<div class="text-secondary">Add PLOs to see a mapping snapshot.</div>`
          : null
        }
      </div>
    <//>
  `;
}
