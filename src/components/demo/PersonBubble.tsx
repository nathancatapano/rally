/* eslint-disable @next/next/no-img-element */
import type { Person } from "@/lib/types";
import { PersonDetail } from "./PersonDetail";

export type PersonBubbleState = "idle" | "selected" | "dimmed";

export function PersonBubble({
  person,
  radius,
  state,
  cardSize,
  outerRef,
  onPointerDown,
  onClick,
}: {
  person: Person;
  radius: number;
  state: PersonBubbleState;
  cardSize: { w: number; h: number };
  outerRef: (el: HTMLDivElement | null) => void;
  onPointerDown: (e: React.PointerEvent) => void;
  onClick: (e: React.MouseEvent) => void;
}) {
  const d = radius * 2;
  const selected = state === "selected";
  const firstName = person.name.split(" ")[0];

  return (
    <div
      ref={outerRef}
      className="rally-bubble"
      style={{ width: d, height: d, zIndex: selected ? 30 : 2 }}
      onPointerDown={onPointerDown}
      onClick={onClick}
    >
      <div
        className={
          "rally-bubble-inner cursor-pointer overflow-hidden bg-card shadow-lg shadow-black/40 ring-2 " +
          (selected ? "shadow-2xl shadow-black/50 ring-white/20" : "ring-white/15 hover:ring-white/50")
        }
        style={{
          width: selected ? cardSize.w : d,
          height: selected ? cardSize.h : d,
          borderRadius: selected ? 28 : 9999,
          opacity: state === "dimmed" ? 0.45 : 1,
          filter: state === "dimmed" ? "saturate(0.6)" : "none",
          scale: state === "dimmed" ? 0.66 : 1,
        }}
      >
        <img
          src={person.avatar}
          alt={person.name}
          draggable={false}
          className="absolute inset-0 size-full object-cover transition-opacity duration-300"
          style={{ opacity: selected ? 0 : 1 }}
        />
        {!selected && (
          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent px-1 pb-1.5 pt-4 text-center text-[11px] font-semibold text-white">
            {firstName}
          </div>
        )}
        <div
          className="@container absolute inset-0 min-h-0 transition-opacity duration-500"
          style={{
            opacity: selected ? 1 : 0,
            transitionDelay: selected ? "250ms" : "0ms",
            pointerEvents: selected ? "auto" : "none",
          }}
        >
          {selected && <PersonDetail person={person} />}
        </div>
      </div>
    </div>
  );
}
