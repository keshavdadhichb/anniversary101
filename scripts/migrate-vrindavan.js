const XLSX = require('xlsx');
const { google } = require('googleapis');
const path = require('path');
require('dotenv').config({ path: '.env.local' });

const SPREADSHEET_ID = process.env.SPREADSHEET_ID;
const PRIVATE_KEY = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n');

async function getSheets() {
  const auth = new google.auth.GoogleAuth({
    credentials: {
      client_email: process.env.GOOGLE_CLIENT_EMAIL,
      private_key: PRIVATE_KEY,
    },
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });
  const client = await auth.getClient();
  return google.sheets({ version: 'v4', auth: client });
}

async function migrate() {
  console.log('🚀 Starting Vrindavan Migration...');
  const workbook = XLSX.readFile('VRINDAVAN.xlsx');
  const sheets = await getSheets();

  // 1. Parse ROOM LIST (Guests & Rooms)
  const roomSheet = workbook.Sheets['ROOM LIST'];
  const roomData = XLSX.utils.sheet_to_json(roomSheet, { header: 1 });
  
  const guests = [];
  const roomsMap = new Map();

  for (let i = 1; i < roomData.length; i++) {
    const row = roomData[i];
    if (!row[1]) continue; // Skip if no name

    const guest = {
      Guest_ID: row[0]?.toString() || `G_${i}`,
      Name: row[1].toString().trim(),
      Family_POC: row[2]?.toString().trim() || '',
      Status: 'Pending',
      Phone: '', 
      Origin: row[5]?.toString() || '',
      Hotel: row[8]?.toString() || '',
      Room_ID: row[9]?.toString() || '',
      Vehicle_ID: row[4]?.toString() || '', // VEHICLE NO from Room List
      Root_Number: '', 
      Arrival_Time: `${row[6] || ''} ${row[7] || ''}`.trim(),
      Depart_Time: `${row[10] || ''} ${row[11] || ''}`.trim(),
      Remarks: row[3] ? `Transport: ${row[3]}` : ''
    };
    guests.push(guest);

    if (guest.Room_ID) {
      roomsMap.set(guest.Room_ID, {
        Room_ID: guest.Room_ID,
        Location: guest.Hotel || 'Unknown',
        Capacity: '2',
        Status: 'Available'
      });
    }
  }

  // 2. Parse FINAL (Trips)
  const finalSheet = workbook.Sheets['FINAL'];
  const finalData = XLSX.utils.sheet_to_json(finalSheet, { header: 1 });
  
  const trips = [];
  let currentRoot = null;
  let currentVehicle = null;

  for (let i = 2; i < finalData.length; i++) {
    const row = finalData[i];
    if (row[3]) { // ROOT NO.
      currentRoot = row[3].toString();
      currentVehicle = row[4]?.toString() || 'Unknown';
      
      trips.push({
        Trip_ID: currentRoot,
        Vehicle_Number: currentVehicle,
        Driver_Name: '',
        Driver_Phone: '',
        From_Location: row[5]?.toString() || 'Unknown',
        To_Location: 'Vrindavan',
        Passengers: row[0]?.toString() || '',
        Depart_Time: row[1]?.toString() || '',
        Distance_KM: row[13]?.toString() || '',
        Trip_Cost: row[12]?.toString() || ''
      });
    }
    
    // Link guest to Root Number if they are on a trip
    if (row[0]) {
      const passengerName = row[0].toString().trim().toLowerCase();
      const matchedGuest = guests.find(g => g.Name.toLowerCase() === passengerName);
      if (matchedGuest) {
        matchedGuest.Root_Number = currentRoot;
      }
    }
  }

  // 3. Clear and Update Sheets
  const schemas = {
    GUESTS: ['Guest_ID', 'Name', 'Phone', 'Status', 'Family_POC', 'Origin', 'Hotel', 'Room_ID', 'Vehicle_ID', 'Root_Number', 'Arrival_Time', 'Depart_Time', 'Remarks'],
    ROOMS: ['Room_ID', 'Location', 'Capacity', 'Status'],
    VEHICLES_TRIPS: ['Trip_ID', 'Vehicle_Number', 'Driver_Name', 'Driver_Phone', 'From_Location', 'To_Location', 'Passengers', 'Depart_Time', 'Distance_KM', 'Trip_Cost']
  };

  for (const [sheetName, headers] of Object.entries(schemas)) {
    console.log(`🧹 Clearing ${sheetName}...`);
    await sheets.spreadsheets.values.clear({
      spreadsheetId: SPREADSHEET_ID,
      range: `${sheetName}!A:Z`,
    });

    let values = [];
    if (sheetName === 'GUESTS') {
      values = guests.map(g => headers.map(h => g[h] || ''));
    } else if (sheetName === 'ROOMS') {
      values = Array.from(roomsMap.values()).map(r => headers.map(h => r[h] || ''));
    } else if (sheetName === 'VEHICLES_TRIPS') {
      values = trips.map(t => headers.map(h => t[h] || ''));
    }

    console.log(`📤 Uploading ${values.length} rows to ${sheetName}...`);
    await sheets.spreadsheets.values.update({
      spreadsheetId: SPREADSHEET_ID,
      range: `${sheetName}!A1`,
      valueInputOption: 'RAW',
      requestBody: {
        values: [headers, ...values],
      },
    });
  }

  console.log('✅ Migration Finished Successfully!');
}

migrate().catch(console.error);
