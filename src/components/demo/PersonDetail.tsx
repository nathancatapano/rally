/* eslint-disable @next/next/no-img-element */
import { CATEGORY_COLORS, INTEREST_CATEGORY, INTEREST_LABELS } from "@/data/interests";
import type { Person } from "@/lib/types";

/**
 * Deliberately sparse and large: the point on stage is that Rally interviewed
 * this person and now knows a few concrete things about them. The interest
 * chips are colored by event category, matching the bubbles on the right.
 *
 * All sizes are container-query units (cqw) so the card scales as one piece
 * with the stage and never crops, whatever the screen.
 */
export function PersonDetail({ person }: { person: Person }) {
  return (
    <div className="flex h-full w-full flex-col gap-[4.5cqw] p-[5.8cqw] text-left text-foreground">
      <div className="flex items-center gap-[3.5cqw]">
        <img
          src={person.avatar}
          alt=""
          className="size-[15.5cqw] shrink-0 rounded-full object-cover ring-2 ring-white/20"
          draggable={false}
        />
        <div className="min-w-0">
          <h2 className="text-[5.8cqw] font-semibold leading-tight tracking-tight">{person.name}</h2>
          <p className="mt-[0.6cqw] text-[4.2cqw] leading-snug text-foreground/90">{person.school}</p>
          <p className="text-[3.8cqw] leading-snug text-muted-foreground">{person.major}</p>
        </div>
      </div>

      <div className="flex flex-wrap gap-[1.3cqw]">
        {person.interests.map((t) => {
          const color = CATEGORY_COLORS[INTEREST_CATEGORY[t]];
          return (
            <span
              key={t}
              className="rounded-full px-[2.4cqw] py-[1.15cqw] text-[3.4cqw] font-semibold leading-none text-black"
              style={{ background: color }}
            >
              {INTEREST_LABELS[t]}
            </span>
          );
        })}
      </div>

      <div>
        <div className="mb-[2cqw] text-[3.4cqw] font-semibold uppercase tracking-wider text-muted-foreground">
          Rally knows
        </div>
        <ul className="space-y-[1.9cqw]">
          {person.learned.map(({ text }) => (
            <li key={text} className="text-[5cqw] leading-snug">
              {text}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
