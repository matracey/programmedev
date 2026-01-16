/**
 * Sample programme data for Higher Diploma in Computing
 * Used for comprehensive E2E testing
 */
const higherDiplomaComputing = {
  "schemaVersion": 2,
  "id": "hdip-computing-2026",
  "title": "Higher Diploma in Science in Computing",
  "awardType": "Higher Diploma",
  "awardTypeIsOther": false,
  "nfqLevel": 8,
  "school": "Computing",
  "awardStandardId": "computing-level8",
  "awardStandardName": "Computing (Level 8)",
  "totalCredits": 60,
  "mode": "PROGRAMME_OWNER",
  "updatedAt": "2026-01-15T10:00:00.000Z",
  "modules": [
    {
      "id": "mod_sd",
      "code": "CMP8001",
      "title": "Software Development",
      "credits": 10,
      "effortHours": {
        "ver_ft_F2F": {
          "classroomHours": 48,
          "classroomRatio": "1:60",
          "mentoringHours": 12,
          "mentoringRatio": "1:25",
          "otherContactHours": 0,
          "directedElearningHours": 40,
          "independentLearningHours": 140,
          "workBasedHours": 0,
          "otherHours": 10,
          "otherHoursSpecify": "Lab setup"
        }
      },
      "mimlos": [
        { "id": "mimlo_sd_1", "text": "Design and implement object-oriented software solutions using industry-standard programming languages" },
        { "id": "mimlo_sd_2", "text": "Apply software development methodologies to manage the software development lifecycle" },
        { "id": "mimlo_sd_3", "text": "Evaluate and select appropriate data structures and algorithms for specific problem domains" },
        { "id": "mimlo_sd_4", "text": "Demonstrate proficiency in version control and collaborative development practices" }
      ],
      "assessments": [
        {
          "id": "asm_sd_1",
          "title": "Programming Project",
          "type": "Project",
          "weighting": 50,
          "mode": "Hybrid",
          "integrity": { "originalityCheck": true, "aiDeclaration": true, "viva": true },
          "mimloIds": ["mimlo_sd_1", "mimlo_sd_2", "mimlo_sd_4"],
          "notes": "Individual software development project with viva presentation"
        },
        {
          "id": "asm_sd_2",
          "title": "Technical Report",
          "type": "Report/Essay",
          "weighting": 20,
          "mode": "Online",
          "integrity": { "originalityCheck": true, "aiDeclaration": true },
          "mimloIds": ["mimlo_sd_2", "mimlo_sd_3"],
          "notes": "Analysis of software development approaches"
        },
        {
          "id": "asm_sd_3",
          "title": "Practical Lab Exercises",
          "type": "Practical/Lab",
          "weighting": 30,
          "mode": "Hybrid",
          "integrity": { "inClass": true },
          "mimloIds": ["mimlo_sd_1", "mimlo_sd_3", "mimlo_sd_4"],
          "notes": "Weekly lab submissions"
        }
      ],
      "readingList": [
        {
          "type": "Core",
          "title": "Clean Code: A Handbook of Agile Software Craftsmanship",
          "author": "Robert C. Martin",
          "publisher": "Pearson",
          "year": "2023",
          "isbn": "978-0132350884"
        }
      ]
    },
    {
      "id": "mod_db",
      "code": "CMP8003",
      "title": "Introduction to Databases",
      "credits": 5,
      "mimlos": [
        { "id": "mimlo_db_1", "text": "Design normalised relational database schemas using entity-relationship modelling" },
        { "id": "mimlo_db_2", "text": "Implement and query databases using SQL" },
        { "id": "mimlo_db_3", "text": "Evaluate database performance and apply indexing strategies" }
      ],
      "assessments": [
        {
          "id": "asm_db_1",
          "title": "Database Design Project",
          "type": "Project",
          "weighting": 40,
          "mode": "Hybrid",
          "mimloIds": ["mimlo_db_1", "mimlo_db_2"]
        },
        {
          "id": "asm_db_2",
          "title": "Final Examination",
          "type": "Exam (On campus)",
          "weighting": 60,
          "mode": "OnCampus",
          "mimloIds": ["mimlo_db_1", "mimlo_db_2", "mimlo_db_3"]
        }
      ]
    }
  ],
  "plos": [
    {
      "id": "plo_1",
      "text": "Design, develop and test software applications using object-oriented programming principles and industry-standard development practices",
      "standardMappings": [
        { "criteria": "Knowledge", "thread": "Breadth" },
        { "criteria": "Know-how & Skill", "thread": "Range" }
      ]
    },
    {
      "id": "plo_2",
      "text": "Apply software engineering methodologies to plan, manage and deliver software projects within professional contexts",
      "standardMappings": [
        { "criteria": "Know-how & Skill", "thread": "Selectivity" },
        { "criteria": "Competence", "thread": "Context" }
      ]
    },
    {
      "id": "plo_3",
      "text": "Design and implement database solutions using relational database management systems and SQL",
      "standardMappings": [
        { "criteria": "Knowledge", "thread": "Kind" },
        { "criteria": "Know-how & Skill", "thread": "Range" }
      ]
    },
    {
      "id": "plo_4",
      "text": "Create responsive and accessible web applications using modern web technologies and frameworks",
      "standardMappings": []
    },
    {
      "id": "plo_5",
      "text": "Demonstrate understanding of computer architecture, operating systems and network fundamentals",
      "standardMappings": []
    },
    {
      "id": "plo_6",
      "text": "Work effectively in agile software development teams, applying iterative development practices",
      "standardMappings": []
    }
  ],
  "ploToModules": {
    "plo_1": ["mod_sd"],
    "plo_2": ["mod_sd"],
    "plo_3": ["mod_db"],
    "plo_4": [],
    "plo_5": [],
    "plo_6": []
  },
  "versions": [
    {
      "id": "ver_ft",
      "label": "Full-time",
      "code": "FT",
      "duration": "1 year",
      "intakes": ["September"],
      "targetCohortSize": 60,
      "numberOfGroups": 2,
      "deliveryModality": "F2F",
      "deliveryPatterns": {
        "F2F": {
          "syncOnlinePct": 10,
          "asyncDirectedPct": 20,
          "onCampusPct": 70
        }
      },
      "deliveryNotes": "Primary delivery through on-campus lectures and labs.",
      "onlineProctoredExams": "NO",
      "onlineProctoredExamsNotes": "",
      "stages": [
        {
          "id": "stage_ft_1",
          "name": "Stage 1",
          "sequence": 1,
          "creditsTarget": 15,
          "exitAward": { "enabled": false, "awardTitle": "" },
          "modules": [
            { "moduleId": "mod_sd", "semester": "Semester 1" },
            { "moduleId": "mod_db", "semester": "Semester 1" }
          ]
        }
      ]
    }
  ]
};

