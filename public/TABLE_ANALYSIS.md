# Programme Schedule Template - Complete Analysis

## Document Summary

- **File**: Programme Schedule Template.doc
- **File Size**: 119,220 bytes
- **File Format**: Office Open XML (DOCX format)
- **Tables**: 1 main table
- **Total Rows**: 15
- **Total Column Grid**: 29 columns (collapses to 16 in data section)

---

## 1. TABLE OVERVIEW

| Aspect           | Details                       |
| ---------------- | ----------------------------- |
| Number of Tables | 1                             |
| Total Rows       | 15                            |
| Grid Columns     | 29                            |
| Data Entry Rows  | 2 (rows 14-15, expandable)    |
| Merged Cells     | 14 cells with rowspan/colspan |
| Nested Tables    | 0                             |

---

## 2. COMPLETE TABLE STRUCTURE

### Section 1: Title & Meta Info (Rows 1-4)

**Row 1 - Title & Instruction**

- colspan: 29 (full width)
- Content: "1B.5 Proposed Programme Schedule(s)" + instruction text
- All rows marked as header rows in XML

**Row 2 - Provider Name**

- Cell 1: "Name of Provider:" (colspan 3)
- Cell 2: Empty input field (colspan 26)

**Row 3 - Programme Title**

- Cell 1: "Programme Title (Principal)" (colspan 3)
- Cell 2-6: Various input fields with different colspans (7, 5, 11, 2, 1)
- Special: "ECTS" label in Cell 5

**Row 4 - Stage Information**

- Cell 1: "Stage (1,2,3, Award etc)" (colspan 3)
- Cell 3: "Exit Award Title (if relevant)" (colspan 5)
- Cell 5: "Stage ECTS" (colspan 2)
- Other cells: Empty input fields

### Section 2: Delivery Mode (Rows 5-6) - VERTICALLY MERGED

**Row 5 - Delivery Mode Header**

```text
Cell 1 (rowspan=2, colspan=3): "Programme Delivery Mode – ✔ one as appropriate."
Cell 2 (colspan=5):  "On-site Face-to-Face"
Cell 3 (colspan=6):  "Blended"
Cell 4 (colspan=6):  "Online"
Cell 5 (colspan=9):  "Apprenticeship"
```

**Row 6 - Checkboxes for Delivery Mode**

```text
Cell 1: Continuation of rowspan from Row 5
Cells 2-5: Empty (for checkbox marks)
```

### Section 3: Teaching & Learning Modalities (Rows 7-8) - VERTICALLY MERGED

**Row 7 - Modalities Header**

```text
Cell 1 (rowspan=2, colspan=3): "Teaching and Learning Modalities – ✔ one or more as appropriate."
Cell 2 (colspan=4):  "On-site Face-to-Face"
Cell 3 (colspan=4):  "Synchronous Hybrid"
Cell 4 (colspan=6):  "Synchronous Online"
Cell 5 (colspan=4):  "Asynchronous"
Cell 6 (colspan=3):  "Independent"
Cell 7 (colspan=5):  "Work Based"
```

**Row 8 - Modalities Checkboxes**

```text
Cell 1: Continuation of rowspan
Cells 2-7: Empty (for checkbox marks)
```

### Section 4: Assessment Techniques (Rows 9-10) - VERTICALLY MERGED

**Row 9 - Assessment Header**

```text
Cell 1 (rowspan=2, colspan=3): "Assessment Techniques Utilised in Stage – ✔ one or more as appropriate."
Cell 2 (colspan=4):  "Continuous Assessment"
Cell 3 (colspan=4):  "Invigilated Exam – in person"
Cell 4 (colspan=6):  "Proctored Exam - online"
Cell 5 (colspan=4):  "Project"
Cell 6 (colspan=3):  "Practical Skills Demonstration"
Cell 7 (colspan=5):  "Work Based"
```

**Row 10 - Assessment Checkboxes**

```text
Cell 1: Continuation of rowspan
Cells 2-7: Empty (for checkbox marks)
```

### Section 5: Modules Header (Row 11)

**Row 11 - Module Section Title**

