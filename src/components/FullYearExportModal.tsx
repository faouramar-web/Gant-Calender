import React, { useState, useEffect, useMemo, useRef } from "react";
import {
  X,
  Download,
  Printer,
  CheckCircle,
  FileDown,
  Loader2,
  Sparkles,
  ExternalLink,
  AlertTriangle,
  Layers,
  Calendar,
  CheckSquare,
  Square,
  Eye,
  Building2,
  PrinterCheck,
  FileText
} from "lucide-react";
import html2canvas from "html2canvas-pro";
import { jsPDF } from "jspdf";
import { CalendarEvent, WeekData } from "../types";
import {
  buildMonthWeeks,
  HEBREW_MONTH_NAMES,
  HEBREW_WEEKDAY_NAMES,
  formatIsraeliDate,
} from "../utils/dateUtils";

interface FullYearExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentDate: Date;
  events: CalendarEvent[];
}

interface MonthItem {
  year: number;
  monthIndex: number;
  monthName: string;
  label: string;
  weeks: WeekData[];
}

export const FullYearExportModal: React.FC<FullYearExportModalProps> = ({
  isOpen,
  onClose,
  currentDate,
  events,
}) => {
  // Paper size: A4 Landscape or A3 Landscape
  const [pageSize, setPageSize] = useState<"a4" | "a3">("a4");
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [currentProgress, setCurrentProgress] = useState<{ current: number; total: number; monthName: string }>({
    current: 0,
    total: 0,
    monthName: "",
  });
  const [downloadSuccess, setDownloadSuccess] = useState(false);
  const [pdfBlobUrl, setPdfBlobUrl] = useState<string | null>(null);
  const [pdfErrorMessage, setPdfErrorMessage] = useState<string | null>(null);
  const [activePreviewIndex, setActivePreviewIndex] = useState(0);

  // Determine academic year (September to August)
  const currMonth = currentDate.getMonth();
  const currYear = currentDate.getFullYear();
  const startAcademicYear = currMonth >= 8 ? currYear : currYear - 1;
  const endAcademicYear = startAcademicYear + 1;

  // Build the 12 months data
  const allMonths: MonthItem[] = useMemo(() => {
    const list: MonthItem[] = [];

    // Sep to Dec of start year
    for (let m = 8; m <= 11; m++) {
      list.push({
        year: startAcademicYear,
        monthIndex: m,
        monthName: HEBREW_MONTH_NAMES[m],
        label: `${HEBREW_MONTH_NAMES[m]} ${startAcademicYear}`,
        weeks: buildMonthWeeks(startAcademicYear, m, events),
      });
    }

    // Jan to Aug of end year
    for (let m = 0; m <= 7; m++) {
      list.push({
        year: endAcademicYear,
        monthIndex: m,
        monthName: HEBREW_MONTH_NAMES[m],
        label: `${HEBREW_MONTH_NAMES[m]} ${endAcademicYear}`,
        weeks: buildMonthWeeks(endAcademicYear, m, events),
      });
    }

    return list;
  }, [startAcademicYear, endAcademicYear, events]);

  // Selected months state (default: all 12 months)
  const [selectedMonthsIndices, setSelectedMonthsIndices] = useState<number[]>(() =>
    allMonths.map((_, idx) => idx)
  );

  // Selected months list
  const selectedMonthsList = useMemo(
    () => allMonths.filter((_, idx) => selectedMonthsIndices.includes(idx)),
    [allMonths, selectedMonthsIndices]
  );
  const totalSelected = selectedMonthsList.length;

  // Keep selection valid if months list updates
  useEffect(() => {
    setSelectedMonthsIndices(allMonths.map((_, idx) => idx));
  }, [allMonths.length]);

  // Clean up blob URL on unmount or options change
  useEffect(() => {
    return () => {
      if (pdfBlobUrl) {
        URL.revokeObjectURL(pdfBlobUrl);
      }
    };
  }, [pdfBlobUrl]);

  // Keep activePreviewIndex clamped
  useEffect(() => {
    if (selectedMonthsList.length > 0 && activePreviewIndex >= selectedMonthsList.length) {
      setActivePreviewIndex(Math.max(0, selectedMonthsList.length - 1));
    }
  }, [selectedMonthsList.length, activePreviewIndex]);

  // DO NOT place hooks below this line
  if (!isOpen) return null;

  const toggleSelectMonth = (index: number) => {
    setSelectedMonthsIndices((prev) =>
      prev.includes(index) ? prev.filter((i) => i !== index) : [...prev, index].sort((a, b) => a - b)
    );
  };

  const handleSelectAll = () => {
    setSelectedMonthsIndices(allMonths.map((_, idx) => idx));
  };

  const handleSelectSchoolYearOnly = () => {
    // 10 months: September to June (indices 0 to 9)
    setSelectedMonthsIndices([0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
  };

  const isA4 = pageSize === "a4";
  const pdfFormatName = isA4 ? "A4 לרוחב" : "A3 לרוחב";
  const pdfFileName = `לוח גאנט שנתי מלא (${pdfFormatName}) תשפ״ז – חטיבת הביניים ב׳ אבו סנאן.pdf`;

  const handleTabClick = (idx: number, year: number, monthIndex: number) => {
    setActivePreviewIndex(idx);
    const elementId = `full-year-month-page-${year}-${monthIndex}`;
    const el = document.getElementById(elementId);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  // Multi-page PDF generation for all selected months
  const handleGenerateFullPdf = async () => {
    if (totalSelected === 0) {
      setPdfErrorMessage("יש לבחור לפחות חודש אחד להפקה");
      return;
    }

    try {
      setIsGeneratingPdf(true);
      setPdfErrorMessage(null);
      setDownloadSuccess(false);

      if (pdfBlobUrl) {
        URL.revokeObjectURL(pdfBlobUrl);
        setPdfBlobUrl(null);
      }

      const pdfWidth = isA4 ? 297 : 420;
      const pdfHeight = isA4 ? 210 : 297;
      const marginMm = isA4 ? 5 : 8;
      const availWidth = pdfWidth - marginMm * 2;
      const availHeight = pdfHeight - marginMm * 2;

      const pdf = new jsPDF({
        orientation: "landscape",
        unit: "mm",
        format: isA4 ? "a4" : "a3",
        compress: true,
      });

      for (let i = 0; i < totalSelected; i++) {
        const monthItem = selectedMonthsList[i];
        setActivePreviewIndex(i);
        setCurrentProgress({
          current: i + 1,
          total: totalSelected,
          monthName: monthItem.label,
        });

        const elementId = `full-year-month-page-${monthItem.year}-${monthItem.monthIndex}`;
        const pageElem = document.getElementById(elementId);

        if (!pageElem) {
          console.warn(`Element for ${monthItem.label} not found, skipping`);
          continue;
        }

        // Scroll the element into view so it is fully rendered in layout
        pageElem.scrollIntoView({ behavior: "auto", block: "nearest" });
        await new Promise((resolve) => setTimeout(resolve, 80));

        // Render page with html2canvas-pro at 2x scale
        const canvas = await html2canvas(pageElem, {
          scale: 2,
          useCORS: true,
          logging: false,
          backgroundColor: "#ffffff",
          allowTaint: true,
          windowWidth: pageElem.scrollWidth || 1100,
        });

        if (!canvas || !canvas.width || !canvas.height || canvas.width <= 0 || canvas.height <= 0) {
          throw new Error(`שגיאה בלכידת עמוד ${monthItem.label} (ממדי דף לא תקינים)`);
        }

        const imgData = canvas.toDataURL("image/jpeg", 0.95);

        if (i > 0) {
          pdf.addPage(isA4 ? "a4" : "a3", "landscape");
        }

        const scaleFactor = Math.min(availWidth / canvas.width, availHeight / canvas.height);
        const renderWidth = canvas.width * scaleFactor;
        const renderHeight = canvas.height * scaleFactor;
        const offsetX = marginMm + (availWidth - renderWidth) / 2;
        const offsetY = marginMm + (availHeight - renderHeight) / 2;

        if (
          !Number.isFinite(offsetX) ||
          !Number.isFinite(offsetY) ||
          !Number.isFinite(renderWidth) ||
          !Number.isFinite(renderHeight) ||
          renderWidth <= 0 ||
          renderHeight <= 0
        ) {
          throw new Error(`חישוב קואורדינטות שגוי עבור עמוד ${monthItem.label}`);
        }

        pdf.addImage(
          imgData,
          "JPEG",
          Number(offsetX.toFixed(2)),
          Number(offsetY.toFixed(2)),
          Number(renderWidth.toFixed(2)),
          Number(renderHeight.toFixed(2)),
          undefined,
          "FAST"
        );
      }

      const blob = pdf.output("blob");
      const blobUrl = URL.createObjectURL(blob);
      setPdfBlobUrl(blobUrl);

      // Trigger automatic file download
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
      console.error("Full year PDF generation error:", err);
      setIsGeneratingPdf(false);
      setPdfErrorMessage(err?.message || "חלה שגיאה בהפקת קובץ ה-PDF השנתי המלא");
    }
  };

  const handleNativePrint = () => {
    try {
      window.print();
    } catch (err) {
      console.warn("Native print error:", err);
      handleGenerateFullPdf();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-900/80 backdrop-blur-xs animate-in fade-in duration-200 print:p-0 print:bg-white print:static">
      {/* Dynamic print styles for printing all months with page breaks */}
      <style>{`
        @page {
          size: ${isA4 ? "A4 landscape" : "A3 landscape"};
          margin: ${isA4 ? "4mm" : "6mm"};
        }
        @media print {
          html, body {
            width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
            background: #ffffff !important;
          }
          .no-print {
            display: none !important;
          }
          .full-year-print-page {
            width: 100% !important;
            max-width: 100% !important;
            margin: 0 auto !important;
            padding: ${isA4 ? "3mm 4mm" : "5mm 6mm"} !important;
            box-shadow: none !important;
            border: none !important;
            page-break-after: always !important;
            break-after: page !important;
          }
          .full-year-print-page:last-child {
            page-break-after: auto !important;
            break-after: auto !important;
          }
        }
      `}</style>

      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-6xl overflow-hidden flex flex-col max-h-[96vh] print:max-h-none print:shadow-none print:border-0 print:rounded-none print:w-full">
        {/* Modal Top Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-50/90 no-print">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-sky-500 via-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-sky-500/25 shrink-0">
              <Layers className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg sm:text-xl font-extrabold text-slate-900">
                  הפקת קובץ PDF מלא לכל החודשים (למכון הדפסה)
                </h3>
                <span className="hidden sm:inline-flex items-center gap-1 text-[11px] font-bold text-sky-800 bg-sky-50 border border-sky-200 px-2.5 py-0.5 rounded-full">
                  <Building2 className="w-3.5 h-3.5 text-sky-600" />
                  מוכן לשליחה לדפוס
                </span>
              </div>
              <p className="text-xs text-slate-500 font-medium mt-0.5">
                איחוד כל חודשי שנת הלימודים תשפ״ז לקובץ PDF אחד איכותי • חטיבת הביניים ב׳ אבו סנאן
              </p>
            </div>
          </div>

          <div className="flex items-center flex-wrap gap-2.5 justify-end">
            {/* Format selection */}
            <div className="bg-slate-200/80 p-1 rounded-full flex items-center gap-1 text-xs font-bold text-slate-700">
              <button
                type="button"
                onClick={() => setPageSize("a4")}
                className={`px-3 py-1.5 rounded-full transition-all cursor-pointer ${
                  pageSize === "a4"
                    ? "bg-white text-sky-800 shadow-2xs font-extrabold"
                    : "text-slate-600 hover:text-slate-900"
                }`}
                title="גודל דף A4 לרוחב (מדפסת משרדית או חוברת)"
              >
                A4 לרוחב
              </button>
              <button
                type="button"
                onClick={() => setPageSize("a3")}
                className={`px-3 py-1.5 rounded-full transition-all cursor-pointer ${
                  pageSize === "a3"
                    ? "bg-white text-sky-800 shadow-2xs font-extrabold"
                    : "text-slate-600 hover:text-slate-900"
                }`}
                title="גודל דף A3 לרוחב (פוסטר גדול ללוח קיר)"
              >
                A3 לרוחב (פוסטר)
              </button>
            </div>

            {/* Native Print Button */}
            <button
              onClick={handleNativePrint}
              disabled={isGeneratingPdf || totalSelected === 0}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs sm:text-sm font-bold transition-colors cursor-pointer shadow-2xs disabled:opacity-50"
              title="הדפסת כל החודשים הנבחרים במדפסת"
            >
              <Printer className="w-4 h-4 text-slate-600" />
              <span>הדפסה במדפסת</span>
            </button>

            {/* Generate Full PDF Button */}
            <button
              onClick={handleGenerateFullPdf}
              disabled={isGeneratingPdf || totalSelected === 0}
              className="inline-flex items-center gap-1.5 px-5 py-2 rounded-full bg-[#0EA5E9] hover:bg-[#0284c7] disabled:opacity-50 text-white text-xs sm:text-sm font-bold shadow-md shadow-sky-500/20 transition-all cursor-pointer"
            >
              {isGeneratingPdf ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>מפיק PDF ({currentProgress.current}/{currentProgress.total})...</span>
                </>
              ) : (
                <>
                  <Download className="w-4 h-4" />
                  <span>הורדת PDF לכל החודשים ({totalSelected})</span>
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

        {/* Month Selector Bar & Quick Preset Filters */}
        <div className="px-6 py-3 border-b border-slate-200 bg-white flex flex-col lg:flex-row items-start lg:items-center justify-between gap-3 text-xs no-print">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-bold text-slate-700 flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-sky-600" />
              חודשים להדפסה:
            </span>
            <button
              onClick={handleSelectAll}
              className={`px-2.5 py-1 rounded-lg font-bold border transition-colors cursor-pointer ${
                selectedMonthsIndices.length === allMonths.length
                  ? "bg-sky-50 text-sky-700 border-sky-300"
                  : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
              }`}
            >
              כל 12 החודשים
            </button>
            <button
              onClick={handleSelectSchoolYearOnly}
              className={`px-2.5 py-1 rounded-lg font-bold border transition-colors cursor-pointer ${
                selectedMonthsIndices.length === 10 && !selectedMonthsIndices.includes(10) && !selectedMonthsIndices.includes(11)
                  ? "bg-sky-50 text-sky-700 border-sky-300"
                  : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
              }`}
            >
              שנת לימודים (ספטמבר – יוני)
            </button>
          </div>

          <div className="flex items-center gap-1.5 flex-wrap">
            {allMonths.map((m, idx) => {
              const isSelected = selectedMonthsIndices.includes(idx);
              return (
                <button
                  key={`month-chip-${m.year}-${m.monthIndex}`}
                  onClick={() => toggleSelectMonth(idx)}
                  className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-bold border transition-all cursor-pointer ${
                    isSelected
                      ? "bg-sky-500 text-white border-sky-600 shadow-2xs"
                      : "bg-white text-slate-400 border-slate-200 hover:text-slate-700 hover:bg-slate-50"
                  }`}
                  title={isSelected ? "לחץ להסרה מהקובץ" : "לחץ להוספה לקובץ"}
                >
                  {isSelected ? (
                    <CheckSquare className="w-3 h-3 stroke-[2.5]" />
                  ) : (
                    <Square className="w-3 h-3" />
                  )}
                  <span>{m.monthName}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Progress bar during generation */}
        {isGeneratingPdf && (
          <div className="mx-6 mt-4 p-4 bg-sky-50 border border-sky-200 rounded-2xl flex flex-col gap-2.5 no-print animate-in fade-in">
            <div className="flex items-center justify-between text-xs font-bold text-sky-900">
              <span className="flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin text-sky-600" />
                מעבד דף {currentProgress.current} מתוך {currentProgress.total}: {currentProgress.monthName}
              </span>
              <span>{Math.round((currentProgress.current / currentProgress.total) * 100)}%</span>
            </div>
            <div className="w-full bg-sky-200 rounded-full h-2.5 overflow-hidden">
              <div
                className="bg-sky-600 h-2.5 rounded-full transition-all duration-300 ease-out"
                style={{
                  width: `${(currentProgress.current / currentProgress.total) * 100}%`,
                }}
              />
            </div>
            <p className="text-[11px] text-sky-700 text-center">
              יוצר קובץ PDF ברזולוציה גבוהה (2x) מותאם להדפסה מקצועית במכון הדפסות. אנא המתן מספר שניות...
            </p>
          </div>
        )}

        {/* Success / Download Alert Card */}
        {downloadSuccess && (
          <div className="mx-6 mt-4 p-4 bg-emerald-50 border-2 border-emerald-300 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-emerald-950 no-print animate-in slide-in-from-top-2">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                <CheckCircle className="w-5 h-5" />
              </div>
              <div>
                <p className="font-extrabold text-sm text-emerald-900">
                  קובץ ה-PDF המלא ({totalSelected} עמודים • {pdfFormatName}) הופק בהצלחה!
                </p>
                <p className="text-xs text-emerald-700 mt-0.5">
                  הקובץ מוכן לשליחה בדוא״ל או בוואטסאפ למכון ההדפסות.
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
                  <span>שמור שוב</span>
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
              <p className="font-bold text-rose-950">שגיאה בהפקה:</p>
              <p>{pdfErrorMessage}</p>
            </div>
          </div>
        )}

        {/* Month Preview Selector Tabs */}
        <div className="px-6 pt-3 flex items-center justify-between text-xs text-slate-500 no-print">
          <div className="flex items-center gap-1.5 font-bold text-slate-700">
            <Eye className="w-4 h-4 text-sky-600" />
            תצוגה מקדימה וניווט מהיר:
          </div>
          <div className="flex items-center gap-1 overflow-x-auto pb-1 max-w-[70%]">
            {selectedMonthsList.map((m, idx) => (
              <button
                key={`preview-tab-${m.year}-${m.monthIndex}`}
                onClick={() => handleTabClick(idx, m.year, m.monthIndex)}
                className={`px-3 py-1 rounded-full text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                  activePreviewIndex === idx
                    ? "bg-sky-600 text-white shadow-2xs"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                עמוד {idx + 1}: {m.monthName}
              </button>
            ))}
          </div>
        </div>

        {/* Scrollable Container containing all months */}
        {/* All selected months are rendered visibly in DOM for high-precision html2canvas capture & print */}
        <div className="p-6 overflow-y-auto bg-slate-100/60 flex flex-col items-center gap-8 print:p-0 print:bg-white print:overflow-visible">
          {selectedMonthsList.map((monthItem, pageIdx) => {
            const isPreviewActive = pageIdx === activePreviewIndex;
            const weeks = monthItem.weeks;
            const numWeeks = weeks.length;
            const isSixWeeks = numWeeks >= 6;

            // Optimal height calculations based on paper size and weeks count
            const defaultWeekMinH = isA4
              ? (numWeeks <= 4 ? 138 : numWeeks === 5 ? 112 : 92)
              : (numWeeks <= 4 ? 190 : numWeeks === 5 ? 155 : 130);

            const baseH = isA4 ? (isSixWeeks ? 28 : 34) : 42;
            const slotH = isA4 ? (isSixWeeks ? 19 : 21) : 26;
            const ribbonH = isA4 ? (isSixWeeks ? "18px" : "21px") : "24px";
            const ribbonFontSize = isA4 ? (isSixWeeks ? "10px" : "11.5px") : "12.5px";
            const ribbonPaddingTop = isA4 ? (isSixWeeks ? "24px" : "28px") : "32px";
            const dayNumberFontSize = isA4 ? (isSixWeeks ? "11px" : "12px") : "13px";

            return (
              <div
                key={`month-container-${monthItem.year}-${monthItem.monthIndex}`}
                className="w-full flex flex-col items-center gap-2"
                style={{ maxWidth: isA4 ? "980px" : "1200px" }}
              >
                <div className="w-full flex items-center justify-between text-xs text-slate-600 px-1 no-print">
                  <span className="font-bold flex items-center gap-1.5">
                    <span className="w-5 h-5 rounded-full bg-sky-600 text-white flex items-center justify-center text-[10px] font-extrabold shadow-2xs">
                      {pageIdx + 1}
                    </span>
                    <span>עמוד {pageIdx + 1} מתוך {totalSelected}: {monthItem.label}</span>
                  </span>
                  <span className="text-[11px] text-slate-400 font-medium">
                    {monthItem.weeks.length} שבועות • {pdfFormatName}
                  </span>
                </div>

                <div
                  id={`full-year-month-page-${monthItem.year}-${monthItem.monthIndex}`}
                  dir="rtl"
                  className={`full-year-print-page w-full bg-white rounded-xl shadow-lg border p-4 sm:p-5 text-slate-900 print:shadow-none print:border-none print:p-0 print:rounded-none transition-all duration-200 ${
                    isPreviewActive
                      ? "border-sky-500 ring-4 ring-sky-100 shadow-xl"
                      : "border-slate-300 hover:border-slate-400"
                  }`}
                  style={{
                    maxWidth: isA4 ? "980px" : "1200px",
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
                  className="pb-2 mb-2.5 flex items-center justify-between"
                  style={{ borderBottom: "2px solid #0f172a" }}
                >
                  <div>
                    <h1 className="text-lg sm:text-xl font-bold tracking-normal" style={{ color: "#0f172a" }}>
                      לוח גאנט – חטיבת הביניים ב׳ אבו סנאן
                    </h1>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span
                        className="text-[10px] font-semibold px-2 py-0.5 rounded"
                        style={{ backgroundColor: "#f1f5f9", color: "#334155" }}
                      >
                        סמל מוסד: 640615
                      </span>
                      <span className="text-[10px] font-medium" style={{ color: "#64748b" }}>
                        שנת הלימודים תשפ״ז
                      </span>
                    </div>
                  </div>

                  <div className="text-left">
                    <div className="text-xl sm:text-2xl font-bold" style={{ color: "#1e40af" }}>
                      {monthItem.monthName} {monthItem.year}
                    </div>
                    <div className="text-[10px] font-medium mt-0.5" style={{ color: "#64748b" }}>
                      עמוד {pageIdx + 1} מתוך {totalSelected} • פורמט {pdfFormatName}
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
                          key={`wd-${monthItem.monthIndex}-${name}`}
                          style={{
                            width: "14.2857%",
                            flex: "0 0 14.2857%",
                            backgroundColor: isOffDay ? "#4f46e5" : "#2563eb",
                            color: "#ffffff",
                            padding: isA4 ? (isSixWeeks ? "5px 0" : "6px 0") : "7px 0",
                            textAlign: "center",
                            fontWeight: 700,
                            fontSize: isA4 ? (isSixWeeks ? "11.5px" : "12.5px") : "13.5px",
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
                      const minH = Math.max(defaultWeekMinH, baseH + week.maxSlots * slotH);

                      return (
                        <div
                          key={`month-${monthItem.monthIndex}-week-${weekIdx}`}
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
                                key={`m-${monthItem.monthIndex}-d-${day.dateString}`}
                                style={{
                                  width: "14.2857%",
                                  flex: "0 0 14.2857%",
                                  boxSizing: "border-box",
                                  height: "100%",
                                  padding: isA4 ? "3px 5px" : "5px 6px",
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
                                      fontSize: dayNumberFontSize,
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

                          {/* Continuous Gantt Ribbon Segments */}
                          <div
                            style={{
                              position: "relative",
                              paddingTop: ribbonPaddingTop,
                              paddingBottom: "3px",
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
                                  key={`m-${monthItem.monthIndex}-slot-${sIdx}`}
                                  style={{
                                    position: "relative",
                                    height: ribbonH,
                                    marginBottom: isA4 ? "2.5px" : "3px",
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
                                        key={`m-${monthItem.monthIndex}-seg-${seg.event.id}-${seg.startCol}`}
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
                                          fontSize: ribbonFontSize,
                                          fontWeight: 700,
                                          overflow: "hidden",
                                          boxSizing: "border-box",
                                          borderTopRightRadius: isSingle || isStart ? "3px" : "0px",
                                          borderBottomRightRadius: isSingle || isStart ? "3px" : "0px",
                                          borderTopLeftRadius: isSingle || isEnd ? "3px" : "0px",
                                          borderBottomLeftRadius: isSingle || isEnd ? "3px" : "0px",
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
                  className="mt-2 pt-1.5 flex items-center justify-between text-[10px] font-medium"
                  style={{ borderTop: "1px solid #cbd5e1", color: "#64748b" }}
                >
                  <span>חטיבת הביניים ב׳ אבו סנאן • משרד החינוך</span>
                  <span className="text-center font-semibold" style={{ color: "#475569" }}>
                    כל הזכויות שמורות לעמאר פאעור © {new Date().getFullYear()}
                  </span>
                  <span>
                    עמוד {pageIdx + 1} מתוך {totalSelected} • {formatIsraeliDate(new Date().toISOString().split("T")[0])}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
        </div>
      </div>
    </div>
  );
};
