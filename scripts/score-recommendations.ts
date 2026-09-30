// Offline recommendation pass that needs no API key.
// Run: npm run score
//
// Scores every person x event pair on interest overlap (weighted toward the
// person's top interests), distance vs. their travel radius, availability,
// group-size fit, campus affinity, and student pricing; keeps 8-14 per person;
// then picks a "best bet" that at least two other people also have so the
// "people like you are going" beat always lands. Hand-picked best bets and
// their rationale live in CURATED below and override the heuristic.
//
// For fully LLM-generated recommendations use `npm run precompute` instead.

import { writeFileSync } from "node:fs";
import { INTEREST_LABELS } from "../src/data/interests";
import { SCHOOL_SHORT } from "../src/data/schools";
import people from "../src/data/people.json";
import events from "../src/data/events.json";
import type { Person, RallyEvent, Recommendation } from "../src/lib/types";

const MIN_RECS = 8;
const MAX_RECS = 14;
const KEEP_THRESHOLD = 62;

const peopleList = people as Person[];
const eventList = events as RallyEvent[];

/** Hand-picked best bets: person id -> [event title, date, reasons]. */
const CURATED: Record<string, { event: [title: string, date: string]; reasons: string[] }> = {
  p01: { event: ["Hanging Hills Run Club", "2026-10-08"], reasons: ["A run club that ends at a bar is your 'run then coffee' crew, just later in the day", "Easy 5k pace, so you can actually talk to people, and none of them are Trinity students", "Three other runners in this group are going, from UConn Hartford, UConn Law, and UHart"] },
  p02: { event: ["Central Rock Community Climb Night", "2026-10-06"], reasons: ["Staff pair you with a belay partner, which solves your Tuesday problem in one night", "Climbing is your top interest and the student rate makes it a fifteen-dollar habit", "Three other climbers here are going, one of them also an international grad student"] },
  p03: { event: ["Hog River Trivia Night", "2026-10-07"], reasons: ["Solo players get placed on a team by the host, so you walk out with teammates", "Trivia is your number one and nobody at this table is in your section", "Four other trivia people in this group are going, that is a standing team waiting to happen"] },
  p04: { event: ["HartfordHacks: Intercollegiate Hackathon", "2026-11-07"], reasons: ["Teams form at the opening ceremony and they explicitly want designers", "Twelve hours of building beats twelve happy hours for meeting people who make things", "Five engineers and builders from this group are going and none of them have a designer"] },
  p05: { event: ["Penwood Loop Hike", "2026-10-11"], reasons: ["Weekend hike with a regular group, leashed dogs welcome", "Five miles on a ridge is your kind of Saturday, and it is twenty minutes from Farmington", "Two other hikers here are going, including a CCSU senior who climbs"] },
  p06: { event: ["Latin Night at Parkville Market", "2026-10-09"], reasons: ["Live band plus a dance floor where strangers pull you in, exactly your energy", "Big loud room, which is where you make friends fastest, and it is free", "Four people from this group are going, including a Hartt bassist and two salsa regulars"] },
  p07: { event: ["West African Supper Club", "2026-10-25"], reasons: ["Sixteen seats, assigned seating, communal food: this is the dinner crew you are looking for", "You will try a cuisine you have not ranked yet", "Three other food people in this group booked seats, one of them cooks this food at home"] },
  p08: { event: ["Real Art Ways Film Club: 'Aftersun'", "2026-10-02"], reasons: ["Screening plus a facilitated discussion, so the film is the icebreaker", "Real Art Ways is where Hartford's artists actually hang out, ten minutes from campus", "Four other visual people here are going, three of them from the art school across town"] },
  p09: { event: ["Hanging Hills Run Club", "2026-10-08"], reasons: ["A run club with a taproom attached covers two of your top interests at once", "Great shakeout before marathon weekend, and the regulars will know the course", "Three other runners in this group are going, one is a Trinity senior who does long runs"] },
  p10: { event: ["Hog River Trivia Night", "2026-10-07"], reasons: ["Trivia is your top interest and this is the biggest game in the city", "Solo players get put on a team, which is how a weekly team starts", "Four other trivia people here are going, you would be the ringer"] },
  p11: { event: ["Hartford AI Builders", "2026-10-07"], reasons: ["Twelve people with laptops open showing what they built, the ML crowd you assumed did not exist here", "Small room, hands-on, no small talk required", "Four other engineers and founders from this group are going, including another UHart student"] },
  p12: { event: ["Latin Night at Parkville Market", "2026-10-09"], reasons: ["Live band, dance floor, rooftop, this is the loud room you have been looking for", "Free, Friday, and fifteen minutes from Elmwood", "Four people from this group are going, including two who will absolutely dance with you"] },
  p13: { event: ["West African Supper Club", "2026-10-25"], reasons: ["Small communal table hosted by a cook who takes food as seriously as you do", "Assigned seating means you meet all sixteen people, not just your side of the table", "Three other serious eaters in this group booked seats, one is an MPH student who cooks this"] },
  p14: { event: ["Ragged Mountain Traverse", "2026-11-08"], reasons: ["Traprock cliffs with hands-on scrambling, hiking and climbing in one trip", "Small experienced group, your pace, your age", "Two other climbers in this group are going, one is a grad student near your campus"] },
  p15: { event: ["Hartford Design Meetup", "2026-10-21"], reasons: ["Working designers from the studios and the insurers in one room, with portfolio walk-arounds", "Two blocks from the buildings you photograph, and the crowd will want to hear about them", "Six other designers and makers in this group are going, four of them from your own school"] },
  p16: { event: ["KNOX Garden Workday", "2026-10-04"], reasons: ["Community gardens across Broad Street, literally your interest list turned into a Saturday morning", "Working side by side is how volunteers become friends", "Two other volunteers from this group signed up, both from other schools"] },
  p17: { event: ["Hartford Track Club Tuesday Night Run", "2026-10-06"], reasons: ["Pace groups from 7:00 to 11:00, so you find your speed and your people at once", "Regulars go to Tisane after, which is the network you actually want", "Three other runners in this group are going, none of them law students"] },
  p18: { event: ["Noah Webster Book Club: 'James'", "2026-10-06"], reasons: ["Twelve chairs, everyone read the book, a five-minute walk from your apartment", "A monthly fixed date is the fastest route to a real friend group", "Two other readers in this group are going, one of them also does trivia"] },
  p19: { event: ["Startup Grind Hartford: Fireside Chat", "2026-10-28"], reasons: ["Founder CEO interview then structured networking, the operators you want in one room", "Ten dollars and ten minutes from your apartment", "Three other founders and engineers in this group are going, one of them from your program"] },
  p20: { event: ["Open Blues Jam", "2026-10-01"], reasons: ["Sign the list and play; bassists are always needed, so you will get called up", "The house band knows every musician in Hartford who is not at Hartt", "Two other music people in this group are going, one is a Hartt producer looking for players"] },
  p21: { event: ["Hog River Trivia Night", "2026-10-07"], reasons: ["Trivia in a brewery you already love, but this time with a team", "Solo players get placed on a team by the host", "Four other trivia people in this group are going, none of them your roommates"] },
  p22: { event: ["Hartford Track Club Tuesday Night Run", "2026-10-06"], reasons: ["Real pace groups, so a fast run is on the table", "The biggest weekly run in the city is how you replace forty Charlotte friends", "Three other runners from this group are going"] },
  p23: { event: ["Real Art Ways Film Club: 'Aftersun'", "2026-10-02"], reasons: ["Screening and discussion in Hartford's art hub, a ten-minute ride from downtown", "Small room with a facilitator, easy for a new person", "Four other visual and film people in this group are going, including an exchange student from Berlin"] },
  p24: { event: ["Habitat Build Day", "2026-10-10"], reasons: ["Structured, physical, mission-driven: a unit for a day", "Volunteer crews skew toward vets and people your age, not nineteen-year-olds", "Two other volunteers in this group are going, one is also new in town"] },
  p25: { event: ["Elizabeth Park Dog Walk Meetup", "2026-10-03"], reasons: ["Twenty dogs, twenty people, one loop of your own park, coffee after", "Dog people talk to strangers by default", "Three other dog and hiking people in this group are going"] },
  p26: { event: ["Capital CC Board Game Cafe Night", "2026-10-20"], reasons: ["A student game night downtown that is not on your campus, so nobody goes home at nine", "Free, a library of games, and a Smash setup in the corner", "Two other board game people in this group are going, one of them runs the club"] },
  p27: { event: ["Hartford Tech Meetup: Applied AI Night", "2026-10-13"], reasons: ["Talks on shipping LLM features in insurance, which is your day job and your side project", "The long hallway track is where co-founders get found", "Three other AI and startup people in this group are going, including two grad students"] },
  p28: { event: ["Monday Night Jazz", "2026-10-05"], reasons: ["A weekly jazz room with a bar you can sit at, your kind of night, and not a Hartt recital", "The house trio and the regulars know every musician in the city", "Three other music people in this group are going, including a bassist from your school"] },
  p29: { event: ["West African Supper Club", "2026-10-25"], reasons: ["Thieboudienne at a communal table for sixteen, cooked by someone else for once", "Assigned seating so you meet everyone, and the host runs a food rescue program", "Three other food people from this group booked seats"] },
  p30: { event: ["Letterpress Open Studio", "2026-11-14"], reasons: ["Four hours making something with your hands next to makers who are not students", "Small class, calm pace, a Saturday afternoon", "Four other artists and designers in this group are going"] },
};

