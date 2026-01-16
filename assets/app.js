// NCI Programme Design Studio (Static MVP)
// - No build tools needed
// - Stores data as JSON in localStorage
// - Export/import via file
// NOTE: For larger datasets, IndexedDB is better, but localStorage is fine for MVP.

const STORAGE_KEY = "nci_pds_mvp_programme_v1";



// ===== DEV MODE TOGGLE (UI) =====
// Add ?dev=true to the URL to show a mode switch in the UI.
function _isDevModeUI() {
  try { return new URLSearchParams(window.location.search).get("dev") === "true"; }
  catch { return false; }
}

// In-memory mode switcher for testing (does not auto-export).
window.setMode = function setMode(mode, assignedModuleIds = []) {
  const p = state?.programme;
  if (!p) { console.error("Programme not loaded yet."); return; }

  if (mode !== "PROGRAMME_OWNER" && mode !== "MODULE_EDITOR") {
    console.error("Invalid mode. Use PROGRAMME_OWNER or MODULE_EDITOR");
    return;
  }

  p.mode = mode;

  if (mode === "MODULE_EDITOR") {
    const defaultAssigned = (p.modules || []).map(m => m.id);
    p.moduleEditor = p.moduleEditor || {};
    p.moduleEditor.assignedModuleIds = assignedModuleIds.length ? assignedModuleIds : defaultAssigned;
    p.moduleEditor.locks = p.moduleEditor.locks || { programme: true, modulesMeta: true, versions: true, plos: true };

    // If the current step isn't appropriate, jump to MIMLOs (or next best).
    const currentKey = steps?.[state.stepIndex]?.key;
    const allowed = new Set(["mimlos", "mapping", "snapshot", "assessments"]);
    if (!allowed.has(currentKey)) {
      const idx = steps.findIndex(s => s.key === "mimlos");
      if (idx >= 0) state.stepIndex = idx;
    }
  } else {
    delete p.moduleEditor;
    // If we were in a hidden step, return to Identity.
    const idx = steps.findIndex(s => s.key === "identity");
    if (idx >= 0 && state.stepIndex == null) state.stepIndex = idx;
  }

  render();
};

function wireDevModeToggle() {
  const t = document.getElementById("devModeToggle");
  if (!t) return;
  t.onchange = () => {
    if (t.checked) window.setMode("MODULE_EDITOR");
    else window.setMode("PROGRAMME_OWNER");
  };
}
const steps = [
  { key: "identity", title: "Identity" },
  { key: "outcomes", title: "PLOs" },
  { key: "versions", title: "Programme Versions" },
  { key: "stages", title: "Stage Structure" },
  { key: "structure", title: "Credits & Modules" },
  { key: "mimlos", title: "MIMLOs" },
  { key: "effort-hours", title: "Effort Hours" },
  { key: "assessments", title: "Assessments" },
  { key: "reading-lists", title: "Reading Lists" },
  { key: "schedule", title: "Programme Schedule" },
  { key: "mapping", title: "Mapping" },
  { key: "traceability", title: "Traceability" },
  { key: "snapshot", title: "QQI Snapshot" },
];

function activeSteps() {
  const p = state?.programme || {};
  if (p.mode === "MODULE_EDITOR") {
    const allowed = new Set(["mimlos", "effort-hours", "assessments", "reading-lists", "schedule", "mapping", "traceability", "snapshot"]);
    return steps.filter(s => allowed.has(s.key));
  }
  return steps;
}

function editableModuleIds() {
  const p = state?.programme;
  if (!p) return [];
  if (p.mode === "MODULE_EDITOR") {
    const ids = p.moduleEditor?.assignedModuleIds || [];
    return ids.length ? ids : (p.modules || []).map(m => m.id);
  }
  return (p.modules || []).map(m => m.id);
}

function getSelectedModuleId() {
  const ids = editableModuleIds();
  if (!ids.length) return "";
  if (!state.selectedModuleId || !ids.includes(state.selectedModuleId)) {
    state.selectedModuleId = ids[0];
  }
  return state.selectedModuleId;
}


function defaultPatternFor(mod){
  if (mod === "F2F") return { syncOnlinePct: 0, asyncDirectedPct: 0, onCampusPct: 100 };
  if (mod === "ONLINE") return { syncOnlinePct: 40, asyncDirectedPct: 60, onCampusPct: 0 };
  // BLENDED default
  return { syncOnlinePct: 30, asyncDirectedPct: 40, onCampusPct: 30 };
}


function sumPattern(pat){
  return Number(pat.syncOnlinePct||0) + Number(pat.asyncDirectedPct||0) + Number(pat.onCampusPct||0);
}

function sumStageCredits(allModules, stageModules){
  const ids = (stageModules||[]).map(x=>x.moduleId);
  return (allModules||[]).filter(m=>ids.includes(m.id)).reduce((acc,m)=>acc+Number(m.credits||0),0);
}

const SCHOOL_OPTIONS = ["Computing", "Business", "Psychology", "Education"]; 

const AWARD_TYPE_OPTIONS = [
  "Higher Certificate",
  "Ordinary Bachelor Degree",
  "Honours Bachelor Degree",
  "Higher Diploma",
  "Postgraduate Diploma",
  "Masters",
  "Micro-credential",
  "Other",
];
// ---- Award standards loader (assets/standards.json) ----
let _standardsPromise = null;

async function _loadStandardsFile(){
  if (_standardsPromise) return _standardsPromise;
  _standardsPromise = (async () => {
    const res = await fetch("./assets/standards.json", { cache: "no-store" });
    if (!res.ok) throw new Error("Could not load assets/standards.json");
    return await res.json();
  })();
  return _standardsPromise;
}

async function getAwardStandards(){
  const data = await _loadStandardsFile();
  // Backward compatible: if the file is a single standard object (v1), wrap it.
  return Array.isArray(data?.standards) ? data.standards : [data];
}

async function getAwardStandardById(standardId){
  const list = await getAwardStandards();
  if (!standardId) return list[0] || null;
  return list.find(s => s && s.standard_id === standardId) || list[0] || null;
}
// -------------------------------------------------------

function bloomsGuidanceHtml(level, contextLabel) {
  const lvl = Number(level || 0);
  const title = lvl ? `Bloom helper (aligned to NFQ level ${lvl})` : "Bloom helper (choose NFQ level first)";

  // Keep this simple and practical. Avoid long theory.
  let focus = "Use measurable action verbs. Avoid: understand, know, learn about, be aware of.";
  let verbs = ["describe", "explain", "apply", "analyse", "evaluate", "design"]; // fallback

  if (!lvl) {
    focus = "Pick the programme NFQ level in Identity, then come back here for tailored verb suggestions.";
    verbs = ["describe", "explain", "apply", "analyse", "evaluate", "design"];
  } else if (lvl <= 6) {
    focus = "Emphasise foundational knowledge and applied skills (remember/understand/apply), with some analysis.";
    verbs = ["identify", "describe", "explain", "apply", "demonstrate", "use", "outline", "compare"];
  } else if (lvl === 7) {
    focus = "Balance application and analysis. Show problem-solving and autonomy.";
    verbs = ["apply", "analyse", "interpret", "solve", "integrate", "evaluate", "justify", "develop"];
  } else if (lvl === 8) {
    focus = "Push beyond application: critical analysis, evaluation, and creation/design.";
    verbs = ["analyse", "evaluate", "synthesise", "design", "develop", "critique", "justify", "implement"];
  } else if (lvl === 9) {
    focus = "Emphasise advanced evaluation and creation: originality, research-informed practice.";
    verbs = ["critically evaluate", "synthesise", "design", "develop", "formulate", "lead", "innovate", "apply research to"];
  } else {
    focus = "Emphasise original contribution, research leadership, and creation.";
    verbs = ["originate", "advance", "formulate", "innovate", "lead", "produce", "contribute", "critically appraise"];
  }

  const verbChips = verbs.map(v => `<span class="badge text-bg-light border me-1 mb-1">${escapeHtml(v)}</span>`).join("");

  return `
    <div class="p-3 bg-light border rounded-4 mb-3">
      <div class="fw-semibold mb-1">${escapeHtml(title)} — for ${escapeHtml(contextLabel)}</div>
      <div class="small text-secondary mb-2">${escapeHtml(focus)}</div>
      <div>${verbChips}</div>
      <div class="small text-secondary mt-2">Tip: start outcomes with a verb + object + standard (e.g., “Analyse X using Y to produce Z”).</div>
    </div>
  `;
}

const defaultProgramme = () => ({
  schemaVersion: 2,
  id: "current",

  // Identity
  title: "",
  awardType: "", // selected label or custom
  awardTypeIsOther: false,
  nfqLevel: null,
  school: "",
  awardStandardIds: [], // up to 2 standards
  awardStandardNames: [],

  // Programme-level structure
  totalCredits: 0,
  modules: [], // {id, code, title, credits, mimlos:[]}
  plos: [],    // {id, text, standardMappings: [{criteria, thread}]}
  ploToModules: {}, // ploId -> [moduleId]

  // Versions (FT/PT/Online variants)
  versions: [], // [{id, label, code, duration, intakes[], targetCohortSize, numberOfGroups, deliveryModality, deliveryPatterns{}, onlineProctoredExams, onlineProctoredExamsNotes, stages[] }]

  updatedAt: null,
});

let state = {
  programme: defaultProgramme(),
  stepIndex: 0,
  saving: false,
  lastSaved: null,
  selectedVersionId: null,
};


function uid(prefix="id"){
  if (crypto && crypto.randomUUID) return `${prefix}_${crypto.randomUUID()}`;
  return `${prefix}_${Math.random().toString(16).slice(2)}_${Date.now().toString(16)}`;
}

const defaultVersion = () => ({
  id: uid("ver"),
  label: "Full-time",
  code: "FT",
  duration: "",
  intakes: [],
  targetCohortSize: 0,
  numberOfGroups: 0,

  deliveryModality: "F2F", // F2F | BLENDED | ONLINE
  deliveryPatterns: {},   // modality -> { syncOnlinePct, asyncDirectedPct, onCampusPct }
  deliveryNotes: "",

  onlineProctoredExams: "TBC", // NO | YES | TBC
  onlineProctoredExamsNotes: "",

  stages: [], // [{id, name, sequence, creditsTarget, exitAward:{enabled,awardTitle}, modules:[{moduleId, semester}]}]
});

const defaultStage = (sequence=1) => ({
  id: uid("stage"),
  name: `Stage ${sequence}`,
  sequence,
  creditsTarget: 0,
  exitAward: { enabled: false, awardTitle: "" },
  modules: [], // { moduleId, semester }
});


function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    const parsed = JSON.parse(raw);
    // shallow merge to preserve new defaults if schema evolves
    state.programme = { ...defaultProgramme(), ...parsed };

// Migration: convert old single standard to array format
if (typeof state.programme.awardStandardId === 'string') {
  const oldId = state.programme.awardStandardId || '';
  const oldName = state.programme.awardStandardName || '';
  state.programme.awardStandardIds = oldId ? [oldId] : [];
  state.programme.awardStandardNames = oldName ? [oldName] : [];
  delete state.programme.awardStandardId;
  delete state.programme.awardStandardName;
}
// Ensure arrays exist
if (!Array.isArray(state.programme.awardStandardIds)) {
  state.programme.awardStandardIds = [];
}
if (!Array.isArray(state.programme.awardStandardNames)) {
  state.programme.awardStandardNames = [];
}

// Migration to schemaVersion 2: programme versions + stages.
if (!Array.isArray(state.programme.versions)) state.programme.versions = [];

// If coming from older schema where delivery info lived at programme level,
// create a single default version and move the key fields across.
if (state.programme.versions.length === 0) {
  const v = defaultVersion();
  // Prefer legacy fields if present
  // Migrate old deliveryMode/deliveryModalities to new deliveryModality
  const legacyModality = Array.isArray(state.programme.deliveryModalities)
    ? state.programme.deliveryModalities[0] // Take first from old array
    : (state.programme.deliveryMode || "F2F");

  v.deliveryModality = legacyModality;
  v.deliveryPatterns = (state.programme.deliveryPatterns && typeof state.programme.deliveryPatterns === "object")
    ? state.programme.deliveryPatterns
    : {};

  // Ensure pattern exists for selected modality
  if (v.deliveryModality && !v.deliveryPatterns[v.deliveryModality]) {
    v.deliveryPatterns[v.deliveryModality] = defaultPatternFor(v.deliveryModality);
  }

  v.deliveryNotes = state.programme.deliveryNotes || "";
  v.onlineProctoredExams = state.programme.onlineProctoredExams || "TBC";
  v.onlineProctoredExamsNotes = state.programme.onlineProctoredExamsNotes || "";

  v.targetCohortSize = Number(state.programme.cohortSize || 0);
  v.numberOfGroups = Number(state.programme.numberOfGroups || 0);
  v.duration = state.programme.duration || "";
  v.intakes = Array.isArray(state.programme.intakeMonths) ? state.programme.intakeMonths : [];

  state.programme.versions = [v];
}

// Clean up some very old legacy fields if they exist
delete state.programme.deliveryMode;
delete state.programme.syncPattern;

        if (!state.selectedVersionId && state.programme.versions && state.programme.versions.length) state.selectedVersionId = state.programme.versions[0].id;
state.lastSaved = state.programme.updatedAt || null;
  } catch (e) {
    console.warn("Failed to load", e);
  }
}

function saveNow() {
  try {
    state.saving = true;
    const now = new Date().toISOString();
    state.programme.updatedAt = now;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state.programme));
    state.lastSaved = now;
  } finally {
    state.saving = false;
  }
}

let saveTimer = null;
function saveDebounced() {
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    saveNow();
    renderHeader();
  }, 400);
}

