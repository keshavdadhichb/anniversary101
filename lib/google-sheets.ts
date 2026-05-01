import { google } from 'googleapis';

const SCOPES = ['https://www.googleapis.com/auth/spreadsheets'];

// Normalize private key string
const PRIVATE_KEY = process.env.GOOGLE_PRIVATE_KEY
  ? process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n')
  : '';

export async function getAuthClient() {
  return new google.auth.GoogleAuth({
    credentials: {
      client_email: process.env.GOOGLE_CLIENT_EMAIL,
      private_key: PRIVATE_KEY,
    },
    scopes: SCOPES,
  });
}

export async function getSheets() {
  const auth = await getAuthClient();
  return google.sheets({ version: 'v4', auth });
}

export const SPREADSHEET_ID = process.env.SPREADSHEET_ID;

// Define Types
export type Guest = {
  Guest_ID: string;
  Name: string;
  Phone: string;
  Arrival_Time: string;
  Depart_Time: string;
  Room_ID: string;
  Vehicle_ID: string;
  Status: string;
};

export type Room = {
  Room_ID: string;
  Location: string;
  Capacity: string;
  Occupant_Names: string;
  Status: string;
};

export type VehicleTrip = {
  Trip_ID: string;
  Vehicle_Number: string;
  Driver_Name: string;
  Driver_Phone: string;
  From_Location: string;
  To_Location: string;
  Passengers: string;
  Depart_Time: string;
  Distance_KM: string;
  Trip_Cost: string;
};

// Helper: Convert 2D array to Object array based on headers
export function rowsToObjects<T>(rows: any[]): T[] {
  if (!rows || rows.length < 2) return [];
  const headers = rows[0];
  const dataRows = rows.slice(1);
  return dataRows.map((row) => {
    const obj: any = {};
    headers.forEach((header: string, index: number) => {
      obj[header] = row[index] || '';
    });
    return obj as T;
  });
}

// Fetch all rows from a sheet
export async function fetchSheetData<T>(sheetName: string): Promise<T[]> {
  const sheets = await getSheets();
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: `${sheetName}!A:Z`,
  });
  return rowsToObjects<T>(response.data.values || []);
}

// Update a row dynamically
export async function updateSheetRow(sheetName: string, idColumnName: string, idValue: string, updates: Record<string, any>) {
  const sheets = await getSheets();
  
  // 1. Get current data to find the row index and headers
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: `${sheetName}!A:Z`,
  });
  
  const rows = response.data.values;
  if (!rows || rows.length < 2) throw new Error('Sheet is empty');
  
  const headers = rows[0];
  const idColIndex = headers.indexOf(idColumnName);
  
  if (idColIndex === -1) throw new Error(`ID column ${idColumnName} not found`);
  
  // Find row index (1-based for Sheets API, starting from 1 means row 1 is headers)
  let targetRowIndex = -1;
  for (let i = 1; i < rows.length; i++) {
    if (rows[i][idColIndex] === idValue) {
      targetRowIndex = i;
      break;
    }
  }
  
  if (targetRowIndex === -1) throw new Error(`Record with ${idColumnName}=${idValue} not found`);
  
  // Prepare new row values
  const targetRow = [...rows[targetRowIndex]];
  
  // Fill missing columns in targetRow if it's shorter than headers
  while (targetRow.length < headers.length) {
    targetRow.push('');
  }
  
  for (const [key, value] of Object.entries(updates)) {
    const colIndex = headers.indexOf(key);
    if (colIndex !== -1) {
      targetRow[colIndex] = value;
    }
  }
  
  // 2. Update the specific row
  // targetRowIndex is 0-based in array, but 1-based in Sheets (e.g., targetRowIndex 1 is row 2)
  const range = `${sheetName}!A${targetRowIndex + 1}:${String.fromCharCode(65 + headers.length - 1)}${targetRowIndex + 1}`;
  
  await sheets.spreadsheets.values.update({
    spreadsheetId: SPREADSHEET_ID,
    range,
    valueInputOption: 'RAW',
    requestBody: {
      values: [targetRow],
    },
  });
  
  return true;
}

// Append a new row
export async function appendSheetRow(sheetName: string, data: Record<string, any>) {
  const sheets = await getSheets();
  
  // Get headers first
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: `${sheetName}!1:1`,
  });
  
  const headers = response.data.values?.[0];
  if (!headers) throw new Error('Headers not found');
  
  const newRow = headers.map((header: string) => data[header] || '');
  
  await sheets.spreadsheets.values.append({
    spreadsheetId: SPREADSHEET_ID,
    range: `${sheetName}!A:A`,
    valueInputOption: 'RAW',
    insertDataOption: 'INSERT_ROWS',
    requestBody: {
      values: [newRow],
    },
  });
  
  return true;
}
