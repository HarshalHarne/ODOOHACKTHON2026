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
