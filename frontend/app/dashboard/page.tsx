"use client";

import { FormEvent, useEffect, useState } from "react";
import FilePicker from "@/components/FilePicker";
import HistoryTable from "@/components/HistoryTable";
import {
  ApiError,
  HistoryItem,
  IncidentInput,
  ProcessResponse,
  fetchHistory,
  processWorkbook,
} from "@/lib/api";

const EMPTY_INCIDENT: IncidentInput = { incident: "", case_no: "" };

export default function DashboardPage() {
  const [file, setFile] = useState<File | null>(null);
  const [incidents, setIncidents] = useState<IncidentInput[]>([
    { ...EMPTY_INCIDENT },
  ]);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ProcessResponse | null>(null);

  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(true);

  const loadHistory = async () => {
    setLoadingHistory(true);
    try {
      setHistory(await fetchHistory(25));
    } catch (err) {
      console.warn("Failed to load history", err);
    } finally {
      setLoadingHistory(false);
    }
  };

  useEffect(() => {
    void loadHistory();
  }, []);

  const canSubmit =
    !!file &&
    incidents.length > 0 &&
    incidents.every(
      (item) => item.incident.trim().length > 0 && item.case_no.trim().length > 0,
    );

  const updateIncident = (
    index: number,
    field: keyof IncidentInput,
    value: string,
  ) => {
    setIncidents((current) =>
      current.map((item, itemIndex) =>
        itemIndex === index ? { ...item, [field]: value } : item,
      ),
    );
  };

  const addIncidentRow = () => {
    setIncidents((current) => [...current, { ...EMPTY_INCIDENT }]);
  };

  const removeIncidentRow = (index: number) => {
    setIncidents((current) =>
      current.length === 1
        ? [{ ...EMPTY_INCIDENT }]
        : current.filter((_, itemIndex) => itemIndex !== index),
    );
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!canSubmit || !file) return;
    setSubmitting(true);
    setError(null);
    setResult(null);

    try {
      const res = await processWorkbook({
        file,
        incidents: incidents.map((item) => ({
          incident: item.incident.trim(),
          case_no: item.case_no.trim(),
        })),
      });
      setResult(res);
      setFile(null);
      setIncidents([{ ...EMPTY_INCIDENT }]);
      void loadHistory();
    } catch (err) {
      const message =
        err instanceof ApiError
          ? err.message
          : err instanceof Error
            ? err.message
            : "Something went wrong.";
      setError(message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-slate-50">
      {/* Subtle background texture overlay */}
      <div className="pointer-events-none fixed inset-0 bg-[url('data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%22200%22 height=%22200%22><rect fill=%22%23ffffff%22 width=%22200%22 height=%22200%22/><path fill=%22%23f5f7ff%22 d=%22M0 0h200v100H0z%22/></svg>')] opacity-40" />

      <div className="relative space-y-16 py-12">
        {/* Main Content */}
        <div className="mx-auto max-w-7xl px-6 md:px-8 lg:px-12">
          {/* Intro Section */}
          <div className="mb-16 animate-fade-in">
            <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-indigo-50 px-3.5 py-1.5 text-xs font-medium tracking-wider text-indigo-700">
              <span className="h-1.5 w-1.5 rounded-full bg-indigo-400" />
              CONTROL SHEET PORTAL
            </div>
            <h1 className="mt-4 font-display text-4xl font-light tracking-tight text-slate-950 lg:text-5xl">
              Control Sheet Automation
            </h1>
            <p className="mt-4 max-w-2xl text-lg text-slate-600">
              Automate control-sheet health checks, incidents and date shifts. Upload your workbook and we&apos;ll handle the rest—RAG colors shifted, dates updated, metadata stamped.
            </p>
          </div>

          {/* Two Column Layout */}
          <div className="grid gap-10 lg:grid-cols-3">
            {/* Left: Form - Takes 2 columns */}
            <div className="lg:col-span-2 space-y-8">
              {/* Upload Card */}
              <div className="group relative overflow-hidden rounded-2xl border border-slate-200 bg-white/70 backdrop-blur-sm transition-all duration-300 hover:border-slate-300 hover:shadow-lg">
                <div className="absolute inset-0 bg-gradient-to-br from-indigo-50/50 via-transparent to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
                <div className="relative p-10">
                  <FilePicker file={file} onFileChange={setFile} disabled={submitting} />
                  {file && (
                    <div className="mt-6 flex items-center gap-3 rounded-xl bg-gradient-to-r from-emerald-50 to-emerald-50/50 border border-emerald-200/50 px-4 py-3">
                      <div className="h-9 w-9 rounded-lg bg-emerald-100 flex items-center justify-center">
                        <svg className="h-5 w-5 text-emerald-600" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-emerald-900 truncate">{file.name}</p>
                        <p className="text-xs text-emerald-700">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setFile(null)}
                        disabled={submitting}
                        className="text-emerald-600 hover:text-emerald-700 transition-colors disabled:text-slate-300"
                      >
                        <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                        </svg>
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Incidents Card */}
              <div className="rounded-2xl border border-slate-200 bg-white/70 backdrop-blur-sm p-8 transition-all duration-300">
                <div className="mb-8 flex items-center justify-between">
                  <div>
                    <h2 className="font-display text-xl font-light text-slate-950">
                      Processing Instructions
                    </h2>
                    <p className="mt-1 text-sm text-slate-600">
                      Define the incidents and case numbers to process in this run
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={addIncidentRow}
                    disabled={submitting}
                    className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white transition-all duration-200 hover:bg-indigo-700 hover:shadow-md disabled:bg-slate-300 disabled:cursor-not-allowed"
                  >
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    Add Incident
                  </button>
                </div>

                {/* Incidents List */}
                <div className="space-y-4">
                  {incidents.map((item, index) => (
                    <div
                      key={index}
                      className="group relative rounded-xl border border-slate-200 bg-gradient-to-br from-slate-50/50 to-white p-6 transition-all duration-200 hover:border-indigo-300 hover:shadow-md"
                    >
                      {/* Header */}
                      <div className="mb-5 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="h-8 w-8 rounded-lg bg-indigo-100 flex items-center justify-center">
                            <span className="text-xs font-semibold text-indigo-700">{index + 1}</span>
                          </div>
                          <span className="text-sm font-semibold text-slate-700">Incident {index + 1}</span>
                        </div>
                        {incidents.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeIncidentRow(index)}
                            disabled={submitting || incidents.length === 1}
                            className="text-xs font-medium text-slate-400 transition-colors hover:text-red-600 disabled:cursor-not-allowed"
                          >
                            Remove
                          </button>
                        )}
                      </div>

                      {/* Fields */}
                      <div className="grid gap-5 lg:grid-cols-3">
                        <div className="lg:col-span-2">
                          <label htmlFor={`incident-${index}`} className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-2.5">
                            Description
                          </label>
                          <textarea
                            id={`incident-${index}`}
                            rows={3}
                            placeholder="Brief description of the incident — context, scope, impact…"
                            value={item.incident}
                            onChange={(e) =>
                              updateIncident(index, "incident", e.target.value)
                            }
                            maxLength={2000}
                            disabled={submitting}
                            required
                            className="w-full rounded-lg border border-slate-200 bg-white/60 px-4 py-3 text-sm text-slate-900 placeholder-slate-400 transition-all duration-200 focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500/20 disabled:bg-slate-50 disabled:text-slate-500"
                          />
                          <div className="mt-2 text-right text-xs text-slate-400">
                            {item.incident.length} / 2000
                          </div>
                        </div>
                        <div>
                          <label htmlFor={`case-${index}`} className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-2.5">
                            Case Number
                          </label>
                          <input
                            id={`case-${index}`}
                            type="text"
                            placeholder="INC-2026-00421"
                            value={item.case_no}
                            onChange={(e) =>
                              updateIncident(index, "case_no", e.target.value)
                            }
                            maxLength={100}
                            disabled={submitting}
                            required
                            className="w-full rounded-lg border border-slate-200 bg-white/60 px-4 py-3 text-sm font-mono text-slate-900 placeholder-slate-400 transition-all duration-200 focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500/20 disabled:bg-slate-50 disabled:text-slate-500"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Error State */}
                {error && (
                  <div className="mt-6 rounded-xl border border-red-200 bg-red-50/50 px-5 py-4 animate-shake">
                    <div className="flex items-start gap-3">
                      <svg className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                      </svg>
                      <div>
                        <p className="text-sm font-medium text-red-900">{error}</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Right: Result Panel */}
            <div className="lg:col-span-1">
              <ResultPanel result={result} />
            </div>
          </div>

          {/* Sticky Footer CTA */}
          <div className="mt-10 flex flex-col sm:flex-row items-center justify-between gap-6 rounded-2xl border border-slate-200 bg-white/70 backdrop-blur-sm p-6 sticky bottom-4 shadow-xl">
            <div className="text-sm text-slate-600">
              <p>✓ Original file is never modified • All styling is preserved</p>
            </div>
            <button
              type="submit"
              form="process-form"
              disabled={!canSubmit || submitting}
              className="group relative inline-flex items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-indigo-600 to-indigo-700 px-8 py-3 text-sm font-semibold text-white shadow-lg transition-all duration-200 hover:shadow-xl hover:from-indigo-700 hover:to-indigo-800 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:shadow-lg"
            >
              {submitting ? (
                <>
                  <Spinner />
                  Processing…
                </>
              ) : (
                <>
                  Process Workbook
                  <svg className="h-4 w-4 transition-transform group-hover:translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                </>
              )}
            </button>
          </div>
        </div>

        {/* History Section */}
        <div className="border-t border-slate-200/50 py-12">
          <div className="mx-auto max-w-7xl px-6 md:px-8 lg:px-12">
            <div className="mb-8 flex items-center justify-between">
              <div>
                <h2 className="font-display text-2xl font-light text-slate-950">
                  Recent Runs
                </h2>
                <p className="mt-2 text-slate-600">
                  The last 25 processing jobs across your workspace
                </p>
              </div>
              <button
                onClick={loadHistory}
                className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white/50 px-4 py-2.5 text-sm font-medium text-slate-700 transition-all duration-200 hover:bg-white hover:border-slate-300 hover:shadow-md"
              >
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Refresh
              </button>
            </div>
            <HistoryTable items={history} loading={loadingHistory} />
          </div>
        </div>
      </div>

      {/* Hidden form for submission */}
      <form id="process-form" onSubmit={handleSubmit} className="hidden" />
    </div>
  );
}

function ResultPanel({ result }: { result: ProcessResponse | null }) {
  if (!result) {
    return (
      <div className="sticky top-8 rounded-2xl border border-slate-200 bg-white/70 backdrop-blur-sm p-10 text-center">
        <div className="mb-4 inline-flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-slate-100 to-slate-50">
          <svg
            viewBox="0 0 24 24"
            className="h-8 w-8 text-slate-400"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M12 5v14M5 12h14" />
          </svg>
        </div>
        <h3 className="font-display text-lg font-light text-slate-950">
          Ready to process
        </h3>
        <p className="mt-3 text-sm text-slate-600">
          Upload your control sheet, add incident details, and click Process Workbook to begin.
        </p>
        <div className="mt-6 space-y-2 text-xs text-slate-500">
          <div className="flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-indigo-400" />
            Lightning-fast processing
          </div>
          <div className="flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-indigo-400" />
            Results appear here instantly
          </div>
          <div className="flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-indigo-400" />
            Download from history anytime
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="sticky top-8 space-y-4 rounded-2xl border border-slate-200 bg-white/70 backdrop-blur-sm overflow-hidden shadow-lg">
      {/* Success Header */}
      <div className="border-b border-slate-200 bg-gradient-to-br from-emerald-50 to-emerald-50/50 px-6 py-5">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-full bg-emerald-200 flex items-center justify-center">
            <svg className="h-6 w-6 text-emerald-700" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
          </div>
          <div>
            <p className="font-semibold text-emerald-900">Processing Complete</p>
            <p className="text-xs text-emerald-700">Your workbook is ready</p>
          </div>
        </div>
      </div>

      {/* Details */}
      <div className="space-y-5 px-6 py-6">
        <ResultField label="Filename" value={result.filename} mono />
        <ResultField label="Case Numbers Processed" value={result.case_number} mono clamp />
        <ResultField label="Incidents Stamped" value={result.incident} clamp />

        {/* Stats */}
        <div className="my-6 grid grid-cols-2 gap-4 pt-4 border-t border-slate-200">
          <div className="rounded-lg bg-indigo-50/50 p-3">
            <p className="text-xs text-slate-600 font-medium">Records Updated</p>
            <p className="mt-2 text-2xl font-light text-indigo-700">✓</p>
          </div>
          <div className="rounded-lg bg-blue-50/50 p-3">
            <p className="text-xs text-slate-600 font-medium">Status</p>
            <p className="mt-2 text-2xl font-light text-blue-700">Ready</p>
          </div>
        </div>

        {/* Download CTA */}
        <a
          href={result.download_url}
          download
          className="block w-full rounded-lg bg-gradient-to-r from-indigo-600 to-indigo-700 px-4 py-3.5 text-center text-sm font-semibold text-white transition-all duration-200 hover:shadow-lg hover:from-indigo-700 hover:to-indigo-800 active:scale-95"
        >
          ↓ Download Workbook
        </a>

        <p className="text-[11px] text-slate-500 text-center">
          URL expires in 1 hour. Find this run in history to mint a fresh link.
        </p>
      </div>
    </div>
  );
}

function ResultField({
  label,
  value,
  mono,
  clamp,
}: {
  label: string;
  value: string;
  mono?: boolean;
  clamp?: boolean;
}) {
  return (
    <div>
      <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-2">
        {label}
      </label>
      <div
        className={`whitespace-pre-line rounded-lg bg-slate-50/50 px-3.5 py-2.5 text-slate-900 ${
          mono ? "font-mono text-xs" : "text-sm"
        } ${clamp ? "line-clamp-3" : ""}`}
      >
        {value}
      </div>
    </div>
  );
}

function Spinner() {
  return (
    <svg
      className="h-4 w-4 animate-spin"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
    >
      <circle cx="12" cy="12" r="10" className="opacity-25" />
      <path d="M22 12a10 10 0 0 0-10-10" className="opacity-75" />
    </svg>
  );
}
