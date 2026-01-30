/**
 * Global type declarations for the Programme Design Studio
 */

interface Window {
  /** Global render function for re-rendering the UI */
  render?: () => void | Promise<void>;
  /** Internal state exposed for testing */
  __pds_state?: {
    programme: Programme;
  };
  /** Bootstrap library */
  bootstrap?: {
    Popover: {
      new(element: Element, options?: object): { dispose(): void };
      getInstance(element: Element): { dispose(): void } | null;
      getOrCreateInstance(element: Element, options?: object): { show(): void; hide(): void };
    };
    Collapse: {
      new(element: Element, options?: object): { show(): void; hide(): void };
      getInstance(element: Element): { show(): void; hide(): void } | null;
      getOrCreateInstance(element: Element, options?: object): { show(): void; hide(): void };
    };
  };
}

/**
 * Programme data structure
 */
interface Programme {
  schemaVersion: number;
  id: string;
  title: string;
  awardType: string;
  awardTypeIsOther: boolean;
  nfqLevel: number | null;
  school: string;
  awardStandardIds: string[];
  awardStandardNames: string[];
  totalCredits: number;
  electiveDefinitions: ElectiveDefinition[];
  intakeMonths?: string[];
  modules?: Module[];
  plos?: PLO[];
  ploToModules?: Record<string, string[]>;
  versions?: ProgrammeVersion[];
  updatedAt?: string | null;
  mode?: string;
  moduleEditor?: { assignedModuleIds?: string[] };
  [key: string]: unknown;
}

interface ElectiveDefinition {
  id: string;
  name: string;
  code: string;
  credits: number;
  groups: ElectiveGroup[];
}

interface ElectiveGroup {
  id: string;
  name: string;
  code: string;
  moduleIds: string[];
}

interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

interface AwardStandard {
  id: string;
  name: string;
}

interface Module {
  id: string;
  title: string;
  code: string;
  credits: number;
  isElective?: boolean;
  stage?: number;
  semester?: number;
  moduleLeadName?: string;
  moduleLeadEmail?: string;
  mimlos?: MIMLO[];
  assessments?: ModuleAssessment[];
  effortHours?: Record<string, any>;
  readingList?: ReadingListItem[];
  [key: string]: unknown;
}

interface MIMLO {
  id: string;
  text: string;
  [key: string]: unknown;
}

interface ModuleAssessment {
  id: string;
  type: string;
  title?: string;
  weighting?: number;
  weight?: number;
  text?: string;
  mode?: string;
  integrity?: Record<string, boolean>;
  mimloIds?: string[];
  notes?: string;
  [key: string]: unknown;
}

interface ReadingListItem {
  id: string;
  type?: string;
  citation?: string;
  author?: string;
  title?: string;
  publisher?: string;
  year?: string;
  isbn?: string;
  notes?: string;
  isCore?: boolean;
  [key: string]: unknown;
}

interface PLO {
  id: string;
  code?: string;
  text: string;
  standardMappings?: Array<{
    standardId?: string;
    criteria: string;
    thread: string;
    [key: string]: unknown;
  }>;
  [key: string]: unknown;
}

interface ProgrammeVersion {
  id: string;
  label: string;
  code: string;
  deliveryModality?: string;
  targetAudience?: string;
  deliveryPatterns?: Record<string, any>;
  stages?: Stage[];
  effortConfig?: Record<string, any>;
  intakes?: string[];
  startMonth?: string;
  durationWeeks?: number;
  admissionsDeadline?: string;
  duration?: string;
  targetCohortSize?: number;
  numberOfGroups?: number;
  deliveryNotes?: string;
  onlineProctoredExams?: string;
  onlineProctoredExamsNotes?: string;
  [key: string]: unknown;
}

interface Stage {
  id: string;
  name?: string;
  sequence?: number;
  creditsTarget?: number;
  modules?: Array<{ moduleId: string; semester?: string }>;
  moduleIds?: string[];
  exitAward?: {
    enabled?: boolean;
    awardTitle?: string;
  };
  [key: string]: unknown;
}
