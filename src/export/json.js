// @ts-check
/**
 * JSON import/export utilities.
 * Handles programme data serialization for file download and upload.
 * @module export/json
 */

/**
 * Downloads a programme as a JSON file.
 * Creates a downloadable blob with formatted JSON content.
 *
 * @param {Programme} programme - The programme data to export
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
 * Exports programme to JSON file (alias for downloadJson).
 *
 * @param {Programme} programme - The programme data to export
 */
export function exportProgrammeToJson(programme) {
  downloadJson(programme);
}

/**
 * Reads and parses a JSON file.
 *
 * @param {File} file - The file to import
 * @returns {Promise<Object>} Parsed JSON object
 * @throws {SyntaxError} If JSON is invalid
 */
export async function importJson(file) {
  const text = await file.text();
  return JSON.parse(text);
}

/**
 * Imports and validates a programme from a JSON file.
 *
 * @param {File} file - The file to import
 * @returns {Promise<{success: boolean, programme?: Object, error?: string}>} Import result
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
    return { success: false, error: /** @type {Error} */ (e).message };
  }
}
