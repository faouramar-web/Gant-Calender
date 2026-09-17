import React, { useState, useEffect } from "react";
import { X, Download, Printer, CheckCircle, FileDown, Loader2, Sparkles, ExternalLink, AlertTriangle } from "lucide-react";
import html2canvas from "html2canvas-pro";
import { jsPDF } from "jspdf";
import { CalendarEvent, WeekData } from "../types";
import { HEBREW_MONTH_NAMES, HEBREW_WEEKDAY_NAMES, formatIsraeliDate } from "../utils/dateUtils";

interface A3ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentDate: Date;
  weeks: WeekData[];
  events: CalendarEvent[];
}

export const A3ExportModal: React.FC<A3ExportModalProps> = ({
  isOpen,
  onClose,
  currentDate,
  weeks,
}) => {
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [downloadSuccess, setDownloadSuccess] = useState(false);
  const [pdfBlobUrl, setPdfBlobUrl] = useState<string | null>(null);
  const [pdfErrorMessage, setPdfErrorMessage] = useState<string | null>(null);

  // Clean up blob URL on unmount or close
  useEffect(() => {
    return () => {
      if (pdfBlobUrl) {
        URL.revokeObjectURL(pdfBlobUrl);
      }
    };
  }, [pdfBlobUrl]);

  if (!isOpen) return null;

  const monthName = HEBREW_MONTH_NAMES[currentDate.getMonth()];
  const year = currentDate.getFullYear();
  const pdfFileName = `לוח גאנט – ${monthName} ${year}.pdf`;

  const handleDownloadPdf = async () => {
    try {
      setIsGeneratingPdf(true);
      setPdfErrorMessage(null);
      setDownloadSuccess(false);

      const printableElement = document.getElementById("a3-printable-document");
      if (!printableElement) {
        throw new Error("רכיב ההדפסה לא נמצא במערכת");
      }

      // Render the DOM to canvas with high resolution scale using html2canvas-pro (native oklch & CSS3 support)
      const canvas = await html2canvas(printableElement, {
        scale: 2, // 2x DPI for crystal clear text on A3 paper
        useCORS: true,
        logging: false,
        backgroundColor: "#ffffff",
        allowTaint: true,
      });

      const imgData = canvas.toDataURL("image/jpeg", 0.95);

      // A3 Landscape dimensions in mm: 420 × 297
      const pdf = new jsPDF({
        orientation: "landscape",
        unit: "mm",
        format: "a3",
        compress: true,
      });

      const pdfWidth = 420;
      const pdfHeight = 297;

      // Fit proportionally without stretching or distortion
      const scaleFactor = Math.min(pdfWidth / canvas.width, pdfHeight / canvas.height);
      const renderWidth = canvas.width * scaleFactor;
      const renderHeight = canvas.height * scaleFactor;
      const offsetX = (pdfWidth - renderWidth) / 2;
      const offsetY = (pdfHeight - renderHeight) / 2;

      pdf.addImage(imgData, "JPEG", offsetX, offsetY, renderWidth, renderHeight, undefined, "FAST");

      // Generate Blob and Blob URL for reliable download across all browsers and iframes
      const blob = pdf.output("blob");
      const blobUrl = URL.createObjectURL(blob);
      setPdfBlobUrl(blobUrl);

      // Automatic trigger download
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
      console.error("PDF generation error:", err);
      setIsGeneratingPdf(false);
      setPdfErrorMessage(err?.message || "חלה שגיאה ביצירת קובץ ה-PDF");
    }
  };

  const handleNativePrint = () => {
    try {
      window.print();
    } catch (err) {
      console.warn("Native print error:", err);
      // Fallback to generating and opening PDF
      handleDownloadPdf();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs animate-in fade-in duration-200 print:p-0 print:bg-white print:static">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-5xl overflow-hidden flex flex-col max-h-[95vh] print:max-h-none print:shadow-none print:border-0 print:rounded-none print:w-full">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/80 no-print">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-100 flex items-center justify-center text-indigo-700">
              <Printer className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-extrabold text-slate-900">
                שמירה והדפסה A3 לרוחב
              </h3>
              <p className="text-xs text-slate-500 font-medium">
                {monthName} {year} • חטיבת הביניים ב׳ אבו סנאן
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
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
                  <span>מפיק PDF בגודל A3...</span>
                </>
              ) : (
                <>
                  <Download className="w-4 h-4" />
                  <span>הורדת קובץ PDF (A3)</span>
                </>
              )}
            </button>

            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-slate-200/70 hover:bg-slate-300 flex items-center justify-center text-slate-600 transition-colors cursor-pointer mr-2"
              title="סגירה"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Success and Download Action Card */}
        {downloadSuccess && (
          <div className="mx-6 mt-4 p-4 bg-emerald-50 border-2 border-emerald-300 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-emerald-950 no-print animate-in slide-in-from-top-2">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                <CheckCircle className="w-5 h-5" />
              </div>
              <div>
                <p className="font-extrabold text-sm text-emerald-900">
                  קובץ ה-PDF בגודל A3 הופק בהצלחה!
                </p>
                <p className="text-xs text-emerald-700 mt-0.5">
                  אם ההורדה האוטומטית לא החלה (למשל עקב הגדרות דפדפן):
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
            <span>תצוגה מקדימה של דף ה-A3 (לרוחב, מוכן להדפסה ללא כפתורי עריכה):</span>
            <span className="font-semibold text-indigo-700 flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5" />
              פורמט 420mm × 297mm
            </span>
          </div>

          {/* Printable Layout Target Container for HTML2Canvas */}
          <div
            id="a3-printable-document"
            dir="rtl"
            className="w-full bg-white rounded-xl shadow-lg border border-slate-300 p-8 text-slate-900 print:shadow-none print:border-none print:p-0 print:rounded-none"
            style={{
              minWidth: "900px",
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
              className="pb-4 mb-6 flex items-center justify-between"
              style={{ borderBottom: "2px solid #0f172a" }}
            >
              <div>
                <h1 className="text-2xl font-bold text-slate-900 tracking-normal" style={{ color: "#0f172a" }}>
                  לוח גאנט – חטיבת הביניים ב׳ אבו סנאן
                </h1>
                <div className="flex items-center gap-3 mt-1">
                  <span
                    className="text-sm font-semibold px-2.5 py-0.5 rounded"
                    style={{ backgroundColor: "#f1f5f9", color: "#334155" }}
                  >
                    סמל מוסד: 640615
                  </span>
                  <span className="text-xs font-medium" style={{ color: "#64748b" }}>
                    שנת הלימודים תשפ״ז
                  </span>
                </div>
              </div>

              <div className="text-left">
                <div className="text-3xl font-bold" style={{ color: "#1e40af" }}>
                  {monthName} {year}
                </div>
                <div className="text-xs font-medium mt-0.5" style={{ color: "#64748b" }}>
                  לוח תכנון ופעילות חודשי
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
                  const isOffDay = i === 0 || i === 5; // Sunday & Friday
                  return (
                    <div
                      key={name}
                      style={{
                        width: "14.2857%",
                        flex: "0 0 14.2857%",
                        backgroundColor: isOffDay ? "#4f46e5" : "#2563eb",
                        color: "#ffffff",
                        padding: "10px 0",
                        textAlign: "center",
                        fontWeight: 700,
                        fontSize: "13px",
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
                  const minH = Math.max(90, 45 + week.maxSlots * 26);
                  return (
                    <div
                      key={`print-week-${weekIdx}`}
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
                            key={`print-${day.dateString}`}
                            style={{
                              width: "14.2857%",
                              flex: "0 0 14.2857%",
                              boxSizing: "border-box",
                              height: "100%",
                              padding: "6px",
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
                                  fontSize: "12px",
                                  fontWeight: day.isCurrentMonth ? 800 : 500,
                                  padding: "2px 6px",
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

                      {/* Continuous Gantt Ribbon Segments for Print */}
                      <div
                        style={{
                          position: "relative",
                          paddingTop: "28px",
                          paddingBottom: "6px",
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
                              key={`print-slot-${sIdx}`}
                              style={{
                                position: "relative",
                                height: "26px",
                                marginBottom: "4px",
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
                                    key={`print-${seg.event.id}-${seg.startCol}`}
                                    style={{
                                      position: "absolute",
                                      right: `${rightPct}%`,
                                      width: `${widthPct}%`,
                                      top: 0,
                                      bottom: 0,
                                      backgroundColor: seg.event.color,
                                      color: seg.event.textColor || "#ffffff",
                                      padding: "0 8px",
                                      display: "flex",
                                      alignItems: "center",
                                      justifyContent: "flex-start",
                                      fontSize: "12px",
                                      fontWeight: 700,
                                      overflow: "hidden",
                                      boxSizing: "border-box",
                                      borderTopRightRadius: isSingle || isStart ? "6px" : "0px",
                                      borderBottomRightRadius: isSingle || isStart ? "6px" : "0px",
                                      borderTopLeftRadius: isSingle || isEnd ? "6px" : "0px",
                                      borderBottomLeftRadius: isSingle || isEnd ? "6px" : "0px",
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
              className="mt-4 pt-3 flex items-center justify-between text-xs font-medium"
              style={{ borderTop: "1px solid #cbd5e1", color: "#64748b" }}
            >
              <span>חטיבת הביניים ב׳ אבו סנאן • משרד החינוך • מחוז צפון</span>
              <span className="text-center font-semibold" style={{ color: "#475569" }}>
                כל הזכויות שמורות לעמאר פאעור © {new Date().getFullYear()} • Amar Faour
              </span>
              <span>הופק בתאריך: {formatIsraeliDate(new Date().toISOString().split("T")[0])}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
