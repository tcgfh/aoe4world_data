# Hobelar

Cheap cavalry effective at raiding, flanking, and countering ranged units.

- **+** Cheaper than a normal Horseman
- **+** High movement speed
- **−** Weak against melee units
- **−** Countered by Spearmen

![Hobelar](https://data.aoe4world.com/images/units/hobelar-2.png)

## Overview

| Field | Value |
| --- | --- |
| ID | `hobelar` |
| Type | Unit |
| Civilization | House of Lancaster (hl) |
| Unique | Yes |
| Display class | Light Melee Cavalry |
| Minimum age | II (Feudal) |
| Produced by | stable |

**Classes:** annihilation_condition, cavalry, cavalry_light, find_non_siege_land_military, formational, horse, human, included_by_military_hotkeys, land_military, melee, military, military_cavalry, sofa, torch_thrower

## Variations

| Age | Name | ID | Hitpoints | Armor | Weapon | Damage | Attack speed | Range | Move speed |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| II | Hobelar | `hobelar-2` | 100 | R3 | Short Sword | 7 | 1.5 | 0–0.375 | 1.875 |
| III | Veteran Hobelar | `hobelar-3` | 120 | R4 | Short Sword | 9 | 1.5 | 0–0.375 | 1.875 |
| IV | Elite Hobelar | `hobelar-4` | 145 | R7 | Short Sword | 12 | 1.5 | 0–0.375 | 1.875 |

Cost is identical at every age: **75 food + 20 gold (total 95)**, **15s** build time, **1** population.

### Hobelar (Age II)

| Field | Value |
| --- | --- |
| ID | `hobelar-2` |
| pbgid | 5000087 |
| attribName | `unit_hobelar_2_lan` |
| Hitpoints | 100 |
| Cost | 75 food + 20 gold (total 95) |
| Build time | 15s |
| Population | 1 |
| Produced by | stable |
| Movement speed | 1.875 |
| Armor | Ranged 3 |
| Icon | https://data.aoe4world.com/images/units/hobelar-2.png |

**Short Sword** — melee (`weapon_hobelar_2_lan`, pbgid 5000142)

| Damage | Attack speed | Range (min–max) |
| --- | --- | --- |
| 7 | 1.5 | 0–0.375 |

Modifiers:

- meleeAttack +7 vs ranged (passive)
- meleeAttack +7 vs siege (passive)

Durations: aim 0, windup 0.25, attack 0.125, winddown 0.25, reload 0, setup 0, teardown 0, cooldown 0.875

**Torch** — fire (`weapon_torch_horseman`, pbgid 127935)

| Damage | Attack speed | Range (min–max) |
| --- | --- | --- |
| 10 | 2.125 | 0–1.25 |

Durations: aim 0, windup 0.75, attack 0.125, winddown 0, reload 0, setup 0, teardown 0, cooldown 1.25

**Spear Charge** — melee (`weapon_hobelar_2_charge_lan`, pbgid 5000143)

| Damage | Attack speed | Range (min–max) |
| --- | --- | --- |
| 7 | 1.5 | 0–0.5375 |

Modifiers:

- meleeAttack +7 vs ranged (passive)
- meleeAttack +7 vs siege (passive)

Durations: aim 0, windup 0, attack 0.125, winddown 0, reload 0, setup 0, teardown 0, cooldown 1.375

**Sight:** base 13.6, line 28, height 10 (inner radius 4 / height 10, outer radius 28 / height -15)

### Veteran Hobelar (Age III)

| Field | Value |
| --- | --- |
| ID | `hobelar-3` |
| pbgid | 5000088 |
| attribName | `unit_hobelar_3_lan` |
| Hitpoints | 120 |
| Cost | 75 food + 20 gold (total 95) |
| Build time | 15s |
| Population | 1 |
| Produced by | stable |
| Movement speed | 1.875 |
| Armor | Ranged 4 |
| Icon | https://data.aoe4world.com/images/units/hobelar-3.png |

**Short Sword** — melee (`weapon_hobelar_3_lan`, pbgid 5000144)

| Damage | Attack speed | Range (min–max) |
| --- | --- | --- |
| 9 | 1.5 | 0–0.375 |

Modifiers:

- meleeAttack +9 vs ranged (passive)
- meleeAttack +9 vs siege (passive)

Durations: aim 0, windup 0.25, attack 0.125, winddown 0.25, reload 0, setup 0, teardown 0, cooldown 0.875

**Torch** — fire (`weapon_torch_horseman`, pbgid 127935)

| Damage | Attack speed | Range (min–max) |
| --- | --- | --- |
| 10 | 2.125 | 0–1.25 |

Durations: aim 0, windup 0.75, attack 0.125, winddown 0, reload 0, setup 0, teardown 0, cooldown 1.25

**Spear Charge** — melee (`weapon_hobelar_3_charge_lan`, pbgid 5000145)

| Damage | Attack speed | Range (min–max) |
| --- | --- | --- |
| 9 | 1.5 | 0–0.5375 |

Modifiers:

- meleeAttack +9 vs ranged (passive)
- meleeAttack +9 vs siege (passive)

Durations: aim 0, windup 0, attack 0.125, winddown 0, reload 0, setup 0, teardown 0, cooldown 1.375

**Sight:** base 13.6, line 28, height 10 (inner radius 4 / height 10, outer radius 28 / height -15)

### Elite Hobelar (Age IV)

| Field | Value |
| --- | --- |
| ID | `hobelar-4` |
| pbgid | 5000089 |
| attribName | `unit_hobelar_4_lan` |
| Hitpoints | 145 |
| Cost | 75 food + 20 gold (total 95) |
| Build time | 15s |
| Population | 1 |
| Produced by | stable |
| Movement speed | 1.875 |
| Armor | Ranged 7 |
| Icon | https://data.aoe4world.com/images/units/hobelar-4.png |

**Short Sword** — melee (`weapon_hobelar_4_lan`, pbgid 5000146)

| Damage | Attack speed | Range (min–max) |
| --- | --- | --- |
| 12 | 1.5 | 0–0.375 |

Modifiers:

- meleeAttack +12 vs ranged (passive)
- meleeAttack +12 vs siege (passive)

Durations: aim 0, windup 0.25, attack 0.125, winddown 0.25, reload 0, setup 0, teardown 0, cooldown 0.875

**Torch** — fire (`weapon_torch_horseman`, pbgid 127935)

| Damage | Attack speed | Range (min–max) |
| --- | --- | --- |
| 10 | 2.125 | 0–1.25 |

Durations: aim 0, windup 0.75, attack 0.125, winddown 0, reload 0, setup 0, teardown 0, cooldown 1.25

**Spear Charge** — melee (`weapon_hobelar_4_charge_lan`, pbgid 5000147)

| Damage | Attack speed | Range (min–max) |
| --- | --- | --- |
| 12 | 1.5 | 0–0.5375 |

Modifiers:

- meleeAttack +12 vs ranged (passive)
- meleeAttack +12 vs siege (passive)

Durations: aim 0, windup 0, attack 0.125, winddown 0, reload 0, setup 0, teardown 0, cooldown 1.375

**Sight:** base 13.6, line 28, height 10 (inner radius 4 / height 10, outer radius 28 / height -15)

---

Source: autogenerated AoE4 data — see https://data.aoe4world.com/. Regenerate with `python3 scripts/units_to_markdown.py`.
