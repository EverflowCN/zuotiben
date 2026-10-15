#!/usr/bin/env python3
"""Compile a private Exam reference without printing TeX output or source."""
import json
import os
from pathlib import Path
import re
import subprocess

def main():
    root = Path(os.environ["INPUT_DIR"]).resolve()
    out = Path(os.environ["PRIVATE_REFERENCE_DIR"]).resolve()
    out.mkdir(parents=True, exist_ok=False)
    if not (root / "Everflow-Exam.tex").is_file():
        raise SystemExit("Private Exam entrypoint unavailable")
    command = ["xelatex", "-no-shell-escape", "-interaction=nonstopmode",
               "-halt-on-error", "-file-line-error",
               "-output-directory=" + str(out), "Everflow-Exam.tex"]
    for number in (1, 2):
        try:
            result = subprocess.run(command, cwd=root, stdout=subprocess.PIPE,
                                    stderr=subprocess.STDOUT, timeout=240)
        except subprocess.TimeoutExpired:
            raise SystemExit("Private reference timed out; output redacted")
        pdf = out / "Everflow-Exam.pdf"
        if result.returncode or not pdf.is_file():
            raise SystemExit("Private reference failed; compiler output redacted")
        copy = out / ("exam-pass-" + str(number) + ".pdf")
        copy.write_bytes(pdf.read_bytes())
        info = subprocess.run(["pdfinfo", str(copy)], check=True,
                              stdout=subprocess.PIPE, stderr=subprocess.PIPE).stdout
        match = re.search(rb"^Pages:\s*(\d+)", info, re.M)
        print("PRIVATE_REFERENCE " + json.dumps({
            "pass": number, "pages": int(match.group(1)) if match else None
        }))

if __name__ == "__main__":
    main()
