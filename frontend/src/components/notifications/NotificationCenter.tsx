"use client";

import { useMemo, useState } from "react";
import {
  ArrowLeftRight,
  Bell,
  Calendar,
  ClipboardCheck,
  Package,
  RotateCcw,
  Search,
  Trash2,
  Wrench,
  type LucideIcon,
} from "lucide-react";

import PageHeader from "@/components/dashboard/PageHeader";
import FilterSelect from "@/components/workspace/FilterSelect";
import ScreenPanel from "@/components/workspace/ScreenPanel";
import StatusBadge from "@/components/workspace/StatusBadge";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
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
import { NOTIFICATION_TYPES } from "@/lib/workspace/types";
import {
  formatNotificationTimestamp,
  getNotificationDayGroup,
} from "@/lib/workspace/utils";
import { cn } from "@/lib/utils";

const typeIcons: Record<NotificationType, LucideIcon> = {
  asset: Package,
  maintenance: Wrench,
  booking: Calendar,
  transfer: ArrowLeftRight,
  return: RotateCcw,
  audit: ClipboardCheck,
};

function notificationTone(type: NotificationType) {
  if (type === "maintenance" || type === "return") {
    return "warning" as const;
  }
  if (type === "audit" || type === "transfer") {
    return "info" as const;
  }
  if (type === "asset") {
    return "success" as const;
  }
  return "neutral" as const;
}

function getSuggestedAction(notification: WorkspaceNotification) {
  if (notification.suggestedAction) {
    return notification.suggestedAction;
  }

  switch (notification.type) {
    case "asset":
      return "Review the asset record in the directory.";
    case "maintenance":
      return "Open Maintenance to review the request.";
    case "booking":
      return "Check Resource Booking for schedule details.";
    case "transfer":
      return "Review the transfer in Allocation & Transfer.";
    case "return":
      return "Follow up on the overdue or completed return.";
    case "audit":
      return "Open the Audit workspace to review findings.";
    default:
      return "Review the related workspace record.";
  }
}

const groupLabels = {
  today: "Today",
  yesterday: "Yesterday",
  earlier: "Earlier",
} as const;

