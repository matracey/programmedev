/**
 * Programme data migration utilities.
 * Handles automatic migration of old programme exports to current schema version.
 * @module utils/migrate-programme
 */

/**
 * Migrates programme data from older schema versions to the current version.
 * Applies sequential migrations (v1→v2→v3→v4) as needed.
 */
export function migrateProgramme(data: any): any {
  const currentVersion = 4;
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

  if (dataVersion < 4) {
    migrated = migrateV3toV4(migrated);
  }

  return migrated;
}

/**
 * Migrates programme data from schema v1 to v2.
 * Converts singular award standard fields to arrays and normalizes delivery modality.
 */
function migrateV1toV2(data: any): any {
  console.log("Migrating programme from schema v1 to v2");

  const migrated = {
    ...data,
    schemaVersion: 2,
  };

  // Migration: convert old single award standard to array format
  if (typeof migrated.awardStandardId === "string") {
    const oldId = migrated.awardStandardId ?? "";
    const oldName = migrated.awardStandardName ?? "";
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
  migrated.versions.forEach((v: any) => {
    if (Array.isArray(v.deliveryModalities) && !v.deliveryModality) {
      v.deliveryModality = v.deliveryModalities[0] || "F2F";
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
 */
function migrateV2toV3(data: any): any {
  console.log("Migrating programme from schema v2 to v3");

  const migrated = {
    ...data,
    schemaVersion: 3,
  };

  // Old standard IDs → new standard IDs mapping
  const standardIdMap: Record<string, string> = {
    "qqi-computing-l6-9": "computing",
    "qqi-professional-awards-l5-9": "professional",
    "qqi-generic-major-masters-l9": "generic-masters",
  };

  // Thread name mappings: old prefixed names → new simple names
  const threadNameMap: Record<string, string> = {
    "Competence-Context": "Context",
    "Competence-Role": "Role",
    "Competence-Learning to Learn": "Learning to Learn",
    "Competence-Insight": "Insight",
    "Know-how & Skill-Range": "Range",
    "Know-how & Skill-Selectivity": "Selectivity",
    "Knowledge-Breadth": "Breadth",
    "Knowledge-Kind": "Kind",
  };

  // Criteria case normalization
  const criteriaNameMap: Record<string, string> = {
    "Know-how & Skill": "Know-How & Skill",
  };

  // Migrate programme-level award standard IDs
  if (Array.isArray(migrated.awardStandardIds)) {
    migrated.awardStandardIds = migrated.awardStandardIds.map(
      (id: string) => standardIdMap[id] || id,
    );
  }

  // Get default standard ID for mappings missing one (use first migrated ID)
  const defaultStandardId = migrated.awardStandardIds?.[0] ?? null;

  // Migrate PLO standard mappings
  if (Array.isArray(migrated.plos)) {
    migrated.plos = migrated.plos.map((plo: any) => {
      if (!plo.standardMappings || !Array.isArray(plo.standardMappings)) {
        return plo;
      }

      const migratedMappings = plo.standardMappings.map((mapping: any) => {
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
 * Validates that PLO standard mappings reference valid criteria and threads.
 */
export function validateStandardMappings(
  programme: any,
  standards: any[],
): { errors: any[]; warnings: any[]; isValid: boolean } {
  const errors: any[] = [];
  const warnings: any[] = [];

  if (!programme.plos || !Array.isArray(programme.plos)) {
    return { errors: [], warnings: [], isValid: true };
  }

  programme.plos.forEach((plo: any, ploIdx: number) => {
    if (!plo.standardMappings || !Array.isArray(plo.standardMappings)) {
      return;
    }

    plo.standardMappings.forEach((mapping: any, mappingIdx: number) => {
      const { criteria, thread, standardId } = mapping;

      // Find the standard
      const standard = standards.find((s) => s.id === standardId);
      if (!standard) {
        errors.push({
          ploId: plo.id,
          ploIndex: ploIdx,
          mappingIndex: mappingIdx,
          message: `Standard '${standardId}' not found`,
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
          message: `Programme NFQ level not set, cannot validate mapping`,
        });
        return;
      }

      const levelData = standard.nfqLevels?.find((l: any) => l.level === nfqLevel);
      if (!levelData) {
        warnings.push({
          ploId: plo.id,
          ploIndex: ploIdx,
          mappingIndex: mappingIdx,
          message: `Standard '${standardId}' has no data for NFQ level ${nfqLevel}`,
        });
        return;
      }

      // Find the indicator group (criteria)
      const group = levelData.indicatorGroups?.find((g: any) => g.name === criteria);
      if (!group) {
        errors.push({
          ploId: plo.id,
          ploIndex: ploIdx,
          mappingIndex: mappingIdx,
          message: `Criteria '${criteria}' not found in standard '${standardId}' at NFQ level ${nfqLevel}`,
        });
        return;
      }

      // Find the indicator (thread)
      const indicator = group.indicators?.find((i: any) => i.name === thread);
      if (!indicator) {
        errors.push({
          ploId: plo.id,
          ploIndex: ploIdx,
          mappingIndex: mappingIdx,
          message: `Thread '${thread}' not found under criteria '${criteria}' in standard '${standardId}'`,
        });
      }
    });
  });

  return {
    errors,
    warnings,
    isValid: errors.length === 0,
  };
}

/**
 * Extracts standard indicators as a flat array for a specific NFQ level.
 * Provides backward compatibility with code expecting the old standards structure.
 */
export function getStandardIndicators(
  standard: any,
  nfqLevel: number,
): Array<{
  criteria: string;
  thread: string;
  descriptor: string;
  descriptorText: string;
  id: string;
  awardStandardId: string;
}> {
  if (!standard) {
    return [];
  }

  const levelData = standard.nfqLevels?.find((l: any) => l.level === Number(nfqLevel));
  if (!levelData) {
    return [];
  }

  return levelData.indicatorGroups.flatMap((group: any) =>
    group.indicators.map((indicator: any) => ({
      criteria: group.name,
      thread: indicator.name,
      descriptor: indicator.descriptor,
      descriptorText: indicator.descriptorText,
      id: indicator.id,
      awardStandardId: standard.id,
    })),
  );
}

/**
 * Returns the list of criteria names for a standard at a specific NFQ level.
 */
export function getCriteriaList(standard: any, nfqLevel: number): string[] {
  if (!standard) {
    return [];
  }

  const levelData = standard.nfqLevels?.find((l: any) => l.level === Number(nfqLevel));
  if (!levelData) {
    return [];
  }

  return levelData.indicatorGroups.map((g: any) => g.name);
}

/**
 * Returns the list of thread names for a specific criteria at an NFQ level.
 */
export function getThreadList(standard: any, nfqLevel: number, criteria: string): string[] {
  if (!standard || !criteria) {
    return [];
  }

  const levelData = standard.nfqLevels?.find((l: any) => l.level === Number(nfqLevel));
  if (!levelData) {
    return [];
  }

  const group = levelData.indicatorGroups.find((g: any) => g.name === criteria);
  if (!group) {
    return [];
  }

  return group.indicators.map((i: any) => i.name);
}

/**
 * Returns the descriptor text for a specific criteria/thread combination.
 */
export function getDescriptor(
  standard: any,
  nfqLevel: number,
  criteria: string,
  thread: string,
): string {
  if (!standard || !criteria || !thread) {
    return "";
  }

  const levelData = standard.nfqLevels?.find((l: any) => l.level === Number(nfqLevel));
  if (!levelData) {
    return "";
  }

  const group = levelData.indicatorGroups.find((g: any) => g.name === criteria);
  if (!group) {
    return "";
  }

  const indicator = group.indicators.find((i: any) => i.name === thread);
  return indicator?.descriptor || "";
}

/**
 * Migrates programme data from schema v3 to v4.
 * Converts ploToModules (PLO → Module mapping) to ploToMimlos (PLO → MIMLO mapping).
 * When a module was mapped to a PLO, all MIMLOs of that module become mapped.
 */
function migrateV3toV4(data: any): any {
  console.log("Migrating programme from schema v3 to v4");

  const migrated = {
    ...data,
    schemaVersion: 4,
  };

  // Convert ploToModules to ploToMimlos
  if (migrated.ploToModules && typeof migrated.ploToModules === "object") {
    const ploToMimlos: Record<string, string[]> = {};
    const modules = migrated.modules ?? [];

    Object.entries(migrated.ploToModules).forEach(([ploId, moduleIds]) => {
      const mimloIds: string[] = [];

      ((moduleIds as any) ?? []).forEach((moduleId: string) => {
        const mod = modules.find((m: any) => m.id === moduleId);
        if (mod && Array.isArray(mod.mimlos)) {
          mod.mimlos.forEach((mimlo: any) => {
            if (mimlo.id && !mimloIds.includes(mimlo.id)) {
              mimloIds.push(mimlo.id);
            }
          });
        }
      });

      if (mimloIds.length > 0) {
        ploToMimlos[ploId] = mimloIds;
      }
    });

    migrated.ploToMimlos = ploToMimlos;
    delete migrated.ploToModules;
  }

  // Initialize ploToMimlos if not present
  if (!migrated.ploToMimlos) {
    migrated.ploToMimlos = {};
  }

  migrated.updatedAt = new Date().toISOString();

  return migrated;
}
