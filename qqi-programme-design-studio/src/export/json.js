/**
 * JSON export utilities
 */

/**
 * Download a programme as JSON file
 */
export function downloadJson(programme) {
  const title = programme.title?.trim() || "programme";
  const filename = `${title.replace(/\s+/g, "_")}.json`;
  const blob = new Blob([JSON.stringify(programme, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

/**
 * Export programme to JSON (alias for downloadJson)
 */
export function exportProgrammeToJson(programme) {
  downloadJson(programme);
}

/**
 * Import JSON from file and return parsed object
 */
export async function importJson(file) {
  const text = await file.text();
  return JSON.parse(text);
}

/**
 * Import programme from JSON file
 * Returns { success: boolean, programme?: object, error?: string }
 */
export async function importProgrammeFromJson(file) {
  try {
    const text = await file.text();
    const programme = JSON.parse(text);
    
    // Basic validation
    if (!programme || typeof programme !== 'object') {
      return { success: false, error: 'Invalid JSON structure' };
    }
    
    return { success: true, programme };
  } catch (e) {
    return { success: false, error: e.message };
  }
}