/** Force these (person, event) pairs into the list even if the heuristic missed them. */
const FORCE_INCLUDE: [personId: string, title: string, date: string][] = [
  ["p16", "Colt Park Pickup Soccer", "2026-10-03"],
  ["p20", "Colt Park Pickup Soccer", "2026-10-03"],
  ["p14", "Central Rock Community Climb Night", "2026-10-06"],
  ["p11", "Central Rock Community Climb Night", "2026-10-06"],
  ["p26", "Central Rock Community Climb Night", "2026-10-06"],
  ["p03", "Noah Webster Book Club: 'James'", "2026-10-06"],
  ["p14", "Penwood Loop Hike", "2026-10-11"],
  ["p29", "KNOX Garden Workday", "2026-10-04"],
  ["p16", "Habitat Build Day", "2026-10-10"],
];

function miles(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const R = 3958.8;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const s = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
}

type Slot = "weekday_evening" | "weekday_day" | "weekend_day" | "weekend_evening";
function slot(e: RallyEvent): Slot {
  const hour = Number(e.start.slice(11, 13));
  const day = new Date(e.start.slice(0, 10) + "T12:00:00Z").getUTCDay();
  const weekend = day === 0 || day === 6;
  if (weekend) return hour < 17 ? "weekend_day" : "weekend_evening";
  return hour >= 17 ? "weekday_evening" : "weekday_day";
}

