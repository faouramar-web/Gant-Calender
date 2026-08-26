import { CalendarEvent } from "../types";
import { INITIAL_SCHOOL_EVENTS } from "../data/defaultEvents";

const STORAGE_KEY = "school_gantt_events_v1";

function getLocalEvents(): CalendarEvent[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (e) {
    console.warn("Could not read localStorage events:", e);
  }
  // Initialize with default events
  saveLocalEvents(INITIAL_SCHOOL_EVENTS);
  return INITIAL_SCHOOL_EVENTS;
}

function saveLocalEvents(events: CalendarEvent[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(events));
  } catch (e) {
    console.error("Could not write to localStorage:", e);
  }
}

export async function fetchEvents(): Promise<CalendarEvent[]> {
  try {
    // Try to fetch from server with a short timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2000);

    const res = await fetch("/api/events", { signal: controller.signal });
    clearTimeout(timeoutId);

    if (res.ok) {
      const contentType = res.headers.get("content-type");
      if (contentType && contentType.includes("application/json")) {
        const data = await res.json();
        if (data.events && Array.isArray(data.events)) {
          // If server events exist, also update local cache
          if (data.events.length > 0) {
            saveLocalEvents(data.events);
            return data.events;
          }
        }
      }
    }
  } catch (err) {
    // Server is unreachable or running in static mode (Vercel, GitHub Pages, etc.)
    console.info("Using local storage events fallback.");
  }

  // Fallback to local storage (or default events)
  return getLocalEvents();
}

export async function createEvent(eventData: Omit<CalendarEvent, "id" | "createdAt" | "updatedAt">): Promise<CalendarEvent> {
  // Try server first
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2500);

    const res = await fetch("/api/events", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(eventData),
      signal: controller.signal
    });
    clearTimeout(timeoutId);

    if (res.ok) {
      const contentType = res.headers.get("content-type");
      if (contentType && contentType.includes("application/json")) {
        const data = await res.json();
        if (data.success && data.event) {
          // Update local cache
          const current = getLocalEvents();
          saveLocalEvents([...current, data.event]);
          return data.event;
        }
      }
    }
  } catch (err) {
    console.info("Saving locally (static mode).");
  }

  // Local storage creation fallback
  const newEvent: CalendarEvent = {
    id: `evt-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    title: eventData.title.trim(),
    startDate: eventData.startDate,
    endDate: eventData.endDate,
    color: eventData.color,
    textColor: eventData.textColor || "#ffffff",
    note: eventData.note ? eventData.note.trim() : "",
    createdAt: Date.now(),
    updatedAt: Date.now()
  };

  const events = getLocalEvents();
  events.push(newEvent);
  saveLocalEvents(events);
  return newEvent;
}

export async function updateEvent(id: string, eventData: Omit<CalendarEvent, "id" | "createdAt" | "updatedAt">): Promise<CalendarEvent> {
  // Try server first
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2500);

    const res = await fetch(`/api/events/${id}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(eventData),
      signal: controller.signal
    });
    clearTimeout(timeoutId);

    if (res.ok) {
      const contentType = res.headers.get("content-type");
      if (contentType && contentType.includes("application/json")) {
        const data = await res.json();
        if (data.success && data.event) {
          const events = getLocalEvents().map(e => e.id === id ? data.event : e);
          saveLocalEvents(events);
          return data.event;
        }
      }
    }
  } catch (err) {
    console.info("Updating locally (static mode).");
  }

  // Local storage update fallback
  const events = getLocalEvents();
  const index = events.findIndex(e => e.id === id);
  if (index === -1) {
    throw new Error("האירוע לא נמצא");
  }

  const updated: CalendarEvent = {
    ...events[index],
    title: eventData.title.trim(),
    startDate: eventData.startDate,
    endDate: eventData.endDate,
    color: eventData.color,
    textColor: eventData.textColor || "#ffffff",
    note: eventData.note ? eventData.note.trim() : "",
    updatedAt: Date.now()
  };

  events[index] = updated;
  saveLocalEvents(events);
  return updated;
}

export async function deleteEvent(id: string, password: string): Promise<void> {
  if (password !== "1605") {
    throw new Error("סיסמה שגויה. לא ניתן למחוק אירוע.");
  }

  // Try server first
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2500);

    const res = await fetch(`/api/events/${id}`, {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ password }),
      signal: controller.signal
    });
    clearTimeout(timeoutId);

    if (res.ok) {
      const contentType = res.headers.get("content-type");
      if (contentType && contentType.includes("application/json")) {
        const data = await res.json();
        if (data.success) {
          const events = getLocalEvents().filter(e => e.id !== id);
          saveLocalEvents(events);
          return;
        }
      }
    }
  } catch (err) {
    console.info("Deleting locally (static mode).");
  }

  // Local storage deletion fallback
  const events = getLocalEvents().filter(e => e.id !== id);
  saveLocalEvents(events);
}
