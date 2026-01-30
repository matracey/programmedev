// @ts-check
/**
 * Programme data migration utilities.
 * Handles automatic migration of old programme exports to current schema version.
 * @module utils/migrate-programme
 */

/**
 * Migrates programme data from older schema versions to the current version.
 * Applies sequential migrations (v1→v2→v3) as needed.
 *
 * @param {any} data - The programme data to migrate
 * @returns {any} The migrated programme data at current schema version
 */
export function migrateProgramme(data) {
  const currentVersion = 3;
  const dataVersion = data.schemaVersion || 1;
  
  if (dataVersion === currentVersion) {
    return data;
  }
  
  let migrated = { ...data };
  
  // Apply migrations sequentially
  if (dataVersion < 2) {
    migrated = migrateV1toV2(migrated);
  }
  
  if (dataVersion < 3) {
    migrated = migrateV2toV3(migrated);
  }
  
  return migrated;
}

/**
 * Migrates programme data from schema v1 to v2.
 * Converts singular award standard fields to arrays and normalizes delivery modality.
 *
 * @param {any} data - The v1 programme data
 * @returns {any} The migrated v2 programme data
 * @private
 */
function migrateV1toV2(data) {
  console.log('Migrating programme from schema v1 to v2');
  
  const migrated = {
    ...data,
    schemaVersion: 2
  };
  
  // Migration: convert old single award standard to array format
  if (typeof migrated.awardStandardId === 'string') {
    const oldId = migrated.awardStandardId ?? '';
    const oldName = migrated.awardStandardName ?? '';
    migrated.awardStandardIds = oldId ? [oldId] : [];
    migrated.awardStandardNames = oldName ? [oldName] : [];
    delete migrated.awardStandardId;
    delete migrated.awardStandardName;
  }
  
  // Ensure arrays exist
  if (!Array.isArray(migrated.awardStandardIds)) {
    migrated.awardStandardIds = [];
  }
  if (!Array.isArray(migrated.awardStandardNames)) {
    migrated.awardStandardNames = [];
  }
  
  // Ensure versions array exists
  if (!Array.isArray(migrated.versions)) {
    migrated.versions = [];
  }
  
  // Migration: convert old deliveryModalities array to single deliveryModality in versions
  migrated.versions.forEach((/** @type {any} */ v) => {
    if (Array.isArray(v.deliveryModalities) && !v.deliveryModality) {
      v.deliveryModality = v.deliveryModalities[0] || 'F2F';
      delete v.deliveryModalities;
    }
  });
  
  // Clean up legacy programme-level delivery fields
  delete migrated.deliveryMode;
  delete migrated.syncPattern;
  delete migrated.deliveryModalities;
  
  // Clean up any deprecated fields that might have been stored
  if (migrated.standardsCache) {
    delete migrated.standardsCache;
  }
  
  if (migrated._cachedStandards) {
    delete migrated._cachedStandards;
  }
  
  migrated.updatedAt = new Date().toISOString();
  
  return migrated;
}

/**
 * Migrates programme data from schema v2 to v3.
 * Updates standard IDs, thread names, and criteria casing to match new standards format.
 *
 * @param {any} data - The v2 programme data
 * @returns {any} The migrated v3 programme data
 * @private
 */
