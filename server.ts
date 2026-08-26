import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";

interface CalendarEvent {
  id: string;
  title: string;
  startDate: string; // YYYY-MM-DD
  endDate: string;   // YYYY-MM-DD
  color: string;     // Hex color code
  textColor?: string;
  note?: string;
  createdAt: number;
  updatedAt: number;
}

const DATA_FILE = path.join(process.cwd(), "events_data.json");

function loadEvents(): CalendarEvent[] {
  try {
    if (fs.existsSync(DATA_FILE)) {
      const raw = fs.readFileSync(DATA_FILE, "utf-8");
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed;
      }
    }
  } catch (err) {
    console.error("Error reading events file:", err);
  }
  // Initialize with empty array if file doesn't exist or is invalid
  const emptyEvents: CalendarEvent[] = [];
  saveEvents(emptyEvents);
  return emptyEvents;
}

function saveEvents(events: CalendarEvent[]) {
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(events, null, 2), "utf-8");
  } catch (err) {
    console.error("Error saving events file:", err);
  }
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API endpoints
  app.get("/api/events", (req, res) => {
    const events = loadEvents();
    res.json({ success: true, events });
  });

  app.post("/api/events", (req, res) => {
    try {
      const { title, startDate, endDate, color, textColor, note } = req.body;
      if (!title || !startDate || !endDate || !color) {
        return res.status(400).json({ success: false, error: "שם האירוע, תאריכי התחלה/סיום וצבע הינם שדות חובה" });
      }

      if (endDate < startDate) {
        return res.status(400).json({ success: false, error: "תאריך הסיום אינו יכול להיות מוקדם מתאריך ההתחלה" });
      }

      const events = loadEvents();
      const newEvent: CalendarEvent = {
        id: `evt-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        title: title.trim(),
        startDate,
        endDate,
        color,
        textColor: textColor || "#ffffff",
        note: note ? note.trim() : "",
        createdAt: Date.now(),
        updatedAt: Date.now()
      };

      events.push(newEvent);
      saveEvents(events);

      res.status(201).json({ success: true, event: newEvent, message: "האירוע נשמר בהצלחה" });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message || "שגיאה בשמירת האירוע" });
    }
  });

  app.put("/api/events/:id", (req, res) => {
    try {
      const { id } = req.params;
      const { title, startDate, endDate, color, textColor, note } = req.body;

      if (!title || !startDate || !endDate || !color) {
        return res.status(400).json({ success: false, error: "שם האירוע, תאריכי התחלה/סיום וצבע הינם שדות חובה" });
      }

      if (endDate < startDate) {
        return res.status(400).json({ success: false, error: "תאריך הסיום אינו יכול להיות מוקדם מתאריך ההתחלה" });
      }

      const events = loadEvents();
      const index = events.findIndex(e => e.id === id);
      if (index === -1) {
        return res.status(404).json({ success: false, error: "האירוע לא נמצא" });
      }

      events[index] = {
        ...events[index],
        title: title.trim(),
        startDate,
        endDate,
        color,
        textColor: textColor || "#ffffff",
        note: note ? note.trim() : "",
        updatedAt: Date.now()
      };

      saveEvents(events);
      res.json({ success: true, event: events[index], message: "האירוע עודכן בהצלחה" });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message || "שגיאה בעדכון האירוע" });
    }
  });

  app.delete("/api/events/:id", (req, res) => {
    try {
      const { id } = req.params;
      const { password } = req.body;

      if (password !== "1605") {
        return res.status(401).json({ success: false, error: "הסיסמה שגויה" });
      }

      let events = loadEvents();
      const initialLength = events.length;
      events = events.filter(e => e.id !== id);

      if (events.length === initialLength) {
        return res.status(404).json({ success: false, error: "האירוע לא נמצא" });
      }

      saveEvents(events);
      res.json({ success: true, message: "האירוע נמחק בהצלחה" });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message || "שגיאה במחיקת האירוע" });
    }
  });

  // Vite middleware in dev / static in prod
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
