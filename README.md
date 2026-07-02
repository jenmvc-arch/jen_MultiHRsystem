# 💼 Mega HR — Enterprise Core Console

Mega HR is a premium, high-performance corporate console designed for managing personnel directory, employee appraisals, real-time payroll records, and statutory compliance.

Originally backed by Supabase, the database layer and file storage have been fully migrated to use **Google Sheets** (as a relational data store) and **Google Drive** (for secure, public graphic asset hosting) via a serverless **Google Apps Script Web App** proxy.

---

## 🚀 Features
- **Interactive Dashboard**: Real-time overview of active personnel counts, subsidiary distribution, and review cycles.
- **Dynamic Employee Directory**: Multi-tab personnel profiles tracking career progression history, emergency contacts, dependants, and document uploads.
- **Consolidated Payroll Processing**: Automated calculations for basic salary, housing and transport allowances, employee/employer statutory contributions (EPF, SOCSO, EIS), tax PCB, and unpaid leaves.
- **PDF Payslip Generation**: Direct download of professional, printable A4 payslips powered by a local Puppeteer PDF printer.
- **Performance Appraisals**: Scoring panels for teamwork, communication, and problem-solving, along with appraisal state tracking and goal management.

---

## 🛠️ Google Sheets & Drive Setup

Follow these steps to connect your local HR Nexus application to your own Google Account database:

### 1. Create Spreadsheet & Folder
1. Create a blank **Google Spreadsheet**. Copy the **Spreadsheet ID** from the URL (the long code between `/d/` and `/edit`).
2. Create a folder in **Google Drive** to store employee photos. Copy the **Folder ID** from the URL (the long code at the end of the folder path).

### 2. Add Google Apps Script
1. Open your Google Spreadsheet, click **Extensions -> Apps Script** (use an Incognito window if you run into Google multi-login errors).
2. Delete the default template and paste the script below:

