import type { MaintenanceStatus } from "@/lib/workspace/types";

export function formatHistoryDate(isoDate: string) {
  const date = new Date(isoDate);

  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "2-digit",
  });
}

export function formatBookingDateLabel(date: string) {
  const parsed = new Date(`${date}T00:00:00`);

  return parsed.toLocaleDateString("en-US", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
}

export function formatTime(hour: number, minute: number) {
  const suffix = hour >= 12 ? "PM" : "AM";
  const normalizedHour = hour % 12 === 0 ? 12 : hour % 12;
  const paddedMinute = minute.toString().padStart(2, "0");

  return `${normalizedHour}:${paddedMinute} ${suffix}`;
}

export function toMinutes(hour: number, minute: number) {
  return hour * 60 + minute;
}

export function rangesOverlap(
  startA: number,
  endA: number,
  startB: number,
  endB: number
) {
  return startA < endB && startB < endA;
}

export function getNextMaintenanceStatus(
  status: MaintenanceStatus
): MaintenanceStatus | null {
  const order: MaintenanceStatus[] = [
    "pending",
    "approved",
    "technician_assigned",
    "in_progress",
    "resolved",
  ];

  const index = order.indexOf(status);

  if (index === -1 || index === order.length - 1) {
    return null;
  }

  return order[index + 1];
}

export function getMaintenanceActionLabel(
  status: MaintenanceStatus
): string | null {
  switch (status) {
    case "pending":
      return "Approve";
    case "approved":
      return "Assign technician";
    case "technician_assigned":
      return "Start work";
    case "in_progress":
      return "Resolve";
    default:
      return null;
  }
}

export function downloadCsvFile(
  filename: string,
  headers: string[],
  rows: string[][]
) {
  const escape = (value: string) => `"${value.replace(/"/g, '""')}"`;
  const content = [
    headers.map(escape).join(","),
    ...rows.map((row) => row.map(escape).join(",")),
  ].join("\n");
  const blob = new Blob([content], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}

export function formatNotificationTimestamp(timestamp: string) {
  return new Date(timestamp).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function getNotificationDayGroup(
  timestamp: string
): "today" | "yesterday" | "earlier" {
  const date = new Date(timestamp);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const notificationDay = new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate()
  );

  if (notificationDay.getTime() === today.getTime()) {
    return "today";
  }

  if (notificationDay.getTime() === yesterday.getTime()) {
    return "yesterday";
  }

  return "earlier";
}

export function deterministicHash(value: string) {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) | 0;
  }
  return Math.abs(hash);
}
