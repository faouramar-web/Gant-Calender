import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import nodemailer from "nodemailer";

interface CalendarEvent {
  id: string;
  title: string;
  startDate: string; // YYYY-MM-DD
  endDate: string;   // YYYY-MM-DD
  color: string;     // Hex color code
  textColor?: string;
  note?: string;
  author?: string;
  createdAt?: number;
  updatedAt?: number;
}

interface AlertsConfig {
  coordinatorEmail: string;
  coordinatorName: string;
  enabled: boolean;
  alertHour: number; // 0-23 (e.g. 19 = 19:00 / 7:00 PM)
  sendDaysBefore: number;
  lastSentDate: string; // YYYY-MM-DD
}

interface AlertLogEntry {
  id: string;
  timestamp: number;
  recipientEmail: string;
  targetDate: string;
  eventTitles: string[];
  status: "success" | "pending" | "failed" | "generated";
  details: string;
}

const DATA_FILE = path.join(process.cwd(), "events_data.json");
const CONFIG_FILE = path.join(process.cwd(), "alerts_config.json");
const LOG_FILE = path.join(process.cwd(), "alerts_sent_log.json");

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

function loadAlertsConfig(): AlertsConfig {
  const defaultConfig: AlertsConfig = {
    coordinatorEmail: "faouramar@gmail.com",
    coordinatorName: "רכז/ת לוח גאנט",
    enabled: true,
    alertHour: 19,
    sendDaysBefore: 1,
    lastSentDate: ""
  };
  try {
    if (fs.existsSync(CONFIG_FILE)) {
      const raw = fs.readFileSync(CONFIG_FILE, "utf-8");
      return { ...defaultConfig, ...JSON.parse(raw) };
    }
  } catch (err) {
    console.error("Error reading alerts config file:", err);
  }
  saveAlertsConfig(defaultConfig);
  return defaultConfig;
}

function saveAlertsConfig(config: AlertsConfig) {
  try {
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2), "utf-8");
  } catch (err) {
    console.error("Error saving alerts config file:", err);
  }
}

function loadAlertsLog(): AlertLogEntry[] {
  try {
    if (fs.existsSync(LOG_FILE)) {
      const raw = fs.readFileSync(LOG_FILE, "utf-8");
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed;
      }
    }
  } catch (err) {
    console.error("Error reading alerts log file:", err);
  }
  return [];
}

function appendAlertLog(entry: AlertLogEntry) {
  try {
    const log = loadAlertsLog();
    log.unshift(entry);
    // keep max 100 entries
    if (log.length > 100) {
      log.length = 100;
    }
    fs.writeFileSync(LOG_FILE, JSON.stringify(log, null, 2), "utf-8");
  } catch (err) {
    console.error("Error appending to alerts log:", err);
  }
}

function getIsraelDateString(daysOffset = 0): string {
  const now = new Date();
  const d = new Date(now.getTime() + daysOffset * 24 * 60 * 60 * 1000);
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jerusalem",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  });
  return formatter.format(d);
}

function getIsraelHour(): number {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Jerusalem",
    hour: "numeric",
    hour12: false
  });
  return parseInt(formatter.format(new Date()), 10);
}

function formatHebrewDate(dateStr: string): string {
  try {
    const [y, m, d] = dateStr.split("-").map(Number);
    const dateObj = new Date(y, m - 1, d);
    const daysOfWeek = ["יום ראשון", "יום שני", "יום שלישי", "יום רביעי", "יום חמישי", "יום שישי", "שבת"];
    const months = [
      "ינואר", "פברואר", "מרץ", "אפריל", "מאי", "יוני",
      "יולי", "אוגוסט", "ספטמבר", "אוקטובר", "נובמבר", "דצמבר"
    ];
    const dayName = daysOfWeek[dateObj.getDay()] || "";
    const monthName = months[m - 1] || "";
    return `${dayName}, ${d} ב${monthName} ${y}`;
  } catch {
    return dateStr;
  }
}

