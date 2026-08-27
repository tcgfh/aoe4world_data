# CLAUDE.md

Guidance for AI assistants working in this repository.

## What this repository is

`aoe4world/data` is **both a dataset and the parser that generates it**. Nearly every
JSON file in the repo root (`units/`, `buildings/`, `technologies/`, `upgrades/`,
`abilities/`, `civilizations/`, plus `images/`) is **generated output**, committed to
git and served publicly from `https://data.aoe4world.com` (see `CNAME`, GitHub Pages).
The only hand-written source lives in `src/`.

The parser reads raw Age of Empires IV game files (SGA archives, unpacked and decoded
to JSON by [AOEMods.Essence](https://github.com/aoemods/AOEMods.Essence)) and emits an
opinionated, developer-friendly JSON format that mirrors what players see on in-game
tooltips.

**Critical:** the raw game files are *not* in the repository (copyright). They must be
extracted from a local AoE4 install into `./source/` (gitignored). Without them,
`yarn parse` cannot run. Assume you cannot regenerate data in a CI/sandbox environment
unless `source/latest/` exists.

## Layout

```
src/
  attrib/            The parser. Run entrypoint + game-file-specific logic.
    run.ts           Entrypoint (`yarn parse`). Tech-tree crawl, icon dedupe, file writing.
    parse.ts         Turns one decoded attrib file into one Item (unit/building/tech/upgrade/ability).
    essence.ts       Reads AOEMods.Essence JSON, normalizes it into our shape; pbgmap index.
    config.ts        Source paths, hardcoded discovery lists, ignore lists, attrib type map.
    modifiers.ts     (~6k lines) technologyModifiers + abilityModifiers: id -> effect factory.
    workarounds.ts   (~1.7k lines) Ordered map of one-off data corrections applied post-parse.
    translations.ts  Reads the UCS locale file, resolves numeric string ids and formatters.
    weapons.ts       Weapon/armor/damage parsing.
    icons.ts         Copies icons from source into images/, pixel-diffs to detect conflicts.
  lib/
    config/index.ts  FOLDERS + ITEM_TYPES: the single source of truth for output paths.
    config/civs.ts   CIVILIZATIONS registry (abbr -> id/name/slug/attribName/expansion).
    files/           readData.ts / writeData.ts (JSON read/write/merge helpers).
    utils/items.ts   unifyItems / optimizeItems / optimizedToUnified.
    utils/*.ts       slugify, string/number/array helpers, captureCallContext.
  sdk/               Consumer-facing TS library that imports the generated JSON.
    data.ts          Loads all-optimized.json + civilization JSON into ItemLists.
    index.ts         Public API: Get(), civilizations, units, buildings, ...
    utils.ts         ItemList (where/order/get), civ slug<->abbr helpers.
  types/items.ts     Item, Unit, Building, Technology, Upgrade, Ability, Modifier, ...
  types/civs.ts      Re-exports civ types (deprecated shim) + CivInfo.
  tsconfig.json      Note: lives in src/, not the repo root.

Extract-AOE4Patch.ps1  PowerShell script that unpacks SGA archives into ./source/{version}.
.vscode/tasks.json     "yarn: parse - data" build task.
```

## Commands

```bash
yarn install
yarn parse            # ts-node ./src/attrib/run.ts — regenerates ALL data + icons
yarn build            # deprecated alias for `yarn parse`
yarn format           # prettier --write ./src  (printWidth 180, configured in package.json)
yarn analyse …        # derived-stat queries over the committed JSON (needs Node >= 22.6)
```

`yarn analyse` is the one command that works **without** `source/`, since it reads the
generated JSON rather than the game files. See "Querying derived stats" below.

There is **no test suite and no typecheck script**. Verification is done by reading the
git diff of the generated JSON (see "Verifying a data change" below).

`--essence` is accepted but obsolete (Essence is now the only supported input; XML
parsing was removed). `--civ <slug>` is **rejected with an error** — partial parses
would corrupt cross-civ icon conflict resolution. The README still documents `--civ`
and files named `technologies.ts` / `effect.ts`; those are stale — the modifier logic
now lives in `src/attrib/modifiers.ts`.

## How the parser works

`run.ts` drives everything:

1. **Discover** — for each civ in `CIVILIZATIONS`, start at `army/normal_{attribName}`
   and `racebps/{attribName}`, then crawl recursively: starting buildings/units →
   villager construction options → each building's production/research/upgrade/ability
   extensions. Files the crawl misses are listed manually in `hardcodedDiscovery`
   (per civ) and `hardcodedDiscoveryCommon` in `src/attrib/config.ts`. Files that
   should never be emitted go in `ignoreForNow` (string fragments or predicates).
2. **Parse** — `parseItemFromAttribFile` guesses the item type from the filename
   prefix (`building_`, `unit_`, `upgrade_`, `abilities/`, `info/buff_info/`), then
   pulls name/description/costs/stats from the extension bags and the locale file.
3. **Workaround** — every item is run through *all* entries in `workarounds`; each
   matching `predicate` fires its `mutator`. A workaround may set `item._skip = true`
   to drop the item entirely.
4. **Icons** — items are grouped by destination icon path; conflicting sources are
   reported (`resolveIconConflict`), then icons are copied into `images/{type}/` only
   when they differ by more than `MAX_ICON_PIXEL_DIFF` pixels. `icon_src` is an
   internal field and is deleted before writing.
5. **Persist & compile** — per-civ per-item files, then per-type index files.

### Ids and ages

- `baseId` = slugified name, with unit rank prefixes stripped
  (`early|vanguard|veteran|elite|hardened`), so `Early Man-at-Arms` → `man-at-arms`.
  Abilities are prefixed: `ability-{slug}`. Upgrades derive the baseId from the
  "X to Y" description.
- `id` = `` `${baseId}-${age}` ``, e.g. `man-at-arms-2`.
- `age` (1–4) comes from the required age upgrade in the requirement table, falling
  back to a trailing number in the attrib filename, with landmark `parent_pbg`
  special-casing. **If you change `age` in a workaround you must also rewrite `id`** —
  every existing workaround does this (see `overrideAge`).

### Output files per item type

For `T` in `units | buildings | technologies | upgrades | abilities`:

| Path | Contents |
| --- | --- |
| `T/{civ-slug}/{id}.json` | one item, one civ (the canonical record) |
| `T/unified/{baseId}.json` | all age/civ variations of one item grouped |
| `T/all.json` | flat list of every item |
| `T/all-unified.json` | every item, grouped by `baseId` |
| `T/all-optimized.json` | unified + common values hoisted (what the SDK loads) |
| `T/all-baseids.json` | `"T/baseId" -> name` lookup |
| `T/{civ-slug}.json`, `-unified.json`, `-optimized.json` | the same three, per civ |

`civilizations/{slug}.json` holds the civ overview + tech tree;
`civilizations/civs-index.json` mirrors the `CIVILIZATIONS` config.

The "optimized" format hoists the most common value of each key onto the group and
leaves only differences on each variation; `optimizedToUnified()` reverses it. Do not
hand-edit optimized files.

## Where to make a change

| You want to… | Edit |
| --- | --- |
| Fix a wrong stat, age, cost, icon, or drop a bogus item | `src/attrib/workarounds.ts` |
| Fix/add what a technology or ability *does* (its `effects`) | `src/attrib/modifiers.ts` |
| Add a missing item the crawl doesn't reach | `hardcodedDiscovery` in `src/attrib/config.ts` |
| Suppress an item that shouldn't be published | `ignoreForNow` in `src/attrib/config.ts` |
| Add a new civilization | `src/lib/config/civs.ts` **and** `src/sdk/data.ts` (import + registry + `list`) |
| Change output paths/structure | `src/lib/config/index.ts` + `compile()` in `run.ts` |
| Change the emitted item shape | `src/types/items.ts` + the relevant `parse*` in `parse.ts` |

**Never hand-edit generated JSON in `units/`, `buildings/`, `technologies/`,
`upgrades/`, `abilities/`, or `civilizations/`.** Fix the parser and re-run it. A PR
that edits only generated JSON will be silently reverted by the next parse.

### Writing a workaround

```ts
workaround("Short description of what this fixes", {
  predicate: (item) => item.baseId === "golden-tent",
  mutator: (item) => {
    item.age = 1;
    item.id = `${item.baseId}-${item.age}`;
  },
  validator: (item) => item.age === 1,   // optional; throws with call context if false
});
```

Workarounds run in declaration order and all matching ones apply, so later entries can
depend on earlier ones. The description is the map key — keep it unique. Helpers
already available: `overrideAge`, `overrideCivUniqueIcon`, `discountCosts`,
`generateCosts`, `NO_COSTS`.

### Writing a modifier

`technologyModifiers` / `abilityModifiers` are keyed by `baseId`. Prefer
`standardAbility(helptext, handler)` for real effects and `placeholderAbility(helptext,
select)` for effects too complex to model (emits `property: "unknown"`).

```ts
"zen": standardAbility(
  "", // expected in-game help text; "" logs an [Info] with what was actually found
  ([g]) => [{ property: "goldGeneration", select: { id: ["buddhist-monk"] }, effect: "change", value: g, type: "passive" }]
),
```

The `helptext` argument is a **regression guard**: the parser compares it against the
current locale string and logs `[Error] ...: Modifier help text changed` when the game
rewords or reorders the tooltip. Numeric values arrive positionally from the tooltip's
format arguments, so a reordering upstream silently corrupts values — this is exactly
what the guard catches. Pass `null` to skip verification. `property` must be a member
of `ModifyableProperty` in `src/types/items.ts`; `select` uses `{ class: [[...AND], [...OR-group]], id: [...] }`.

Reusable selector presets live in the `common` object near the top of `modifiers.ts`
(e.g. `common.allMilitaryLand`, `common.allReligiousUnits`) — prefer them over
re-listing ids.

## Updating to a new game patch

1. Extract game files: `.\Extract-AOE4Patch.ps1 -GamePath 'C:\...\Age of Empires IV\'`
   (produces `./source/{version}` plus a `./source/latest` junction). Manual steps are
   in the README if PowerShell isn't available.
2. `yarn install && yarn parse`.
3. **Read the parser's console output.** It is the primary signal:
   - `[Error] ...: Modifier help text changed` — a tooltip changed; re-check the
     parameter order/implementation in `modifiers.ts` before trusting the numbers.
   - `Duplicate item id ... conflicts with ...` — two files slugify to the same id.
   - `Icon conflict at ...` — one icon path claimed by different sources.
   - `Unknown float property ...` — a technology effect the fallback can't map.
   - `undefined icon for ...`, `Invalid item ... after override ...`.
4. Review the git diff of the generated JSON. Unexpected churn in `description`
   fields is the classic symptom of shifted tooltip format arguments.
5. Icons re-copy only when they differ by >5 pixels, so a large icon diff is itself
   worth investigating.

## Verifying a data change

Since there are no tests, verify by diff:

```bash
yarn parse
git diff --stat                        # scope of the change
git diff -- units/english/             # spot-check an affected civ
git diff -- units/all-optimized.json   # what the SDK actually serves
```

A targeted fix should produce a small, explainable diff. If a one-line workaround
changes thousands of lines, the predicate is too broad.

## Querying derived stats

The published JSON is item-centric: it stores canonical per-item records but **not**
derived stats (DPS, attack interval), **not** any reverse link from an item to the
technologies that modify it, and **not** the semantics for how modifiers compose.
`src/analysis/` derives all three on top of the committed data without touching the
parser or the published schema.

```bash
yarn analyse unit  counterweight-trebuchet templar     # derived stats, one unit + civ
yarn analyse rank  counterweight-trebuchet             # every civ, ranked by DPS
yarn analyse techs counterweight-trebuchet templar     # what modifies it
# flags: --target unit|building|naval   --stacking base|total
```

- `derive.ts` holds the logic (selector matching, the reverse index, stat derivation);
  `cli.ts` is only presentation. Import `derive.ts` directly for ad-hoc queries.
- Runs on plain Node via native type stripping — no `ts-node`, no `node_modules`. It
  resolves the repo root by walking up for `units/all.json`, so it works from any cwd.
- **`--stacking` exists because the data does not define modifier composition.** A
  weapon carries `siegeAttack change +350 (vs building)` while a technology carries
  `siegeAttack multiply 1.2`, and nothing records the order of operations. `base`
  multiplies base damage only; `total` multiplies base+bonus. Both are reported rather
  than picking one silently.

### The warnings are the point

Every query ends with caveats, because four failure modes in the data are otherwise
invisible and produce confidently wrong answers:

| Warning | Meaning |
| --- | --- |
| `unmodelled` | tech has `effects: []` but its description mentions this item — indistinguishable from "does nothing" |
| `untargeted-effect` | effect has no selector at all (the `float_properties` fallback in `parse.ts`) — **excluded** from the maths |
| `dangling-selector` | selector names a `baseId` that exists nowhere — looks well-formed, matches nothing |
| `unknown-property` | `placeholderAbility` output; not applied |
| `landmark-exclusive` | tech is only researchable at a landmark that has same-age rivals, so it is a build choice, not a given |

The canonical example: Templar "Counterweight Defenses" (+1 trebuchet projectile — the
largest single term in that unit's damage) is `unmodelled`, so a naive query scores it
as a no-op and reports the wrong civ as strongest. Conversely, Templar "Kingdom of
Poland" is `untargeted`, so a naive query stacks ×1.5 onto a trebuchet. Trust the
warnings before trusting the numbers.

`landmark-exclusive` is the subtlest: a civ builds one landmark per age, so
"fully upgraded" is a *choice*, not a ceiling. **52 technologies with real effects are
landmark-contingent.** Rus "Siege Crew Training" (instant siege setup/teardown) needs
the High Armory and is forgone if the civ takes the Spasskaya Tower. The warning fires
only when a same-age rival exists — the Abbasid House of Wisdom is always built, so its
technologies are unconditional and are not flagged.

Not to be confused with the Mongol `(Improved)` technologies, which are **not**
landmark-gated: `ability-ovoo-influence` grants "buildings within influence have access
to double production and improved technology", so e.g. Geometry (Improved) is researched
at an ordinary siege-workshop inside Ovoo influence, at double cost.

## Conventions

- TypeScript run through `ts-node` with `transpileOnly: true` — **type errors do not
  fail the parse.** `src/tsconfig.json` sets `strict: true` but `noImplicitAny: false`;
  a lot of parser code is intentionally `any` because the decoded attrib shape varies.
- Prettier with `printWidth: 180`. Run `yarn format` before committing `src/` changes.
- ES modules syntax, compiled to CommonJS; `resolveJsonModule` is on (the SDK imports
  generated JSON directly).
- Commented-out lines in `config.ts`/`modifiers.ts` are deliberate records of items
  that were tried and rejected — leave them unless you are resolving them.
- Generated files carry a `__note__` / `__version__` meta header; don't strip it.

## Known rough edges

- `src/attrib/essence.ts` and `src/attrib/weapons.ts` still `import` from a deleted
  `./xml` module. The imported symbols are unused, so TypeScript elides the import and
  the parse runs fine — but `tsc --noEmit` will fail on them. Removing those two import
  lines is safe.
- `parseItemFromAttribFile` swallows exceptions per item and logs a `.dev` path; an
  item that vanishes from the output usually means it threw, not that it was filtered.
- `writeJson` is fire-and-forget (`fs.writeFile` with a callback), so the process can
  exit with writes still in flight on very large runs.
- The README's "Development" section is partly out of date (see the Commands section).
- **35 technology records carry effects with no selector**, emitted by the generic
  `float_properties` fallback in `parse.ts` when a tech has no `technologyModifiers`
  entry: it blankets melee/ranged/siege/fire attack with no target. Their descriptions
  contradict them (Templar "Kingdom of Poland" says *cavalry* but the effect is
  untargeted). Fixing these properly needs one modifier per tech, and the values come
  from tooltip format arguments that are only readable with `source/` present.
  `yarn analyse` excludes and reports them in the meantime.
- **283 technology and 65 ability records have `effects: []`**, and 323 carry an
  `unknown` placeholder. Some are deliberate; many are simply not modelled yet.

## Data licensing

The game data is Microsoft's. Output is usable under Microsoft's
[Game Content Usage Rules](https://www.xbox.com/en-US/developers/rules) — non-commercial
only. Never commit raw extracted game files (`source/` is gitignored for this reason).
