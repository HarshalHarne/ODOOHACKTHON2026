"use client";

import React, { useMemo, useState } from "react";
import {
  ArrowLeftRight,
  Bell,
  Calendar,
  ClipboardCheck,
  CornerUpLeft,
  Eye,
  Info,
  MailOpen,
  Package,
  Search,
  Trash2,
  Wrench,
} from "lucide-react";

import PageHeader from "@/components/dashboard/PageHeader";
import FilterSelect from "@/components/workspace/FilterSelect";
import ScreenPanel from "@/components/workspace/ScreenPanel";
import StatusBadge from "@/components/workspace/StatusBadge";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  notifyWorkspaceUpdated,
  useWorkspaceData,
} from "@/hooks/use-workspace-data";
import {
  markAllNotificationsRead,
  markNotificationRead,
  markNotificationUnread,
  removeNotification,
} from "@/lib/workspace/storage";
import type {
  NotificationType,
  WorkspaceNotification,
} from "@/lib/workspace/types";
import { cn } from "@/lib/utils";

// ── Helpers ────────────────────────────────────────────────────────────

function getNotificationIcon(type: NotificationType) {
  switch (type) {
    case "asset":
      return Package;
    case "maintenance":
      return Wrench;
    case "booking":
      return Calendar;
    case "transfer":
      return ArrowLeftRight;
    case "return":
      return CornerUpLeft;
    case "audit":
      return ClipboardCheck;
    default:
      return Bell;
  }
}

function getNotificationColor(type: NotificationType) {
  switch (type) {
    case "asset":
      return "text-teal-400 bg-teal-500/10 border-teal-500/20";
    case "maintenance":
      return "text-amber-400 bg-amber-500/10 border-amber-500/20";
    case "booking":
      return "text-purple-400 bg-purple-500/10 border-purple-500/20";
    case "transfer":
      return "text-sky-400 bg-sky-500/10 border-sky-500/20";
    case "return":
      return "text-indigo-400 bg-indigo-500/10 border-indigo-500/20";
    case "audit":
      return "text-rose-400 bg-rose-500/10 border-rose-500/20";
    default:
      return "text-slate-400 bg-white/5 border-white/10";
  }
}

function formatRelativeTime(isoString: string) {
  const date = new Date(isoString);
  const now = new Date();
  
  // Reset hours to compare calendar days
  const dDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const dNow = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  
  const diffTime = dNow.getTime() - dDate.getTime();
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays === 0) {
    return date.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
    });
  } else if (diffDays === 1) {
    return "Yesterday";
  } else {
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
  }
}

// ── Component ──────────────────────────────────────────────────────────

