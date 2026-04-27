"use client";

import { HistoryItem } from "@/lib/api";
import { formatDate, formatSize } from "@/lib/format";

interface HistoryTableProps {
  items: HistoryItem[];
  loading?: boolean;
}

export default function HistoryTable({ items, loading }: HistoryTableProps) {
  if (loading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-12 rounded-md shimmer" />
        ))}
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="rounded-md border border-dashed border-ink-300 bg-ink-50 px-4 py-10 text-center text-sm text-ink-500">
        No processing runs yet. Upload a control sheet to get started.
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-lg border border-ink-200 bg-white">
      <table className="min-w-full divide-y divide-ink-200">
        <thead className="bg-ink-50">
          <tr>
            <Th>When</Th>
            <Th>Case</Th>
            <Th>Filename</Th>
            <Th>Size</Th>
            <Th>Status</Th>
            <Th className="text-right">Download</Th>
          </tr>
        </thead>
        <tbody className="divide-y divide-ink-100">
          {items.map((item) => (
            <tr key={item.id} className="text-sm hover:bg-ink-50/60">
              <Td className="text-ink-600">{formatDate(item.created_at)}</Td>
              <Td className="font-mono text-xs text-ink-800">{item.case_number}</Td>
              <Td className="max-w-[24ch] truncate text-ink-900">
                {item.filename}
              </Td>
              <Td className="text-ink-600">{formatSize(item.file_size_bytes)}</Td>
              <Td>
                {item.status === "success" ? (
                  <span className="badge-success">
                    <span className="h-1.5 w-1.5 rounded-full bg-success" />
                    Success
                  </span>
                ) : (
                  <span className="badge-danger">
                    <span className="h-1.5 w-1.5 rounded-full bg-danger" />
                    Failed
                  </span>
                )}
              </Td>
              <Td className="text-right">
                {item.download_url ? (
                  <a
                    href={item.download_url}
                    className="text-xs font-medium text-accent hover:text-accent-hover"
                  >
                    Download ↓
                  </a>
                ) : (
                  <span className="text-xs text-ink-400">—</span>
                )}
              </Td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Th({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <th
      scope="col"
      className={`px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-ink-500 ${
        className ?? ""
      }`}
    >
      {children}
    </th>
  );
}

function Td({ children, className }: { children: React.ReactNode; className?: string }) {
  return <td className={`px-4 py-3 ${className ?? ""}`}>{children}</td>;
}
