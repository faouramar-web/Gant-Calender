import React, { useState, useEffect, useMemo, useCallback } from "react";
import { Header } from "./components/Header";
import { MonthNavigation } from "./components/MonthNavigation";
import { CalendarGrid } from "./components/CalendarGrid";
import { EventModal } from "./components/EventModal";
import { ViewEventModal } from "./components/ViewEventModal";
import { PasswordModal } from "./components/PasswordModal";
import { DeleteConfirmModal } from "./components/DeleteConfirmModal";
import { A3ExportModal } from "./components/A3ExportModal";
import { SearchEventsModal } from "./components/SearchEventsModal";
import { CalendarEvent } from "./types";
import { buildMonthWeeks, HEBREW_MONTH_NAMES } from "./utils/dateUtils";
import {
  fetchEvents,
  createEvent,
  updateEvent,
  deleteEvent,
} from "./services/eventService";
import { CheckCircle2, AlertCircle, RefreshCw, Sparkles, BookOpen, Clock } from "lucide-react";

// Auto lock timeout: 5 minutes (in milliseconds)
const INACTIVITY_TIMEOUT_MS = 5 * 60 * 1000;

export default function App() {
  // State
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Mode: Default is "צפייה בלבד" (View Only)
  const [isEditMode, setIsEditMode] = useState<boolean>(false);

  // Current viewed Month & Year (Default to September 2026 for school year start)
  const [currentDate, setCurrentDate] = useState<Date>(() => {
    // Current date or start of academic year
    return new Date(2026, 8, 1); // September 2026
  });

  // Modal States
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [isEventModalOpen, setIsEventModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isA3ExportModalOpen, setIsA3ExportModalOpen] = useState(false);
  const [isSearchModalOpen, setIsSearchModalOpen] = useState(false);

  // Selected item states
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [defaultDateForNewEvent, setDefaultDateForNewEvent] = useState<string | undefined>(undefined);

  // Toast / Notification State
  const [toastMessage, setToastMessage] = useState<{ text: string; type: "success" | "error" | "warning" } | null>(null);

  const showToast = (text: string, type: "success" | "error" | "warning" = "success") => {
    setToastMessage({ text, type });
    setTimeout(() => {
      setToastMessage(null);
    }, 4500);
  };

  // Automatic Lock after 5 minutes of inactivity when in Edit Mode
  useEffect(() => {
    if (!isEditMode) return;

    let timeoutId: NodeJS.Timeout;

    const handleTimeout = () => {
      setIsEditMode(false);
      // Close any open edit/delete modal
      setIsEventModalOpen(false);
      setIsDeleteModalOpen(false);
      setSelectedEvent(null);
      setDefaultDateForNewEvent(undefined);
      showToast("מצב עריכה ננעל אוטומטית עקב 5 דקות של חוסר פעילות", "warning");
    };

    const resetTimer = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(handleTimeout, INACTIVITY_TIMEOUT_MS);
    };

    // Initialize timer
    resetTimer();

    // User activity events to listen to
    const activityEvents = ["mousemove", "mousedown", "keydown", "touchstart", "scroll", "click"];
    
    // Throttle listener to avoid high CPU usage
    let lastActivityTime = Date.now();
    const onUserActivity = () => {
      const now = Date.now();
      if (now - lastActivityTime > 1000) {
        lastActivityTime = now;
        resetTimer();
      }
    };

    activityEvents.forEach((event) => {
      window.addEventListener(event, onUserActivity, { passive: true });
    });

    return () => {
      clearTimeout(timeoutId);
      activityEvents.forEach((event) => {
        window.removeEventListener(event, onUserActivity);
      });
    };
  }, [isEditMode]);

  // Export JSON Backup file
  const handleExportBackup = () => {
    try {
      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(events, null, 2));
      const downloadAnchor = document.createElement("a");
      downloadAnchor.setAttribute("href", dataStr);
      const dateStamp = new Date().toISOString().split("T")[0];
      downloadAnchor.setAttribute("download", `school-gantt-backup-${dateStamp}.json`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
      showToast("קובץ הגיבוי הורד בהצלחה למחשב", "success");
    } catch (err) {
      console.error("Export backup failed:", err);
      showToast("שגיאה בהורדת הגיבוי", "error");
    }
  };

  // Import JSON Backup file
  const handleImportBackup = async (file: File) => {
    try {
      const text = await file.text();
      const imported = JSON.parse(text);
      if (!Array.isArray(imported)) {
        throw new Error("קובץ לא תקין");
      }
      
      // Save all imported items
      let addedCount = 0;
      for (const item of imported) {
        if (item.title && item.startDate && item.endDate) {
          await createEvent({
            title: item.title,
            startDate: item.startDate,
            endDate: item.endDate,
            color: item.color || "#0EA5E9",
            textColor: item.textColor || "#ffffff",
            note: item.note || "",
          });
          addedCount++;
        }
      }
      await loadCalendarEvents();
      showToast(`שוחזרו ${addedCount} אירועים בהצלחה`, "success");
    } catch (err) {
      console.error("Import backup error:", err);
      showToast("שגיאה בקריאת קובץ הגיבוי. ודא שזהו קובץ JSON תקין", "error");
    }
  };

  // Load events from persistent server store
  const loadCalendarEvents = useCallback(async () => {
    try {
      setIsLoading(true);
      setLoadError(null);
      const data = await fetchEvents();
      setEvents(data);
      setIsLoading(false);
    } catch (err: any) {
      console.error("Failed to load events:", err);
      setIsLoading(false);
      setLoadError("לא ניתן לטעון את האירועים. נא לרענן את הדף.");
    }
  }, []);

  useEffect(() => {
    loadCalendarEvents();
  }, [loadCalendarEvents]);

  // Compute weeks & multi-day continuous Gantt layout
  const weeks = useMemo(() => {
    return buildMonthWeeks(
      currentDate.getFullYear(),
      currentDate.getMonth(),
      events
    );
  }, [currentDate, events]);

  // Navigation handlers
  const handlePrevMonth = () => {
    setCurrentDate((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  };

  const handleToday = () => {
    const today = new Date();
    setCurrentDate(new Date(today.getFullYear(), today.getMonth(), 1));
  };

  // Cell click handler
  const handleSelectDay = (dateString: string) => {
    if (!isEditMode) return;
    setSelectedEvent(null);
    setDefaultDateForNewEvent(dateString);
    setIsEventModalOpen(true);
  };

  // Event click handler
  const handleSelectEvent = (event: CalendarEvent) => {
    setSelectedEvent(event);
    if (isEditMode) {
      setIsEventModalOpen(true);
    } else {
      setIsViewModalOpen(true);
    }
  };

  // Event Save handler (Add or Update)
  const handleSaveEvent = async (
    eventData: Omit<CalendarEvent, "id" | "createdAt" | "updatedAt">
  ) => {
    if (selectedEvent) {
      // Update existing
      const updated = await updateEvent(selectedEvent.id, eventData);
      setEvents((prev) =>
        prev.map((evt) => (evt.id === updated.id ? updated : evt))
      );
      showToast("האירוע נשמר בהצלחה", "success");
    } else {
      // Create new
      const created = await createEvent(eventData);
      setEvents((prev) => [...prev, created]);
      showToast("האירוע נשמר בהצלחה", "success");
    }
  };

  // Delete event handler
  const handleDeleteEvent = async (password: string) => {
    if (!selectedEvent) return;
    await deleteEvent(selectedEvent.id, password);
    setEvents((prev) => prev.filter((evt) => evt.id !== selectedEvent.id));
    setIsEventModalOpen(false);
    setSelectedEvent(null);
    showToast("האירוע נמחק בהצלחה", "success");
  };

  // Total events this month
  const totalEventsInMonth = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const monthStart = `${year}-${String(month + 1).padStart(2, "0")}-01`;
    const lastDay = new Date(year, month + 1, 0).getDate();
    const monthEnd = `${year}-${String(month + 1).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;

    return events.filter(
      (e) => e.startDate <= monthEnd && e.endDate >= monthStart
    ).length;
  }, [currentDate, events]);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col antialiased">
      {/* Top Application Header */}
      <Header
        isEditMode={isEditMode}
        onOpenPasswordModal={() => setIsPasswordModalOpen(true)}
        onExitEditMode={() => {
          setIsEditMode(false);
          showToast("חזרת למצב צפייה בלבד", "success");
        }}
        onOpenAddEventModal={() => {
          setSelectedEvent(null);
          setDefaultDateForNewEvent(undefined);
          setIsEventModalOpen(true);
        }}
        onOpenA3ExportModal={() => setIsA3ExportModalOpen(true)}
        onOpenSearchModal={() => setIsSearchModalOpen(true)}
        onExportBackup={handleExportBackup}
        onImportBackup={handleImportBackup}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Toast alert message */}
        {toastMessage && (
          <div
            className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-50 px-5 py-3 rounded-full shadow-xl flex items-center gap-2.5 text-sm font-bold animate-in slide-in-from-bottom-3 duration-300 no-print ${
              toastMessage.type === "success"
                ? "bg-emerald-700 text-white border border-emerald-600 shadow-emerald-500/20"
                : toastMessage.type === "warning"
                ? "bg-amber-600 text-white border border-amber-500 shadow-amber-500/20"
                : "bg-rose-700 text-white border border-rose-600 shadow-rose-500/20"
            }`}
          >
            {toastMessage.type === "success" ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-200 shrink-0" />
            ) : toastMessage.type === "warning" ? (
              <Clock className="w-5 h-5 text-amber-200 shrink-0" />
            ) : (
              <AlertCircle className="w-5 h-5 text-rose-200 shrink-0" />
            )}
            <span>{toastMessage.text}</span>
          </div>
        )}

        {/* Loading / Error handling */}
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20 bg-white rounded-3xl border border-slate-200 shadow-xs">
            <RefreshCw className="w-8 h-8 text-[#0EA5E9] animate-spin mb-3" />
            <p className="text-sm font-bold text-slate-700">
              טוען את לוח הגאנט הבית ספרי...
            </p>
          </div>
        ) : loadError ? (
          <div className="p-6 bg-rose-50 border border-rose-200 rounded-3xl text-center space-y-3">
            <AlertCircle className="w-8 h-8 text-rose-600 mx-auto" />
            <p className="text-base font-bold text-rose-900">{loadError}</p>
            <button
              onClick={loadCalendarEvents}
              className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-full transition-colors cursor-pointer"
            >
              נסה שוב
            </button>
          </div>
        ) : (
          <div>
            {/* Month Navigation Header */}
            <MonthNavigation
              currentDate={currentDate}
              onPrevMonth={handlePrevMonth}
              onNextMonth={handleNextMonth}
              onToday={handleToday}
              totalEventsInMonth={totalEventsInMonth}
            />

            {/* Responsive Calendar & Continuous Gantt Grid */}
            <div className="overflow-x-auto pb-4">
              <div className="min-w-[760px] lg:min-w-full">
                <CalendarGrid
                  weeks={weeks}
                  isEditMode={isEditMode}
                  onSelectDay={handleSelectDay}
                  onSelectEvent={handleSelectEvent}
                />
              </div>
            </div>

            {/* Quick Legend / Footer Tips with Copyright */}
            <div className="mt-6 flex flex-col items-center gap-3.5 text-xs text-slate-500 bg-white p-4 rounded-2xl border border-slate-200 shadow-xs no-print">
              <div className="flex flex-col lg:flex-row items-center justify-between gap-3 w-full">
                {/* Legend items */}
                <div className="flex items-center gap-2.5 flex-wrap justify-center lg:justify-start">
                  <span className="font-bold text-slate-700 flex items-center gap-1">
                    <BookOpen className="w-3.5 h-3.5 text-[#0EA5E9]" />
                    מקרא תצוגה:
                  </span>
                  <span className="inline-flex items-center gap-1.5 bg-slate-100/80 px-2.5 py-1 rounded-full text-slate-700 font-semibold">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#0EA5E9]" />
                    היום הנוכחי
                  </span>
                  <span className="inline-flex items-center gap-1.5 bg-slate-100/80 px-2.5 py-1 rounded-full text-slate-700 font-semibold">
                    <span className="w-2.5 h-2.5 rounded-full bg-slate-400" />
                    ימי שישי וראשון
                  </span>
                  <span className="inline-flex items-center gap-1.5 bg-slate-100/80 px-2.5 py-1 rounded-full text-slate-700 font-semibold">
                    <span className="w-5 h-2 rounded-full bg-indigo-500" />
                    אירוע רב-יומי כרצועה רציפה
                  </span>
                </div>

                {/* Instructions / Tips */}
                <div className="flex items-center gap-1 font-semibold text-slate-600">
                  {isEditMode ? (
                    <span>לחץ על תאריך בלוח או על אירוע לעריכה</span>
                  ) : (
                    <span>לחץ על כל אירוע לצפייה בפרטים והערות</span>
                  )}
                </div>
              </div>

              {/* Divider & Centered Copyright */}
              <div className="w-full border-t border-slate-100 pt-3 flex flex-col sm:flex-row items-center justify-center gap-2 text-center text-slate-500">
                <span className="font-medium">
                  כל הזכויות שמורות לעמאר פאעור © {new Date().getFullYear()}
                </span>
                <span className="hidden sm:inline text-slate-300">•</span>
                <span className="font-medium tracking-wide text-slate-600" dir="ltr">
                  All rights reserved to Amar Faour © {new Date().getFullYear()}
                </span>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* MODALS */}
      {/* Password Modal to enter edit mode (1605) */}
      <PasswordModal
        isOpen={isPasswordModalOpen}
        onClose={() => setIsPasswordModalOpen(false)}
        onSuccess={() => {
          setIsEditMode(true);
          showToast("מצב עריכה פעיל", "success");
        }}
      />

      {/* Add / Edit Event Modal */}
      <EventModal
        isOpen={isEventModalOpen}
        onClose={() => {
          setIsEventModalOpen(false);
          setSelectedEvent(null);
          setDefaultDateForNewEvent(undefined);
        }}
        onSave={handleSaveEvent}
        onDeleteRequest={() => {
          setIsEventModalOpen(false);
          setIsDeleteModalOpen(true);
        }}
        initialEvent={selectedEvent}
        defaultDate={defaultDateForNewEvent}
      />

      {/* View Event Modal (View Only Mode) */}
      <ViewEventModal
        isOpen={isViewModalOpen}
        onClose={() => {
          setIsViewModalOpen(false);
          setSelectedEvent(null);
        }}
        event={selectedEvent}
        onSwitchToEditMode={() => {
          setIsViewModalOpen(false);
          setIsPasswordModalOpen(true);
        }}
      />

      {/* Delete Confirmation Modal (Prompt 1605 password) */}
      <DeleteConfirmModal
        isOpen={isDeleteModalOpen}
        onClose={() => {
          setIsDeleteModalOpen(false);
          setSelectedEvent(null);
        }}
        event={selectedEvent}
        onConfirmDelete={handleDeleteEvent}
      />

      {/* A3 Print & PDF Export Modal */}
      <A3ExportModal
        isOpen={isA3ExportModalOpen}
        onClose={() => setIsA3ExportModalOpen(false)}
        currentDate={currentDate}
        weeks={weeks}
        events={events}
      />

      {/* Search Events Modal */}
      <SearchEventsModal
        isOpen={isSearchModalOpen}
        onClose={() => setIsSearchModalOpen(false)}
        events={events}
        onSelectEvent={(event) => {
          setSelectedEvent(event);
          setIsViewModalOpen(true);
        }}
        onNavigateToDate={(date) => {
          setCurrentDate(date);
        }}
        isEditMode={isEditMode}
        onEditEvent={(event) => {
          setSelectedEvent(event);
          setIsEventModalOpen(true);
        }}
      />
    </div>
  );
}
