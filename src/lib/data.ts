import peopleJson from "@/data/people.json";
import eventsJson from "@/data/events.json";
import recsJson from "@/data/recommendations.json";
import type { Coords, Person, RallyEvent, Recommendation } from "./types";

export const people = peopleJson as Person[];
export const events = eventsJson as RallyEvent[];
export const recommendations = recsJson as Recommendation[];

const personById = new Map(people.map((p) => [p.id, p]));
const eventById = new Map(events.map((e) => [e.id, e]));

const recsByPerson = new Map<string, Recommendation[]>();
const recsByEvent = new Map<string, Recommendation[]>();
for (const r of recommendations) {
  (recsByPerson.get(r.personId) ?? recsByPerson.set(r.personId, []).get(r.personId)!).push(r);
  (recsByEvent.get(r.eventId) ?? recsByEvent.set(r.eventId, []).get(r.eventId)!).push(r);
}
for (const list of recsByPerson.values()) list.sort((a, b) => b.score - a.score);

export function getPerson(id: string): Person | undefined {
  return personById.get(id);
}

export function getEvent(id: string): RallyEvent | undefined {
  return eventById.get(id);
}

/** Recommendations for a person, highest score first. */
export function getRecsForPerson(personId: string): Recommendation[] {
  return recsByPerson.get(personId) ?? [];
}

export function getRecommendation(personId: string, eventId: string): Recommendation | undefined {
  return recsByPerson.get(personId)?.find((r) => r.eventId === eventId);
}

/** People who were also recommended this event, optionally excluding one. */
export function getPeopleForEvent(eventId: string, excludePersonId?: string): Person[] {
  return (recsByEvent.get(eventId) ?? [])
    .map((r) => personById.get(r.personId)!)
    .filter((p) => p && p.id !== excludePersonId);
}

export function distanceMiles(a: Coords, b: Coords): number {
  const R = 3958.8;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

/**
 * Date parts read straight from the ISO string so the bubble shows the
 * event's local date regardless of the viewer's timezone.
 */
export function eventDateParts(iso: string) {
  const [y, m, d] = iso.slice(0, 10).split("-").map(Number);
  const hh = Number(iso.slice(11, 13));
  const mm = Number(iso.slice(14, 16));
  const weekday = DAYS[new Date(Date.UTC(y, m - 1, d)).getUTCDay()];
  const h12 = hh % 12 === 0 ? 12 : hh % 12;
  const time = `${h12}${mm ? ":" + String(mm).padStart(2, "0") : ""} ${hh < 12 ? "am" : "pm"}`;
  return { day: d, month: MONTHS[m - 1], weekday, time };
}
