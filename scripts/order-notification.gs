/**
 * Google Apps Script — Pharmron Order Notification Webhook
 * 
 * Sends email AND WhatsApp notification when a customer buys a product.
 * 
 * SETUP:
 * 1. Create a new Google Apps Script project (script.google.com)
 * 2. Paste this code
 * 3. Set the following Script Properties (File > Project properties > Script properties):
 *    - ADMIN_EMAIL: onwudiegwu.ronald@gmail.com
 *    - ADMIN_PHONE: 2348037341221
 *    - WHATSAPP_API_KEY: (optional) WhatsApp Business Cloud API token
 *    - WHATSAPP_PHONE_ID: (optional) WhatsApp Business Phone Number ID
 * 4. Deploy as Web App: Execute as "Me", Who has access "Anyone"
 * 5. Copy the Web App URL and set as ORDER_WEBHOOK_URL in .env
 * 
 * WhatsApp setup (optional, email works without it):
 * - Go to https://developers.facebook.com -> WhatsApp -> Get Started
 * - Create a Meta Business account if needed
 * - Set up WhatsApp Business Account, get Phone Number ID and API token
 * - Set WHATSAPP_API_KEY and WHATSAPP_PHONE_ID in Script Properties
 */

/**
 * POST handler — receives order data from the website
 */
function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    
    // Validate required fields
    if (!data.customer_email || !data.product_name || !data.phone) {
      return respond(false, 'Missing required fields: customer_email, product_name, phone');
    }

    const adminEmail = PropertiesService.getScriptProperties().getProperty('ADMIN_EMAIL') || 'onwudiegwu.ronald@gmail.com';
    const adminPhone = PropertiesService.getScriptProperties().getProperty('ADMIN_PHONE') || '2348037341221';

    // Format order details
    const orderDate = new Date().toLocaleString('en-NG', { timeZone: 'Africa/Lagos' });
    
    // Build items string
    let itemsText = '';
    let totalAmount = 0;
    
    if (data.items && Array.isArray(data.items)) {
      itemsText = data.items.map((item, i) => {
        const itemTotal = item.price ? parseFloat(String(item.price).replace(/[^0-9.]/g, '')) * item.quantity : 0;
        totalAmount += itemTotal;
        return `${i + 1}. ${item.product || item.name} — Qty: ${item.quantity} — ${item.price || 'N/A'}`;
      }).join('\n');
    } else {
      itemsText = `1. ${data.product_name} — Qty: ${data.quantity || 1} — ${data.product_price || ''}`;
      totalAmount = data.amount || 0;
    }

    // Build the notification body
    const subject = `🛒 NEW ORDER — Pharmron Natriceuticals`;
    
    const emailBody = `
NEW ORDER RECEIVED
━━━━━━━━━━━━━━━━━━

📅 Date: ${orderDate}

━━━━━ CUSTOMER INFO ━━━━━
📧 Email: ${data.customer_email}
📞 Phone: ${data.phone}
📍 Address: ${data.address || 'Not provided'}
🚚 Shipping: ${data.shipping_location || 'Not specified'}

━━━━━ ORDER DETAILS ━━━━━
${itemsText}

💰 Total: ₦${Number(totalAmount).toLocaleString()}

━━━━━ PAYMENT INFO ━━━━━
🔑 Ref: ${data.reference || 'N/A'}
`;

    // 1. SEND EMAIL
    MailApp.sendEmail({
      to: adminEmail,
      subject: subject,
      body: emailBody
    });

    // 2. SEND WHATSAPP (via WhatsApp Business Cloud API if configured)
    try {
      sendWhatsAppNotification(adminPhone, emailBody, data);
    } catch (waError) {
      // Log WhatsApp error but don't fail the request
      console.error('WhatsApp notification failed (non-fatal): ' + waError.toString());
    }

    // 3. Save order to Google Sheet if configured
    try {
      saveToSheet(data, orderDate);
    } catch (sheetError) {
      console.error('Sheet save failed (non-fatal): ' + sheetError.toString());
    }

    return respond(true, 'Order notification sent successfully');

  } catch (error) {
    console.error('Order notification error: ' + error.toString());
    return respond(false, 'Internal error: ' + error.toString());
  }
}

/**
 * Fallback GET handler — for testing webhook availability
 */
function doGet(e) {
  return respond(true, 'Pharmron Order Notification Webhook is live.');
}

/**
 * Sends WhatsApp notification using WhatsApp Business Cloud API
 */
function sendWhatsAppNotification(recipientPhone, messageBody, data) {
  const apiKey = PropertiesService.getScriptProperties().getProperty('WHATSAPP_API_KEY');
  const phoneId = PropertiesService.getScriptProperties().getProperty('WHATSAPP_PHONE_ID');

  if (!apiKey || !phoneId) {
    console.log('WhatsApp not configured — set WHATSAPP_API_KEY and WHATSAPP_PHONE_ID in Script Properties');
    return;
  }

  // Format a concise WhatsApp message (avoid truncation)
  const itemsList = data.items 
    ? data.items.map(item => 
        `• ${item.product || item.name} × ${item.quantity}`
      ).join('\n')
    : `• ${data.product_name} × ${data.quantity || 1}`;

  const amount = data.amount 
    ? `₦${Number(data.amount).toLocaleString()}`
    : '';

  const whatsappMessage = `🛒 *NEW ORDER — Pharmron*

*Customer:*
📧 ${data.customer_email}
📞 ${data.phone}
📍 ${data.address || 'No address'}
🚚 ${data.shipping_location || 'N/A'}

*Items:*
${itemsList}

💰 *Total:* ${amount}
🔑 Ref: ${data.reference || 'N/A'}`;

  const url = `https://graph.facebook.com/v18.0/${phoneId}/messages`;
  
  const payload = {
    messaging_product: 'whatsapp',
    recipient_type: 'individual',
    to: recipientPhone,
    type: 'text',
    text: { 
      preview_url: false,
      body: whatsappMessage 
    }
  };

  const options = {
    method: 'post',
    headers: {
      'Authorization': 'Bearer ' + apiKey,
      'Content-Type': 'application/json'
    },
    payload: JSON.stringify(payload),
    muteHttpExceptions: true
  };

  const response = UrlFetchApp.fetch(url, options);
  const result = JSON.parse(response.getContentText());
  
  if (!result.messages || result.messages.length === 0) {
    throw new Error('WhatsApp API error: ' + JSON.stringify(result));
  }
}

/**
 * Saves order to Google Sheet for record-keeping
 */
function saveToSheet(data, orderDate) {
  const sheetId = PropertiesService.getScriptProperties().getProperty('SHEET_ID');
  if (!sheetId) {
    console.log('SHEET_ID not set — skipping sheet save');
    return;
  }

  const sheet = SpreadsheetApp.openById(sheetId).getSheets()[0];
  
  // Flatten items into a readable string
  const itemsStr = data.items 
    ? data.items.map(i => `${i.product || i.name} (×${i.quantity})`).join(', ')
    : `${data.product_name} (×${data.quantity || 1})`;

  sheet.appendRow([
    orderDate,
    data.customer_email,
    data.phone,
    data.address || '',
    data.shipping_location || '',
    itemsStr,
    data.amount || '',
    data.reference || '',
    'Paid'
  ]);
}

/**
 * Standard JSON response helper
 */
function respond(success, message) {
  return ContentService
    .createTextOutput(JSON.stringify({ success, message }))
    .setMimeType(ContentService.MimeType.JSON);
}