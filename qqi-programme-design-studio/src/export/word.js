/**
 * Word document export using docxtemplater
 */

import PizZip from 'pizzip';
import Docxtemplater from 'docxtemplater';
import { saveAs } from 'file-saver';

/**
 * Export programme descriptor as Word document
 */
export async function exportProgrammeDescriptorWord(p) {
  // Load template
  const tplRes = await fetch("./assets/programme_descriptor_template.docx");
  if (!tplRes.ok) {
    throw new Error("Failed to load Word template");
  }
  const tplBuf = await tplRes.arrayBuffer();

  const zip = new PizZip(tplBuf);
  const doc = new Docxtemplater(zip, {
    paragraphLoop: true,
    linebreaks: true
  });

  const plos = Array.isArray(p.plos) ? p.plos : [];
  const miplosText = plos.length
    ? plos.map((o, i) => `${i + 1}. ${o.text || ""}`).join("\n")
    : "";

  const mappingSnapshot = plos.length
    ? plos.map((o, i) => {
        const mappings = o.standardMappings || [];
        const mapStr = mappings.length 
          ? mappings.map(m => `${m.thread}: ${m.criteria}`).join("; ")
          : "No mappings";
        return `PLO ${i + 1}: ${o.text || ""}\n  → ${mapStr}`;
      }).join("\n\n")
    : "";

  const data = {
    provider_name: "",
    programme_title: p.title || "",
    nfq_level: p.nfqLevel ?? "",
    award_class: p.awardType || "",
    ects: String(p.totalCredits || ""),
    programme_synopsis: "",
    graduate_attributes: "",
    award_standard_name: p.awardStandardName || p.awardStandardId || "",
    miplos: miplosText,
    programme_rationale: "",
    atp: "",
    tla_strategy: "",
    assessment_integrity: "",
    resources: "",
    programme_management: "",
    plo_standard_mapping_snapshot: mappingSnapshot
  };

  doc.setData(data);
  doc.render();

  const out = doc.getZip().generate({
    type: "blob",
    mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
  });

  const safeTitle = (p.title || "programme").replace(/[^a-z0-9\-\s]/gi, "").trim().replace(/\s+/g, "_");
  saveAs(out, `${safeTitle || "programme"}_programme_descriptor.docx`);
}

/**
 * Export programme to Word (alias with fallback)
 */
export async function exportProgrammeToWord(p) {
  try {
    await exportProgrammeDescriptorWord(p);
  } catch (err) {
    console.error('Word export failed:', err);
    alert('Word export failed. The template file may be missing. Please ensure programme_descriptor_template.docx exists in assets folder.');
  }
}
