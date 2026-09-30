// Referential integrity and demo invariants for the seed data.
// Run: npm run validate

import { existsSync } from "node:fs";
import path from "node:path";
import { EVENT_CATEGORIES, INTEREST_TAGS } from "../src/data/interests";
import { SCHOOLS } from "../src/data/schools";
import people from "../src/data/people.json";
import events from "../src/data/events.json";
import recommendations from "../src/data/recommendations.json";
import type { Person, RallyEvent, Recommendation } from "../src/lib/types";

const WINDOW_START = "2026-10-01";
const WINDOW_END = "2026-11-16"; // exclusive
const MIN_RECS = 8;
const MAX_RECS = 14;

const errors: string[] = [];
const fail = (msg: string) => errors.push(msg);

const tagSet = new Set<string>(INTEREST_TAGS);
const categorySet = new Set<string>(EVENT_CATEGORIES);
const schoolSet = new Set<string>(SCHOOLS.map((s) => s.name));
const MAX_AGE = 26;

const peopleList = people as Person[];
const eventList = events as RallyEvent[];
const recList = recommendations as Recommendation[];

// People
const personIds = new Set<string>();
for (const p of peopleList) {
  if (personIds.has(p.id)) fail(`duplicate person id ${p.id}`);
  personIds.add(p.id);
  if (p.interests.length < 4) fail(`${p.id} has fewer than 4 interests`);
  for (const t of p.interests) if (!tagSet.has(t)) fail(`${p.id} has unknown interest ${t}`);
  if (new Set(p.interests).size !== p.interests.length) fail(`${p.id} has duplicate interests`);
  if (!existsSync(path.join("public", p.avatar))) fail(`${p.id} avatar missing: ${p.avatar}`);
  if (p.availability.length === 0) fail(`${p.id} has no availability`);
  if (!schoolSet.has(p.school)) fail(`${p.id} unknown school ${p.school}`);
  if (!p.major.trim()) fail(`${p.id} has no major`);
  if (p.learned.length !== 3) fail(`${p.id} needs exactly 3 learned facts`);
  for (const l of p.learned) {
    if (l.text.split(" ").length > 8) fail(`${p.id} learned fact too long for the card: "${l.text}"`);
    if (!categorySet.has(l.category)) fail(`${p.id} learned fact has unknown category ${l.category}`);
  }
  if (p.age > MAX_AGE) fail(`${p.id} is ${p.age}; this cohort is students and recent grads`);
  if (p.situation === "international_student" && !p.homeCountry) fail(`${p.id} international without homeCountry`);
  if (p.studentStatus === "recent_grad" && p.classYear > 2026) fail(`${p.id} recent grad with future classYear`);
  if (p.studentStatus !== "recent_grad" && p.classYear < 2026) fail(`${p.id} current student with past classYear`);
}

// Events
const eventIds = new Set<string>();
for (const e of eventList) {
  if (eventIds.has(e.id)) fail(`duplicate event id ${e.id}`);
  eventIds.add(e.id);
  if (!categorySet.has(e.category)) fail(`${e.id} unknown category ${e.category}`);
  if (e.tags.length === 0) fail(`${e.id} has no tags`);
  for (const t of e.tags) if (!tagSet.has(t)) fail(`${e.id} has unknown tag ${t}`);
  const day = e.start.slice(0, 10);
  if (day < WINDOW_START || day >= WINDOW_END) fail(`${e.id} outside date window: ${e.start}`);
  if (Number.isNaN(Date.parse(e.start)) || Number.isNaN(Date.parse(e.end))) fail(`${e.id} has unparsable dates`);
  if (Date.parse(e.end) <= Date.parse(e.start)) fail(`${e.id} ends before it starts`);
  if (e.price.type === "paid" && !(e.price.amount && e.price.amount > 0)) fail(`${e.id} paid without amount`);
  if (e.price.studentAmount !== undefined && e.price.type === "paid" && e.price.studentAmount >= (e.price.amount ?? 0)) {
    fail(`${e.id} student price is not a discount`);
  }
  if (e.campus && !schoolSet.has(e.campus)) fail(`${e.id} unknown campus ${e.campus}`);
}
if (eventList.filter((e) => e.campus).length < 15) fail("fewer than 15 campus-hosted events");

// Recommendations
const recsByPerson = new Map<string, Recommendation[]>();
const peopleByEvent = new Map<string, Set<string>>();
const seenPairs = new Set<string>();
for (const r of recList) {
  if (!personIds.has(r.personId)) fail(`rec references unknown person ${r.personId}`);
  if (!eventIds.has(r.eventId)) fail(`rec references unknown event ${r.eventId}`);
  const key = `${r.personId}:${r.eventId}`;
  if (seenPairs.has(key)) fail(`duplicate rec ${key}`);
  seenPairs.add(key);
  if (r.score < 0 || r.score > 100) fail(`${key} score out of range`);
  if (r.meetPeopleScore < 0 || r.meetPeopleScore > 100) fail(`${key} meetPeopleScore out of range`);
  if (r.reasons.length < 2 || r.reasons.length > 3) fail(`${key} needs 2-3 reasons`);
  if (!recsByPerson.has(r.personId)) recsByPerson.set(r.personId, []);
  recsByPerson.get(r.personId)!.push(r);
  if (!peopleByEvent.has(r.eventId)) peopleByEvent.set(r.eventId, new Set());
  peopleByEvent.get(r.eventId)!.add(r.personId);
}

for (const p of peopleList) {
  const recs = recsByPerson.get(p.id) ?? [];
  if (recs.length < MIN_RECS || recs.length > MAX_RECS) {
    fail(`${p.id} has ${recs.length} recs (want ${MIN_RECS}-${MAX_RECS})`);
  }
  const best = recs.filter((r) => r.isBestBet);
  if (best.length !== 1) {
    fail(`${p.id} has ${best.length} best bets (want exactly 1)`);
    continue;
  }
  const others = (peopleByEvent.get(best[0].eventId)?.size ?? 1) - 1;
  if (others < 2) fail(`${p.id} best bet ${best[0].eventId} is shared with only ${others} other people`);

  // every recommended event should share at least one interest tag
  const interests = new Set<string>(p.interests);
  for (const r of recs) {
    const e = eventList.find((x) => x.id === r.eventId)!;
    const overlap = e.tags.some((t) => interests.has(t));
    const newcomerMixer = e.title.startsWith("New to Hartford");
    const ownCampus = e.campus === p.school;
    if (!overlap && !newcomerMixer && !ownCampus) fail(`${p.id} -> ${e.id} shares no interest tags`);
  }
}

if (errors.length) {
  console.error(`Validation failed with ${errors.length} error(s):`);
  for (const e of errors) console.error(`  - ${e}`);
  process.exit(1);
}

console.log(
  `OK: ${peopleList.length} people, ${eventList.length} events, ${recList.length} recommendations, ` +
    `${recList.filter((r) => r.isBestBet).length} best bets.`,
);
