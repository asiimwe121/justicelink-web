#!/usr/bin/env python3
"""Prints overall instruction coverage from target/site/jacoco/jacoco.csv and a suggested pom.xml floor.
Usage: python3 scripts/jacoco-summary.py [path/to/jacoco.csv]   (also appends to $GITHUB_STEP_SUMMARY when set)"""
import csv, os, sys

path = sys.argv[1] if len(sys.argv) > 1 else "target/site/jacoco/jacoco.csv"
if not os.path.exists(path):
    sys.exit(f"{path} not found: run `mvn verify` first")

covered = missed = 0
rows = []
with open(path, newline="") as f:
    for r in csv.DictReader(f):
        c, m = int(r["INSTRUCTION_COVERED"]), int(r["INSTRUCTION_MISSED"])
        covered += c
        missed += m
        total = c + m
        rows.append((m, f'{r["PACKAGE"]}.{r["CLASS"]}', c / total if total else 1.0))

total = covered + missed
ratio = covered / total if total else 0.0
floor = max(0.0, round(ratio - 0.03, 2))
lines = [f"Instruction coverage: {ratio:.1%} ({covered}/{total})",
         f"Suggested <minimum> in pom.xml: {floor:.2f}",
         "Least covered classes (most missed instructions):"]
lines += [f"  {name}: {pct:.0%} ({m} missed)" for m, name, pct in sorted(rows, reverse=True)[:10]]
out = "\n".join(lines)
print(out)
summary = os.environ.get("GITHUB_STEP_SUMMARY")
if summary:
    with open(summary, "a") as fh:
        fh.write("### Coverage\n```\n" + out + "\n```\n")