function migrateV2toV3(data) {
  console.log('Migrating programme from schema v2 to v3');
  
  const migrated = {
    ...data,
    schemaVersion: 3
  };
  
  // Old standard IDs → new standard IDs mapping
  const standardIdMap = {
    'qqi-computing-l6-9': 'computing',
    'qqi-professional-awards-l5-9': 'professional',
    'qqi-generic-major-masters-l9': 'generic-masters'
  };
  
  // Thread name mappings: old prefixed names → new simple names
  const threadNameMap = {
    'Competence-Context': 'Context',
    'Competence-Role': 'Role',
    'Competence-Learning to Learn': 'Learning to Learn',
    'Competence-Insight': 'Insight',
    'Know-how & Skill-Range': 'Range',
    'Know-how & Skill-Selectivity': 'Selectivity',
    'Knowledge-Breadth': 'Breadth',
    'Knowledge-Kind': 'Kind'
  };
  
  // Criteria case normalization
  const criteriaNameMap = {
    'Know-how & Skill': 'Know-How & Skill'
  };
  
  // Migrate programme-level award standard IDs
  if (Array.isArray(migrated.awardStandardIds)) {
    migrated.awardStandardIds = migrated.awardStandardIds.map((/** @type {string} */ id) => 
      /** @type {Record<string, string>} */ (standardIdMap)[id] || id
    );
  }
  
  // Get default standard ID for mappings missing one (use first migrated ID)
  const defaultStandardId = migrated.awardStandardIds?.[0] ?? null;
  
  // Migrate PLO standard mappings
  if (Array.isArray(migrated.plos)) {
    migrated.plos = migrated.plos.map((/** @type {any} */ plo) => {
      if (!plo.standardMappings || !Array.isArray(plo.standardMappings)) {
        return plo;
      }
      
      const migratedMappings = plo.standardMappings.map((/** @type {any} */ mapping) => {
        const newMapping = { ...mapping };
        
        // Migrate old standard ID to new
        if (newMapping.standardId && /** @type {Record<string, string>} */ (standardIdMap)[newMapping.standardId]) {
          newMapping.standardId = /** @type {Record<string, string>} */ (standardIdMap)[newMapping.standardId];
        }
        
        // Add missing standardId
        if (!newMapping.standardId && defaultStandardId) {
          newMapping.standardId = defaultStandardId;
        }
        
        // Fix criteria case
        if (newMapping.criteria && /** @type {Record<string, string>} */ (criteriaNameMap)[newMapping.criteria]) {
          newMapping.criteria = /** @type {Record<string, string>} */ (criteriaNameMap)[newMapping.criteria];
        }
        
        // Migrate old thread names
        if (newMapping.thread && /** @type {Record<string, string>} */ (threadNameMap)[newMapping.thread]) {
          newMapping.thread = /** @type {Record<string, string>} */ (threadNameMap)[newMapping.thread];
        }
        
        return newMapping;
      });
      
      return { ...plo, standardMappings: migratedMappings };
    });
  }
  
  migrated.updatedAt = new Date().toISOString();
  
  return migrated;
}

/**
 * Validates that PLO standard mappings reference valid criteria and threads.
 *
 * @param {any} programme - The programme data to validate
 * @param {any[]} standards - Array of award standard objects to validate against
 * @returns {{errors: any[], warnings: any[], isValid: boolean}} Validation result with errors, warnings, and validity flag
 */
export function validateStandardMappings(programme, standards) {
  /** @type {any[]} */
  const errors = [];
  /** @type {any[]} */
  const warnings = [];
  
  if (!programme.plos || !Array.isArray(programme.plos)) {
    return { errors: [], warnings: [], isValid: true };
  }
  
  programme.plos.forEach((/** @type {any} */ plo, /** @type {number} */ ploIdx) => {
    if (!plo.standardMappings || !Array.isArray(plo.standardMappings)) {
      return;
    }
    
    plo.standardMappings.forEach((/** @type {any} */ mapping, /** @type {number} */ mappingIdx) => {
      const { criteria, thread, standardId } = mapping;
      
      // Find the standard
      const standard = standards.find(s => s.id === standardId);
      if (!standard) {
        errors.push({
          ploId: plo.id,
          ploIndex: ploIdx,
          mappingIndex: mappingIdx,
          message: `Standard '${standardId}' not found`
        });
        return;
      }
      
      // Find the NFQ level
      const nfqLevel = programme.nfqLevel;
      if (!nfqLevel) {
        warnings.push({
          ploId: plo.id,
          ploIndex: ploIdx,
          mappingIndex: mappingIdx,
          message: `Programme NFQ level not set, cannot validate mapping`
        });
        return;
      }
      
      const levelData = standard.nfqLevels?.find((/** @type {any} */ l) => l.level === nfqLevel);
      if (!levelData) {
        warnings.push({
          ploId: plo.id,
          ploIndex: ploIdx,
          mappingIndex: mappingIdx,
          message: `Standard '${standardId}' has no data for NFQ level ${nfqLevel}`
        });
        return;
      }
      
      // Find the indicator group (criteria)
      const group = levelData.indicatorGroups?.find((/** @type {any} */ g) => g.name === criteria);
      if (!group) {
        errors.push({
          ploId: plo.id,
          ploIndex: ploIdx,
          mappingIndex: mappingIdx,
          message: `Criteria '${criteria}' not found in standard '${standardId}' at NFQ level ${nfqLevel}`
        });
        return;
      }
      
      // Find the indicator (thread)
      const indicator = group.indicators?.find((/** @type {any} */ i) => i.name === thread);
      if (!indicator) {
        errors.push({
          ploId: plo.id,
          ploIndex: ploIdx,
          mappingIndex: mappingIdx,
          message: `Thread '${thread}' not found under criteria '${criteria}' in standard '${standardId}'`
        });
      }
    });
  });
  
  return { 
    errors, 
    warnings, 
    isValid: errors.length === 0 
  };
}