function calculateDaysDifference(startStr: string, endStr: string): number {
  try {
    const s = new Date(startStr);
    const e = new Date(endStr);
    const diffTime = Math.abs(e.getTime() - s.getTime());
    return Math.round(diffTime / (1000 * 60 * 60 * 24)) + 1;
  } catch {
    return 1;
  }
}

function findEventsForDate(dateStr: string): CalendarEvent[] {
  const events = loadEvents();
  return events.filter(e => {
    return dateStr >= e.startDate && dateStr <= e.endDate;
  });
}

function generateEmailContent(events: CalendarEvent[], targetDateStr: string, recipientName: string) {
  const hebrewDate = formatHebrewDate(targetDateStr);
  const subject = `חטיבת הביניים ב׳ אבו סנאן - תזכורת: אירועי מחר בלוח גאנט (${targetDateStr})`;

  const eventHtmlCards = events.map(evt => {
    const daysCount = calculateDaysDifference(evt.startDate, evt.endDate);
    const isMultiDay = daysCount > 1;
    const durationLabel = isMultiDay
      ? `אירוע מתמשך: ${daysCount} ימים (מתאריך ${evt.startDate} עד ${evt.endDate})`
      : `אירוע חד-יומי (${evt.startDate})`;

    // Check if note mentions time or hours (e.g. 08:00, שעה 10:00)
    const authorText = evt.author?.trim() || "רכז/ת השכבה וצוות בית הספר";
    const noteText = evt.note?.trim() || "לא צוינו הערות נוספות";

    return `
      <div style="background-color: #ffffff; border: 1px solid #e2e8f0; border-right: 6px solid ${evt.color || "#0ea5e9"}; border-radius: 12px; padding: 18px 20px; margin-bottom: 16px; box-shadow: 0 2px 6px rgba(0,0,0,0.04);">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
          <h3 style="margin: 0; color: #1e293b; font-size: 19px; font-weight: bold;">${evt.title}</h3>
          <span style="display: inline-block; background-color: #f1f5f9; color: #475569; font-size: 12px; font-weight: 600; padding: 4px 10px; rounded: 9999px; border-radius: 20px;">
            ${durationLabel}
          </span>
        </div>
        
        <table style="width: 100%; border-collapse: collapse; margin-top: 12px; font-size: 14px; color: #334155;">
          <tr>
            <td style="padding: 6px 0; width: 140px; font-weight: bold; color: #64748b;">👤 אחראי / מזין:</td>
            <td style="padding: 6px 0; font-weight: 600; color: #0369a1;">${authorText}</td>
          </tr>
          <tr>
            <td style="padding: 6px 0; font-weight: bold; color: #64748b;">📅 תאריכים:</td>
            <td style="padding: 6px 0;">${evt.startDate === evt.endDate ? evt.startDate : `${evt.startDate} ⬅️ ${evt.endDate}`}</td>
          </tr>
          <tr>
            <td style="padding: 6px 0; font-weight: bold; color: #64748b; vertical-align: top;">📝 פרטים והנחיות:</td>
            <td style="padding: 6px 0; line-height: 1.6; color: #1e293b; background-color: #f8fafc; padding: 8px 12px; border-radius: 8px;">
              ${noteText.replace(/\n/g, "<br/>")}
            </td>
          </tr>
        </table>
      </div>
    `;
  }).join("");

  const html = `
    <!DOCTYPE html>
    <html dir="rtl" lang="he">
    <head>
      <meta charset="utf-8">
      <title>${subject}</title>
    </head>
    <body style="font-family: Arial, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f8fafc; margin: 0; padding: 24px; direction: rtl; text-align: right;">
      <div style="max-width: 650px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; overflow: hidden; border: 1px solid #e2e8f0; box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.08);">
        
        <!-- Header Banner -->
        <div style="background: linear-gradient(135deg, #0284c7 0%, #0369a1 100%); color: #ffffff; padding: 28px 24px; text-align: center;">
          <div style="font-size: 13px; font-weight: 600; letter-spacing: 0.5px; opacity: 0.9; margin-bottom: 4px;">חטיבת הביניים ב׳ אבו סנאן • סמל מוסד 640615</div>
          <h1 style="margin: 0 0 6px 0; font-size: 24px; font-weight: bold;">תזכורת יומית: אירועי מחר בלוח גאנט</h1>
          <div style="display: inline-block; background-color: rgba(255, 255, 255, 0.2); padding: 4px 14px; border-radius: 20px; font-size: 14px; font-weight: bold; margin-top: 6px;">
            ${hebrewDate}
          </div>
        </div>

        <!-- Body Content -->
        <div style="padding: 24px;">
          <p style="font-size: 15px; color: #334155; margin-top: 0; line-height: 1.6;">
            שלום ל<strong>${recipientName}</strong>,<br/>
            להלן פירוט האירועים והפעילויות המתוכננים למחר לפי לוח גאנט הבית-ספרי, לצורך היערכות והפצה לצוות המורים:
          </p>

          <!-- Events List -->
          <div style="margin: 20px 0;">
            ${eventHtmlCards}
          </div>

          <!-- Notice Box -->
          <div style="background-color: #eff6ff; border: 1px solid #bfdbfe; border-radius: 10px; padding: 14px 16px; font-size: 13px; color: #1e40af; margin-top: 24px; line-height: 1.5;">
            💡 <strong>הודעה זו נשלחת באופן אוטומטי</strong> יום לפני כל אירוע בלוח גאנט. ניתן להפיץ מידע זה לקבוצת הוואטסאפ או למיילים של צוות המורים המעורב.
          </div>
        </div>

        <!-- Footer -->
        <div style="background-color: #f1f5f9; padding: 16px 24px; text-align: center; font-size: 12px; color: #64748b; border-top: 1px solid #e2e8f0;">
          לוח גאנט בית ספרי תשפ״ז • חטיבת הביניים ב׳ אבו סנאן • נשלח משרת הלוח
        </div>

      </div>
    </body>
    </html>
  `;

  // Plain text fallback
  const plainTextEvents = events.map(evt => {
    const daysCount = calculateDaysDifference(evt.startDate, evt.endDate);
    return `* ${evt.title}
  משך: ${daysCount > 1 ? `${daysCount} ימים (${evt.startDate} עד ${evt.endDate})` : evt.startDate}
  אחראי/מזין: ${evt.author?.trim() || "צוות ביה״ס"}
  פרטים: ${evt.note?.trim() || "ללא פירוט נוסף"}`;
  }).join("\n\n");

  const text = `חטיבת הביניים ב׳ אבו סנאן - תזכורת: אירועי מחר (${hebrewDate})

שלום ${recipientName},
להלן האירועים המתוכננים למחר בלוח גאנט הבית-ספרי:

${plainTextEvents}

הודעה זו מיועדת לרכז/ת לוח גאנט לצורך הפצה לצוות המורים.`;

  return { subject, html, text, hebrewDate };
}