- colspan: 29 (full width)
- Content: "Modules in this stage (add rows as required)"
- Separates form section from data table

### Section 6: Modules Data Table (Rows 12-15)

**Row 12 - Grouped Header (2-level)**

```text
Cell 1 (colspan 8):  Empty (aligns with module info)
Cell 2 (colspan 11): "Total Student Effort Module (hours)"
                     └─ Spans columns 6-10 below
Cell 3 (colspan 10): "Assessment – Allocation of Marks (from the module assessment strategy)"
                     └─ Spans columns 11-16 below
```

**Row 13 - Column Headers (16 columns)**

| #   | Header                           | colspan | Section     |
| --- | -------------------------------- | ------- | ----------- |
| 1   | Module Title                     | 1       | Module Info |
| 2   | Semester                         | 1       | Module Info |
| 3   | Mandatory (M) or Elective (E)    | 2       | Module Info |
| 4   | Credits (ECTS)                   | 2       | Module Info |
| 5   | Total Hours                      | 2       | Module Info |
| 6   | On-site Face-to-Face             | 1       | Effort      |
| 7   | Synchronous                      | 3       | Effort      |
| 8   | Asynchronous                     | 1       | Effort      |
| 9   | Independent                      | 3       | Effort      |
| 10  | Work Based                       | 2       | Effort      |
| 11  | Continuous Assessment %          | 2       | Assessment  |
| 12  | Invigilated Exam – in person %   | 2       | Assessment  |
| 13  | Proctored Exam – online %        | 1       | Assessment  |
| 14  | Project                          | 2       | Assessment  |
| 15  | Practical Skills Demonstration % | 2       | Assessment  |
| 16  | Work Based %                     | 2       | Assessment  |

**Rows 14-15 - Empty Data Template**

- Both rows have identical structure to Row 13
- 16 cells each with appropriate colspan attributes
- Ready for user to fill in module data
- Can be copied and pasted to add more module rows

---

## 3. MERGED CELLS MAPPING

### Vertical Merges (rowspan)

| Location     | Content                                          | Rows | Notes     |
| ------------ | ------------------------------------------------ | ---- | --------- |
| Row 5, Col 1 | "Programme Delivery Mode – ✔..."                 | 5-6  | rowspan=2 |
| Row 7, Col 1 | "Teaching and Learning Modalities – ✔..."        | 7-8  | rowspan=2 |
| Row 9, Col 1 | "Assessment Techniques Utilised in Stage – ✔..." | 9-10 | rowspan=2 |

### Horizontal Merges (colspan) - Summary

```text
Row 1:   [29] - Title only
Row 2:   [3] [26] - Provider
Row 3:   [3] [7] [5] [11] [2] [1] - Programme title
Row 4:   [3] [2] [5] [16] [2] [1] - Stage
Row 5:   [3,rs2] [5] [6] [6] [9] - Delivery mode
Row 6:   [3,rs2,cont] [5] [6] [6] [9] - Checkboxes
Row 7:   [3,rs2] [4] [4] [6] [4] [3] [5] - Modalities
Row 8:   [3,rs2,cont] [4] [4] [6] [4] [3] [5] - Checkboxes
Row 9:   [3,rs2] [4] [4] [6] [4] [3] [5] - Assessment
Row 10:  [3,rs2,cont] [4] [4] [6] [4] [3] [5] - Checkboxes
Row 11:  [29] - Section header
Row 12:  [8] [11] [10] - Grouped headers
Row 13:  1,1,2,2,2,1,3,1,3,2,2,2,1,2,2,2 = 16 cells (data headers)
Row 14:  1,1,2,2,2,1,3,1,3,2,2,2,1,2,2,2 = 16 cells (data template)
Row 15:  1,1,2,2,2,1,3,1,3,2,2,2,1,2,2,2 = 16 cells (data template)
```

---

## 4. CELL CONTENT REFERENCE

### All Header & Label Cells (Exact Text)

#### Form Section Headers

- "1B.5 Proposed Programme Schedule(s)"
- "Copy and paste the template for each additional stage of the programme. Create a version of the schedule for each different version of the programme also i.e. f/t, p/t, blended etc"

