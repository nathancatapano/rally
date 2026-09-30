import type { Coords } from "@/lib/types";

/** Hartford-area schools that people belong to and that host campus events. */
export const SCHOOLS = [
  { name: "Trinity College", short: "Trinity", coords: { lat: 41.7476, lng: -72.6906 } },
  { name: "UConn Hartford", short: "UConn Hartford", coords: { lat: 41.7645, lng: -72.672 } },
  { name: "UConn School of Law", short: "UConn Law", coords: { lat: 41.7712, lng: -72.7133 } },
  { name: "UConn Health", short: "UConn Health", coords: { lat: 41.7256, lng: -72.7947 } },
  { name: "University of Hartford", short: "UHart", coords: { lat: 41.7996, lng: -72.714 } },
  { name: "University of Saint Joseph", short: "USJ", coords: { lat: 41.777, lng: -72.73 } },
  { name: "Capital Community College", short: "Capital CC", coords: { lat: 41.7684, lng: -72.6727 } },
  { name: "Central Connecticut State University", short: "CCSU", coords: { lat: 41.689, lng: -72.7717 } },
  { name: "Manchester Community College", short: "MCC", coords: { lat: 41.7601, lng: -72.5514 } },
] as const satisfies readonly { name: string; short: string; coords: Coords }[];

export type SchoolName = (typeof SCHOOLS)[number]["name"];

export const SCHOOL_SHORT: Record<SchoolName, string> = Object.fromEntries(
  SCHOOLS.map((s) => [s.name, s.short]),
) as Record<SchoolName, string>;
