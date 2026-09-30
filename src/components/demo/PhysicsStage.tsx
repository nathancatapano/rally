"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import Matter from "matter-js";
import type { Person, RallyEvent } from "@/lib/types";
import { PersonBubble, type PersonBubbleState } from "./PersonBubble";
import { EventBubble, type EventBubbleState } from "./EventBubble";

type Region = { x: number; y: number; w: number; h: number; cx: number; cy: number };

type Layout = {
  w: number;
  h: number;
  left: Region;
  right: Region;
  personRadius: number;
  eventRadius: number;
  expandedScale: number;
  dimmedScale: number;
  matchedScale: number;
  cardSize: { w: number; h: number };
  ringRadius: number;
};

type BodyMeta = {
  kind: "person" | "event";
  id: string;
  baseRadius: number;
  scale: number;
  targetScale: number;
  wander: number;
  inWorld: boolean;
};

const STEP_MS = 1000 / 60;
const DT2 = STEP_MS * STEP_MS;

// Accelerations in px per step^2; converted to Matter forces per body mass.
const ATTRACT_GAIN = 0.00003;
const WANDER_ACCEL = 0.0035;
const MAX_SPEED = 4.5;
const MOUSE_CATEGORY = 0x0001;
const PINNED_CATEGORY = 0x0002;
const LEFT_WALL = 0x0004;
const RIGHT_WALL = 0x0008;
// Walls of one region overlap the other, so each side only collides with its own walls.
const PERSON_MASK = MOUSE_CATEGORY | PINNED_CATEGORY | LEFT_WALL;
const EVENT_MASK = MOUSE_CATEGORY | PINNED_CATEGORY | RIGHT_WALL;

function computeLayout(w: number, h: number, nPeople: number, nEvents: number): Layout {
  const gap = 12;
  const pad = 8;
  const halfW = (w - gap) / 2;
  const left: Region = { x: pad, y: pad, w: halfW - pad * 2, h: h - pad * 2, cx: 0, cy: 0 };
  left.cx = left.x + left.w / 2;
  left.cy = left.y + left.h / 2;
  const right: Region = { x: halfW + gap + pad, y: pad, w: halfW - pad * 2, h: h - pad * 2, cx: 0, cy: 0 };
  right.cx = right.x + right.w / 2;
  right.cy = right.y + right.h / 2;

  const area = left.w * left.h;
  const personRadius = Math.round(Math.min(64, Math.max(34, Math.sqrt((area * 0.3) / (nPeople * Math.PI)))));
  const eventRadius = Math.round(Math.min(40, Math.max(18, Math.sqrt((area * 0.5) / (nEvents * Math.PI)))));

  // Fixed aspect ratio: the card's type is in container units, so the layout
  // (and line wrapping) is identical at every screen size and never crops.
  const CARD_ASPECT = 0.9;
  const cardW = Math.min(620, left.w * 0.68, (left.h * 0.62) / CARD_ASPECT);
  const cardSize = { w: Math.round(cardW), h: Math.round(cardW * CARD_ASPECT) };
  const halfDiag = Math.hypot(cardSize.w, cardSize.h) / 2;
  const expandedRadius = halfDiag;
  const expandedScale = expandedRadius / personRadius;
  const dimmedScale = 0.66;
  const matchedTarget = Math.min(eventRadius * 2.4, Math.sqrt((right.w * right.h * 0.2) / (14 * Math.PI)));
  const matchedScale = matchedTarget / eventRadius;
  // Others sit just outside the expanded card, but never past the region walls.
  const ringRadius = Math.min(
    expandedRadius + personRadius * dimmedScale + 16,
    Math.min(left.w, left.h) / 2 - personRadius * dimmedScale - 8,
  );

  return { w, h, left, right, personRadius, eventRadius, expandedScale, dimmedScale, matchedScale, cardSize, ringRadius };
}

function randomIn(region: Region, r: number) {
  return {
    x: region.x + r + Math.random() * Math.max(1, region.w - 2 * r),
    y: region.y + r + Math.random() * Math.max(1, region.h - 2 * r),
  };
}