const FORMAT_MEET: Record<RallyEvent["socialFormat"], number> = {
  structured_meetup: 92, class: 85, volunteer: 82, drop_in: 65, outdoor: 70, performance: 45,
};

type Scored = {
  score: number;
  meet: number;
  matched: string[];
  dist: number;
  slot: Slot;
  sameCampus: boolean;
  studentPerk: "free" | "discount" | null;
};

function effectivePrice(p: Person, e: RallyEvent) {
  if (e.price.type === "free") return 0;
  if (p.studentStatus !== "recent_grad" && e.price.studentAmount !== undefined) return e.price.studentAmount;
  return e.price.amount ?? 0;
}

function score(p: Person, e: RallyEvent): Scored | null {
  let overlap = 0;
  const matched: string[] = [];
  p.interests.forEach((tag, idx) => {
    if (e.tags.includes(tag)) {
      overlap += idx === 0 ? 1.8 : idx === 1 ? 1.4 : 1;
      matched.push(tag);
    }
  });
  const isStudent = p.studentStatus !== "recent_grad";
  const sameCampus = e.campus !== undefined && e.campus === p.school;
  const newcomerEvent = e.title.startsWith("New to Hartford") && p.monthsInCity <= 8;
  // Campus-hosted social events count for students of that school even without a tag overlap.
  const campusSocial =
    sameCampus &&
    ["social", "community", "food_drink"].includes(e.category) &&
    (!e.tags.includes("international") || p.situation === "international_student");
  if (matched.length === 0 && !newcomerEvent && !campusSocial) return null;
  if (matched.length === 0) overlap = 1;

  const dist = miles(p.location.coords, e.venue.coords);
  const distPenalty = dist <= 2 ? 0 : dist <= p.location.radiusMiles ? (dist / p.location.radiusMiles) * 10 : 10 + (dist - p.location.radiusMiles) * 6;

  const s = slot(e);
  const availOk = (p.availability as string[]).includes(s);
  const availPenalty = availOk ? 0 : s === "weekday_day" ? 22 : 12;

  const sizeFit = e.expectedAttendance === p.vibe.groupSize ? 4 : p.vibe.groupSize === "small" && e.expectedAttendance === "large" ? -6 : 0;
  const energyFit = (p.vibe.energy === "high" && ["performance", "drop_in"].includes(e.socialFormat)) || (p.vibe.energy === "chill" && e.socialFormat === "structured_meetup") ? 3 : 0;

  // School and student factors.
  const campusBonus = sameCampus ? 10 : e.campus && isStudent ? 4 : 0;
  const price = effectivePrice(p, e);
  const studentPerk: Scored["studentPerk"] =
    isStudent && e.price.type === "paid" && e.price.studentAmount !== undefined ? (e.price.studentAmount === 0 ? "free" : "discount") : null;
  const pricePenalty = isStudent ? (price > 40 ? 12 : price > 25 ? 6 : 0) : price > 60 ? 6 : 0;
  const perkBonus = studentPerk ? 3 : 0;
  const newcomerBonus = newcomerEvent ? 18 : 0;

  const base = 42 + Math.min(overlap, 3) * 16;
  const total = base - distPenalty - availPenalty - pricePenalty + sizeFit + energyFit + campusBonus + perkBonus + newcomerBonus;

  const meet = Math.round(
    Math.min(
      100,
      FORMAT_MEET[e.socialFormat] +
        (e.expectedAttendance === "medium" ? 4 : 0) +
        (matched.length >= 2 ? 4 : 0) +
        (e.campus && isStudent ? 4 : 0) -
        (dist > p.location.radiusMiles ? 8 : 0),
    ),
  );

  return { score: Math.round(Math.max(0, Math.min(100, total))), meet, matched, dist, slot: s, sameCampus, studentPerk };
}

