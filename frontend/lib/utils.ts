import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

/**
 * Formats API errors (including Pydantic validation errors) into a readable string
 * to prevent React "object as child" rendering errors.
 */
export function formatApiError(error: unknown): string {
  if (typeof error === 'string') return error;
  
  // Axios error structure
  const err = error as { response?: { data?: { detail?: unknown } }; message?: string };
  const detail = err.response?.data?.detail || err.message || "An unexpected error occurred";
  
  if (typeof detail === 'string') return detail;
  
  // Handle Pydantic list of errors
  if (Array.isArray(detail)) {
    return detail.map((e: { loc?: string[]; msg?: string }) => `${e.loc?.join('.') || 'Error'}: ${e.msg}`).join(', ');
  }
  
  // Handle unexpected objects (the specific case reported by the user)
  if (typeof detail === 'object' && detail !== null) {
    if ('msg' in detail) return String(detail.msg);
    return JSON.stringify(detail);
  }
  
  return String(detail);
}

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
