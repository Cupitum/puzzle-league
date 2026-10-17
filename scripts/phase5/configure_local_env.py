#!/usr/bin/env python3
"""Create a git-ignored local PUBLIC browser config without printing CLI secrets.

Never writes service-role/secret keys. Refuses to overwrite existing .env.local.
Must run from the existing Puzzle_League repo (Linux VM).
"""
from __future__ import annotations

import base64
import json
import os
from pathlib import Path
import re
import subprocess
import sys


def parse_status(output: str) -> tuple[str, str]:
    values: dict[str, str] = {}
    for line in output.splitlines():
        match = re.fullmatch(r"\s*([A-Z_]+)=(.*)\s*", line)
        if match:
            values[match.group(1)] = match.group(2).strip().strip("\"'")
    url = values.get("API_URL", "")
    if url not in ("http://127.0.0.1:54321", "http://localhost:54321"):
        raise ValueError("Local API URL not found at expected loopback port 54321")
    key = (values.get("PUBLISHABLE_KEY") or values.get("SUPABASE_PUBLISHABLE_KEY")
           or values.get("ANON_KEY") or "")
    if key.startswith("sb_publishable_") and len(key) > len("sb_publishable_"):
        return url, key
    # Legacy local ANON_KEY is a JWT. Reject service_role and non-anon claims.
    parts = key.split(".")
    if len(parts) != 3:
        raise ValueError("No verified public publishable/anon key available")
    try:
        padded = parts[1] + "=" * (-len(parts[1]) % 4)
        claims = json.loads(base64.urlsafe_b64decode(padded))
    except (ValueError, UnicodeError) as exc:
        raise ValueError("Could not inspect local public key role") from exc
    if claims.get("role") != "anon":
        raise ValueError("Refusing to put a privileged key in Vite configuration")
    return url, key


def main() -> int:
    repo = Path(__file__).resolve().parents[2]
    target = repo / ".env.local"
    if target.exists():
        print("SKIPPED: .env.local already exists. Edit it manually if values need correction; no file was overwritten.")
        return 0
    ignore = subprocess.run(["git", "check-ignore", "-q", ".env.local"], cwd=repo, check=False)
    if ignore.returncode != 0:
        print("BLOCKED: .env.local is not git-ignored. Refusing to create a key file.", file=sys.stderr)
        return 1
    completed = subprocess.run(["npx", "--no-install", "supabase", "status", "-o", "env"],
                               cwd=repo, text=True, capture_output=True, check=False)
    if completed.returncode:
        print("BLOCKED: local Supabase status unavailable. Start/repair local Supabase first. No credentials printed.", file=sys.stderr)
        return 1
    try:
        url, key = parse_status(completed.stdout)
    except ValueError as exc:
        print(f"BLOCKED: {exc}. No credentials printed.", file=sys.stderr)
        return 1
    content = (f"# LOCAL browser-visible values ONLY. Never commit this file.\n"
               f"VITE_SUPABASE_URL={url}\n"
               f"VITE_SUPABASE_PUBLISHABLE_KEY={key}\n")
    old_umask = os.umask(0o077)
    try:
        with target.open("x", encoding="utf-8") as output:
            output.write(content)
    except FileExistsError:
        print("SKIPPED: .env.local already exists. No file was overwritten.")
        return 0
    finally:
        os.umask(old_umask)
    print("PASS: created ignored .env.local with local API URL and public-only key (credentials not displayed).")
    print("NEXT: restart Vite, then close/reopen the installed Android app. Keep ADB reverse 5173 and 54321 active.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
