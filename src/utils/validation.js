/**
 * Programme validation and completion tracking
 */

/**
 * Validate a programme and return array of flags
 */
export function validateProgramme(p) {
  const flags = [];
  const sumCredits = (p.modules || []).reduce((acc, m) => acc + (Number(m.credits) || 0), 0);

  if (!p.title.trim()) flags.push({ type: "error", msg: "Programme title is missing.", step: "identity" });
  if (!p.nfqLevel) flags.push({ type: "error", msg: "NFQ level is missing.", step: "identity" });
  if (p.nfqLevel && (Number(p.nfqLevel) < 6 || Number(p.nfqLevel) > 9)) {
    flags.push({ type: "error", msg: "NFQ level must be between 6 and 9.", step: "identity" });
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
      if (!v.label || !v.label.trim()) {
        flags.push({ type: "warn", msg: `${prefix}: label is missing.`, step: "versions" });
      } else {
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
        } else {
          const total = Number(pat.syncOnlinePct || 0) + Number(pat.asyncDirectedPct || 0) + Number(pat.onCampusPct || 0);
          if (total !== 100) {
            flags.push({ type: "error", msg: `${prefix}: ${mod} delivery pattern must total 100% (currently ${total}%).`, step: "versions" });
          }
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
        const stageTargetSum = (v.stages || []).reduce((acc, s) => acc + Number(s.creditsTarget || 0), 0);
        if ((p.totalCredits || 0) > 0 && stageTargetSum > 0 && stageTargetSum !== Number(p.totalCredits || 0)) {
          flags.push({ type: "warn", msg: `${prefix}: sum of stage credit targets (${stageTargetSum}) does not match programme total credits (${p.totalCredits}).`, step: "stages" });
        }

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

/**
 * Calculate completion percentage
 */
export function completionPercent(p) {
  let total = 0, done = 0;
  
  // Identity (4 items)
  total++; if (p.title && p.title.trim()) done++;
  total++; if (p.nfqLevel) done++;
  total++; if (p.awardType && p.awardType.trim()) done++;
  total++; if (p.school && p.school.trim()) done++;
  
  // Structure (2 items)
  total++; if ((p.totalCredits || 0) > 0) done++;
  total++; if ((p.modules || []).length > 0) done++;
  
  // Outcomes (2 items)
  total++; if ((p.plos || []).length >= 6) done++;
  total++; if (Object.keys(p.ploToModules || {}).length > 0) done++;

  // Versions (2 items)
  total++; if (Array.isArray(p.versions) && p.versions.length > 0) done++;
  const v0 = (p.versions || [])[0];
  total++; if (v0 && Array.isArray(v0.stages) && v0.stages.length > 0) done++;

  return Math.round((done / total) * 100);
}
