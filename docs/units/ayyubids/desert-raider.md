# Desert Raider

Versatile Cavalry unit that can swap between ranged and melee attacks with a toggle.

- **+** Effective against Light Infantry in Ranged Mode
- **+** Effective against Cavalry in Melee Mode
- **−** High cost
- **−** Weak to Ranged units

![Desert Raider](https://data.aoe4world.com/images/units/desert-raider-2.png)

## Overview

| Field | Value |
| --- | --- |
| ID | `desert-raider` |
| Type | Unit |
| Civilization | Ayyubids (ay) |
| Unique | Yes |
| Display class | Light Ranged and Melee Camel |
| Minimum age | II (Feudal) |
| Produced by | archery-range, stable |

**Classes:** annihilation_condition, archer, camel, camel_archer, cavalry, cavalry_archer, find_non_siege_land_military, formational, human, included_by_military_hotkeys, land_military, military, ranged, ranged_hybrid, torch_thrower

## Variations

| Age | Name | ID | Hitpoints | Armor | Weapon | Damage | Attack speed | Range | Move speed |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| II | Desert Raider | `desert-raider-2` | 120 | M5 | Sword | 13 | 1.375 | 0–0.2875 | 1.625 |
| III | Veteran Desert Raider | `desert-raider-3` | 145 | M6 | Sword | 15 | 1.375 | 0–0.2875 | 1.625 |
| IV | Elite Desert Raider | `desert-raider-4` | 175 | M7 | Sword | 19 | 1.375 | 0–0.2875 | 1.625 |

Cost is identical at every age: **80 food + 50 wood + 50 gold (total 180)**, **30s** build time, **1** population.

### Desert Raider (Age II)

| Field | Value |
| --- | --- |
| ID | `desert-raider-2` |
| pbgid | 6946920 |
| attribName | `unit_mamluk_2_abb_ha_01` |
| Hitpoints | 120 |
| Cost | 80 food + 50 wood + 50 gold (total 180) |
| Build time | 30s |
| Population | 1 |
| Produced by | archery-range, stable |
| Movement speed | 1.625 |
| Armor | Melee 5 |
| Icon | https://data.aoe4world.com/images/units/desert-raider-2.png |

**Sword** — melee (`weapon_mamluk_melee_2_abb_ha_01`, pbgid 2135406)

| Damage | Attack speed | Range (min–max) |
| --- | --- | --- |
| 13 | 1.375 | 0–0.2875 |

Modifiers:

- meleeAttack +13 vs cavalry (passive)

Durations: aim 0, windup 0.5, attack 0.125, winddown 0, reload 0, setup 0, teardown 0, cooldown 0.75

**Torch** — fire (`weapon_torch_horseman`, pbgid 127935)

| Damage | Attack speed | Range (min–max) |
| --- | --- | --- |
| 10 | 2.125 | 0–1.25 |

Durations: aim 0, windup 0.75, attack 0.125, winddown 0, reload 0, setup 0, teardown 0, cooldown 1.25

**Bow** — ranged (`weapon_mamluk_ranged_2_abb_ha_01`, pbgid 2135407)

| Damage | Attack speed | Range (min–max) |
| --- | --- | --- |
| 7 | 1.25 | 0–4.5 |

Durations: aim 0, windup 0, attack 0.125, winddown 0.5, reload 0.625, setup 0, teardown 0, cooldown 0

**Sight:** base 23.6, line 38, height 10 (inner radius 14 / height 10, outer radius 38 / height -15)

### Veteran Desert Raider (Age III)

| Field | Value |
| --- | --- |
| ID | `desert-raider-3` |
| pbgid | 7844054 |
| attribName | `unit_mamluk_3_abb_ha_01` |
| Hitpoints | 145 |
| Cost | 80 food + 50 wood + 50 gold (total 180) |
| Build time | 30s |
| Population | 1 |
| Produced by | archery-range, stable |
| Movement speed | 1.625 |
| Armor | Melee 6 |
| Icon | https://data.aoe4world.com/images/units/desert-raider-3.png |

**Sword** — melee (`weapon_mamluk_melee_3_abb_ha_01`, pbgid 2135408)

| Damage | Attack speed | Range (min–max) |
| --- | --- | --- |
| 15 | 1.375 | 0–0.2875 |

Modifiers:

- meleeAttack +15 vs cavalry (passive)

Durations: aim 0, windup 0.5, attack 0.125, winddown 0, reload 0, setup 0, teardown 0, cooldown 0.75

**Torch** — fire (`weapon_torch_horseman`, pbgid 127935)

| Damage | Attack speed | Range (min–max) |
| --- | --- | --- |
| 10 | 2.125 | 0–1.25 |

Durations: aim 0, windup 0.75, attack 0.125, winddown 0, reload 0, setup 0, teardown 0, cooldown 1.25

**Bow** — ranged (`weapon_mamluk_ranged_3_abb_ha_01`, pbgid 2135409)

| Damage | Attack speed | Range (min–max) |
| --- | --- | --- |
| 9 | 1.25 | 0–4.5 |

Durations: aim 0, windup 0, attack 0.125, winddown 0.5, reload 0.625, setup 0, teardown 0, cooldown 0

**Sight:** base 23.6, line 38, height 10 (inner radius 14 / height 10, outer radius 38 / height -15)

### Elite Desert Raider (Age IV)

| Field | Value |
| --- | --- |
| ID | `desert-raider-4` |
| pbgid | 8731241 |
| attribName | `unit_mamluk_4_abb_ha_01` |
| Hitpoints | 175 |
| Cost | 80 food + 50 wood + 50 gold (total 180) |
| Build time | 30s |
| Population | 1 |
| Produced by | archery-range, stable |
| Movement speed | 1.625 |
| Armor | Melee 7 |
| Icon | https://data.aoe4world.com/images/units/desert-raider-4.png |

**Sword** — melee (`weapon_mamluk_melee_4_abb_ha_01`, pbgid 2135413)

| Damage | Attack speed | Range (min–max) |
| --- | --- | --- |
| 19 | 1.375 | 0–0.2875 |

Modifiers:

- meleeAttack +19 vs cavalry (passive)

Durations: aim 0, windup 0.5, attack 0.125, winddown 0, reload 0, setup 0, teardown 0, cooldown 0.75

**Torch** — fire (`weapon_torch_horseman`, pbgid 127935)

| Damage | Attack speed | Range (min–max) |
| --- | --- | --- |
| 10 | 2.125 | 0–1.25 |

Durations: aim 0, windup 0.75, attack 0.125, winddown 0, reload 0, setup 0, teardown 0, cooldown 1.25

**Bow** — ranged (`weapon_mamluk_ranged_4_abb_ha_01`, pbgid 2135415)

| Damage | Attack speed | Range (min–max) |
| --- | --- | --- |
| 11 | 1.25 | 0–4.5 |

Durations: aim 0, windup 0, attack 0.125, winddown 0.5, reload 0.625, setup 0, teardown 0, cooldown 0

**Sight:** base 23.6, line 38, height 10 (inner radius 14 / height 10, outer radius 38 / height -15)

---

Source: autogenerated AoE4 data — see https://data.aoe4world.com/. Regenerate with `python3 scripts/units_to_markdown.py`.
