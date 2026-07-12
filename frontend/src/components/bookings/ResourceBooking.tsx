"use client";

import { useMemo, useState } from "react";
import { Plus } from "lucide-react";

import FormField, { formControlClass } from "@/components/workspace/FormField";
import ScreenPanel from "@/components/workspace/ScreenPanel";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  notifyWorkspaceUpdated,
  useWorkspaceData,
} from "@/hooks/use-workspace-data";
import { createBooking, upsertResource } from "@/lib/workspace/storage";
import { BOOKING_HOURS } from "@/lib/workspace/types";
import { cn } from "@/lib/utils";

const TIMELINE_START = 9;
const TIMELINE_END = 17;

function toMinutes(hour: number, minute: number) {
  return hour * 60 + minute;
}

function formatHourLabel(hour: number) {
  if (hour === 12) {
    return "12:00";
  }

  if (hour > 12) {
    return `${hour - 12}:00`;
  }

  return `${hour}:00`;
}

function formatSelectedDateLabel(date: string) {
  if (!date) {
    return "";
  }

  return new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    day: "numeric",
    month: "short",
  }).format(new Date(`${date}T12:00:00`));
}

function formatTimeRange(
  startHour: number,
  startMinute: number,
  endHour: number,
  endMinute: number
) {
  const formatPart = (hour: number, minute: number) => {
    const normalizedHour = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour;
    const suffix = hour >= 12 ? "pm" : "am";
    return minute === 0
      ? `${normalizedHour} ${suffix}`
      : `${normalizedHour}:${minute.toString().padStart(2, "0")} ${suffix}`;
  };

  return `${formatPart(startHour, startMinute)} to ${formatPart(endHour, endMinute)}`;
}