export function PhysicsStage({
  people,
  events,
  selectedPersonId,
  matchedEventIds,
  bestBetEventId,
  openEventId,
  onSelectPerson,
  onSelectEvent,
  overlay,
}: {
  people: Person[];
  events: RallyEvent[];
  selectedPersonId: string | null;
  /** null when no person is selected (all events visible). */
  matchedEventIds: Set<string> | null;
  bestBetEventId: string | null;
  openEventId: string | null;
  onSelectPerson: (id: string | null) => void;
  onSelectEvent: (id: string | null) => void;
  /** Rendered centered in the right region (event detail card). */
  overlay?: React.ReactNode;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [layout, setLayout] = useState<Layout | null>(null);

  const outerEls = useRef(new Map<string, HTMLDivElement>());
  const bodies = useRef(new Map<string, Matter.Body>());
  const engineRef = useRef<Matter.Engine | null>(null);
  const timers = useRef<number[]>([]);
  const pointerDown = useRef<{ x: number; y: number } | null>(null);

  // Mutable view of props for the physics loop.
  const ctrl = useRef<{
    selectedPersonId: string | null;
    matchedEventIds: Set<string> | null;
    eventOpen: boolean;
    layout: Layout | null;
  }>({ selectedPersonId: null, matchedEventIds: null, eventOpen: false, layout: null });
  useLayoutEffect(() => {
    ctrl.current.selectedPersonId = selectedPersonId;
    ctrl.current.matchedEventIds = matchedEventIds;
    ctrl.current.eventOpen = openEventId !== null;
    ctrl.current.layout = layout;
  }, [selectedPersonId, matchedEventIds, openEventId, layout]);

  // Measure the container.
  useLayoutEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    let frame = 0;
    const measure = () => {
      const { width, height } = el.getBoundingClientRect();
      if (width < 200 || height < 200) return;
      setLayout((prev) =>
        prev && Math.abs(prev.w - width) < 2 && Math.abs(prev.h - height) < 2
          ? prev
          : computeLayout(width, height, people.length, events.length),
      );
    };
    measure();
    const ro = new ResizeObserver(() => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(measure);
    });
    ro.observe(el);
    return () => {
      ro.disconnect();
      cancelAnimationFrame(frame);
    };
  }, [people.length, events.length]);

  // Build the world whenever the layout changes.
  useEffect(() => {
    const el = containerRef.current;
    if (!el || !layout) return;

    const { Engine, Runner, Bodies, Body, Composite, Mouse, MouseConstraint, Events } = Matter;
    const engine = Engine.create({ gravity: { x: 0, y: 0, scale: 0 } });
    engine.positionIterations = 8;
    engine.velocityIterations = 6;
    engineRef.current = engine;
    const world = engine.world;
    const bodyMap = bodies.current;
    const elMap = outerEls.current;

    const walls = (r: Region, category: number) => {
      const t = 400;
      const wall = (x: number, y: number, w: number, h: number) =>
        Bodies.rectangle(x, y, w, h, {
          isStatic: true,
          restitution: 0.6,
          friction: 0,
          collisionFilter: { category, mask: 0xffffffff, group: 0 },
        });
      return [
        wall(r.cx, r.y - t / 2, r.w + t * 2, t),
        wall(r.cx, r.y + r.h + t / 2, r.w + t * 2, t),
        wall(r.x - t / 2, r.cy, t, r.h + t * 2),
        wall(r.x + r.w + t / 2, r.cy, t, r.h + t * 2),
      ];
    };
    Composite.add(world, [...walls(layout.left, LEFT_WALL), ...walls(layout.right, RIGHT_WALL)]);

    bodyMap.clear();
    const makeBody = (kind: BodyMeta["kind"], id: string, region: Region, r: number) => {
      const { x, y } = randomIn(region, r);
      const body = Bodies.circle(x, y, r, {
        restitution: 0.85,
        frictionAir: 0.03,
        friction: 0,
        density: 0.001,
        label: id,
        collisionFilter: {
          category: MOUSE_CATEGORY,
          mask: kind === "person" ? PERSON_MASK : EVENT_MASK,
          group: 0,
        },
      });
      const meta: BodyMeta = { kind, id, baseRadius: r, scale: 1, targetScale: 1, wander: Math.random() * Math.PI * 2, inWorld: true };
      body.plugin = meta;
      Body.setVelocity(body, { x: (Math.random() - 0.5) * 2, y: (Math.random() - 0.5) * 2 });
      bodyMap.set(id, body);
      return body;
    };
    for (const p of people) Composite.add(world, makeBody("person", p.id, layout.left, layout.personRadius));
    for (const e of events) Composite.add(world, makeBody("event", e.id, layout.right, layout.eventRadius));
    // A rebuilt world starts with every bubble visible.
    for (const el2 of elMap.values()) el2.classList.remove("is-popping", "is-gone", "rally-appear");

    const mouse = Mouse.create(el);
    const mouseConstraint = MouseConstraint.create(engine, {
      mouse,
      collisionFilter: { category: MOUSE_CATEGORY, mask: MOUSE_CATEGORY, group: 0 },
      constraint: { stiffness: 0.12, damping: 0.08, render: { visible: false } },
    });
    Composite.add(world, mouseConstraint);
    // Matter.Mouse has no destroy(); it exposes its handlers so we can detach them.
    const handlers = mouse as unknown as Record<"mousemove" | "mousedown" | "mouseup" | "mousewheel", EventListener>;
    // We do not want the stage to swallow wheel events.
    el.removeEventListener("wheel", handlers.mousewheel);

    const accel = (body: Matter.Body, ax: number, ay: number) => {
      Body.applyForce(body, body.position, { x: (ax * body.mass) / DT2, y: (ay * body.mass) / DT2 });
    };

    Events.on(engine, "beforeUpdate", () => {
      const { selectedPersonId: sel, matchedEventIds: matched, eventOpen, layout: L } = ctrl.current;
      if (!L) return;
      for (const body of bodyMap.values()) {
        const meta = body.plugin as BodyMeta;
        if (!meta.inWorld) continue;

        // Smoothly follow target scale.
        if (Math.abs(meta.scale - meta.targetScale) > 0.005) {
          const next = meta.scale + (meta.targetScale - meta.scale) * 0.14;
          const f = next / meta.scale;
          Body.scale(body, f, f);
          meta.scale = next;
        }

        if (meta.kind === "person" && sel === meta.id) {
          // Pinned: glide to the center of the left region.
          const nx = body.position.x + (L.left.cx - body.position.x) * 0.14;
          const ny = body.position.y + (L.left.cy - body.position.y) * 0.14;
          Body.setPosition(body, { x: nx, y: ny });
          Body.setVelocity(body, { x: 0, y: 0 });
          Body.setAngle(body, 0);
          continue;
        }

        let tx: number, ty: number, gain = ATTRACT_GAIN;
        if (meta.kind === "person") {
          if (sel) {
            const dx = body.position.x - L.left.cx;
            const dy = body.position.y - L.left.cy;
            const d = Math.hypot(dx, dy) || 1;
            tx = L.left.cx + (dx / d) * L.ringRadius;
            ty = L.left.cy + (dy / d) * L.ringRadius;
            gain *= 2.2;
          } else {
            tx = L.left.cx;
            ty = L.left.cy;
          }
        } else {
          // With a detail card docked on the right, matches drift left of it.
          tx = eventOpen ? L.right.x + L.right.w * 0.2 : L.right.cx;
          ty = L.right.cy;
          if (matched && matched.has(meta.id)) gain *= 2.4;
        }

        meta.wander += (Math.random() - 0.5) * 0.35;
        const ax = (tx - body.position.x) * gain + Math.cos(meta.wander) * WANDER_ACCEL;
        const ay = (ty - body.position.y) * gain + Math.sin(meta.wander) * WANDER_ACCEL;
        accel(body, ax, ay);

        const speed = Math.hypot(body.velocity.x, body.velocity.y);
        if (speed > MAX_SPEED) {
          Body.setVelocity(body, { x: (body.velocity.x / speed) * MAX_SPEED, y: (body.velocity.y / speed) * MAX_SPEED });
        }
        if (Math.abs(body.angularVelocity) > 0.02) Body.setAngularVelocity(body, 0);
      }
    });

    Events.on(engine, "afterUpdate", () => {
      for (const body of bodyMap.values()) {
        const meta = body.plugin as BodyMeta;
        const elOuter = elMap.get(meta.id);
        if (!elOuter) continue;
        const r = meta.baseRadius;
        elOuter.style.transform = `translate3d(${body.position.x - r}px, ${body.position.y - r}px, 0)`;
      }
    });

    const runner = Runner.create({ delta: STEP_MS });
    Runner.run(runner, engine);

    return () => {
      Runner.stop(runner);
      Events.off(engine, "beforeUpdate");
      Events.off(engine, "afterUpdate");
      Mouse.clearSourceEvents(mouse);
      el.removeEventListener("mousemove", handlers.mousemove);
      el.removeEventListener("mousedown", handlers.mousedown);
      el.removeEventListener("mouseup", handlers.mouseup);
      el.removeEventListener("touchmove", handlers.mousemove);
      el.removeEventListener("touchstart", handlers.mousedown);
      el.removeEventListener("touchend", handlers.mouseup);
      Composite.clear(world, false);
      Engine.clear(engine);
      engineRef.current = null;
      bodyMap.clear();
    };
  }, [layout, people, events]);

  // Selection choreography: pin the person, pop non-matching events, grow matches.
  // Everything here is imperative (physics world + DOM classes); React only
  // owns the derived emphasis states passed to the bubbles.
  useEffect(() => {
    if (!layout || !engineRef.current) return;
    const { Body, Composite } = Matter;
    const world = engineRef.current.world;
    const bodyMap = bodies.current;
    const elMap = outerEls.current;

    for (const t of timers.current) window.clearTimeout(t);
    timers.current = [];

    const setScale = (id: string, s: number) => {
      const b = bodyMap.get(id);
      if (b) (b.plugin as BodyMeta).targetScale = s;
    };
    const ensureInWorld = (id: string, region: Region) => {
      const b = bodyMap.get(id);
      if (!b) return;
      const meta = b.plugin as BodyMeta;
      elMap.get(id)?.classList.remove("is-popping", "is-gone");
      if (meta.inWorld) return;
      const r = meta.baseRadius * meta.scale;
      const { x, y } = randomIn(region, r);
      Body.setPosition(b, { x, y });
      Body.setVelocity(b, { x: 0, y: 0 });
      Composite.add(world, b);
      meta.inWorld = true;
      const el = elMap.get(id);
      if (el) {
        el.style.setProperty("--appear-delay", `${Math.random() * 300}ms`);
        el.classList.add("rally-appear");
        timers.current.push(window.setTimeout(() => el.classList.remove("rally-appear"), 900));
      }
    };
    const removeFromWorld = (id: string) => {
      const b = bodyMap.get(id);
      if (!b) return;
      const meta = b.plugin as BodyMeta;
      if (!meta.inWorld) return;
      Composite.remove(world, b);
      meta.inWorld = false;
    };

    for (const p of people) {
      const b = bodyMap.get(p.id);
      if (!b) continue;
      const isSel = p.id === selectedPersonId;
      setScale(p.id, isSel ? layout.expandedScale : selectedPersonId ? layout.dimmedScale : 1);
      b.collisionFilter = {
        category: isSel ? PINNED_CATEGORY : MOUSE_CATEGORY,
        mask: PERSON_MASK,
        group: 0,
      };
    }

    if (!matchedEventIds) {
      // Reset: bring everything back at normal size.
      for (const e of events) {
        setScale(e.id, 1);
        ensureInWorld(e.id, layout.right);
      }
      return;
    }

    const matched = events.filter((e) => matchedEventIds.has(e.id));
    const unmatched = events.filter((e) => !matchedEventIds.has(e.id));

    for (const e of matched) {
      ensureInWorld(e.id, layout.right);
      setScale(e.id, layout.matchedScale);
    }
    for (const e of unmatched) setScale(e.id, 1);

    // Pop the rest in waves.
    const toPop = unmatched.filter((e) => {
      const meta = bodyMap.get(e.id)?.plugin as BodyMeta | undefined;
      return meta?.inWorld;
    });
    const shuffled = [...toPop].sort(() => Math.random() - 0.5);
    const WAVES = 10;
    const perWave = Math.ceil(shuffled.length / WAVES);
    for (let w = 0; w < WAVES; w++) {
      const wave = shuffled.slice(w * perWave, (w + 1) * perWave);
      if (wave.length === 0) break;
      const delay = 120 + w * 70;
      timers.current.push(
        window.setTimeout(() => {
          for (const e of wave) elMap.get(e.id)?.classList.add("is-popping");
          timers.current.push(
            window.setTimeout(() => {
              for (const e of wave) {
                removeFromWorld(e.id);
                elMap.get(e.id)?.classList.add("is-gone");
              }
            }, 430),
          );
        }, delay),
      );
    }
  }, [layout, selectedPersonId, matchedEventIds, people, events]);

  const registerOuter = useCallback(
    (id: string) => (el: HTMLDivElement | null) => {
      if (el) outerEls.current.set(id, el);
      else outerEls.current.delete(id);
    },
    [],
  );

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    pointerDown.current = { x: e.clientX, y: e.clientY };
  }, []);
  const wasClick = (e: React.MouseEvent) => {
    const d = pointerDown.current;
    if (!d) return true;
    return Math.hypot(e.clientX - d.x, e.clientY - d.y) < 6;
  };

  const personState = (id: string): PersonBubbleState =>
    !selectedPersonId ? "idle" : id === selectedPersonId ? "selected" : "dimmed";
  const eventState = (id: string): EventBubbleState => {
    if (!matchedEventIds) return "idle";
    if (!matchedEventIds.has(id)) return "unmatched";
    if (id === openEventId) return "open";
    if (id === bestBetEventId) return "best";
    return "matched";
  };

  return (
    <div
      ref={containerRef}
      className="relative h-full w-full overflow-hidden"
      onClick={(e) => {
        if (e.target !== e.currentTarget) return;
        if (openEventId) onSelectEvent(null);
        else if (selectedPersonId) onSelectPerson(null);
      }}
    >
      {layout && (
        <>
          <div
            className="pointer-events-none absolute top-0 bottom-0 w-px bg-white/10"
            style={{ left: layout.w / 2 }}
          />
          {people.map((p) => (
            <PersonBubble
              key={p.id}
              person={p}
              radius={layout.personRadius}
              state={personState(p.id)}
              cardSize={layout.cardSize}
              outerRef={registerOuter(p.id)}
              onPointerDown={handlePointerDown}
              onClick={(e) => {
                if (!wasClick(e)) return;
                e.stopPropagation();
                if (p.id === selectedPersonId) return;
                onSelectPerson(p.id);
              }}
            />
          ))}
          {events.map((ev) => (
            <EventBubble
              key={ev.id}
              event={ev}
              radius={layout.eventRadius}
              state={eventState(ev.id)}
              matchedScale={layout.matchedScale}
              outerRef={registerOuter(ev.id)}
              onPointerDown={handlePointerDown}
              onClick={(e) => {
                if (!wasClick(e)) return;
                e.stopPropagation();
                onSelectEvent(ev.id === openEventId ? null : ev.id);
              }}
            />
          ))}
          {overlay && (
            <div
              className="pointer-events-none absolute z-40 flex items-center justify-end pr-4"
              style={{ left: layout.right.x, top: layout.right.y, width: layout.right.w, height: layout.right.h }}
            >
              <div className="pointer-events-auto max-h-full">{overlay}</div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
