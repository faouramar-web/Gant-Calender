import { CalendarEvent } from "../types";

export async function fetchEvents(): Promise<CalendarEvent[]> {
  try {
    const res = await fetch("/api/events");
    if (!res.ok) {
      throw new Error(`שגיאה בטעינת נתונים: ${res.statusText}`);
    }
    const data = await res.json();
    return data.events || [];
  } catch (err) {
    console.error("fetchEvents error:", err);
    throw err;
  }
}

export async function createEvent(eventData: Omit<CalendarEvent, "id" | "createdAt" | "updatedAt">): Promise<CalendarEvent> {
  const res = await fetch("/api/events", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(eventData)
  });

  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error(data.error || "שגיאה בשמירת האירוע");
  }

  return data.event;
}

export async function updateEvent(id: string, eventData: Omit<CalendarEvent, "id" | "createdAt" | "updatedAt">): Promise<CalendarEvent> {
  const res = await fetch(`/api/events/${id}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(eventData)
  });

  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error(data.error || "שגיאה בעדכון האירוע");
  }

  return data.event;
}

export async function deleteEvent(id: string, password: string): Promise<void> {
  const res = await fetch(`/api/events/${id}`, {
    method: "DELETE",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ password })
  });

  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error(data.error || "שגיאה במחיקת האירוע");
  }
}