function reasons(p: Person, e: RallyEvent, r: Scored): string[] {
  const out: string[] = [];
  const labels = r.matched.map((t) => INTEREST_LABELS[t as keyof typeof INTEREST_LABELS].toLowerCase());
  if (labels.length === 0 && e.campus === p.school) out.push(`Hosted by ${SCHOOL_SHORT[p.school]}, so the room is already half familiar`);
  else if (labels.length === 0) out.push("Made for people who moved here in the last year, like you");
  else if (labels.length === 1) out.push(`Built around ${labels[0]}, one of your interests`);
  else if (labels.length === 2) out.push(`Hits two of your interests: ${labels[0]} and ${labels[1]}`);
  else out.push(`Hits ${labels.slice(0, -1).join(", ")} and ${labels.at(-1)}`);

  if (r.sameCampus && labels.length > 0) out.push(`On your campus at ${SCHOOL_SHORT[p.school]}, no travel and a familiar crowd`);
  else if (e.campus && p.studentStatus !== "recent_grad") out.push(`Student crowd from ${SCHOOL_SHORT[e.campus]}, open to you with an ID`);
  else if (r.studentPerk === "free") out.push("Free with your student ID");
  else if (r.studentPerk === "discount") out.push(`Student price, $${e.price.studentAmount}`);
  else if (r.dist < 1) out.push(`Under a mile from you in ${p.location.neighborhood}`);
  else if (r.dist <= p.location.radiusMiles) out.push(`${r.dist.toFixed(1)} mi from ${p.location.neighborhood}, inside your range`);
  else out.push(`${r.dist.toFixed(0)} mi away, a bit of a trek but worth it`);

  out.push(
    {
      structured_meetup: "Hosted format, so you will not be standing alone",
      class: "Class format, everyone is a beginner together",
      volunteer: "Working side by side is the easiest way to talk to strangers",
      drop_in: "Casual drop-in, come and go as you like",
      outdoor: "Outdoors and moving, conversation comes naturally",
      performance: "Good show, and the crowd is your kind of people",
    }[e.socialFormat],
  );
  return out;
}

