// code.gs - Apps Script backend (full file)
// Adapter-style API: POST with body { method, path, data, id }
// Returns JSON: { status: 'success', ... } or { status: 'error', message: '...' }

const SPREADSHEET_ID = '1JkuYx_dIzT9eWb4BiU_6ArACgl-TDWMlIRqbU3fQOvI';

// CONFIG: replace with the Drive folder ID where uploads should be stored
const PUBLIC_FOLDER_ID = '15OrsY1AAQp56m9Zm_b61wCqWOOQ88gTX';

// Optional: OPTIONAL_UPLOAD_SECRET can be stored in script properties for mild protection
// To set: go to Project Settings -> Script Properties and add UPLOAD_SECRET = 'some-secret'
// const UPLOAD_SECRET = PropertiesService.getScriptProperties().getProperty('UPLOAD_SECRET');

function doPost(e) {
  return handleRequest(e);
}

function doGet(e) {
  return handleRequest(e);
}

function handleRequest(e) {
  try {
    let requestData;

    // Parse request body (adapter-style)
    if (e && e.postData && e.postData.contents) {
      requestData = JSON.parse(e.postData.contents);
    } else if (e && e.parameter && Object.keys(e.parameter).length) {
      // GET with query params (not commonly used for adapter but kept for compatibility)
      requestData = e.parameter;
    } else {
      throw new Error('No request data provided');
    }

    const { method, path, data, id } = requestData;
    let result;

    // Route to appropriate handler
    switch (path) {
      case 'users':
        result = handleUsers(method, data, id);
        break;
      case 'posts':
        result = handlePosts(method, data, id);
        break;
      case 'interactions':
        result = handleInteractions(method, data, id);
        break;
      case 'comments':
        result = handleComments(method, data, id);
        break;
      case 'conversations':
        result = handleConversations(method, data, id);
        break;
      case 'messages':
        result = handleMessages(method, data, id);
        break;
      case 'notifications':
        result = handleNotifications(method, data, id);
        break;
      case 'groupchat':
        result = handleGroupChat(method, data, id);
        break;
      case 'dailylogs':               // new route for daily logs
        result = handleDailyLogs(method, data, id);
        break;
      case 'garden':                 // new route for garden data
        result = handleGarden(method, data, id);
        break;
      case 'uploadImage':            // new route for image uploads
        result = handleImageUpload(data);
        break;
      default:
        throw new Error('Invalid path: ' + path);
    }

    // Return response as JSON
    return ContentService.createTextOutput(JSON.stringify(result))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (error) {
    const errorResponse = {
      status: 'error',
      message: error.toString()
    };

    return ContentService.createTextOutput(JSON.stringify(errorResponse))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

// ----------------------
// Sheet helper / creation
// ----------------------
function getSheet(sheetName) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  let sheet = ss.getSheetByName(sheetName);
  if (!sheet) {
    sheet = ss.insertSheet(sheetName);

    // Create sensible headers for each sheet type
    if (sheetName === 'Users') {
      sheet.appendRow(['id', 'name', 'username', 'email', 'password', 'avatar', 'profileImageURL', 'coverImageURL', 'bio', 'verified', 'badges', 'darkMode', 'timestamp']);
    } else if (sheetName === 'Posts') {
      sheet.appendRow(['id', 'userId', 'type', 'content', 'images', 'timestamp']);
    } else if (sheetName === 'Interactions') {
      sheet.appendRow(['id', 'postId', 'userId', 'interactionType', 'timestamp']);
    } else if (sheetName === 'Comments') {
      sheet.appendRow(['id', 'postId', 'userId', 'text', 'timestamp']);
    } else if (sheetName === 'Conversations') {
      sheet.appendRow(['id', 'participantIds', 'lastMessageTimestamp', 'timestamp']);
    } else if (sheetName === 'Messages') {
      sheet.appendRow(['id', 'conversationId', 'senderId', 'text', 'imageUrl', 'type', 'timestamp']);
    } else if (sheetName === 'Notifications') {
      sheet.appendRow(['id', 'recipientId', 'senderId', 'type', 'relatedPostId', 'content', 'isRead', 'timestamp']);
    } else if (sheetName === 'GroupChat') {
      sheet.appendRow(['id', 'senderId', 'text', 'timestamp']);
    } else if (sheetName === 'DailyLogs') {
      // DailyLogs sheet header (used by path 'dailylogs')
      sheet.appendRow(['id', 'userId', 'date', 'mood', 'summary', 'timestamp']);
    } else if (sheetName === 'Garden') {
      // Garden sheet header for game data
      sheet.appendRow(['id', 'userId', 'plots', 'seeds', 'waterDrops', 'coins', 'points', 'lastCheckIn', 'lastShopRefresh', 'shopInventory', 'timestamp']);
    } else {
      // Generic default: create id and timestamp if no known sheetName
      sheet.appendRow(['id', 'timestamp']);
    }
  }
  return sheet;
}

// ----------------------
// CRUD handlers
// ----------------------
function handleUsers(method, data, id) {
  const sheet = getSheet('Users');

  if ((method === 'POST' || method === 'PUT') && data) {
    if (data.profileImageURL === undefined) data.profileImageURL = '';
    if (data.coverImageURL === undefined) data.coverImageURL = '';
    if (data.email === undefined) data.email = '';

    // Keep the short cell limit check (defensive) but we prefer storing URLs not base64
    if (data.profileImageURL && data.profileImageURL.length > 100000) {
      throw new Error('Profile image too large. Please use a Drive upload instead.');
    }
    if (data.coverImageURL && data.coverImageURL.length > 100000) {
      throw new Error('Cover image too large. Please use a Drive upload instead.');
    }
  }

  return handleCRUD(sheet, method, data, id);
}

function handlePosts(method, data, id) {
  const sheet = getSheet('Posts');
  if ((method === 'POST' || method === 'PUT') && data && Array.isArray(data.images)) {
    data.images = JSON.stringify(data.images);
  }
  return handleCRUD(sheet, method, data, id);
}

function handleInteractions(method, data, id) {
  const sheet = getSheet('Interactions');
  return handleCRUD(sheet, method, data, id);
}

function handleComments(method, data, id) {
  const sheet = getSheet('Comments');
  return handleCRUD(sheet, method, data, id);
}

function handleConversations(method, data, id) {
  const sheet = getSheet('Conversations');
  return handleCRUD(sheet, method, data, id);
}

function handleMessages(method, data, id) {
  const sheet = getSheet('Messages');
  return handleCRUD(sheet, method, data, id);
}

function handleNotifications(method, data, id) {
  const sheet = getSheet('Notifications');
  return handleCRUD(sheet, method, data, id);
}

function handleGroupChat(method, data, id) {
  const sheet = getSheet('GroupChat');
  return handleCRUD(sheet, method, data, id);
}

function handleDailyLogs(method, data, id) {
  const sheet = getSheet('DailyLogs');
  return handleCRUD(sheet, method, data, id);
}

function handleGarden(method, data, id) {
  const sheet = getSheet('Garden');

  // Special handling for GET by userId
  if (method === 'GET' && id) {
    // id is actually userId in this case
    const allRows = getAllRows(sheet);
    const userGarden = allRows.find(row => row.userId === id);

    if (userGarden) {
      // Parse JSON fields
      if (userGarden.plots && typeof userGarden.plots === 'string') {
        try { userGarden.plots = JSON.parse(userGarden.plots); } catch(e) { userGarden.plots = []; }
      }
      if (userGarden.seeds && typeof userGarden.seeds === 'string') {
        try { userGarden.seeds = JSON.parse(userGarden.seeds); } catch(e) { userGarden.seeds = {}; }
      }
      if (userGarden.shopInventory && typeof userGarden.shopInventory === 'string') {
        try { userGarden.shopInventory = JSON.parse(userGarden.shopInventory); } catch(e) { userGarden.shopInventory = []; }
      }
      return { status: 'success', data: userGarden };
    } else {
      // Return empty garden for new users
      return { status: 'success', data: null };
    }
  }

  // For POST/PUT, stringify JSON fields
  if ((method === 'POST' || method === 'PUT') && data) {
    if (data.plots && typeof data.plots !== 'string') {
      data.plots = JSON.stringify(data.plots);
    }
    if (data.seeds && typeof data.seeds !== 'string') {
      data.seeds = JSON.stringify(data.seeds);
    }
    if (data.shopInventory && typeof data.shopInventory !== 'string') {
      data.shopInventory = JSON.stringify(data.shopInventory);
    }
  }

  return handleCRUD(sheet, method, data, id);
}

// ----------------------
// Image upload handler
// ----------------------
/**
 * Expects data: { filename: string, data: string (dataURL or raw base64), uploadSecret?: string }
 * Returns: { status: 'success', url: 'https://drive.google.com/uc?export=view&id=FILE_ID', id: FILE_ID }
 */
function handleImageUpload(data) {
  try {
    if (!data || !data.data) {
      return { status: 'error', message: 'No image data provided' };
    }

    // Optional secret check (uncomment if you set UPLOAD_SECRET in script properties)
    // const UPLOAD_SECRET = PropertiesService.getScriptProperties().getProperty('UPLOAD_SECRET');
    // if (UPLOAD_SECRET && data.uploadSecret !== UPLOAD_SECRET) {
    //   return { status: 'error', message: 'Unauthorized upload (bad secret)' };
    // }

    // Very basic size limit check to avoid timeouts (base64 length)
    const MAX_BASE64_LENGTH = 10 * 1024 * 1024; // ~10MB
    const dataUrl = String(data.data);
    if (dataUrl.length > MAX_BASE64_LENGTH) {
      return { status: 'error', message: 'Image too large (max ~10MB base64).' };
    }

    // Normalize: detect data URL and extract mime + base64
    let base64 = dataUrl;
    let contentType = 'image/png';
    const commaIdx = base64.indexOf(',');
    if (commaIdx !== -1 && base64.slice(0, commaIdx).indexOf('base64') !== -1) {
      const prefix = base64.slice(0, commaIdx);
      base64 = base64.slice(commaIdx + 1);
      const match = prefix.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64$/);
      if (match) contentType = match[1];
    }

    // Allow only common image types
    if (!/image\/(png|jpe?g|webp)/i.test(contentType)) {
      return { status: 'error', message: 'Unsupported image type. Use PNG, JPG or WEBP.' };
    }

    // Decode base64 to bytes and create blob
    const bytes = Utilities.base64Decode(base64);
    const filename = data.filename ? String(data.filename) : ('upload-' + new Date().getTime() + '.png');
    const blob = Utilities.newBlob(bytes, contentType, filename);

    // Create file in Drive folder
    const folder = DriveApp.getFolderById(PUBLIC_FOLDER_ID);
    const file = folder.createFile(blob);

    // Make file public (anyone with link can view)
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);

    const fileId = file.getId();
    const publicUrl = 'https://drive.google.com/uc?export=view&id=' + fileId;

    return { status: 'success', url: publicUrl, id: fileId };
  } catch (err) {
    return { status: 'error', message: err.toString() };
  }
}

