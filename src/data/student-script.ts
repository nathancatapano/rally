import { getEvent, getPerson, getPeopleForEvent, getRecommendation } from "@/lib/data";
import type { Person, RallyEvent } from "@/lib/types";

/**
 * The scripted student-side conversation for the stage demo. Nothing here is
 * live; the student's messages are sent with the Next button and Rally's
 * replies auto-play after a short typing delay.
 *
 * The student is one of the sandbox people and the events are their real
 * recommendations from the backend demo, so both halves of the demo agree.
 */

export const STUDENT_ID = "p02";
export const RALLY_NUMBER = "(860) 555-0142";

const EVENT_IDS = ["e020", "e024", "e178", "e123", "e171"];

export const student: Person = getPerson(STUDENT_ID)!;
export const scriptEvents: RallyEvent[] = EVENT_IDS.map((id) => getEvent(id)!);
export const bestBet: RallyEvent = scriptEvents.find((e) => getRecommendation(STUDENT_ID, e.id)?.isBestBet) ?? scriptEvents[1];
export const bestBetCompany: Person[] = getPeopleForEvent(bestBet.id, STUDENT_ID);
/** The interests he actually names in his message; the profile card shows these. */
export const profileInterests = student.interests.filter((t) => ["climbing", "hiking", "photography"].includes(t));

export type Message =
  | { from: "student"; kind: "text"; text: string }
  | { from: "student"; kind: "photo"; src: string; caption?: string }
  | { from: "rally"; kind: "text"; text: string; delayMs?: number }
  | { from: "rally"; kind: "profile"; delayMs?: number }
  | { from: "rally"; kind: "events"; intro: string; delayMs?: number }
  | { from: "rally"; kind: "calendar"; note: string; delayMs?: number };

const firstName = student.name.split(" ")[0];
const n = scriptEvents.length;

export const script: Message[] = [
  { from: "student", kind: "text", text: "Hi" },
  {
    from: "rally",
    kind: "text",
    text: "Hey, I'm Rally. I find events where you'll actually meet people. Send a photo and tell me what you're into.",
  },
  {
    from: "student",
    kind: "photo",
    src: student.avatar,
    caption: "Derek, grad student at UConn Hartford. Climbing, hiking, photography",
  },
  { from: "rally", kind: "profile", delayMs: 1300 },
  { from: "rally", kind: "events", intro: `${n} events this month for you:`, delayMs: 1700 },
  {
    from: "rally",
    kind: "text",
    text: `Start with ${bestBet.title} on Tuesday. ${bestBetCompany.length} other new students are going. Add all ${n} to your calendar?`,
    delayMs: 1500,
  },
  { from: "student", kind: "text", text: "Yes" },
  { from: "rally", kind: "calendar", note: `Done. See you Tuesday, ${firstName}.`, delayMs: 1200 },
];