export default function NotificationCenter() {
  const { data, refresh } = useWorkspaceData();
  const [selectedNotifId, setSelectedNotifId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [readFilter, setReadFilter] = useState("all"); // all, read, unread
  const [typeFilter, setTypeFilter] = useState("all"); // all, asset, maintenance, etc.

  // Unread count
  const unreadCount = useMemo(() => {
    return data.notifications.filter((n) => !n.read).length;
  }, [data.notifications]);

  // Handle mark all read
  const handleMarkAllRead = () => {
    markAllNotificationsRead();
    notifyWorkspaceUpdated();
    refresh();
  };

  // Handle single read/unread toggle
  const handleToggleRead = (id: string, currentRead: boolean, e: React.MouseEvent) => {
    e.stopPropagation();
    if (currentRead) {
      markNotificationUnread(id);
    } else {
      markNotificationRead(id);
    }
    notifyWorkspaceUpdated();
    refresh();
  };

  // Handle delete
  const handleDelete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    removeNotification(id);
    if (selectedNotifId === id) {
      setSelectedNotifId(null);
    }
    notifyWorkspaceUpdated();
    refresh();
  };

  // Filtered notifications
  const filteredNotifications = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    
    return data.notifications.filter((n) => {
      const matchesSearch =
        query.length === 0 ||
        n.title.toLowerCase().includes(query) ||
        n.message.toLowerCase().includes(query);

      const matchesRead =
        readFilter === "all" ||
        (readFilter === "unread" && !n.read) ||
        (readFilter === "read" && n.read);

      const matchesType = typeFilter === "all" || n.type === typeFilter;

      return matchesSearch && matchesRead && matchesType;
    });
  }, [data.notifications, searchQuery, readFilter, typeFilter]);

  // Grouped notifications
  const groupedNotifications = useMemo(() => {
    const groups: {
      today: WorkspaceNotification[];
      yesterday: WorkspaceNotification[];
      earlier: WorkspaceNotification[];
    } = { today: [], yesterday: [], earlier: [] };

    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const yesterdayStart = todayStart - 24 * 60 * 60 * 1000;

    filteredNotifications.forEach((n) => {
      const time = new Date(n.timestamp).getTime();
      if (time >= todayStart) {
        groups.today.push(n);
      } else if (time >= yesterdayStart) {
        groups.yesterday.push(n);
      } else {
        groups.earlier.push(n);
      }
    });

    return groups;
  }, [filteredNotifications]);

  // Selected details
  const selectedNotif = useMemo(() => {
    return data.notifications.find((n) => n.id === selectedNotifId);
  }, [data.notifications, selectedNotifId]);

  // Open detail panel and auto-mark read
  const handleOpenDetails = (notif: WorkspaceNotification) => {
    setSelectedNotifId(notif.id);
    if (!notif.read) {
      markNotificationRead(notif.id);
      notifyWorkspaceUpdated();
      refresh();
    }
  };

  const hasFilters = searchQuery !== "" || readFilter !== "all" || typeFilter !== "all";

  return (
    <section>
      <PageHeader
        title="Notifications"
        description="Monitor operations logs, transfer requests, maintenance reports, and critical resource bookings."
        actions={
          <button
            type="button"
            onClick={handleMarkAllRead}
            disabled={unreadCount === 0}
            className="inline-flex h-11 items-center gap-2 rounded-full border-2 border-white/20 px-5 text-sm font-semibold text-slate-300 transition hover:border-white/40 hover:text-white disabled:pointer-events-none disabled:opacity-40"
            aria-label="Mark all notifications as read"
          >
            <MailOpen className="size-4" />
            Mark All as Read
          </button>
        }
      />

      <ScreenPanel>
        {/* Filters and Search */}
        <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-center">
          <label className="relative flex-1">
            <Search className="pointer-events-none absolute top-1/2 left-4 size-4 -translate-y-1/2 text-slate-400" />
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search notifications by keywords…"
              className="screen-search h-12 w-full rounded-full border-2 border-white/20 bg-transparent pr-4 pl-11 text-sm text-slate-100 outline-none transition placeholder:text-slate-500 focus:border-emerald-400/70"
            />
          </label>

          <div className="flex flex-wrap gap-3">
            <FilterSelect
              label="Read State"
              value={readFilter}
              onChange={setReadFilter}
              options={[
                { label: "All status", value: "all" },
                { label: "Unread Only", value: "unread" },
                { label: "Read Only", value: "read" },
              ]}
            />

            <FilterSelect
              label="Alert Type"
              value={typeFilter}
              onChange={setTypeFilter}
              options={[
                { label: "All alerts", value: "all" },
                { label: "Assets", value: "asset" },
                { label: "Maintenance", value: "maintenance" },
                { label: "Bookings", value: "booking" },
                { label: "Transfers", value: "transfer" },
                { label: "Returns", value: "return" },
                { label: "Audits", value: "audit" },
              ]}
            />

            {hasFilters && (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery("");
                  setReadFilter("all");
                  setTypeFilter("all");
                }}
                className="mt-auto h-11 rounded-full border-2 border-white/20 px-4 text-sm text-slate-300 transition hover:border-white/40 hover:text-white"
              >
                Clear
              </button>
            )}
          </div>
        </div>

        {/* Notifications list grouped */}
        <div className="space-y-6">
          {filteredNotifications.length === 0 ? (
            <div className="flex min-h-[220px] flex-col items-center justify-center rounded-2xl border border-dashed border-white/10 bg-white/5 p-8 text-center">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-teal-500/10 text-teal-300">
                <Bell className="size-5" />
              </div>
              <h3 className="text-sm font-semibold text-slate-200">
                {readFilter === "unread" ? "No unread notifications" : "No notifications found"}
              </h3>
              <p className="mt-2 max-w-sm text-xs leading-5 text-slate-400">
                {hasFilters
                  ? "Try resetting filters or checking other alert type groups."
                  : "Updates, alerts, and operational transfer requests will populate here."}
              </p>
            </div>
          ) : (
            <>
              {/* Today Group */}
              {groupedNotifications.today.length > 0 && (
                <div className="space-y-3">
                  <h3 className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400 px-1">
                    Today
                  </h3>
                  <div className="space-y-2">
                    {groupedNotifications.today.map((notif) => (
                      <NotificationRow
                        key={notif.id}
                        notif={notif}
                        onOpen={handleOpenDetails}
                        onToggleRead={handleToggleRead}
                        onDelete={handleDelete}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Yesterday Group */}
              {groupedNotifications.yesterday.length > 0 && (
                <div className="space-y-3">
                  <h3 className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400 px-1">
                    Yesterday
                  </h3>
                  <div className="space-y-2">
                    {groupedNotifications.yesterday.map((notif) => (
                      <NotificationRow
                        key={notif.id}
                        notif={notif}
                        onOpen={handleOpenDetails}
                        onToggleRead={handleToggleRead}
                        onDelete={handleDelete}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Earlier Group */}
              {groupedNotifications.earlier.length > 0 && (
                <div className="space-y-3">
                  <h3 className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400 px-1">
                    Earlier
                  </h3>
                  <div className="space-y-2">
                    {groupedNotifications.earlier.map((notif) => (
                      <NotificationRow
                        key={notif.id}
                        notif={notif}
                        onOpen={handleOpenDetails}
                        onToggleRead={handleToggleRead}
                        onDelete={handleDelete}
                      />
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </ScreenPanel>

      {/* Detail drawer Sheet */}
      <Sheet
        open={selectedNotifId !== null}
        onOpenChange={(open) => {
          if (!open) setSelectedNotifId(null);
        }}
      >
        <SheetContent className="w-full border-white/10 bg-[#0b1018] text-slate-100 sm:max-w-md">
          {selectedNotif && (
            <>
              <SheetHeader>
                <div className="flex items-center gap-3.5 mb-2">
                  <div
                    className={cn(
                      "flex h-10 w-10 items-center justify-center rounded-xl border",
                      getNotificationColor(selectedNotif.type)
                    )}
                  >
                    {React.createElement(getNotificationIcon(selectedNotif.type), { className: "size-4.5" })}
                  </div>
                  <div>
                    <SheetTitle className="text-white text-base">
                      {selectedNotif.title}
                    </SheetTitle>
                    <span className="block text-[11px] text-slate-400 mt-0.5">
                      {new Date(selectedNotif.timestamp).toLocaleString()}
                    </span>
                  </div>
                </div>
                <hr className="border-white/10" />
              </SheetHeader>

              <div className="space-y-5 px-4 pt-4 text-sm leading-6">
                <div className="space-y-2">
                  <span className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">
                    Message
                  </span>
                  <p className="text-slate-200 bg-white/5 rounded-xl border border-white/5 p-4">
                    {selectedNotif.message}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <span className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">
                      Alert Type
                    </span>
                    <span className="block capitalize text-slate-200 mt-1">
                      {selectedNotif.type}
                    </span>
                  </div>

                  <div className="space-y-1">
                    <span className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">
                      Read State
                    </span>
                    <span className="block text-slate-200 mt-1">
                      <StatusBadge
                        label={selectedNotif.read ? "read" : "unread"}
                        tone={selectedNotif.read ? "neutral" : "info"}
                      />
                    </span>
                  </div>
                </div>

                {selectedNotif.relatedEntityLabel && (
                  <div className="space-y-1">
                    <span className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">
                      Related Entity
                    </span>
                    <span className="block text-teal-300 font-medium mt-1">
                      {selectedNotif.relatedEntityLabel}
                    </span>
                  </div>
                )}

                {selectedNotif.suggestedAction && (
                  <div className="space-y-2 border-t border-white/10 pt-4">
                    <span className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400 flex items-center gap-1.5">
                      <Info className="size-3.5 text-teal-400" />
                      Suggested Action
                    </span>
                    <p className="text-slate-300 text-xs italic bg-teal-500/5 border border-teal-500/10 rounded-xl p-3">
                      {selectedNotif.suggestedAction}
                    </p>
                  </div>
                )}

                <div className="flex gap-3 pt-6 border-t border-white/10 mt-6">
                  <button
                    type="button"
                    onClick={() => {
                      removeNotification(selectedNotif.id);
                      setSelectedNotifId(null);
                      notifyWorkspaceUpdated();
                      refresh();
                    }}
                    className="inline-flex flex-1 items-center justify-center gap-2 rounded-full border-2 border-rose-500/30 px-4 py-2.5 text-sm font-semibold text-rose-300 transition hover:bg-rose-500/10"
                  >
                    <Trash2 className="size-4" />
                    Archive Alert
                  </button>
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </section>
  );
}

// ── Sub-component: Notification Row ───────────────────────────────────

interface NotificationRowProps {
  notif: WorkspaceNotification;
  onOpen: (notif: WorkspaceNotification) => void;
  onToggleRead: (id: string, currentRead: boolean, e: React.MouseEvent) => void;
  onDelete: (id: string, e: React.MouseEvent) => void;
}

function NotificationRow({
  notif,
  onOpen,
  onToggleRead,
  onDelete,
}: NotificationRowProps) {
  const colorClasses = getNotificationColor(notif.type);

  return (
    <article
      onClick={() => onOpen(notif)}
      className={cn(
        "group relative flex items-start gap-4 rounded-2xl border p-4 cursor-pointer transition-all duration-200",
        notif.read
          ? "border-white/5 bg-[#0d141e]/50 opacity-70 hover:border-white/10 hover:opacity-100"
          : "border-white/10 bg-[#0d141e] hover:border-teal-500/30 shadow-[0_4px_12px_rgba(0,0,0,0.15)]"
      )}
    >
      {/* Icon frame */}
      <div
        className={cn(
          "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border transition",
          colorClasses
        )}
      >
        {React.createElement(getNotificationIcon(notif.type), { className: "size-4.5" })}
      </div>

      {/* Main detail */}
      <div className="min-w-0 flex-1 pr-6">
        <div className="flex items-center gap-2 flex-wrap">
          <h4 className={cn("text-sm font-semibold truncate", notif.read ? "text-slate-300" : "text-white")}>
            {notif.title}
          </h4>
          {!notif.read && (
            <span className="h-2 w-2 rounded-full bg-teal-400 animate-pulse shrink-0" />
          )}
        </div>
        <p className="mt-1 text-xs text-slate-400 line-clamp-2 leading-relaxed">
          {notif.message}
        </p>
        <span className="mt-2 block text-[10px] text-slate-500 font-medium">
          {formatRelativeTime(notif.timestamp)}
        </span>
      </div>

      {/* Hover action controls */}
      <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-2.5 opacity-0 group-hover:opacity-100 transition duration-150">
        <button
          type="button"
          onClick={(e) => onToggleRead(notif.id, notif.read, e)}
          className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 bg-[#0f172a] text-slate-400 hover:text-white transition"
          title={notif.read ? "Mark as unread" : "Mark as read"}
          aria-label={notif.read ? "Mark as unread" : "Mark as read"}
        >
          {notif.read ? <Eye className="size-4" /> : <MailOpen className="size-4" />}
        </button>
        <button
          type="button"
          onClick={(e) => onDelete(notif.id, e)}
          className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 bg-[#0f172a] text-slate-400 hover:text-rose-400 transition"
          title="Archive notification"
          aria-label="Archive notification"
        >
          <Trash2 className="size-4" />
        </button>
      </div>
    </article>
  );
}