// ----------------------
// Generic CRUD helpers
// ----------------------
function handleCRUD(sheet, method, data, id) {
  switch (method) {
    case 'GET':
      return { status: 'success', data: getAllRows(sheet) };

    case 'POST':
      const newId = createRow(sheet, data || {});
      return { status: 'success', id: newId, data: Object.assign({}, data, { id: newId }) };

    case 'PUT':
      updateRow(sheet, id, data || {});
      return { status: 'success', data: Object.assign({}, data, { id: id }) };

    case 'DELETE':
      deleteRow(sheet, id);
      return { status: 'success' };

    default:
      throw new Error('Invalid method: ' + method);
  }
}

function getAllRows(sheet) {
  const data = sheet.getDataRange().getValues();
  if (data.length <= 1) return [];

  const headers = data[0];
  const rows = data.slice(1);

  return rows.map(row => {
    const obj = {};
    headers.forEach((header, index) => {
      obj[header] = row[index];
    });
    return obj;
  });
}

function createRow(sheet, data) {
  // If sheet is brand new and has no header row (rare because getSheet creates headers),
  // create headers from data keys
  if (sheet.getLastRow() === 0) {
    const headers = Object.keys(data || {});
    if (!headers.includes('id')) headers.unshift('id');
    if (!headers.includes('timestamp')) headers.push('timestamp');
    sheet.appendRow(headers);
  }

  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  const newId = Utilities.getUuid();
  data = data || {};
  data.id = newId;
  data.timestamp = new Date().toISOString();

  const row = headers.map(header => {
    if (data[header] !== undefined && data[header] !== null) {
      return data[header];
    }
    return '';
  });

  sheet.appendRow(row);

  return newId;
}