/**
 * Extracts standard indicators as a flat array for a specific NFQ level.
 * Provides backward compatibility with code expecting the old standards structure.
 *
 * @param {any} standard - Award standard object (new hierarchical format)
 * @param {number} nfqLevel - NFQ level to extract (6-9)
 * @returns {Array<{criteria: string, thread: string, descriptor: string, descriptorText: string, id: string, awardStandardId: string}>} Flat array of indicator objects
 */
export function getStandardIndicators(standard, nfqLevel) {
  if (!standard) return [];
  
  const levelData = standard.nfqLevels?.find((/** @type {any} */ l) => l.level === Number(nfqLevel));
  if (!levelData) return [];
  
  return levelData.indicatorGroups.flatMap((/** @type {any} */ group) => 
    group.indicators.map((/** @type {any} */ indicator) => ({
      criteria: group.name,
      thread: indicator.name,
      descriptor: indicator.descriptor,
      descriptorText: indicator.descriptorText,
      id: indicator.id,
      awardStandardId: standard.id
    }))
  );
}

/**
 * Returns the list of criteria names for a standard at a specific NFQ level.
 *
 * @param {any} standard - Award standard object (new hierarchical format)
 * @param {number} nfqLevel - NFQ level (6-9)
 * @returns {Array<string>} Array of criteria names (e.g., ["Knowledge", "Know-How & Skill", "Competence"])
 */
export function getCriteriaList(standard, nfqLevel) {
  if (!standard) return [];
  
  const levelData = standard.nfqLevels?.find((/** @type {any} */ l) => l.level === Number(nfqLevel));
  if (!levelData) return [];
  
  return levelData.indicatorGroups.map((/** @type {any} */ g) => g.name);
}

/**
 * Returns the list of thread names for a specific criteria at an NFQ level.
 *
 * @param {any} standard - Award standard object (new hierarchical format)
 * @param {number} nfqLevel - NFQ level (6-9)
 * @param {string} criteria - Criteria name to get threads for
 * @returns {Array<string>} Array of thread names (e.g., ["Breadth", "Kind"])
 */
export function getThreadList(standard, nfqLevel, criteria) {
  if (!standard || !criteria) return [];
  
  const levelData = standard.nfqLevels?.find((/** @type {any} */ l) => l.level === Number(nfqLevel));
  if (!levelData) return [];
  
  const group = levelData.indicatorGroups.find((/** @type {any} */ g) => g.name === criteria);
  if (!group) return [];
  
  return group.indicators.map((/** @type {any} */ i) => i.name);
}

/**
 * Returns the descriptor text for a specific criteria/thread combination.
 *
 * @param {any} standard - Award standard object (new hierarchical format)
 * @param {number} nfqLevel - NFQ level (6-9)
 * @param {string} criteria - Criteria name
 * @param {string} thread - Thread name
 * @returns {string} Descriptor text, or empty string if not found
 */
export function getDescriptor(standard, nfqLevel, criteria, thread) {
  if (!standard || !criteria || !thread) return '';
  
  const levelData = standard.nfqLevels?.find((/** @type {any} */ l) => l.level === Number(nfqLevel));
  if (!levelData) return '';
  
  const group = levelData.indicatorGroups.find((/** @type {any} */ g) => g.name === criteria);
  if (!group) return '';
  
  const indicator = group.indicators.find((/** @type {any} */ i) => i.name === thread);
  return indicator?.descriptor || '';
}
