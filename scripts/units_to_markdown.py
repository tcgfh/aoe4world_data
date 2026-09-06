#!/usr/bin/env python3
"""Convert per-civ unit JSON files into human-readable markdown pages.

Usage: python3 scripts/units_to_markdown.py <civ-folder> <output-folder>
Example: python3 scripts/units_to_markdown.py units/templar docs/units/templar
"""

import json
import os
import sys
from collections import defaultdict

ROMAN = {1: "I", 2: "II", 3: "III", 4: "IV"}
AGE_NAMES = {1: "Dark", 2: "Feudal", 3: "Castle", 4: "Imperial"}
RESOURCES = ["food", "wood", "stone", "gold"]


def age_label(age):
    return f"{ROMAN.get(age, age)} ({AGE_NAMES[age]})" if age in AGE_NAMES else str(age)


def cost_line(costs):
    parts = [f"{costs[r]} {r}" for r in RESOURCES if costs.get(r)]
    text = " + ".join(parts) if parts else "free"
    if len(parts) > 1:
        text += f" (total {costs.get('total', 0)})"
    return text


def fmt(value):
    if isinstance(value, float) and value.is_integer():
        return str(int(value))
    return str(value)


def weapon_range(weapon):
    r = weapon.get("range", {})
    return f"{fmt(r.get('min', 0))}–{fmt(r.get('max', 0))}"


def describe_target(target):
    bits = []
    for group in target.get("class", []):
        bits.append(" ".join(group))
    if target.get("id"):
        bits.extend(target["id"] if isinstance(target["id"], list) else [target["id"]])
    return ", ".join(bits) or "all"


def modifier_lines(weapon):
    lines = []
    for m in weapon.get("modifiers", []):
        value = m.get("value")
        effect = m.get("effect", "change")
        sign = "+" if effect == "change" and isinstance(value, (int, float)) and value >= 0 else ""
        prefix = "x" if effect == "multiply" else sign
        lines.append(
            f"- {m.get('property', 'attack')} {prefix}{fmt(value)} vs {describe_target(m.get('target', {}))}"
            f" ({m.get('type', 'passive')})"
        )
    return lines


def render_weapon(weapon):
    out = [
        f"**{weapon['name']}** — {weapon['type']}"
        f" (`{weapon.get('attribName', '')}`, pbgid {weapon.get('pbgid', '')})",
        "",
        "| Damage | Attack speed | Range (min–max) |",
        "| --- | --- | --- |",
        f"| {fmt(weapon['damage'])} | {fmt(weapon['speed'])} | {weapon_range(weapon)} |",
        "",
    ]
    if weapon.get("burst"):
        burst = weapon["burst"]
        out.append("Burst: " + ", ".join(f"{k} {fmt(val)}" for k, val in burst.items()))
        out.append("")
    mods = modifier_lines(weapon)
    if mods:
        out.append("Modifiers:")
        out.append("")
        out.extend(mods)
        out.append("")
    d = weapon.get("durations", {})
    if d:
        out.append("Durations: " + ", ".join(f"{k} {fmt(v)}" for k, v in d.items()))
        out.append("")
    return out


def render_variation(v):
    out = [f"### {v['name']} (Age {ROMAN.get(v['age'], v['age'])})", ""]
    rows = [
        ("ID", f"`{v['id']}`"),
        ("pbgid", v.get("pbgid", "")),
        ("attribName", f"`{v.get('attribName', '')}`"),
        ("Hitpoints", fmt(v.get("hitpoints", 0))),
        ("Cost", cost_line(v.get("costs", {}))),
        ("Build time", f"{fmt(v.get('costs', {}).get('time', 0))}s"),
        ("Population", fmt(v.get("costs", {}).get("popcap", 0))),
        ("Produced by", ", ".join(v.get("producedBy", [])) or "—"),
        ("Movement speed", fmt(v.get("movement", {}).get("speed", 0))),
        (
            "Armor",
            ", ".join(f"{a['type'].capitalize()} {fmt(a['value'])}" for a in v.get("armor", []))
            or "none",
        ),
    ]
    if v.get("resistance"):
        rows.append(
            (
                "Resistance",
                ", ".join(
                    f"{r['type'].capitalize()} {fmt(r['value'])}%" for r in v["resistance"]
                ),
            )
        )
    if v.get("garrison"):
        g = v["garrison"]
        classes = ", ".join(g.get("classes", []))
        rows.append(
            ("Garrison", f"capacity {fmt(g.get('capacity', 0))}" + (f" ({classes})" if classes else ""))
        )
    rows.append(("Icon", v.get("icon", "")))

    out.append("| Field | Value |")
    out.append("| --- | --- |")
    out.extend(f"| {k} | {val} |" for k, val in rows)
    out.append("")

    for weapon in v.get("weapons", []):
        out.extend(render_weapon(weapon))

    s = v.get("sight", {})
    if s:
        out.append(
            f"**Sight:** base {fmt(s.get('base', 0))}, line {fmt(s.get('line', 0))},"
            f" height {fmt(s.get('height', 0))}"
            f" (inner radius {fmt(s.get('inner_radius', 0))} / height {fmt(s.get('inner_height', 0))},"
            f" outer radius {fmt(s.get('outer_radius', 0))} / height {fmt(s.get('outer_height', 0))})"
        )
        out.append("")
    return out