// ---- Scoring pass
const perPerson = new Map<string, { e: RallyEvent; r: Scored }[]>();
for (const p of peopleList) {
  const scored = eventList
    .map((e) => ({ e, r: score(p, e) }))
    .filter((x): x is { e: RallyEvent; r: Scored } => x.r !== null)
    .sort((a, b) => b.r.score - a.r.score);
  perPerson.set(p.id, scored.filter((x, i) => i < MIN_RECS || (i < MAX_RECS && x.r.score >= KEEP_THRESHOLD)));
}

const eventPeople = new Map<string, Set<string>>();
const indexEvent = (eid: string, pid: string) => (eventPeople.get(eid) ?? eventPeople.set(eid, new Set()).get(eid)!).add(pid);
for (const [pid, list] of perPerson) for (const { e } of list) indexEvent(e.id, pid);

const findEvent = (title: string, date: string) => {
  const e = eventList.find((x) => x.title === title && x.start.startsWith(date));
  if (!e) throw new Error(`event not found: ${title} ${date}`);
  return e;
};
const ensureInList = (p: Person, e: RallyEvent) => {
  const list = perPerson.get(p.id)!;
  if (list.some((x) => x.e.id === e.id)) return;
  const r = score(p, e);
  if (!r) throw new Error(`no interest match for ${p.id} at ${e.title}`);
  if (list.length >= MAX_RECS) {
    list.sort((a, b) => b.r.score - a.r.score);
    const dropped = list.pop()!;
    eventPeople.get(dropped.e.id)?.delete(p.id);
  }
  list.push({ e, r });
  indexEvent(e.id, p.id);
};
for (const [pid, title, date] of FORCE_INCLUDE) ensureInList(peopleList.find((p) => p.id === pid)!, findEvent(title, date));

// ---- Best bets
const bestBets: Record<string, string> = {};
const bestBetReasons: Record<string, string[]> = {};
for (const p of peopleList) {
  const cur = CURATED[p.id];
  if (cur) {
    const e = findEvent(...cur.event);
    ensureInList(p, e);
    bestBets[p.id] = e.id;
    bestBetReasons[p.id] = cur.reasons;
    continue;
  }
  const list = perPerson.get(p.id)!;
  const blend = (x: { e: RallyEvent; r: Scored }) => {
    const primary = x.r.matched.includes(p.interests[0]) ? 14 : x.r.matched.includes(p.interests[1]) ? 8 : 0;
    const inRange = x.r.dist <= p.location.radiusMiles ? 0 : -20;
    const avail = (p.availability as string[]).includes(x.r.slot) ? 0 : -15;
    return x.r.score * 0.5 + x.r.meet * 0.35 + primary + inRange + avail;
  };
  const ranked = [...list].filter((x) => !x.e.title.startsWith("New to Hartford")).sort((a, b) => blend(b) - blend(a));
  const shared = ranked.find((x) => (eventPeople.get(x.e.id)?.size ?? 0) >= 3);
  if (!shared) console.warn(`No shared best bet for ${p.id} ${p.name}; using top pick`);
  bestBets[p.id] = (shared ?? ranked[0]).e.id;
}

// ---- Output
const all: Recommendation[] = [];
for (const p of peopleList) {
  const list = perPerson.get(p.id)!;
  const top = Math.max(...list.map((x) => x.r.score));
  for (const { e, r } of list) {
    const isBest = bestBets[p.id] === e.id;
    all.push({
      personId: p.id,
      eventId: e.id,
      score: isBest ? Math.min(99, Math.max(r.score, top + 2)) : r.score,
      meetPeopleScore: r.meet,
      reasons: isBest && bestBetReasons[p.id] ? bestBetReasons[p.id] : reasons(p, e, r),
      isBestBet: isBest,
    });
  }
}
writeFileSync("src/data/recommendations.json", JSON.stringify(all, null, 2) + "\n");

for (const p of peopleList) {
  const list = perPerson.get(p.id)!;
  const bb = eventList.find((e) => e.id === bestBets[p.id])!;
  const others = [...(eventPeople.get(bb.id) ?? [])].filter((x) => x !== p.id).map((id) => peopleList.find((q) => q.id === id)!.name.split(" ")[0]);
  console.log(`${p.id} ${p.name.padEnd(17)} n=${String(list.length).padStart(2)}  best: ${bb.title} (${bb.start.slice(0, 10)}) with ${others.join(", ")}`);
}
console.log(`Wrote ${all.length} recommendations. Run "npm run validate" to check invariants.`);
