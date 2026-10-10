require('dotenv').config();
const express = require('express');
const path = require('path');
const { GoogleGenAI } = require('@google/genai');

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Data-driven Hotspots (Part D)
const hotspots = [
  { id: 'main', name: 'Main Building', description: 'Administrative offices, registrar, and main lobby.', position: '-4 1 -6', color: '#4CC3D9' },
  { id: 'lab', name: 'Computer Lab', description: 'High-spec computers for software development and programming.', position: '0 1 -6', color: '#FFC65D' },
  { id: 'library', name: 'Campus Library', description: 'Quiet study areas, research books, and digital kiosk.', position: '4 1 -6', color: '#7BC8A4' },
  { id: 'gym', name: 'Gymnasium', description: 'Sports court, campus events, and student assemblies.', position: '0 1 -10', color: '#EF2D5E' }
];

let visitLogs = {};
hotspots.forEach(h => visitLogs[h.id] = 0);

// API Endpoints (Part D & E)
app.get('/api/hotspots', (req, res) => res.json(hotspots));

app.post('/api/visits', (req, res) => {
  const { hotspotId } = req.body;
  if (!visitLogs.hasOwnProperty(hotspotId)) {
    return res.status(400).json({ error: 'Unknown hotspot ID' });
  }
  visitLogs[hotspotId]++;
  res.status(201).json({ success: true, visits: visitLogs[hotspotId] });
});

app.get('/api/summary', (req, res) => {
  let totalVisits = Object.values(visitLogs).reduce((a, b) => a + b, 0);
  let sorted = Object.entries(visitLogs).sort((a, b) => b[1] - a[1]);
  res.json({
    totalVisits,
    visitLogs,
    mostVisited: sorted[0] ? sorted[0][0] : 'N/A',
    leastVisited: sorted[sorted.length - 1] ? sorted[sorted.length - 1][0] : 'N/A'
  });
});

// Part F: AI Tour Guide Endpoint
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

app.post('/api/ask-guide', async (req, res) => {
  try {
    const { question } = req.body;
    const context = hotspots.map(h => `${h.name}: ${h.description}`).join('\n');
    const prompt = `You are a helpful campus tour guide. Answer the user question based ONLY on the following campus information:\n${context}\nIf the answer cannot be found in the provided information, respond exactly with: "I do not have information about that on this campus."\nQuestion: ${question}`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });

    res.json({ answer: response.text });
  } catch (err) {
    res.status(500).json({ answer: "Sorry, I am having trouble connecting to the guide service right now." });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));