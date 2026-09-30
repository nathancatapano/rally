import { CATEGORY_COLORS } from "@/data/interests";
import { eventDateParts } from "@/lib/data";
import type { RallyEvent } from "@/lib/types";
import { PopBurst } from "./PopBurst";

/**
 * Visual emphasis derived from props. The pop / gone lifecycle is applied
 * imperatively by PhysicsStage via the `is-popping` / `is-gone` classes.
 */
export type EventBubbleState = "idle" | "unmatched" | "matched" | "best" | "open";

export function EventBubble({
  event,
  radius,
  state,
  matchedScale,
  outerRef,
  onPointerDown,
  onClick,
}: {
  event: RallyEvent;
  radius: number;
  state: EventBubbleState;
  matchedScale: number;
  outerRef: (el: HTMLDivElement | null) => void;
  onPointerDown: (e: React.PointerEvent) => void;
  onClick: (e: React.MouseEvent) => void;
}) {
  const d = radius * 2;
  const color = CATEGORY_COLORS[event.category];
  const { day, month } = eventDateParts(event.start);
  const emphasized = state === "matched" || state === "best" || state === "open";

  return (
    <div
      ref={outerRef}
      className="rally-bubble"
      style={{
        width: d,
        height: d,
        zIndex: state === "open" ? 25 : state === "best" ? 12 : emphasized ? 10 : 1,
      }}
      onPointerDown={onPointerDown}
      onClick={onClick}
    >
      <div
        className={
          "rally-bubble-inner flex cursor-pointer flex-col items-center justify-center rounded-full font-semibold leading-none text-black shadow-md shadow-black/40 " +
          (state === "best" ? "rally-glow " : "") +
          (state === "open" ? "ring-4 ring-white " : "")
        }
        style={{
          width: d,
          height: d,
          background: color,
          scale: emphasized ? matchedScale : 1,
        }}
      >
        <span style={{ fontSize: radius * 0.78 }}>{day}</span>
        <span
          className="uppercase tracking-wide opacity-80"
          style={{ fontSize: Math.max(8, radius * 0.32), marginTop: radius * 0.06 }}
        >
          {month}
        </span>
        <PopBurst color={color} />
      </div>
    </div>
  );
}