export default function NotificationCenter() {
  const { data, refresh } = useWorkspaceData();
  const [readFilter, setReadFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const unreadCount = data.notifications.filter((item) => !item.read).length;

  const filteredNotifications = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    return data.notifications.filter((notification) => {
      const matchesRead =
        readFilter === "all" ||
        (readFilter === "unread" ? !notification.read : notification.read);
      const matchesType =
        typeFilter === "all" || notification.type === typeFilter;
      const matchesSearch =
        query.length === 0 ||
        notification.title.toLowerCase().includes(query) ||
        notification.message.toLowerCase().includes(query) ||
        (notification.relatedEntityLabel ?? "").toLowerCase().includes(query);

      return matchesRead && matchesType && matchesSearch;
    });
  }, [data.notifications, readFilter, searchQuery, typeFilter]);

  const groupedNotifications = useMemo(() => {
    const groups: Record<"today" | "yesterday" | "earlier", WorkspaceNotification[]> =
      {
        today: [],
        yesterday: [],
        earlier: [],
      };

    for (const notification of filteredNotifications) {
      groups[getNotificationDayGroup(notification.timestamp)].push(notification);
    }

    return groups;
  }, [filteredNotifications]);

  const selectedNotification = data.notifications.find(
    (item) => item.id === selectedId
  );

  const openNotification = (notification: WorkspaceNotification) => {
    setSelectedId(notification.id);
    if (!notification.read) {
      markNotificationRead(notification.id);
      notifyWorkspaceUpdated();
      refresh();
    }
  };

  const handleMarkAllRead = () => {
    markAllNotificationsRead();
    notifyWorkspaceUpdated();
    refresh();
  };

  const emptyMessage = (() => {
    if (data.notifications.length === 0) {
      return "No notifications yet. Workspace alerts will appear here.";
    }
    if (readFilter === "unread" && unreadCount === 0) {
      return "You are all caught up. No unread notifications.";
    }
    return "No notifications match the current filters.";
  })();

  const hasFilters =
    readFilter !== "all" || typeFilter !== "all" || searchQuery.trim().length > 0;

  return (
    <section>
      <PageHeader
        title="Notifications"
        description="View alerts for allocations, maintenance, bookings, returns, transfers, and audits."
        actions={
          <button
            type="button"
            onClick={handleMarkAllRead}
            disabled={unreadCount === 0}
            className="screen-action inline-flex items-center gap-2 rounded-full border-2 px-5 py-2.5 text-sm font-semibold transition hover:bg-emerald-500/10 disabled:cursor-not-allowed disabled:opacity-50"
            aria-label="Mark all notifications as read"
          >
            <Bell className="size-4" />
            Mark All as Read
            {unreadCount > 0 && (
              <span className="rounded-full bg-emerald-500/20 px-2 py-0.5 text-xs">
                {unreadCount}
              </span>
            )}
          </button>
        }
      />

      <ScreenPanel>
        <div className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-end">
          <label className="relative flex-1">
            <Search className="pointer-events-none absolute top-1/2 left-4 size-4 -translate-y-1/2 text-slate-400" />
            <input
              type="search"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Search notifications…"
              className="screen-search h-12 w-full rounded-full border-2 border-white/20 bg-transparent pr-4 pl-11 text-sm text-slate-100 outline-none transition placeholder:text-slate-500 focus:border-emerald-400/70"
              aria-label="Search notifications"
            />
          </label>

          <div className="flex flex-wrap gap-3">
            <FilterSelect
              label="Read state"
              value={readFilter}
              onChange={setReadFilter}
              options={[
                { label: "All", value: "all" },
                { label: "Unread", value: "unread" },
                { label: "Read", value: "read" },
              ]}
            />
            <FilterSelect
              label="Type"
              value={typeFilter}
              onChange={setTypeFilter}
              options={[
                { label: "All types", value: "all" },
                ...NOTIFICATION_TYPES.map((type) => ({
                  label: type.charAt(0).toUpperCase() + type.slice(1),
                  value: type,
                })),
              ]}
            />
            {hasFilters && (
              <button
                type="button"
                onClick={() => {
                  setReadFilter("all");
                  setTypeFilter("all");
                  setSearchQuery("");
                }}
                className="mt-auto h-11 rounded-full border-2 border-white/20 px-4 text-sm text-slate-300 transition hover:border-white/40 hover:text-white"
              >
                Clear
              </button>
            )}
          </div>
        </div>

        {filteredNotifications.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-white/15 px-6 py-16 text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-white/5 text-slate-300">
              <Bell className="size-5" />
            </div>
            <p className="text-sm text-slate-300">{emptyMessage}</p>
          </div>
        ) : (
          <div className="space-y-8">
            {(["today", "yesterday", "earlier"] as const).map((group) => {
              const items = groupedNotifications[group];
              if (items.length === 0) {
                return null;
              }

              return (
                <section key={group}>
                  <h2 className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                    {groupLabels[group]}
                  </h2>
                  <ul className="space-y-3">
                    {items.map((notification) => {
                      const Icon = typeIcons[notification.type];

                      return (
                        <li key={notification.id}>
                          <button
                            type="button"
                            onClick={() => openNotification(notification)}
                            className={cn(
                              "flex w-full items-start gap-4 rounded-2xl border px-4 py-4 text-left transition hover:bg-white/5",
                              notification.read
                                ? "border-white/10 bg-white/[0.02]"
                                : "border-emerald-400/30 bg-emerald-500/5"
                            )}
                          >
                            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white/5 text-emerald-300">
                              <Icon className="size-5" aria-hidden="true" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="flex flex-wrap items-center gap-2">
                                <h3 className="text-sm font-semibold text-white">
                                  {notification.title}
                                </h3>
                                {!notification.read && (
                                  <span
                                    className="inline-block size-2 rounded-full bg-emerald-400"
                                    aria-label="Unread notification"
                                  />
                                )}
                                <StatusBadge
                                  label={notification.type}
                                  tone={notificationTone(notification.type)}
                                />
                              </div>
                              <p className="mt-1 line-clamp-2 text-sm text-slate-400">
                                {notification.message}
                              </p>
                              <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-slate-500">
                                <span>
                                  {formatNotificationTimestamp(notification.timestamp)}
                                </span>
                                {notification.relatedEntityLabel && (
                                  <span className="rounded-full border border-white/10 px-2 py-0.5 text-slate-300">
                                    {notification.relatedEntityLabel}
                                  </span>
                                )}
                              </div>
                            </div>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                </section>
              );
            })}
          </div>
        )}
      </ScreenPanel>

      <Sheet
        open={selectedId !== null}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedId(null);
          }
        }}
      >
        <SheetContent className="w-full overflow-y-auto border-white/10 bg-[#0b1018] text-slate-100 sm:max-w-lg">
          {selectedNotification && (
            <>
              <SheetHeader>
                <SheetTitle className="text-white">
                  {selectedNotification.title}
                </SheetTitle>
                <SheetDescription className="text-slate-400">
                  {formatNotificationTimestamp(selectedNotification.timestamp)}
                </SheetDescription>
              </SheetHeader>

              <div className="space-y-5 px-4">
                <div className="flex flex-wrap items-center gap-2">
                  <StatusBadge
                    label={selectedNotification.type}
                    tone={notificationTone(selectedNotification.type)}
                  />
                  <StatusBadge
                    label={selectedNotification.read ? "Read" : "Unread"}
                    tone={selectedNotification.read ? "neutral" : "info"}
                  />
                </div>

                <p className="text-sm leading-6 text-slate-300">
                  {selectedNotification.message}
                </p>

                {selectedNotification.relatedEntityLabel && (
                  <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">
                      Related entity
                    </p>
                    <p className="mt-2 text-sm font-medium text-white">
                      {selectedNotification.relatedEntityLabel}
                    </p>
                  </div>
                )}

                <div className="rounded-xl border border-emerald-400/20 bg-emerald-500/5 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-emerald-300">
                    Suggested action
                  </p>
                  <p className="mt-2 text-sm text-slate-200">
                    {getSuggestedAction(selectedNotification)}
                  </p>
                </div>

                <div className="flex flex-wrap gap-2 pt-2">
                  {selectedNotification.read ? (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        markNotificationUnread(selectedNotification.id);
                        notifyWorkspaceUpdated();
                        refresh();
                      }}
                    >
                      Mark as unread
                    </Button>
                  ) : (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        markNotificationRead(selectedNotification.id);
                        notifyWorkspaceUpdated();
                        refresh();
                      }}
                    >
                      Mark as read
                    </Button>
                  )}
                  <Button
                    type="button"
                    variant="destructive"
                    onClick={() => {
                      removeNotification(selectedNotification.id);
                      notifyWorkspaceUpdated();
                      refresh();
                      setSelectedId(null);
                    }}
                  >
                    <Trash2 className="size-4" />
                    Remove
                  </Button>
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </section>
  );
}
