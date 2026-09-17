import React, { useState, useEffect } from "react";
import { X, Download, Printer, CheckCircle, FileDown, Loader2, Sparkles, ExternalLink, AlertTriangle, LayoutTemplate, RotateCw } from "lucide-react";
import html2canvas from "html2canvas-pro";
import { jsPDF } from "jspdf";
import { CalendarEvent, WeekData } from "../types";
import { HEBREW_MONTH_NAMES, HEBREW_WEEKDAY_NAMES, formatIsraeliDate } from "../utils/dateUtils";

interface A4ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentDate: Date;
  weeks: WeekData[];
  events: CalendarEvent[];
}

export const A4ExportModal: React.FC<A4ExportModalProps> = ({
  isOpen,
  onClose,
  currentDate,
  weeks,
}) => {
  const [orientation, setOrientation] = useState<"landscape" | "portrait">("landscape");
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [downloadSuccess, setDownloadSuccess] = useState(false);
  const [pdfBlobUrl, setPdfBlobUrl] = useState<string | null>(null);
  const [pdfErrorMessage, setPdfErrorMessage] = useState<string | null>(null);

  // Clean up blob URL on unmount or orientation change
  useEffect(() => {
    return () => {
      if (pdfBlobUrl) {
        URL.revokeObjectURL(pdfBlobUrl);
      }
    };
  }, [pdfBlobUrl, orientation]);

  if (!isOpen) return null;

  const monthName = HEBREW_MONTH_NAMES[currentDate.getMonth()];
  const year = currentDate.getFullYear();
  const orientationLabel = orientation === "landscape" ? "לרוחב" : "לאורך";
  const pdfFileName = `לוח גאנט A4 (${orientationLabel}) – ${monthName} ${year}.pdf`;

  const handleDownloadPdf = async () => {
    try {
      setIsGeneratingPdf(true);
      setPdfErrorMessage(null);
      setDownloadSuccess(false);

      const printableElement = document.getElementById("a4-printable-document");
      if (!printableElement) {
        throw new Error("רכיב ההדפסה לא נמצא במערכת");
      }

      // Render to canvas with html2canvas-pro at high DPI scale
      const canvas = await html2canvas(printableElement, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: "#ffffff",
        allowTaint: true,
      });

      const imgData = canvas.toDataURL("image/jpeg", 0.95);

      // A4 dimensions in mm: Landscape = 297 x 210, Portrait = 210 x 297
      const isLandscape = orientation === "landscape";
      const pdf = new jsPDF({
        orientation: isLandscape ? "landscape" : "portrait",
        unit: "mm",
        format: "a4",
        compress: true,
      });

      const pdfWidth = isLandscape ? 297 : 210;
      const pdfHeight = isLandscape ? 210 : 297;

      // Fit proportionally without stretching or distortion
      const scaleFactor = Math.min(pdfWidth / canvas.width, pdfHeight / canvas.height);
      const renderWidth = canvas.width * scaleFactor;
      const renderHeight = canvas.height * scaleFactor;
      const offsetX = (pdfWidth - renderWidth) / 2;
      const offsetY = (pdfHeight - renderHeight) / 2;

      pdf.addImage(imgData, "JPEG", offsetX, offsetY, renderWidth, renderHeight, undefined, "FAST");

      const blob = pdf.output("blob");
      const blobUrl = URL.createObjectURL(blob);
      setPdfBlobUrl(blobUrl);

      // Trigger automatic download
      const downloadLink = document.createElement("a");
      downloadLink.href = blobUrl;
      downloadLink.download = pdfFileName;
      document.body.appendChild(downloadLink);
      downloadLink.click();

      setTimeout(() => {
        if (document.body.contains(downloadLink)) {
          document.body.removeChild(downloadLink);
        }
      }, 300);

      setIsGeneratingPdf(false);
      setDownloadSuccess(true);
    } catch (err: any) {
      console.error("A4 PDF generation error:", err);
      setIsGeneratingPdf(false);
      setPdfErrorMessage(err?.message || "חלה שגיאה ביצירת קובץ ה-PDF בגודל A4");
    }
  };

  const handleNativePrint = () => {
    try {
      window.print();
    } catch (err) {
      console.warn("Native print error:", err);
      handleDownloadPdf();
    }
  };

  const isLandscape = orientation === "landscape";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs animate-in fade-in duration-200 print:p-0 print:bg-white print:static">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-5xl overflow-hidden flex flex-col max-h-[95vh] print:max-h-none print:shadow-none print:border-0 print:rounded-none print:w-full">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/80 no-print">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-sky-100 flex items-center justify-center text-sky-700">
              <Printer className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-extrabold text-slate-900">
                הדפסה ושמירה A4 (מדפסת רגילה)
              </h3>
              <p className="text-xs text-slate-500 font-medium">
                {monthName} {year} • חטיבת הביניים ב׳ אבו סנאן
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            {/* Orientation Switcher */}
            <div className="bg-slate-200/80 p-1 rounded-full flex items-center gap-1 text-xs font-bold text-slate-700">
              <button
                type="button"
                onClick={() => setOrientation("landscape")}
                className={`px-3 py-1.5 rounded-full transition-all cursor-pointer ${
                  orientation === "landscape"
                    ? "bg-white text-sky-800 shadow-2xs font-extrabold"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                לרוחב (מומלץ לגאנט)
              </button>
              <button
                type="button"
                onClick={() => setOrientation("portrait")}
                className={`px-3 py-1.5 rounded-full transition-all cursor-pointer ${
                  orientation === "portrait"
                    ? "bg-white text-sky-800 shadow-2xs font-extrabold"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                לאורך
              </button>
            </div>

            <button
              onClick={handleNativePrint}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs sm:text-sm font-bold transition-colors cursor-pointer shadow-2xs"
              title="פתיחת חלון ההדפסה של המחשב"
            >
              <Printer className="w-4 h-4 text-slate-600" />
              <span>הדפסה במדפסת</span>
            </button>

            <button
              onClick={handleDownloadPdf}
              disabled={isGeneratingPdf}
              className="inline-flex items-center gap-1.5 px-5 py-2 rounded-full bg-[#0EA5E9] hover:bg-[#0284c7] disabled:opacity-50 text-white text-xs sm:text-sm font-bold shadow-md shadow-sky-500/20 transition-all cursor-pointer"
            >
              {isGeneratingPdf ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>מפיק PDF A4...</span>
                </>
              ) : (
                <>
                  <Download className="w-4 h-4" />
                  <span>הורדת PDF A4</span>
                </>
              )}
            </button>

            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-slate-200/70 hover:bg-slate-300 flex items-center justify-center text-slate-600 transition-colors cursor-pointer mr-1"
              title="סגירה"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Success / Download Card */}
        {downloadSuccess && (
          <div className="mx-6 mt-4 p-4 bg-emerald-50 border-2 border-emerald-300 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-emerald-950 no-print animate-in slide-in-from-top-2">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                <CheckCircle className="w-5 h-5" />
              </div>
              <div>
                <p className="font-extrabold text-sm text-emerald-900">
                  קובץ ה-PDF בגודל A4 ({orientationLabel}) הופק בהצלחה!
                </p>
                <p className="text-xs text-emerald-700 mt-0.5">
                  אם ההורדה האוטומטית לא החלה במכשירך:
                </p>
              </div>
            </div>

            {pdfBlobUrl && (
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <a
                  href={pdfBlobUrl}
                  download={pdfFileName}
                  className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs transition-colors"
                >
                  <FileDown className="w-4 h-4" />
                  <span>שמור קובץ ישירות</span>
                </a>
                <a
                  href={pdfBlobUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-white hover:bg-emerald-100 border border-emerald-300 text-emerald-800 text-xs font-bold shadow-xs transition-colors"
                >
                  <ExternalLink className="w-4 h-4" />
                  <span>פתח בלשונית</span>
                </a>
              </div>
            )}
          </div>
        )}

        {/* Error message card */}
        {pdfErrorMessage && (
          <div className="mx-6 mt-4 p-4 bg-rose-50 border border-rose-300 rounded-2xl flex items-center gap-3 text-rose-900 text-xs font-medium no-print">
            <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0" />
            <div>
              <p className="font-bold text-rose-950">שגיאה בהפקת קובץ PDF:</p>
              <p>{pdfErrorMessage}</p>
            </div>
          </div>
        )}

        {/* Preview Area */}
        <div className="p-6 overflow-y-auto bg-slate-100/60 flex flex-col items-center print:p-0 print:bg-white print:overflow-visible">
          <div className="w-full text-xs text-slate-500 mb-3 flex items-center justify-between no-print">
            <span className="flex items-center gap-1.5">
              <LayoutTemplate className="w-3.5 h-3.5 text-sky-600" />
              תצוגה מקדימה של דף A4 סטנדרטי ({orientationLabel}):
            </span>
            <span className="font-semibold text-sky-700 flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5" />
              {isLandscape ? "297mm × 210mm (לרוחב)" : "210mm × 297mm (לאורך)"}
            </span>
          </div>

          {/* Printable Layout Target Container for HTML2Canvas */}
          <div
            id="a4-printable-document"
            dir="rtl"
            className="w-full bg-white rounded-xl shadow-lg border border-slate-300 p-6 text-slate-900 print:shadow-none print:border-none print:p-0 print:rounded-none"
            style={{
              maxWidth: isLandscape ? "880px" : "620px",
              width: "100%",
              backgroundColor: "#ffffff",
              color: "#0f172a",
              direction: "rtl",
              textAlign: "right",
              boxSizing: "border-box",
              fontFamily: "'Assistant', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
            }}
          >
            {/* Header for print/PDF */}
            <div
              className="pb-3 mb-4 flex items-center justify-between"
              style={{ borderBottom: "2px solid #0f172a" }}
            >
              <div>
                <h1 className="text-xl sm:text-2xl font-bold tracking-normal" style={{ color: "#0f172a" }}>
                  לוח גאנט – חטיבת הביניים ב׳ אבו סנאן
                </h1>
                <div className="flex items-center gap-2.5 mt-0.5">
                  <span
                    className="text-xs font-semibold px-2 py-0.5 rounded"
                    style={{ backgroundColor: "#f1f5f9", color: "#334155" }}
                  >
                    סמל מוסד: 640615
                  </span>
                  <span className="text-[11px] font-medium" style={{ color: "#64748b" }}>
                    שנת הלימודים תשפ״ז
                  </span>
                </div>
              </div>

              <div className="text-left">
                <div className="text-2xl font-bold" style={{ color: "#1e40af" }}>
                  {monthName} {year}
                </div>
                <div className="text-[11px] font-medium mt-0.5" style={{ color: "#64748b" }}>
                  פורמט A4 ({orientationLabel})
                </div>
              </div>
            </div>

            {/* Print Grid */}
            <div
              className="rounded-lg overflow-hidden"
              style={{
                border: "2px solid #1e293b",
                backgroundColor: "#ffffff",
                width: "100%",
                boxSizing: "border-box",
                direction: "rtl",
              }}
            >
              {/* Weekday header row */}
              <div
                style={{
                  display: "flex",
                  flexDirection: "row",
                  width: "100%",
                  borderBottom: "2px solid #0369a1",
                  boxSizing: "border-box",
                }}
              >
                {HEBREW_WEEKDAY_NAMES.map((name, i) => {
                  const isOffDay = i === 0 || i === 5;
                  return (
                    <div
                      key={name}
                      style={{
                        width: "14.2857%",
                        flex: "0 0 14.2857%",
                        backgroundColor: isOffDay ? "#4f46e5" : "#2563eb",
                        color: "#ffffff",
                        padding: isLandscape ? "7px 0" : "5px 0",
                        textAlign: "center",
                        fontWeight: 700,
                        fontSize: "12px",
                        boxSizing: "border-box",
                        borderLeft: i < 6 ? "1px solid rgba(255,255,255,0.25)" : "none",
                      }}
                    >
                      {name}
                    </div>
                  );
                })}
              </div>

              {/* Weeks */}
              <div style={{ backgroundColor: "#ffffff", width: "100%" }}>
                {weeks.map((week, weekIdx) => {
                  const baseH = isLandscape ? 40 : 48;
                  const slotH = isLandscape ? 24 : 26;
                  const minH = Math.max(isLandscape ? 72 : 82, baseH + week.maxSlots * slotH);
                  return (
                    <div
                      key={`a4-week-${weekIdx}`}
                      style={{
                        position: "relative",
                        minHeight: `${minH}px`,
                        width: "100%",
                        boxSizing: "border-box",
                        borderBottom: weekIdx < weeks.length - 1 ? "1px solid #cbd5e1" : "none",
                      }}
                    >
                      {/* Day cells */}
                      <div
                        style={{
                          position: "absolute",
                          top: 0,
                          right: 0,
                          bottom: 0,
                          left: 0,
                          width: "100%",
                          height: "100%",
                          display: "flex",
                          flexDirection: "row",
                          boxSizing: "border-box",
                        }}
                      >
                        {week.days.map((day, dIdx) => (
                          <div
                            key={`a4-${day.dateString}`}
                            style={{
                              width: "14.2857%",
                              flex: "0 0 14.2857%",
                              boxSizing: "border-box",
                              height: "100%",
                              padding: "4px",
                              display: "flex",
                              flexDirection: "column",
                              justifyContent: "space-between",
                              backgroundColor: !day.isCurrentMonth
                                ? "#f8fafc"
                                : day.isWeekend
                                ? "#f8fafc"
                                : "#ffffff",
                              borderLeft: dIdx < 6 ? "1px solid #e2e8f0" : "none",
                            }}
                          >
                            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "flex-start", width: "100%" }}>
                              <span
                                style={{
                                  fontSize: "11px",
                                  fontWeight: day.isCurrentMonth ? 800 : 500,
                                  padding: "1px 5px",
                                  borderRadius: "9999px",
                                  backgroundColor: day.isToday ? "#1d4ed8" : "transparent",
                                  color: day.isToday
                                    ? "#ffffff"
                                    : day.isCurrentMonth
                                    ? "#0f172a"
                                    : "#94a3b8",
                                  display: "inline-block",
                                }}
                              >
                                {day.dayNumber}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* Continuous Gantt Ribbon Segments */}
                      <div
                        style={{
                          position: "relative",
                          paddingTop: "26px",
                          paddingBottom: "4px",
                          paddingLeft: "2px",
                          paddingRight: "2px",
                          zIndex: 2,
                          width: "100%",
                          boxSizing: "border-box",
                        }}
                      >
                        {Array.from({ length: week.maxSlots }).map((_, sIdx) => {
                          const segs = week.segments.filter(
                            (s) => s.slotIndex === sIdx
                          );
                          return (
                            <div
                              key={`a4-slot-${sIdx}`}
                              style={{
                                position: "relative",
                                height: "22px",
                                marginBottom: "3px",
                                width: "100%",
                                boxSizing: "border-box",
                              }}
                            >
                              {segs.map((seg) => {
                                const isSingle =
                                  seg.event.startDate === seg.event.endDate;
                                const rightPct = (seg.startCol / 7) * 100;
                                const widthPct = ((seg.endCol - seg.startCol + 1) / 7) * 100;
                                const isStart = seg.isStartOfEvent;
                                const isEnd = seg.isEndOfEvent;

                                return (
                                  <div
                                    key={`a4-seg-${seg.event.id}-${seg.startCol}`}
                                    style={{
                                      position: "absolute",
                                      right: `${rightPct}%`,
                                      width: `${widthPct}%`,
                                      top: 0,
                                      bottom: 0,
                                      backgroundColor: seg.event.color,
                                      color: seg.event.textColor || "#ffffff",
                                      padding: "0 6px",
                                      display: "flex",
                                      alignItems: "center",
                                      justifyContent: "flex-start",
                                      fontSize: "11px",
                                      fontWeight: 700,
                                      overflow: "hidden",
                                      boxSizing: "border-box",
                                      borderTopRightRadius: isSingle || isStart ? "4px" : "0px",
                                      borderBottomRightRadius: isSingle || isStart ? "4px" : "0px",
                                      borderTopLeftRadius: isSingle || isEnd ? "4px" : "0px",
                                      borderBottomLeftRadius: isSingle || isEnd ? "4px" : "0px",
                                      boxShadow: "0 1px 2px rgba(0,0,0,0.12)",
                                    }}
                                  >
                                    <span
                                      style={{
                                        overflow: "hidden",
                                        textOverflow: "ellipsis",
                                        whiteSpace: "nowrap",
                                        width: "100%",
                                        textAlign: "right",
                                      }}
                                    >
                                      {seg.event.title}
                                    </span>
                                  </div>
                                );
                              })}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Print Footer */}
            <div
              className="mt-3 pt-2.5 flex items-center justify-between text-[11px] font-medium"
              style={{ borderTop: "1px solid #cbd5e1", color: "#64748b" }}
            >
              <span>חטיבת הביניים ב׳ אבו סנאן • משרד החינוך</span>
              <span className="text-center font-semibold" style={{ color: "#475569" }}>
                כל הזכויות שמורות לעמאר פאעור © {new Date().getFullYear()}
              </span>
              <span>{formatIsraeliDate(new Date().toISOString().split("T")[0])}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
