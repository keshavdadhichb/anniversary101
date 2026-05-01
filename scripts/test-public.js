const { google } = require('googleapis');
const path = require('path');
const dotenv = require('dotenv');

dotenv.config({ path: path.join(__dirname, '../.env.local') });

const SPREADSHEET_ID = process.env.SPREADSHEET_ID;
const API_KEY = process.env.GEMINI_API_KEY;

async function run() {
  const sheets = google.sheets({ version: 'v4', auth: API_KEY });
  try {
    console.log(`Checking public access with API Key...`);
    const res = await sheets.spreadsheets.get({ spreadsheetId: SPREADSHEET_ID });
    console.log(`✅ Success! Publicly accessible: ${res.data.properties.title}`);
  } catch (e) {
    console.error(`FAILED: ${e.message}`);
  }
}
run();
