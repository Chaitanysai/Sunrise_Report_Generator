"use client";

import { useCallback, useRef, useState } from "react";
import { formatSize } from "@/lib/format";

interface FilePickerProps {
  file: File | null;
  onFileChange: (file: File | null) => void;
  disabled?: boolean;
}

const ACCEPT = ".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

export default function FilePicker({ file, onFileChange, disabled }: FilePickerProps) {
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleSelect = useCallback(
    (incoming: FileList | null) => {
      if (!incoming || incoming.length === 0) return;
      const next = incoming[0];
      if (!next.name.toLowerCase().endsWith(".xlsx")) {
        alert("Only .xlsx files are accepted.");
        return;
      }
      onFileChange(next);
    },
    [onFileChange]
  );

  return (
    <div>
      <label className="label">Control sheet (.xlsx)</label>

      <div
        onDragOver={(e) => {
          e.preventDefault();
          if (!disabled) setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          if (disabled) return;
          handleSelect(e.dataTransfer.files);
        }}
        onClick={() => !disabled && inputRef.current?.click()}
        role="button"
        tabIndex={0}
        aria-disabled={disabled}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") inputRef.current?.click();
        }}
        className={[
          "relative flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed p-8 transition",
          disabled ? "cursor-not-allowed opacity-60" : "cursor-pointer",
          dragOver
            ? "border-accent bg-accent-soft"
            : "border-ink-300 bg-ink-50 hover:border-ink-400 hover:bg-white",
        ].join(" ")}
      >
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPT}
          className="hidden"
          disabled={disabled}
          onChange={(e) => handleSelect(e.target.files)}
        />

        {file ? (
          <FilePreview file={file} onClear={() => onFileChange(null)} disabled={disabled} />
        ) : (
          <Empty />
        )}
      </div>
    </div>
  );
}

function Empty() {
  return (
    <>
      <UploadIcon className="h-8 w-8 text-ink-400" />
      <div className="text-sm text-ink-700">
        <span className="font-medium text-ink-900">Click to upload</span>{" "}
        or drag and drop
      </div>
      <div className="text-xs text-ink-500">XLSX only · up to 25 MB</div>
    </>
  );
}

function FilePreview({
  file,
  onClear,
  disabled,
}: {
  file: File;
  onClear: () => void;
  disabled?: boolean;
}) {
  return (
    <div className="flex w-full items-center justify-between gap-4">
      <div className="flex items-center gap-3 truncate">
        <div className="grid h-10 w-10 shrink-0 place-items-center rounded-md bg-ink-900 text-xs font-semibold uppercase tracking-wider text-white">
          xlsx
        </div>
        <div className="truncate">
          <div className="truncate text-sm font-medium text-ink-900">
            {file.name}
          </div>
          <div className="text-xs text-ink-500">{formatSize(file.size)}</div>
        </div>
      </div>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onClear();
        }}
        disabled={disabled}
        className="text-xs font-medium text-ink-500 hover:text-danger"
      >
        Remove
      </button>
    </div>
  );
}

function UploadIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 16V4M7 9l5-5 5 5" />
      <path d="M5 16v3a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-3" />
    </svg>
  );
}
