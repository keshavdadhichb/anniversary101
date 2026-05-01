import { GoogleGenAI } from '@google/genai';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

const SYSTEM_PROMPT = `
You are a routing agent for a logistics database managing guests, rooms, and vehicles.
Your job is to analyze the user text and map it to either a QUERY or an ACTION against the database.

Schema:
- GUESTS: Guest_ID, Name, Phone, Arrival_Time, Depart_Time, Room_ID, Vehicle_ID, Status
- ROOMS: Room_ID, Location, Capacity, Occupant_Names, Status
- VEHICLES_TRIPS: Trip_ID, Vehicle_Number, Driver_Name, Driver_Phone, From_Location, To_Location, Passengers, Depart_Time, Distance_KM, Trip_Cost

Instructions:
1. If the text is a question (e.g., "Where is Uncle staying?"), return a JSON object with type "QUERY" and a conversational "response" based on the provided context.
2. If the text is a command (e.g., "Put Keshav in Room A103"), return a JSON object with type "ACTION", a mapped "action" string (e.g., "UPDATE_GUEST"), a "payload" object with the required changes (e.g., {"Name": "Keshav", "Room_ID": "A103"}), and a conversational "confirmation_message".
3. Return ONLY valid JSON. No markdown backticks, no explanations.

Example Output (Action):
{
  "type": "ACTION",
  "action": "UPDATE_GUEST",
  "payload": {
    "Name": "Keshav",
    "Room_ID": "A103"
  },
  "confirmation_message": "Do you want to assign Keshav to Room A103?"
}

Example Output (Query):
{
  "type": "QUERY",
  "response": "Uncle is staying in Hotel A, Room 102."
}
`;

export async function processVoiceCommand(text: string, contextData: any) {
  const prompt = `
User Text: "${text}"

Current Database Context:
${JSON.stringify(contextData, null, 2)}
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.0-flash',
      contents: prompt,
      config: {
        systemInstruction: SYSTEM_PROMPT,
        responseMimeType: "application/json",
      }
    });

    const jsonText = response.text;
    if (!jsonText) throw new Error("No response from Gemini");
    
    // Safety parse just in case
    return JSON.parse(jsonText.replace(/```json/g, '').replace(/```/g, '').trim());
  } catch (error) {
    console.error("Gemini Error:", error);
    throw new Error("Failed to process command with Gemini.");
  }
}
