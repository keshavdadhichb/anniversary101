const { google } = require('googleapis');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env.local') });

const SCOPES = ['https://www.googleapis.com/auth/spreadsheets'];

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

  // 3. Extract data from "FINAL" tab
  const uniqueNames = new Set();
  const vehiclesTripsData = [];
  const EXCLUDED_STRINGS = ["VEHICLE", "EARTIGA", "URBANIYA", "URBANIA", "INNOVA", "TRAIN", "BOOKING", "KMS", "JAIPUR", "SIKAR", "PER DAY", "RATE"];

  try {
    const data = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `FINAL!A:Z`,
    });
    
    const rows = data.data.values || [];
    
    let currentTrip = null;

    // Start from row index 2 (ignoring row 1 and row 2 which are index 0 and 1)
    for (let i = 2; i < rows.length; i++) {
      const row = rows[i];
      const colA_Raw = row[0] || "";
      const colB_Date = row[1] || "";
      const colE_Vehicle = row[4] || "";
      const colF_Point = row[5] || "";
      const colM_Total = row[12] || "";

      const colA = String(colA_Raw).trim();
      const isExcluded = EXCLUDED_STRINGS.some(str => colA.toUpperCase().includes(str));

      // Guest Extraction
      if (colA && !isExcluded) {
        uniqueNames.add(colA);
      }

      // Vehicle Trip Extraction Logic
      if (colE_Vehicle && String(colE_Vehicle).trim() !== "") {
        // A new trip begins
        if (currentTrip) {
          vehiclesTripsData.push(currentTrip);
        }
        
        currentTrip = {
          Vehicle_Number: String(colE_Vehicle).trim(),
          Depart_Time: String(colB_Date).trim(),
          From_Location: String(colF_Point).trim(),
          Trip_Cost: String(colM_Total).trim(),
          passengersList: []
        };
        
        // Add current row passenger
        if (colA && !isExcluded) {
          currentTrip.passengersList.push(colA);
        }
      } else if (currentTrip) {
        // Continue adding passengers to current trip if no new vehicle
        // Stop if we hit an empty row
        if (row.length === 0 || (colA === "" && Object.values(row).every(v => !v || String(v).trim() === ''))) {
          vehiclesTripsData.push(currentTrip);
          currentTrip = null; // trip ended
        } else if (colA && !isExcluded) {
          currentTrip.passengersList.push(colA);
        }
      }
    }
    
    // push the last trip if any
    if (currentTrip) {
      vehiclesTripsData.push(currentTrip);
    }

  } catch (e) {
    console.log(`Could not read tab FINAL: ${e.message}`);
  }

  console.log(`Found ${uniqueNames.size} clean unique guest names.`);
  console.log(`Extracted ${vehiclesTripsData.length} trips.`);

  // 4. Append to GUESTS tab
  if (uniqueNames.size > 0) {
    const guestsData = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `GUESTS!A:B`,
    });
    
    const existingGuestNames = new Set();
    const guestRows = guestsData.data.values || [];
    for (let i = 1; i < guestRows.length; i++) {
      if (guestRows[i][1]) {
        existingGuestNames.add(guestRows[i][1].trim());
      }
    }

    const newNames = Array.from(uniqueNames).filter(n => !existingGuestNames.has(n));
    console.log(`${newNames.length} names are new and will be added to GUESTS.`);

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
        insertDataOption: 'INSERT_ROWS',
        requestBody: {
          values,
        },
      });
      console.log(`Successfully migrated ${newNames.length} guests.`);
    }
  }

  // 5. Append to VEHICLES_TRIPS tab
  if (vehiclesTripsData.length > 0) {
    const vehiclesData = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `VEHICLES_TRIPS!A:A`,
    });
    
    const existingTripsCount = (vehiclesData.data.values || []).length;
    let currentTripId = existingTripsCount > 1 ? existingTripsCount : 1;

    const values = vehiclesTripsData.map(trip => {
      const id = `T${String(currentTripId++).padStart(4, '0')}`;
      // Trip_ID, Vehicle_Number, Driver_Name, Driver_Phone, From_Location, To_Location, Passengers, Depart_Time, Distance_KM, Trip_Cost
      return [
        id, 
        trip.Vehicle_Number, 
        '', // Driver_Name
        '', // Driver_Phone
        trip.From_Location, 
        '', // To_Location
        trip.passengersList.join(', '), // Passengers
        trip.Depart_Time, 
        '', // Distance_KM
        trip.Trip_Cost
      ];
    });

    await sheets.spreadsheets.values.append({
      spreadsheetId,
      range: `VEHICLES_TRIPS!A:J`,
      valueInputOption: 'RAW',
      insertDataOption: 'INSERT_ROWS',
      requestBody: {
        values,
      },
    });
    console.log(`Successfully migrated ${values.length} trips.`);
  }

  console.log('Migration completed successfully.');
}

migrate().catch(console.error);
