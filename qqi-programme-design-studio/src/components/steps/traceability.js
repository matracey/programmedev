/**
 * Traceability step component (Full alignment chain with Sankey visualization)
 */

import { state, getAwardStandard } from '../../state/store.js';
import { escapeHtml } from '../../utils/dom.js';
import { ploText, mimloText } from '../../utils/helpers.js';
import { getDevModeToggleHtml, wireDevModeToggle } from '../dev-mode.js';

// Cache for standards data
let standardsDataCache = null;

/**
 * Render the Traceability step
 */
export async function renderTraceabilityStep() {
  const p = state.programme;
  const content = document.getElementById("content");
  if (!content) return;

  // Load award standards
  if (!standardsDataCache) {
    try {
      standardsDataCache = await getAwardStandard();
    } catch (e) {
      console.warn("Failed to load standards:", e);
      standardsDataCache = { levels: {} };
    }
  }

  const devModeToggleHtml = getDevModeToggleHtml();
  const plos = p.plos || [];
  const modules = p.modules || [];

  // Build trace rows for the table and Sankey
  const { traceRows, stats, standardsCoverageHtml } = buildTraceRows(p, standardsDataCache);

  // Build table rows HTML
  const tableRowsHtml = buildTableRowsHtml(traceRows);

  // Build Sankey data
  const sankeyData = buildSankeyData(traceRows);

  // Module options for filter
  const moduleOptions = modules.map(m => 
    `<option value="${escapeHtml(m.code || m.title)}">${escapeHtml(m.code || m.title)}</option>`
  ).join('');

  content.innerHTML = devModeToggleHtml + `
    <div class="card shadow-sm">
      <div class="card-body">
        <h5 class="card-title mb-3">Traceability Matrix</h5>
        <p class="small text-secondary mb-3">This shows the full alignment chain from QQI Award Standards → PLOs → Modules → MIMLOs → Assessments. Use the tabs to switch between table and diagram views.</p>
        
        ${standardsCoverageHtml}
        
        <div class="d-flex flex-wrap gap-3 mb-3 align-items-center">
          <div class="d-flex align-items-center gap-2">
            <span class="badge text-bg-success">${stats.coveredCount}</span>
            <span class="small">Covered</span>
          </div>
          <div class="d-flex align-items-center gap-2">
            <span class="badge text-bg-warning">${stats.warningCount}</span>
            <span class="small">Assessment Gaps</span>
          </div>
          <div class="d-flex align-items-center gap-2">
            <span class="badge text-bg-danger">${stats.gapCount}</span>
            <span class="small">PLO/MIMLO Gaps</span>
          </div>
          ${stats.uncoveredCount > 0 ? `
          <div class="d-flex align-items-center gap-2">
            <span class="badge text-bg-dark">${stats.uncoveredCount}</span>
            <span class="small">Uncovered Standards</span>
          </div>
          ` : ''}
        </div>

        <!-- Tab navigation -->
        <ul class="nav nav-tabs mb-3" id="traceabilityTabs" role="tablist">
          <li class="nav-item" role="presentation">
            <button class="nav-link active" id="table-tab" data-bs-toggle="tab" data-bs-target="#tableView" type="button" role="tab" aria-controls="tableView" aria-selected="true">
              Table View
            </button>
          </li>
          <li class="nav-item" role="presentation">
            <button class="nav-link" id="sankey-tab" data-bs-toggle="tab" data-bs-target="#sankeyView" type="button" role="tab" aria-controls="sankeyView" aria-selected="false">
              Sankey Diagram
            </button>
          </li>
        </ul>

        <div class="tab-content" id="traceabilityTabContent">
          <!-- Table View Tab -->
          <div class="tab-pane fade show active" id="tableView" role="tabpanel" aria-labelledby="table-tab">
            <div class="d-flex flex-wrap gap-2 mb-3 align-items-center">
              <select class="form-select form-select-sm" id="traceFilterStatus" style="width:auto;">
                <option value="all">All statuses</option>
                <option value="ok">Covered only</option>
                <option value="warning">Assessment gaps</option>
                <option value="gap">PLO/MIMLO gaps</option>
                <option value="uncovered">Uncovered standards</option>
              </select>
              <select class="form-select form-select-sm" id="traceFilterModule" style="width:auto;">
                <option value="all">All modules</option>
                ${moduleOptions}
              </select>
              <button class="btn btn-outline-secondary btn-sm" id="traceExportCsv">Export CSV</button>
            </div>

            ${traceRows.length > 0 ? `
              <div class="table-responsive" style="max-height: 600px; overflow-y: auto;">
                <table class="table table-sm table-hover table-bordered align-middle mb-0" id="traceabilityTable">
                  <thead class="sticky-top" style="background: var(--bs-body-bg);">
                    <tr>
                      <th style="min-width:140px;">Award Standard</th>
                      <th style="min-width:60px;">PLO</th>
                      <th style="min-width:150px;">PLO Text</th>
                      <th style="min-width:80px;">Module</th>
                      <th style="min-width:120px;">Module Title</th>
                      <th style="min-width:70px;">MIMLO</th>
                      <th style="min-width:140px;">MIMLO Text</th>
                      <th style="min-width:100px;">Assessment</th>
                      <th style="min-width:100px;">Type</th>
                      <th style="min-width:60px;">Weight</th>
                      <th style="min-width:80px;">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${tableRowsHtml}
                  </tbody>
                </table>
              </div>
              <div class="small text-secondary mt-2">${traceRows.length} alignment${traceRows.length !== 1 ? 's' : ''} shown</div>
            ` : `
              <div class="alert alert-info mb-0">No traceability data yet. Add PLOs, map them to modules, define MIMLOs, and create assessments to see the full alignment chain.</div>
            `}
          </div>

          <!-- Sankey Diagram Tab -->
          <div class="tab-pane fade" id="sankeyView" role="tabpanel" aria-labelledby="sankey-tab">
            ${traceRows.length > 0 ? `
              <div class="mb-2">
                <div class="small text-secondary mb-2">Flow diagram showing alignments from Award Standards through to Assessments. Hover over nodes and links for details.</div>
                <div class="d-flex gap-2 flex-wrap mb-2">
                  <span class="badge text-bg-success">● Covered</span>
                  <span class="badge text-bg-warning">● Warning</span>
                  <span class="badge text-bg-danger">● Gap</span>
                  <span class="badge text-bg-dark">● Uncovered</span>
                </div>
              </div>
              <div id="sankeyChart" style="width:100%; height:600px; background: var(--bs-body-bg); border-radius: 0.375rem;"></div>
            ` : `
              <div class="alert alert-info mb-0">No traceability data yet. Add PLOs, map them to modules, define MIMLOs, and create assessments to see the Sankey diagram.</div>
            `}
          </div>
        </div>
      </div>
    </div>
  `;

  wireDevModeToggle(() => window.render?.());
  wireTraceability();

  // Render Sankey diagram when data exists
  if (traceRows.length > 0) {
    renderSankeyDiagram(sankeyData);
    // Re-render Sankey when tab is shown (Plotly needs visible container)
    document.getElementById('sankey-tab')?.addEventListener('shown.bs.tab', () => {
      renderSankeyDiagram(sankeyData);
    });
  }
}

