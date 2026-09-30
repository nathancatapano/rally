// Regenerates src/data/recommendations.json with an LLM, one call per person.
//
// Run: npm run precompute
// Needs AI_GATEWAY_API_KEY (Vercel AI Gateway) in the environment; the model
// string is routed through the gateway so any "provider/model" works.
//
// The output is committed so the demo has zero latency and no network
// dependency on stage. Re-run this whenever events.json changes.

import { writeFileSync } from "node:fs";
import { generateText, Output } from "ai";
import { z } from "zod";
import { INTEREST_TAGS } from "../src/data/interests";
import people from "../src/data/people.json";
import events from "../src/data/events.json";
import type { Person, RallyEvent, Recommendation } from "../src/lib/types";

const MODEL = process.env.RALLY_MODEL ?? "anthropic/claude-sonnet-4.5";
const MIN_RECS = 8;
const MAX_RECS = 14;

const peopleList = people as Person[];
const eventList = events as RallyEvent[];

function miles(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const R = 3958.8;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const s = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
}

/** Compact event listing so the whole catalog fits comfortably in one prompt. */
function eventCatalog(person: Person) {
  return eventList
    .map((e) => {
      const d = miles(person.location.coords, e.venue.coords).toFixed(1);
      const price =
        e.price.type === "free"
          ? "free"
          : `$${e.price.amount}${e.price.studentAmount !== undefined ? ` (students ${e.price.studentAmount === 0 ? "free" : "$" + e.price.studentAmount})` : ""}`;
      const campus = e.campus ? ` | hosted by ${e.campus}` : "";
      return `${e.id} | ${e.start.slice(0, 16)} | ${e.title} | ${e.venue.name}, ${e.venue.neighborhood} (${d} mi) | ${e.category} | tags: ${e.tags.join(",")} | ${e.socialFormat}, ${e.expectedAttendance} | ${price}${campus} | ${e.description}`;
    })
    .join("\n");
}

const schema = z.object({
  recommendations: z
    .array(
      z.object({
        eventId: z.string(),
        score: z.number().min(0).max(100).describe("Overall fit for this person"),
        meetPeopleScore: z.number().min(0).max(100).describe("How likely they actually make a friend there"),
        reasons: z.array(z.string()).min(2).max(3).describe("Short, specific, second person. Reference their profile."),
      }),
    )
    .min(MIN_RECS)
    .max(MAX_RECS),
  bestBetEventId: z.string().describe("The single event where this person is most likely to find their people"),
});

async function recommendFor(person: Person) {
  const { output } = await generateText({
    model: MODEL,
    output: Output.object({ schema }),
    system: [
      "You match college students, international students, and recent grads in Hartford, CT with local events where they are most likely to find friends.",
      `Interest tags are a controlled vocabulary: ${INTEREST_TAGS.join(", ")}.`,
      "Prefer events that overlap their top interests, fit their availability and travel radius, and have a social format where talking to strangers is natural (hosted meetups, classes, volunteer shifts, run clubs).",
      "Factor in their school and major: events hosted on their own campus are easy wins, events hosted by other schools broaden their circle, and students are price-sensitive (favor free events and student pricing). International students often want both a community from home and a way into the wider city.",
      "Performances and big drop-in crowds are fine picks but rarely the best bet.",
      `Return between ${MIN_RECS} and ${MAX_RECS} events. Only use eventIds from the catalog.`,
    ].join("\n"),
    prompt: `PERSON\n${JSON.stringify(person, null, 2)}\n\nEVENT CATALOG (id | start | title | venue (distance) | category | tags | format, size | price | description)\n${eventCatalog(person)}`,
  });
  return output;
}

async function main() {
  const validIds = new Set(eventList.map((e) => e.id));
  const all: Recommendation[] = [];

  for (const person of peopleList) {
    process.stdout.write(`${person.id} ${person.name} ... `);
    const result = await recommendFor(person);
    const recs = result.recommendations.filter((r) => validIds.has(r.eventId));
    const bestBet = validIds.has(result.bestBetEventId) && recs.some((r) => r.eventId === result.bestBetEventId)
      ? result.bestBetEventId
      : recs[0]?.eventId;
    for (const r of recs) {
      all.push({
        personId: person.id,
        eventId: r.eventId,
        score: Math.round(r.score),
        meetPeopleScore: Math.round(r.meetPeopleScore),
        reasons: r.reasons,
        isBestBet: r.eventId === bestBet,
      });
    }
    console.log(`${recs.length} recs, best bet ${bestBet}`);
  }

  writeFileSync("src/data/recommendations.json", JSON.stringify(all, null, 2) + "\n");
  console.log(`Wrote ${all.length} recommendations. Run "npm run validate" to check invariants.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
