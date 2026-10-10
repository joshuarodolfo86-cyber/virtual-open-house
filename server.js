const express = require('express');
const cors = require('cors');
const { GoogleGenerativeAI } = require('@google/generative-ai');

const app = express();
const PORT = process.env.PORT || 10000;

app.use(cors());
app.use(express.json());
app.use(express.static('.')); // Serves index.html and public files

// --- PART D: DATA-DRIVEN CONTENT API ---
const campusData = {
  main: {
    id: 'main',
    name: 'Main Building',
    description: 'The primary administrative building hosting admissions, student services, and faculty offices.',
    position: '-4 1.5 -6'
  },
  computer_lab: {
    id: 'computer_lab',
    name: 'Computer Lab',
    description: 'High-spec computers for software development, AI programming, and emerging technology labs.',
    position: '0 1.5 -6'
  },
  library: {
    id: 'library',
    name: 'Campus Library',
    description: 'A quiet study area with thousands of digital resources, books, and collaborative discussion rooms.',
    position: '4 1.5 -6'
  },
  gym: {
    id: 'gym',
    name: 'Gymnasium',
    description: 'Multi-purpose sports facility for campus events, basketball, volleyball, and physical education.',
    position: '0 1.5 4'
  }
};

// Analytics storage (In-memory)
let visits = {
  totalVisits: 0,
  byHotspot: { main: 0, computer_lab: 0, library: 0, gym: 0 }
};

// GET /api/hotspots
app.get('/api/hotspots', (req, res) => {
  res.json(Object.values(campusData));
});

// POST /api/visits
app.post('/api/visits', (req, res) => {
  const { hotspotId } = req.body;
  if (!hotspotId || !campusData[hotspotId]) {
    return res.status(400).json({ error: 'Unknown or missing hotspotId' });
  }
  visits.totalVisits++;
  visits.byHotspot[hotspotId] = (visits.byHotspot[hotspotId] || 0) + 1;
  res.status(201).json({ message: 'Visit logged successfully', visits });
});

// GET /api/summary (Part E)
app.get('/api/summary', (req, res) => {
  const entries = Object.entries(visits.byHotspot);
  entries.sort((a, b) => b[1] - a[1]);
  res.json({
    totalVisits: visits.totalVisits,
    byHotspot: visits.byHotspot,
    mostVisited: entries[0] ? entries[0][0] : 'N/A',
    leastVisited: entries[entries.length - 1] ? entries[entries.length - 1][0] : 'N/A'
  });
});

// --- PART F: AI TOUR GUIDE (GEMINI API) ---
app.post('/api/guide', async (req, res) => {
  const { question } = req.body;
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    return res.status(500).json({ answer: "Sorry, I am having trouble connecting to the guide service right now (API Key Missing)." });
  }

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    const campusContext = Object.values(campusData)
      .map(b => `${b.name}: ${b.description}`)
      .join("\n");

    const prompt = `You are an AI Campus Tour Guide for our Virtual Open House.
Answer the user's question concisely based ONLY on the following campus information:
${campusContext}

If the user asks about something not mentioned in the campus information above, politely respond that you do not know or that it is outside the campus information.

User Question: ${question}`;

    const result = await model.generateContent(prompt);
    const responseText = result.response.text();
    res.json({ answer: responseText });
  } catch (err) {
    console.error("Gemini API Error:", err);
    res.status(500).json({ answer: "Sorry, I am having trouble connecting to the guide service right now." });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});