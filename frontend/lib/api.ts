/**
 * Thin client around the FastAPI backend.
 *
 * Only `NEXT_PUBLIC_API_BASE_URL` is read; everything else is plain fetch()
 * so we don't pull in a client library just for three endpoints.
 */

const BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/$/, "") ??
  "http://localhost:8000";

export interface IncidentInput {
  incident: string;
  case_no: string;
}

export interface ProcessResponse {
  id: string;
  filename: string;
  incident: string;
  case_number: string;
  incidents: IncidentInput[];
  download_url: string;
  created_at: string;
}

export interface HistoryItem {
  id: string;
  filename: string;
  incident: string;
  case_number: string;
  status: "success" | "failed";
  file_size_bytes: number | null;
  error_message: string | null;
  download_url: string | null;
  created_at: string;
}

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = "ApiError";
  }
}

async function readError(response: Response): Promise<string> {
  try {
    const data = await response.json();
    if (typeof data?.detail === "string") return data.detail;
    if (Array.isArray(data?.detail) && data.detail[0]?.msg) {
      return data.detail[0].msg;
    }
  } catch {
    // fall through
  }
  return `Request failed with status ${response.status}`;
}

export async function processWorkbook(params: {
  file: File;
  incidents: IncidentInput[];
}): Promise<ProcessResponse> {
  const formData = new FormData();
  formData.append("file", params.file);
  formData.append("incidents", JSON.stringify(params.incidents));

  const response = await fetch(`${BASE_URL}/api/process`, {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    throw new ApiError(response.status, await readError(response));
  }

  return (await response.json()) as ProcessResponse;
}

export async function fetchHistory(limit = 25): Promise<HistoryItem[]> {
  const response = await fetch(`${BASE_URL}/api/history?limit=${limit}`, {
    cache: "no-store",
  });
  if (!response.ok) {
    throw new ApiError(response.status, await readError(response));
  }
  return (await response.json()) as HistoryItem[];
}
