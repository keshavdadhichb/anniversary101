const XLSX = require('xlsx');
const { google } = require('googleapis');
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

function formatExcelValue(val) {
  if (val === undefined || val === null) return '';
  
  // Handle Excel Serial Dates
  if (typeof val === 'number' && val > 40000 && val < 50000) {
    const date = XLSX.SSF.parse_date_code(val);
    return `${date.d.toString().padStart(2, '0')}.${date.m.toString().padStart(2, '0')}.${date.y}`;
  }

  // Handle Fractional Times (0 to 1)
  if (typeof val === 'number' && val > 0 && val < 1) {
    const time = XLSX.SSF.parse_date_code(val);
    return `${time.H.toString().padStart(2, '0')}:${time.M.toString().padStart(2, '0')}`;
  }

  // Handle Decimal Times (e.g., 14.3 -> 14:30)
  if (typeof val === 'number' && val >= 1 && val < 25) {
    const hours = Math.floor(val);
    const mins = Math.round((val - hours) * 100);
    return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
  }

  return val.toString().trim();
}

async function migrate() {
  console.log('🚀 Starting FINAL Vrindavan Migration (Time Fix)...');
  const workbook = XLSX.readFile('VRINDAVAN-FINAL.xlsx');
  const sheets = await getSheets();

  const phoneMap = new Map();
  ['KAMLA PLACE', 'MANSIGA'].forEach(sheetName => {
    const data = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], { header: 1 });
    const headers = data[0] || [];
    const phoneIdx = headers.indexOf('MOBILE NO.');
    const nameIndices = [];
    headers.forEach((h, i) => { if (h === 'NAME OF PERSON') nameIndices.push(i); });

    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      const phone = row[phoneIdx]?.toString() || '';
      nameIndices.forEach(idx => {
        const name = row[idx]?.toString().trim();
        if (name && name !== 'NAME OF PERSON') {
          phoneMap.set(name.toLowerCase(), phone);
        }
      });
    }
  });

  const masterSheet = workbook.Sheets['FINAL ROOM LIST'];
  const masterData = XLSX.utils.sheet_to_json(masterSheet, { header: 1 });
  
  const guests = [];
  const roomsMap = new Map();

  for (let i = 1; i < masterData.length; i++) {
    const row = masterData[i];
    if (!row[1]) continue;

    const name = row[1].toString().trim();
    const guest = {
      Guest_ID: row[0]?.toString() || `G_${i}`,
      Name: name,
      Family_POC: row[2]?.toString().trim() || '',
      Status: 'Pending',
      Phone: phoneMap.get(name.toLowerCase()) || '', 
      Origin: formatExcelValue(row[5]),
      Hotel: formatExcelValue(row[8]),
      Room_ID: row[9]?.toString() || '',
      Vehicle_ID: row[4]?.toString() || '',
      Root_Number: '', 
      Arrival_Time: `${formatExcelValue(row[6])} ${formatExcelValue(row[7])}`.trim(),
      Depart_Time: `${formatExcelValue(row[10])} ${formatExcelValue(row[11])}`.trim(),
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

  const finalSheet = workbook.Sheets['FINAL'];
  const finalData = XLSX.utils.sheet_to_json(finalSheet, { header: 1 });
  
  const trips = [];
  let currentRoot = null;
  let currentVehicle = null;

  for (let i = 2; i < finalData.length; i++) {
    const row = finalData[i];
    if (row[3]) {
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
        Depart_Time: formatExcelValue(row[1]),
        Distance_KM: row[13]?.toString() || '',
        Trip_Cost: row[12]?.toString() || ''
      });
    }
    
    if (row[0]) {
      const passengerName = row[0].toString().trim().toLowerCase();
      const matchedGuest = guests.find(g => g.Name.toLowerCase() === passengerName);
      if (matchedGuest) matchedGuest.Root_Number = currentRoot;
    }
  }

  const schemas = {
    GUESTS: ['Guest_ID', 'Name', 'Phone', 'Status', 'Family_POC', 'Origin', 'Hotel', 'Room_ID', 'Vehicle_ID', 'Root_Number', 'Arrival_Time', 'Depart_Time', 'Remarks'],
    ROOMS: ['Room_ID', 'Location', 'Capacity', 'Status'],
    VEHICLES_TRIPS: ['Trip_ID', 'Vehicle_Number', 'Driver_Name', 'Driver_Phone', 'From_Location', 'To_Location', 'Passengers', 'Depart_Time', 'Distance_KM', 'Trip_Cost']
  };

  for (const [sheetName, headers] of Object.entries(schemas)) {
    console.log(`🧹 Clearing ${sheetName}...`);
    await sheets.spreadsheets.values.clear({ spreadsheetId: SPREADSHEET_ID, range: `${sheetName}!A:Z` });

    let values = [];
    if (sheetName === 'GUESTS') values = guests.map(g => headers.map(h => g[h] || ''));
    else if (sheetName === 'ROOMS') values = Array.from(roomsMap.values()).map(r => headers.map(h => r[h] || ''));
    else if (sheetName === 'VEHICLES_TRIPS') values = trips.map(t => headers.map(h => t[h] || ''));

    console.log(`📤 Uploading ${values.length} rows to ${sheetName}...`);
    await sheets.spreadsheets.values.update({
      spreadsheetId: SPREADSHEET_ID,
      range: `${sheetName}!A1`,
      valueInputOption: 'RAW',
      requestBody: { values: [headers, ...values] },
    });
  }

  console.log('✅ Time Fix Migration Finished Successfully!');
}

migrate().catch(console.error);
