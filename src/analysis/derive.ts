/**
 * Derived-stat analysis over the *generated* JSON in the repo root.
 *
 * This module exists because the published data is item-centric: it stores canonical
 * per-item records, but not (a) derived stats like DPS, (b) any reverse link from an
 * item to the technologies that modify it, or (c) the semantics for how modifiers
 * compose. Those three gaps are what make questions like "best fully-upgraded
 * trebuchet by civ" require a scan of every technology file.
 *
 * Nothing here touches the parser or the published schema — it reads the committed
 * JSON and derives on top of it.
 */

import fs from "fs";
import path from "path";
import type { Item, ItemClass, Modifier, Technology, Unit, Weapon } from "../types/items";

/** Walk up from the working directory to the repo root (the folder holding `units/`).
 *  Resolved this way rather than from `__dirname`/`import.meta` so the module behaves
 *  identically under CommonJS (ts-node) and ESM (node's native type stripping). */
function findRoot(): string {
  let dir = process.cwd();
  for (let i = 0; i < 8; i++) {
    if (fs.existsSync(path.join(dir, "units", "all.json"))) return dir;
    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  throw new Error("Could not locate the repo root (no units/all.json found above the working directory)");
}

const ROOT = findRoot();

/** How a `multiply` modifier interacts with a weapon's bonus-damage-vs-target.
 *
 * The published data does not specify this: a weapon carries `siegeAttack change +350
 * (vs building)` while a technology carries `siegeAttack multiply 1.2`, and nothing
 * records the order of operations. Both readings are supported and reported, because
 * picking one silently would invent precision the data does not have. */
export type Stacking = "base" | "total";

export type DamageTarget = "unit" | "building" | "naval";

export interface Warning {
  kind: "unmodelled" | "unknown-property" | "untargeted-effect" | "dangling-selector" | "landmark-exclusive" | "interval-mismatch";
  subject: string;
  detail: string;
}

export interface WeaponStats {
  name: string;
  type: string;
  projectiles: number;
  baseDamage: number;
  /** Full attack cycle in seconds (aim + windup + attack + winddown + reload). */
  interval: number;
  /** Pack/unpack time, in seconds. Sits OUTSIDE the attack cycle: it is paid once per
   *  reposition, not per volley, so steady-state DPS cannot show it. */
  setup: number;
  teardown: number;
  multiplier: number;
  flatBonus: number;
  perTarget: Record<DamageTarget, { volley: Record<Stacking, number>; dps: Record<Stacking, number> }>;
}

/** One entry of a civ's in-game trait summary (`civilizations/{slug}.json` -> overview). */
export interface Mechanic {
  title: string;
  text: string;
}

export interface AnalysisResult {
  unit: Unit;
  civ: string;
  civName: string;
  techs: Technology[];
  weapons: WeaponStats[];
  warnings: Warning[];
  /** Civ mechanics that mention this unit, its classes, or its producers. */
  mechanics: Mechanic[];
}

// ––––––––––––––––––––– data loading –––––––––––––––––––––

function readAll<T>(slug: string): T[] {
  const file = path.join(ROOT, slug, "all.json");
  return JSON.parse(fs.readFileSync(file, "utf8")).data as T[];
}

let cache: { units?: Unit[]; buildings?: Item[]; technologies?: Technology[]; abilities?: Item[]; upgrades?: Item[]; civs?: Record<string, any> } = {};

export const data = {
  get units() {
    return (cache.units ??= readAll<Unit>("units"));
  },
  get buildings() {
    return (cache.buildings ??= readAll<Item>("buildings"));
  },
  get technologies() {
    return (cache.technologies ??= readAll<Technology>("technologies"));
  },
  get abilities() {
    return (cache.abilities ??= readAll<Item>("abilities"));
  },
  get upgrades() {
    return (cache.upgrades ??= readAll<Item>("upgrades"));
  },
  get civs(): Record<string, { abbr: string; name: string; slug: string }> {
    return (cache.civs ??= JSON.parse(fs.readFileSync(path.join(ROOT, "civilizations/civs-index.json"), "utf8")));
  },
};

export function civByAny(civ: string) {
  const all = Object.values(data.civs);
  return all.find((c) => c.abbr === civ || c.slug === civ || c.name.toLowerCase() === civ.toLowerCase());
}

// ––––––––––––––––––––– selector matching –––––––––––––––––––––

/** True when a selector has neither an id list nor a class list.
 *
 * These are produced by the generic `float_properties` fallback in `parse.ts`, which
 * blankets melee/ranged/siege/fire attack with no target when it meets an unhandled
 * `damage` property. They are excluded from every calculation and surfaced as
 * warnings instead — including them stacks e.g. Kingdom of Poland's x1.5 onto a
 * trebuchet and produces a confidently wrong answer. */
export function isUntargeted(m: Modifier): boolean {
  const s = m.select;
  return !s || (!s.id?.length && !s.class?.length);
}

export function selects(m: Modifier, item: Item): boolean {
  if (isUntargeted(m)) return false;
  const s = m.select!;
  if (s.id?.some((id) => id === item.baseId || id === item.id)) return true;
  const classes = item.classes as ItemClass[];
  return !!s.class?.some((group) => group.length > 0 && group.every((c) => classes.includes(c)));
}

// ––––––––––––––––––––– the reverse index the data lacks –––––––––––––––––––––

/** Every technology available to `civ` that carries at least one effect selecting `item`. */
export function technologiesAffecting(item: Item, civ: string): Technology[] {
  return data.technologies.filter((t) => t.civs.includes(civ as any) && (t.effects ?? []).some((e) => selects(e, item)));
}

let knownBaseIds: Set<string> | undefined;
/** Every baseId that exists anywhere in the dataset, for dangling-selector detection.
 *  Must span *all five* item types — a selector legitimately naming a building
 *  (`keep`, `outpost`) would otherwise be reported as dangling. */
function allBaseIds(): Set<string> {
  return (knownBaseIds ??= new Set([...data.units, ...data.buildings, ...data.technologies, ...data.abilities, ...data.upgrades].map((i) => i.baseId)));
}

/** Selector ids that match no item in the dataset.
 *
 * A selector can name an id that simply does not exist — Mongol "Geometry (Improved)"
 * selects `trebuchet`, while the actual baseIds are `counterweight-trebuchet` and
 * `traction-trebuchet`, so the effect silently applies to nothing. Unlike an
 * untargeted effect this looks perfectly well-formed, so it has to be checked
 * against the id space rather than spotted by shape. */
export function danglingIds(m: Modifier): string[] {
  const known = allBaseIds();
  return (m.select?.id ?? []).filter((id) => !known.has(id));
}

let landmarkIds: Set<string> | undefined;
/** Every landmark/wonder baseId. */
export function landmarks(): Set<string> {
  return (landmarkIds ??= new Set(data.buildings.filter((b) => b.classes.includes("landmark") || b.classes.includes("wonder")).map((b) => b.baseId)));
}

/** Technologies researchable *only* at a landmark, and therefore contingent on that
 *  landmark being the one chosen for its age. */
export function landmarkExclusive(techs: Technology[]): Technology[] {
  const lm = landmarks();
  return techs.filter((t) => (t.producedBy ?? []).length > 0 && (t.producedBy ?? []).every((p) => lm.has(p)));
}

/** The other landmarks a civ could build in the same age as any of `producers` — i.e.
 *  what it gives up to gain access to a landmark-exclusive technology. */
export function sameAgeLandmarkRivals(producers: string[], civ: string): string[] {
  const lm = landmarks();
  const ages = new Set(data.buildings.filter((b) => producers.includes(b.baseId) && b.civs.includes(civ as any)).map((b) => b.age));
  return [...new Set(data.buildings.filter((b) => b.civs.includes(civ as any) && lm.has(b.baseId) && ages.has(b.age) && !producers.includes(b.baseId)).map((b) => b.baseId))];
}

// ––––––––––––––––––––– civ mechanics –––––––––––––––––––––

const overviewCache = new Map<string, Mechanic[]>();

/** A civ's in-game trait summary — the closest thing this repo has to a mechanics doc.
 *
 * Produced by `getCivInfo` in run.ts from the army bag's `global_traits_summary`, and
 * the only place mechanics like Ovoo influence, building packing or the Silk Road
 * thresholds are written down. Nothing links these to the technologies they gate, so
 * they are surfaced as prose next to the numbers rather than folded into them. */
export function civMechanics(civInput: string): Mechanic[] {
  const civ = civByAny(civInput);
  if (!civ) return [];
  if (overviewCache.has(civ.slug)) return overviewCache.get(civ.slug)!;
  let out: Mechanic[] = [];
  try {
    const raw = JSON.parse(fs.readFileSync(path.join(ROOT, "civilizations", `${civ.slug}.json`), "utf8"));
    out = (raw.overview ?? []).map((o: any) => ({ title: o.title ?? "", text: o.description ?? (o.list ?? []).join("\n") ?? "" }));
  } catch {
    out = [];
  }
  overviewCache.set(civ.slug, out);
  return out;
}

/** Civ mechanics whose text mentions the item, one of its classes, or a producer.
 *
 * A coarse text match — the data carries no link between a trait and the items it
 * affects — but enough to put "buildings within influence ... improved technology" in
 * front of anyone asking about a Mongol siege unit. */
export function mechanicsFor(item: Item, civInput: string): Mechanic[] {
  const words = [item.baseId.split("-"), item.name.toLowerCase().split(" "), item.classes, item.producedBy ?? []]
    .flat()
    .map((w) => String(w).toLowerCase())
    .filter((w) => w.length > 3);
  const needles = [...new Set(words)];
  return civMechanics(civInput).filter((m) => {
    const hay = `${m.title} ${m.text}`.toLowerCase();
    return needles.some((n) => hay.includes(n));
  });
}

/** Technologies for `civ` that mention the item by name but declare no effects at all.
 *
 * An empty `effects: []` is indistinguishable from "does nothing", so a naive query
 * silently scores these as no-ops. Counterweight Defenses (+1 trebuchet projectile —
 * the single largest term in the Templar trebuchet's damage) is one of them. */
export function unmodelledCandidates(item: Item, civ: string): Technology[] {
  const words = item.baseId.split("-").filter((w) => w.length > 3);
  return data.technologies.filter((t) => {
    if (!t.civs.includes(civ as any)) return false;
    if ((t.effects ?? []).length > 0) return false;
    const text = `${t.name} ${t.description ?? ""}`.toLowerCase();
    return words.some((w) => text.includes(w)) || item.classes.some((c) => text.includes(` ${c}`));
  });
}

// ––––––––––––––––––––– derived stats –––––––––––––––––––––

const TARGET_CLASS: Record<DamageTarget, string | null> = { unit: null, building: "building", naval: "naval" };

const ATTACK_PROPERTY: Record<string, string[]> = {
  melee: ["meleeAttack"],
  ranged: ["rangedAttack"],
  siege: ["siegeAttack"],
  fire: ["fireAttack"],
  charge: ["meleeAttack"],
};

function weaponBonus(weapon: Weapon, target: DamageTarget): number {
  const cls = TARGET_CLASS[target];
  if (!cls) return 0;
  return (weapon.modifiers ?? []).filter((m) => m.target?.class?.some((g) => g.includes(cls as ItemClass))).reduce((sum, m) => sum + (m.effect === "change" ? m.value : 0), 0);
}

/** Sum of the weapon's duration phases — the real time between volleys. */
export function attackInterval(weapon: Weapon): number {
  const d = weapon.durations ?? {};
  const summed = ["aim", "windup", "attack", "winddown", "reload"].reduce((s, k) => s + (d[k] ?? 0), 0);
  return summed > 0 ? summed : weapon.speed;
}

export function analyseWeapon(weapon: Weapon, modifiers: Modifier[]): WeaponStats {
  const props = ATTACK_PROPERTY[weapon.type] ?? [];
  const relevant = modifiers.filter((m) => props.includes(m.property));
  const multiplier = relevant.filter((m) => m.effect === "multiply").reduce((p, m) => p * m.value, 1);
  const flatBonus = relevant.filter((m) => m.effect === "change").reduce((s, m) => s + m.value, 0);

  // Technologies can add projectiles to a volley: Chinese "Additional Barrels" (+3
  // Nest of Bees rockets) and Templar "Counterweight Defenses" (+1 trebuchet
  // projectile). Ignoring these understated the Templar trebuchet by 50%.
  const burstMods = modifiers.filter((m) => m.property === "burst");
  const projectiles = Math.max(
    1,
    burstMods.filter((m) => m.effect === "multiply").reduce((p, m) => p * m.value, weapon.burst?.count ?? 1) +
      burstMods.filter((m) => m.effect === "change").reduce((s, m) => s + m.value, 0),
  );
  const interval = attackInterval(weapon);

  const perTarget = {} as WeaponStats["perTarget"];
  for (const target of ["unit", "building", "naval"] as DamageTarget[]) {
    const bonus = weaponBonus(weapon, target);
    const base = weapon.damage * multiplier + flatBonus + bonus;
    const total = (weapon.damage + bonus) * multiplier + flatBonus;
    const volley = { base: projectiles * base, total: projectiles * total };
    perTarget[target] = { volley, dps: { base: volley.base / interval, total: volley.total / interval } };
  }

  const d = weapon.durations ?? {};
  return {
    name: weapon.name ?? weapon.type,
    type: weapon.type,
    projectiles,
    baseDamage: weapon.damage,
    interval,
    setup: d.setup ?? 0,
    teardown: d.teardown ?? 0,
    multiplier,
    flatBonus,
    perTarget,
  };
}

export function analyse(baseId: string, civInput: string): AnalysisResult {
  const civ = civByAny(civInput);
  if (!civ) throw new Error(`Unknown civilization "${civInput}"`);

  const candidates = data.units.filter((u) => u.baseId === baseId && u.civs.includes(civ.abbr as any));
  if (!candidates.length) throw new Error(`No unit "${baseId}" for ${civ.name}`);
  const unit = candidates.sort((a, b) => b.age - a.age)[0];

  const techs = technologiesAffecting(unit, civ.abbr);
  const warnings: Warning[] = [];

  // A civ builds one landmark per age, so techs exclusive to a landmark are NOT
  // simultaneously available with those of its same-age rivals: "fully upgraded" is a
  // choice, not a ceiling. Rus "Siege Crew Training" (instant siege setup/teardown) is
  // the clean example — it needs the High Armory, forgoing the Spasskaya Tower.
  for (const t of landmarkExclusive(techs)) {
    const at = t.producedBy ?? [];
    const rivals = sameAgeLandmarkRivals(at, civ.abbr);
    // No same-age rival means the landmark is always built (e.g. the Abbasid House of
    // Wisdom), so the tech is unconditional and there is nothing to warn about.
    if (!rivals.length) continue;
    warnings.push({
      kind: "landmark-exclusive",
      subject: t.name,
      detail: `only researchable at ${at.join(" / ")}, so it is forgone if the civ takes ${rivals.join(" or ")} instead — counted here, but it is a landmark choice rather than a given`,
    });
  }

  const modifiers: Modifier[] = [];
  for (const t of techs)
    for (const e of t.effects ?? []) {
      if (!selects(e, unit)) continue;
      if (e.property === "unknown") {
        warnings.push({ kind: "unknown-property", subject: t.name, detail: `effect is a placeholder ("unknown") and is not applied` });
        continue;
      }
      modifiers.push(e);
    }

  for (const t of data.technologies) {
    if (!t.civs.includes(civ.abbr as any)) continue;
    for (const e of t.effects ?? []) {
      if (isUntargeted(e) && !warnings.some((w) => w.subject === t.name && w.kind === "untargeted-effect"))
        warnings.push({
          kind: "untargeted-effect",
          subject: t.name,
          detail: `declares ${e.property} ${e.effect} ${e.value} with no selector — excluded (description: "${(t.description ?? "").split("\n")[0].trim()}")`,
        });
      const dangling = danglingIds(e);
      if (dangling.length && !warnings.some((w) => w.subject === t.name && w.kind === "dangling-selector"))
        warnings.push({
          kind: "dangling-selector",
          subject: t.name,
          detail: `selects id(s) that exist nowhere in the dataset: ${dangling.join(", ")} — this effect matches nothing (description: "${(t.description ?? "").split("\n")[0].trim()}")`,
        });
    }
  }

  for (const t of unmodelledCandidates(unit, civ.abbr))
    warnings.push({ kind: "unmodelled", subject: t.name, detail: `has no effects modelled but reads: "${(t.description ?? "").split("\n")[0].trim()}"` });

  const weapons = (unit.weapons ?? []).map((w) => {
    const stats = analyseWeapon(w, modifiers);
    if (w.speed && Math.abs(w.speed - stats.interval) > 0.001)
      warnings.push({ kind: "interval-mismatch", subject: w.name ?? w.type, detail: `speed=${w.speed} but durations sum to ${stats.interval}` });
    return stats;
  });

  return { unit, civ: civ.abbr, civName: civ.name, techs, weapons, warnings, mechanics: mechanicsFor(unit, civ.abbr) };
}

/** Damage per second over one full siege cycle: travel -> unpack -> `volleys` volleys
 *  -> pack. Converges to steady-state DPS as `volleys` grows, so it is a strict
 *  generalisation of `perTarget[t].dps` rather than a competing number.
 *
 *  `volleys` and `travelTiles` are **player behaviour, not data** — nothing in the
 *  dataset says how often a siege engine repositions. The metric therefore exists to
 *  show sensitivity across plausible play, never to produce one authoritative figure.
 *  Its value is pricing effects that steady-state DPS structurally cannot show: Rus
 *  Siege Crew Training (instant pack/unpack) is worth ~+4% in a static siege and
 *  ~+18% in hit-and-run, on identical damage. */
export function effectiveDps(w: WeaponStats, moveSpeed: number, opts: { volleys: number; travelTiles?: number; target?: DamageTarget; stacking?: Stacking }): number {
  const { volleys, travelTiles = 0, target = "building", stacking = "base" } = opts;
  if (!Number.isFinite(volleys)) return w.perTarget[target].dps[stacking];
  const travel = moveSpeed > 0 ? travelTiles / moveSpeed : 0;
  const elapsed = travel + w.setup + volleys * w.interval + w.teardown;
  return elapsed > 0 ? (volleys * w.perTarget[target].volley[stacking]) / elapsed : 0;
}

/** Rank every civ that fields `baseId`, by the best DPS among that unit's weapons. */
export function rankByDps(baseId: string, target: DamageTarget = "building", stacking: Stacking = "base") {
  const civs = Object.values(data.civs).filter((c) => data.units.some((u) => u.baseId === baseId && u.civs.includes(c.abbr as any)));
  return civs
    .map((c) => {
      const r = analyse(baseId, c.abbr);
      const best = r.weapons.reduce((a, b) => (b.perTarget[target].dps[stacking] > (a?.perTarget[target].dps[stacking] ?? -1) ? b : a), r.weapons[0]);
      return { civ: c.name, unit: r.unit.name, weapon: best, result: r };
    })
    .sort((a, b) => b.weapon.perTarget[target].dps[stacking] - a.weapon.perTarget[target].dps[stacking]);
}
