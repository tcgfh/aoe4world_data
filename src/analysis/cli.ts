/**
 * CLI over src/analysis/derive.ts.
 *
 *   yarn analyse unit counterweight-trebuchet templar
 *   yarn analyse rank counterweight-trebuchet --target building
 *   yarn analyse techs counterweight-trebuchet templar
 *
 * Flags: --target unit|building|naval   --stacking base|total
 */

import { analyse, data, rankByDps, type DamageTarget, type Stacking, type Warning } from "./derive.ts";

const argv = process.argv.slice(2);
const flag = (name: string, fallback: string) => {
  const i = argv.indexOf(`--${name}`);
  return i >= 0 && argv[i + 1] ? argv[i + 1] : fallback;
};
const positional = argv.filter((a, i) => !a.startsWith("--") && !argv[i - 1]?.startsWith("--"));

const [command, baseId, civ] = positional;
const target = flag("target", "building") as DamageTarget;
const stacking = flag("stacking", "base") as Stacking;

const pad = (s: any, n: number) => String(s).padEnd(n);
const num = (s: any, n: number) => String(s).padStart(n);
const round = (n: number) => Math.round(n * 10) / 10;

function printWarnings(warnings: Warning[]) {
  if (!warnings.length) return;
  console.log(`\n  ⚠ ${warnings.length} caveat(s) — the data is incomplete or self-contradictory here:`);
  for (const w of warnings) console.log(`    [${w.kind}] ${w.subject}: ${w.detail}`);
}

function unitCommand() {
  const r = analyse(baseId, civ);
  console.log(`\n${r.unit.name} — ${r.civName}  (age ${r.unit.age}, ${r.unit.hitpoints} hp, ${r.unit.costs.total} resources)`);
  console.log(`\n  Technologies affecting it (${r.techs.length}): ${r.techs.map((t) => t.name).join(", ") || "none"}`);

  for (const w of r.weapons) {
    console.log(`\n  ${w.name} (${w.type})`);
    console.log(`    ${w.projectiles} projectile(s) x ${w.baseDamage} damage, one volley per ${w.interval}s`);
    console.log(`    upgrades: x${round(w.multiplier)} multiplier, ${w.flatBonus >= 0 ? "+" : ""}${w.flatBonus} flat`);
    console.log(`    ${pad("target", 10)}${num("volley", 16)}${num("dps", 16)}`);
    for (const t of ["unit", "building", "naval"] as DamageTarget[]) {
      const p = w.perTarget[t];
      const v = p.volley.base === p.volley.total ? `${round(p.volley.base)}` : `${round(p.volley.base)}–${round(p.volley.total)}`;
      const d = p.dps.base === p.dps.total ? `${round(p.dps.base)}` : `${round(p.dps.base)}–${round(p.dps.total)}`;
      console.log(`    ${pad(t, 10)}${num(v, 16)}${num(d, 16)}`);
    }
  }
  printWarnings(r.warnings);
}

function rankCommand() {
  const rows = rankByDps(baseId, target, stacking);
  console.log(`\n${baseId} — DPS vs ${target} (stacking: ${stacking})\n`);
  console.log(`  ${pad("CIV", 22)}${pad("UNIT", 24)}${num("PROJ", 5)}${num("DMG", 6)}${num("MULT", 7)}${num("CYCLE", 8)}${num("VOLLEY", 9)}${num("DPS", 8)}`);
  for (const r of rows) {
    const w = r.weapon;
    console.log(
      `  ${pad(r.civ, 22)}${pad(r.unit, 24)}${num(w.projectiles, 5)}${num(w.baseDamage, 6)}${num("x" + round(w.multiplier), 7)}${num(w.interval, 8)}` +
        `${num(round(w.perTarget[target].volley[stacking]), 9)}${num(round(w.perTarget[target].dps[stacking]), 8)}`,
    );
  }
  const all = rows.flatMap((r) => r.result.warnings.map((w) => `${r.civ}: [${w.kind}] ${w.subject}`));
  const unique = [...new Set(all)];
  if (unique.length) {
    console.log(`\n  ⚠ ${unique.length} caveat(s) across these civs. Run 'analyse unit ${baseId} <civ>' for detail. Sample:`);
    for (const u of unique.slice(0, 8)) console.log(`    ${u}`);
  }
}

function techsCommand() {
  const r = analyse(baseId, civ);
  console.log(`\nTechnologies affecting ${r.unit.name} (${r.civName}):\n`);
  for (const t of r.techs) {
    console.log(`  ${t.name} (age ${t.age}, ${t.costs.total})`);
    for (const e of t.effects ?? []) console.log(`      ${e.property} ${e.effect} ${e.value}`);
  }
  printWarnings(r.warnings);
}

try {
  if (command === "unit" && baseId && civ) unitCommand();
  else if (command === "rank" && baseId) rankCommand();
  else if (command === "techs" && baseId && civ) techsCommand();
  else {
    console.log(`Usage:
  analyse unit  <baseId> <civ>    derived stats for one unit, one civ
  analyse rank  <baseId>          every civ that fields the unit, ranked by DPS
  analyse techs <baseId> <civ>    the technologies that modify it

Flags:
  --target   unit | building | naval   (default: building)
  --stacking base | total              (default: base)

Civs: ${Object.values(data.civs)
      .map((c: any) => c.slug)
      .join(", ")}`);
    process.exit(command ? 1 : 0);
  }
} catch (e: any) {
  console.error(`Error: ${e.message}`);
  process.exit(1);
}
