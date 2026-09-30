"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { CATEGORY_COLORS, CATEGORY_LABELS, EVENT_CATEGORIES } from "@/data/interests";
import { events, getEvent, getPeopleForEvent, getPerson, getRecommendation, getRecsForPerson, people } from "@/lib/data";
import { DemoNav } from "@/components/DemoNav";
import { EventDetail } from "./EventDetail";
import { PhysicsStage } from "./PhysicsStage";

export function DemoApp() {
  const [selectedPersonId, setSelectedPersonId] = useState<string | null>(null);
  const [openEventId, setOpenEventId] = useState<string | null>(null);

  const person = selectedPersonId ? getPerson(selectedPersonId) ?? null : null;
  const recs = useMemo(() => (selectedPersonId ? getRecsForPerson(selectedPersonId) : []), [selectedPersonId]);
  const matchedEventIds = useMemo(() => (selectedPersonId ? new Set(recs.map((r) => r.eventId)) : null), [recs, selectedPersonId]);
  const bestBetEventId = recs.find((r) => r.isBestBet)?.eventId ?? null;

  const selectPerson = useCallback((id: string | null) => {
    setOpenEventId(null);
    setSelectedPersonId(id);
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (openEventId) setOpenEventId(null);
        else setSelectedPersonId(null);
      }
      if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
        const idx = selectedPersonId ? people.findIndex((p) => p.id === selectedPersonId) : -1;
        const dir = e.key === "ArrowRight" ? 1 : -1;
        const next = (idx + dir + people.length) % people.length;
        selectPerson(people[next].id);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [openEventId, selectedPersonId, selectPerson]);

  const openEvent = openEventId ? getEvent(openEventId) : undefined;
  const overlay = openEvent ? (
    <EventDetail
      key={openEvent.id}
      event={openEvent}
      person={person}
      recommendation={selectedPersonId ? getRecommendation(selectedPersonId, openEvent.id) : undefined}
      othersGoing={getPeopleForEvent(openEvent.id, selectedPersonId ?? undefined)}
      onClose={() => setOpenEventId(null)}
    />
  ) : null;

  return (
    <div className="flex h-dvh flex-col bg-background text-foreground">
      <header className="flex h-20 shrink-0 items-center gap-8 border-b border-white/10 px-8">
        <div className="flex shrink-0 items-center gap-5">
          <h1 className="text-2xl font-semibold tracking-tight">Rally</h1>
          <DemoNav />
        </div>
        <div className="flex min-w-0 flex-1 items-center justify-evenly gap-x-2 overflow-hidden text-lg">
          {EVENT_CATEGORIES.map((c) => (
            <span key={c} className="flex shrink-0 items-center gap-2.5 whitespace-nowrap">
              <span className="size-4.5 rounded-full" style={{ background: CATEGORY_COLORS[c] }} />
              {CATEGORY_LABELS[c]}
            </span>
          ))}
          <span className="flex shrink-0 items-center gap-2.5 whitespace-nowrap">
            <span className="size-4.5 rounded-full bg-amber-300 shadow-[0_0_12px_3px_rgba(251,191,36,0.7)]" />
            Best bet
          </span>
        </div>
        <div className="flex w-20 shrink-0 justify-end">
          {person && (
            <button
              onClick={() => selectPerson(null)}
              className="rounded-full border border-white/15 px-3 py-1 text-sm font-medium text-foreground transition hover:bg-white/10"
            >
              Reset
            </button>
          )}
        </div>
      </header>

      <div className="relative min-h-0 flex-1">
        <PhysicsStage
          people={people}
          events={events}
          selectedPersonId={selectedPersonId}
          matchedEventIds={matchedEventIds}
          bestBetEventId={bestBetEventId}
          openEventId={openEventId}
          onSelectPerson={selectPerson}
          onSelectEvent={setOpenEventId}
          overlay={overlay}
        />
      </div>
    </div>
  );
}
