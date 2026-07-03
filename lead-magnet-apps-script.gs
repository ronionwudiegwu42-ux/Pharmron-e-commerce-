/**
 * Google Apps Script to handle lead magnet form submissions
 * 
 * 1. Create a new Google Sheet and note its ID from the URL
 * 2. Create a new Apps Script project and paste this code
 * 3. Deploy as Web App (Execute as: Me, Who has access: Anyone)
 * 4. Copy the Web App URL and add it to index.html:
 *    LEAD_MAGNET_WEBHOOK_URL = "YOUR_WEB_APP_URL"
 */

function doPost(e) {
  try {
    // Parse the incoming JSON data
    const data = JSON.parse(e.postData.contents);
    const email = data.email || '';
    const timestamp = data.timestamp || new Date().toISOString();
    
    // Validate email
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return ContentService
        .createTextOutput(JSON.stringify({ success: false, error: 'Invalid email' }))
        .setMimeType(ContentService.MimeType.JSON);
    }
    
    // Open the Google Sheet
    // REPLACE WITH YOUR SHEET ID
    const sheetId = 'YOUR_SHEET_ID';
    const sheet = SpreadsheetApp.openById(sheetId).getSheets()[0];
    
    // Append data to the sheet
    sheet.appendRow([timestamp, email]);
    
    // Return success response
    return ContentService
      .createTextOutput(JSON.stringify({ success: true, email: email }))
      .setMimeType(ContentService.MimeType.JSON);
    
  } catch (error) {
    // Return error response
    return ContentService
      .createTextOutput(JSON.stringify({ success: false, error: error.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}