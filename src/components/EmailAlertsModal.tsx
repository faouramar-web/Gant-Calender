import React, { useState, useEffect } from "react";
import {
  X,
  Mail,
  Send,
  Calendar,
  Clock,
  User,
  CheckCircle2,
  AlertTriangle,
  History,
  Settings,
  Sparkles,
  ExternalLink,
  ShieldCheck,
  RefreshCw,
  Info
} from "lucide-react";
import { CalendarEvent } from "../types";

interface AlertsConfig {
  coordinatorEmail: string;
  coordinatorName: string;
  enabled: boolean;
  alertHour: number;
  sendDaysBefore: number;
  lastSentDate: string;
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

interface EmailAlertsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onShowToast: (msg: string, type?: "success" | "error" | "warning") => void;
}

export const EmailAlertsModal: React.FC<EmailAlertsModalProps> = ({
  isOpen,
  onClose,
  onShowToast
}) => {
  const [activeTab, setActiveTab] = useState<"settings" | "preview" | "history">("settings");
  const [isLoading, setIsLoading] = useState(false);
  const [isSendingTest, setIsSendingTest] = useState(false);
  const [isSavingConfig, setIsSavingConfig] = useState(false);

  // Status & Config
  const [config, setConfig] = useState<AlertsConfig>({
    coordinatorEmail: "faouramar@gmail.com",
    coordinatorName: "רכז/ת לוח גאנט",
    enabled: true,
    alertHour: 19,
    sendDaysBefore: 1,
    lastSentDate: ""
  });
  const [todayStr, setTodayStr] = useState<string>("");
  const [tomorrowStr, setTomorrowStr] = useState<string>("");
  const [tomorrowEvents, setTomorrowEvents] = useState<CalendarEvent[]>([]);
  const [recentLogs, setRecentLogs] = useState<AlertLogEntry[]>([]);
  const [lastTestResult, setLastTestResult] = useState<{
    message: string;
    recipient: string;
    directGmailUrl?: string;
    previewUrl?: string;
  } | null>(null);

  // Form edit states
  const [emailInput, setEmailInput] = useState("faouramar@gmail.com");
  const [nameInput, setNameInput] = useState("רכז/ת לוח גאנט");
  const [hourInput, setHourInput] = useState(19);
  const [enabledInput, setEnabledInput] = useState(true);
  const [smtpPassInput, setSmtpPassInput] = useState("");
  const [hasSmtpPass, setHasSmtpPass] = useState(false);
  const [showSmtpSection, setShowSmtpSection] = useState(false);
  const [isTriggeringNow, setIsTriggeringNow] = useState(false);

  // Load status from backend
  const loadStatus = async () => {
    try {
      setIsLoading(true);
      const res = await fetch("/api/alerts/status");
      const data = await res.json();
      if (data.success) {
        setConfig(data.config);
        setEmailInput(data.config.coordinatorEmail);
        setNameInput(data.config.coordinatorName);
        setHourInput(data.config.alertHour);
        setEnabledInput(data.config.enabled);
        setTodayStr(data.todayStr);
        setTomorrowStr(data.tomorrowStr);
        setTomorrowEvents(data.tomorrowEvents || []);
        setRecentLogs(data.recentLogs || []);
        setHasSmtpPass(Boolean(data.hasSmtpPass));
      }
    } catch (err) {
      console.error("Failed to load alerts status:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadStatus();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailInput.trim() || !emailInput.includes("@")) {
      onShowToast("נא להזין כתובת מייל תקינה", "error");
      return;
    }

    try {
      setIsSavingConfig(true);
      const payload: any = {
        coordinatorEmail: emailInput.trim(),
        coordinatorName: nameInput.trim(),
        alertHour: Number(hourInput),
        enabled: enabledInput
      };
      if (smtpPassInput.trim()) {
        payload.smtpPass = smtpPassInput.trim();
        payload.smtpUser = emailInput.trim();
      }

      const res = await fetch("/api/alerts/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (data.success) {
        setConfig(data.config);
        setHasSmtpPass(Boolean(data.config.smtpPass));
        setSmtpPassInput("");
        onShowToast("הגדרות ההתראות נשמרו בהצלחה!", "success");
      } else {
        onShowToast(data.error || "שגיאה בשמירת הגדרות", "error");
      }
    } catch (err: any) {
      onShowToast("שגיאה בתקשורת עם השרת", "error");
    } finally {
      setIsSavingConfig(false);
    }
  };

  const handleTriggerNow = async () => {
    try {
      setIsTriggeringNow(true);
      const res = await fetch("/api/alerts/trigger-now", {
        method: "POST",
        headers: { "Content-Type": "application/json" }
      });
      const data = await res.json();
      if (data.success) {
        if (data.triggered) {
          setLastTestResult({
            message: data.message,
            recipient: data.recipient,
            directGmailUrl: data.directGmailUrl
          });
          onShowToast(`התראת האירוע הופקה עבור מחר (${data.targetDate})!`, "success");
        } else {
          onShowToast(data.message, "warning");
        }
        loadStatus();
      } else {
        onShowToast(data.error || "שגיאה בהפעלת התראה", "error");
      }
    } catch {
      onShowToast("שגיאה בתקשורת עם השרת", "error");
    } finally {
      setIsTriggeringNow(false);
    }
  };

  const handleSendTest = async (useSample: boolean = false) => {
    try {
      setIsSendingTest(true);
      const res = await fetch("/api/alerts/send-test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: emailInput.trim(),
          useSampleEvent: useSample || tomorrowEvents.length === 0
        })
      });
      const data = await res.json();
      if (data.success) {
        setLastTestResult({
          message: data.message,
          recipient: data.recipient,
          directGmailUrl: data.directGmailUrl,
          previewUrl: data.previewUrl
        });
        onShowToast(`מייל בדיקה הוכן ונשלח לכתובת: ${data.recipient}`, "success");
        // reload logs
        loadStatus();
      } else {
        onShowToast(data.error || "שגיאה בשליחת בדיקה", "error");
      }
    } catch (err: any) {
      onShowToast("שגיאה בשליחת בדיקה", "error");
    } finally {
      setIsSendingTest(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto"
      dir="rtl"
    >
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-3xl overflow-hidden my-auto flex flex-col max-h-[92vh]">
        {/* Modal Header */}
        <div className="bg-gradient-to-r from-sky-600 via-blue-600 to-indigo-700 px-6 py-4.5 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-md flex items-center justify-center border border-white/30 text-white shadow-inner">
              <Mail className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-lg font-bold">התראות מייל אוטומטיות לצוות</h2>
                <span className="text-xs font-semibold bg-emerald-400 text-slate-900 px-2 py-0.5 rounded-full">
                  אוטומטי ברקע 24/7
                </span>
                <span className="text-xs font-bold bg-amber-400/90 text-amber-950 px-2.5 py-0.5 rounded-full flex items-center gap-1 shadow-2xs">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  מורשה עריכה (160525)
                </span>
              </div>
              <p className="text-xs text-sky-100 mt-0.5">
                שליחת תזכורת אוטומטית יום לפני כל אירוע בלוח גאנט אל רכז/ת הלוח
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/25 flex items-center justify-center text-white transition-colors cursor-pointer"
            title="סגירה"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center border-b border-slate-200 bg-slate-50 px-6 shrink-0">
          <button
            onClick={() => setActiveTab("settings")}
            className={`py-3 px-4 font-bold text-xs sm:text-sm border-b-2 transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === "settings"
                ? "border-sky-600 text-sky-700 bg-white"
                : "border-transparent text-slate-600 hover:text-slate-900"
            }`}
          >
            <Settings className="w-4 h-4" />
            <span>הגדרות מקבל ההודעה</span>
          </button>

          <button
            onClick={() => setActiveTab("preview")}
            className={`py-3 px-4 font-bold text-xs sm:text-sm border-b-2 transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === "preview"
                ? "border-sky-600 text-sky-700 bg-white"
                : "border-transparent text-slate-600 hover:text-slate-900"
            }`}
          >
            <Sparkles className="w-4 h-4" />
            <span>תצוגה מקדימה של המייל</span>
          </button>

          <button
            onClick={() => setActiveTab("history")}
            className={`py-3 px-4 font-bold text-xs sm:text-sm border-b-2 transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === "history"
                ? "border-sky-600 text-sky-700 bg-white"
                : "border-transparent text-slate-600 hover:text-slate-900"
            }`}
          >
            <History className="w-4 h-4" />
            <span>יומן שליחה ({recentLogs.length})</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6 grow text-right text-slate-800">
          {/* TAB 1: SETTINGS & QUICK DISPATCH */}
          {activeTab === "settings" && (
            <div className="space-y-6">
              {/* Educational info notice */}
              <div className="bg-sky-50 border border-sky-200 rounded-xl p-4 flex items-start gap-3">
                <Info className="w-5 h-5 text-sky-600 shrink-0 mt-0.5" />
                <div className="text-xs sm:text-sm text-sky-900 space-y-1">
                  <p className="font-bold">איך עובד מנגנון ההתראות?</p>
                  <p className="text-slate-600 leading-relaxed">
                    המערכת בודקת את לוח גאנט בשרת ברקע בכל ערב בשעה שנבחרה. אם יש אירוע שמתוכנן למחרת (למשל: <strong>מסיק זיתים</strong>, טיול שנתי, יום הורים וכו'), מופק מייל מפורט ונשלח ישירות לרכז/ת לוח גאנט, כדי שתוכל להעביר אותו לצוות המורים.
                  </p>
                </div>
              </div>

              {/* Settings Form */}
              <form onSubmit={handleSaveConfig} className="bg-slate-50/70 border border-slate-200 rounded-xl p-5 space-y-4">
                <h3 className="font-bold text-slate-800 text-sm sm:text-base flex items-center gap-2">
                  <User className="w-4 h-4 text-sky-600" />
                  <span>כתובת המייל של מקבל/ת ההתראה</span>
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Recipient Email */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      כתובת מייל (כרגע מוגדר למייל הניסיון שלך):
                    </label>
                    <input
                      type="email"
                      required
                      value={emailInput}
                      onChange={(e) => setEmailInput(e.target.value)}
                      placeholder="faouramar@gmail.com"
                      className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-lg text-sm text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-sky-500 font-mono text-left"
                      dir="ltr"
                    />
                    <p className="text-2xs text-slate-500 mt-1">
                      * תוכל להחליף כאן בכל עת לכתובת המייל של המורה האחראית
                    </p>
                  </div>

                  {/* Recipient Title / Name */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      שם / תפקיד המקבל:
                    </label>
                    <input
                      type="text"
                      value={nameInput}
                      onChange={(e) => setNameInput(e.target.value)}
                      placeholder="רכז/ת לוח גאנט"
                      className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-lg text-sm text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-sky-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-slate-200">
                  {/* Alert Hour */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      שעת שליחת ההתראה (ערב לפני האירוע):
                    </label>
                    <select
                      value={hourInput}
                      onChange={(e) => setHourInput(Number(e.target.value))}
                      className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-lg text-sm text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-sky-500"
                    >
                      <option value={17}>17:00 (5 בערב)</option>
                      <option value={18}>18:00 (6 בערב)</option>
                      <option value={19}>19:00 (7 בערב - מומלץ)</option>
                      <option value={20}>20:00 (8 בערב)</option>
                      <option value={21}>21:00 (9 בערב)</option>
                      <option value={8}>08:00 (בבוקר האירוע)</option>
                    </select>
                  </div>

                  {/* Enabled Toggle */}
                  <div className="flex items-center justify-between pt-5">
                    <div>
                      <span className="text-xs font-bold text-slate-800 block">התראות פעילות ברקע</span>
                      <span className="text-2xs text-slate-500">שליחה אוטומטית ללא צורך בפתיחת האתר</span>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={enabledInput}
                        onChange={(e) => setEnabledInput(e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-slate-200 peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
                    </label>
                  </div>
                </div>

                {/* Optional Google App Password Section */}
                <div className="pt-3 border-t border-slate-200">
                  <button
                    type="button"
                    onClick={() => setShowSmtpSection(!showSmtpSection)}
                    className="text-xs font-bold text-sky-700 hover:text-sky-900 flex items-center justify-between w-full py-1 cursor-pointer"
                  >
                    <span className="flex items-center gap-1.5">
                      <span>⚙️ הגדרת שליחה שקטה אוטומטית ל-Gmail (סיסמת אפליקציה)</span>
                      {hasSmtpPass ? (
                        <span className="bg-emerald-100 text-emerald-800 text-2xs px-2 py-0.5 rounded-full font-bold">
                          ✓ מוגדר
                        </span>
                      ) : (
                        <span className="bg-amber-100 text-amber-800 text-2xs px-2 py-0.5 rounded-full font-bold">
                          אופציונלי
                        </span>
                      )}
                    </span>
                    <span className="text-slate-400 text-xs">{showSmtpSection ? "▲ סגור" : "▼ פתח"}</span>
                  </button>

                  {showSmtpSection && (
                    <div className="mt-3 p-3.5 bg-sky-50/70 border border-sky-200 rounded-lg text-xs space-y-2.5">
                      <p className="text-slate-700 leading-relaxed">
                        שרתי גוגל אינם מאפשרים לאף שרת חיצוני לשלוח מיילים בשמך ללא אימות מאובטח. כדי שהשרת ישלח בשמך <strong>ברקע בצורה שקטה ללא צורך בלחיצה</strong>, יש ליצור בחשבון ה-Google שלך "סיסמת אפליקציה" (16 אותיות) ולהדביק אותה כאן:
                      </p>
                      <div>
                        <label className="block text-2xs font-bold text-slate-700 mb-1">
                          סיסמת אפליקציה של Google (App Password):
                        </label>
                        <input
                          type="password"
                          value={smtpPassInput}
                          onChange={(e) => setSmtpPassInput(e.target.value)}
                          placeholder={hasSmtpPass ? "•••••••••••••••• (שמור במערכת)" : "הדבק כאן סיסמת אפליקציה בת 16 אותיות"}
                          className="w-full px-3 py-2 bg-white border border-slate-300 rounded-md text-xs font-mono text-left"
                          dir="ltr"
                        />
                      </div>
                      <div className="text-2xs text-slate-500 leading-normal">
                        💡 איך משיגים סיסמת אפליקציה? נכנסים לחשבון Google ➔ אבטחה ➔ אימות דו-שלבי ➔ סיסמאות אפליקציה (App Passwords) ➔ מייצרים סיסמה ומדביקים כאן.
                        <br />
                        * לחלופין: אין חובה להגדיר סיסמה – כפתור <strong>"פתח ב-Gmail ושגר כעת"</strong> מכין את כל ההודעה ומשגר מיד!
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-end pt-2">
                  <button
                    type="submit"
                    disabled={isSavingConfig}
                    className="px-5 py-2 rounded-lg bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs sm:text-sm shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>{isSavingConfig ? "שומר..." : "שמירת הגדרות"}</span>
                  </button>
                </div>
              </form>

              {/* Tomorrow's Status & Instant Trial Box */}
              <div className="border border-indigo-100 bg-gradient-to-br from-indigo-50/50 to-sky-50/50 rounded-xl p-5 space-y-4">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 border-b border-indigo-100/80 pb-3">
                  <div>
                    <span className="text-xs font-semibold text-indigo-700 block">מצב אירועי מחר ({tomorrowStr})</span>
                    <h4 className="font-bold text-slate-800 text-sm sm:text-base">
                      {tomorrowEvents.length > 0
                        ? `נמצאו ${tomorrowEvents.length} אירועים מתוכננים למחר בלוח גאנט`
                        : "אין אירועים רשומים בלוח למחר (ניתן לבצע בדיקה עם אירוע לדוגמה)"}
                    </h4>
                  </div>
                  <button
                    onClick={loadStatus}
                    disabled={isLoading}
                    className="text-xs text-sky-700 hover:text-sky-900 font-semibold flex items-center gap-1 cursor-pointer"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin" : ""}`} />
                    <span>רענון נתונים</span>
                  </button>
                </div>

                {tomorrowEvents.length > 0 && (
                  <div className="space-y-2">
                    {tomorrowEvents.map((e) => (
                      <div
                        key={e.id}
                        className="bg-white border border-slate-200 p-3 rounded-lg flex items-center justify-between text-xs"
                      >
                        <div className="flex items-center gap-2">
                          <span
                            className="w-3 h-3 rounded-full shrink-0"
                            style={{ backgroundColor: e.color }}
                          />
                          <span className="font-bold text-slate-800">{e.title}</span>
                          <span className="text-slate-400">|</span>
                          <span className="text-slate-600">
                            {e.author ? `אחראי/ת: ${e.author}` : "צוות ביה״ס"}
                          </span>
                        </div>
                        <span className="text-slate-500 font-mono text-2xs">{e.startDate}</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Instant Test Action Buttons */}
                <div className="pt-2 flex flex-col sm:flex-row items-center gap-3 flex-wrap">
                  <button
                    onClick={handleTriggerNow}
                    disabled={isTriggeringNow}
                    className="w-full sm:w-auto px-5 py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs sm:text-sm shadow-md shadow-indigo-600/20 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                    title="מפעיל עכשיו את מנגנון ההתראות היומי של שבע בערב"
                  >
                    <Clock className={`w-4 h-4 ${isTriggeringNow ? "animate-spin" : ""}`} />
                    <span>
                      {isTriggeringNow
                        ? "מריץ בדיקת התראת 19:00..."
                        : "⚡ הפעל עכשיו בדיקת רקע (התראת 19:00)"}
                    </span>
                  </button>

                  <button
                    onClick={() => handleSendTest(false)}
                    disabled={isSendingTest}
                    className="w-full sm:w-auto px-4 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs sm:text-sm shadow-md shadow-emerald-600/20 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    <Send className={`w-4 h-4 ${isSendingTest ? "animate-spin" : ""}`} />
                    <span>
                      {isSendingTest
                        ? "מבצע בדיקה..."
                        : `בדיקה למייל שלי (${emailInput})`}
                    </span>
                  </button>

                  <button
                    onClick={() => handleSendTest(true)}
                    disabled={isSendingTest}
                    className="w-full sm:w-auto px-3.5 py-2.5 rounded-lg bg-white border border-indigo-300 hover:bg-indigo-50 text-indigo-900 font-bold text-xs shadow-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                    title="שליחת בדיקה עם דוגמת מסיק הזיתים והפרטים המלאים"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                    <span>אירוע מסיק זיתים לדוגמה 🌿</span>
                  </button>
                </div>

                {/* Test Feedback Result */}
                {lastTestResult && (
                  <div className="bg-white border-2 border-emerald-400 rounded-xl p-4 mt-3 space-y-3 shadow-md">
                    <div className="flex items-center gap-2 text-emerald-900 font-bold text-xs sm:text-sm">
                      <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                      <span>{lastTestResult.message}</span>
                    </div>

                    <div className="flex flex-wrap items-center gap-3 pt-1 text-xs">
                      {lastTestResult.directGmailUrl && (
                        <a
                          href={lastTestResult.directGmailUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-bold rounded-lg shadow-sm transition-all text-xs sm:text-sm"
                        >
                          <Mail className="w-4 h-4" />
                          <span>✉️ פתח ישירות ב-Gmail ושגר כעת</span>
                          <ExternalLink className="w-3.5 h-3.5 opacity-80" />
                        </a>
                      )}

                      {lastTestResult.previewUrl && (
                        <a
                          href={lastTestResult.previewUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-md font-semibold transition-colors"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                          <span>צפייה במייל הבדיקה (Ethereal)</span>
                        </a>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 2: LIVE PREVIEW */}
          {activeTab === "preview" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between text-xs text-slate-500 border-b border-slate-200 pb-2">
                <span>תצוגה מקדימה חיה של המייל כפי שייראה בתיבת הדואר של הנמען</span>
                <span className="font-semibold text-sky-700">נמען: {emailInput}</span>
              </div>

              {/* Styled Mock Email */}
              <div className="bg-slate-50 p-4 sm:p-6 rounded-2xl border border-slate-200">
                <div className="max-w-xl mx-auto bg-white rounded-xl shadow-md border border-slate-200 overflow-hidden text-right">
                  {/* School Email Banner */}
                  <div className="bg-gradient-to-r from-sky-600 to-blue-700 text-white p-5 text-center">
                    <p className="text-2xs opacity-90 font-medium">חטיבת הביניים ב׳ אבו סנאן • סמל מוסד 640615</p>
                    <h3 className="text-lg font-bold mt-1">תזכורת יומית: אירועי מחר בלוח גאנט</h3>
                    <div className="inline-block mt-2 bg-white/20 px-3 py-0.5 rounded-full text-xs font-bold">
                      יום חמישי, 22 באוקטובר 2026
                    </div>
                  </div>

                  <div className="p-5 space-y-4 text-xs sm:text-sm">
                    <p className="text-slate-700 leading-relaxed">
                      שלום ל<strong>{nameInput || "רכז/ת לוח גאנט"}</strong>,<br />
                      להלן פירוט האירועים והפעילויות המתוכננים למחר לפי לוח גאנט הבית-ספרי, לצורך היערכות והפצה לצוות המורים:
                    </p>

                    {/* Event Card Sample */}
                    <div className="bg-white border border-slate-200 border-r-4 border-r-emerald-500 rounded-xl p-4 shadow-2xs space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-900 text-base">מסיק הזיתים הבית-ספרי 🌿</span>
                        <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded-full text-2xs font-semibold">
                          אירוע חד-יומי (22/10/2026)
                        </span>
                      </div>
                      <div className="text-xs space-y-1.5 text-slate-600 pt-1">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-700">👤 אחראי / מזין:</span>
                          <span className="text-sky-700 font-semibold">סאמיה ח'טיב וצוות של"ח</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-700">⏰ שעות פעילות:</span>
                          <span className="text-slate-800 font-semibold">08:30 עד 13:30</span>
                        </div>
                        <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-100 text-slate-800 text-2xs leading-relaxed">
                          <strong>📝 פרטים והנחיות:</strong> יציאה מרוכזת מרחבת בית הספר למטעי הכפר אבו סנאן. נא לוודא שכל תלמיד מצטייד בכובע, בקבוק מים ונעליים סגורות.
                        </div>
                      </div>
                    </div>

                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-2xs text-blue-900 leading-relaxed">
                      💡 <strong>הודעה זו נשלחת באופן אוטומטי</strong> יום לפני כל אירוע בלוח גאנט. ניתן להפיץ מידע זה לקבוצת הוואטסאפ או למיילים של צוות המורים המעורב.
                    </div>
                  </div>

                  <div className="bg-slate-100 p-3 text-center text-2xs text-slate-500 border-t border-slate-200">
                    לוח גאנט בית ספרי תשפ״ז • חטיבת הביניים ב׳ אבו סנאן
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: DISPATCH HISTORY */}
          {activeTab === "history" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between text-xs text-slate-500 border-b border-slate-200 pb-2">
                <span>תיעוד היסטוריית ההתראות שהופקו ונשלחו מהמערכת</span>
                <button
                  onClick={loadStatus}
                  className="text-sky-700 hover:text-sky-900 font-bold flex items-center gap-1 cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>רענון</span>
                </button>
              </div>

              {recentLogs.length === 0 ? (
                <div className="text-center py-10 bg-slate-50 rounded-xl border border-dashed border-slate-300">
                  <Mail className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                  <p className="text-sm font-bold text-slate-600">עדיין לא נשלחו התראות</p>
                  <p className="text-xs text-slate-400 mt-1">
                    לחץ על "שליחת בדיקה עכשיו" בלשונית ההגדרות כדי לראות את ההתראה הראשונה
                  </p>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {recentLogs.map((log) => (
                    <div
                      key={log.id}
                      className="bg-white border border-slate-200 rounded-xl p-3.5 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2 shadow-2xs"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span
                            className={`px-2 py-0.5 rounded-full text-2xs font-bold ${
                              log.status === "success"
                                ? "bg-emerald-100 text-emerald-800"
                                : log.status === "generated"
                                ? "bg-sky-100 text-sky-800"
                                : "bg-amber-100 text-amber-800"
                            }`}
                          >
                            {log.status === "success" ? "נשלח בהצלחה" : "נוצר ותועד"}
                          </span>
                          <span className="font-bold text-slate-800">
                            {log.eventTitles.join(", ")}
                          </span>
                        </div>
                        <div className="text-slate-500 text-2xs flex items-center gap-2">
                          <span>נשלח אל: <strong className="text-slate-700">{log.recipientEmail}</strong></span>
                          <span>•</span>
                          <span>עבור תאריך: <strong>{log.targetDate}</strong></span>
                        </div>
                      </div>

                      <div className="text-left text-2xs text-slate-400 font-mono">
                        {new Date(log.timestamp).toLocaleString("he-IL")}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="bg-slate-50 px-6 py-3.5 border-t border-slate-200 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>סודי ומאובטח – נשלח רק לכתובת המורשית המוגדרת</span>
          </div>
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-lg bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold text-xs sm:text-sm transition-colors cursor-pointer"
          >
            סגור
          </button>
        </div>
      </div>
    </div>
  );
};