#### Provider & Programme Info

- "Name of Provider:"
- "Programme Title (Principal)"
- "Stage (1,2,3, Award etc)"
- "Exit Award Title (if relevant)"
- "ECTS"
- "Stage ECTS"

#### Delivery Modes (Row 5)

- "Programme Delivery Mode – ✔ one as appropriate."
- "On-site Face-to-Face"
- "Blended"
- "Online"
- "Apprenticeship"

#### Teaching & Learning Modalities (Row 7)

- "Teaching and Learning Modalities – ✔ one or more as appropriate."
- "On-site Face-to-Face"
- "Synchronous Hybrid"
- "Synchronous Online"
- "Asynchronous"
- "Independent"
- "Work Based"

#### Assessment Techniques (Row 9)

- "Assessment Techniques Utilised in Stage – ✔ one or more as appropriate."
- "Continuous Assessment"
- "Invigilated Exam – in person"
- "Proctored Exam - online"
- "Project"
- "Practical Skills Demonstration"
- "Work Based"

#### Module Section

- "Modules in this stage (add rows as required)"
- "Total Student Effort Module (hours)"
- "Assessment – Allocation of Marks (from the module assessment strategy)"

#### Module Column Headers (Row 13)

See section 2 above for complete list.

---

## 5. FORMATTING & STYLING

### Colors

- **Header sections**: Light blue background (#d9e1f2)
- **Form labels**: Light gray background (#e7e6e6)
- **Checkbox rows**: Very light gray background (#f2f2f2)
- **Data cells**: White background
- **Borders**: 1px solid black on all cells

### Typography

- **Font**: Calibri, 11pt
- **Headers**: Bold weight
- **Instruction text**: 10pt
- **Cell padding**: 6px

### Special Elements

- "✔" checkbox symbol appears in rows 5, 7, and 9
- Table nesting: None detected
- Embedded objects: None
- Images: None

---

## 6. DATA ENTRY STRUCTURE

### Expandable Module Section

- **Template rows**: 14-15
- **Structure**: Identical column layout to Row 13
- **Purpose**: Users can copy-paste these rows to add modules
- **No limit**: Rows can be duplicated indefinitely

### Row 13 Column Sequence (for reference when adding rows)

```text
Module Title | Semester | Mandatory/Elective | Credits | Total Hrs |
Effort Hours (5 types) | Assessment Marks (6 types)
```

---

## 7. FILES GENERATED

1. **Programme_Schedule_Template.html** - Fully functional HTML recreation
   - Copy-paste ready for Word
   - Preserves all colspan/rowspan attributes
   - Matches original formatting and structure
   - Includes instruction notes

2. **TABLE_STRUCTURE_VISUAL.txt** - Visual ASCII diagrams
   - Shows table layout with merged cells
   - Column mapping reference
   - Detailed formatting specification

3. **TABLE_ANALYSIS.md** - This document
   - Complete structural analysis
   - All cell content enumeration
   - Merge mapping and formatting details

---

## 8. USAGE INSTRUCTIONS

### For HTML Paste into Word

1. Open the HTML file in a browser
2. Select all (Ctrl+A)
3. Copy (Ctrl+C)
4. Open Word document
5. Position cursor where table should go
6. Paste (Ctrl+V)
7. Right-click → Table → AutoFit → AutoFit Window (optional)

### For Adding Module Rows

1. Copy rows 14-15 entirely
2. Paste at end of table
3. Repeat as needed for additional modules

### For Different Delivery Modes

1. Copy entire table
2. Modify delivery mode/modality/assessment rows
3. Paste for each different version (f/t, p/t, blended, etc.)

---

## 9. SPECIAL NOTES

- **Vertical merges preserve text** in top cell, empty cells below
- **Checkbox symbols** (✔) are built-in Unicode, not images
- **Column grid consistency**: 29 total columns maintained throughout
- **No nested tables**: All structure is single-level table
- **Fully accessible**: All cells properly tagged as header or data
- **Word-compatible**: HTML structure uses standard table markup readable by Word

---

Generated: 2026-01-31
Analysis Tool: Word Document XML Parser