/**
 * Build trace rows from programme data
 */
function buildTraceRows(p, standardsData) {
  const traceRows = [];
  const moduleMap = new Map((p.modules || []).map(m => [m.id, m]));

  // Get all award standards for the programme's NFQ level
  const nfqLevel = String(p.nfqLevel || '');
  const levelStandards = (standardsData?.levels?.[nfqLevel]) || [];

  // Track which standards are covered by PLOs
  const coveredStandards = new Set();

  (p.plos || []).forEach((plo, ploIdx) => {
    const standardMappings = plo.standardMappings || [];
    const mappedModuleIds = p.ploToModules?.[plo.id] || [];

    // If no standard mappings, still show the PLO
    const standards = standardMappings.length > 0
      ? standardMappings
      : [{ criteria: '(Not mapped)', thread: '' }];

    standards.forEach(std => {
      const standardLabel = std.thread ? `${std.criteria} — ${std.thread}` : std.criteria;

      // Mark this standard as covered by a PLO
      if (std.thread) {
        coveredStandards.add(std.thread);
      }

      if (mappedModuleIds.length === 0) {
        // PLO not mapped to any module
        traceRows.push({
          standard: standardLabel,
          ploNum: ploIdx + 1,
          ploText: plo.text || '',
          moduleCode: '—',
          moduleTitle: '(Not mapped to module)',
          mimloNum: '—',
          mimloText: '',
          assessmentTitle: '',
          assessmentType: '',
          assessmentWeight: '',
          status: 'gap',
          statusLabel: 'PLO Gap'
        });
      } else {
        mappedModuleIds.forEach(modId => {
          const mod = moduleMap.get(modId);
          if (!mod) return;

          const mimlos = mod.mimlos || [];
          const assessments = mod.assessments || [];

          if (mimlos.length === 0) {
            // Module has no MIMLOs
            traceRows.push({
              standard: standardLabel,
              ploNum: ploIdx + 1,
              ploText: plo.text || '',
              moduleCode: mod.code || '',
              moduleTitle: mod.title || '',
              mimloNum: '—',
              mimloText: '(No MIMLOs defined)',
              assessmentTitle: '',
              assessmentType: '',
              assessmentWeight: '',
              status: 'gap',
              statusLabel: 'MIMLO Gap'
            });
          } else {
            mimlos.forEach((mimlo, mimloIdx) => {
              const mimloId = mimlo.id || `mimlo_${mimloIdx}`;
              // Find assessments that cover this MIMLO
              const coveringAssessments = assessments.filter(a =>
                (a.mimloIds || a.mappedMimlos || []).includes(mimloId)
              );

              if (coveringAssessments.length === 0) {
                // MIMLO not assessed
                traceRows.push({
                  standard: standardLabel,
                  ploNum: ploIdx + 1,
                  ploText: plo.text || '',
                  moduleCode: mod.code || '',
                  moduleTitle: mod.title || '',
                  mimloNum: mimloIdx + 1,
                  mimloText: mimlo.text || '',
                  assessmentTitle: '—',
                  assessmentType: '(Not assessed)',
                  assessmentWeight: '',
                  status: 'warning',
                  statusLabel: 'Assessment Gap'
                });
              } else {
                coveringAssessments.forEach(asm => {
                  traceRows.push({
                    standard: standardLabel,
                    ploNum: ploIdx + 1,
                    ploText: plo.text || '',
                    moduleCode: mod.code || '',
                    moduleTitle: mod.title || '',
                    mimloNum: mimloIdx + 1,
                    mimloText: mimlo.text || '',
                    assessmentTitle: asm.title || '',
                    assessmentType: asm.type || '',
                    assessmentWeight: asm.weighting ? `${asm.weighting}%` : '',
                    status: 'ok',
                    statusLabel: 'Covered'
                  });
                });
              }
            });
          }
        });
      }
    });
  });

  // Find uncovered award standards and add them as critical gaps
  const uncoveredStandards = levelStandards.filter(std => !coveredStandards.has(std.thread));
  uncoveredStandards.forEach(std => {
    const standardLabel = std.thread ? `${std.criteria} — ${std.thread}` : std.criteria;
    traceRows.unshift({
      standard: standardLabel,
      ploNum: '—',
      ploText: '(No PLO covers this standard)',
      moduleCode: '—',
      moduleTitle: '',
      mimloNum: '—',
      mimloText: '',
      assessmentTitle: '',
      assessmentType: '',
      assessmentWeight: '',
      status: 'uncovered',
      statusLabel: 'Standard Gap'
    });
  });

  // Summary stats
  const coveredCount = traceRows.filter(r => r.status === 'ok').length;
  const warningCount = traceRows.filter(r => r.status === 'warning').length;
  const gapCount = traceRows.filter(r => r.status === 'gap').length;
  const uncoveredCount = traceRows.filter(r => r.status === 'uncovered').length;

  // Build standards coverage HTML
  const standardsCoverageHtml = levelStandards.length > 0
    ? `<div class="mb-3 p-3 ${uncoveredCount > 0 ? 'bg-danger-subtle' : 'bg-success-subtle'} rounded">
        <div class="fw-semibold mb-1">Award Standards Coverage (NFQ Level ${nfqLevel})</div>
        <div class="small">${levelStandards.length - uncoveredStandards.length} of ${levelStandards.length} standards covered by PLOs
          ${uncoveredCount > 0 ? ` — <strong>${uncoveredStandards.length} standard${uncoveredStandards.length > 1 ? 's' : ''} not yet addressed</strong>` : ' ✓'}
        </div>
       </div>`
    : (nfqLevel ? `<div class="alert alert-warning mb-3">No award standards found for NFQ Level ${nfqLevel}. Check that standards.json includes this level.</div>` : '');

  return {
    traceRows,
    stats: { coveredCount, warningCount, gapCount, uncoveredCount },
    standardsCoverageHtml
  };
}

