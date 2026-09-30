"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronRight, RotateCcw, MessageCircle } from "lucide-react";
import { DemoNav } from "@/components/DemoNav";
import { RALLY_NUMBER, script } from "@/data/student-script";
import { MessageBubble, TypingIndicator } from "./MessageBubble";

const DEFAULT_DELAY = 1100;

export function StudentDemo() {
  // Number of script messages currently shown.
  const [shown, setShown] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);

  const next = script[shown];
  const finished = shown >= script.length;
  // Rally "types" whenever the next unsent message is one of its replies.
  const typing = !finished && next.from === "rally";
  const canAdvance = !finished && next.from === "student";

  // Rally's replies auto-play, one after another, after a typing delay.
  useEffect(() => {
    if (!typing) return;
    const t = window.setTimeout(() => setShown((n) => n + 1), next.delayMs ?? DEFAULT_DELAY);
    return () => window.clearTimeout(t);
  }, [shown, typing, next]);

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  }, [shown, typing]);

  const advance = useCallback(() => {
    if (!canAdvance) return;
    setShown((n) => n + 1);
  }, [canAdvance]);

  const restart = useCallback(() => setShown(0), []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight" || e.key === " " || e.key === "Enter") {
        e.preventDefault();
        advance();
      }
      if (e.key.toLowerCase() === "r") restart();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [advance, restart]);

  const nextLabel = finished
    ? "End of demo"
    : typing
      ? "Rally is typing"
      : next.kind === "photo"
        ? "Send photo"
        : shown === 0
          ? `Text "Hi"`
          : `Send: "${next.kind === "text" ? truncate(next.text, 28) : ""}"`;

  return (
    <div className="flex h-dvh flex-col bg-background text-foreground">
      <header className="flex h-20 shrink-0 items-center gap-8 border-b border-white/10 px-8">
        <div className="flex shrink-0 items-center gap-5">
          <h1 className="text-2xl font-semibold tracking-tight">Rally</h1>
          <DemoNav />
        </div>
        <div className="ml-auto flex shrink-0 items-center gap-2">
          <button
            onClick={restart}
            className="inline-flex items-center gap-2 rounded-full border border-white/15 px-4 py-1.5 text-xl font-medium text-muted-foreground transition hover:bg-white/10 hover:text-foreground"
          >
            <RotateCcw className="size-4" /> Restart
          </button>
          <button
            onClick={advance}
            disabled={!canAdvance}
            className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-1.5 text-xl font-semibold text-black transition disabled:cursor-not-allowed disabled:opacity-40"
          >
            {nextLabel} <ChevronRight className="size-5" />
          </button>
        </div>
      </header>

      <div className="grid min-h-0 flex-1 grid-cols-[1fr_auto_1fr] items-center gap-12 px-10">
        {/* Scene: where the student found the number */}
        <div className="flex justify-end">
          <ShuttlePoster active={shown === 0} />
        </div>

        {/* Phone */}
        <div className="relative h-[min(940px,calc(100dvh-6rem))] w-[480px] rounded-[56px] bg-black p-3 shadow-[0_0_0_2px_#3a3a3f,0_40px_120px_-30px_rgba(0,0,0,0.9)]">
          <div className="flex h-full flex-col overflow-hidden rounded-[40px] bg-[#0b0b0d]">
            <div className="relative shrink-0 border-b border-white/10 bg-[#141416]/95 px-4 pb-3 pt-3 backdrop-blur">
              <div className="mx-auto mb-2 h-6 w-28 rounded-full bg-black" />
              <div className="flex items-center gap-3">
                <div className="grid size-12 place-items-center rounded-full bg-gradient-to-br from-amber-300 to-orange-500 text-lg font-black text-black">
                  R
                </div>
                <div className="text-[26px] font-semibold leading-none">Rally</div>
                <div className="ml-auto text-[20px] leading-none text-white/70">{RALLY_NUMBER}</div>
              </div>
            </div>

            <div ref={scrollRef} className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto px-4 py-5">
              {shown === 0 && !typing && (
                <div className="m-auto flex flex-col items-center gap-2 text-center text-[17px] text-white/40">
                  <MessageCircle className="size-8" />
                  <span>
                    New conversation with
                    <br />
                    <span className="text-white/70">{RALLY_NUMBER}</span>
                  </span>
                </div>
              )}
              {script.slice(0, shown).map((m, i) => (
                <div key={i} className="flex flex-col rally-msg-in">
                  <MessageBubble message={m} />
                </div>
              ))}
              {typing && <TypingIndicator />}
            </div>

            <div className="shrink-0 border-t border-white/10 px-3 pb-6 pt-2">
              <div className="flex items-center gap-2">
                <div className="flex h-11 flex-1 items-center truncate rounded-full border border-white/15 px-4 text-[17px] text-white/35">
                  {!finished && next.from === "student" && next.kind === "text" ? next.text : "iMessage"}
                </div>
                <button
                  onClick={advance}
                  disabled={!canAdvance}
                  aria-label="Send"
                  className="grid size-11 place-items-center rounded-full bg-[#2f7cf6] text-white disabled:opacity-30"
                >
                  <ChevronRight className="size-5" />
                </button>
              </div>
            </div>
          </div>
        </div>

        <div />
      </div>
    </div>
  );
}

function ShuttlePoster({ active }: { active: boolean }) {
  return (
    <div
      className={
        "w-[360px] rounded-3xl bg-gradient-to-br from-amber-300 via-orange-400 to-rose-500 p-6 text-black transition-all duration-700 " +
        (active ? "opacity-100 shadow-[0_0_60px_-10px_rgba(251,191,36,0.35)]" : "scale-95 opacity-50")
      }
    >
      <div className="text-xs font-bold uppercase tracking-[0.2em]">Rally</div>
      <h2 className="mt-3 text-4xl font-black leading-[0.95] tracking-tight">
        New here?
        <br />
        Find your people.
      </h2>
      <div className="mt-6 rounded-2xl bg-black px-4 py-3 text-white">
        <div className="text-[11px] font-semibold uppercase tracking-wider text-white/60">Text this number</div>
        <div className="text-2xl font-bold tracking-tight">{RALLY_NUMBER}</div>
        <div className="text-xs text-white/60">Say hi</div>
      </div>
    </div>
  );
}

function truncate(s: string, n: number) {
  return s.length > n ? s.slice(0, n - 1).trimEnd() + "…" : s;
}
