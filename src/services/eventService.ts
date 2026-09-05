import {
  collection,
  doc,
  getDocs,
  setDoc,
  deleteDoc,
  onSnapshot,
  writeBatch,
  query,
  orderBy
} from "firebase/firestore";
import { db } from "../firebase";
import { CalendarEvent } from "../types";
import { INITIAL_SCHOOL_EVENTS } from "../data/defaultEvents";

const STORAGE_KEY = "school_gantt_events_v1";
const EVENTS_COLLECTION = "events";

// Read from LocalStorage cache
export function getLocalEvents(): CalendarEvent[] {
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
  return INITIAL_SCHOOL_EVENTS;
}

// Save to LocalStorage cache
export function saveLocalEvents(events: CalendarEvent[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(events));
  } catch (e) {
    console.error("Could not write to localStorage:", e);
  }
}

// Seed initial school events to Firestore if collection is empty
let isSeeding = false;
export async function seedInitialEventsToFirestore(): Promise<void> {
  if (isSeeding) return;
  isSeeding = true;
  try {
    const eventsRef = collection(db, EVENTS_COLLECTION);
    const snapshot = await getDocs(eventsRef);
    if (snapshot.empty) {
      console.log("Firestore events collection is empty. Seeding initial school calendar...");
      // Firestore batch limit is 500 operations
      const batch = writeBatch(db);
      for (const event of INITIAL_SCHOOL_EVENTS) {
        const docRef = doc(db, EVENTS_COLLECTION, event.id);
        batch.set(docRef, event);
      }
      await batch.commit();
      console.log("Firestore successfully seeded with school events!");
    }
  } catch (err) {
    console.error("Failed to seed initial events to Firestore:", err);
  } finally {
    isSeeding = false;
  }
}

/**
 * Real-time subscription to events in Firebase Firestore.
 * Automatically synchronizes changes across all devices and teachers.
 */
export function subscribeToEvents(
  onUpdate: (events: CalendarEvent[]) => void,
  onError?: (err: any) => void
): () => void {
  try {
    const eventsRef = collection(db, EVENTS_COLLECTION);
    const q = query(eventsRef, orderBy("startDate", "asc"));

    const unsubscribe = onSnapshot(
      q,
      async (snapshot) => {
        if (snapshot.empty) {
          // If empty in Firestore, trigger seeding in background
          await seedInitialEventsToFirestore();
          // Provide local fallback in the meantime
          onUpdate(getLocalEvents());
          return;
        }

        const eventsList: CalendarEvent[] = [];
        snapshot.forEach((docSnap) => {
          const data = docSnap.data();
          eventsList.push({
            id: docSnap.id,
            title: data.title || "",
            startDate: data.startDate || "",
            endDate: data.endDate || data.startDate || "",
            color: data.color || "#0ea5e9",
            textColor: data.textColor || "#ffffff",
            note: data.note || "",
            createdAt: data.createdAt || Date.now(),
            updatedAt: data.updatedAt || Date.now()
          });
        });

        // Update local cache for instant offline startup
        saveLocalEvents(eventsList);
        onUpdate(eventsList);
      },
      (error) => {
        console.error("Firestore onSnapshot error:", error);
        // Fallback to local storage on permission or network error
        const local = getLocalEvents();
        onUpdate(local);
        if (onError) onError(error);
      }
    );

    return unsubscribe;
  } catch (err) {
    console.error("Could not set up Firestore listener:", err);
    onUpdate(getLocalEvents());
    return () => {};
  }
}

/**
 * One-time fetch of events (Firestore with LocalStorage fallback)
 */
export async function fetchEvents(): Promise<CalendarEvent[]> {
  try {
    const eventsRef = collection(db, EVENTS_COLLECTION);
    const q = query(eventsRef, orderBy("startDate", "asc"));
    const snapshot = await getDocs(q);

    if (snapshot.empty) {
      await seedInitialEventsToFirestore();
      return getLocalEvents();
    }

    const eventsList: CalendarEvent[] = [];
    snapshot.forEach((docSnap) => {
      const data = docSnap.data();
      eventsList.push({
        id: docSnap.id,
        title: data.title || "",
        startDate: data.startDate || "",
        endDate: data.endDate || data.startDate || "",
        color: data.color || "#0ea5e9",
        textColor: data.textColor || "#ffffff",
        note: data.note || "",
        createdAt: data.createdAt || Date.now(),
        updatedAt: data.updatedAt || Date.now()
      });
    });

    saveLocalEvents(eventsList);
    return eventsList;
  } catch (err) {
    console.warn("Firestore fetch error, falling back to local storage:", err);
    return getLocalEvents();
  }
}

/**
 * Create a new event and save to Firestore
 */
export async function createEvent(
  eventData: Omit<CalendarEvent, "id" | "createdAt" | "updatedAt">
): Promise<CalendarEvent> {
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

  try {
    // Save to Firestore
    const docRef = doc(db, EVENTS_COLLECTION, newEvent.id);
    await setDoc(docRef, newEvent);
  } catch (err) {
    console.error("Firestore createEvent error, saved locally:", err);
  }

  // Update local cache
  const local = getLocalEvents();
  saveLocalEvents([...local, newEvent]);

  return newEvent;
}

/**
 * Update an existing event in Firestore
 */
export async function updateEvent(
  id: string,
  eventData: Omit<CalendarEvent, "id" | "createdAt" | "updatedAt">
): Promise<CalendarEvent> {
  const updated: CalendarEvent = {
    id,
    title: eventData.title.trim(),
    startDate: eventData.startDate,
    endDate: eventData.endDate,
    color: eventData.color,
    textColor: eventData.textColor || "#ffffff",
    note: eventData.note ? eventData.note.trim() : "",
    createdAt: Date.now(),
    updatedAt: Date.now()
  };

  try {
    // Update in Firestore
    const docRef = doc(db, EVENTS_COLLECTION, id);
    await setDoc(docRef, updated, { merge: true });
  } catch (err) {
    console.error("Firestore updateEvent error, updated locally:", err);
  }

  // Update local cache
  const local = getLocalEvents();
  const index = local.findIndex((e) => e.id === id);
  if (index !== -1) {
    local[index] = { ...local[index], ...updated };
    saveLocalEvents(local);
  }

  return updated;
}

/**
 * Delete an event from Firestore
 */
export async function deleteEvent(id: string, password: string): Promise<void> {
  if (password !== "160525") {
    throw new Error("סיסמה שגויה. לא ניתן למחוק אירוע.");
  }

  try {
    // Delete from Firestore
    const docRef = doc(db, EVENTS_COLLECTION, id);
    await deleteDoc(docRef);
  } catch (err) {
    console.error("Firestore deleteEvent error, deleted locally:", err);
  }

  // Remove from local cache
  const local = getLocalEvents().filter((e) => e.id !== id);
  saveLocalEvents(local);
}
