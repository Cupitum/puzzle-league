#!/usr/bin/env python3
"""Prepare minimal disposable Supabase auth + PostgREST local project config.
Never reads secrets or modifies the original config.
"""
import re
import secrets
import sys
from pathlib import Path


def section_value(text, section, key, value):
    pattern = re.compile(r'(?ms)^(\[' + re.escape(section) + r'\]\s*\n)(.*?)(?=^\[|\Z)')
    m = pattern.search(text)
    if not m:
        raise ValueError('Missing local configuration section: ' + section)
    body = m.group(2)
    key_pattern = re.compile(r'(?m)^\s*' + re.escape(key) + r'\s*=\s*[^\n]*$')
    if len(key_pattern.findall(body)) != 1:
        raise ValueError('Missing/duplicate local configuration key')
    body = key_pattern.sub(key + ' = ' + value, body)
    return text[:m.start(2)] + body + text[m.end(2):]


def transform(text, project, shift):
    if not re.fullmatch(r'pzlauth_[a-f0-9]{8}', project):
        raise ValueError('Invalid isolated project name')
    if shift < 2300 or shift > 3900:
        raise ValueError('Invalid private port shift')
    text, replacements = re.subn(r'(?m)^project_id\s*=\s*"[^"]+"\s*$',
        f'project_id = "{project}"', text)
    if replacements != 1:
        raise ValueError('Local project ID must be unique')
    states = {'api':'true','auth':'true','realtime':'false','studio':'false',
              'local_smtp':'false','storage':'false','edge_runtime':'false',
              'analytics':'false'}
    for section, enabled in states.items():
        text = section_value(text, section, 'enabled', enabled)
    # Local-only automatic confirmation to avoid external email. Synthetic .invalid accounts only.
    text = section_value(text, 'auth.email', 'enable_confirmations', 'false')
    text, count = re.subn(r'(?m)^(\s*(?:port|shadow_port|inspector_port|smtp_port|pop3_port)\s*=\s*)(\d+)(\b)',
        lambda m: m.group(1) + str(int(m.group(2)) + shift) + m.group(3), text)
    if count < 5:
        raise ValueError('Insufficient local service port remaps')
    return text


def main():
    if len(sys.argv) != 4:
        raise SystemExit('Usage: make_live_auth_config.py SOURCE DESTINATION pzlauth_XXXXXXXX')
    inp, out, project = Path(sys.argv[1]), Path(sys.argv[2]), sys.argv[3]
    if out.exists() or out.is_symlink():
        raise SystemExit('Refusing to overwrite sandbox config')
    out.write_text(transform(inp.read_text('utf-8'), project, 2300 + secrets.randbelow(1601)), encoding='utf-8')
    out.chmod(0o600)

if __name__ == '__main__':
    main()