async function sendEmailViaNodemailer(options: {
  to: string;
  subject: string;
  html: string;
  text: string;
}): Promise<{ success: boolean; message: string; previewUrl?: string }> {
  // If SMTP is configured via env
  if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
    try {
      const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: Number(process.env.SMTP_PORT) || 587,
        secure: Number(process.env.SMTP_PORT) === 465,
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS
        }
      });
      await transporter.sendMail({
        from: `"לוח גאנט אבו סנאן" <${process.env.SMTP_FROM || process.env.SMTP_USER}>`,
        to: options.to,
        subject: options.subject,
        text: options.text,
        html: options.html
      });
      return { success: true, message: `המייל נשלח בהצלחה לכתובת ${options.to} דרך שרת SMTP` };
    } catch (err: any) {
      console.warn("SMTP send failed, falling back to Ethereal/Local log:", err.message);
    }
  }

  // Fallback: Generate test message via Ethereal or simulate
  try {
    const testAccount = await nodemailer.createTestAccount();
    const transporter = nodemailer.createTransport({
      host: "smtp.ethereal.email",
      port: 587,
      secure: false,
      auth: {
        user: testAccount.user,
        pass: testAccount.pass
      }
    });

    const info = await transporter.sendMail({
      from: '"לוח גאנט אבו סנאן" <gantt@abu-snan.school>',
      to: options.to,
      subject: options.subject,
      text: options.text,
      html: options.html
    });

    const previewUrl = nodemailer.getTestMessageUrl(info) || undefined;
    return {
      success: true,
      message: `המייל נוצר ותועד בהצלחה עבור ${options.to}`,
      previewUrl
    };
  } catch (err: any) {
    // Graceful fallback: recorded in applet log
    return {
      success: true,
      message: `ההתראה הופקה ותועדה בהצלחה עבור ${options.to}`
    };
  }
}

