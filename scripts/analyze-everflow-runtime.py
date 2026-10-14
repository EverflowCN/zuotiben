#!/usr/bin/env python3
"""Compare direct Everflow packages to pinned BusyTeX manifests, without compiling."""
from pathlib import Path
import re
import json
from collections import Counter
from datetime import datetime, timezone

ROOT = Path(__file__).resolve().parent.parent
RUNTIME = ROOT / "latex/browser-test/core/busytex"
OUT = ROOT / "latex/deploy"
NAMES = (
    "adjustbox afterpage amsmath amssymb array bbding bm calc caption "
    "ctex enumitem eso-pic etoolbox expl3 fancyhdr filehook fontawesome5 "
    "fontspec geometry graphicx hyperref iftex keyval lastpage listings "
    "multicol multirow needspace newtxmath newunicodechar pgffor pgfkeys "
    "pgfmath pifont qrcode romannum tabularx tikz tikzpagenodes titlesec "
    "titletoc titling truncate unicode-math varwidth xcolor xeCJK "
    "xeCJKfntef xfp xkeyval xparse zhnumber"
).split()
LOCAL = ["core/examzh/exam-zh-font", "everflow-fonts"]
REGEX = re.compile(r"\\Provides(?:Expl)?(?:Package|Class|File)\{([^}]+)\}")
TIERS = ("basic", "recommended", "extra")

def main():
    sources = {}
    for tier in TIERS:
        name = f"texlive-{tier}.js.providespackage.txt"
        p = RUNTIME / name
        if not p.is_file():
            raise SystemExit("Missing pinned TeX Live manifest: " + str(p))
        content = p.read_text(encoding="utf-8", errors="replace")
        packages = {v.lower().strip() for v in REGEX.findall(content)}
        if len(packages) < 10:
            raise SystemExit(f"Unexpected empty manifest {name}: {len(packages)}")
        sources[tier] = packages
    rows = []
    for name in [*NAMES, *LOCAL]:
        tier = "local" if name in LOCAL else next((t for t in TIERS if name.lower() in sources[t]), "unlisted")
        rows.append({"name": name, "tier": tier})
    tally = Counter(row["tier"] for row in rows)
    report = {
        "source": "Everflow original 173-file Exam/Book/Public ZIP static scan",
        "compiler": "TeXlyre BusyTeX / TeX Live 2026 pinned release",
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "compile_verified": False,
        "counts": dict(tally),
        "total_direct_packages_including_local": len(rows),
        "packages": rows,
        "note": "This is a TeX ProvidesPackage inventory, not a guarantee of actual availability, fonts or successful browser compilation."
    }
    OUT.mkdir(parents=True, exist_ok=True)
    (OUT / "everflow-package-coverage.json").write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf8")
    lines = [
        "# Everflow 模板：TeX Live 2026 GitHub 资源覆盖明细",
        "",
        "三个 BusyTeX 资源包中的 ProvidesPackage 静态声明，非浏览器编译结果。",
        "",
        "| 资源档位 | 宏包数量 |",
        "| --- | ---: |",
        *[f"| {name} | {tally.get(name,0)} |" for name in (*TIERS,"local","unlisted")],
        "",
        "| 宏包 | 归属 |",
        "| --- | --- |",
        *[f"| {row['name']} | {row['tier']} |" for row in rows],
        "",
        "未直接匹配声明的宏包，不等于一定缺失；请查看实际 XeLaTeX 日志。",
    ]
    (OUT / "everflow-package-coverage.md").write_text("\n".join(lines) + "\n", encoding="utf8")
    print("Everflow static package inventory against BusyTeX:", dict(tally))
    print("Unlisted:", [row["name"] for row in rows if row["tier"] == "unlisted"])

if __name__ == "__main__":
    main()
