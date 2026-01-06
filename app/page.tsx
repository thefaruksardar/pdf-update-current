"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import toast from "react-hot-toast";
import confetti from "canvas-confetti";
import {
  File,
  Plus,
  RotateCcw,
  SquareArrowOutUpRight,
  Upload,
  X,
} from "lucide-react";
import Link from "next/link";

type UploadFile = {
  name: string;
  html: string;
  pdfMeta: {
    author: string;
    subject: string;
    keywords: string;
    created: string;
    modified: string;
    producer: string;
  };
};

type FindReplaceRule = {
  find: string;
  replace: string;
};

export default function HtmlToPdfUploader() {
  const [loading, setLoading] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [codeLength, setCodeLength] = useState(6);
  const [includeLowercase, setIncludeLowercase] = useState(true);
  const [includeUppercase, setIncludeUppercase] = useState(false);
  const [includeDigits, setIncludeDigits] = useState(true);
  const [previewCode, setPreviewCode] = useState("");

  const [pdfMeta, setPdfMeta] = useState({
    author: "",
    subject: "",
    keywords: "",
    created: "",
    modified: "",
    producer: "",
  });

  const [findReplaceRules, setFindReplaceRules] = useState<FindReplaceRule[]>([
    { find: "", replace: "" },
  ]);

  // File upload state
  const [fileStatus, setFileStatus] = useState("No file chosen");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const generateRandomCode = useCallback((): string => {
    let chars = "";
    if (includeLowercase) chars += "abcdefghijklmnopqrstuvwxyz";
    if (includeUppercase) chars += "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    if (includeDigits) chars += "0123456789";

    if (!chars) return "";

    let result = "";
    for (let i = 0; i < codeLength; i++) {
      result += chars[Math.floor(Math.random() * chars.length)];
    }
    return result;
  }, [codeLength, includeLowercase, includeUppercase, includeDigits]);

  useEffect(() => {
    setPreviewCode(generateRandomCode());
  }, [generateRandomCode]);

  const getDateString = (): string => {
    const date = selectedDate || new Date();
    return date.toLocaleDateString("en-US", {
      month: "long",
      day: "2-digit",
      year: "numeric",
    });
  };

  const addFindReplaceRule = () => {
    setFindReplaceRules([...findReplaceRules, { find: "", replace: "" }]);
  };

  const removeFindReplaceRule = (index: number) => {
    if (findReplaceRules.length === 1) return;
    const newRules = findReplaceRules.filter((_, i) => i !== index);
    setFindReplaceRules(newRules);
  };

  const updateFindReplaceRule = (
    index: number,
    field: "find" | "replace",
    value: string
  ) => {
    const newRules = [...findReplaceRules];
    newRules[index] = { ...newRules[index], [field]: value };
    setFindReplaceRules(newRules);
  };

  const applyFindReplace = (html: string): string => {
    let processed = html;

    findReplaceRules.forEach((rule) => {
      if (rule.find.trim()) {
        const regex = new RegExp(
          rule.find.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
          "gi"
        );
        processed = processed.replace(regex, rule.replace);
      }
    });

    return processed;
  };

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    setLoading(true);
    try {
      const uploadFiles: UploadFile[] = [];

      for (const file of Array.from(files)) {
        const text = await file.text();

        const randomCode = previewCode.trim()
          ? previewCode
          : generateRandomCode();
        const currentDate = getDateString();
        const currentYear = new Date().getFullYear().toString();

        let processed = applyFindReplace(text);

        processed = processed
          .replace(/\{CODE\}/g, `{${randomCode}}`)
          .replace(/\{DATE\}/g, currentDate)
          .replace(/\{YEAR\}/g, currentYear);

        const baseName = file.name.replace(/\.html?$/i, "");
        uploadFiles.push({
          name: `${baseName}.pdf`,
          html: processed,
          pdfMeta: {
            ...pdfMeta,
            // Only include modified if non-empty
            ...(pdfMeta.modified && { modified: pdfMeta.modified }),
          },
        });
      }

      const res = await fetch("/api/html-to-pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ files: uploadFiles }),
      });

      if (!res.ok) {
        console.error("Failed to generate PDF/ZIP");
        return;
      }

      toast.success("Download started");
      confetti({
        particleCount: 120,
        spread: 70,
        startVelocity: 45,
        origin: { y: 0.6 },
      });
      const blob = await res.blob();
      let filename = "document.pdf";
      if (uploadFiles.length > 1) {
        filename = "documents.zip";
      }

      const disposition = res.headers.get("Content-Disposition");
      if (disposition) {
        const match = disposition.match(/filename=\"(.+)\"/);
        if (match) filename = match[1];
      }

      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);

      // Update file status
      setFileStatus(`${files.length} file(s) chosen`);
    } catch (error) {
      toast.error("Failed to process files");
      console.error(error);
    } finally {
      setLoading(true); // Keep loader visible briefly for UX
      setTimeout(() => setLoading(false), 1500);
    }
  };

  // Reset all form state
  const resetForm = () => {
    setSelectedDate(null);
    setCodeLength(6);
    setIncludeLowercase(true);
    setIncludeUppercase(false);
    setIncludeDigits(true);
    setPreviewCode("");
    setPdfMeta({
      author: "",
      subject: "",
      keywords: "",
      created: "",
      modified: "",
      producer: "",
    });
    setFindReplaceRules([{ find: "", replace: "" }]);
    setFileStatus("No file chosen");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
    toast.success("Form reset");
  };

  return (
    <main className="bg-neutral-50 min-h-screen text-neutral-800  px-6 py-8 gap-6">
      {/* Left Panel - All Options */}
      <div className="max-w-6xl mx-auto flex flex-col md:flex-row">
        <div className="flex-1 max-w-2xl md:pr-6 md:overflow-y-auto">
          {/* Date Picker */}
          <div className="bg-white py-5 px-7 rounded-xl shadow-sm border border-gray-100 mb-4">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="text-sm font-semibold text-gray-800 tracking-wide">
                  Select Date
                </h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  Used for {`{DATE}`} and {`{YEAR}`} placeholders.
                </p>
              </div>
              <span className="inline-flex items-center justify-center h-8 w-8 rounded-full bg-indigo-50 text-indigo-600 text-lg">
                📅
              </span>
            </div>

            <div className="relative max-w-xs">
              <input
                className="w-full rounded-lg border border-gray-300 bg-gray-50 px-3 py-2.5  text-gray-800 shadow-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none transition"
                type="date"
                value={
                  selectedDate ? selectedDate.toISOString().split("T")[0] : ""
                }
                onChange={(e) =>
                  setSelectedDate(
                    e.target.value ? new Date(e.target.value) : null
                  )
                }
              />
            </div>

            <p className="mt-2 text-[11px] text-gray-500">
              Leave empty to use today’s date automatically.
            </p>
          </div>

          {/* Code Generator */}
          <div className="bg-white py-5 px-7 rounded-lg shadow/5 mb-4">
            <div className="mb-4">
              <label className="flex items-center gap-2 font-semibold">
                Code Length:
                <input
                  type="range"
                  min="1"
                  max="20"
                  value={codeLength}
                  onChange={(e) => setCodeLength(Number(e.target.value))}
                  className="flex-1 max-w-md"
                />
                <span className="font-bold min-w-[20px] text-center">
                  {codeLength}
                </span>
              </label>
            </div>
            <div className="flex flex-wrap gap-3 mb-4">
              <label className="flex items-center gap-1.5 p-2 rounded bg-gray-50">
                <input
                  type="checkbox"
                  checked={includeLowercase}
                  onChange={(e) => setIncludeLowercase(e.target.checked)}
                  className="rounded"
                />
                Lowercase (abc)
              </label>
              <label className="flex items-center gap-1.5 p-2 rounded bg-gray-50">
                <input
                  type="checkbox"
                  checked={includeUppercase}
                  onChange={(e) => setIncludeUppercase(e.target.checked)}
                  className="rounded"
                />
                Uppercase (ABC)
              </label>
              <label className="flex items-center gap-1.5 p-2 rounded bg-gray-50">
                <input
                  type="checkbox"
                  checked={includeDigits}
                  onChange={(e) => setIncludeDigits(e.target.checked)}
                  className="rounded"
                />
                Digits (123)
              </label>
            </div>
            <div className="bg-green-100/80 text-green-700 p-4 rounded-lg border border-green-700/50">
              <label className="block text-sm font-medium mb-2">
                Custom Code:
              </label>
              <input
                type="text"
                value={previewCode}
                onChange={(e) => setPreviewCode(e.target.value)}
                maxLength={20}
                placeholder="Type your custom code..."
                className="w-full p-3 border border-green-400 rounded-lg bg-green-50 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
              />
              <div className="text-xs mt-2 flex gap-2 items-center">
                <button
                  type="button"
                  onClick={() => setPreviewCode(generateRandomCode())}
                  className="text-green-700 underline hover:text-green-900 text-sm"
                >
                  Refresh
                </button>
                <span>Length: {previewCode.length}/20</span>
              </div>
            </div>
          </div>
          {/* Find & Replace */}
          <div className="bg-white py-5 px-7 rounded-lg shadow/5 mb-4">
            <h3 className="font-semibold mb-4 flex items-center gap-2 text-lg">
              Find & Replace
            </h3>
            {/* Main Rule #1 */}
            <div className="mb-5 p-4 bg-gray-50 rounded-lg">
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Main Rule
              </label>
              <div className="grid grid-cols-1 sm:flex gap-3">
                <input
                  type="text"
                  value={findReplaceRules[0]?.find || ""}
                  onChange={(e) =>
                    updateFindReplaceRule(0, "find", e.target.value)
                  }
                  placeholder="Find text..."
                  className="w-full p-3 border border-gray-300 rounded-lg font-mono text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 transition-all sm:flex-1"
                />
                <input
                  type="text"
                  value={findReplaceRules[0]?.replace || ""}
                  onChange={(e) =>
                    updateFindReplaceRule(0, "replace", e.target.value)
                  }
                  placeholder="Replace..."
                  className="w-full p-3 border border-gray-300 rounded-lg font-mono text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 transition-all sm:flex-1"
                />
              </div>
            </div>
            {/* Additional Rules */}
            {findReplaceRules.slice(1).map((rule, index) => (
              <div
                key={index + 1}
                className="flex items-end gap-3 mb-3 p-3 bg-gray-50 rounded-lg"
              >
                <div className="flex-1">
                  <label className="block text-xs text-gray-600 mb-1">
                    Find
                  </label>
                  <input
                    type="text"
                    value={rule.find}
                    onChange={(e) =>
                      updateFindReplaceRule(index + 1, "find", e.target.value)
                    }
                    placeholder="Find..."
                    className="w-full p-2.5 border border-gray-300 rounded-lg font-mono text-sm focus:outline-none focus:ring-1"
                  />
                </div>
                <div className="flex-1">
                  <label className="block text-xs text-gray-600 mb-1">
                    Replace
                  </label>
                  <input
                    type="text"
                    value={rule.replace}
                    onChange={(e) =>
                      updateFindReplaceRule(
                        index + 1,
                        "replace",
                        e.target.value
                      )
                    }
                    placeholder="Replace..."
                    className="w-full p-2.5 border border-gray-300 rounded-lg font-mono text-sm focus:outline-none focus:ring-1"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => removeFindReplaceRule(index + 1)}
                  className="px-2 py-2 bg-red-500 text-white text-sm rounded-lg hover:bg-red-600 transition-colors cursor-pointer"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ))}
            {/* Add More Button */}
            <button
              type="button"
              onClick={addFindReplaceRule}
              className="w-full p-3 bg-indigo-500 text-white rounded-lg hover:bg-indigo-600 transition-colors text-sm font-medium cursor-pointers flex justify-center items-center gap-1.5 cursor-pointer"
            >
              <Plus className="h-4 w-4" /> Add More Find & Replace
            </button>
            <div className="text-xs text-gray-600 mt-3 p-3 bg-gray-50 rounded-lg italic">
              Case-insensitive. Applies before {`{CODE}`}/{`{DATE}`}/{`{YEAR}`}.
            </div>
          </div>
          {/* PDF Metadata */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 mb-6">
            {/* Header */}
            <div className="flex items-center gap-3 mb-6">
              <div>
                <h3 className="font-semibold flex items-center gap-2 text-lg">
                  PDF Metadata
                </h3>
                <p className="text-sm text-gray-600">
                  Set document properties for all generated PDFs
                </p>
              </div>
            </div>

            {/* Subject - Full Width */}
            <div className="mb-6">
              <label className="block text-sm font-semibold text-gray-800 mb-2">
                Subject{" "}
                <span className="text-xs text-gray-500 font-normal">
                  (Most Important)
                </span>
              </label>
              <input
                placeholder="e.g., Monthly Sales Report - January 2026"
                value={pdfMeta.subject}
                onChange={(e) =>
                  setPdfMeta({ ...pdfMeta, subject: e.target.value })
                }
                className="w-full px-4 py-3 border border-gray-200 rounded-xl  focus:border-blue-500 focus:ring-4 focus:ring-blue-100/50 focus:outline-none focus:bg-white shadow-sm transition-all duration-200 placeholder:text-gray-400"
              />
            </div>

            {/* NEW: Producer - Full Width */}
            <div className="mb-6">
              <label className="block text-sm font-semibold text-gray-800 mb-2">
                PDF Producer
              </label>
              <input
                placeholder="e.g., Your Company Name, PDF Generator Pro"
                value={pdfMeta.producer}
                onChange={(e) =>
                  setPdfMeta({ ...pdfMeta, producer: e.target.value })
                }
                className="w-full px-4 py-3 border border-gray-200 rounded-xl  focus:border-blue-500 focus:ring-4 focus:ring-blue-100/50 focus:outline-none focus:bg-white shadow-sm transition-all duration-200 placeholder:text-gray-400"
              />
            </div>

            {/* Other fields - 2 Column Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Author */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Author
                </label>
                <input
                  placeholder="Your name or company"
                  value={pdfMeta.author}
                  onChange={(e) =>
                    setPdfMeta({ ...pdfMeta, author: e.target.value })
                  }
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-lg bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100/50 focus:outline-none shadow-sm transition-all"
                />
              </div>

              {/* Keywords */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Keywords
                </label>
                <input
                  placeholder="sales, report, 2026, finance"
                  value={pdfMeta.keywords}
                  onChange={(e) =>
                    setPdfMeta({ ...pdfMeta, keywords: e.target.value })
                  }
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-lg bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100/50 focus:outline-none shadow-sm transition-all"
                />
              </div>

              {/* Created Date */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Created Date
                </label>
                <input
                  type="date"
                  value={pdfMeta.created}
                  onChange={(e) =>
                    setPdfMeta({ ...pdfMeta, created: e.target.value })
                  }
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-lg bg-white focus:border-green-500 focus:ring-2 focus:ring-green-100/50 focus:outline-none shadow-sm transition-all"
                />
              </div>

              {/* Modified Date */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Modified Date
                </label>
                <input
                  type="date"
                  value={pdfMeta.modified}
                  onChange={(e) =>
                    setPdfMeta({ ...pdfMeta, modified: e.target.value })
                  }
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-lg bg-white focus:border-orange-500 focus:ring-2 focus:ring-orange-100/50 focus:outline-none shadow-sm transition-all"
                />
              </div>
            </div>

            {/* Helper text */}
            <div className="mt-5 pt-4 border-t border-gray-100">
              <p className="text-xs text-gray-500 flex items-center gap-1">
                <span className="h-3 w-3 bg-blue-400 rounded-full"></span>
                Subject appears as the main PDF title. Other fields are metadata
                properties.
              </p>
            </div>
          </div>

          {/* Loading - Always visible when active, spans full width */}
          {loading && (
            <div className="fixed inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center z-50">
              <div className="bg-white p-8 rounded-2xl shadow-2xl border-4 border-blue-100 max-w-md w-full mx-4 text-center">
                <div className="h-12 w-12 mx-auto mb-4 animate-spin rounded-full border-4 border-blue-400 border-t-blue-600" />
                <h3 className="text-xl font-bold text-gray-800 mb-2">
                  Generating PDF(s)
                </h3>
                <p className="text-gray-600 mb-6">
                  Please wait while we process your files...
                </p>
                <div className="flex gap-3 justify-center">
                  <div className="h-2 w-12 bg-blue-200 rounded-full animate-pulse"></div>
                  <div className="h-2 w-24 bg-blue-200 rounded-full animate-pulse [animation-delay:0.1s]"></div>
                  <div className="h-2 w-16 bg-blue-200 rounded-full animate-pulse [animation-delay:0.2s]"></div>
                </div>
              </div>
            </div>
          )}
        </div>
        {/* Right Panel - File Upload (Screenshot Style) */}
        <div className=" flex flex-col rounded-xl shadow p-6 md:sticky top-8 md:h-fit border border-gray-100 w-full md:w-80 bg-white ">
          <div className="text-center mb-6 ">
            <h2 className="text-xl font-bold text-gray-800 mb-2 flex items-center justify-center">
              <File className="h-5 w-5 mr-2" />
              File Upload
            </h2>
            <p className="text-sm text-gray-500">
              Choose HTML files to process
            </p>
          </div>
          <div className="space-y-4">
            <label className="w-full h-14 bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-600 hover:to-indigo-700 text-white font-medium rounded-lg flex items-center justify-center cursor-pointer shadow-lg hover:shadow-xl transition-all text-sm">
              <Upload className="h-4 w-4 mr-2" /> Choose File
              {fileStatus !== "No file chosen" && ` (${fileStatus})`}
              <input
                ref={fileInputRef}
                type="file"
                accept=".html,text/html"
                multiple
                onChange={(e) => {
                  const files = e.target.files;
                  if (files) {
                    setFileStatus(
                      files.length === 1
                        ? files[0].name
                        : `${files.length} files`
                    );
                    handleFiles(files);
                  }
                }}
                className="hidden"
              />
            </label>
            <button
              type="button"
              onClick={resetForm}
              className="w-full h-12 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white font-medium rounded-lg shadow-lg hover:shadow-xl transition-all flex items-center justify-center text-sm cursor-pointer"
            >
              <RotateCcw className="h-4 w-4 mr-2" />
              Reset All
            </button>
            <div className="text-xs text-gray-500 text-center pt-2 border-t border-gray-200">
              {fileStatus}
            </div>
          </div>

          <Link
            href="/filename"
            className="flex items-center justify-center gap-2 mt-5 hover:underline"
          >
            Link name Update
            <SquareArrowOutUpRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </main>
  );
}
