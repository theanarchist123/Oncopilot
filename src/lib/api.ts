import { ClinicalCase, User } from "@/types";

// Read from environment variable set in Vercel dashboard (or .env.local for local dev)
const API_BASE_URL =
  (process.env.NEXT_PUBLIC_API_URL || "").trim() || "http://localhost:8001/api";

// ─── Auth token reader ────────────────────────────────────────────────────────
// Reads from Zustand-persisted localStorage. Tries both 'token' and
// 'access_token' field names to handle any login implementation variation.
export const getAuthToken = (): string => {
  if (typeof window === "undefined") return "";
  const raw = localStorage.getItem("cancer-copilot-auth");
  if (!raw) return "";
  try {
    const state = JSON.parse(raw)?.state?.user;
    // Login page stores: { ...mockUser, token: access_token }
    const tok = state?.token || state?.access_token || "";
    if (tok) return tok;
  } catch {
    // ignore parse errors
  }
  return "";
};

// ─── Fetch wrapper ────────────────────────────────────────────────────────────
const requestJson = async (
  endpoint: string,
  options: RequestInit = {},
  withAuth = false
) => {
  const token = getAuthToken();
  const headers = new Headers(options.headers || {});
  headers.set("Content-Type", "application/json");
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers,
    });
  } catch (error) {
    throw new Error(
      `Cannot reach the API at ${API_BASE_URL}${endpoint}. Check that NEXT_PUBLIC_API_URL is set correctly.`
    );
  }

  if (!response.ok) {
    if (withAuth && response.status === 401 && typeof window !== "undefined") {
      localStorage.removeItem("cancer-copilot-auth");
      window.location.href = "/login";
    }
    const errorData = await response.json().catch(() => null);
    throw new Error(
      errorData?.detail || errorData?.error || `API error ${response.status}`
    );
  }

  return response.json();
};

// ─── Fetch wrapper ────────────────────────────────────────────────────────────
const fetchWithAuth = async (endpoint: string, options: RequestInit = {}) =>
  requestJson(endpoint, options, true);

// ─── Public (no-auth) fetch ───────────────────────────────────────────────────
// Used for endpoints that intentionally don't require authentication
const fetchPublic = async (endpoint: string, options: RequestInit = {}) =>
  requestJson(endpoint, options, false);

// ─── API surface ──────────────────────────────────────────────────────────────
export const api = {
  // Health
  health: () => fetchPublic("/health"),

  // Auth
  register: (data: any) => fetchPublic("/auth/register", {
    method: "POST",
    body: JSON.stringify(data),
  }),
  login: (credentials: any) => fetchPublic("/auth/login", {
    method: "POST",
    body: JSON.stringify(credentials),
  }),

  // Cases
  getCases: () => fetchWithAuth("/cases/"),
  getCase: (id: string) => fetchWithAuth(`/cases/${id}`),
  createCase: (data: any) => fetchWithAuth("/cases/", {
    method: "POST",
    body: JSON.stringify(data),
  }),
  updateCase: (id: string, data: any) => fetchWithAuth(`/cases/${id}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  }),
  finalizeCase: (id: string, data: any) => fetchWithAuth(`/cases/${id}/finalize`, {
    method: "POST",
    body: JSON.stringify(data),
  }),
  getTrials: (caseId: string) => fetchWithAuth(`/cases/${caseId}/trials`),

  // Clinical Data
  saveClinicalData: (caseId: string, data: any) =>
    fetchWithAuth(`/cases/${caseId}/clinical`, {
      method: "POST",
      body: JSON.stringify(data),
    }),

  // Analysis
  runAnalysis: (caseId: string) =>
    fetchWithAuth(`/cases/${caseId}/analyse`, { method: "POST" }),

  simulateAnalysis: (caseId: string, overrides: any) =>
    fetchWithAuth(`/cases/${caseId}/analyse/simulate`, {
      method: "POST",
      body: JSON.stringify({ overrides }),
    }),

  // ─── Instant Analysis (stateless — public endpoint, no auth required) ──────
  // Auth is optional on the backend so this never 401s even after token expiry.
  instantAnalysis: (payload: {
    patient_name?: string;
    patient_age?: number;
    save_case?: boolean;
    clinical_data: Record<string, any>;
  }) =>
    fetchPublic("/analyse/instant", {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  // Patient Portal
  getPatientPlan: (caseId: string) => fetchPublic(`/patient/my-plan/${caseId}`),

  // Engine Rules
  getEngineRules: () => fetchWithAuth("/engine/rules"),

  // Report extraction (multimodal AI + OCR)
  extractReport: async (file: File) => {
    const MAX_FILE_SIZE = 25 * 1024 * 1024; // 25 MB absolute max
    if (file.size > MAX_FILE_SIZE) {
      throw new Error(
        `File is too large (${(file.size / (1024 * 1024)).toFixed(1)} MB). ` +
        `Maximum allowed size is 25 MB.`
      );
    }

    const formData = new FormData();
    formData.append("file", file);

    // Use a generous timeout — OCR + LLM extraction can take up to 90s
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 120_000);

    try {
      const res = await fetch(`${API_BASE_URL}/reports/extract`, {
        method: "POST",
        body: formData,
        signal: controller.signal,
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => null);
        throw new Error(
          errData?.detail || errData?.error || `Upload failed with status ${res.status}`
        );
      }
      return res.json();
    } catch (err: any) {
      if (err.name === "AbortError") {
        throw new Error("Upload timed out. The file may be too large or the server is busy.");
      }
      if (err instanceof TypeError && err.message.includes("fetch")) {
        throw new Error(
          "Upload failed: Server connection dropped. The server may have timed out or crashed while processing."
        );
      }
      throw err;
    } finally {
      clearTimeout(timeoutId);
    }
  },
};
