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


def wide_pages(path, total):
    """Return numbered non-A4-width pages without revealing page contents."""
    metadata = run("pdfinfo", "-box", "-f", "1", "-l", str(total), str(path))
    sizes = re.findall(r"^Page\s+(\d+)\s+size:\s*([\d.]+)\s+x\s+([\d.]+)", metadata, flags=re.M)
    return [int(number) for number, width, height in sizes
            if float(width) > 900 and float(height) > 700]


def layout_metadata(path):
    # Only font family labels and numeric image geometry leave the runner.
    font_rows = run("pdffonts", str(path)).splitlines()[2:]
    fonts = sorted(set(re.sub(r"^[A-Z]{6}\+", "", line.split()[0])
                       for line in font_rows if line.strip()))
    images = []
    for line in run("pdfimages", "-list", str(path)).splitlines()[2:]:
        row = line.split()
        if len(row) >= 5 and row[0].isdigit() and row[3].isdigit() and row[4].isdigit():
            images.append({"page": int(row[0]), "width": int(row[3]), "height": int(row[4])})
    return {"font_families": fonts, "image_geometry": images}


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("local_pdf")
    parser.add_argument("browser_pdf")
    opts = parser.parse_args()
    a, b = Path(opts.local_pdf), Path(opts.browser_pdf)
    if not a.is_file() or not b.is_file():
        raise SystemExit("Private PDF file absent")
    loc, web = pages(a), pages(b)
    loc_wide, web_wide = wide_pages(a, len(loc)), wide_pages(b, len(web))
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
    aligned = [overlap(a5[i], b5[i]) for i in range(min(len(a5), len(b5)))]
    first_divergence = next((i + 1 for i, score in enumerate(aligned) if score < 0.95), None)
    mapping = []
    for i, sig in enumerate(a5):
        if not sig:
            continue
        candidates = [(j, overlap(sig, b5[j])) for j in
                      range(max(0, i - 3), min(len(b5), i + 4))]
        if candidates:
            j, score = max(candidates, key=lambda item: item[1])
            if j != i:
                mapping.append({"local_page": i + 1, "browser_page": j + 1,
                                "similarity": score})
    native_meta, browser_meta = layout_metadata(a), layout_metadata(b)
    report = {
        "native_layout_metadata": native_meta,
        "browser_layout_metadata": browser_meta,
        "font_family_sets_equal": native_meta["font_families"] == browser_meta["font_families"],
        "privacy": "aggregate-only; no content or private source printed",
        "first_same_index_text_divergence_page": first_divergence,
        "same_index_page_similarities": aligned,
        "shifted_best_matches": mapping,
        "local_page_chars": list(map(len, loc)),
        "browser_page_chars": list(map(len, web)),
        "local_pages": len(loc),
        "browser_pages": len(web),
        "page_count_delta_browser_minus_local": len(web) - len(loc),
        "local_wide_page_numbers": loc_wide,
        "browser_wide_page_numbers": web_wide,
        "local_final_page_chars": len(loc[-1]),
        "browser_final_page_chars": len(web[-1]),
        "suspected_missing_spread_page": (len(loc) == len(web) + 1 and
                                          (len(loc) in loc_wide) and
                                          (len(web) not in web_wide)),
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
