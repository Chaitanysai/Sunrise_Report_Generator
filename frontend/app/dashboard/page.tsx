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
      // Reset for the next run, but keep the form responsive:
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
    <div className="space-y-10 animate-fade-up">
      {/* Title */}
      <div className="flex items-end justify-between">
        <div>
          <div className="text-[11px] uppercase tracking-[0.18em] text-ink-500">
            Dashboard
          </div>
          <h1 className="mt-1 font-display text-3xl font-semibold tracking-tight text-ink-900">
            Process a control sheet
          </h1>
          <p className="mt-1 text-sm text-ink-600">
            Upload an Excel control sheet and we&apos;ll shift RAG colors,
            update dates, and stamp the incident metadata.
          </p>
        </div>
      </div>

      <div className="grid gap-8 lg:grid-cols-5">
        {/* Form */}
        <section className="card p-6 lg:col-span-3">
          <form onSubmit={handleSubmit} className="space-y-6">
            <FilePicker file={file} onFileChange={setFile} disabled={submitting} />

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="label">Incidents</div>
                  <p className="text-xs text-ink-500">
                    Add one or more incident and case-number pairs for this run.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={addIncidentRow}
                  className="btn-secondary text-xs"
                  disabled={submitting}
                >
                  + Add Incident
                </button>
              </div>
              <div className="space-y-3">
                {incidents.map((item, index) => (
                  <div
                    key={index}
                    className="rounded-lg border border-ink-200 bg-ink-50/60 p-4"
                  >
                    <div className="mb-3 flex items-center justify-between">
                      <div className="text-xs font-medium uppercase tracking-[0.14em] text-ink-500">
                        Incident {index + 1}
                      </div>
                      <button
                        type="button"
                        onClick={() => removeIncidentRow(index)}
                        className="text-xs font-medium text-danger disabled:text-ink-300"
                        disabled={submitting || incidents.length === 1}
                      >
                        Remove
                      </button>
                    </div>
                    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_220px]">
                      <div>
                        <label htmlFor={`incident-${index}`} className="label">
                          Incident description
                        </label>
                        <textarea
                          id={`incident-${index}`}
                          rows={3}
                          placeholder="Brief description of the incident — context, scope, impact…"
                          value={item.incident}
                          onChange={(e) =>
                            updateIncident(index, "incident", e.target.value)
                          }
                          className="input resize-none"
                          disabled={submitting}
                          maxLength={2000}
                          required
                        />
                        <div className="mt-1 text-right text-[11px] text-ink-400">
                          {item.incident.length} / 2000
                        </div>
                      </div>
                      <div>
                        <label htmlFor={`case-${index}`} className="label">
                          Case number
                        </label>
                        <input
                          id={`case-${index}`}
                          type="text"
                          placeholder="INC-2026-00421"
                          value={item.case_no}
                          onChange={(e) =>
                            updateIncident(index, "case_no", e.target.value)
                          }
                          className="input font-mono"
                          disabled={submitting}
                          maxLength={100}
                          required
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {error && (
              <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {error}
              </div>
            )}

            <div className="flex items-center justify-between border-t border-ink-200 pt-5">
              <p className="text-xs text-ink-500">
                Workbook styling is preserved. Original file is never modified.
              </p>
              <button
                type="submit"
                disabled={!canSubmit || submitting}
                className="btn-primary"
              >
                {submitting ? (
                  <>
                    <Spinner /> Processing…
                  </>
                ) : (
                  "Process workbook"
                )}
              </button>
            </div>
          </form>
        </section>

        {/* Result panel */}
        <section className="lg:col-span-2">
          <ResultPanel result={result} />
        </section>
      </div>

      {/* History */}
      <section className="space-y-4">
        <div className="flex items-end justify-between">
          <div>
            <h2 className="font-display text-xl font-semibold tracking-tight text-ink-900">
              Recent runs
            </h2>
            <p className="text-sm text-ink-600">
              The last 25 processing runs across all users.
            </p>
          </div>
          <button onClick={loadHistory} className="btn-secondary text-xs">
            Refresh
          </button>
        </div>
        <HistoryTable items={history} loading={loadingHistory} />
      </section>
    </div>
  );
}

function ResultPanel({ result }: { result: ProcessResponse | null }) {
  if (!result) {
    return (
      <div className="card flex h-full flex-col items-center justify-center p-8 text-center">
        <div className="mb-3 grid h-12 w-12 place-items-center rounded-full bg-ink-100 text-ink-400">
          <svg
            viewBox="0 0 24 24"
            className="h-5 w-5"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M12 5v14M5 12h14" />
          </svg>
        </div>
        <div className="font-display text-base font-medium text-ink-800">
          No file processed yet
        </div>
        <p className="mt-1 max-w-xs text-xs text-ink-500">
          Once you submit, the processed workbook will appear here ready for
          download.
        </p>
      </div>
    );
  }

  return (
    <div className="card overflow-hidden">
      <div className="border-b border-ink-200 bg-ink-50 px-5 py-3">
        <span className="badge-success">
          <span className="h-1.5 w-1.5 rounded-full bg-success" />
          Processed successfully
        </span>
      </div>
      <div className="space-y-4 p-5 text-sm">
        <Field label="Filename" value={result.filename} mono />
        <Field label="Case numbers" value={result.case_number} mono clamp />
        <Field label="Incidents" value={result.incident} clamp />
        <a
          href={result.download_url}
          className="btn-primary mt-2 w-full"
          download
        >
          Download workbook ↓
        </a>
        <p className="text-[11px] text-ink-500">
          Download URL is signed and short-lived. If it expires, find this run
          in the history below to mint a fresh link.
        </p>
      </div>
    </div>
  );
}

function Field({
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
      <div className="label">{label}</div>
      <div
        className={`whitespace-pre-line text-ink-900 ${mono ? "font-mono text-xs" : "text-sm"} ${
          clamp ? "line-clamp-3" : ""
        }`}
      >
        {value}
      </div>
    </div>
  );
}

function Spinner() {
  return (
    <svg
      className="h-3.5 w-3.5 animate-spin"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="3"
    >
      <circle cx="12" cy="12" r="9" className="opacity-25" />
      <path d="M21 12a9 9 0 0 0-9-9" />
    </svg>
  );
}
