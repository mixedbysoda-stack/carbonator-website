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
// Configure Script Properties before deployment:
// - LEAD_SYNC_TOKEN: a strong secret shared only with the Netlify function.
// This script rejects browser calls without that secret. Netlify Blobs remains
// the system of record; this sheet is the consolidated reporting view.
//
// Every current capture includes an event_id. The script remembers each synced
// event id in Script Properties before returning, so a retry can never inflate
// Lead Count. Do not remove this safeguard or re-enable the old bulk backfill.

var SHEET_NAME = "Leads";
var SPREADSHEET_ID = "1ZMd3RRADECqcMav1w94w4CztyqG_IeRgddQ_42S4TJ4";

function getSpreadsheet() {
  return SpreadsheetApp.openById(SPREADSHEET_ID);
}

function ensureHeaders(sheet) {
  // Keep the first seven columns stable for the existing reporting view, then
  // expose current attribution without creating a separate Sheet or duplicating
  // people. Historic rows remain valid; they simply have blank attribution
  // columns until an event with that data is synced.
  var headers = [
    "First Captured", "Email", "First Source", "Latest Source", "Lead Count", "Last Captured", "Drip Status",
    "First Landing Page", "Latest Landing Page", "Latest Referrer",
    "Latest UTM Source", "Latest UTM Medium", "Latest UTM Campaign"
  ];
  var current = sheet.getRange(1, 1, 1, headers.length).getValues()[0];
  if (current.join("|") !== headers.join("|")) {
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    sheet.getRange("1:1").setFontWeight("bold");
    sheet.setFrozenRows(1);
    sheet.setColumnWidth(1, 185);
    sheet.setColumnWidth(2, 300);
    sheet.setColumnWidth(3, 180);
    sheet.setColumnWidth(4, 180);
    sheet.setColumnWidth(5, 100);
    sheet.setColumnWidth(6, 185);
    sheet.setColumnWidth(7, 140);
    sheet.setColumnWidth(8, 180);
    sheet.setColumnWidth(9, 180);
    sheet.setColumnWidth(10, 180);
    sheet.setColumnWidth(11, 150);
    sheet.setColumnWidth(12, 150);
    sheet.setColumnWidth(13, 180);
  }
}

// Run this manually once after deploying a schema update when you want the
// reporting columns to appear immediately, without waiting for the next lead.
function setupSheetHeaders() {
  var ss = getSpreadsheet();
  var sheet = ss.getSheetByName(SHEET_NAME) || ss.getActiveSheet();
  ensureHeaders(sheet);
  return "Lead headers are up to date.";
}

function json(data) {
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

function doGet() {
  return json({ success: false, error: "POST only" });
}

function doPost(e) {
  var data = {};
  try {
    data = JSON.parse(e.postData.contents || "{}");
  } catch (err) {
    return json({ success: false, error: "Invalid JSON" });
  }

  var expectedToken = PropertiesService.getScriptProperties().getProperty("LEAD_SYNC_TOKEN");
  if (!expectedToken || data.sync_token !== expectedToken) {
    return json({ success: false, error: "Unauthorized" });
  }

  var contact = String(data.contact || "").trim().toLowerCase();
  if (!contact) return json({ success: false, error: "Missing contact" });

  var eventId = String(data.event_id || "").trim();
  var properties = PropertiesService.getScriptProperties();
  var eventProperty = eventId ? "lead_event_" + eventId : "";
  if (eventProperty && properties.getProperty(eventProperty)) {
    return json({ success: true, action: "duplicate" });
  }

  var source = String(data.source || "unknown");
  var timestamp = data.timestamp || new Date().toISOString();
  var dripStatus = String(data.drip_status || "unknown");
  var landingPage = String(data.landing_page || "");
  var referrer = String(data.referrer || "");
  var utmSource = String(data.utm_source || "");
  var utmMedium = String(data.utm_medium || "");
  var utmCampaign = String(data.utm_campaign || "");
  var ss = getSpreadsheet();
  var sheet = ss.getSheetByName(SHEET_NAME) || ss.getActiveSheet();
  ensureHeaders(sheet);

  var emailColumn = sheet.getRange(2, 2, Math.max(sheet.getLastRow() - 1, 1), 1);
  var match = emailColumn.createTextFinder(contact).matchCase(false).matchEntireCell(true).findNext();

  if (match) {
    var row = match.getRow();
    var existing = sheet.getRange(row, 1, 1, 13).getValues()[0];
    var leadCount = Number(existing[4]) || 1;
    sheet.getRange(row, 1, 1, 13).setValues([[
      existing[0] || timestamp,
      contact,
      existing[2] || source,
      source,
      leadCount + 1,
      timestamp,
      dripStatus,
      existing[7] || landingPage,
      landingPage,
      referrer,
      utmSource,
      utmMedium,
      utmCampaign
    ]]);
    if (eventProperty) properties.setProperty(eventProperty, "1");
    return json({ success: true, action: "updated" });
  }

  sheet.appendRow([
    timestamp, contact, source, source, 1, timestamp, dripStatus,
    landingPage, landingPage, referrer, utmSource, utmMedium, utmCampaign
  ]);
  if (eventProperty) properties.setProperty(eventProperty, "1");
  return json({ success: true, action: "created" });
}
