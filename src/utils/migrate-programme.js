/**
 * Programme data migration utilities
 * Handles automatic migration of old programme exports to current schema version
 */

/**
 * Migrates programme data from older schema versions to the current version
 * @param {Object} data - The programme data to migrate
 * @returns {Object} The migrated programme data
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
 * Migrate from schema v1 to v2
 * Main changes:
 * - standards.json structure changed from flat levels/index to hierarchical nfqLevels/indicatorGroups
 * - Award standard singular fields converted to arrays
 * - deliveryModalities array converted to single deliveryModality
 * The programme data standardMapping objects remain compatible (criteria/thread/standardId)
 */
function migrateV1toV2(data) {
  console.log('Migrating programme from schema v1 to v2');
  
  const migrated = {
    ...data,
    schemaVersion: 2
  };
  
  // Migration: convert old single award standard to array format
  if (typeof migrated.awardStandardId === 'string') {
    const oldId = migrated.awardStandardId || '';
    const oldName = migrated.awardStandardName || '';
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
  migrated.versions.forEach(v => {
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
 * Migrate from schema v2 to v3
 * Main changes:
 * - Migrate old standard IDs to new standard IDs
 * - Migrate old thread names (e.g., "Competence-Context" → "Context")
 * - Fix criteria case mismatch ("Know-how & Skill" → "Know-How & Skill")
 * - Add missing standardId to PLO mappings
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
    migrated.awardStandardIds = migrated.awardStandardIds.map(id => 
      standardIdMap[id] || id
    );
  }
  
  // Get default standard ID for mappings missing one (use first migrated ID)
  const defaultStandardId = migrated.awardStandardIds?.[0] || null;
  
  // Migrate PLO standard mappings
  if (Array.isArray(migrated.plos)) {
    migrated.plos = migrated.plos.map(plo => {
      if (!plo.standardMappings || !Array.isArray(plo.standardMappings)) {
        return plo;
      }
      
      const migratedMappings = plo.standardMappings.map(mapping => {
        const newMapping = { ...mapping };
        
        // Migrate old standard ID to new
        if (newMapping.standardId && standardIdMap[newMapping.standardId]) {
          newMapping.standardId = standardIdMap[newMapping.standardId];
        }
        
        // Add missing standardId
        if (!newMapping.standardId && defaultStandardId) {
          newMapping.standardId = defaultStandardId;
        }
        
        // Fix criteria case
        if (newMapping.criteria && criteriaNameMap[newMapping.criteria]) {
          newMapping.criteria = criteriaNameMap[newMapping.criteria];
        }
        
        // Migrate old thread names
        if (newMapping.thread && threadNameMap[newMapping.thread]) {
          newMapping.thread = threadNameMap[newMapping.thread];
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
 * Validates that standard mappings are still valid against loaded standards
 * @param {Object} programme - The programme data
 * @param {Array} standards - Array of award standard objects
 * @returns {Object} Validation result with { errors, warnings, isValid }
 */
export function validateStandardMappings(programme, standards) {
  const errors = [];
  const warnings = [];
  
  if (!programme.plos || !Array.isArray(programme.plos)) {
    return { errors: [], warnings: [], isValid: true };
  }
  
  programme.plos.forEach((plo, ploIdx) => {
    if (!plo.standardMappings || !Array.isArray(plo.standardMappings)) {
      return;
    }
    
    plo.standardMappings.forEach((mapping, mappingIdx) => {
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
      
      const levelData = standard.nfqLevels?.find(l => l.level === nfqLevel);
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
      const group = levelData.indicatorGroups?.find(g => g.name === criteria);
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
      const indicator = group.indicators?.find(i => i.name === thread);
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
 * Helper to extract standard indicators in a flat structure from new standards format
 * This provides backward compatibility with code expecting the old structure
 * 
 * @param {Object} standard - Award standard object (new format)
 * @param {number} nfqLevel - NFQ level to extract
 * @returns {Array} Array of { criteria, thread, descriptor, id } objects
 */
export function getStandardIndicators(standard, nfqLevel) {
  if (!standard) return [];
  
  const levelData = standard.nfqLevels?.find(l => l.level === Number(nfqLevel));
  if (!levelData) return [];
  
  return levelData.indicatorGroups.flatMap(group => 
    group.indicators.map(indicator => ({
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
 * Helper to get criteria list for a standard at a specific NFQ level
 * @param {Object} standard - Award standard object (new format)
 * @param {number} nfqLevel - NFQ level
 * @returns {Array<string>} Array of criteria names
 */
export function getCriteriaList(standard, nfqLevel) {
  if (!standard) return [];
  
  const levelData = standard.nfqLevels?.find(l => l.level === Number(nfqLevel));
  if (!levelData) return [];
  
  return levelData.indicatorGroups.map(g => g.name);
}

/**
 * Helper to get thread list for a specific criteria
 * @param {Object} standard - Award standard object (new format)
 * @param {number} nfqLevel - NFQ level
 * @param {string} criteria - Criteria name
 * @returns {Array<string>} Array of thread names
 */
export function getThreadList(standard, nfqLevel, criteria) {
  if (!standard || !criteria) return [];
  
  const levelData = standard.nfqLevels?.find(l => l.level === Number(nfqLevel));
  if (!levelData) return [];
  
  const group = levelData.indicatorGroups.find(g => g.name === criteria);
  if (!group) return [];
  
  return group.indicators.map(i => i.name);
}

/**
 * Helper to get descriptor for a specific criteria/thread combination
 * @param {Object} standard - Award standard object (new format)
 * @param {number} nfqLevel - NFQ level
 * @param {string} criteria - Criteria name
 * @param {string} thread - Thread name
 * @returns {string} Descriptor text or empty string if not found
 */
export function getDescriptor(standard, nfqLevel, criteria, thread) {
  if (!standard || !criteria || !thread) return '';
  
  const levelData = standard.nfqLevels?.find(l => l.level === Number(nfqLevel));
  if (!levelData) return '';
  
  const group = levelData.indicatorGroups.find(g => g.name === criteria);
  if (!group) return '';
  
  const indicator = group.indicators.find(i => i.name === thread);
  return indicator?.descriptor || '';
}