function updateRow(sheet, id, data) {
  const dataRange = sheet.getDataRange();
  const values = dataRange.getValues();
  const headers = values[0];
  const idIndex = headers.indexOf('id');

  if (idIndex === -1) {
    throw new Error('Sheet does not have an id column');
  }

  // Find the row with matching id
  for (let i = 1; i < values.length; i++) {
    if (values[i][idIndex] === id) {
      // Update each field that's provided in data
      headers.forEach((header, index) => {
        if (data[header] !== undefined) {
          sheet.getRange(i + 1, index + 1).setValue(data[header]);
        }
      });

      // Add any new columns if they don't exist
      const existingHeaders = headers;
      const newHeaders = Object.keys(data).filter(key => !existingHeaders.includes(key));

      if (newHeaders.length > 0) {
        const lastCol = sheet.getLastColumn();
        newHeaders.forEach((newHeader, idx) => {
          sheet.getRange(1, lastCol + idx + 1).setValue(newHeader);
          sheet.getRange(i + 1, lastCol + idx + 1).setValue(data[newHeader]);
        });
      }

      return;
    }
  }
  throw new Error('Row not found with id: ' + id);
}

function deleteRow(sheet, id) {
  const dataRange = sheet.getDataRange();
  const values = dataRange.getValues();
  const idIndex = values[0].indexOf('id');

  if (idIndex === -1) {
    throw new Error('Sheet does not have an id column');
  }

  for (let i = 1; i < values.length; i++) {
    if (values[i][idIndex] === id) {
      sheet.deleteRow(i + 1);
      return;
    }
  }
  throw new Error('Row not found with id: ' + id);
}

// Optional helper - placeholder for future image compression
function compressImageData(base64String) {
  return base64String;
}