"""Offline independently checked contract for exact source archive baseline."""
from __future__ import annotations
import hashlib
from pathlib import Path
ROOT=Path(__file__).resolve().parents[2]
expected={
 'supabase/migrations/20261012170000_phase3_block1_core_schema.sql':'fb1f8843b92d47507712e6ad971549c6a95ed7d2ff69d072f8f183613c2ec1ba',
 'supabase/migrations/20261013220000_phase3_block2_auth_profiles.sql':'4ffdd83fef39de822800d9b4f13dbfb394738e285c2b66aa7c781236d52bec8b',
 'supabase/migrations/20261013220100_phase3_block2_rls_read_access.sql':'aa002b34eea0a2c7622e17334564faa8408ab4ba2ed69d74aa8306be70c5f193',
 'supabase/migrations/20261013220200_phase3_block2_league_permissions.sql':'292de0d137c751337e123a97c490c044a28104d9505cb4a0d1b2843f94b262f7',
}
for rel, digest in expected.items():
    if hashlib.sha256((ROOT/rel).read_bytes()).hexdigest()!=digest:
        raise RuntimeError(f'Applied baseline migration was modified: {rel}')
print('PASS: four previously applied migrations remain byte-identical')
