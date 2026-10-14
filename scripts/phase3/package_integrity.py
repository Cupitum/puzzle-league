#!/usr/bin/env python3
"""Check all thirty-five original research hashes; do not change Phase 1 files."""
from __future__ import annotations
import hashlib
import json
from pathlib import Path
ROOT=Path(__file__).resolve().parents[2]
manifest=json.loads((ROOT/'research/phase1-sha256-manifest.json').read_text())
base=ROOT/'research/phase1-approved-local-poc'
for relative,digest in manifest.items():
    actual=hashlib.sha256((base/relative).read_bytes()).hexdigest()
    if actual!=digest:
        raise RuntimeError(f'Research file changed: {relative}')
print(f'PASS: {len(manifest)} preserved Phase 1 research hashes')
