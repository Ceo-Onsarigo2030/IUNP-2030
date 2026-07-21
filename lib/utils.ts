import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatEventDate(date: string) {
  return new Intl.DateTimeFormat("en-KE", { day: "numeric", month: "long", year: "numeric" }).format(
    new Date(date)
  );
}

export function generateMembershipId(sequence: number) {
  return `UniNexus-${String(sequence).padStart(3, "0")}`;
}

export function generateTicketNumber() {
  const rand = Math.random().toString(36).slice(2, 8).toUpperCase();
  const time = Date.now().toString(36).slice(-4).toUpperCase();
  return `UNX-${time}-${rand}`;
}