export default function ResourceBooking() {
  const { data, refresh } = useWorkspaceData();
  const [selectedResourceId, setSelectedResourceId] = useState("");
  const [selectedDate, setSelectedDate] = useState(
    new Date().toISOString().slice(0, 10)
  );
  const [resourceSheetOpen, setResourceSheetOpen] = useState(false);
  const [bookingSheetOpen, setBookingSheetOpen] = useState(false);
  const [resourceName, setResourceName] = useState("");
  const [bookingTitle, setBookingTitle] = useState("");
  const [startHour, setStartHour] = useState("9");
  const [startMinute, setStartMinute] = useState("0");
  const [endHour, setEndHour] = useState("10");
  const [endMinute, setEndMinute] = useState("0");
  const [message, setMessage] = useState("");

  const selectedResource = data.resources.find(
    (resource) => resource.id === selectedResourceId
  );

  const dayBookings = useMemo(() => {
    return data.bookings.filter(
      (booking) =>
        booking.resourceId === selectedResourceId &&
        booking.date === selectedDate
    );
  }, [data.bookings, selectedDate, selectedResourceId]);

  const timelineHeight = (TIMELINE_END - TIMELINE_START) * 64;

  const getBlockStyle = (
    startH: number,
    startM: number,
    endH: number,
    endM: number
  ) => {
    const totalMinutes = (TIMELINE_END - TIMELINE_START) * 60;
    const start = toMinutes(startH, startM) - TIMELINE_START * 60;
    const end = toMinutes(endH, endM) - TIMELINE_START * 60;

    return {
      top: `${(start / totalMinutes) * 100}%`,
      height: `${((end - start) / totalMinutes) * 100}%`,
    };
  };

  const handleAddResource = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!resourceName.trim()) {
      return;
    }

    const resource = upsertResource({ name: resourceName.trim() });
    notifyWorkspaceUpdated();
    refresh();
    setSelectedResourceId(resource.id);
    setResourceName("");
    setResourceSheetOpen(false);
  };

  const handleCreateBooking = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!selectedResourceId || !bookingTitle.trim()) {
      return;
    }

    const startHourValue = Number(startHour);
    const startMinuteValue = Number(startMinute);
    const endHourValue = Number(endHour);
    const endMinuteValue = Number(endMinute);

    if (
      toMinutes(endHourValue, endMinuteValue) <=
      toMinutes(startHourValue, startMinuteValue)
    ) {
      setMessage("End time must be after start time.");
      return;
    }

    const result = createBooking({
      resourceId: selectedResourceId,
      title: bookingTitle.trim(),
      date: selectedDate,
      startHour: startHourValue,
      startMinute: startMinuteValue,
      endHour: endHourValue,
      endMinute: endMinuteValue,
    });

    notifyWorkspaceUpdated();
    refresh();
    setBookingSheetOpen(false);
    setBookingTitle("");
    setMessage(
      result.hasConflict
        ? "Requested slot conflicts with an existing booking."
        : "Slot booked successfully."
    );
  };

  return (
    <section>
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-400">
            Shared resources
          </p>
          <h1 className="mt-2 text-2xl font-semibold text-slate-900 dark:text-white">
            Resource Booking
          </h1>
        </div>
        <button
          type="button"
          onClick={() => setResourceSheetOpen(true)}
          className="screen-action inline-flex items-center gap-2 rounded-full border-2 px-5 py-2.5 text-sm font-semibold transition hover:bg-emerald-500/10"
        >
          <Plus className="size-4" />
          Add resource
        </button>
      </div>

      <ScreenPanel>
        <div className="grid gap-4 md:grid-cols-[1fr_auto] md:items-end">
          <FormField label="Resource">
            <select
              className={formControlClass}
              value={selectedResourceId}
              onChange={(event) => setSelectedResourceId(event.target.value)}
            >
              <option value="">Select resource</option>
              {data.resources.map((resource) => (
                <option key={resource.id} value={resource.id}>
                  {resource.name}
                  {selectedDate
                    ? ` - ${formatSelectedDateLabel(selectedDate)}`
                    : ""}
                </option>
              ))}
            </select>
          </FormField>
          <FormField label="Date">
            <input
              type="date"
              className={formControlClass}
              value={selectedDate}
              onChange={(event) => setSelectedDate(event.target.value)}
            />
          </FormField>
        </div>

        {!selectedResourceId ? (
          <p className="mt-5 text-sm text-slate-400">
            Add a resource, then select it to view the booking timeline.
          </p>
        ) : (
          <>
            <div className="mt-6 overflow-hidden rounded-[1.25rem] border border-white/15">
              <div className="flex">
                <div className="w-20 shrink-0 border-r border-white/10 bg-white/5">
                  <div
                    className="relative"
                    style={{ height: `${timelineHeight}px` }}
                  >
                    {BOOKING_HOURS.filter(
                      (hour) => hour >= TIMELINE_START && hour <= TIMELINE_END
                    ).map((hour) => (
                      <div
                        key={hour}
                        className="absolute right-3 -translate-y-1/2 text-xs text-slate-400"
                        style={{
                          top: `${((hour - TIMELINE_START) / (TIMELINE_END - TIMELINE_START)) * 100}%`,
                        }}
                      >
                        {formatHourLabel(hour)}
                      </div>
                    ))}
                  </div>
                </div>

                <div
                  className="relative flex-1 bg-[#0d1420]"
                  style={{ height: `${timelineHeight}px` }}
                >
                  {BOOKING_HOURS.filter(
                    (hour) => hour >= TIMELINE_START && hour < TIMELINE_END
                  ).map((hour) => (
                    <div
                      key={hour}
                      className="absolute inset-x-0 border-t border-white/8"
                      style={{
                        top: `${((hour - TIMELINE_START) / (TIMELINE_END - TIMELINE_START)) * 100}%`,
                      }}
                    />
                  ))}

                  {dayBookings.length === 0 ? (
                    <div className="absolute inset-0 flex items-center justify-center px-6 text-center text-sm text-slate-400">
                      No bookings for {selectedResource?.name} on this date.
                    </div>
                  ) : (
                    dayBookings.map((booking) => {
                      const style = getBlockStyle(
                        booking.startHour,
                        booking.startMinute,
                        booking.endHour,
                        booking.endMinute
                      );

                      const isConflict = booking.status === "requested";

                      return (
                        <div
                          key={booking.id}
                          className={cn(
                            "absolute inset-x-4 rounded-2xl px-4 py-3 text-sm leading-5",
                            isConflict
                              ? "border-2 border-dashed border-red-400/80 bg-red-500/10 text-red-100"
                              : "border border-sky-400/40 bg-sky-500/25 text-sky-50"
                          )}
                          style={style}
                        >
                          {isConflict ? "Requested " : "Booked - "}
                          {booking.title} -{" "}
                          {formatTimeRange(
                            booking.startHour,
                            booking.startMinute,
                            booking.endHour,
                            booking.endMinute
                          )}
                          {isConflict ? " - conflict - slot is unavailable" : ""}
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setBookingSheetOpen(true)}
              className="screen-action mt-5 rounded-full border-2 px-5 py-2.5 text-sm font-semibold transition hover:bg-emerald-500/10"
            >
              Book a slot
            </button>
          </>
        )}

        {message ? (
          <p className="mt-4 text-sm text-emerald-300">{message}</p>
        ) : null}
      </ScreenPanel>

      <Sheet open={resourceSheetOpen} onOpenChange={setResourceSheetOpen}>
        <SheetContent className="w-full border-white/10 bg-[#0b1018] text-slate-100 sm:max-w-md">
          <SheetHeader>
            <SheetTitle className="text-white">Add resource</SheetTitle>
            <SheetDescription className="text-slate-400">
              Create a bookable room, vehicle, or shared equipment item.
            </SheetDescription>
          </SheetHeader>
          <form className="flex flex-col gap-4 px-4" onSubmit={handleAddResource}>
            <FormField label="Resource name">
              <input
                className={formControlClass}
                value={resourceName}
                onChange={(event) => setResourceName(event.target.value)}
                placeholder="Conference room B2"
                required
              />
            </FormField>
            <SheetFooter className="px-0">
              <Button type="submit">Save resource</Button>
            </SheetFooter>
          </form>
        </SheetContent>
      </Sheet>

      <Sheet open={bookingSheetOpen} onOpenChange={setBookingSheetOpen}>
        <SheetContent className="w-full border-white/10 bg-[#0b1018] text-slate-100 sm:max-w-md">
          <SheetHeader>
            <SheetTitle className="text-white">Book a slot</SheetTitle>
            <SheetDescription className="text-slate-400">
              Request a time slot for {selectedResource?.name ?? "the resource"}.
            </SheetDescription>
          </SheetHeader>
          <form className="flex flex-col gap-4 px-4" onSubmit={handleCreateBooking}>
            <FormField label="Booking title">
              <input
                className={formControlClass}
                value={bookingTitle}
                onChange={(event) => setBookingTitle(event.target.value)}
                placeholder="Procurement Team"
                required
              />
            </FormField>
            <div className="grid grid-cols-2 gap-4">
              <FormField label="Start hour">
                <select
                  className={formControlClass}
                  value={startHour}
                  onChange={(event) => setStartHour(event.target.value)}
                >
                  {BOOKING_HOURS.map((hour) => (
                    <option key={hour} value={hour}>
                      {formatHourLabel(hour)}
                    </option>
                  ))}
                </select>
              </FormField>
              <FormField label="Start minute">
                <select
                  className={formControlClass}
                  value={startMinute}
                  onChange={(event) => setStartMinute(event.target.value)}
                >
                  <option value="0">00</option>
                  <option value="30">30</option>
                </select>
              </FormField>
              <FormField label="End hour">
                <select
                  className={formControlClass}
                  value={endHour}
                  onChange={(event) => setEndHour(event.target.value)}
                >
                  {BOOKING_HOURS.map((hour) => (
                    <option key={hour} value={hour}>
                      {formatHourLabel(hour)}
                    </option>
                  ))}
                </select>
              </FormField>
              <FormField label="End minute">
                <select
                  className={formControlClass}
                  value={endMinute}
                  onChange={(event) => setEndMinute(event.target.value)}
                >
                  <option value="0">00</option>
                  <option value="30">30</option>
                </select>
              </FormField>
            </div>
            <SheetFooter className="px-0">
              <Button type="submit">Create booking</Button>
            </SheetFooter>
          </form>
        </SheetContent>
      </Sheet>
    </section>
  );
}