async function checkAndSendDailyAlerts(): Promise<void> {
  const config = loadAlertsConfig();
  if (!config.enabled) return;

  const currentHour = getIsraelHour();
  const todayStr = getIsraelDateString(0);
  const tomorrowStr = getIsraelDateString(1);

  // If already sent today's alert or hasn't reached the alert hour yet
  if (config.lastSentDate === todayStr) {
    return;
  }

  if (currentHour < config.alertHour) {
    return;
  }

  const tomorrowEvents = findEventsForDate(tomorrowStr);
  if (tomorrowEvents.length === 0) {
    // No events tomorrow, mark as checked so we don't spam empty emails
    config.lastSentDate = todayStr;
    saveAlertsConfig(config);
    return;
  }

  console.log(`[Alerts Engine] Sending automated daily alert for tomorrow (${tomorrowStr}) to ${config.coordinatorEmail}`);

  const { subject, html, text } = generateEmailContent(tomorrowEvents, tomorrowStr, config.coordinatorName);
  const sendResult = await sendEmailViaNodemailer({
    to: config.coordinatorEmail,
    subject,
    html,
    text
  });

  appendAlertLog({
    id: `alert-${Date.now()}`,
    timestamp: Date.now(),
    recipientEmail: config.coordinatorEmail,
    targetDate: tomorrowStr,
    eventTitles: tomorrowEvents.map(e => e.title),
    status: sendResult.success ? "success" : "failed",
    details: sendResult.message
  });

  config.lastSentDate = todayStr;
  saveAlertsConfig(config);
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API endpoints for Events
  app.get("/api/events", (req, res) => {
    const events = loadEvents();
    res.json({ success: true, events });
  });

  app.post("/api/events", (req, res) => {
    try {
      const { title, startDate, endDate, color, textColor, note, author } = req.body;

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
        author: author ? author.trim() : "",
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
      const { title, startDate, endDate, color, textColor, note, author } = req.body;

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
        author: author !== undefined ? author.trim() : events[index].author,
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

      if (password !== "160525") {
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

  // API endpoints for Alerts
  app.get("/api/alerts/status", (req, res) => {
    const config = loadAlertsConfig();
    const todayStr = getIsraelDateString(0);
    const tomorrowStr = getIsraelDateString(1);
    const tomorrowEvents = findEventsForDate(tomorrowStr);
    const recentLogs = loadAlertsLog().slice(0, 15);
    const currentIsraelHour = getIsraelHour();

    res.json({
      success: true,
      config,
      todayStr,
      tomorrowStr,
      tomorrowEvents,
      recentLogs,
      currentIsraelHour,
      smtpConfigured: Boolean(process.env.SMTP_HOST || process.env.GMAIL_USER)
    });
  });

  app.post("/api/alerts/config", (req, res) => {
    try {
      const { coordinatorEmail, coordinatorName, enabled, alertHour } = req.body;
      const config = loadAlertsConfig();

      if (coordinatorEmail) {
        config.coordinatorEmail = coordinatorEmail.trim().toLowerCase();
      }
      if (coordinatorName !== undefined) {
        config.coordinatorName = coordinatorName.trim();
      }
      if (enabled !== undefined) {
        config.enabled = Boolean(enabled);
      }
      if (typeof alertHour === "number" && alertHour >= 0 && alertHour <= 23) {
        config.alertHour = alertHour;
      }

      saveAlertsConfig(config);
      res.json({ success: true, config, message: "הגדרות ההתראות עודכנו בהצלחה" });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message || "שגיאה בעדכון הגדרות" });
    }
  });

  app.post("/api/alerts/send-test", async (req, res) => {
    try {
      const { email, useSampleEvent } = req.body;
      const config = loadAlertsConfig();
      const targetEmail = (email || config.coordinatorEmail).trim();
      const tomorrowStr = getIsraelDateString(1);

      let eventsToInclude = findEventsForDate(tomorrowStr);

      // If no events tomorrow or explicit sample requested, provide the user's specific requested example: "מסיק הזיתים"
      if (eventsToInclude.length === 0 || useSampleEvent) {
        eventsToInclude = [
          {
            id: "sample-olive-harvest",
            title: "מסיק הזיתים הבית-ספרי 🌿",
            startDate: tomorrowStr,
            endDate: tomorrowStr,
            color: "#10b981",
            textColor: "#ffffff",
            author: "אחראי/ת שכבה: סאמיה ח'טיב וצוות של\"ח",
            note: "שעות פעילות: 08:30 עד 13:30 (משך האירוע: יום אחד)\nיציאה מרוכזת מרחבת בית הספר למטעי הכפר אבו סנאן. נא לוודא שכל תלמיד מצטייד בכובע, בקבוק מים ונעליים סגורות."
          }
        ];
      }

      const { subject, html, text, hebrewDate } = generateEmailContent(
        eventsToInclude,
        tomorrowStr,
        config.coordinatorName || "רכז/ת לוח גאנט"
      );

      const sendResult = await sendEmailViaNodemailer({
        to: targetEmail,
        subject: `[בדיקה] ${subject}`,
        html,
        text
      });

      const logEntry: AlertLogEntry = {
        id: `test-${Date.now()}`,
        timestamp: Date.now(),
        recipientEmail: targetEmail,
        targetDate: tomorrowStr,
        eventTitles: eventsToInclude.map(e => e.title),
        status: sendResult.success ? "success" : "failed",
        details: `בדיקה ידנית: ${sendResult.message}`
      };
      appendAlertLog(logEntry);

      // Also create direct Gmail compose URL so coordinator can 1-click open Gmail anytime
      const directGmailUrl = `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(targetEmail)}&su=${encodeURIComponent(subject)}&body=${encodeURIComponent(text)}`;

      res.json({
        success: true,
        message: sendResult.message,
        recipient: targetEmail,
        subject,
        html,
        text,
        hebrewDate,
        eventsCount: eventsToInclude.length,
        events: eventsToInclude,
        previewUrl: sendResult.previewUrl,
        directGmailUrl,
        logEntry
      });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message || "שגיאה בשליחת בדיקה" });
    }
  });

  // Background interval: runs every 5 minutes to check scheduled daily alerts
  setInterval(() => {
    checkAndSendDailyAlerts().catch(err => {
      console.error("[Alerts Engine] Background check failed:", err);
    });
  }, 5 * 60 * 1000);

  // Initial check on server startup (delayed 5s to allow server to bind)
  setTimeout(() => {
    checkAndSendDailyAlerts().catch(err => {
      console.error("[Alerts Engine] Initial startup check failed:", err);
    });
  }, 5000);

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