def summary_table(variations):
    header = [
        "| Age | Name | ID | Hitpoints | Armor | Weapon | Damage | Attack speed | Range | Move speed |",
        "| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |",
    ]
    rows = []
    for v in variations:
        armor = (
            ", ".join(f"{a['type'][0].upper()}{fmt(a['value'])}" for a in v.get("armor", []))
            or "—"
        )
        weapons = v.get("weapons", [])
        w = weapons[0] if weapons else None
        rows.append(
            f"| {ROMAN.get(v['age'], v['age'])} | {v['name']} | `{v['id']}` |"
            f" {fmt(v.get('hitpoints', 0))} | {armor} |"
            f" {w['name'] if w else '—'} | {fmt(w['damage']) if w else '—'} |"
            f" {fmt(w['speed']) if w else '—'} | {weapon_range(w) if w else '—'} |"
            f" {fmt(v.get('movement', {}).get('speed', 0))} |"
        )
    return header + rows


def render_unit(base_id, variations, civ_name):
    variations = sorted(variations, key=lambda v: v["age"])
    first = variations[0]
    title = first["name"]
    desc_lines = [line.strip() for line in first["description"].split("\n") if line.strip()]
    body, bullets = desc_lines[:1], desc_lines[1:]

    out = [f"# {title}", ""]
    out.extend(body + [""])
    for b in bullets:
        if b.startswith("+"):
            out.append(f"- **+** {b.lstrip('+').strip()}")
        elif b.startswith("-"):
            out.append(f"- **−** {b.lstrip('-').strip()}")
        else:
            out.append(f"- {b}")
    if bullets:
        out.append("")
    out.append(f"![{title}]({first.get('icon', '')})")
    out.append("")

    out.append("## Overview")
    out.append("")
    out.append("| Field | Value |")
    out.append("| --- | --- |")
    out.append(f"| ID | `{base_id}` |")
    out.append(f"| Type | {first.get('type', 'unit').capitalize()} |")
    out.append(f"| Civilization | {civ_name} ({', '.join(first.get('civs', []))}) |")
    out.append(f"| Unique | {'Yes' if first.get('unique') else 'No'} |")
    out.append(f"| Display class | {', '.join(first.get('displayClasses', [])) or '—'} |")
    out.append(f"| Minimum age | {age_label(first['age'])} |")
    out.append(f"| Produced by | {', '.join(first.get('producedBy', [])) or '—'} |")
    out.append("")
    out.append(f"**Classes:** {', '.join(first.get('classes', []))}")
    out.append("")

    out.append("## Variations")
    out.append("")
    if len(variations) > 1:
        out.extend(summary_table(variations))
        out.append("")
        costs = {json.dumps(v.get("costs", {}), sort_keys=True) for v in variations}
        if len(costs) == 1:
            c = variations[0].get("costs", {})
            out.append(
                f"Cost is identical at every age: **{cost_line(c)}**,"
                f" **{fmt(c.get('time', 0))}s** build time, **{fmt(c.get('popcap', 0))}** population."
            )
            out.append("")

    for v in variations:
        out.extend(render_variation(v))

    out.append("---")
    out.append("")
    out.append(
        "Source: autogenerated AoE4 data — see https://data.aoe4world.com/. "
        "Regenerate with `python3 scripts/units_to_markdown.py`."
    )
    out.append("")
    return "\n".join(out)


def main():
    src = sys.argv[1] if len(sys.argv) > 1 else "units/templar"
    dst = sys.argv[2] if len(sys.argv) > 2 else "docs/units/templar"
    civ_name = sys.argv[3] if len(sys.argv) > 3 else "Knights Templar"

    groups = defaultdict(list)
    for fname in sorted(os.listdir(src)):
        if not fname.endswith(".json"):
            continue
        with open(os.path.join(src, fname)) as f:
            data = json.load(f)
        groups[data["baseId"]].append(data)

    os.makedirs(dst, exist_ok=True)
    written = []
    for base_id, variations in sorted(groups.items()):
        path = os.path.join(dst, f"{base_id}.md")
        with open(path, "w") as f:
            f.write(render_unit(base_id, variations, civ_name))
        written.append((base_id, sorted(variations, key=lambda v: v["age"])[0]["name"], path))

    index = [f"# {civ_name} units", "", f"{len(written)} units.", "", "| Unit | Page |", "| --- | --- |"]
    for base_id, name, path in written:
        index.append(f"| {name} | [`{base_id}.md`](./{base_id}.md) |")
    index.append("")
    with open(os.path.join(dst, "README.md"), "w") as f:
        f.write("\n".join(index))

    print(f"Wrote {len(written)} unit pages to {dst}")


if __name__ == "__main__":
    main()