/**
 * Build table rows HTML
 */
function buildTableRowsHtml(traceRows) {
  const statusBadge = (status, label) => {
    if (status === 'ok') return `<span class="badge text-bg-success">${escapeHtml(label)}</span>`;
    if (status === 'warning') return `<span class="badge text-bg-warning">${escapeHtml(label)}</span>`;
    if (status === 'uncovered') return `<span class="badge text-bg-dark">${escapeHtml(label)}</span>`;
    return `<span class="badge text-bg-danger">${escapeHtml(label)}</span>`;
  };

  return traceRows.map(r => `
    <tr data-status="${r.status}">
      <td class="small ${r.status === 'uncovered' ? 'fw-bold' : ''}">${escapeHtml(r.standard)}</td>
      <td class="small text-nowrap">${r.ploNum !== '—' ? 'PLO ' + r.ploNum : '—'}</td>
      <td class="small" style="max-width:200px;" title="${escapeHtml(r.ploText)}">${escapeHtml(r.ploText.length > 60 ? r.ploText.slice(0, 60) + '…' : r.ploText)}</td>
      <td class="small text-nowrap">${escapeHtml(r.moduleCode)}</td>
      <td class="small">${escapeHtml(r.moduleTitle)}</td>
      <td class="small text-nowrap">${r.mimloNum !== '—' ? 'MIMLO ' + r.mimloNum : '—'}</td>
      <td class="small" style="max-width:180px;" title="${escapeHtml(r.mimloText)}">${escapeHtml(r.mimloText.length > 50 ? r.mimloText.slice(0, 50) + '…' : r.mimloText)}</td>
      <td class="small">${escapeHtml(r.assessmentTitle)}</td>
      <td class="small">${escapeHtml(r.assessmentType)}</td>
      <td class="small text-end">${escapeHtml(r.assessmentWeight)}</td>
      <td class="small text-center">${statusBadge(r.status, r.statusLabel)}</td>
    </tr>
  `).join('');
}

