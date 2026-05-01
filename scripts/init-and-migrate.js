const { google } = require('googleapis');
const path = require('path');
const fs = require('fs');
require('dotenv').config({ path: path.resolve(__dirname, '../.env.local') });

const SCOPES = ['https://www.googleapis.com/auth/spreadsheets'];

// Normalize private key string
const PRIVATE_KEY = process.env.GOOGLE_PRIVATE_KEY
  ? process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n')
  : '';

async function getAuthClient() {
  return new google.auth.GoogleAuth({
    credentials: {
      client_email: process.env.GOOGLE_CLIENT_EMAIL,
      private_key: PRIVATE_KEY,
    },
    scopes: SCOPES,
  });
}

async function migrate() {
  const auth = await getAuthClient();
  const sheets = google.sheets({ version: 'v4', auth });
  const spreadsheetId = process.env.SPREADSHEET_ID;

  if (!spreadsheetId) {
    throw new Error('SPREADSHEET_ID not found in .env.local');
  }

  console.log('Fetching spreadsheet info...');
  const res = await sheets.spreadsheets.get({ spreadsheetId });
  const existingSheets = res.data.sheets.map(s => s.properties.title);

  const NEW_SHEETS = [
    {
      title: 'GUESTS',
      headers: ['Guest_ID', 'Name', 'Phone', 'Arrival_Time', 'Depart_Time', 'Room_ID', 'Vehicle_ID', 'Status'],
    },
    {
      title: 'ROOMS',
      headers: ['Room_ID', 'Location', 'Capacity', 'Occupant_Names', 'Status'],
    },
    {
      title: 'VEHICLES_TRIPS',
      headers: ['Trip_ID', 'Vehicle_Number', 'Driver_Name', 'Driver_Phone', 'From_Location', 'To_Location', 'Passengers', 'Depart_Time', 'Distance_KM', 'Trip_Cost'],
    },
  ];

  // 1. Create missing sheets
  const requests = [];
  for (const sheet of NEW_SHEETS) {
    if (!existingSheets.includes(sheet.title)) {
      requests.push({
        addSheet: {
          properties: {
            title: sheet.title,
          },
        },
      });
    }
  }

  if (requests.length > 0) {
    console.log(`Creating new sheets: ${requests.map(r => r.addSheet.properties.title).join(', ')}`);
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId,
      requestBody: {
        requests,
      },
    });
  }

  // 2. Set Headers
  for (const sheet of NEW_SHEETS) {
    console.log(`Setting headers for ${sheet.title}...`);
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: `${sheet.title}!A1:${String.fromCharCode(65 + sheet.headers.length - 1)}1`,
      valueInputOption: 'RAW',
      requestBody: {
        values: [sheet.headers],
      },
    });
  }

  // 3. Extract existing guest names
  const uniqueNames = new Set();
  const tabsToScan = existingSheets.filter(t => !NEW_SHEETS.some(ns => ns.title === t));
  console.log(`Scanning tabs for guest names: ${tabsToScan.join(', ')}`);

  for (const tab of tabsToScan) {
    try {
      const data = await sheets.spreadsheets.values.get({
        spreadsheetId,
        range: `${tab}!A:Z`,
      });
      const rows = data.data.values;
      if (!rows || rows.length === 0) continue;

      // Try to find a "Name" column
      const headerRow = rows[0].map(h => String(h).toLowerCase());
      let nameColIndex = headerRow.findIndex(h => h.includes('name'));
      if (nameColIndex === -1) {
        // Fallback to first column
        nameColIndex = 0;
      }

      for (let i = 1; i < rows.length; i++) {
        const row = rows[i];
        const name = row[nameColIndex];
        if (name && typeof name === 'string' && name.trim().length > 0) {
          uniqueNames.add(name.trim());
        }
      }
    } catch (e) {
      console.log(`Could not read tab ${tab}: ${e.message}`);
    }
  }

  console.log(`Found ${uniqueNames.size} unique guest names.`);

  // 4. Append to GUESTS tab
  if (uniqueNames.size > 0) {
    // Check existing names in GUESTS to avoid duplicates
    const guestsData = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `GUESTS!A:B`, // Guest_ID is A, Name is B
    });
    
    const existingGuestNames = new Set();
    const guestRows = guestsData.data.values || [];
    // start from row 1 to skip header
    for (let i = 1; i < guestRows.length; i++) {
      if (guestRows[i][1]) {
        existingGuestNames.add(guestRows[i][1].trim());
      }
    }

    const newNames = Array.from(uniqueNames).filter(n => !existingGuestNames.has(n));
    console.log(`${newNames.length} names are new and will be added.`);

    if (newNames.length > 0) {
      let currentId = guestRows.length > 1 ? guestRows.length : 1;
      const values = newNames.map(name => {
        const id = `G${String(currentId++).padStart(4, '0')}`;
        // Guest_ID, Name, Phone, Arrival_Time, Depart_Time, Room_ID, Vehicle_ID, Status
        return [id, name, '', '', '', '', '', ''];
      });

      await sheets.spreadsheets.values.append({
        spreadsheetId,
        range: `GUESTS!A:H`,
        valueInputOption: 'RAW',
        requestBody: {
          values,
        },
      });
      console.log(`Successfully migrated ${newNames.length} guests.`);
    }
  }

  console.log('Migration completed successfully.');
}

migrate().catch(console.error);
