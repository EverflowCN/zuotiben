#!/usr/bin/env python3
"""Compare two PRIVATE PDFs by page structure without printing PDF text.

This report intentionally discloses only page counts and similarity statistics.
Both files must remain temporary; never upload them as public Actions artifacts.
"""
import argparse
import json
import re
import subprocess
import unicodedata
from pathlib import Path


def run(*args):
    p = subprocess.run(args, stdout=subprocess.PIPE, stderr=subprocess.PIPE,
                       check=False, timeout=45)
    if p.returncode:
        raise SystemExit("Private PDF inspection failed; PDF text/log redacted")
    return p.stdout.decode("utf-8", "replace")


def pages(path):
    info = run("pdfinfo", str(path))
    match = re.search(r"^Pages:\s*(\d+)\s*$", info, flags=re.M)
    if not match:
        raise SystemExit("Unable to identify PDF pages")
    total = int(match.group(1))
    if not 1 <= total <= 1000:
        raise SystemExit("Invalid PDF page count")
    output = []
    for i in range(1, total + 1):
        body = run("pdftotext", "-f", str(i), "-l", str(i),
                   "-layout", "-enc", "UTF-8", str(path), "-")
        output.append("".join(unicodedata.normalize("NFKC", body).split()))
    return output


def grams(source, size=5):
    return {source[j:j + size] for j in range(max(len(source) - size + 1, 0))}


def overlap(left, right):
    if not left or not right:
        return 1.0 if not left and not right else 0.0
    shared = len(left & right)
    return round(2 * shared / (len(left) + len(right)), 4)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("local_pdf")
    parser.add_argument("browser_pdf")
    opts = parser.parse_args()
    a, b = Path(opts.local_pdf), Path(opts.browser_pdf)
    if not a.is_file() or not b.is_file():
        raise SystemExit("Private PDF file absent")
    loc, web = pages(a), pages(b)
    a5, b5 = list(map(grams, loc)), list(map(grams, web))
    matched = []
    low = []
    for i, sig in enumerate(a5):
        nearby = [(j, overlap(sig, b5[j]))
                  for j in range(max(0, i - 3), min(len(b5), i + 4))]
        if not nearby:
            continue
        best = max(nearby, key=lambda p: p[1])
        matched.append(best[1])
        if best[1] < 0.50:
            low.append({"local_page": i + 1, "nearest_browser_page": best[0] + 1,
                        "similarity": best[1]})
    report = {
        "privacy": "aggregate-only; no content or private source printed",
        "local_pages": len(loc),
        "browser_pages": len(web),
        "page_count_equal": len(loc) == len(web),
        "local_extracted_chars": sum(map(len, loc)),
        "browser_extracted_chars": sum(map(len, web)),
        "page_similarities_mean": round(sum(matched) / len(matched), 4) if matched else 0,
        "low_similarity_pages": low[:12],
        "low_similarity_page_count": len(low),
        "possible_cause": ("font metrics, line/page breaking, or pass-count; "
                           "do not add or delete a page without finding divergence")
    }
    print("EVERFLOW_PARITY_REPORT " + json.dumps(report, separators=(",", ":")))


if __name__ == "__main__":
    main()