function downloadJson(filename, obj) {
  const blob = new Blob([JSON.stringify(obj, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function validateProgramme(p) {
  const flags = [];
  const sumCredits = (p.modules || []).reduce((acc, m) => acc + (Number(m.credits) || 0), 0);

  if (!p.title.trim()) flags.push({ type: "error", msg: "Programme title is missing.", step: "identity" });
  if (!p.nfqLevel) flags.push({ type: "error", msg: "NFQ level is missing.", step: "identity" });
  if (p.nfqLevel && (Number(p.nfqLevel) < 6 || Number(p.nfqLevel) > 9)) {
    flags.push({ type: "error", msg: "NFQ level must be between 6 and 9 for this tool.", step: "identity" });
  }
  if (!p.awardType.trim()) flags.push({ type: "warn", msg: "Award type is missing.", step: "identity" });

  if ((p.totalCredits || 0) <= 0) flags.push({ type: "error", msg: "Total programme credits are missing/zero.", step: "structure" });
  if ((p.totalCredits || 0) > 0 && sumCredits !== p.totalCredits) {
    flags.push({ type: "error", msg: `Credits mismatch: totalCredits=${p.totalCredits} but modules sum to ${sumCredits}.`, step: "structure" });
  }

  // Versions
  if (!Array.isArray(p.versions) || p.versions.length === 0) {
    flags.push({ type: "error", msg: "At least one Programme Version is required (e.g., FT/PT/Online).", step: "versions" });
  } else {
    const labels = new Set();
    p.versions.forEach((v, idx) => {
      const prefix = `Version ${idx + 1}`;
      if (!v.label || !v.label.trim()) flags.push({ type: "warn", msg: `${prefix}: label is missing.`, step: "versions" });
      else {
        const norm = v.label.trim().toLowerCase();
        if (labels.has(norm)) flags.push({ type: "warn", msg: `${prefix}: duplicate label ("${v.label}").`, step: "versions" });
        labels.add(norm);
      }

      // Delivery pattern for selected modality must sum to 100
      if (v.deliveryModality) {
        const mod = v.deliveryModality;
        const pat = (v.deliveryPatterns || {})[mod];
        if (!pat) {
          flags.push({ type: "error", msg: `${prefix}: missing delivery pattern for ${mod}.`, step: "versions" });
          return;
        }
        const total = Number(pat.syncOnlinePct || 0) + Number(pat.asyncDirectedPct || 0) + Number(pat.onCampusPct || 0);
        if (total !== 100) {
          flags.push({ type: "error", msg: `${prefix}: ${mod} delivery pattern must total 100% (currently ${total}%).`, step: "versions" });
        }
      }

      if ((v.onlineProctoredExams || "TBC") === "YES" && !(v.onlineProctoredExamsNotes || "").trim()) {
        flags.push({ type: "warn", msg: `${prefix}: online proctored exams marked YES but notes are empty.`, step: "versions" });
      }

      if ((v.targetCohortSize || 0) <= 0) flags.push({ type: "warn", msg: `${prefix}: cohort size is missing/zero.`, step: "versions" });

      // Stage structure
      if (!Array.isArray(v.stages) || v.stages.length === 0) {
        flags.push({ type: "warn", msg: `${prefix}: no stages defined yet.`, step: "stages" });
      } else {
        // Check stage credit totals vs programme credits (soft error if programme credits defined)
        const stageTargetSum = (v.stages || []).reduce((acc, s) => acc + Number(s.creditsTarget || 0), 0);
        if ((p.totalCredits || 0) > 0 && stageTargetSum > 0 && stageTargetSum !== Number(p.totalCredits || 0)) {
          flags.push({ type: "warn", msg: `${prefix}: sum of stage credit targets (${stageTargetSum}) does not match programme total credits (${p.totalCredits}).`, step: "stages" });
        }

        // Stage module credits match target
        (v.stages || []).forEach((s) => {
          const stageMods = (s.modules || []).map(x => x.moduleId);
          const creditSum = (p.modules || [])
            .filter(m => stageMods.includes(m.id))
            .reduce((acc, m) => acc + Number(m.credits || 0), 0);

          if ((s.creditsTarget || 0) > 0 && creditSum !== Number(s.creditsTarget || 0)) {
            flags.push({ type: "warn", msg: `${prefix}: ${s.name || "stage"} module credits sum to ${creditSum} but target is ${s.creditsTarget}.`, step: "stages" });
          }

          if (s.exitAward && s.exitAward.enabled && !(s.exitAward.awardTitle || "").trim()) {
            flags.push({ type: "warn", msg: `${prefix}: ${s.name || "stage"} has an exit award enabled but no award title entered.`, step: "stages" });
          }
        });
      }
    });
  }

  // Outcomes & mapping
  if ((p.plos || []).length < 6) flags.push({ type: "warn", msg: "PLOs: fewer than 6 (usually aim for ~6–12).", step: "outcomes" });
  if ((p.plos || []).length > 12) flags.push({ type: "warn", msg: "PLOs: more than 12 (consider tightening).", step: "outcomes" });

  const modulesMissingMimlos = (p.modules || []).filter(m => !m.mimlos || m.mimlos.length === 0);
  if (modulesMissingMimlos.length > 0) flags.push({ type: "warn", msg: `Some modules have no MIMLOs yet (${modulesMissingMimlos.length}).`, step: "mimlos" });

  const unmappedPLOs = (p.plos || []).filter(o => !(p.ploToModules || {})[o.id] || (p.ploToModules[o.id] || []).length === 0);
  if (unmappedPLOs.length > 0) flags.push({ type: "error", msg: `Some PLOs are not mapped to any module (${unmappedPLOs.length}).`, step: "mapping" });

  return flags;
}


function deliveryPatternsHtml(p){
  // Note: p here is a version object from the context where this is called
  const mod = p.deliveryModality;
  const patterns = (p.deliveryPatterns && typeof p.deliveryPatterns === "object") ? p.deliveryPatterns : {};
  if (!mod) return '<span class="text-muted">—</span>';
  const label = (k) => (k==="F2F"?"Face-to-face":k==="BLENDED"?"Blended":k==="ONLINE"?"Fully online":k);
  const pat = patterns[mod] || defaultPatternFor(mod);
  const a = Number(pat.syncOnlinePct ?? 0);
  const b = Number(pat.asyncDirectedPct ?? 0);
  const c = Number(pat.onCampusPct ?? 0);
  return `<div><span class="fw-semibold">${escapeHtml(label(mod))}:</span> ${a}% sync online, ${b}% async directed, ${c}% on campus</div>`;
}
function completionPercent(p) {
  let total = 10, done = 0;
  if (p.title.trim()) done++;
  if (p.nfqLevel) done++;
  if ((p.totalCredits || 0) > 0) done++;
  if ((p.modules || []).length > 0) done++;
  if ((p.plos || []).length >= 6) done++;
  if (Object.keys(p.ploToModules || {}).length > 0) done++;

  if (Array.isArray(p.versions) && p.versions.length > 0) done++;
  const v0 = (p.versions || [])[0];
  if (v0 && v0.deliveryModality && Object.keys(v0.deliveryPatterns || {}).length > 0) done++;
  if (v0 && (v0.targetCohortSize || 0) > 0) done++;
  if (v0 && Array.isArray(v0.stages) && v0.stages.length > 0) done++;

  return Math.round((done / total) * 100);
}



function tagHtml(type) {
  if (type === "error") return `<span class="tag tag-error">ERROR</span>`;
  if (type === "warn") return `<span class="tag tag-warn">WARN</span>`;
  return `<span class="tag tag-ok">OK</span>`;
}

function renderHeader() {
  const p = state.programme;
  p.mode = p.mode || 'PROGRAMME_OWNER';
  document.getElementById("programmeTitleNav").textContent = p.title.trim() ? p.title : "New Programme (Draft)";
  const comp = completionPercent(p);
  const badge = document.getElementById("completionBadge");
  badge.textContent = `${comp}% complete`;
  badge.className = "badge " + (comp >= 75 ? "text-bg-success" : comp >= 40 ? "text-bg-warning" : "text-bg-secondary");
  
  // Generate to-do list for popover
  const flags = validateProgramme(p);
  const todoHtml = generateTodoList(flags);
  
  // Set popover content
  badge.setAttribute("data-bs-toggle", "popover");
  badge.setAttribute("data-bs-trigger", "hover");
  badge.setAttribute("data-bs-html", "true");
  badge.setAttribute("data-bs-placement", "bottom");
  badge.setAttribute("data-bs-title", comp === 100 ? "✓ All Complete!" : "Items to complete");
  badge.setAttribute("data-bs-content", todoHtml);
  badge.style.cursor = comp === 100 ? "default" : "pointer";
  
  // Dispose existing popover and create new one
  const existingPopover = bootstrap.Popover.getInstance(badge);
  if (existingPopover) existingPopover.dispose();
  new bootstrap.Popover(badge, {
    trigger: "hover",
    html: true,
    placement: "bottom"
  });
  
  const ss = document.getElementById("saveStatus");
  ss.textContent = state.saving ? "Saving…" : (state.lastSaved ? `Saved ${new Date(state.lastSaved).toLocaleString()}` : "Not saved yet");
}

function generateTodoList(flags) {
  if (!flags || flags.length === 0) {
    return `<div class="small text-success"><strong>✓ All requirements met!</strong></div>`;
  }
  
  // Group flags by step
  const byStep = {};
  flags.forEach(f => {
    if (!byStep[f.step]) byStep[f.step] = [];
    byStep[f.step].push(f);
  });
  
  // Find step labels
  const aSteps = activeSteps();
  const stepMap = {};
  aSteps.forEach(s => {
    stepMap[s.key] = s.title;
  });
  
  // Build HTML
  let html = `<div class="small" style="max-width: 300px; max-height: 300px; overflow-y: auto;">`;
  
  Object.entries(byStep).forEach(([step, items]) => {
    const stepTitle = stepMap[step] || step;
    const errorCount = items.filter(f => f.type === "error").length;
    const warnCount = items.filter(f => f.type === "warn").length;
    
    html += `<div class="mb-2">`;
    html += `<div class="fw-semibold text-primary">${escapeHtml(stepTitle)}</div>`;
    
    items.forEach(f => {
      const icon = f.type === "error" ? "⚠️" : "ℹ️";
      const cls = f.type === "error" ? "text-danger" : "text-warning";
      html += `<div class="${cls} ms-2 small" style="margin-bottom: 4px;">
        ${icon} ${escapeHtml(f.msg)}
      </div>`;
    });
    
    html += `</div>`;
  });
  
  html += `</div>`;
  return html;
}

function renderSteps() {
  const box = document.getElementById("stepList");
  if (!box) return;

  const aSteps = activeSteps();
  box.innerHTML = "";

  // Clamp index if steps changed (e.g., switching modes)
  if (state.stepIndex < 0) state.stepIndex = 0;
  if (state.stepIndex >= aSteps.length) state.stepIndex = 0;

  aSteps.forEach((s, idx) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "list-group-item list-group-item-action " + (idx === state.stepIndex ? "active" : "");
    btn.textContent = `${idx + 1}. ${s.title}`;
    btn.onclick = () => { state.stepIndex = idx; render(); };
    box.appendChild(btn);
  });

  const backBtn = document.getElementById("backBtn") || document.getElementById("prevBtn");
  const nextBtn = document.getElementById("nextBtn");
  if (backBtn) backBtn.disabled = state.stepIndex === 0;
  if (nextBtn) nextBtn.disabled = state.stepIndex === aSteps.length - 1;
}


function renderFlags() {
  const flags = validateProgramme(state.programme);
  const box = document.getElementById("flagsBox");
  box.innerHTML = "";
  if (!flags.length) {
    box.innerHTML = `<div class="flag-item flag-ok">${tagHtml("ok")} <div class="small">No flags — programme looks good!</div></div>`;
    return;
  }
  // Group flags by type for display
  const errors = flags.filter(f => f.type === "error");
  const warnings = flags.filter(f => f.type === "warn");
  
  // Summary header
  const summaryDiv = document.createElement("div");
  summaryDiv.className = "flags-summary mb-2 small";
  const parts = [];
  if (errors.length) parts.push(`<span class="text-danger fw-bold">${errors.length} error${errors.length > 1 ? 's' : ''}</span>`);
  if (warnings.length) parts.push(`<span class="text-warning fw-bold">${warnings.length} warning${warnings.length > 1 ? 's' : ''}</span>`);
  summaryDiv.innerHTML = parts.join(' · ');
  box.appendChild(summaryDiv);
  
  const aSteps = activeSteps();
  flags.forEach(f => {
    const div = document.createElement("div");
    div.className = `flag-item flag-${f.type}`;
    
    // Find step index for navigation
    const stepIdx = aSteps.findIndex(s => s.key === f.step);
    const stepTitle = stepIdx >= 0 ? aSteps[stepIdx].title : "";
    
    div.innerHTML = `
      <div class="d-flex align-items-start gap-2">
        ${tagHtml(f.type)}
        <div class="flex-grow-1">
          <div class="small">${escapeHtml(f.msg)}</div>
          ${stepTitle ? `<div class="flag-step-link small text-muted">→ ${escapeHtml(stepTitle)}</div>` : ''}
        </div>
      </div>
    `;
    
    // Make clickable if step is accessible
    if (stepIdx >= 0) {
      div.style.cursor = "pointer";
      div.onclick = () => {
        state.stepIndex = stepIdx;
        render();
        // Scroll to content area
        const content = document.getElementById("content");
        if (content) content.scrollIntoView({ behavior: "smooth", block: "start" });
      };
    }
    
    box.appendChild(div);
  });
}

function escapeHtml(s){
  return String(s).replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;").replaceAll("'","&#39;");
}

// ===== MIMLO object helpers (schemaVersion 2) =====
function mimloText(x) {
  return (typeof x === "string") ? x : (x && typeof x === "object" ? (x.text || "") : "");
}
function ensureMimloObjects(module) {
  module.mimlos = module.mimlos || [];
  // migrate string[] -> {id,text}[]
  if (module.mimlos.length && typeof module.mimlos[0] === "string") {
    module.mimlos = module.mimlos.map(t => ({ id: "mimlo_" + crypto.randomUUID(), text: String(t || "") }));
  }
}


// ===== ASSESSMENT REPORTS (simple + extensible) =====
const ASSESSMENT_REPORT_TYPES = [
  { id: "byStageType", label: "By stage: assessment types + weighting" },
  { id: "byModule", label: "By module: assessment types + weighting" },
  { id: "coverage", label: "MIMLO coverage (unassessed outcomes)" }
];

function getVersionById(p, versionId) {
  return (p.versions || []).find(v => v.id === versionId) || (p.versions || [])[0] || null;
}

function formatPct(n) {
  const x = Number(n || 0);
  return `${x}%`;
}

function reportByStageType(p, versionId) {
  const v = getVersionById(p, versionId);
  if (!v) return `<div class="alert alert-warning mb-0">No versions found.</div>`;

  const modMap = new Map((p.modules || []).map(m => [m.id, m]));

  const stageAgg = [];
  (v.stages || []).forEach(stg => {
    const typeMap = new Map();
    (stg.modules || []).forEach(ref => {
      const m = modMap.get(ref.moduleId);
      if (!m) return;
      (m.assessments || []).forEach(a => {
        const t = a.type || "Unspecified";
        const rec = typeMap.get(t) || { weight: 0, count: 0 };
        rec.weight += Number(a.weighting || 0);
        rec.count += 1;
        typeMap.set(t, rec);
      });
    });

    const rows = Array.from(typeMap.entries())
      .sort((a,b) => (b[1].weight - a[1].weight))
      .map(([type, rec]) => `
        <tr>
          <td>${escapeHtml(type)}</td>
          <td>${rec.count}</td>
          <td>${formatPct(rec.weight)}</td>
        </tr>
      `).join("") || `<tr><td colspan="3" class="text-muted">No assessments found in this stage.</td></tr>`;

    stageAgg.push(`
      <div class="card border-0 bg-white shadow-sm mb-3">
        <div class="card-body">
          <div class="fw-semibold mb-2">${escapeHtml(stg.name || "Stage")}</div>
          <div class="table-responsive">
            <table class="table table-sm align-middle mb-0">
              <thead>
                <tr>
                  <th>Assessment type</th>
                  <th class="text-nowrap">Count</th>
                  <th class="text-nowrap">Total weighting</th>
                </tr>
              </thead>
              <tbody>${rows}</tbody>
            </table>
          </div>
        </div>
      </div>
    `);
  });

  return stageAgg.join("") || `<div class="text-muted">No stages configured.</div>`;
}

function reportByModule(p) {
  const rows = (p.modules || []).map(m => {
    const typeMap = new Map();
    (m.assessments || []).forEach(a => {
      const t = a.type || "Unspecified";
      const rec = typeMap.get(t) || { weight: 0, count: 0 };
      rec.weight += Number(a.weighting || 0);
      rec.count += 1;
      typeMap.set(t, rec);
    });

    const summary = Array.from(typeMap.entries())
      .sort((a,b)=>b[1].weight-a[1].weight)
      .map(([t, rec]) => `${t} (${rec.count}, ${rec.weight}%)`)
      .join("; ");

    return `
      <tr>
        <td class="text-nowrap">${escapeHtml(m.code || "")}</td>
        <td>${escapeHtml(m.title || "")}</td>
        <td class="text-nowrap">${escapeHtml(summary || "—")}</td>
      </tr>
    `;
  }).join("") || `<tr><td colspan="3" class="text-muted">No modules.</td></tr>`;

  return `
    <div class="card border-0 bg-white shadow-sm">
      <div class="card-body">
        <div class="fw-semibold mb-2">By module</div>
        <div class="table-responsive">
          <table class="table table-sm align-middle mb-0">
            <thead>
              <tr>
                <th>Code</th>
                <th>Module</th>
                <th>Assessment mix</th>
              </tr>
            </thead>
            <tbody>${rows}</tbody>
          </table>
        </div>
      </div>
    </div>
  `;
}

function reportCoverage(p) {
  const items = (p.modules || []).map(m => {
    ensureMimloObjects(m);
    const mimlos = m.mimlos || [];
    const assessed = new Set();
    (m.assessments || []).forEach(a => (a.mimloIds || []).forEach(id => assessed.add(id)));

    const unassessed = mimlos.filter(mi => !assessed.has(mi.id));
    if (!unassessed.length) {
      return `
        <div class="card border-0 bg-white shadow-sm mb-2">
          <div class="card-body">
            <div class="fw-semibold">${escapeHtml(m.code||"")} — ${escapeHtml(m.title||"")}</div>
            <div class="small text-success">✓ All MIMLOs are assessed.</div>
          </div>
        </div>
      `;
    }
    return `
      <div class="card border-0 bg-white shadow-sm mb-2">
        <div class="card-body">
          <div class="fw-semibold">${escapeHtml(m.code||"")} — ${escapeHtml(m.title||"")}</div>
          <div class="small text-warning mb-2">Unassessed MIMLOs (${unassessed.length}):</div>
          <ul class="small mb-0">
            ${unassessed.map(mi => `<li>${escapeHtml(mi.text||"")}</li>`).join("")}
          </ul>
        </div>
      </div>
    `;
  }).join("");

  return items || `<div class="text-muted">No modules.</div>`;
}

function buildAssessmentReportHtml(p, reportId, versionId) {
  switch (reportId) {
    case "byStageType": return reportByStageType(p, versionId);
    case "byModule": return reportByModule(p);
    case "coverage": return reportCoverage(p);
    default: return `<div class="text-muted">Select a report.</div>`;
  }
}

function openReportInNewTab(html, title = "Report") {
  const w = window.open("", "_blank");
  if (!w) return alert("Popup blocked. Allow popups to open report in a new tab.");
  w.document.open();
  w.document.write(`
    <!doctype html>
    <html>
      <head>
        <meta charset="utf-8"/>
        <title>${title}</title>
        <link rel="stylesheet" href="./assets/styles.css">
        <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css" rel="stylesheet">
      </head>
      <body class="p-3">
        <h4 class="mb-3">${title}</h4>
        ${html}
      </body>
    </html>
  `);
  w.document.close();
}



function setField(path, value) {
  // path is string like "title" or "modules[0].title"
  // For MVP we update manually in handlers; this helper kept minimal.
  state.programme[path] = value;
  saveDebounced();
  renderHeader();
  renderFlags();
}

function render() {
  renderHeader();
  renderSteps();
  renderFlags();
  const p = state.programme;
  p.mode = p.mode || 'PROGRAMME_OWNER';
  const content = document.getElementById("content");
  const step = activeSteps()[state.stepIndex].key;
  const devModeToggleHtml = (_isDevModeUI() ? `
    <div class="d-flex justify-content-end align-items-center mb-2">
      <div class="form-check form-switch">
        <input class="form-check-input" type="checkbox" id="devModeToggle" ${state.programme.mode === "MODULE_EDITOR" ? "checked" : ""}>
        <label class="form-check-label small" for="devModeToggle">
          ${state.programme.mode === "MODULE_EDITOR" ? "Module Editor Mode" : "Programme Owner Mode"}
        </label>
      </div>
    </div>
  ` : "");

  if (step === "identity") {
    const schoolOpts = SCHOOL_OPTIONS.map(s => `<option value="${escapeHtml(s)}" ${p.school===s?"selected":""}>${escapeHtml(s)}</option>`).join("");
    const awardOpts = AWARD_TYPE_OPTIONS.map(a => {
      if (a === "Other") return `<option value="Other" ${p.awardTypeIsOther?"selected":""}>Other (type below)</option>`;
      return `<option value="${escapeHtml(a)}" ${(!p.awardTypeIsOther && p.awardType===a)?"selected":""}>${escapeHtml(a)}</option>`;
    }).join("");

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
                <option value="" disabled ${(!p.awardType && !p.awardTypeIsOther)?"selected":""}>Select an award type</option>
                ${awardOpts}
              </select>
              <div class="mt-2" id="awardOtherWrap" style="display:${p.awardTypeIsOther?"block":"none"}">
                <input class="form-control" id="awardOtherInput" value="${escapeHtml(p.awardTypeIsOther ? p.awardType : "")}" placeholder="Type the award type">
              </div>
            </div>
            <div class="col-md-4">
              <label class="form-label fw-semibold">NFQ level</label>
              <input type="number" min="5" max="10" step="1" class="form-control" id="levelInput" value="${p.nfqLevel ?? ""}">
            </div>
            <div class="col-md-4">
              <label class="form-label fw-semibold">Total credits (ECTS)</label>
              <input type="number" min="1" step="1" class="form-control" id="totalCreditsInput" value="${p.totalCredits ?? ""}" placeholder="e.g., 180 / 240">
            </div>
            <div class="col-md-4">
              <label class="form-label fw-semibold">School / Discipline</label>
              <select class="form-select" id="schoolSelect">
                <option value="" disabled ${!p.school?"selected":""}>Select a School</option>
                ${schoolOpts}
              </select>
            </div>
            <div class="col-md-12">
              <label class="form-label fw-semibold">QQI award standards (up to 2)</label>
              <div class="small text-secondary mb-2">Select 1-2 award standards. If using 2, you'll map each PLO to criteria from one of them.</div>
              <div id="standardSelectorsContainer"></div>
              <div class="form-text">These will drive PLO mapping and autocompletion.</div>
              <div id="standardMismatchAlert" class="mt-2"></div>
            </div>
            <div class="col-12">
              <label class="form-label fw-semibold">Intake months</label>
              <input class="form-control" id="intakeInput" value="${escapeHtml((p.intakeMonths||[]).join(", "))}" placeholder="Comma-separated, e.g., Sep, Jan">
            </div>
          </div>
        </div>
      </div>
    `;
    wireDevModeToggle();
    wireIdentity();
    return;
  }

  
  if (step === "versions") {
    const versions = Array.isArray(p.versions) ? p.versions : [];
    const modDefs = [
      { key: "F2F", label: "Face-to-face" },
      { key: "BLENDED", label: "Blended" },
      { key: "ONLINE", label: "Fully online" },
    ];

    const vCards = versions.map((v, idx) => {
      const intakeVal = (v.intakes || []).join(", ");
      const isActive = state.selectedVersionId ? (state.selectedVersionId === v.id) : (idx === 0);
      const selectedMod = v.deliveryModality || "";
      const modRadios = modDefs.map(m => `
        <div class="form-check form-check-inline">
          <input class="form-check-input" type="radio" name="vmod_${v.id}" id="vmod_${v.id}_${m.key}" value="${m.key}" ${selectedMod === m.key ? "checked" : ""}>
          <label class="form-check-label" for="vmod_${v.id}_${m.key}">${escapeHtml(m.label)}</label>
        </div>
      `).join("");

      const patternCard = selectedMod ? (() => {
        const pat = (v.deliveryPatterns || {})[selectedMod] || defaultPatternFor(selectedMod);
        return `
          <div class="card mt-2">
            <div class="card-body">
              <div class="d-flex align-items-center justify-content-between">
                <div class="fw-semibold">${escapeHtml(selectedMod)} delivery pattern (must total 100%)</div>
                <span class="small">${tagHtml(sumPattern(pat)===100?"ok":"warn")} <span class="text-secondary">${sumPattern(pat)}%</span></span>
              </div>
              <div class="row g-2 mt-2">
                <div class="col-md-4">
                  <label class="form-label">Synchronous Online Classes %</label>
                  <input type="number" min="0" max="100" class="form-control" id="pat_${v.id}_${selectedMod}_sync" value="${Number(pat.syncOnlinePct||0)}">
                </div>
                <div class="col-md-4">
                  <label class="form-label">Asynchronous Directed Learning %</label>
                  <input type="number" min="0" max="100" class="form-control" id="pat_${v.id}_${selectedMod}_async" value="${Number(pat.asyncDirectedPct||0)}">
                </div>
                <div class="col-md-4">
                  <label class="form-label">On Campus Learning Event %</label>
                  <input type="number" min="0" max="100" class="form-control" id="pat_${v.id}_${selectedMod}_campus" value="${Number(pat.onCampusPct||0)}">
                </div>
              </div>
            </div>
          </div>
        `;
      })() : `<div class="small text-secondary mt-2">Select a delivery modality to define delivery patterns.</div>`;

      const proctorYes = (v.onlineProctoredExams || "TBC") === "YES";
      const proctorNotesStyle = proctorYes ? "" : "d-none";

      return `
        <div class="card mb-3">
          <div class="card-header d-flex flex-wrap gap-2 align-items-center justify-content-between">
            <div class="fw-semibold">Version ${idx+1}: ${escapeHtml(v.label || "(untitled)")}</div>
            <div class="d-flex gap-2 align-items-center">
              <button class="btn btn-sm ${isActive?"btn-primary":"btn-outline-primary"}" id="setActive_${v.id}">${isActive?"Active for stages":"Set active"}</button>
              <button class="btn btn-sm btn-outline-danger" id="removeVer_${v.id}">Remove</button>
            </div>
          </div>
          <div class="card-body">
            <div class="row g-3">
              <div class="col-md-6">
                <label class="form-label fw-semibold">Version label</label>
                <input class="form-control" id="vlabel_${v.id}" value="${escapeHtml(v.label||"")}">
              </div>
              <div class="col-md-2">
                <label class="form-label fw-semibold">Code</label>
                <input class="form-control" id="vcode_${v.id}" value="${escapeHtml(v.code||"")}">
              </div>
              <div class="col-md-4">
                <label class="form-label fw-semibold">Duration</label>
                <input class="form-control" id="vduration_${v.id}" value="${escapeHtml(v.duration||"")}" placeholder="e.g., 1 year FT / 2 years PT">
              </div>
              <div class="col-md-6">
                <label class="form-label fw-semibold">Intakes</label>
                <input class="form-control" id="vintakes_${v.id}" value="${escapeHtml(intakeVal)}" placeholder="Comma-separated, e.g., Sep, Jan">
              </div>
              <div class="col-md-3">
                <label class="form-label fw-semibold">Target cohort size</label>
                <input type="number" min="0" class="form-control" id="vcohort_${v.id}" value="${Number(v.targetCohortSize||0)}">
              </div>
              <div class="col-md-3">
                <label class="form-label fw-semibold">Number of groups</label>
                <input type="number" min="0" class="form-control" id="vgroups_${v.id}" value="${Number(v.numberOfGroups||0)}">
              </div>
              <div class="col-12">
                <label class="form-label fw-semibold">Delivery modality</label>
                <div>${modRadios}</div>
                ${patternCard}
              </div>
              <div class="col-12">
                <label class="form-label fw-semibold">Delivery notes</label>
                <textarea class="form-control" rows="3" id="vnotes_${v.id}" placeholder="High-level plan: where learning happens, key touchpoints.">${escapeHtml(v.deliveryNotes||"")}</textarea>
              </div>
              <div class="col-md-4">
                <label class="form-label fw-semibold">Online proctored exams?</label>
                <select class="form-select" id="vproctor_${v.id}">
                  <option value="TBC" ${(v.onlineProctoredExams||"TBC")==="TBC"?"selected":""}>TBC</option>
                  <option value="NO" ${(v.onlineProctoredExams||"TBC")==="NO"?"selected":""}>No</option>
                  <option value="YES" ${(v.onlineProctoredExams||"TBC")==="YES"?"selected":""}>Yes</option>
                </select>
              </div>
              <div class="col-12 ${proctorNotesStyle}" id="vproctorNotesWrap_${v.id}">
                <label class="form-label fw-semibold">Proctoring notes</label>
                <textarea class="form-control" rows="2" id="vproctorNotes_${v.id}" placeholder="What is proctored, when, and why?">${escapeHtml(v.onlineProctoredExamsNotes||"")}</textarea>
              </div>
              <div class="col-12">
                <div class="small text-secondary">Stages in this version: <span class="fw-semibold">${(v.stages||[]).length}</span> (define in the next step).</div>
              </div>
            </div>
          </div>
        </div>
      `;
    }).join("");

    content.innerHTML = devModeToggleHtml + `
      <div class="d-flex align-items-center justify-content-between flex-wrap gap-2">
        <div>
          <h4 class="mb-1">Programme Versions</h4>
          <div class="text-secondary">Create versions (e.g., FT/PT/Online). Each version can have different delivery patterns, capacity, intakes and stage structure.</div>
        </div>
        <button class="btn btn-dark" id="addVersionBtn">+ Add version</button>
      </div>
      <div class="mt-3">
        ${vCards || `<div class="alert alert-info mb-0">No versions yet. Add at least one version to continue.</div>`}
      </div>
    `;
    wireDevModeToggle();

    wireVersions();
    return;
  }

  if (step === "stages") {
    const versions = Array.isArray(p.versions) ? p.versions : [];
    if (!versions.length) {
      content.innerHTML = devModeToggleHtml + `<div class="alert alert-warning">Add at least one Programme Version first.</div>`;
      wireDevModeToggle();
      return;
    }
    if (!state.selectedVersionId) state.selectedVersionId = versions[0].id;
    const v = versions.find(x => x.id === state.selectedVersionId) || versions[0];

    const vSelect = versions.map(x => `<option value="${escapeHtml(x.id)}" ${x.id===v.id?"selected":""}>${escapeHtml(x.code||"")}${x.code?" — ":""}${escapeHtml(x.label||"")}</option>`).join("");

    const stageCards = (v.stages || []).sort((a,b)=>Number(a.sequence||0)-Number(b.sequence||0)).map((s) => {
      const exitOn = s.exitAward && s.exitAward.enabled;
      const exitWrapClass = exitOn ? "" : "d-none";

      const moduleChecks = (p.modules || []).map(m => {
        const picked = (s.modules || []).find(x => x.moduleId === m.id);
        const checked = !!picked;
        const semVal = picked ? (picked.semester || "") : "";
        return `
          <div class="border rounded p-2 mb-2">
            <div class="form-check">
              <input class="form-check-input" type="checkbox" id="st_${s.id}_mod_${m.id}" ${checked?"checked":""}>
              <label class="form-check-label" for="st_${s.id}_mod_${m.id}">
                ${escapeHtml(m.code ? `${m.code} — ` : "")}${escapeHtml(m.title)} <span class="text-secondary small">(${Number(m.credits||0)} cr)</span>
              </label>
            </div>
            <div class="mt-2 ${checked?"":"d-none"}" id="st_${s.id}_semWrap_${m.id}">
              <label class="form-label small mb-1">Semester / timing tag (optional)</label>
              <input class="form-control form-control-sm" id="st_${s.id}_sem_${m.id}" value="${escapeHtml(semVal)}" placeholder="e.g., S1 / S2 / Year / Block 1">
            </div>
          </div>
        `;
      }).join("");

      const stageCreditSum = sumStageCredits(p.modules || [], s.modules || []);

      return `
        <div class="card mb-3">
          <div class="card-header d-flex align-items-center justify-content-between flex-wrap gap-2">
            <div class="fw-semibold">${escapeHtml(s.name || `Stage ${s.sequence || ""}`)}</div>
            <button class="btn btn-sm btn-outline-danger" id="removeStage_${s.id}">Remove stage</button>
          </div>
          <div class="card-body">
            <div class="row g-3">
              <div class="col-md-6">
                <label class="form-label fw-semibold">Stage name</label>
                <input class="form-control" id="stname_${s.id}" value="${escapeHtml(s.name||"")}">
              </div>
              <div class="col-md-3">
                <label class="form-label fw-semibold">Sequence</label>
                <input type="number" min="1" class="form-control" id="stseq_${s.id}" value="${Number(s.sequence||1)}">
              </div>
              <div class="col-md-3">
                <label class="form-label fw-semibold">Credits target</label>
                <input type="number" min="0" class="form-control" id="stcred_${s.id}" value="${Number(s.creditsTarget||0)}">
                <div class="small text-secondary mt-1">Assigned modules sum to <span class="fw-semibold">${stageCreditSum}</span> credits.</div>
              </div>
              <div class="col-12">
                <div class="form-check">
                  <input class="form-check-input" type="checkbox" id="stexit_${s.id}" ${exitOn?"checked":""}>
                  <label class="form-check-label fw-semibold" for="stexit_${s.id}">Enable exit award for this stage</label>
                </div>
              </div>
              <div class="col-12 ${exitWrapClass}" id="stexitWrap_${s.id}">
                <label class="form-label fw-semibold">Exit award title</label>
                <input class="form-control" id="stexitTitle_${s.id}" value="${escapeHtml((s.exitAward && s.exitAward.awardTitle)||"")}">
              </div>
              <div class="col-12">
                <label class="form-label fw-semibold">Modules in this stage</label>
                ${moduleChecks || `<div class="text-secondary">No modules defined yet (add modules in Credits & Modules).</div>`}
              </div>
            </div>
          </div>
        </div>
      `;
    }).join("");

    content.innerHTML = devModeToggleHtml + `
      <div class="d-flex align-items-center justify-content-between flex-wrap gap-2">
        <div>
          <h4 class="mb-1">Stage Structure</h4>
          <div class="text-secondary">Define stages for the selected programme version and assign modules to each stage.</div>
        </div>
        <div class="d-flex gap-2 align-items-center">
          <select class="form-select" id="stageVersionSelect" style="min-width: 260px;">
            ${vSelect}
          </select>
          <button class="btn btn-dark" id="addStageBtn">+ Add stage</button>
        </div>
      </div>

      <div class="mt-3">
        ${stageCards || `<div class="alert alert-info mb-0">No stages yet for this version. Add a stage to begin.</div>`}
      </div>
    `;
    wireDevModeToggle();

    wireStages();
    return;
  }


if (step === "structure") {
    const moduleRows = (p.modules||[]).map((m, idx) => `
      <div class="card border-0 bg-white shadow-sm mb-3">
        <div class="card-body">
          <div class="d-flex justify-content-between align-items-center mb-2">
            <div class="fw-semibold">Module ${idx+1}</div>
            <button class="btn btn-outline-danger btn-sm" data-remove-module="${m.id}">Remove</button>
          </div>
          <div class="row g-3">
            <div class="col-md-3">
              <label class="form-label fw-semibold">Code (optional)</label>
              <input class="form-control" data-module-field="code" data-module-id="${m.id}" value="${escapeHtml(m.code||"")}">
            </div>
            <div class="col-md-6">
              <label class="form-label fw-semibold">Title</label>
              <input class="form-control" data-module-field="title" data-module-id="${m.id}" value="${escapeHtml(m.title||"")}">
            </div>
            <div class="col-md-3">
              <label class="form-label fw-semibold">Credits</label>
              <input type="number" class="form-control" data-module-field="credits" data-module-id="${m.id}" value="${Number(m.credits||0)}">
            </div>
          </div>
        </div>
      </div>
    `).join("");

    content.innerHTML = devModeToggleHtml + `
      <div class="card shadow-sm">
        <div class="card-body">
          <div class="d-flex justify-content-between align-items-center mb-3">
            <h5 class="card-title mb-0">Credits & modules (QQI-critical)</h5>
            <button class="btn btn-dark btn-sm" id="addModuleBtn">+ Add module</button>
          </div>

          <div class="row g-3 mb-3">
            <div class="col-md-4">
              <label class="form-label fw-semibold">Total programme credits (from Identity)</label>
              <input type="number" class="form-control" id="totalCredits" value="${Number(p.totalCredits||0)}" disabled>
            </div>
            <div class="col-md-8 d-flex align-items-end">
              <div class="small-muted">Tip: keep the module list light at MVP stage — codes can be placeholders.</div>
            </div>
          </div>

          ${moduleRows || `<div class="small text-secondary">No modules added yet.</div>`}
        </div>
      </div>
    `;
    wireDevModeToggle();
    wireStructure();
    return;
  }

  if (step === "outcomes") {
    const rows = (p.plos||[]).map((o, idx) => {
      // Group mappings by standard
      const mappingsByStandard = {};
      (o.standardMappings||[]).forEach((m,i) => {
        const stdId = m.standardId || p.awardStandardIds?.[0] || 'unknown';
        if (!mappingsByStandard[stdId]) mappingsByStandard[stdId] = [];
        mappingsByStandard[stdId].push({mapping: m, index: i});
      });
      
      const mappings = Object.entries(mappingsByStandard).map(([stdId, items]) => {
        const stdIndex = p.awardStandardIds?.indexOf(stdId);
        const stdName = stdIndex >= 0 ? p.awardStandardNames[stdIndex] : stdId;
        const showStdHeader = p.awardStandardIds?.length > 1;
        
        const badges = items.map(({mapping: m, index: i}) => `
          <span class="badge text-bg-secondary me-2 mb-2">
            ${escapeHtml(m.criteria)} / ${escapeHtml(m.thread)}
            <button type="button" class="btn btn-sm btn-link text-white opacity-75 p-0 ms-2" data-remove-plo-map="${o.id}" data-remove-plo-map-index="${i}" title="Remove">×</button>
          </span>
        `).join('');
        
        return showStdHeader 
          ? `<div class="mb-2"><div class="small fw-semibold text-secondary mb-1">${escapeHtml(stdName)}</div>${badges}</div>`
          : badges;
      }).join("");

      // Lint the PLO text for problematic verbs
      const lintResult = (typeof LO_Lint !== 'undefined') ? LO_Lint.lintLearningOutcome(o.text || "") : { issues: [] };
      const lintWarnings = lintResult.issues.filter(i => i.severity === 'warn').map(issue => `
        <div class="alert alert-warning py-1 px-2 mb-1 small">
          <strong>⚠️ "${escapeHtml(issue.match)}"</strong> — ${escapeHtml(issue.message)}
          ${issue.suggestions.length ? `<br><em>Try: ${issue.suggestions.map(s => escapeHtml(s)).join(", ")}</em>` : ""}
        </div>
      `).join("");

      return `
      <div class="card border-0 bg-white shadow-sm mb-3">
        <div class="card-body">
          <div class="d-flex justify-content-between align-items-center mb-2">
            <div class="fw-semibold">PLO ${idx+1}</div>
            <button class="btn btn-outline-danger btn-sm" data-remove-plo="${o.id}">Remove</button>
          </div>

          <textarea class="form-control" data-plo-id="${o.id}" rows="3" placeholder="e.g., Analyse… / Design and implement…">${escapeHtml(o.text||"")}</textarea>
          <div class="plo-lint-warnings mt-2">${lintWarnings}</div>

          <div class="mt-3">
            <div class="fw-semibold small mb-2">Map this PLO to QQI award standards</div>
            ${!p.awardStandardIds || !p.awardStandardIds.length ? `
              <div class="small text-danger">Select a QQI award standard in Identity to enable mapping.</div>
            ` : `
              ${p.awardStandardIds.length > 1 ? `
                <div class="mb-2">
                  <label class="form-label small mb-1">Select which standard to map to:</label>
                  <select class="form-select form-select-sm" data-plo-standard-selector="${o.id}" style="max-width: 400px;">
                    ${p.awardStandardIds.map((stdId, idx) => `<option value="${escapeHtml(stdId)}">${escapeHtml(p.awardStandardNames[idx] || stdId)}</option>`).join('')}
                  </select>
                </div>
              ` : ''}
              <div class="d-flex flex-wrap gap-2 align-items-end">
                <div style="min-width:220px">
                  <label class="form-label small mb-1">Criteria</label>
                  <select class="form-select form-select-sm" data-plo-map-criteria="${o.id}"></select>
                </div>
                <div style="min-width:260px">
                  <label class="form-label small mb-1">Thread</label>
                  <select class="form-select form-select-sm" data-plo-map-thread="${o.id}"></select>
                </div>
                <button type="button" class="btn btn-outline-primary btn-sm" data-add-plo-map="${o.id}">Add mapping</button>
              </div>
              <div class="small text-secondary mt-2" data-plo-map-desc="${o.id}"></div>
              <div class="mt-2" data-plo-map-list="${o.id}">
                ${mappings || `<div class="small text-secondary">No mappings yet for this PLO.</div>`}
              </div>
            `}
          </div>
        </div>
      </div>
    `;
    }).join("");

    content.innerHTML = devModeToggleHtml + `
      <div class="card shadow-sm">
        <div class="card-body">
          <div class="d-flex justify-content-between align-items-center mb-3">
            <h5 class="card-title mb-0">Programme Learning Outcomes (PLOs) (QQI-critical)</h5>
            <button class="btn btn-dark btn-sm" id="addPloBtn">+ Add PLO</button>
          </div>
          ${bloomsGuidanceHtml(p.nfqLevel, "Programme Learning Outcomes")}
          <div id="plosStandardMismatchAlert" class="mb-3"></div>
          <div class="small-muted mb-3">Aim for ~6–12 clear, assessable outcomes. Keep them measurable and assessable.</div>
          ${rows || `<div class="small text-secondary">No PLOs added yet.</div>`}
          <hr class="my-4"/>
          <h6 class="mb-2">PLO ↔ Award Standard Mapping Snapshot</h6>
          <div id="ploMappingSnapshot" class="small"></div>
        </div>
      </div>
    `;
    wireDevModeToggle();
    wireOutcomes();
    return;
  }

  if (step === "mimlos") {

const editableIds = editableModuleIds();
const selectedId = getSelectedModuleId();
const canPickModule = (state.programme.mode === "MODULE_EDITOR" && editableIds.length > 1);
const modulesForEdit = (p.modules || []).filter(m => editableIds.includes(m.id));
const modulePicker = canPickModule ? `
  <div class="row g-3 mb-3">
    <div class="col-md-6">
      <label class="form-label fw-semibold">Assigned module</label>
      <select class="form-select" id="modulePicker">
        ${modulesForEdit.map(m => `<option value="${m.id}" ${m.id===selectedId?"selected":""}>${escapeHtml(m.code || "")} — ${escapeHtml(m.title || "")}</option>`).join("")}
      </select>
    </div>
  </div>
` : "";

    const blocks = modulesForEdit.map(m => {
      const items = (m.mimlos||[]).map((t, i) => {
        // Lint the MIMLO text for problematic verbs
        const mimloTxt = mimloText(t);
        const lintResult = (typeof LO_Lint !== 'undefined') ? LO_Lint.lintLearningOutcome(mimloTxt) : { issues: [] };
        const lintWarnings = lintResult.issues.filter(iss => iss.severity === 'warn').map(issue => `
          <div class="alert alert-warning py-1 px-2 mb-0 mt-1 small">
            <strong>⚠️ "${escapeHtml(issue.match)}"</strong> — ${escapeHtml(issue.message)}
            ${issue.suggestions.length ? `<br><em>Try: ${issue.suggestions.map(s => escapeHtml(s)).join(", ")}</em>` : ""}
          </div>
        `).join("");

        return `
          <div class="mb-2">
            <div class="input-group d-flex gap-2">
              <input class="form-control" data-mimlo-module="${m.id}" data-mimlo-index="${i}" value="${escapeHtml(mimloTxt)}">
              <button class="btn btn-outline-danger" data-remove-mimlo="${m.id}" data-remove-mimlo-index="${i}">Remove</button>
            </div>
            <div class="mimlo-lint-warnings mt-1">${lintWarnings}</div>
          </div>
        `;
      }).join("");
      const isHidden = (state.programme.mode === "MODULE_EDITOR" && editableIds.length > 1 && m.id !== selectedId);
      return `
        <div class="card border-0 bg-white shadow-sm mb-3" ${isHidden ? 'style="display:none"' : ""} data-module-card="${m.id}">
          <div class="card-body">
            <div class="fw-semibold mb-1">${escapeHtml((m.code?m.code+" — ":"") + m.title)}</div>
            <div class="small-muted mb-3">Add 3–6 MIMLOs per module to start.</div>
            ${items || `<div class="small text-secondary mb-2">No MIMLOs yet.</div>`}
            <button class="btn btn-outline-secondary btn-sm" data-add-mimlo="${m.id}">+ Add MIMLO</button>
          </div>
        </div>
      `;
    }).join("");

    content.innerHTML = devModeToggleHtml + `
      <div class="card shadow-sm">
        <div class="card-body">
          <h5 class="card-title mb-3">MIMLOs (Minimum Intended Module Learning Outcomes)</h5>
          ${bloomsGuidanceHtml(p.nfqLevel, "MIMLOs")}
          ${modulePicker}
          ${modulesForEdit.length ? blocks : `<div class="small text-secondary">Add modules first (Credits & Modules step).</div>`}
        </div>
      </div>
    `;
    wireDevModeToggle();
    wireMimlos();
    return;
  }


if (step === "effort-hours") {
  const editableIds = editableModuleIds();
  const selectedId = getSelectedModuleId();
  const modulesForEdit = (p.modules || []).filter(m => editableIds.includes(m.id));
  const canPickModule = (state.programme.mode === "MODULE_EDITOR" && editableIds.length > 1);

  const modulePicker = canPickModule ? `
    <div class="row g-3 mb-3">
      <div class="col-md-6">
        <label class="form-label fw-semibold">Assigned module</label>
        <select class="form-select" id="modulePicker">
          ${modulesForEdit.map(m => `<option value="${m.id}" ${m.id===selectedId?"selected":""}>${escapeHtml(m.code || "")} — ${escapeHtml(m.title || "")}</option>`).join("")}
        </select>
      </div>
    </div>
  ` : "";

  // Build version/modality combinations from programme versions
  const versions = Array.isArray(p.versions) ? p.versions : [];
  const modalityLabels = { F2F: "Face-to-face", BLENDED: "Blended", ONLINE: "Fully online" };
  const versionModalities = versions
    .filter(v => v.deliveryModality) // Only versions with a modality selected
    .map(v => ({
      key: `${v.id}_${v.deliveryModality}`,
      versionId: v.id,
      modality: v.deliveryModality,
      label: `${v.label || v.code || 'Version'} — ${modalityLabels[v.deliveryModality] || v.deliveryModality}`
    }));

  const blocks = modulesForEdit.map(m => {
    // Ensure effortHours structure exists for each version/modality
    m.effortHours = m.effortHours || {};
    versionModalities.forEach(vm => {
      m.effortHours[vm.key] = m.effortHours[vm.key] || {
        classroomHours: 0,
        classroomRatio: "1:60",
        mentoringHours: 0,
        mentoringRatio: "1:25",
        otherContactHours: 0,
        otherContactRatio: "",
        otherContactSpecify: "",
        directedElearningHours: 0,
        independentLearningHours: 0,
        otherHours: 0,
        otherHoursSpecify: "",
        workBasedHours: 0
      };
    });

    const isHidden = (state.programme.mode === "MODULE_EDITOR" && editableIds.length > 1 && m.id !== selectedId);
    
    // Calculate totals for each version/modality
    const getTotalHours = (key) => {
      const e = m.effortHours[key] || {};
      return Number(e.classroomHours || 0) + Number(e.mentoringHours || 0) + 
             Number(e.otherContactHours || 0) + Number(e.directedElearningHours || 0) + 
             Number(e.independentLearningHours || 0) + Number(e.otherHours || 0) + 
             Number(e.workBasedHours || 0);
    };

    // Expected total based on credits (1 ECTS = 25 hours typically)
    const expectedTotal = Number(m.credits || 0) * 25;

    const modalityRows = versionModalities.map(vm => {
      const e = m.effortHours[vm.key] || {};
      const total = getTotalHours(vm.key);
      const totalClass = total === expectedTotal ? 'text-bg-success' : (total > 0 ? 'text-bg-warning' : 'text-bg-secondary');
      
      return `
        <tr data-version-modality="${vm.key}" data-module-id="${m.id}">
          <td class="fw-semibold align-middle">${escapeHtml(vm.label)}</td>
          <td>
            <input type="number" class="form-control form-control-sm" style="width:70px" 
              data-effort-field="classroomHours" value="${e.classroomHours || 0}" min="0">
          </td>
          <td>
            <input type="text" class="form-control form-control-sm" style="width:70px" 
              data-effort-field="classroomRatio" value="${escapeHtml(e.classroomRatio || '1:60')}" placeholder="1:60">
          </td>
          <td>
            <input type="number" class="form-control form-control-sm" style="width:70px" 
              data-effort-field="mentoringHours" value="${e.mentoringHours || 0}" min="0">
          </td>
          <td>
            <input type="text" class="form-control form-control-sm" style="width:70px" 
              data-effort-field="mentoringRatio" value="${escapeHtml(e.mentoringRatio || '1:25')}" placeholder="1:25">
          </td>
          <td>
            <input type="number" class="form-control form-control-sm" style="width:60px" 
              data-effort-field="otherContactHours" value="${e.otherContactHours || 0}" min="0">
          </td>
          <td>
            <input type="text" class="form-control form-control-sm" style="width:70px" 
              data-effort-field="otherContactRatio" value="${escapeHtml(e.otherContactRatio || '')}" placeholder="1:X">
          </td>
          <td>
            <input type="text" class="form-control form-control-sm" style="width:90px" 
              data-effort-field="otherContactSpecify" value="${escapeHtml(e.otherContactSpecify || '')}" placeholder="Specify...">
          </td>
          <td>
            <input type="number" class="form-control form-control-sm" style="width:70px" 
              data-effort-field="directedElearningHours" value="${e.directedElearningHours || 0}" min="0">
          </td>
          <td>
            <input type="number" class="form-control form-control-sm" style="width:70px" 
              data-effort-field="independentLearningHours" value="${e.independentLearningHours || 0}" min="0">
          </td>
          <td>
            <input type="number" class="form-control form-control-sm" style="width:60px" 
              data-effort-field="otherHours" value="${e.otherHours || 0}" min="0">
          </td>
          <td>
            <input type="text" class="form-control form-control-sm" style="width:90px" 
              data-effort-field="otherHoursSpecify" value="${escapeHtml(e.otherHoursSpecify || '')}" placeholder="Specify...">
          </td>
          <td>
            <input type="number" class="form-control form-control-sm" style="width:70px" 
              data-effort-field="workBasedHours" value="${e.workBasedHours || 0}" min="0">
          </td>
          <td class="text-center align-middle">
            <span class="badge ${totalClass}" data-total-display>${total}</span>
          </td>
        </tr>
      `;
    }).join("");

    const noVersionsMsg = versionModalities.length === 0 
      ? `<div class="alert alert-info mb-0">No programme versions with delivery modalities defined. Go to the Programme Versions step to add versions and select their delivery modality.</div>` 
      : "";

    return `
      <div class="card border-0 bg-white shadow-sm mb-4" ${isHidden ? 'style="display:none"' : ""} data-module-card="${m.id}">
        <div class="card-body">
          <div class="d-flex justify-content-between align-items-center mb-3">
            <div class="fw-semibold">${escapeHtml((m.code ? m.code + " — " : "") + m.title)}</div>
            <div class="small text-secondary">
              ${m.credits} ECTS × 25 = <strong>${expectedTotal}</strong> expected hours
            </div>
          </div>
          
          ${noVersionsMsg || `
          <div class="table-responsive">
            <table class="table table-sm table-bordered align-middle mb-0" data-effort-table="${m.id}">
              <thead>
                <tr>
                  <th rowspan="2" class="align-middle" style="min-width:150px">Version / Modality</th>
                  <th colspan="2" class="text-center">Classroom &amp; Demonstrations</th>
                  <th colspan="2" class="text-center">Mentoring &amp; Small-group</th>
                  <th colspan="3" class="text-center">Other Contact (specify)</th>
                  <th rowspan="2" class="text-center align-middle" style="min-width:80px">Directed<br>E-learning</th>
                  <th rowspan="2" class="text-center align-middle" style="min-width:80px">Independent<br>Learning</th>
                  <th colspan="2" class="text-center">Other Hours (specify)</th>
                  <th rowspan="2" class="text-center align-middle" style="min-width:80px">Work-based<br>Learning</th>
                  <th rowspan="2" class="text-center align-middle" style="min-width:70px">Total<br>Effort</th>
                </tr>
                <tr>
                  <th class="text-center small">Hours</th>
                  <th class="text-center small">Min Ratio</th>
                  <th class="text-center small">Hours</th>
                  <th class="text-center small">Min Ratio</th>
                  <th class="text-center small">Hours</th>
                  <th class="text-center small">Ratio</th>
                  <th class="text-center small">Type</th>
                  <th class="text-center small">Hours</th>
                  <th class="text-center small">Type</th>
                </tr>
              </thead>
              <tbody>
                ${modalityRows}
              </tbody>
            </table>
          </div>
          
          <div class="small text-secondary mt-2">
            <strong>Tip:</strong> Total effort hours should equal ${expectedTotal} (based on ${m.credits} ECTS credits × 25 hours per credit).
          </div>
          `}
        </div>
      </div>
    `;
  }).join("");

  content.innerHTML = devModeToggleHtml + `
    <div class="card shadow-sm">
      <div class="card-body">
        <h5 class="card-title mb-3">Effort Hours by Version / Modality</h5>
        <p class="small text-secondary mb-3">
          Define how student learning effort is distributed across different activity types for each programme version and delivery modality.
          This helps demonstrate the workload balance and staffing requirements (teacher/learner ratios).
        </p>
        ${modulePicker}
        ${modulesForEdit.length ? blocks : `<div class="small text-secondary">Add modules first (Credits & Modules step).</div>`}
      </div>
    </div>
  `;
  wireDevModeToggle();
  wireEffortHours();
  return;
}


if (step === "assessments") {
  const editableIds = editableModuleIds();
  const selectedId = getSelectedModuleId();
  const modules = (p.modules || []).filter(m => editableIds.includes(m.id));
  const typeOpts = [
    "Report/Essay","Project","Presentation","Portfolio","Practical/Lab",
    "Exam (On campus)","Exam (Online)","Reflective Journal","Other"
  ];

  const modulePicker = (editableIds.length > 1) ? `
    <div class="row g-3 mb-3">
      <div class="col-md-6">
        <label class="form-label fw-semibold">Assigned module</label>
        <select class="form-select" id="modulePicker">
          ${modules.map(m => `<option value="${m.id}" ${m.id===selectedId?"selected":""}>${escapeHtml(m.code || "")} — ${escapeHtml(m.title || "")}</option>`).join("")}
        </select>
      </div>
    </div>
  ` : "";

  const cards = modules.map(m => {
    ensureMimloObjects(m);
    m.assessments = m.assessments || [];
    const total = m.assessments.reduce((acc,a)=>acc+(Number(a.weighting)||0),0);
    const totalBadge = (total === 100)
      ? `<span class="badge text-bg-success">Total ${total}%</span>`
      : `<span class="badge text-bg-warning">Total ${total}% (should be 100)</span>`;

    const mimloList = (m.mimlos||[]).map(mi => `
      <div class="form-check">
        <input class="form-check-input" type="checkbox"
          data-asm-mimlo="${m.id}"
          data-asm-mimlo-id="${mi.id}">
        <label class="form-check-label small">${escapeHtml(mi.text||"")}</label>
      </div>
    `).join("");

    const asmCards = (m.assessments||[]).map(a => {
      const mode = a.mode || "Online";
      const integ = a.integrity || {};
      return `
        <div class="card border-0 bg-white shadow-sm mb-3">
          <div class="card-body">
            <div class="d-flex justify-content-between align-items-center mb-2">
              <div class="fw-semibold">${escapeHtml(a.title || "Assessment")}</div>
              <button class="btn btn-outline-danger btn-sm" data-remove-asm="${m.id}" data-asm-id="${a.id}">Remove</button>
            </div>

            <div class="row g-2">
              <div class="col-md-4">
                <label class="form-label small fw-semibold">Title</label>
                <input class="form-control" data-asm-title="${m.id}" data-asm-id="${a.id}" value="${escapeHtml(a.title||"")}">
              </div>
              <div class="col-md-3">
                <label class="form-label small fw-semibold">Type</label>
                <select class="form-select" data-asm-type="${m.id}" data-asm-id="${a.id}">
                  ${typeOpts.map(t=>`<option value="${escapeHtml(t)}" ${(a.type||"")==t?"selected":""}>${escapeHtml(t)}</option>`).join("")}
                </select>
              </div>
              <div class="col-md-2">
                <label class="form-label small fw-semibold">Weighting %</label>
                <input type="number" min="0" max="100" step="1" class="form-control"
                  data-asm-weight="${m.id}" data-asm-id="${a.id}" value="${a.weighting ?? ""}">
              </div>
              <div class="col-md-3">
                <label class="form-label small fw-semibold">Mode</label>
                <select class="form-select" data-asm-mode="${m.id}" data-asm-id="${a.id}">
                  ${["Online","OnCampus","Hybrid"].map(x=>`<option value="${x}" ${mode===x?"selected":""}>${x}</option>`).join("")}
                </select>
              </div>
            </div>

            <div class="row g-2 mt-2">
              <div class="col-md-6">
                <div class="fw-semibold small mb-1">Map to MIMLOs</div>
                <div class="border rounded p-2" data-asm-mimlo-box="${m.id}" data-asm-id="${a.id}">
                  ${(m.mimlos||[]).map(mi => {
                    const checked = (a.mimloIds||[]).includes(mi.id);
                    return `
                      <div class="form-check">
                        <input class="form-check-input" type="checkbox"
                          data-asm-map="${m.id}" data-asm-id="${a.id}" data-mimlo-id="${mi.id}" ${checked?"checked":""}>
                        <label class="form-check-label small">${escapeHtml(mi.text||"")}</label>
                      </div>
                    `;
                  }).join("")}
                </div>
              </div>

              <div class="col-md-6">
                <div class="fw-semibold small mb-1">Integrity controls</div>
                <div class="border rounded p-2">
                  ${[
                    ["proctored","Proctored"],
                    ["viva","Viva/oral"],
                    ["inClass","In-class component"],
                    ["originalityCheck","Originality check"],
                    ["aiDeclaration","AI declaration"]
                  ].map(([k,label]) => `
                    <div class="form-check">
                      <input class="form-check-input" type="checkbox"
                        data-asm-int="${m.id}" data-asm-id="${a.id}" data-int-key="${k}" ${integ[k] ? "checked":""}>
                      <label class="form-check-label small">${label}</label>
                    </div>
                  `).join("")}
                </div>
              </div>
            </div>

            <div class="mt-2">
              <label class="form-label small fw-semibold">Notes</label>
              <textarea class="form-control" rows="2" data-asm-notes="${m.id}" data-asm-id="${a.id}">${escapeHtml(a.notes||"")}</textarea>
            </div>
          </div>
        </div>
      `;
    }).join("");

    return `
      <div class="card border-0 bg-white shadow-sm mb-3" ${p.mode==="MODULE_EDITOR" && m.id!==selectedId ? 'style="display:none"' : ""} data-module-card="${m.id}">
        <div class="card-body">
          <div class="d-flex justify-content-between align-items-center mb-2">
            <div class="fw-semibold">${escapeHtml(m.code||"")} — ${escapeHtml(m.title||"")}</div>
            ${totalBadge}
          </div>
          <button class="btn btn-outline-primary btn-sm mb-3" data-add-asm="${m.id}">+ Add assessment</button>
          ${asmCards || `<div class="text-muted small">No assessments yet.</div>`}
        </div>
      </div>
    `;
  }).join("");

  content.innerHTML = devModeToggleHtml + `
    <div class="d-flex align-items-center justify-content-between mb-3">
      <div>
        <div class="h5 mb-0">Assessments</div>
        <div class="text-muted small">Create assessments per module, set weightings, and map to MIMLOs.</div>
      </div>
    </div>
    
<div class="card border-0 bg-white shadow-sm mb-3">
  <div class="card-body">
    <div class="row g-2 align-items-end">
      <div class="col-md-4">
        <label class="form-label small fw-semibold">Report type</label>
        <select class="form-select" id="reportTypeSelect">
          ${ASSESSMENT_REPORT_TYPES.map(r => `<option value="${r.id}" ${(state.reportTypeId || "byStageType") === r.id ? "selected" : ""}>${escapeHtml(r.label)}</option>`).join("")}
        </select>
      </div>
      <div class="col-md-4">
        <label class="form-label small fw-semibold">Version</label>
        <select class="form-select" id="reportVersionSelect">
          ${(p.versions||[]).map(v => `<option value="${v.id}" ${(state.reportVersionId || (p.versions?.[0]?.id)) === v.id ? "selected" : ""}>${escapeHtml(v.label || v.code || "Version")}</option>`).join("")}
        </select>
      </div>
      <div class="col-md-4 d-flex gap-2">
        <button class="btn btn-outline-primary w-50" id="runReportInlineBtn" type="button">Show below</button>
        <button class="btn btn-outline-secondary w-50" id="runReportNewTabBtn" type="button">Open in new tab</button>
      </div>
    </div>
    <div class="mt-3" id="reportOutput" style="display:none;"></div>
  </div>
</div>

${modulePicker}
    ${cards || `<div class="alert alert-warning">No modules available to edit.</div>`}
  `;

  wireDevModeToggle();
  wireAssessments();
  return;
}


if (step === "reading-lists") {
  const editableIds = editableModuleIds();
  const selectedId = getSelectedModuleId();
  const modulesForEdit = (p.modules || []).filter(m => editableIds.includes(m.id));
  const isModuleEditor = p.mode === "MODULE_EDITOR";
  const currentYear = new Date().getFullYear();

  const canPickModule = (isModuleEditor && editableIds.length > 1);
  const modulePicker = canPickModule ? `
    <div class="row g-3 mb-3">
      <div class="col-md-6">
        <label class="form-label fw-semibold">Assigned module</label>
        <select class="form-select" id="modulePicker">
          ${modulesForEdit.map(m => `<option value="${m.id}" ${m.id===selectedId?"selected":""}>${escapeHtml(m.code || "")} — ${escapeHtml(m.title || "")}</option>`).join("")}
        </select>
      </div>
    </div>
  ` : "";

  const blocks = modulesForEdit.map(m => {
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

    return `
      <div class="card border-0 bg-white shadow-sm mb-3" ${isHidden ? 'style="display:none"' : ''} data-module-card="${m.id}">
        <div class="card-body">
          <div class="d-flex justify-content-between align-items-center mb-2">
            <div class="fw-semibold">${escapeHtml((m.code ? m.code + ' — ' : '') + m.title)}</div>
            <div class="d-flex gap-2 align-items-center">
              ${warningBadge}
              <span class="badge text-bg-secondary">${m.readingList.length} item${m.readingList.length !== 1 ? 's' : ''}</span>
            </div>
          </div>
          <div class="small text-secondary mb-3">Add core and recommended reading for this module. Resources older than 5 years will be flagged.</div>
          ${items || '<div class="small text-secondary mb-2">No reading list items yet.</div>'}
          <button class="btn btn-outline-secondary btn-sm" data-add-reading="${m.id}">+ Add reading</button>
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
        ${modulesForEdit.length ? blocks : '<div class="small text-secondary">No modules available.</div>'}
      </div>
    </div>
  `;
  wireDevModeToggle();
  wireReadingLists();
  return;
}


if (step === "schedule") {
  const versions = Array.isArray(p.versions) ? p.versions : [];
  if (!versions.length) {
    content.innerHTML = devModeToggleHtml + `<div class="alert alert-warning">Add at least one Programme Version first.</div>`;
    wireDevModeToggle();
    return;
  }
  if (!state.selectedVersionId) state.selectedVersionId = versions[0].id;
  const v = versions.find(x => x.id === state.selectedVersionId) || versions[0];

  const vSelect = versions.map(x => `<option value="${escapeHtml(x.id)}" ${x.id===v.id?"selected":""}>${escapeHtml(x.code||"")}${x.code?" — ":""}${escapeHtml(x.label||"")}</option>`).join("");

  const modalityLabels = { F2F: "Face-to-face", BLENDED: "Blended", ONLINE: "Fully online" };
  const modalityKey = v.deliveryModality ? `${v.id}_${v.deliveryModality}` : null;

  // Build module lookup
  const moduleMap = new Map((p.modules || []).map(m => [m.id, m]));

  // Group stage-level module tables
  const stageTables = (v.stages || []).sort((a,b) => Number(a.sequence||0) - Number(b.sequence||0)).map((stg) => {
    const stageModules = (stg.modules || []).map(sm => {
      const m = moduleMap.get(sm.moduleId);
      if (!m) return null;
      
      // Get effort hours for this version/modality
      const effort = modalityKey && m.effortHours ? (m.effortHours[modalityKey] || {}) : {};
      const classroomHrs = Number(effort.classroomHours || 0);
      const mentoringHrs = Number(effort.mentoringHours || 0);
      const otherContactHrs = Number(effort.otherContactHours || 0);
      const contactTotal = classroomHrs + mentoringHrs + otherContactHrs;
      const directedElearn = Number(effort.directedElearningHours || 0);
      const independent = Number(effort.independentLearningHours || 0);
      const workBased = Number(effort.workBasedHours || 0);
      const otherHrs = Number(effort.otherHours || 0);
      const totalHours = contactTotal + directedElearn + independent + workBased + otherHrs;

      // Get assessment breakdown
      const assessments = m.assessments || [];
      const totalWeight = assessments.reduce((sum, a) => sum + Number(a.weighting || 0), 0);
      
      // Categorize assessments for QQI breakdown
      let caPercent = 0, projectPercent = 0, practicalPercent = 0, examPercent = 0;
      assessments.forEach(a => {
        const w = Number(a.weighting || 0);
        const t = (a.type || "").toLowerCase();
        if (t.includes("exam")) {
          examPercent += w;
        } else if (t.includes("project")) {
          projectPercent += w;
        } else if (t.includes("practical") || t.includes("lab") || t.includes("demo")) {
          practicalPercent += w;
        } else {
          caPercent += w;
        }
      });

      return {
        module: m,
        semester: sm.semester || "",
        status: "M", // M = Mandatory (default)
        credits: Number(m.credits || 0),
        totalHours,
        contactHours: contactTotal,
        directedElearn,
        independent,
        workBased,
        caPercent,
        projectPercent,
        practicalPercent,
        examPercent
      };
    }).filter(Boolean);

    const stageCredits = stageModules.reduce((sum, sm) => sum + sm.credits, 0);
    const stageTotalHours = stageModules.reduce((sum, sm) => sum + sm.totalHours, 0);

    const rows = stageModules.map(sm => `
      <tr>
        <td class="small" style="max-width:200px;">${escapeHtml(sm.module.title)}</td>
        <td class="text-center small">${escapeHtml(sm.semester || "—")}</td>
        <td class="text-center small">${escapeHtml(sm.status)}</td>
        <td class="text-center small">${p.nfqLevel || "—"}</td>
        <td class="text-center small fw-semibold">${sm.credits}</td>
        <td class="text-center small">${sm.totalHours || "—"}</td>
        <td class="text-center small">${sm.contactHours || "—"}</td>
        <td class="text-center small">${sm.directedElearn || "—"}</td>
        <td class="text-center small">${sm.independent || "—"}</td>
        <td class="text-center small">${sm.workBased || "—"}</td>
        <td class="text-center small">${sm.caPercent || "—"}</td>
        <td class="text-center small">${sm.projectPercent || "—"}</td>
        <td class="text-center small">${sm.practicalPercent || "—"}</td>
        <td class="text-center small">${sm.examPercent || "—"}</td>
      </tr>
    `).join("");

    // Stage totals row
    const totalsRow = stageModules.length ? `
      <tr class="fw-semibold" style="background: var(--bs-tertiary-bg);">
        <td class="small">Stage Total</td>
        <td></td><td></td><td></td>
        <td class="text-center small">${stageCredits}</td>
        <td class="text-center small">${stageTotalHours}</td>
        <td class="text-center small">${stageModules.reduce((s,m) => s + m.contactHours, 0)}</td>
        <td class="text-center small">${stageModules.reduce((s,m) => s + m.directedElearn, 0)}</td>
        <td class="text-center small">${stageModules.reduce((s,m) => s + m.independent, 0)}</td>
        <td class="text-center small">${stageModules.reduce((s,m) => s + m.workBased, 0)}</td>
        <td colspan="4"></td>
      </tr>
    ` : "";

    return `
      <div class="card mb-3">
        <div class="card-header">
          <div class="d-flex justify-content-between align-items-center">
            <div class="fw-semibold">${escapeHtml(stg.name || `Stage ${stg.sequence}`)}</div>
            <div class="small text-secondary">
              Target: ${stg.creditsTarget || 0} ECTS | NFQ Level: ${p.nfqLevel || "—"}
            </div>
          </div>
        </div>
        <div class="card-body p-0">
          <div class="table-responsive">
            <table class="table table-sm table-bordered align-middle mb-0">
              <thead>
                <tr>
                  <th rowspan="2" class="align-middle" style="min-width:180px">Module Title</th>
                  <th rowspan="2" class="text-center align-middle" style="width:60px">Sem</th>
                  <th rowspan="2" class="text-center align-middle" style="width:50px">Status</th>
                  <th rowspan="2" class="text-center align-middle" style="width:50px">NFQ</th>
                  <th rowspan="2" class="text-center align-middle" style="width:50px">ECTS</th>
                  <th colspan="5" class="text-center">Total Student Effort (hours)</th>
                  <th colspan="4" class="text-center">Assessment Strategy (%)</th>
                </tr>
                <tr>
                  <th class="text-center small" style="width:50px">Total</th>
                  <th class="text-center small" style="width:55px">Contact</th>
                  <th class="text-center small" style="width:55px">Dir. E-Learn</th>
                  <th class="text-center small" style="width:60px">Indep. Learn</th>
                  <th class="text-center small" style="width:55px">Work-based</th>
                  <th class="text-center small" style="width:40px">CA</th>
                  <th class="text-center small" style="width:45px">Project</th>
                  <th class="text-center small" style="width:50px">Practical</th>
                  <th class="text-center small" style="width:45px">Exam</th>
                </tr>
              </thead>
              <tbody>
                ${rows || `<tr><td colspan="14" class="text-muted text-center">No modules assigned to this stage.</td></tr>`}
                ${totalsRow}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    `;
  }).join("");

  // Programme header info
  const headerInfo = `
    <div class="card mb-3">
      <div class="card-body">
        <div class="row g-3">
          <div class="col-md-6">
            <table class="table table-sm table-borderless mb-0">
              <tr><th class="small text-secondary" style="width:140px">Provider:</th><td class="small fw-semibold">National College of Ireland</td></tr>
              <tr><th class="small text-secondary">Programme Title:</th><td class="small">${escapeHtml(p.title || "—")}</td></tr>
              <tr><th class="small text-secondary">Award Title:</th><td class="small">${escapeHtml(p.awardType || "—")}</td></tr>
              <tr><th class="small text-secondary">Version:</th><td class="small">${escapeHtml(v.label || v.code || "—")}</td></tr>
            </table>
          </div>
          <div class="col-md-6">
            <table class="table table-sm table-borderless mb-0">
              <tr><th class="small text-secondary" style="width:140px">NFQ Level:</th><td class="small">${p.nfqLevel || "—"}</td></tr>
              <tr><th class="small text-secondary">Total Credits:</th><td class="small">${p.totalCredits || "—"} ECTS</td></tr>
              <tr><th class="small text-secondary">Delivery Mode:</th><td class="small">${modalityLabels[v.deliveryModality] || v.deliveryModality || "—"}</td></tr>
              <tr><th class="small text-secondary">Duration:</th><td class="small">${escapeHtml(v.duration || "—")}</td></tr>
            </table>
          </div>
        </div>
      </div>
    </div>
  `;

  content.innerHTML = devModeToggleHtml + `
    <div class="card shadow-sm">
      <div class="card-body">
        <div class="d-flex align-items-center justify-content-between flex-wrap gap-2 mb-3">
          <div>
            <h5 class="card-title mb-1">Programme Schedule</h5>
            <div class="small text-secondary">QQI-style module schedule showing effort hours and assessment strategy per stage.</div>
          </div>
          <div class="d-flex gap-2 align-items-center">
            <select class="form-select" id="scheduleVersionSelect" style="min-width: 260px;">
              ${vSelect}
            </select>
            <button class="btn btn-outline-secondary btn-sm" id="printScheduleBtn" title="Print schedule">
              <i class="bi bi-printer"></i> Print
            </button>
          </div>
        </div>
        
        ${headerInfo}
        
        ${(v.stages || []).length ? stageTables : `<div class="alert alert-info">No stages defined for this version. Go to Stage Structure to add stages and assign modules.</div>`}
        
        <div class="small text-secondary mt-3">
          <strong>Legend:</strong> Status: M = Mandatory, E = Elective | CA = Continuous Assessment | Contact = Classroom + Mentoring + Other Contact Hours
        </div>
      </div>
    </div>
  `;
  wireDevModeToggle();
  wireSchedule();
  return;
}


  if (step === "mapping") {
    if (!p.plos.length || !p.modules.length) {
      content.innerHTML = devModeToggleHtml + `<div class="card shadow-sm"><div class="card-body"><h5 class="card-title">Mapping</h5><div class="small text-secondary">Add PLOs and modules first.</div></div></div>`;
      wireDevModeToggle();
      return;
    }

    const editableIds = editableModuleIds();
    const isModuleEditor = p.mode === "MODULE_EDITOR";
    const modulesToShow = isModuleEditor 
      ? p.modules.filter(m => editableIds.includes(m.id))
      : p.modules;

    const blocks = p.plos.map((o, idx) => {
      const selected = p.ploToModules[o.id] || [];
      
      // For module editors: show all mappings but only allow editing their modules
      const checks = p.modules.map(m => {
        const isEditable = editableIds.includes(m.id);
        const isChecked = selected.includes(m.id);
        
        // In module editor mode, hide modules they can't edit (unless already mapped)
        if (isModuleEditor && !isEditable && !isChecked) {
          return '';
        }
        
        const disabled = isModuleEditor && !isEditable;
        const disabledAttr = disabled ? 'disabled' : '';
        const disabledClass = disabled ? 'opacity-50' : '';
        const disabledNote = disabled ? ' <span class="text-secondary fst-italic">(read-only)</span>' : '';
        
        return `
          <label class="list-group-item d-flex gap-2 align-items-center ${disabledClass}">
            <input class="form-check-input m-0" type="checkbox" data-map-plo="${o.id}" data-map-module="${m.id}" ${isChecked?"checked":""} ${disabledAttr}>
            <span class="small">${escapeHtml((m.code?m.code+" — ":"") + m.title)} <span class="text-secondary">(${Number(m.credits||0)} cr)</span>${disabledNote}</span>
          </label>
        `;
      }).filter(Boolean).join("");

      return `
        <div class="card border-0 bg-white shadow-sm mb-3">
          <div class="card-body">
            <div class="fw-semibold mb-1">PLO ${idx+1}</div>
            <div class="small mb-3">${escapeHtml(o.text || "—")}</div>
            <div class="list-group">${checks || '<div class="small text-secondary">No modules available to map.</div>'}</div>
          </div>
        </div>
      `;
    }).join("");

    const modeNote = isModuleEditor 
      ? `<div class="alert alert-info mb-3"><strong>Module Editor Mode:</strong> You can only map PLOs to your assigned modules. Other mappings are shown as read-only.</div>`
      : '';

    content.innerHTML = devModeToggleHtml + `
      <div class="card shadow-sm">
        <div class="card-body">
          <h5 class="card-title mb-3">Map PLOs to modules (QQI-critical)</h5>
          ${modeNote}
          ${blocks}
        </div>
      </div>
    `;
    wireDevModeToggle();
    wireMapping();
    return;
  }

  // traceability
  if (step === "traceability") {
    // Render loading state first, then load standards asynchronously
    content.innerHTML = devModeToggleHtml + `
      <div class="card shadow-sm">
        <div class="card-body">
          <h5 class="card-title mb-3">Traceability Matrix</h5>
          <div class="text-center py-4">
            <div class="spinner-border text-secondary" role="status"></div>
            <div class="small text-secondary mt-2">Loading award standards...</div>
          </div>
        </div>
      </div>
    `;
    wireDevModeToggle();

    // Load all selected award standards and render the full table
    const standardsIds = p.awardStandardIds || [];
    Promise.all(standardsIds.map(stdId => getAwardStandardById(stdId)))
      .then(standardsDataArray => {
        renderTraceabilityTable(p, standardsDataArray, devModeToggleHtml);
      })
      .catch(err => {
        console.error('Failed to load standards:', err);
        // Render without standards coverage check
        renderTraceabilityTable(p, null, devModeToggleHtml);
      });
    return;
  }

  // snapshot
  const versions = Array.isArray(p.versions) ? p.versions : [];

  const moduleLabels = (p.modules||[]).map((m, i) => {
    const label = (m.code && m.code.trim()) ? m.code.trim() : `M${i+1}`;
    const full = (m.code && m.code.trim()) ? `${m.code.trim()} — ${m.title}` : m.title;
    return { id: m.id, label, full, credits: Number(m.credits||0) };
  });

  // PLO ↔ Module Matrix
  const matrixHeader = moduleLabels.map(m => `<th class="text-center" title="${escapeHtml(m.full)}">${escapeHtml(m.label)}</th>`).join("");
  const matrixRows = (p.plos||[]).map((o, i) => {
    const selected = p.ploToModules[o.id] || [];
    const cells = moduleLabels.map(m => {
      const on = selected.includes(m.id);
      return `<td class="text-center">${on ? "✓" : ""}</td>`;
    }).join("");
    return `<tr><th class="small" style="min-width:260px" title="${escapeHtml(o.text||"")}">PLO ${i+1}</th>${cells}</tr>`;
  }).join("");

  const matrixTable = `
    <div class="mt-4">
      <div class="fw-semibold mb-2">PLO ↔ Module Mapping Matrix</div>
      <div class="table-responsive">
        <table class="table table-sm table-bordered align-middle mb-0">
          <thead><tr><th style="min-width:260px">PLO</th>${matrixHeader}</tr></thead>
          <tbody>${matrixRows || `<tr><td colspan="${moduleLabels.length+1}" class="text-secondary">Add PLOs and map them to modules to generate a matrix.</td></tr>`}</tbody>
        </table>
      </div>
    </div>
  `;

  const versionCards = versions.map((v, idx) => {
    const mod = v.deliveryModality;
    const patterns = v.deliveryPatterns || {};
    const modLines = mod ? (() => {
      const pat = patterns[mod] || defaultPatternFor(mod);
      return `<div class="small"><span class="fw-semibold">${escapeHtml(mod)}</span>: ${Number(pat.syncOnlinePct||0)}% sync online, ${Number(pat.asyncDirectedPct||0)}% async directed, ${Number(pat.onCampusPct||0)}% on-campus</div>`;
    })() : "";

    const stages = (v.stages || []).slice().sort((a,b)=>Number(a.sequence||0)-Number(b.sequence||0));
    const stageLines = stages.map(s => {
      const stageMods = (s.modules||[]).map(x=>x.moduleId);
      const modNames = (p.modules||[]).filter(m=>stageMods.includes(m.id)).map(m => (m.code && m.code.trim()) ? m.code.trim() : m.title).join(", ");
      const creditsSum = sumStageCredits(p.modules||[], s.modules||[]);
      const exitTxt = (s.exitAward && s.exitAward.enabled) ? ` • Exit award: ${escapeHtml(s.exitAward.awardTitle||"")}` : "";
      return `<li class="small"><span class="fw-semibold">${escapeHtml(s.name||"Stage")}</span> — target ${Number(s.creditsTarget||0)}cr (assigned ${creditsSum}cr)${exitTxt}<br><span class="text-secondary">${escapeHtml(modNames||"No modules assigned")}</span></li>`;
    }).join("");

    return `
      <div class="col-12">
        <div class="p-3 bg-light border rounded-4">
          <div class="d-flex justify-content-between align-items-start flex-wrap gap-2">
            <div>
              <div class="fw-semibold">Version ${idx+1}: ${escapeHtml(v.label||"")}${v.code?` <span class="text-secondary">(${escapeHtml(v.code)})</span>`:""}</div>
              <div class="small">
                <span class="fw-semibold">Duration:</span> ${escapeHtml(v.duration||"—")} •
                <span class="fw-semibold">Intakes:</span> ${escapeHtml((v.intakes||[]).join(", ") || "—")} •
                <span class="fw-semibold">Cohort:</span> ${Number(v.targetCohortSize||0) || "—"} •
                <span class="fw-semibold">Groups:</span> ${Number(v.numberOfGroups||0) || "—"}
              </div>
            </div>
            <div class="small">
              <span class="fw-semibold">Online proctored exams:</span> ${escapeHtml(v.onlineProctoredExams||"TBC")}
            </div>
          </div>

          <div class="mt-2">
            <div class="fw-semibold small mb-1">Delivery patterns</div>
            ${modLines || `<div class="small text-secondary">—</div>`}
          </div>

          <div class="mt-3">
            <div class="fw-semibold small mb-1">Stage structure</div>
            ${stageLines ? `<ul class="mb-0 ps-3">${stageLines}</ul>` : `<div class="small text-secondary">—</div>`}
          </div>

          ${(v.onlineProctoredExams||"TBC")==="YES" && (v.onlineProctoredExamsNotes||"").trim()
            ? `<div class="mt-2 small"><span class="fw-semibold">Proctoring notes:</span> ${escapeHtml(v.onlineProctoredExamsNotes)}</div>`
            : ""}

          ${(v.deliveryNotes||"").trim()
            ? `<div class="mt-2 small"><span class="fw-semibold">Delivery notes:</span> ${escapeHtml(v.deliveryNotes)}</div>`
            : ""}
        </div>
      </div>
    `;
  }).join("");

  const isComplete100 = completionPercent(p) === 100;

  content.innerHTML = devModeToggleHtml + `
    <div class="card shadow-sm">
      <div class="card-body">
        <h5 class="card-title mb-3">QQI Snapshot (copy/paste-ready)</h5>

        ${isComplete100 ? `<div class="d-flex gap-2 mb-3"><button id="exportWordBtn" class="btn btn-success btn-sm">Export Programme Descriptor (Word)</button><span class="small text-secondary align-self-center">Generates a .docx using the template in assets.</span></div>` : `<div class="small text-secondary mb-3">Complete all sections to enable Word export (100%).</div>`}

        <div class="row g-3">
          <div class="col-md-6">
            <div class="p-3 bg-light border rounded-4">
              <div class="fw-semibold mb-2">Programme summary</div>
              <div class="small"><span class="fw-semibold">Title:</span> ${escapeHtml(p.title||"—")}</div>
              <div class="small"><span class="fw-semibold">Award:</span> ${escapeHtml(p.awardType||"—")}</div>
              <div class="small"><span class="fw-semibold">NFQ level:</span> ${escapeHtml(p.nfqLevel ?? "—")}</div>
              <div class="small"><span class="fw-semibold">School:</span> ${escapeHtml(p.school||"—")}</div>
              <div class="small"><span class="fw-semibold">Total credits:</span> ${escapeHtml(p.totalCredits || "—")}</div>
            </div>
          </div>

          <div class="col-md-6">
            <div class="p-3 bg-light border rounded-4">
              <div class="fw-semibold mb-2">Modules</div>
              ${(p.modules||[]).length ? `
                <ul class="small mb-0 ps-3">
                  ${(p.modules||[]).map(m => `<li>${escapeHtml(m.code ? `${m.code} — ` : "")}${escapeHtml(m.title)} (${Number(m.credits||0)} cr)</li>`).join("")}
                </ul>
              ` : `<div class="small text-secondary">—</div>`}
            </div>
          </div>
        </div>

        <div class="mt-3 p-3 bg-light border rounded-4">
          <div class="fw-semibold mb-2">Programme Learning Outcomes (PLOs)</div>
          ${(p.plos||[]).length ? `
            <ol class="small mb-0 ps-3">
              ${(p.plos||[]).map(o => `<li>${escapeHtml(o.text || "—")}</li>`).join("")}
            </ol>
          ` : `<div class="small text-secondary">—</div>`}
        </div>

        <div class="mt-3">
          <div class="fw-semibold mb-2">Programme versions</div>
          <div class="row g-3">
            ${versionCards || `<div class="col-12"><div class="alert alert-warning mb-0">No versions added yet.</div></div>`}
          </div>
        </div>

        ${matrixTable}

        <div class="mt-4 d-flex flex-wrap gap-2">
          <button class="btn btn-outline-secondary" id="copyJsonBtn">Copy JSON to clipboard</button>
          <button class="btn btn-dark" id="downloadJsonBtn">Download JSON</button>
        </div>
      </div>
    </div>
  `;
    wireDevModeToggle();

  document.getElementById("copyJsonBtn").onclick = async () => {
    await navigator.clipboard.writeText(JSON.stringify(state.programme, null, 2));
  };
  document.getElementById("downloadJsonBtn").onclick = () => downloadJson("programme-design.json", state.programme);
  // Word export (enabled only when button is rendered, i.e., completion is 100%)
  const exportBtn = document.getElementById("exportWordBtn");
  if (exportBtn) {
    exportBtn.onclick = async () => {
      try {
        await exportProgrammeDescriptorWord(state.programme);
      } catch (err) {
        console.error(err);
        alert(err?.message || String(err));
      }
    };
  }


  // Dev-only UI toggle wiring
  wireDevModeToggle();
}

function getVersionById(id){
  return (state.programme.versions || []).find(v => v.id === id);
}

function wireVersions() {
  const p = state.programme;
  p.mode = p.mode || 'PROGRAMME_OWNER';
  if (!Array.isArray(p.versions)) p.versions = [];

  const addBtn = document.getElementById("addVersionBtn");
  if (addBtn) {
    addBtn.onclick = () => {
      const v = defaultVersion();
      // Helpful defaults: if no versions yet, preselect a sensible modality based on common cases
      p.versions.push(v);
      state.selectedVersionId = v.id;
      saveDebounced();
      render();
    };
  }

  (p.versions || []).forEach((v) => {
    const byId = (suffix) => document.getElementById(`${suffix}_${v.id}`);

    const setActive = document.getElementById(`setActive_${v.id}`);
    if (setActive) setActive.onclick = () => { state.selectedVersionId = v.id; saveDebounced(); render(); };

    const removeBtn = document.getElementById(`removeVer_${v.id}`);
    if (removeBtn) removeBtn.onclick = () => {
      p.versions = (p.versions || []).filter(x => x.id !== v.id);
      if (state.selectedVersionId === v.id) state.selectedVersionId = (p.versions[0] && p.versions[0].id) || null;
      saveDebounced();
      render();
    };

    const label = byId("vlabel");
    if (label) label.oninput = (e) => { v.label = e.target.value; saveDebounced(); renderHeader(); renderFlags(); };

    const code = byId("vcode");
    if (code) code.oninput = (e) => { v.code = e.target.value; saveDebounced(); renderHeader(); renderFlags(); };

    const duration = byId("vduration");
    if (duration) duration.oninput = (e) => { v.duration = e.target.value; saveDebounced(); renderHeader(); renderFlags(); };

    const intakes = byId("vintakes");
    if (intakes) intakes.oninput = (e) => {
      v.intakes = e.target.value.split(",").map(x => x.trim()).filter(Boolean);
      saveDebounced(); renderHeader(); renderFlags();
    };

    const cohort = byId("vcohort");
    if (cohort) cohort.oninput = (e) => { v.targetCohortSize = Number(e.target.value || 0); saveDebounced(); renderHeader(); renderFlags(); };

    const groups = byId("vgroups");
    if (groups) groups.oninput = (e) => { v.numberOfGroups = Number(e.target.value || 0); saveDebounced(); renderHeader(); renderFlags(); };

    const notes = byId("vnotes");
    if (notes) notes.oninput = (e) => { v.deliveryNotes = e.target.value; saveDebounced(); renderHeader(); renderFlags(); };

    const proctor = byId("vproctor");
    if (proctor) proctor.onchange = (e) => {
      v.onlineProctoredExams = e.target.value;
      saveDebounced();
      render(); // show/hide notes block
    };

    const proctorNotes = byId("vproctorNotes");
    if (proctorNotes) proctorNotes.oninput = (e) => { v.onlineProctoredExamsNotes = e.target.value; saveDebounced(); renderHeader(); renderFlags(); };

    // Modality radio buttons & patterns
    const MOD_KEYS = ["F2F","BLENDED","ONLINE"];
    if (!v.deliveryPatterns || typeof v.deliveryPatterns !== "object") v.deliveryPatterns = {};

    MOD_KEYS.forEach((mod) => {
      const radio = document.getElementById(`vmod_${v.id}_${mod}`);
      if (!radio) return;
      radio.onchange = (e) => {
        if (e.target.checked) {
          v.deliveryModality = mod;
          if (!v.deliveryPatterns[mod]) v.deliveryPatterns[mod] = defaultPatternFor(mod);
          saveDebounced();
          render(); // re-render pattern card
        }
      };
    });

    const selectedMod = v.deliveryModality;
    if (selectedMod) {
      if (!v.deliveryPatterns[selectedMod]) v.deliveryPatterns[selectedMod] = defaultPatternFor(selectedMod);

      const sync = document.getElementById(`pat_${v.id}_${selectedMod}_sync`);
      const async = document.getElementById(`pat_${v.id}_${selectedMod}_async`);
      const campus = document.getElementById(`pat_${v.id}_${selectedMod}_campus`);

      const update = () => {
        const pat = v.deliveryPatterns[selectedMod] || defaultPatternFor(selectedMod);
        pat.syncOnlinePct = Number(sync ? sync.value : pat.syncOnlinePct || 0);
        pat.asyncDirectedPct = Number(async ? async.value : pat.asyncDirectedPct || 0);
        pat.onCampusPct = Number(campus ? campus.value : pat.onCampusPct || 0);
        v.deliveryPatterns[selectedMod] = pat;
        saveDebounced();
        renderFlags();
      };

      if (sync) sync.oninput = update;
      if (async) async.oninput = update;
      if (campus) campus.oninput = update;
    }
  });
}

function wireStages() {
  const p = state.programme;
  p.mode = p.mode || 'PROGRAMME_OWNER';
  if (!Array.isArray(p.versions)) p.versions = [];
  const versions = p.versions;

  const select = document.getElementById("stageVersionSelect");
  if (select) {
    select.onchange = (e) => {
      state.selectedVersionId = e.target.value;
      saveDebounced();
      render();
    };
  }

  const v = getVersionById(state.selectedVersionId) || versions[0];
  if (!v) return;
  if (!Array.isArray(v.stages)) v.stages = [];

  const addStageBtn = document.getElementById("addStageBtn");
  if (addStageBtn) {
    addStageBtn.onclick = () => {
      const nextSeq = (v.stages || []).length + 1;
      const s = defaultStage(nextSeq);
      // Helpful default: if programme credits set and this is first stage, suggest a common split
      if ((p.totalCredits || 0) > 0 && (v.stages || []).length === 0) {
        // Default to 60-credit stages where it fits; otherwise 0 and let teams decide
        s.creditsTarget = (p.totalCredits % 60 === 0) ? 60 : 0;
      }
      v.stages.push(s);
      saveDebounced();
      render();
    };
  }

  (v.stages || []).forEach((s) => {
    const name = document.getElementById(`stname_${s.id}`);
    if (name) name.oninput = (e) => { s.name = e.target.value; saveDebounced(); renderHeader(); renderFlags(); };

    const seq = document.getElementById(`stseq_${s.id}`);
    if (seq) seq.oninput = (e) => { s.sequence = Number(e.target.value || 1); saveDebounced(); renderFlags(); };

    const cred = document.getElementById(`stcred_${s.id}`);
    if (cred) cred.oninput = (e) => { s.creditsTarget = Number(e.target.value || 0); saveDebounced(); renderFlags(); };

    const remove = document.getElementById(`removeStage_${s.id}`);
    if (remove) remove.onclick = () => {
      v.stages = (v.stages || []).filter(x => x.id !== s.id);
      saveDebounced();
      render();
    };

    const exit = document.getElementById(`stexit_${s.id}`);
    if (exit) exit.onchange = (e) => {
      if (!s.exitAward) s.exitAward = { enabled: false, awardTitle: "" };
      s.exitAward.enabled = !!e.target.checked;
      saveDebounced();
      render(); // show/hide title
    };

    const exitTitle = document.getElementById(`stexitTitle_${s.id}`);
    if (exitTitle) exitTitle.oninput = (e) => {
      if (!s.exitAward) s.exitAward = { enabled: false, awardTitle: "" };
      s.exitAward.awardTitle = e.target.value;
      saveDebounced();
      renderFlags();
    };

    if (!Array.isArray(s.modules)) s.modules = [];

    // Module picking
    (p.modules || []).forEach((m) => {
      const cb = document.getElementById(`st_${s.id}_mod_${m.id}`);
      if (!cb) return;
      cb.onchange = (e) => {
        const checked = e.target.checked;
        if (checked && !s.modules.find(x => x.moduleId === m.id)) {
          s.modules.push({ moduleId: m.id, semester: "" });
        }
        if (!checked) {
          s.modules = s.modules.filter(x => x.moduleId !== m.id);
        }
        saveDebounced();
        render(); // show/hide semester input + update credit sums
      };

      const sem = document.getElementById(`st_${s.id}_sem_${m.id}`);
      if (sem) sem.oninput = (e) => {
        const entry = s.modules.find(x => x.moduleId === m.id);
        if (entry) entry.semester = e.target.value;
        saveDebounced();
      };
    });
  });
}

function wireIdentity(){
  const p = state.programme;
  p.mode = p.mode || 'PROGRAMME_OWNER';
  document.getElementById("titleInput").addEventListener("input", (e)=>{ p.title = e.target.value; saveDebounced(); renderHeader(); });
  const awardSelect = document.getElementById("awardSelect");
  const awardOtherWrap = document.getElementById("awardOtherWrap");
  const awardOtherInput = document.getElementById("awardOtherInput");
  if (awardSelect) {
    awardSelect.addEventListener("change", (e) => {
      const v = e.target.value;
      if (v === "Other") {
        p.awardTypeIsOther = true;
        p.awardType = p.awardTypeIsOther ? (p.awardType || "") : "";
        awardOtherWrap.style.display = "block";
        awardOtherInput?.focus();
      } else {
        p.awardTypeIsOther = false;
        p.awardType = v || "";
        awardOtherWrap.style.display = "none";
      }
      saveDebounced();
      renderFlags();
    });
  }
  if (awardOtherInput) {
    awardOtherInput.addEventListener("input", (e) => {
      if (!p.awardTypeIsOther) return;
      p.awardType = e.target.value;
      saveDebounced();
      renderFlags();
    });
  }
  const levelInput = document.getElementById("levelInput");
  const mismatchHost = document.getElementById("standardMismatchAlert");

  async function refreshStandardLevelMismatch(){
    if (!mismatchHost) return;
    mismatchHost.innerHTML = "";
    if (!p.awardStandardIds || !p.awardStandardIds.length) return;

    // Check all selected standards for level mismatches
    const mismatches = [];
    for (const stdId of p.awardStandardIds) {
      let std = null;
      try {
        std = await getAwardStandardById(stdId);
      } catch (e) {
        continue;
      }
      const supportedLevels = Array.isArray(std?.levels) ? std.levels.map(Number).filter(n => Number.isFinite(n)) : [];
      const nfqNum = Number(p.nfqLevel);

      if (supportedLevels.length && Number.isFinite(nfqNum) && !supportedLevels.includes(nfqNum)) {
        mismatches.push({ std, supportedLevels, target: supportedLevels[0] });
      }
    }

    if (mismatches.length === 0) {
      mismatchHost.innerHTML = "";
      return;
    }

    const firstMismatch = mismatches[0];
    mismatchHost.innerHTML = `
      <div class="alert alert-warning mb-0 d-flex justify-content-between align-items-start" style="gap:12px;">
        <div>
          <div class="fw-semibold">Level mismatch</div>
          <div>“${escapeHtml(std.title || std.standard_name || std.standardName || std.standard_id || "Selected award standard") }” supports level(s) <span class="fw-semibold">${escapeHtml(supportedLevels.join(", "))}</span>. You currently have level <span class="fw-semibold">${escapeHtml(String(p.nfqLevel ?? ""))}</span>.</div>
          <div class="text-secondary">Change the NFQ level or choose a different award standard.</div>
        </div>
        ${firstMismatch.target ? `<button type="button" class="btn btn-sm btn-warning" id="btnFixIdentityLevel">Set to ${firstMismatch.target}</button>` : ``}
      </div>
    `;
    const btn = document.getElementById("btnFixIdentityLevel");
    if (btn) {
      btn.onclick = () => {
        p.nfqLevel = firstMismatch.target;
        if (levelInput) levelInput.value = String(firstMismatch.target);
        saveDebounced();
        renderFlags();
        refreshStandardLevelMismatch();
      };
    }
  }

  if (levelInput) levelInput.addEventListener("input", (e)=>{ p.nfqLevel = e.target.value ? Number(e.target.value) : null; saveDebounced(); renderFlags(); refreshStandardLevelMismatch(); });
  const tc = document.getElementById("totalCreditsInput");
  if (tc) tc.addEventListener("input", (e)=>{ p.totalCredits = e.target.value ? Number(e.target.value) : ""; saveDebounced(); });
  const schoolSelect = document.getElementById("schoolSelect");
  if (schoolSelect) schoolSelect.addEventListener("change", (e)=>{ p.school = e.target.value; saveDebounced(); });
  
  // Ensure arrays exist
  if (!Array.isArray(p.awardStandardIds)) p.awardStandardIds = [];
  if (!Array.isArray(p.awardStandardNames)) p.awardStandardNames = [];
  
  // Render standard selectors (up to 2)
  const container = document.getElementById("standardSelectorsContainer");
  if (container) {
    function renderStandardSelectors() {
      const numSelectors = Math.min(p.awardStandardIds.length + 1, 2);
      let html = '';
      
      for (let i = 0; i < numSelectors; i++) {
        const selectedId = p.awardStandardIds[i] || '';
        const canRemove = i > 0 || p.awardStandardIds.length > 1;
        
        html += `
          <div class="d-flex gap-2 mb-2">
            <select class="form-select standard-selector" data-index="${i}">
              <option value="" ${!selectedId ? "selected" : ""}>Select a standard${i > 0 ? ' (optional)' : ''}</option>
              <option value="qqi-computing-l6-9" ${selectedId === "qqi-computing-l6-9" ? "selected" : ""}>Computing (Levels 6–9)</option>
              <option value="qqi-professional-awards-l5-9" ${selectedId === "qqi-professional-awards-l5-9" ? "selected" : ""}>Professional (Levels 5–9)</option>
              <option value="qqi-generic-major-masters-l9" ${selectedId === "qqi-generic-major-masters-l9" ? "selected" : ""}>Generic Major — Masters Degree (Level 9)</option>
            </select>
            ${canRemove && selectedId ? `<button type="button" class="btn btn-outline-danger remove-standard" data-index="${i}">×</button>` : ''}
          </div>
        `;
      }
      
      container.innerHTML = html;
      
      // Wire up selectors
      container.querySelectorAll('.standard-selector').forEach(select => {
        select.addEventListener('change', async (e) => {
          const index = parseInt(e.target.getAttribute('data-index'));
          const newValue = e.target.value;
          
          if (newValue) {
            // Update or add standard
            p.awardStandardIds[index] = newValue;
            try {
              const s = await getAwardStandardById(newValue);
              p.awardStandardNames[index] = s?.standard_name || s?.standardName || "QQI Award Standard";
            } catch (err) {
              p.awardStandardNames[index] = "QQI Award Standard";
            }
          } else {
            // Remove empty slot
            p.awardStandardIds.splice(index, 1);
            p.awardStandardNames.splice(index, 1);
          }
          
          // Clean up arrays - remove empty entries
          p.awardStandardIds = p.awardStandardIds.filter(id => id);
          p.awardStandardNames = p.awardStandardNames.filter(name => name);
          
          saveDebounced();
          renderFlags();
          refreshStandardLevelMismatch();
          renderStandardSelectors();
        });
      });
      
      // Wire up remove buttons
      container.querySelectorAll('.remove-standard').forEach(btn => {
        btn.addEventListener('click', (e) => {
          const index = parseInt(e.target.getAttribute('data-index'));
          p.awardStandardIds.splice(index, 1);
          p.awardStandardNames.splice(index, 1);
          saveDebounced();
          renderFlags();
          refreshStandardLevelMismatch();
          renderStandardSelectors();
        });
      });
    }
    
    renderStandardSelectors();
  }
  document.getElementById("intakeInput").addEventListener("input", (e)=>{ p.intakeMonths = e.target.value.split(",").map(s=>s.trim()).filter(Boolean); saveDebounced(); });

  // Initial check (in case the user loads an existing programme)
  refreshStandardLevelMismatch();
}

function wireDelivery(){
  const p = state.programme;
  p.mode = p.mode || 'PROGRAMME_OWNER';

  // modality checkboxes
  document.querySelectorAll('input[id^="mod_"][data-mod]').forEach(cb => {
    cb.addEventListener("change", (e) => {
      const mod = e.target.getAttribute("data-mod");
      p.deliveryModalities = Array.isArray(p.deliveryModalities) ? p.deliveryModalities : [];
      if (e.target.checked) {
        if (!p.deliveryModalities.includes(mod)) p.deliveryModalities.push(mod);
        p.deliveryPatterns = (p.deliveryPatterns && typeof p.deliveryPatterns === "object") ? p.deliveryPatterns : {};
        if (!p.deliveryPatterns[mod]) p.deliveryPatterns[mod] = defaultPatternFor(mod);
      } else {
        p.deliveryModalities = p.deliveryModalities.filter(x => x !== mod);
        if (p.deliveryPatterns && p.deliveryPatterns[mod]) delete p.deliveryPatterns[mod];
      }
      saveDebounced();
      renderFlags();
      renderStep(); // re-render to show/hide pattern cards
    });
  });

  // pattern inputs
  document.querySelectorAll(".pat-input").forEach(inp => {
    inp.addEventListener("input", (e) => {
      const mod = e.target.getAttribute("data-mod");
      const field = e.target.getAttribute("data-field");
      const val = clampInt(e.target.value, 0, 100);
      p.deliveryPatterns = (p.deliveryPatterns && typeof p.deliveryPatterns === "object") ? p.deliveryPatterns : {};
      p.deliveryPatterns[mod] = p.deliveryPatterns[mod] || defaultPatternFor(mod);
      p.deliveryPatterns[mod][field] = val;
      saveDebounced();
      renderFlags();
      // update badge by re-render (simple)
      renderStep();
    });
  });

  // proctored
  document.getElementById("proctoredSelect").addEventListener("change", (e)=>{
    p.onlineProctoredExams = e.target.value;
    saveDebounced();
    renderFlags();
    renderStep();
  });
  const notes = document.getElementById("proctoredNotes");
  if (notes){
    notes.addEventListener("input", (e)=>{
      p.onlineProctoredExamsNotes = e.target.value;
      saveDebounced();
    });
  }

  // delivery notes
  document.getElementById("deliveryNotes").addEventListener("input", (e)=>{
    p.deliveryNotes = e.target.value;
    saveDebounced();
  });
}
function wireCapacity(){
  const p = state.programme;
  p.mode = p.mode || 'PROGRAMME_OWNER';
  document.getElementById("cohortSize").addEventListener("input", (e)=>{ p.cohortSize = Number(e.target.value||0); saveDebounced(); renderFlags(); });
  document.getElementById("numGroups").addEventListener("input", (e)=>{ p.numberOfGroups = Number(e.target.value||0); saveDebounced(); });
  document.getElementById("duration").addEventListener("input", (e)=>{ p.duration = e.target.value; saveDebounced(); });
  document.getElementById("capacityNotes").addEventListener("input", (e)=>{ p.capacityNotes = e.target.value; saveDebounced(); });
}

function wireStructure(){
  const p = state.programme;
  p.mode = p.mode || 'PROGRAMME_OWNER';
  document.getElementById("addModuleBtn").onclick = () => {
    p.modules.push({ id: uid("mod"), code: "", title: "New module", credits: 0, mimlos: [] });
    saveDebounced();
    render();
  };

  document.querySelectorAll("[data-remove-module]").forEach(btn => {
    btn.onclick = () => {
      const id = btn.getAttribute("data-remove-module");
      p.modules = p.modules.filter(m => m.id !== id);
      // remove from mappings too
      for (const ploId of Object.keys(p.ploToModules||{})) {
        p.ploToModules[ploId] = (p.ploToModules[ploId]||[]).filter(mid => mid !== id);
      }
      saveDebounced();
      renderFlags();
      render();
    };
  });

  document.querySelectorAll("[data-module-field]").forEach(inp => {
    inp.addEventListener("input", (e) => {
      const id = inp.getAttribute("data-module-id");
      const field = inp.getAttribute("data-module-field");
      const m = p.modules.find(x => x.id === id);
      if (!m) return;
      m[field] = field === "credits" ? Number(e.target.value||0) : e.target.value;
      saveDebounced();
      renderFlags();
    });
  });
}

function wireOutcomes(){
  const p = state.programme;
  p.mode = p.mode || 'PROGRAMME_OWNER';

  // Ensure each PLO has a mapping array (for older imports)
  p.plos = (p.plos||[]).map(o => ({ ...o, standardMappings: Array.isArray(o.standardMappings) ? o.standardMappings : [] }));

  document.getElementById("addPloBtn").onclick = () => {
    p.plos.push({ id: uid("plo"), text: "", standardMappings: [] });
    saveDebounced();
    render();
  };

  document.querySelectorAll("[data-remove-plo]").forEach(btn => {
    btn.onclick = () => {
      const id = btn.getAttribute("data-remove-plo");
      p.plos = p.plos.filter(o => o.id !== id);
      delete p.ploToModules[id];
      saveDebounced();
      renderFlags();
      render();
    };
  });

  document.querySelectorAll("[data-plo-id]").forEach(area => {
    area.addEventListener("input", (e) => {
      const id = area.getAttribute("data-plo-id");
      const o = p.plos.find(x => x.id === id);
      if (!o) return;
      o.text = e.target.value;
      saveDebounced();
      
      // Update lint warnings dynamically
      if (typeof LO_Lint !== 'undefined') {
        const lintResult = LO_Lint.lintLearningOutcome(e.target.value);
        const warningsHtml = lintResult.issues.filter(i => i.severity === 'warn').map(issue => `
          <div class="alert alert-warning py-1 px-2 mb-1 small">
            <strong>⚠️ "${escapeHtml(issue.match)}"</strong> — ${escapeHtml(issue.message)}
            ${issue.suggestions.length ? `<br><em>Try: ${issue.suggestions.map(s => escapeHtml(s)).join(", ")}</em>` : ""}
          </div>
        `).join("");
        
        // Find or create the lint container after the textarea
        let lintContainer = area.parentElement.querySelector('.plo-lint-warnings');
        if (!lintContainer) {
          lintContainer = document.createElement('div');
          lintContainer.className = 'plo-lint-warnings mt-2';
          area.insertAdjacentElement('afterend', lintContainer);
        }
        lintContainer.innerHTML = warningsHtml;
      }
    });
  });

  // Standards mapping UI (only enabled once an award standard is selected)
  if (!p.awardStandardIds || !p.awardStandardIds.length) return;

  // Track which standard is currently selected for each PLO (default to first)
  const ploSelectedStandards = {};
  
  // Wire up standard selector dropdowns (if there are multiple standards)
  document.querySelectorAll("[data-plo-standard-selector]").forEach(sel => {
    const ploId = sel.getAttribute("data-plo-standard-selector");
    ploSelectedStandards[ploId] = sel.value || p.awardStandardIds[0];
    
    sel.addEventListener("change", () => {
      ploSelectedStandards[ploId] = sel.value;
      // Re-populate the criteria dropdown for this PLO based on new standard
      populatePloMappingControls(ploId);
    });
  });

  async function populatePloMappingControls(ploId) {
    const selectedStandardId = ploSelectedStandards[ploId] || p.awardStandardIds[0];
    const std = await getAwardStandardById(selectedStandardId);
    const level = String(p.nfqLevel || "");
    const criteriaList = Object.keys(std.index || {}).sort((a,b)=>a.localeCompare(b));

    const criteriaSel = document.querySelector(`[data-plo-map-criteria="${ploId}"]`);
    const threadSel = document.querySelector(`[data-plo-map-thread="${ploId}"]`);
    const descEl = document.querySelector(`[data-plo-map-desc="${ploId}"]`);
    
    if (!criteriaSel || !threadSel) return;

    function setOptions(el, opts, placeholder="Select..."){
      el.innerHTML = "";
      const ph = document.createElement("option");
      ph.value = "";
      ph.textContent = placeholder;
      el.appendChild(ph);
      opts.forEach(o=>{
        const opt = document.createElement("option");
        opt.value=o;
        opt.textContent=o;
        el.appendChild(opt);
      });
    }

    setOptions(criteriaSel, criteriaList, "Select criteria...");
    setOptions(threadSel, [], "Select thread...");

    criteriaSel.onchange = () => {
      const criteria = criteriaSel.value;
      if (!criteria) {
        setOptions(threadSel, [], "Select thread...");
        if (descEl) descEl.textContent = "";
        return;
      }
      const threads = Object.keys(std.index[criteria] || {}).sort((a,b)=>a.localeCompare(b));
      setOptions(threadSel, threads, "Select thread...");
      threadSel.onchange = () => {
        const thread = threadSel.value;
        if (!thread || !descEl) return;
        const desc = (std.index[criteria][thread][level] || "").toString();
        descEl.textContent = desc || "(No description for this level)";
      };
    };
  }

  // Initialize all PLO mapping controls
  p.plos.forEach(plo => {
    ploSelectedStandards[plo.id] = p.awardStandardIds[0]; // default to first
  });

  // Populate controls for each PLO
  Promise.all(p.plos.map(plo => populatePloMappingControls(plo.id)));

  // Load first standard for summary and mismatch checking
  getAwardStandardById(p.awardStandardIds[0]).then(std => {
    const level = String(p.nfqLevel || "");
    const criteriaList = Object.keys(std.index || {}).sort((a,b)=>a.localeCompare(b));

    // Show a clear banner in the PLOs step if the selected NFQ level does not match
    // the supported levels for the selected award standard.
    const plosMismatchHost = document.getElementById("plosStandardMismatchAlert");
    if (plosMismatchHost) {
      const supportedLevels = Array.isArray(std?.levels) ? std.levels.map(Number).filter(n => Number.isFinite(n)) : [];
      const nfqNum = Number(p.nfqLevel);
      const isMismatch = supportedLevels.length && Number.isFinite(nfqNum) && !supportedLevels.includes(nfqNum);
      if (isMismatch) {
        const target = supportedLevels[0];
        plosMismatchHost.innerHTML = `
          <div class="alert alert-warning d-flex justify-content-between align-items-start" style="gap:12px;">
            <div>
              <div class="fw-semibold">Level mismatch</div>
              <div>“${escapeHtml(std.title || std.standard_name || std.standardName || std.standard_id || "Selected award standard") }” supports level(s) <span class="fw-semibold">${escapeHtml(supportedLevels.join(", "))}</span>. You currently have level <span class="fw-semibold">${escapeHtml(String(p.nfqLevel ?? ""))}</span>.</div>
              <div class="text-secondary">Fix this in Identity, or click the button to update your NFQ level now.</div>
            </div>
            ${target ? `<button type="button" class="btn btn-sm btn-warning" id="btnFixPlosLevel">Set to ${target}</button>` : ``}
          </div>
        `;
        const btn = document.getElementById("btnFixPlosLevel");
        if (btn && target) {
          btn.onclick = () => {
            p.nfqLevel = target;
            saveDebounced();
            renderFlags();
            render();
          };
        }
      } else {
        plosMismatchHost.innerHTML = "";
      }
    }

    // Snapshot table
    const snap = document.getElementById("ploMappingSnapshot");
    if (snap) {
      const plos = p.plos || [];
      if (!plos.length) {
        snap.innerHTML = `<div class="text-secondary">Add PLOs to see a mapping snapshot.</div>`;
      } else {
        const rowsHtml = plos.map((o, i) => {
          // Group mappings by standard
          const mappingsByStandard = {};
          (o.standardMappings || []).forEach(m => {
            const stdId = m.standardId || p.awardStandardIds?.[0] || 'unknown';
            if (!mappingsByStandard[stdId]) mappingsByStandard[stdId] = [];
            mappingsByStandard[stdId].push(m);
          });
          
          const mapsHtml = Object.entries(mappingsByStandard).map(([stdId, mappings]) => {
            const stdIndex = p.awardStandardIds?.indexOf(stdId);
            const stdName = stdIndex >= 0 ? p.awardStandardNames[stdIndex] : stdId;
            const showStdHeader = p.awardStandardIds?.length > 1;
            
            const items = mappings.map(m => {
              const desc = (std.index?.[m.criteria]?.[m.thread]?.[level] || "").toString();
              const shortDesc = desc.length > 180 ? (desc.slice(0, 180) + "…") : desc;
              return `<li><span class="fw-semibold">${escapeHtml(m.criteria)} / ${escapeHtml(m.thread)}</span><div class="text-secondary">${escapeHtml(shortDesc)}</div></li>`;
            }).join("");
            
            return showStdHeader
              ? `<div class="mb-2"><div class="small fw-semibold">${escapeHtml(stdName)}</div><ul class="mb-0 ps-3">${items}</ul></div>`
              : `<ul class="mb-0 ps-3">${items}</ul>`;
          }).join("");
          
          const mapsBlock = mapsHtml || `<span class="text-secondary">No mappings yet</span>`;
          return `<tr><td class="text-nowrap">PLO ${i+1}</td><td>${escapeHtml(o.text||"")}</td><td>${mapsBlock}</td></tr>`;
        }).join("");
        snap.innerHTML = `
          <div class="table-responsive">
            <table class="table table-sm align-middle">
              <thead>
                <tr>
                  <th style="width:90px;">PLO</th>
                  <th>PLO Text</th>
                  <th>Mapped Standards (at NFQ Level ${escapeHtml(level||"")})</th>
                </tr>
              </thead>
              <tbody>${rowsHtml}</tbody>
            </table>
          </div>
        `;
      }
    }


    function setOptions(el, opts, placeholder="Select..."){
      el.innerHTML = "";
      const ph = document.createElement("option");
      ph.value = "";
      ph.textContent = placeholder;
      el.appendChild(ph);
      opts.forEach(o=>{
        const opt = document.createElement("option");
        opt.value=o;
        opt.textContent=o;
        el.appendChild(opt);
      });
    }

    document.querySelectorAll("[data-plo-map-criteria]").forEach(sel => {
      const ploId = sel.getAttribute("data-plo-map-criteria");
      const threadSel = document.querySelector(`[data-plo-map-thread="${ploId}"]`);
      const descEl = document.querySelector(`[data-plo-map-desc="${ploId}"]`);

      setOptions(sel, criteriaList, "Select criteria...");
      setOptions(threadSel, [], "Select thread...");

      function updateDesc(){
        const c = sel.value;
        const t = threadSel.value;
        // If the chosen award standard doesn't support the selected NFQ level,
        // show a clear mismatch warning (instead of a confusing "no descriptor" message).
        const nfqNum = Number(level);
        const supportedLevels = Array.isArray(std.levels) ? std.levels.map(Number).filter(n => Number.isFinite(n)) : [];
        const isMismatch = supportedLevels.length && (!Number.isFinite(nfqNum) || !supportedLevels.includes(nfqNum));

        if (isMismatch) {
          const target = supportedLevels[0];
          if (descEl) {
            descEl.innerHTML = `
              <div class="alert alert-warning mb-0 d-flex justify-content-between align-items-start" style="gap:12px;">
                <div>
                  <div class="fw-semibold">Level mismatch</div>
                  <div>“${escapeHtml(std.title || std.standard_id || "Selected award standard") }” supports level(s) <span class="fw-semibold">${escapeHtml(supportedLevels.join(", "))}</span>. You currently have level <span class="fw-semibold">${escapeHtml(level || "")}</span> selected.</div>
                  <div class="text-secondary">Change the NFQ level or choose a different award standard.</div>
                </div>
                ${target ? `<button type="button" class="btn btn-sm btn-warning" data-fix-nfq="${target}">Set to ${target}</button>` : ``}
              </div>
            `;
            const fixBtn = descEl.querySelector("[data-fix-nfq]");
            if (fixBtn) {
              fixBtn.onclick = () => {
                p.nfqLevel = Number(fixBtn.getAttribute("data-fix-nfq"));
                saveDebounced();
                renderFlags();
                render();
              };
            }
          }
          return;
        }

        const d = (((std.index||{})[c]||{})[t]||{})[level] || "";
        if (descEl) {
          descEl.textContent = d ? d : (c && t ? "No descriptor found for this level." : "");
        }
      }

      sel.addEventListener("change", () => {
        const threads = Object.keys((std.index||{})[sel.value] || {}).sort((a,b)=>a.localeCompare(b));
        setOptions(threadSel, threads, "Select thread...");
        updateDesc();
      });

      threadSel.addEventListener("change", updateDesc);
      updateDesc();
    });

    document.querySelectorAll("[data-add-plo-map]").forEach(btn => {
      btn.onclick = () => {
        const ploId = btn.getAttribute("data-add-plo-map");
        const critSel = document.querySelector(`[data-plo-map-criteria="${ploId}"]`);
        const threadSel = document.querySelector(`[data-plo-map-thread="${ploId}"]`);
        const c = critSel?.value || "";
        const t = threadSel?.value || "";
        if (!c || !t) return alert("Select both Criteria and Thread first.");

        const o = p.plos.find(x => x.id === ploId);
        if (!o) return;

        // Get the selected standard for this PLO
        const selectedStandardId = ploSelectedStandards[ploId] || p.awardStandardIds[0];

        // Avoid duplicates (check criteria, thread, and standard)
        const exists = (o.standardMappings||[]).some(x => x.criteria===c && x.thread===t && x.standardId===selectedStandardId);
        if (!exists) {
          o.standardMappings.push({ criteria: c, thread: t, standardId: selectedStandardId });
          saveDebounced();
          renderFlags();
          render();
        }
      };
    });

    document.querySelectorAll("[data-remove-plo-map]").forEach(btn => {
      btn.onclick = () => {
        const ploId = btn.getAttribute("data-remove-plo-map");
        const i = Number(btn.getAttribute("data-remove-plo-map-index"));
        const o = p.plos.find(x => x.id === ploId);
        if (!o) return;
        o.standardMappings = (o.standardMappings||[]).filter((_,idx)=>idx!==i);
        saveDebounced();
        renderFlags();
        render();
      };
    });

  }).catch(err => {
    console.warn("Standards load failed:", err);
  });
}


function wireAssessments() {
  const p = state.programme;


// ---- report controls ----
const reportTypeSelect = document.getElementById("reportTypeSelect");
const reportVersionSelect = document.getElementById("reportVersionSelect");
const runInline = document.getElementById("runReportInlineBtn");
const runNewTab = document.getElementById("runReportNewTabBtn");
const out = document.getElementById("reportOutput");

if (reportTypeSelect) {
  reportTypeSelect.onchange = () => {
    state.reportTypeId = reportTypeSelect.value;
  };
}
if (reportVersionSelect) {
  reportVersionSelect.onchange = () => {
    state.reportVersionId = reportVersionSelect.value;
  };
}

function getReportState() {
  const rid = state.reportTypeId || "byStageType";
  const vid = state.reportVersionId || (p.versions?.[0]?.id) || "";
  return { rid, vid };
}

if (runInline && out) {
  runInline.onclick = () => {
    const { rid, vid } = getReportState();
    const html = buildAssessmentReportHtml(p, rid, vid);
    out.style.display = "";
    out.innerHTML = html;
  };
}

if (runNewTab) {
  runNewTab.onclick = () => {
    const { rid, vid } = getReportState();
    const html = buildAssessmentReportHtml(p, rid, vid);
    const label = (ASSESSMENT_REPORT_TYPES.find(x => x.id === rid)?.label) || "Report";
    openReportInNewTab(html, label);
  };
}

  const picker = document.getElementById("modulePicker");
  if (picker) {
    picker.onchange = () => {
      state.selectedModuleId = picker.value;
      render();
    };
  }

  document.querySelectorAll("[data-add-asm]").forEach(btn => {
    btn.onclick = () => {
      const mid = btn.getAttribute("data-add-asm");
      const m = p.modules.find(x => x.id === mid);
      if (!m) return;
      ensureMimloObjects(m);
      m.assessments = m.assessments || [];
      m.assessments.push({
        id: "asm_" + crypto.randomUUID(),
        title: "",
        type: "Report/Essay",
        weighting: 0,
        mode: "Online",
        integrity: { proctored: false, viva: false, inClass: false, originalityCheck: true, aiDeclaration: true },
        mimloIds: [],
        notes: ""
      });
      saveDebounced();
      render();
    };
  });

  document.querySelectorAll("[data-remove-asm]").forEach(btn => {
    btn.onclick = () => {
      const mid = btn.getAttribute("data-remove-asm");
      const aid = btn.getAttribute("data-asm-id");
      const m = p.modules.find(x => x.id === mid);
      if (!m) return;
      m.assessments = m.assessments || [];
      m.assessments = m.assessments.filter(a => a.id !== aid);
      saveDebounced();
      render();
    };
  });

  function findAsm(mid, aid) {
    const m = p.modules.find(x => x.id === mid);
    if (!m) return null;
    m.assessments = m.assessments || [];
    const a = m.assessments.find(x => x.id === aid);
    return { m, a };
  }

  document.querySelectorAll("[data-asm-title]").forEach(inp => {
    inp.oninput = () => {
      const mid = inp.getAttribute("data-asm-title");
      const aid = inp.getAttribute("data-asm-id");
      const found = findAsm(mid, aid);
      if (!found || !found.a) return;
      found.a.title = inp.value;
      saveDebounced();
    };
  });

  document.querySelectorAll("[data-asm-type]").forEach(sel => {
    sel.onchange = () => {
      const mid = sel.getAttribute("data-asm-type");
      const aid = sel.getAttribute("data-asm-id");
      const found = findAsm(mid, aid);
      if (!found || !found.a) return;
      found.a.type = sel.value;
      saveDebounced();
    };
  });

  document.querySelectorAll("[data-asm-weight]").forEach(inp => {
    inp.oninput = () => {
      const mid = inp.getAttribute("data-asm-weight");
      const aid = inp.getAttribute("data-asm-id");
      const found = findAsm(mid, aid);
      if (!found || !found.a) return;
      found.a.weighting = Number(inp.value || 0);
      saveDebounced();
    };
  });

  document.querySelectorAll("[data-asm-mode]").forEach(sel => {
    sel.onchange = () => {
      const mid = sel.getAttribute("data-asm-mode");
      const aid = sel.getAttribute("data-asm-id");
      const found = findAsm(mid, aid);
      if (!found || !found.a) return;
      found.a.mode = sel.value;
      saveDebounced();
    };
  });

  document.querySelectorAll("[data-asm-notes]").forEach(area => {
    area.oninput = () => {
      const mid = area.getAttribute("data-asm-notes");
      const aid = area.getAttribute("data-asm-id");
      const found = findAsm(mid, aid);
      if (!found || !found.a) return;
      found.a.notes = area.value;
      saveDebounced();
    };
  });

  document.querySelectorAll("[data-asm-int]").forEach(chk => {
    chk.onchange = () => {
      const mid = chk.getAttribute("data-asm-int");
      const aid = chk.getAttribute("data-asm-id");
      const key = chk.getAttribute("data-int-key");
      const found = findAsm(mid, aid);
      if (!found || !found.a) return;
      found.a.integrity = found.a.integrity || {};
      found.a.integrity[key] = chk.checked;
      saveDebounced();
    };
  });

  document.querySelectorAll("[data-asm-map]").forEach(chk => {
    chk.onchange = () => {
      const mid = chk.getAttribute("data-asm-map");
      const aid = chk.getAttribute("data-asm-id");
      const mimloId = chk.getAttribute("data-mimlo-id");
      const found = findAsm(mid, aid);
      if (!found || !found.a) return;
      found.a.mimloIds = found.a.mimloIds || [];
      if (chk.checked) {
        if (!found.a.mimloIds.includes(mimloId)) found.a.mimloIds.push(mimloId);
      } else {
        found.a.mimloIds = found.a.mimloIds.filter(x => x !== mimloId);
      }
      saveDebounced();
    };
  });
}


function wireMimlos(){
  const p = state.programme;

const picker = document.getElementById("modulePicker");
if (picker) {
  picker.onchange = () => {
    state.selectedModuleId = picker.value;
    render();
  };
}

  p.mode = p.mode || 'PROGRAMME_OWNER';
  document.querySelectorAll("[data-add-mimlo]").forEach(btn => {
    btn.onclick = () => {
      const id = btn.getAttribute("data-add-mimlo");
      const m = p.modules.find(x => x.id === id);
      if (!m) return;
      m.mimlos = m.mimlos || [];
      m.mimlos.push({ id: 'mimlo_' + crypto.randomUUID(), text: '' });
      saveDebounced();
      renderFlags();
      render();
    };
  });

  document.querySelectorAll("[data-remove-mimlo]").forEach(btn => {
    btn.onclick = () => {
      const id = btn.getAttribute("data-remove-mimlo");
      const idx = Number(btn.getAttribute("data-remove-mimlo-index"));
      const m = p.modules.find(x => x.id === id);
      if (!m) return;
      m.mimlos = (m.mimlos || []).filter((_, i) => i !== idx);
      saveDebounced();
      renderFlags();
      render();
    };
  });

  document.querySelectorAll("[data-mimlo-module]").forEach(inp => {
    inp.addEventListener("input", (e) => {
      const id = inp.getAttribute("data-mimlo-module");
      const idx = Number(inp.getAttribute("data-mimlo-index"));
      const m = p.modules.find(x => x.id === id);
      if (!m) return;
      m.mimlos = m.mimlos || [];
      ensureMimloObjects(m);
    if (!m.mimlos[idx]) m.mimlos[idx] = { id: 'mimlo_' + crypto.randomUUID(), text: '' };
    m.mimlos[idx].text = e.target.value;
      saveDebounced();
      renderFlags();
      
      // Update lint warnings dynamically
      if (typeof LO_Lint !== 'undefined') {
        const lintResult = LO_Lint.lintLearningOutcome(e.target.value);
        const warningsHtml = lintResult.issues.filter(i => i.severity === 'warn').map(issue => `
          <div class="alert alert-warning py-1 px-2 mb-0 small">
            <strong>⚠️ "${escapeHtml(issue.match)}"</strong> — ${escapeHtml(issue.message)}
            ${issue.suggestions.length ? `<br><em>Try: ${issue.suggestions.map(s => escapeHtml(s)).join(", ")}</em>` : ""}
          </div>
        `).join("");
        
        // Find or create the lint container after the input
        let lintContainer = inp.closest('.input-group').parentElement.querySelector('.mimlo-lint-warnings');
        if (!lintContainer) {
          lintContainer = document.createElement('div');
          lintContainer.className = 'mimlo-lint-warnings mt-1';
          inp.closest('.input-group').insertAdjacentElement('afterend', lintContainer);
        }
        lintContainer.innerHTML = warningsHtml;
      }
    });
  });
}

function wireEffortHours() {
  const p = state.programme;
  p.mode = p.mode || 'PROGRAMME_OWNER';

  const picker = document.getElementById("modulePicker");
  if (picker) {
    picker.onchange = () => {
      state.selectedModuleId = picker.value;
      render();
    };
  }

  // Function to recalculate and update totals for a module row
  function updateTotals(moduleId, versionModalityKey) {
    const m = p.modules.find(x => x.id === moduleId);
    if (!m || !m.effortHours || !m.effortHours[versionModalityKey]) return;
    
    const e = m.effortHours[versionModalityKey];
    const total = Number(e.classroomHours || 0) + Number(e.mentoringHours || 0) + 
                  Number(e.otherContactHours || 0) + Number(e.directedElearningHours || 0) + 
                  Number(e.independentLearningHours || 0) + Number(e.otherHours || 0) + 
                  Number(e.workBasedHours || 0);
    
    const expectedTotal = Number(m.credits || 0) * 25;
    const row = document.querySelector(`tr[data-version-modality="${versionModalityKey}"][data-module-id="${moduleId}"]`);
    if (row) {
      const badge = row.querySelector('[data-total-display]');
      if (badge) {
        badge.textContent = total;
        badge.className = 'badge ' + (total === expectedTotal ? 'text-bg-success' : (total > 0 ? 'text-bg-warning' : 'text-bg-secondary'));
      }
    }
  }

  // Wire up all effort hour inputs
  document.querySelectorAll('[data-effort-field]').forEach(inp => {
    inp.addEventListener('input', (e) => {
      const row = inp.closest('tr');
      if (!row) return;
      
      const moduleId = row.getAttribute('data-module-id');
      const versionModalityKey = row.getAttribute('data-version-modality');
      const field = inp.getAttribute('data-effort-field');
      
      const m = p.modules.find(x => x.id === moduleId);
      if (!m) return;
      
      m.effortHours = m.effortHours || {};
      m.effortHours[versionModalityKey] = m.effortHours[versionModalityKey] || {};
      
      // Determine if this is a number or text field
      if (field.endsWith('Hours')) {
        m.effortHours[versionModalityKey][field] = Number(e.target.value) || 0;
      } else {
        m.effortHours[versionModalityKey][field] = e.target.value;
      }
      
      saveDebounced();
      updateTotals(moduleId, versionModalityKey);
    });
  });
}

function wireReadingLists() {
  const p = state.programme;

  const picker = document.getElementById("modulePicker");
  if (picker) {
    picker.onchange = () => {
      state.selectedModuleId = picker.value;
      render();
    };
  }

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
      render();
    };
  });

  document.querySelectorAll("[data-remove-reading]").forEach(btn => {
    btn.onclick = () => {
      const mid = btn.getAttribute("data-remove-reading");
      const idx = Number(btn.getAttribute("data-reading-index"));
      const m = p.modules.find(x => x.id === mid);
      if (!m) return;
      m.readingList = (m.readingList || []).filter((_, i) => i !== idx);
      saveDebounced();
      render();
    };
  });

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
      if (field === 'year') render();
    });
  });

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

  // ISBN Lookup using Open Library API
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
          render();
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
            render();
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

function wireSchedule() {
  const p = state.programme;
  const versions = Array.isArray(p.versions) ? p.versions : [];

  // Version selector
  const versionSelect = document.getElementById("scheduleVersionSelect");
  if (versionSelect) {
    versionSelect.onchange = () => {
      state.selectedVersionId = versionSelect.value;
      render();
    };
  }

  // Print button
  const printBtn = document.getElementById("printScheduleBtn");
  if (printBtn) {
    printBtn.onclick = () => {
      window.print();
    };
  }
}

function renderTraceabilityTable(p, standardsDataArray, devModeToggleHtml) {
  const content = document.getElementById("content");
  const traceRows = [];
  const moduleMap = new Map((p.modules || []).map(m => [m.id, m]));
  
  // Handle both single and multiple standards
  const standardsList = Array.isArray(standardsDataArray) ? standardsDataArray : (standardsDataArray ? [standardsDataArray] : []);
  
  // Get all award standards for the programme's NFQ level, grouped by award standard
  const nfqLevel = String(p.nfqLevel || '');
  const standardsByAward = new Map();
  standardsList.forEach((std, idx) => {
    const awardStdId = p.awardStandardIds?.[idx] || (std?.standard_id || 'unknown');
    const awardStdName = p.awardStandardNames?.[idx] || (std?.standard_name || 'Unknown Standard');
    const levelStandards = (std?.levels?.[nfqLevel]) || [];
    standardsByAward.set(awardStdId, { name: awardStdName, standards: levelStandards });
  });
  
  // Track which standards are covered by PLOs, organized by award standard
  const coveredStandardsByAward = new Map();
  standardsByAward.forEach((data, awardId) => {
    coveredStandardsByAward.set(awardId, new Set());
  });
  
  (p.plos || []).forEach((plo, ploIdx) => {
    const standardMappings = plo.standardMappings || [];
    const mappedModuleIds = p.ploToModules?.[plo.id] || [];
    
    // If no standard mappings, still show the PLO
    const standards = standardMappings.length > 0 
      ? standardMappings 
      : [{ criteria: '(Not mapped)', thread: '', standardId: null }];
    
    standards.forEach(std => {
      const standardLabel = std.thread ? `${std.criteria} — ${std.thread}` : std.criteria;
      
      // Determine which award standard this mapping belongs to
      const awardId = std.standardId || p.awardStandardIds?.[0] || 'unknown';
      
      // Mark this standard as covered by a PLO
      if (std.thread && coveredStandardsByAward.has(awardId)) {
        coveredStandardsByAward.get(awardId).add(std.thread);
      }
      
      if (mappedModuleIds.length === 0) {
        // PLO not mapped to any module
        traceRows.push({
          standard: standardLabel,
          awardStandardId: awardId,
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
              awardStandardId: awardId,
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
                (a.mimloIds || []).includes(mimloId)
              );
              
              if (coveringAssessments.length === 0) {
                // MIMLO not assessed
                traceRows.push({
                  standard: standardLabel,
                  awardStandardId: awardId,
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
                    awardStandardId: awardId,
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

  // Find uncovered award standards for each award and add them as critical gaps
  standardsByAward.forEach((awardInfo, awardStdId) => {
    const uncoveredStandards = awardInfo.standards.filter(std => !coveredStandardsByAward.get(awardStdId)?.has(std.thread));
    uncoveredStandards.forEach(std => {
      const standardLabel = std.thread ? `${std.criteria} — ${std.thread}` : std.criteria;
      traceRows.unshift({
        standard: standardLabel,
        awardStandardId: awardStdId,
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
  });

  // Summary stats
  const totalRows = traceRows.length;
  const coveredCount = traceRows.filter(r => r.status === 'ok').length;
  const warningCount = traceRows.filter(r => r.status === 'warning').length;
  const gapCount = traceRows.filter(r => r.status === 'gap').length;
  const uncoveredCount = traceRows.filter(r => r.status === 'uncovered').length;

  // Build coverage summary by award standard
  const coverageSummaryByAward = Array.from(standardsByAward.entries()).map(([awardStdId, awardInfo]) => {
    const awardRows = traceRows.filter(r => r.awardStandardId === awardStdId);
    const awardUncovered = awardRows.filter(r => r.status === 'uncovered').length;
    const awardTotal = awardInfo.standards.length;
    const awardCovered = awardTotal - awardUncovered;
    return {
      awardStdId,
      awardStdName: awardInfo.name,
      total: awardTotal,
      covered: awardCovered,
      uncovered: awardUncovered
    };
  });

  const statusBadge = (status, label) => {
    if (status === 'ok') return `<span class="badge text-bg-success">${escapeHtml(label)}</span>`;
    if (status === 'warning') return `<span class="badge text-bg-warning">${escapeHtml(label)}</span>`;
    if (status === 'uncovered') return `<span class="badge text-bg-dark">${escapeHtml(label)}</span>`;
    return `<span class="badge text-bg-danger">${escapeHtml(label)}</span>`;
  };

  // Group trace rows by award standard for display
  const tableRowsByAward = new Map();
  Array.from(standardsByAward.entries()).forEach(([awardStdId, awardInfo]) => {
    tableRowsByAward.set(awardStdId, []);
  });
  
  traceRows.forEach(r => {
    const awardStdId = r.awardStandardId || Array.from(standardsByAward.keys())[0];
    if (tableRowsByAward.has(awardStdId)) {
      tableRowsByAward.get(awardStdId).push(r);
    }
  });

  const tableRows = Array.from(tableRowsByAward.entries()).map(([awardStdId, rows]) => {
    const awardInfo = standardsByAward.get(awardStdId);
    const awardHeaderHtml = `
      <tr class="table-secondary">
        <td colspan="11" class="fw-semibold">${escapeHtml(awardInfo.name)}</td>
      </tr>`;
    
    const rowsHtml = rows.map((r, i) => `
      <tr data-status="${r.status}">
        <td class="small ${r.status === 'uncovered' ? 'fw-bold' : ''}">${escapeHtml(r.standard)}</td>
        <td class="small text-nowrap">${r.ploNum !== '—' ? 'PLO ' + r.ploNum : '—'}</td>
        <td class="small" style="max-width:200px;" title="${escapeHtml(r.ploText)}">${escapeHtml(r.ploText.length > 60 ? r.ploText.slice(0,60) + '…' : r.ploText)}</td>
        <td class="small text-nowrap">${escapeHtml(r.moduleCode)}</td>
        <td class="small">${escapeHtml(r.moduleTitle)}</td>
        <td class="small text-nowrap">${r.mimloNum !== '—' ? 'MIMLO ' + r.mimloNum : '—'}</td>
        <td class="small" style="max-width:180px;" title="${escapeHtml(r.mimloText)}">${escapeHtml(r.mimloText.length > 50 ? r.mimloText.slice(0,50) + '…' : r.mimloText)}</td>
        <td class="small">${escapeHtml(r.assessmentTitle)}</td>
        <td class="small">${escapeHtml(r.assessmentType)}</td>
        <td class="small text-end">${escapeHtml(r.assessmentWeight)}</td>
        <td class="small text-center">${statusBadge(r.status, r.statusLabel)}</td>
      </tr>
    `).join('');
    
    return awardHeaderHtml + rowsHtml;
  }).join('');

  const standardsCoverage = coverageSummaryByAward.length > 0
    ? `<div class="mb-3">
        ${coverageSummaryByAward.map(summary => {
          const hasCoverage = summary.total > 0;
          const isCovered = summary.uncovered === 0;
          return `<div class="mb-2 p-3 ${isCovered ? 'bg-success-subtle' : 'bg-danger-subtle'} rounded">
            <div class="fw-semibold mb-1">${escapeHtml(summary.awardStdName)}</div>
            <div class="small">${summary.covered} of ${summary.total} standards covered by PLOs
              ${!isCovered ? ` — <strong>${summary.uncovered} standard${summary.uncovered > 1 ? 's' : ''} not yet addressed</strong>` : ' ✓'}
            </div>
          </div>`;
        }).join('')}
      </div>`
    : (nfqLevel ? `<div class="alert alert-warning mb-3">No award standards found for NFQ Level ${nfqLevel}. Check that standards.json includes this level.</div>` : '');

  // Build Sankey data from trace rows
  const sankeyData = buildSankeyData(traceRows, p);

  content.innerHTML = devModeToggleHtml + `
    <div class="card shadow-sm">
      <div class="card-body">
        <h5 class="card-title mb-3">Traceability Matrix</h5>
        <p class="small text-secondary mb-3">This shows the full alignment chain from QQI Award Standards → PLOs → Modules → MIMLOs → Assessments. Use the tabs to switch between table and diagram views.</p>
        
        ${standardsCoverage}
        
        <div class="d-flex flex-wrap gap-3 mb-3 align-items-center">
          <div class="d-flex align-items-center gap-2">
            <span class="badge text-bg-success">${coveredCount}</span>
            <span class="small">Covered</span>
          </div>
          <div class="d-flex align-items-center gap-2">
            <span class="badge text-bg-warning">${warningCount}</span>
            <span class="small">Assessment Gaps</span>
          </div>
          <div class="d-flex align-items-center gap-2">
            <span class="badge text-bg-danger">${gapCount}</span>
            <span class="small">PLO/MIMLO Gaps</span>
          </div>
          ${uncoveredCount > 0 ? `
          <div class="d-flex align-items-center gap-2">
            <span class="badge text-bg-dark">${uncoveredCount}</span>
            <span class="small">Uncovered Standards</span>
          </div>
          ` : ''}
        </div>

        <!-- Tab navigation -->
        <ul class="nav nav-tabs mb-3" id="traceabilityTabs" role="tablist">
          <li class="nav-item" role="presentation">
            <button class="nav-link active" id="table-tab" data-bs-toggle="tab" data-bs-target="#tableView" type="button" role="tab" aria-controls="tableView" aria-selected="true">
              📋 Table View
            </button>
          </li>
          <li class="nav-item" role="presentation">
            <button class="nav-link" id="sankey-tab" data-bs-toggle="tab" data-bs-target="#sankeyView" type="button" role="tab" aria-controls="sankeyView" aria-selected="false">
              📊 Sankey Diagram
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
                ${(p.modules || []).map(m => `<option value="${escapeHtml(m.code || m.title)}">${escapeHtml(m.code || m.title)}</option>`).join('')}
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
                    ${tableRows}
                  </tbody>
                </table>
              </div>
              <div class="small text-secondary mt-2">${totalRows} alignment${totalRows !== 1 ? 's' : ''} shown</div>
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
  wireDevModeToggle();
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
function buildSankeyData(traceRows, programme) {
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
    assessment: 'rgba(220, 53, 69, 0.8)', // Red for assessments
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
      const awardPrefix = row.awardStandardId ? `[${row.awardStandardId}] ` : '';
      const standardNode = addNode(`📋 ${awardPrefix}${row.standard}`, 'standard');
      const gapNode = addNode(`⚠️ NO PLO COVERAGE`, 'gap');
      addLink(standardNode, gapNode, 'uncovered');
      return;
    }
    
    // Add nodes for each level
    const awardPrefix = row.awardStandardId ? `[${row.awardStandardId}] ` : '';
    const standardNode = addNode(`📋 ${awardPrefix}${row.standard}`, 'standard');
    
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

function wireMapping(){
  const p = state.programme;
  p.mode = p.mode || 'PROGRAMME_OWNER';
  document.querySelectorAll("[data-map-plo]").forEach(chk => {
    chk.addEventListener("change", (e) => {
      const ploId = chk.getAttribute("data-map-plo");
      const modId = chk.getAttribute("data-map-module");
      const arr = p.ploToModules[ploId] || [];
      if (chk.checked) {
        if (!arr.includes(modId)) arr.push(modId);
      } else {
        const i = arr.indexOf(modId);
        if (i >= 0) arr.splice(i, 1);
      }
      p.ploToModules[ploId] = arr;
      saveDebounced();
      renderFlags();
    });
  });
}

function initNavButtons(){
  document.getElementById("backBtn").onclick = () => {
    state.stepIndex = Math.max(0, state.stepIndex - 1);
    render();
  };
  document.getElementById("nextBtn").onclick = () => {
    const stepKey = activeSteps()[state.stepIndex].key;

    if (stepKey === "identity") {
      if (!state.programme.totalCredits) {
        alert("Enter the total programme credits (ECTS) in Identity before continuing.");
        return;
      }
      if (!state.programme.awardStandardIds || !state.programme.awardStandardIds.length) {
        alert("Select at least one QQI award standard in Identity before continuing.");
        return;
      }
    }

    if (stepKey === "outcomes") {
      const plos = state.programme.plos || [];
      if (plos.length === 0) {
        alert("Add at least one PLO before continuing.");
        return;
      }
      const missing = plos.filter(o => !Array.isArray(o.standardMappings) || o.standardMappings.length === 0);
      if (missing.length) {
        alert("Each PLO must be mapped to at least one QQI award standard strand/thread before continuing.");
        return;
      }
    }

    state.stepIndex = Math.min(activeSteps().length - 1, state.stepIndex + 1);
    render();
  };

  document.getElementById("exportBtn").onclick = () => downloadJson("programme-design.json", state.programme);

  document.getElementById("importInput").addEventListener("change", async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const json = JSON.parse(text);
      // basic shape check
      state.programme = { ...defaultProgramme(), ...json, schemaVersion: 2 };
      
      // Migration: convert old single standard to array format
      if (typeof state.programme.awardStandardId === 'string') {
        const oldId = state.programme.awardStandardId || '';
        const oldName = state.programme.awardStandardName || '';
        state.programme.awardStandardIds = oldId ? [oldId] : [];
        state.programme.awardStandardNames = oldName ? [oldName] : [];
        delete state.programme.awardStandardId;
        delete state.programme.awardStandardName;
      }
      // Ensure arrays exist
      if (!Array.isArray(state.programme.awardStandardIds)) {
        state.programme.awardStandardIds = [];
      }
      if (!Array.isArray(state.programme.awardStandardNames)) {
        state.programme.awardStandardNames = [];
      }
      
      saveNow();
      state.stepIndex = 0;
      render();
    } catch (err) {
      alert("Import failed: invalid JSON.");
    } finally {
      e.target.value = "";
    }
  });

  document.getElementById("resetBtn").onclick = () => {
    if (!confirm("This will clear the saved programme in this browser. Continue?")) return;
    localStorage.removeItem(STORAGE_KEY);
    state.programme = defaultProgramme();
    state.stepIndex = 0;
    state.lastSaved = null;
    render();
  };
}


// ===== Word export (Programme Descriptor) =====
async function exportProgrammeDescriptorWord(p) {
  if (typeof window.PizZip === "undefined" || typeof window.docxtemplater === "undefined") {
    throw new Error("Missing Word export libraries (PizZip/docxtemplater). Check index.html includes the CDN scripts.");
  }
  if (typeof window.saveAs === "undefined") {
    throw new Error("Missing FileSaver (saveAs). Check index.html includes FileSaver.");
  }

  // Load template (docx) from assets
  const tplRes = await fetch("./assets/programme_descriptor_template.docx");
  if (!tplRes.ok) throw new Error("Could not load Word template from ./assets/programme_descriptor_template.docx");
  const tplBuf = await tplRes.arrayBuffer();

  const zip = new window.PizZip(tplBuf);
  const doc = new window.docxtemplater(zip, {
    paragraphLoop: true,
    linebreaks: true
  });

  const plos = Array.isArray(p.plos) ? p.plos : [];
  const miplosText = plos.length
    ? plos.map((o, i) => `${i + 1}. ${o.text || ""}`).join("\n")
    : "";

  const mappingSnapshot = plos.length
    ? plos.map((o, i) => {
        const maps = (o.standardMappings || []).map(m => `${m.criteria} / ${m.thread}`).join("; ");
        return `${i + 1}. ${o.text || ""}\n   Mapped: ${maps || "—"}`;
      }).join("\n\n")
    : "";

  // Minimal data mapping to the placeholder template you’re testing (Option A)
  const data = {
    provider_name: "", // add to Identity later if you want
    programme_title: p.title || "",
    nfq_level: p.nfqLevel ?? "",
    award_class: p.awardType || "",
    ects: String(p.totalCredits || ""),
    programme_synopsis: "", // add field later if desired
    graduate_attributes: "", // add field later if desired
    award_standard_name: p.awardStandardName || p.awardStandardId || "",
    miplos: miplosText,
    programme_rationale: "",
    atp: "",
    tla_strategy: "",
    assessment_integrity: "",
    resources: "",
    programme_management: "",
    // Extra (not in template yet, but useful for future placeholders)
    plo_standard_mapping_snapshot: mappingSnapshot
  };

  doc.setData(data);
  doc.render();

  const out = doc.getZip().generate({
    type: "blob",
    mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
  });

  const safeTitle = (p.title || "programme").replace(/[^a-z0-9\-\s]/gi, "").trim().replace(/\s+/g, "_");
  window.saveAs(out, `${safeTitle || "programme"}_programme_descriptor.docx`);
}
// ===== End Word export =====

// Boot
load();
initNavButtons();
render();
renderHeader();
