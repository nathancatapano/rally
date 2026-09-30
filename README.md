# Rally

Rally connects college students, international students, and recent grads
with the local events where they are most likely to find their people.

This repository is the stage demo for the primary use case: pick a person,
see the events they would go to, and who else like them is going. It runs
entirely from checked-in JSON, so there is nothing to configure and no network
dependency on stage.

## Run locally

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) on a 16:9 display.

## Demo flow

1. Left side: 30 sandbox students and recent grads from nine Hartford-area
   schools (Trinity, UConn Hartford, UConn Law, UConn Health, UHart and the
   Hartt School, USJ, Capital CC, CCSU, MCC), about a third of them
   international. Right side: 195 events (Oct 1 to Nov 15, 2026) at real
   Hartford venues, 30 of them hosted on a campus. Both sides are draggable.
2. Click a person. Their bubble expands into a profile card and pushes the
   others to the edge. Every event they would not care about pops; the 8 to 14
   that remain gather and grow. The glowing one is their best bet to meet
   people.
3. Click a date to see the event, why it fits this person, student pricing,
   and the other people in the group who were also matched there, with their
   school and a same-school highlight.
4. `Esc` or click empty space to reset. Arrow keys step through people.

Then switch to **Student experience** (`/student`) in the header nav: a
scripted text-message thread showing what Derek sees after texting the number
on the shuttle poster. `Space` or the right arrow sends his next message; Rally
replies on its own after a typing delay; `R` restarts. The seven events Rally
texts him are his real recommendations from the backend demo. The script lives
in `src/data/student-script.ts`.

## Data model

Types live in `src/lib/types.ts`; the controlled interest vocabulary and
event categories in `src/data/interests.ts`; the school list in
`src/data/schools.ts`.

| File | What it is |
| --- | --- |
| `src/data/people.json` | 30 `Person` profiles: school, major, class year, student status, home country for internationals, location, interests (tagged), hobbies, what they are looking for, availability, vibe |
| `src/data/events.json` | 195 `RallyEvent` records: schedule, venue with coordinates, tags, price (with student pricing), hosting campus, social format, source |
| `src/data/recommendations.json` | `Recommendation` rows: person, event, score, meet-people score, reasons, best-bet flag |

`src/lib/data.ts` exposes typed loaders and helpers (`getRecsForPerson`,
`getPeopleForEvent`, `distanceMiles`).

To import real scraped events, write them to `events.json` in the `RallyEvent`
shape (tags must come from the vocabulary), then regenerate recommendations.

## Scripts

| Command | Purpose |
| --- | --- |
| `npm run validate` | Referential integrity and demo invariants (8 to 14 recs per person, one best bet each, best bets shared by 2+ people, dates in window, tags in vocabulary) |
| `npm run score` | Regenerate `recommendations.json` offline, no API key: interest overlap, distance, availability, campus affinity, student pricing, plus hand-picked best bets in the script |
| `npm run precompute` | Regenerate `recommendations.json` with an LLM through the Vercel AI Gateway. Needs `AI_GATEWAY_API_KEY`; override the model with `RALLY_MODEL` |
| `npm run avatars` | Confirms the 30 curated headshots already live in `public/avatars` |

The recommendations that ship in this repo come from `npm run score` and are
checked with `npm run validate`. Run `npm run precompute` when real events
land and you want fully LLM-written matches.

## Stack

Next.js (App Router), TypeScript, Tailwind, shadcn/ui, Matter.js for the
bubble physics, AI SDK for the offline recommendation script.
