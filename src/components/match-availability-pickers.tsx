import { useQuery } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { CalendarDays, Clock, Loader2, MapPin } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  formatDateBR,
  formatTimeSlotLabel,
  formatWeekdayBR,
} from "@/lib/date-format";
import {
  fetchAvailableCourts,
  fetchAvailableSundays,
  fetchAvailableTimeSlots,
  type AvailableCourt,
  type AvailableSunday,
  type AvailableTimeSlot,
} from "@/lib/match-availability.queries";

type PickerListProps<T> = {
  loading: boolean;
  emptyMessage: string;
  items: T[];
  renderItem: (item: T) => ReactNode;
};

function PickerList<T>({ loading, emptyMessage, items, renderItem }: PickerListProps<T>) {
  if (loading) {
    return (
      <div className="flex justify-center py-10">
        <Loader2 className="size-6 animate-spin text-primary" />
      </div>
    );
  }
  if (items.length === 0) {
    return <p className="text-sm text-muted-foreground text-center py-8">{emptyMessage}</p>;
  }
  return <div className="space-y-2 max-h-[60vh] overflow-y-auto pr-1">{items.map(renderItem)}</div>;
}

type SundayPickerModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  arenaId: string;
  onSelect: (date: string) => void;
};

export function SundayPickerModal({ open, onOpenChange, arenaId, onSelect }: SundayPickerModalProps) {
  const sundaysQ = useQuery({
    queryKey: ["available-sundays", arenaId],
    queryFn: () => fetchAvailableSundays(arenaId),
    enabled: open && !!arenaId,
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CalendarDays className="size-5 text-primary" />
            Escolha um domingo
          </DialogTitle>
        </DialogHeader>
        <PickerList<AvailableSunday>
          loading={sundaysQ.isLoading}
          emptyMessage="Nenhum domingo com horários livres nos próximos 8 domingos."
          items={sundaysQ.data ?? []}
          renderItem={(item) => (
            <button
              key={item.match_date}
              type="button"
              onClick={() => {
                onSelect(item.match_date);
                onOpenChange(false);
              }}
              className={cn(
                "w-full rounded-xl border border-border/80 bg-card px-4 py-3 text-left",
                "hover:border-primary/40 hover:bg-primary/5 transition-colors",
              )}
            >
              <div className="font-semibold">{formatWeekdayBR(item.match_date)}</div>
              <div className="text-sm text-muted-foreground">{formatDateBR(item.match_date)}</div>
              <div className="text-xs text-primary mt-1">
                {item.free_slots_count}{" "}
                {item.free_slots_count === 1 ? "horário livre" : "horários livres"}
              </div>
            </button>
          )}
        />
      </DialogContent>
    </Dialog>
  );
}

type TimeSlotPickerModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  arenaId: string;
  matchDate: string;
  onSelect: (slot: AvailableTimeSlot) => void;
};

export function TimeSlotPickerModal({
  open,
  onOpenChange,
  arenaId,
  matchDate,
  onSelect,
}: TimeSlotPickerModalProps) {
  const slotsQ = useQuery({
    queryKey: ["available-time-slots", arenaId, matchDate],
    queryFn: () => fetchAvailableTimeSlots(matchDate, arenaId),
    enabled: open && !!arenaId && !!matchDate,
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Clock className="size-5 text-primary" />
            Escolha um horário
          </DialogTitle>
        </DialogHeader>
        <PickerList<AvailableTimeSlot>
          loading={slotsQ.isLoading}
          emptyMessage="Nenhum horário disponível neste domingo."
          items={slotsQ.data ?? []}
          renderItem={(slot) => (
            <button
              key={slot.start_time}
              type="button"
              onClick={() => {
                onSelect(slot);
                onOpenChange(false);
              }}
              className={cn(
                "w-full rounded-xl border border-border/80 bg-card px-4 py-3 text-left",
                "hover:border-primary/40 hover:bg-primary/5 transition-colors",
              )}
            >
              <div className="font-semibold">
                {formatTimeSlotLabel(slot.start_time, slot.end_time)}
              </div>
              <div className="text-xs text-primary mt-0.5">
                {slot.available_courts_count}{" "}
                {slot.available_courts_count === 1 ? "quadra livre" : "quadras livres"}
              </div>
            </button>
          )}
        />
      </DialogContent>
    </Dialog>
  );
}

type CourtPickerModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  arenaId: string;
  matchDate: string;
  startTime: string;
  endTime: string;
  onSelect: (court: AvailableCourt) => void;
};

export function CourtPickerModal({
  open,
  onOpenChange,
  arenaId,
  matchDate,
  startTime,
  endTime,
  onSelect,
}: CourtPickerModalProps) {
  const courtsQ = useQuery({
    queryKey: ["available-courts", arenaId, matchDate, startTime, endTime],
    queryFn: () => fetchAvailableCourts(matchDate, startTime, endTime, arenaId),
    enabled: open && !!arenaId && !!matchDate && !!startTime && !!endTime,
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MapPin className="size-5 text-primary" />
            Escolha uma quadra
          </DialogTitle>
        </DialogHeader>
        <PickerList<AvailableCourt>
          loading={courtsQ.isLoading}
          emptyMessage="Nenhuma quadra disponível neste horário."
          items={courtsQ.data ?? []}
          renderItem={(court) => (
            <button
              key={court.court_number}
              type="button"
              onClick={() => {
                onSelect(court);
                onOpenChange(false);
              }}
              className={cn(
                "w-full rounded-xl border border-border/80 bg-card px-4 py-3 text-left",
                "hover:border-primary/40 hover:bg-primary/5 transition-colors",
              )}
            >
              <div className="font-semibold">{court.court_name}</div>
              <div className="text-xs text-muted-foreground">Quadra {court.court_number}</div>
            </button>
          )}
        />
      </DialogContent>
    </Dialog>
  );
}

type SchedulePickerButtonProps = {
  label: string;
  value: string | null;
  placeholder: string;
  disabled?: boolean;
  onClick: () => void;
};

export function SchedulePickerButton({
  label,
  value,
  placeholder,
  disabled,
  onClick,
}: SchedulePickerButtonProps) {
  return (
    <div>
      <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
        {label}
      </label>
      <Button
        type="button"
        variant="outline"
        disabled={disabled}
        onClick={onClick}
        className={cn(
          "w-full mt-2 justify-start font-normal h-10",
          !value && "text-muted-foreground",
        )}
      >
        {value ?? placeholder}
      </Button>
    </div>
  );
}
