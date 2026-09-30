import type { EventCategory, InterestTag } from "@/data/interests";
import type { SchoolName } from "@/data/schools";

export type { EventCategory, InterestTag, SchoolName };

export interface Coords {
  lat: number;
  lng: number;
}

export type Situation = "student" | "international_student" | "recent_grad";

export type StudentStatus = "undergrad" | "grad_student" | "recent_grad";

export type WorkMode = "remote" | "hybrid" | "in_office";

export type Availability =
  | "weekday_evening"
  | "weekend_day"
  | "weekend_evening";

export interface Person {
  id: string;
  name: string;
  age: number;
  /** Path under /public, e.g. "/avatars/p01.jpg" */
  avatar: string;
  /** One-line hook shown under the name. */
  headline: string;
  situation: Situation;
  /** Where they came from before Hartford (city, or city + country for internationals). */
  movedFrom?: string;
  /** Set for international students. */
  homeCountry?: string;
  monthsInCity: number;
  school: SchoolName;
  major: string;
  /** Expected (or actual) graduation year. */
  classYear: number;
  studentStatus: StudentStatus;
  /** Job or campus role, e.g. "Barista at Story and Soil" or "Teaching assistant". */
  occupation: string;
  workMode: WorkMode;
  location: {
    neighborhood: string;
    city: string;
    coords: Coords;
    /** How far they are realistically willing to travel for a weeknight thing. */
    radiusMiles: number;
  };
  /**
   * Three plain-language things Rally learned in the intake conversation,
   * e.g. "Runs on the treadmill before class", each tied to the event
   * category it points at so the profile card can echo the bubble colors.
   */
  learned: { text: string; category: EventCategory }[];
  /** Controlled vocabulary; drives matching. */
  interests: InterestTag[];
  /** Free text; drives the profile card. */
  hobbies: string[];
  /** What they are hoping to find, e.g. "running buddies". */
  lookingFor: string[];
  availability: Availability[];
  vibe: {
    groupSize: "small" | "medium" | "large";
    energy: "chill" | "active" | "high";
  };
  bio: string;
}

export type SocialFormat =
  | "structured_meetup"
  | "class"
  | "drop_in"
  | "performance"
  | "outdoor"
  | "volunteer";

export interface RallyEvent {
  id: string;
  title: string;
  description: string;
  category: EventCategory;
  tags: InterestTag[];
  /** ISO 8601 with offset. */
  start: string;
  end: string;
  venue: {
    name: string;
    address: string;
    neighborhood: string;
    coords: Coords;
  };
  price: {
    type: "free" | "paid";
    amount?: number;
    /** Discounted price with a student ID, when offered. */
    studentAmount?: number;
  };
  /** Set when a school hosts the event (open to that campus or to all students). */
  campus?: SchoolName;
  expectedAttendance: "small" | "medium" | "large";
  socialFormat: SocialFormat;
  /** Where this event was scraped or aggregated from. */
  source: {
    name: string;
    url: string;
  };
}

export interface Recommendation {
  personId: string;
  eventId: string;
  /** 0-100 overall fit. */
  score: number;
  /** 0-100 how good this event is for actually meeting people. */
  meetPeopleScore: number;
  /** 2-3 short phrases shown in the detail view. */
  reasons: string[];
  /** Exactly one per person; gets the glow on stage. */
  isBestBet: boolean;
}