/**
 * Wire traceability filters and export
 */
function wireTraceability() {
  const filterStatus = document.getElementById('traceFilterStatus');
  const filterModule = document.getElementById('traceFilterModule');
  const exportBtn = document.getElementById('traceExportCsv');
  const table = document.getElementById('traceabilityTable');

  function applyFilters() {
    if (!table) return;
    const statusVal = filterStatus?.value || 'all';
    const moduleVal = filterModule?.value || 'all';

    table.querySelectorAll('tbody tr').forEach(row => {
      const rowStatus = row.getAttribute('data-status');
      const rowModule = row.children[3]?.textContent?.trim() || '';

      let show = true;
      if (statusVal !== 'all' && rowStatus !== statusVal) show = false;
      if (moduleVal !== 'all' && rowModule !== moduleVal) show = false;

      row.style.display = show ? '' : 'none';
    });
  }

  if (filterStatus) filterStatus.onchange = applyFilters;
  if (filterModule) filterModule.onchange = applyFilters;

  if (exportBtn && table) {
    exportBtn.onclick = () => {
      const rows = [];
      const headers = [];
      table.querySelectorAll('thead th').forEach(th => headers.push(th.textContent.trim()));
      rows.push(headers.join(','));

      table.querySelectorAll('tbody tr').forEach(tr => {
        if (tr.style.display === 'none') return;
        const cells = [];
        tr.querySelectorAll('td').forEach(td => {
          let val = td.textContent.trim();
          // Escape quotes and wrap in quotes if contains comma
          if (val.includes(',') || val.includes('"') || val.includes('\n')) {
            val = '"' + val.replace(/"/g, '""') + '"';
          }
          cells.push(val);
        });
        rows.push(cells.join(','));
      });

      const csv = rows.join('\n');
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'traceability_matrix.csv';
      a.click();
      URL.revokeObjectURL(url);
    };
  }
}

/**
 * Build Sankey diagram data from trace rows
 * Creates nodes for: Standards, PLOs, Modules, MIMLOs, Assessments
 * Creates links between them based on alignments
 */
function buildSankeyData(traceRows) {
  // Node categories and their prefixes
  const nodeLabels = [];
  const nodeColors = [];
  const nodeMap = new Map(); // label -> index

  // Color palette for categories
  const categoryColors = {
    standard: 'rgba(102, 16, 242, 0.8)',   // Purple for standards
    plo: 'rgba(13, 110, 253, 0.8)',        // Blue for PLOs
    module: 'rgba(25, 135, 84, 0.8)',      // Green for modules
    mimlo: 'rgba(255, 193, 7, 0.8)',       // Yellow for MIMLOs
    assessment: 'rgba(220, 53, 69, 0.8)',  // Red for assessments
    gap: 'rgba(220, 53, 69, 0.9)'          // Red for gap indicator
  };

  // Status colors for links
  const statusColors = {
    ok: 'rgba(25, 135, 84, 0.4)',       // Green
    warning: 'rgba(255, 193, 7, 0.4)',  // Yellow
    gap: 'rgba(220, 53, 69, 0.4)',      // Red
    uncovered: 'rgba(33, 37, 41, 0.4)'  // Dark
  };

  function addNode(label, category) {
    if (!nodeMap.has(label)) {
      nodeMap.set(label, nodeLabels.length);
      nodeLabels.push(label);
      nodeColors.push(categoryColors[category]);
    }
    return nodeMap.get(label);
  }

  const links = [];
  const linkMap = new Map(); // "source-target" -> link index

  function addLink(sourceIdx, targetIdx, status) {
    const key = `${sourceIdx}-${targetIdx}`;
    if (linkMap.has(key)) {
      // Increment existing link value
      const idx = linkMap.get(key);
      links[idx].value += 1;
    } else {
      linkMap.set(key, links.length);
      links.push({
        source: sourceIdx,
        target: targetIdx,
        value: 1,
        color: statusColors[status] || statusColors.ok
      });
    }
  }

  // Process trace rows to build nodes and links
  traceRows.forEach(row => {
    // Handle uncovered standards - link them to a "gap" node to show they're missing coverage
    if (row.status === 'uncovered') {
      const standardNode = addNode(`📋 ${row.standard}`, 'standard');
      const gapNode = addNode(`⚠️ NO PLO COVERAGE`, 'gap');
      addLink(standardNode, gapNode, 'uncovered');
      return;
    }

    // Add nodes for each level
    const standardNode = addNode(`📋 ${row.standard}`, 'standard');

    if (row.ploNum !== '—') {
      const ploLabel = `🎯 PLO ${row.ploNum}`;
      const ploNode = addNode(ploLabel, 'plo');
      addLink(standardNode, ploNode, row.status);

      if (row.moduleCode && row.moduleCode !== '—') {
        const moduleLabel = `📦 ${row.moduleCode}`;
        const moduleNode = addNode(moduleLabel, 'module');
        addLink(ploNode, moduleNode, row.status);

        if (row.mimloNum !== '—') {
          const mimloLabel = `📝 ${row.moduleCode} MIMLO ${row.mimloNum}`;
          const mimloNode = addNode(mimloLabel, 'mimlo');
          addLink(moduleNode, mimloNode, row.status);

          if (row.assessmentTitle && row.status === 'ok') {
            const asmLabel = `✅ ${row.assessmentTitle}`;
            const asmNode = addNode(asmLabel, 'assessment');
            addLink(mimloNode, asmNode, row.status);
          }
        }
      }
    }
  });

  return {
    nodes: {
      label: nodeLabels,
      color: nodeColors,
      pad: 15,
      thickness: 20,
      line: { color: 'rgba(0,0,0,0.3)', width: 0.5 }
    },
    links: {
      source: links.map(l => l.source),
      target: links.map(l => l.target),
      value: links.map(l => l.value),
      color: links.map(l => l.color)
    }
  };
}

/**
 * Render Sankey diagram using Plotly
 */
function renderSankeyDiagram(sankeyData) {
  const container = document.getElementById('sankeyChart');
  if (!container || !window.Plotly) return;

  // Check if we have any links to display
  if (sankeyData.links.source.length === 0) {
    container.innerHTML = '<div class="alert alert-info">No alignment data to visualize. Add mappings between PLOs, modules, and assessments.</div>';
    return;
  }

  // Detect theme for appropriate colors
  const isDark = document.documentElement.getAttribute('data-bs-theme') === 'dark';

  const trace = {
    type: 'sankey',
    orientation: 'h',
    node: {
      ...sankeyData.nodes,
      hovertemplate: '%{label}<extra></extra>'
    },
    link: {
      ...sankeyData.links,
      hovertemplate: '%{source.label} → %{target.label}<br>Count: %{value}<extra></extra>'
    }
  };

  const layout = {
    title: {
      text: 'Alignment Flow: Standards → PLOs → Modules → MIMLOs → Assessments',
      font: { size: 14, color: isDark ? '#dee2e6' : '#212529' }
    },
    font: {
      size: 11,
      color: isDark ? '#dee2e6' : '#212529'
    },
    paper_bgcolor: 'rgba(0,0,0,0)',
    plot_bgcolor: 'rgba(0,0,0,0)',
    margin: { l: 10, r: 10, t: 40, b: 10 }
  };

  const config = {
    responsive: true,
    displayModeBar: true,
    modeBarButtonsToRemove: ['lasso2d', 'select2d'],
    displaylogo: false
  };

  Plotly.newPlot(container, [trace], layout, config);
}
