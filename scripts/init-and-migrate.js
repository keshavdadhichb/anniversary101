const { google } = require('googleapis');
const path = require('path');
const dotenv = require('dotenv');

dotenv.config({ path: path.join(__dirname, '../.env.local') });

const SPREADSHEET_ID = process.env.SPREADSHEET_ID;
const GOOGLE_CLIENT_EMAIL = process.env.GOOGLE_CLIENT_EMAIL;
let GOOGLE_PRIVATE_KEY = process.env.GOOGLE_PRIVATE_KEY;

if (GOOGLE_PRIVATE_KEY) {
  GOOGLE_PRIVATE_KEY = GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n').replace(/"/g, '').trim();
}

const auth = new google.auth.GoogleAuth({
  credentials: { client_email: GOOGLE_CLIENT_EMAIL, private_key: GOOGLE_PRIVATE_KEY },
  scopes: ['https://www.googleapis.com/auth/spreadsheets'],
});

async function run() {
  const sheets = google.sheets({ version: 'v4', auth });
  try {
    console.log(`Starting Data Extraction from "FINAL" tab...`);
    const finalRes = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: 'FINAL!A:E'
    });
    const rows = finalRes.data.values || [];
    
    // 1. EXTRACT GUESTS (Unique names from Column A)
    const guestNames = [...new Set(rows.slice(2)
      .map(r => r[0]?.trim())
      .filter(name => {
        if (!name) return false;
        const n = name.toUpperCase();
        const exclude = ["VEHICLE", "EARTIGA", "URBANIYA", "URBANIA", "INNOVA", "TRAIN", "BOOKING", "KMS", "JAIPUR", "SIKAR", "PER DAY", "RATE", "DATE", "RETURN", "ROOT", "TOTAL", "ARRANGEMENT"];
        return !exclude.some(ex => n.includes(ex));
      }))];

    console.log(`Found ${guestNames.length} unique guests.`);

    // 2. EXTRACT VEHICLE TRIPS (Grouped by Column E transitions)
    const trips = [];
    let currentTrip = null;

    for (let i = 2; i < rows.length; i++) {
      const row = rows[i];
      const passengerName = row[0]?.trim();
      const vehicleName = row[4]?.trim();

      if (vehicleName) {
        // Start new trip
        currentTrip = {
          Trip_ID: `T_${trips.length + 1}`,
          Vehicle_Number: vehicleName,
          Driver_Name: '',
          Driver_Phone: '',
          From_Location: row[1] ? 'Arrival' : '',
          To_Location: '',
          Passengers: [passengerName],
          Depart_Time: row[1] || '',
          Distance_KM: '',
          Trip_Cost: ''
        };
        trips.push(currentTrip);
      } else if (currentTrip && passengerName && !passengerName.toUpperCase().includes('TOTAL')) {
        // Add passenger to current trip
        currentTrip.Passengers.push(passengerName);
      }
    }

    console.log(`Processed ${trips.length} vehicle trips.`);

    // 3. UPDATE GUESTS TAB
    console.log("Updating GUESTS tab...");
    const guestRows = guestNames.map((name, i) => [`G_${i+1}`, name, '', 'Pending', '', '', '', '']);
    await sheets.spreadsheets.values.update({
      spreadsheetId: SPREADSHEET_ID,
      range: 'GUESTS!A2:H', // Clear old data
      valueInputOption: 'RAW',
      requestBody: { values: guestRows }
    });

    // 4. UPDATE VEHICLES_TRIPS TAB
    console.log("Updating VEHICLES_TRIPS tab...");
    const tripRows = trips.map(t => [
      t.Trip_ID, t.Vehicle_Number, t.Driver_Name, t.Driver_Phone, 
      t.From_Location, t.To_Location, t.Passengers.join(', '), 
      t.Depart_Time, t.Distance_KM, t.Trip_Cost
    ]);
    await sheets.spreadsheets.values.update({
      spreadsheetId: SPREADSHEET_ID,
      range: 'VEHICLES_TRIPS!A2:J', // Clear old data
      valueInputOption: 'RAW',
      requestBody: { values: tripRows }
    });

    console.log("\n✅ SUCCESS: Migration complete.");
  } catch (e) {
    console.error("Migration failed:", e.message);
  }
}

run();
