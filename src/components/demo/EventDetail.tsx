/* eslint-disable @next/next/no-img-element */
import { X, Sparkles, GraduationCap, Clock, MapPin, Ticket } from "lucide-react";
import { CATEGORY_COLORS, CATEGORY_LABELS } from "@/data/interests";
import { SCHOOL_SHORT } from "@/data/schools";
import { distanceMiles, eventDateParts } from "@/lib/data";
import type { Person, RallyEvent, Recommendation } from "@/lib/types";

/**
 * Deliberately sparse and large for a projector: when, where, why it fits
 * this person, and who else like them is going. Everything else stays in the
 * data.
 */
export function EventDetail({
  event,
  person,
  recommendation,
  othersGoing,
  onClose,
}: {
  event: RallyEvent;
  person: Person | null;
  recommendation: Recommendation | undefined;
  othersGoing: Person[];
  onClose: () => void;
}) {
  const color = CATEGORY_COLORS[event.category];
  const start = eventDateParts(event.start);
  const dist = person ? distanceMiles(person.location.coords, event.venue.coords) : null;
  const firstName = person?.name.split(" ")[0];
  const isStudent = person ? person.studentStatus !== "recent_grad" : false;
  const studentPrice = event.price.type === "paid" ? event.price.studentAmount : undefined;
  const price =
    event.price.type === "free"
      ? "Free"
      : isStudent && studentPrice !== undefined
        ? studentPrice === 0
          ? "Free with student ID"
          : `$${studentPrice} with student ID`
        : `$${event.price.amount}`;
  const sameSchool = person ? othersGoing.filter((p) => p.school === person.school) : [];
  const orderedOthers = person ? [...sameSchool, ...othersGoing.filter((p) => p.school !== person.school)] : othersGoing;
  const onCampus = person && event.campus === person.school;

  return (
    <div
      className="rally-appear relative flex max-h-full w-[600px] flex-col overflow-hidden rounded-3xl border border-white/10 bg-card/95 shadow-2xl shadow-black/50 backdrop-blur"
      style={{ boxShadow: `0 0 0 1px ${color}33, 0 30px 80px -20px ${color}55` }}
    >
      <button
        onClick={onClose}
        aria-label="Close"
        className="absolute right-4 top-5 rounded-full p-2 text-muted-foreground transition hover:bg-white/10 hover:text-foreground"
      >
        <X className="size-5" />
      </button>

      <div className="flex flex-col gap-6 overflow-y-auto p-8">
        <div className="flex items-start gap-5 pr-8">
          <div
            className="flex size-[88px] shrink-0 flex-col items-center justify-center rounded-2xl text-black"
            style={{ background: color }}
          >
            <span className="text-4xl font-bold leading-none">{start.day}</span>
            <span className="mt-1 text-sm font-semibold uppercase leading-none">{start.month}</span>
          </div>
          <div className="min-w-0">
            <div className="mb-1 flex flex-wrap items-center gap-2 text-sm font-semibold uppercase tracking-wider" style={{ color }}>
              {CATEGORY_LABELS[event.category]}
              {recommendation?.isBestBet && (
                <span className="inline-flex items-center gap-1 rounded-full bg-amber-300/20 px-2.5 py-0.5 text-amber-200 normal-case tracking-normal">
                  <Sparkles className="size-3.5" /> Best bet
                </span>
              )}
            </div>
            <h2 className="text-3xl font-semibold leading-tight tracking-tight">{event.title}</h2>
          </div>
        </div>

        <ul className="flex flex-wrap gap-x-6 gap-y-2.5 text-lg leading-none">
          <li className="flex items-center gap-2.5">
            <Clock className="size-5 shrink-0 text-muted-foreground" />
            <span>
              {start.weekday} {start.month} {start.day} · {start.time}
            </span>
          </li>
          <li className="flex items-center gap-2.5">
            <MapPin className="size-5 shrink-0 text-muted-foreground" />
            <span>
              {event.venue.name}
              {dist !== null && (
                <span className="text-muted-foreground">
                  {" "}
                  · {dist < 1 ? "under a mile" : `${dist.toFixed(1)} mi`} from {firstName}
                </span>
              )}
            </span>
          </li>
          <li className="flex items-center gap-2.5">
            <Ticket className="size-5 shrink-0 text-muted-foreground" />
            <span>{price}</span>
          </li>
          {event.campus && (
            <li className={"flex items-center gap-2.5 " + (onCampus ? "text-sky-200" : "")}>
              <GraduationCap className={"size-5 shrink-0 " + (onCampus ? "text-sky-300" : "text-muted-foreground")} />
              <span>{onCampus ? `On your campus, ${SCHOOL_SHORT[event.campus]}` : `Hosted by ${SCHOOL_SHORT[event.campus]}`}</span>
            </li>
          )}
        </ul>

        {recommendation && (
          <div className="rounded-2xl bg-white/5 p-5">
            <div className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              Why this is for {firstName}
            </div>
            <ul className="space-y-2.5">
              {recommendation.reasons.slice(0, 2).map((r) => (
                <li key={r} className="flex gap-3 text-[22px] leading-snug">
                  <span className="mt-[11px] size-2 shrink-0 rounded-full" style={{ background: color }} />
                  <span>{r}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {othersGoing.length > 0 && (
          <div>
            <div className="mb-3 flex items-center gap-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              {othersGoing.length} {person ? (othersGoing.length === 1 ? "person like you" : "people like you") : othersGoing.length === 1 ? "person" : "people"} going
              {person && sameSchool.length > 0 && (
                <span className="rounded-full bg-sky-400/20 px-2.5 py-0.5 normal-case tracking-normal text-sky-100">
                  {sameSchool.length} from {SCHOOL_SHORT[person.school]}
                </span>
              )}
            </div>
            <ul className="flex flex-wrap gap-5">
              {orderedOthers.slice(0, 6).map((p) => (
                <li key={p.id} className="flex w-[72px] flex-col items-center text-center">
                  <img
                    src={p.avatar}
                    alt=""
                    className={
                      "size-16 rounded-full object-cover ring-[3px] " +
                      (person && p.school === person.school ? "ring-sky-300/80" : "ring-white/10")
                    }
                    draggable={false}
                  />
                  <span className="mt-1.5 w-full truncate text-base leading-tight">{p.name.split(" ")[0]}</span>
                  <span className="w-full truncate text-xs text-muted-foreground">{SCHOOL_SHORT[p.school]}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
