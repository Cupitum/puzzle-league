import test from 'node:test';
import assert from 'node:assert/strict';
import {assessRemainingRow,EVIDENCE,normalizeClue} from '../remaining-evidence-core.mjs';
import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {resolve,dirname} from 'node:path';
const repo=resolve(dirname(fileURLToPath(import.meta.url)),'../../..');
const source=readFileSync(resolve(repo,'scripts/phase6/remaining-results.mjs'),'utf8');
const defaultRow={review_status:'pending',award_count:0,decision_count:0,review_count:1,
  identity_key:null,puzzle_day:null,mode:null,verification_state:null,parse_status:'recognized_valid'};
const w={...defaultRow,game_id:'wordle',raw_share_text:'Wordle 1,946 1/6\n🟩🟩🟩🟩🟩'};
const mc={...defaultRow,game_id:'minute_cryptic',raw_share_text:'Minute Cryptic - 17 October, 2026\n“Fudge: best idea when you have high blood sugar?” (8)\n🏆 0 hints - 1 under the community par (234,567 solvers so far).\nTime: 12s'};
const fox={...defaultRow,game_id:'foximax',raw_share_text:'🦊#FoxiMax #1512 1/8 (5 letters)\n🟩🟩🟩🟩🟩'};
test('evidence references never assert FoxiMax date',()=>{assert.equal(EVIDENCE.foximax.day,null);assert.equal(EVIDENCE.wordle.day,'2026-10-17');assert.equal(EVIDENCE.minute_cryptic.day,'2026-10-17')});
test('Wordle 1946 independently corroborated date is advisory only',()=>{const a=assessRemainingRow(w);assert.equal(a.corroborated_day,'2026-10-17');assert.equal(a.eligible_for_auto_approval,false);assert.equal(a.decision,'RETAIN_PENDING_NO_AWARD');assert.equal(a.awarded,false)});
test('publisher clue exact match is recognised without awarding',()=>{const a=assessRemainingRow(mc);assert.equal(a.publisher_clue_match,true);assert.equal(a.decision,'RETAIN_PENDING_NO_AWARD')});
test('different Minute Cryptic clue never silently considered matched',()=>{const a=assessRemainingRow({...mc,raw_share_text:mc.raw_share_text.replace('Fudge: best idea when you have high blood sugar?','Different clue')});assert.equal(a.publisher_clue_match,false);assert.ok(a.issues.includes('official_clue_not_matched'))});
test('FoxiMax 1512 stays date/mode-unverified with no award',()=>{const a=assessRemainingRow(fox);assert.equal(a.corroborated_day,null);assert.ok(a.issues.includes('no_verified_puzzle_date_mapping'));assert.equal(a.awarded,false)});
test('non-original FoxiMax denominator fails policy',()=>{const a=assessRemainingRow({...fox,raw_share_text:fox.raw_share_text.replace('1/8','1/7')});assert.ok(a.issues.includes('foximax_unsupported_variant'));assert.equal(a.eligible_for_auto_approval,false)});
test('historical decisions and awards flag blockers',()=>{const a=assessRemainingRow({...w,decision_count:1,award_count:1});assert.ok(a.issues.includes('existing_awards'));assert.ok(a.issues.includes('existing_moderation_decisions'))});
test('unexpected puzzle date conflict is flagged',()=>{const a=assessRemainingRow({...w,puzzle_day:'2026-10-16'});assert.ok(a.issues.includes('stored_day_conflicts_with_evidence'))});
test('normalised clue retains word identity',()=>{assert.equal(normalizeClue('“Fudge: best idea when you have high blood sugar?” (8)'),normalizeClue('"Fudge: best idea when you have high blood sugar?" (8)'))});
test('read only script forbids executable write and exposes no approval flow',()=>{
 assert.match(source,/BEGIN TRANSACTION READ ONLY/g);
 assert.doesNotMatch(source,/\b(?:UPDATE|INSERT|DELETE|TRUNCATE|CREATE|DROP)\s+(?:TABLE|FROM|INTO|public\.|app_private\.)/iu);
 assert.match(source,/monitored application table fingerprints unchanged/);
 assert.match(source,/2f01d63/);
});
