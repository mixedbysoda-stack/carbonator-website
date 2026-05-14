// Google Apps Script — Carbonator Lead Backup
// Deploy this as a Web App in Google Apps Script
//
// SETUP STEPS:
// 1. Go to https://script.google.com and create a new project
// 2. Paste this entire file into Code.gs
// 3. Click Run > doGet once to authorize (it will ask for Sheets permission)
// 4. Click Deploy > New deployment
// 5. Type: Web app
// 6. Execute as: Me
// 7. Who has access: Anyone
// 8. Copy the URL and update your website's frontend code
//
// The script will auto-create a "Carbonator Leads" spreadsheet on first run.

var SHEET_NAME = "Leads";
var SPREADSHEET_NAME = "Carbonator Leads";

function getOrCreateSpreadsheet() {
  var files = DriveApp.getFilesByName(SPREADSHEET_NAME);
  if (files.hasNext()) {
    return SpreadsheetApp.open(files.next());
  }
  var ss = SpreadsheetApp.create(SPREADSHEET_NAME);
  var sheet = ss.getActiveSheet();
  sheet.setName(SHEET_NAME);
  sheet.appendRow(["Timestamp", "Email", "Source"]);
  sheet.getRange("1:1").setFontWeight("bold");
  sheet.setColumnWidth(1, 200);
  sheet.setColumnWidth(2, 300);
  sheet.setColumnWidth(3, 150);
  return ss;
}

function doGet(e) {
  var contact = (e && e.parameter && e.parameter.contact) || "";
  var source = (e && e.parameter && e.parameter.source) || "demo-gate";

  if (!contact) {
    return ContentService.createTextOutput(
      JSON.stringify({ success: false, error: "Missing contact" })
    ).setMimeType(ContentService.MimeType.JSON);
  }

  var ss = getOrCreateSpreadsheet();
  var sheet = ss.getSheetByName(SHEET_NAME) || ss.getActiveSheet();
  sheet.appendRow([new Date().toISOString(), contact, source]);

  return ContentService.createTextOutput(
    JSON.stringify({ success: true })
  ).setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  // Handle POST requests too (future-proofing)
  var data = {};
  try {
    data = JSON.parse(e.postData.contents);
  } catch (err) {
    data.contact = e.parameter.contact || "";
    data.source = e.parameter.source || "demo-gate";
  }

  var contact = (data.contact || "").trim();
  var source = data.source || "demo-gate";

  if (!contact) {
    return ContentService.createTextOutput(
      JSON.stringify({ success: false, error: "Missing contact" })
    ).setMimeType(ContentService.MimeType.JSON);
  }

  var ss = getOrCreateSpreadsheet();
  var sheet = ss.getSheetByName(SHEET_NAME) || ss.getActiveSheet();
  sheet.appendRow([new Date().toISOString(), contact, source]);

  return ContentService.createTextOutput(
    JSON.stringify({ success: true })
  ).setMimeType(ContentService.MimeType.JSON);
}