/**
 * Module Editor View test data
 */
const moduleEditorViewData = {
  "schemaVersion": 2,
  "id": "hdip-computing-2026",
  "title": "Higher Diploma in Science in Computing",
  "awardType": "Higher Diploma",
  "nfqLevel": 8,
  "school": "Computing",
  "totalCredits": 60,
  "mode": "MODULE_EDITOR",
  "moduleEditor": {
    "assignedModuleIds": ["mod_sd", "mod_db"],
    "locks": {
      "programme": true,
      "modulesMeta": true,
      "versions": true,
      "plos": true
    }
  },
  "modules": [
    {
      "id": "mod_sd",
      "code": "CMP8001",
      "title": "Software Development",
      "credits": 10,
      "mimlos": [
        { "id": "mimlo_sd_1", "text": "Design and implement object-oriented software solutions" }
      ],
      "assessments": []
    },
    {
      "id": "mod_db",
      "code": "CMP8003",
      "title": "Introduction to Databases",
      "credits": 5,
      "mimlos": [],
      "assessments": []
    }
  ],
  "plos": [
    { "id": "plo_1", "text": "Design, develop and test software applications", "standardMappings": [] },
    { "id": "plo_2", "text": "Apply software engineering methodologies", "standardMappings": [] },
    { "id": "plo_3", "text": "Design and implement database solutions", "standardMappings": [] },
    { "id": "plo_4", "text": "Create responsive web applications", "standardMappings": [] },
    { "id": "plo_5", "text": "Demonstrate understanding of computer architecture", "standardMappings": [] },
    { "id": "plo_6", "text": "Work effectively in agile teams", "standardMappings": [] }
  ],
  "ploToModules": {
    "plo_1": ["mod_sd"],
    "plo_3": ["mod_db"]
  },
  "versions": [
    {
      "id": "ver_ft",
      "label": "Full-time",
      "code": "FT",
      "duration": "1 year",
      "intakes": ["September"],
      "targetCohortSize": 60,
      "numberOfGroups": 2,
      "deliveryModality": "F2F",
      "deliveryPatterns": { "F2F": { "syncOnlinePct": 10, "asyncDirectedPct": 20, "onCampusPct": 70 } },
      "onlineProctoredExams": "NO",
      "stages": [
        {
          "id": "stage_ft_1",
          "name": "Stage 1",
          "sequence": 1,
          "creditsTarget": 15,
          "exitAward": { "enabled": false, "awardTitle": "" },
          "modules": [
            { "moduleId": "mod_sd", "semester": "Semester 1" },
            { "moduleId": "mod_db", "semester": "Semester 1" }
          ]
        }
      ]
    }
  ]
};

export { higherDiplomaComputing, moduleEditorViewData };