```javascript
const SPREADSHEET_ID = "YOUR_SPREADSHEET_ID_HERE";
const DRIVE_FOLDER_ID = "YOUR_DRIVE_FOLDER_ID_HERE";

function getSpreadsheet() {
  return SpreadsheetApp.openById(SPREADSHEET_ID);
}

const SCHEMA = {
  "corporate_entities": ["id", "name", "registrationNumber", "address", "taxReferenceNo", "epfReferenceNo", "socsoReferenceNo", "currency", "isActive", "theme", "logoUrl"],
  "employees": ["id", "entityId", "name", "email", "designation", "department", "status", "bankName", "accountNo", "basicSalary", "housingAllowance", "transportAllowance", "overtime", "performanceBonus", "epfRateEmployee", "epfRateEmployer", "socsoEmployee", "socsoEmployer", "eisEmployee", "eisEmployer", "taxPcb", "unpaidLeave", "hrdCorp", "avatarUrl", "nricPassport", "nationality", "contactNumber", "taxNumber", "epfNumber", "employmentType", "maritalStatus", "eligibleForStatutory", "emergencyContactName", "emergencyContactRelation", "emergencyContactPhone", "dateOfJoined", "careerHistory", "dependants", "allowanceGeneral", "allowanceTransport", "allowanceParking", "allowanceMeal", "allowanceAccommodation", "allowancePhone", "reimbursementAmount", "reimbursementDesc", "bonusAmount", "bonusDesc", "commissionAmount", "commissionDesc", "backPayAmount", "backPayDesc", "awsAmount", "awsDesc", "compensationAmount", "compensationDesc", "deductionInLieu", "deductionCp38", "deductionOthers", "deductionOthersDesc", "spouseName", "spouseNric", "spouseIsWorking", "spouseCompany", "spousePosition", "hasDependants", "icFrontUrl", "icBackUrl", "educationCertUrl", "skbbkEmployee", "skbbkEmployer"],
  "performances": ["employeeId", "reviewCycleId", "managerName", "reviewStatus", "rating", "teamworkScore", "communicationScore", "problemSolvingScore", "selfEvaluation", "managerComments", "goals"],
  "users": ["email", "password", "name", "role"],
  "audit_logs": ["id", "employeeId", "changedBy", "changeType", "oldValue", "newValue", "createdAt"]
};

function initializeDatabase() {
  const ss = getSpreadsheet();
  for (let sheetName in SCHEMA) {
    let sheet = ss.getSheetByName(sheetName);
    if (!sheet) {
      sheet = ss.insertSheet(sheetName);
      sheet.appendRow(SCHEMA[sheetName]);
    } else {
      const data = sheet.getDataRange().getValues();
      const existingHeaders = data[0] || [];
      const schemaHeaders = SCHEMA[sheetName];
      const missingHeaders = schemaHeaders.filter(h => !existingHeaders.includes(h));
      if (missingHeaders.length > 0) {
        sheet.insertColumnsAfter(existingHeaders.length, missingHeaders.length);
        const nextCol = existingHeaders.length + 1;
        sheet.getRange(1, nextCol, 1, missingHeaders.length).setValues([missingHeaders]);
      }
    }
  }
}

function doGet(e) {
  try {
    initializeDatabase();
    const ss = getSpreadsheet();
    const result = {};
    for (let sheetName in SCHEMA) {
      const sheet = ss.getSheetByName(sheetName);
      const data = sheet.getDataRange().getValues();
      const headers = data[0];
      const rows = [];
      for (let i = 1; i < data.length; i++) {
        const rowObj = {};
        for (let j = 0; j < headers.length; j++) {
          rowObj[headers[j]] = data[i][j];
        }
        rows.push(rowObj);
      }
      result[sheetName] = rows;
    }
    return ContentService.createTextOutput(JSON.stringify({ success: true, data: result }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({ success: false, error: error.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function doPost(e) {
  try {
    initializeDatabase();
    const payload = JSON.parse(e.postData.contents);
    const action = payload.action;
    const data = payload.data;
    const ss = getSpreadsheet();
    
    if (action === "upload_file") {
      const folder = DriveApp.getFolderById(DRIVE_FOLDER_ID);
      const contentType = payload.contentType || "image/png";
      const blob = Utilities.newBlob(Utilities.base64Decode(payload.base64), contentType, payload.filename);
      const file = folder.createFile(blob);
      file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
      const fileUrl = "https://lh3.googleusercontent.com/d/" + file.getId() + "=s800";
      return ContentService.createTextOutput(JSON.stringify({ success: true, url: fileUrl }))
        .setMimeType(ContentService.MimeType.JSON);
    }
    
    const sheet = ss.getSheetByName(payload.sheetName);
    if (!sheet) throw new Error("Sheet not found: " + payload.sheetName);
    const headers = SCHEMA[payload.sheetName];
    
    if (action === "insert") {
      const newRow = headers.map(h => data[h] !== undefined ? data[h] : "");
      sheet.appendRow(newRow);
      return ContentService.createTextOutput(JSON.stringify({ success: true }))
        .setMimeType(ContentService.MimeType.JSON);
    } else if (action === "update") {
      const allRows = sheet.getDataRange().getValues();
      const idColIndex = headers.indexOf(payload.keyName || "id");
      let foundIndex = -1;
      for (let i = 1; i < allRows.length; i++) {
        if (String(allRows[i][idColIndex]) === String(payload.keyValue)) {
          foundIndex = i + 1;
          break;
        }
      }
      if (foundIndex === -1) throw new Error("Record not found");
      const updatedRow = headers.map((h, j) => data[h] !== undefined ? data[h] : allRows[foundIndex - 1][j]);
      sheet.getRange(foundIndex, 1, 1, headers.length).setValues([updatedRow]);
      return ContentService.createTextOutput(JSON.stringify({ success: true }))
        .setMimeType(ContentService.MimeType.JSON);
    } else if (action === "delete") {
      const allRows = sheet.getDataRange().getValues();
      const idColIndex = headers.indexOf(payload.keyName || "id");
      let foundIndex = -1;
      for (let i = 1; i < allRows.length; i++) {
        if (String(allRows[i][idColIndex]) === String(payload.keyValue)) {
          foundIndex = i + 1;
          break;
        }
      }
      if (foundIndex !== -1) sheet.deleteRow(foundIndex);
      return ContentService.createTextOutput(JSON.stringify({ success: true }))
        .setMimeType(ContentService.MimeType.JSON);
    } else if (action === "upsert") {
      const allRows = sheet.getDataRange().getValues();
      let foundIndex = -1;
      for (let i = 1; i < allRows.length; i++) {
        let match = true;
        for (let key in payload.query) {
          const colIdx = headers.indexOf(key);
          if (colIdx === -1 || String(allRows[i][colIdx]) !== String(payload.query[key])) {
            match = false;
            break;
          }
        }
        if (match) {
          foundIndex = i + 1;
          break;
        }
      }
      if (foundIndex !== -1) {
        const updatedRow = headers.map((h, j) => data[h] !== undefined ? data[h] : allRows[foundIndex - 1][j]);
        sheet.getRange(foundIndex, 1, 1, headers.length).setValues([updatedRow]);
      } else {
        const newRow = headers.map(h => data[h] !== undefined ? data[h] : "");
        sheet.appendRow(newRow);
      }
      return ContentService.createTextOutput(JSON.stringify({ success: true }))
        .setMimeType(ContentService.MimeType.JSON);
    }
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({ success: false, error: error.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}
```

3. Replace your Spreadsheet and Folder ID constants at the top of the file, save, and click **Deploy -> New Deployment**.
4. Configure as a **Web App**, set Execute as to **"Me"**, and Who has access to **"Anyone"**.
5. Copy the generated Web App URL.

### 3. Add Account Details (Optional)
To log in with the default admin accounts on your spreadsheet, add a row to the **`users`** sheet in Google Sheets:
- **email**: `jennylaw.hr`
- **password**: `admin123#`
- **name**: `Jenny Law`
- **role**: `Global Administrator`

---

## 🚀 Running Locally

**Prerequisites:** Node.js (v18+)

1. Clone or download the repository.
2. Install dependencies:
   ```bash
   npm install
   ```
3. Create your local config file:
   Copy `.env.example` to `.env.local` and add your Google Script Web App URL:
   ```env
   VITE_GOOGLE_SCRIPT_URL="https://script.google.com/macros/s/your_deployment_id/exec"
   ```
4. Start the frontend developer server (Vite):
   ```bash
   npm run dev
   ```
5. Start the PDF rendering backend (Express + Puppeteer):
   ```bash
   npm run server
   ```
