/* eslint-disable @next/next/no-img-element */
import { Check, CalendarCheck, Sparkles, GraduationCap } from "lucide-react";
import { CATEGORY_COLORS, INTEREST_LABELS } from "@/data/interests";
import { SCHOOL_SHORT } from "@/data/schools";
import { bestBet, profileInterests, scriptEvents, student, type Message } from "@/data/student-script";
import { eventDateParts } from "@/lib/data";
import type { RallyEvent } from "@/lib/types";

function priceLabel(e: RallyEvent) {
  if (e.price.type === "free") return "Free";
  if (e.price.studentAmount === 0) return "Free w/ student ID";
  if (e.price.studentAmount !== undefined) return `$${e.price.studentAmount} student`;
  return `$${e.price.amount}`;
}

function EventRow({ e, highlight }: { e: RallyEvent; highlight: boolean }) {
  const d = eventDateParts(e.start);
  return (
    <li className={"flex items-center gap-3 rounded-xl px-2 py-2 " + (highlight ? "bg-amber-300/15 ring-1 ring-amber-300/50" : "")}>
      <div
        className="flex size-12 shrink-0 flex-col items-center justify-center rounded-xl text-black"
        style={{ background: CATEGORY_COLORS[e.category] }}
      >
        <span className="text-lg font-bold leading-none">{d.day}</span>
        <span className="text-[10px] font-semibold uppercase leading-none">{d.month}</span>
      </div>
      <div className="min-w-0 flex-1">
        <div className="truncate text-[18px] font-medium leading-tight text-white">{e.title}</div>
        <div className="truncate text-[15px] text-white/60">
          {d.weekday} {d.time} · {priceLabel(e)}
        </div>
      </div>
      {highlight && <Sparkles className="size-4.5 shrink-0 text-amber-300" />}
    </li>
  );
}

export function MessageBubble({ message }: { message: Message }) {
  const mine = message.from === "student";
  const base = "max-w-[86%] rounded-3xl px-4.5 py-3 text-[21px] leading-snug shadow-sm";
  const side = mine ? "self-end rounded-br-md bg-[#2f7cf6] text-white" : "self-start rounded-bl-md bg-[#26262b] text-white";

  if (message.kind === "text") {
    return <div className={`${base} ${side}`}>{message.text}</div>;
  }

  if (message.kind === "photo") {
    return (
      <div className="flex max-w-[80%] flex-col items-end gap-1.5 self-end">
        <img src={message.src} alt="" className="w-56 rounded-3xl rounded-br-md object-cover shadow-md" draggable={false} />
        {message.caption && <div className="rounded-3xl rounded-br-md bg-[#2f7cf6] px-4.5 py-3 text-[21px] leading-snug text-white">{message.caption}</div>}
      </div>
    );
  }

  if (message.kind === "profile") {
    return (
      <div className="w-[88%] self-start overflow-hidden rounded-2xl rounded-bl-md bg-[#26262b] text-white shadow-sm">
        <div className="flex items-center gap-3 p-3">
          <img src={student.avatar} alt="" className="size-[72px] rounded-full object-cover ring-2 ring-white/20" draggable={false} />
          <div className="min-w-0">
            <div className="truncate text-[21px] font-semibold">{student.name}</div>
            <div className="flex items-center gap-1.5 truncate text-[15px] text-white/70">
              <GraduationCap className="size-4" />
              {SCHOOL_SHORT[student.school]} · {student.major}
            </div>
          </div>
        </div>
        <div className="flex flex-wrap gap-1.5 px-3 pb-3">
          {profileInterests.map((t) => (
            <span key={t} className="rounded-full bg-white/10 px-3 py-1.5 text-[15px] font-medium">
              {INTEREST_LABELS[t]}
            </span>
          ))}
        </div>
      </div>
    );
  }

  if (message.kind === "events") {
    return (
      <div className="flex w-[92%] flex-col gap-2 self-start">
        <div className={`${base} ${side} max-w-full`}>{message.intro}</div>
        <ul className="flex flex-col gap-0.5 rounded-2xl rounded-bl-md bg-[#26262b] p-1.5 shadow-sm">
          {scriptEvents.map((e) => (
            <EventRow key={e.id} e={e} highlight={e.id === bestBet.id} />
          ))}
        </ul>
      </div>
    );
  }

  // calendar
  const note = message.note;
  return (
    <div className="w-[88%] self-start overflow-hidden rounded-2xl rounded-bl-md bg-[#26262b] text-white shadow-sm">
      <div className="flex items-center gap-2 border-b border-white/10 px-3 py-2">
        <CalendarCheck className="size-5 text-emerald-300" />
        <span className="text-[17px] font-semibold">Added to your calendar</span>
        <span className="ml-auto text-[14px] text-white/60">{scriptEvents.length} events</span>
      </div>
      <ul className="p-2">
        {scriptEvents.map((e) => {
          const d = eventDateParts(e.start);
          return (
            <li key={e.id} className="flex items-center gap-2.5 px-1 py-1.5 text-[16px]">
              <Check className="size-4 shrink-0 text-emerald-300" />
              <span className="w-16 shrink-0 text-white/60">
                {d.month} {d.day}
              </span>
              <span className="truncate">{e.title}</span>
            </li>
          );
        })}
      </ul>
      <div className="border-t border-white/10 px-4 py-3 text-[21px]">{note}</div>
    </div>
  );
}

export function TypingIndicator() {
  return (
    <div className="flex items-center gap-1.5 self-start rounded-3xl rounded-bl-md bg-[#26262b] px-5 py-4">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="size-2.5 animate-bounce rounded-full bg-white/60"
          style={{ animationDelay: `${i * 150}ms`, animationDuration: "900ms" }}
        />
      ))}
    </div>
  );
}
