import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Compact "time since" label for a unix timestamp (seconds), e.g. "1s", "3m",
// "5h", "2d". Returns '' when the timestamp is unknown (0/undefined).
export function timeAgo(unixSeconds?: number): string {
  if (!unixSeconds || unixSeconds <= 0) return '';
  const diff = Math.max(0, Math.floor(Date.now() / 1000) - unixSeconds);
  if (diff < 60) return `${diff}s`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
  return `${Math.floor(diff / 86400)}d`;
}
