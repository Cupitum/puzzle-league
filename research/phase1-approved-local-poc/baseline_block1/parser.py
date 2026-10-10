"""Puzzle League Phase 1 Block 1: conservative, dependency-free sample parser.
No scoring, authentication, duplicate enforcement or league eligibility here.
"""
from __future__ import annotations
import json, re, sys
from datetime import date, datetime

VERSION = '0.1.0-poc'
HEADER = re.compile(r'^\[(\d{2}:\d{2}), (\d{2}/\d{2}/\d{4})\] ([^:\n]+): ?(.*)$')
WORDLE = re.compile(r'^Wordle ([\d,]+) ([1-6X])/6\s*$', re.I)
MC = re.compile(r'^Minute Cryptic - (\d{1,2}) ([A-Za-z]+), (\d{4})$')
MC_RESULT = re.compile(r'^[🏆🤝]\s*(\d+) hints?\s*[–-]\s*(?:(\d+) (under|over) the community par|matched the community par)\s*\(([\d,]+) solvers so far\)\.?(?:\s*Time:\s*([^\n]+))?\.?$', re.I)
GRID = {'🟩','🟨','⬛','⬜'}

def split_messages(text):
    parts=[]; current=None
    for line in text.splitlines():
        m=HEADER.match(line)
        if m:
            if current: parts.append(current)
            current={'transport':{'time':m.group(1),'date':m.group(2),'sender':m.group(3)},'text':m.group(4)}
        elif current:
            current['text']+='\n'+line
    if current: parts.append(current)
    if not parts and text.strip(): parts=[{'transport':None,'text':text.strip()}]
    return parts

def result(game,status,raw,fields=None,issues=None):
    return {'parser_version':VERSION,'game':game,'status':status,'raw_text':raw,'fields':fields or {},'issues':issues or [],'scoring_eligible':False}

def parse_share(raw):
    raw=raw.strip(); lines=[x.strip() for x in raw.splitlines() if x.strip()]
    if not lines: return result(None,'invalid',raw,issues=['empty_input'])
    m=WORDLE.fullmatch(lines[0])
    if m:
        n=int(m.group(1).replace(',','')); tries=m.group(2).upper(); grids=[]
        for line in lines[1:]:
            if line.startswith('https://') or line.startswith('http://'): continue
            symbols=re.findall('🟩|🟨|⬛|⬜',line)
            if len(symbols)!=5 or ''.join(symbols)!=line:
                return result('wordle','invalid',raw,issues=['unexpected_grid_content'])
            grids.append(symbols)
        if len(grids)!=(6 if tries=='X' else int(tries)):
            return result('wordle','invalid',raw,issues=['row_count_mismatch'])
        if tries!='X' and grids[-1]!=['🟩']*5:
            return result('wordle','invalid',raw,issues=['winning_row_missing'])
        if tries=='X' and ['🟩']*5 in grids:
            return result('wordle','invalid',raw,issues=['failed_result_contains_win'])
        if n<=0: return result('wordle','invalid',raw,issues=['invalid_puzzle_number'])
        return result('wordle','recognized_valid',raw,{'puzzle_number':n,'attempts':None if tries=='X' else int(tries),'completed_failure':tries=='X','grid':grids,'puzzle_date':None},['puzzle_date_not_verified'])
    m=MC.fullmatch(lines[0])
    if m:
        try: day=date.fromisoformat(f'{int(m.group(3)):04d}-{datetime.strptime(m.group(2),"%B").month:02d}-{int(m.group(1)):02d}')
        except (ValueError,AttributeError): return result('minute_cryptic','invalid',raw,issues=['invalid_puzzle_date'])
        if len(lines)<4 or not re.fullmatch(r'["“].+["”]\s*\([\d, ]+\)',lines[1]):
            return result('minute_cryptic','ambiguous',raw,issues=['clue_or_format_not_recognized'])
        match=next((MC_RESULT.fullmatch(x) for x in lines[2:] if MC_RESULT.fullmatch(x)),None)
        if not match: return result('minute_cryptic','ambiguous',raw,issues=['community_par_line_not_recognized'])
        hint=int(match.group(1)); under=int(match.group(2)) if match.group(2) else 0
        if match.group(3)=='over': under=-under
        return result('minute_cryptic','recognized_valid',raw,{'puzzle_date':day.isoformat(),'clue':lines[1],'hints_used':hint,'signed_under_par_difference':under,'solver_count_observed':int(match.group(4).replace(',','')),'time_display':match.group(5).rstrip('.') if match.group(5) else None,'puzzle_number':None},['community_par_semantics_unverified','hint_taxonomy_unverified'])
    names=[('foximax',r'🦊#FoxiMax\s+#\d+'),('polygonle',r'#Polygonle\s+\d+'),('krillion',r'Krillion\s+#\d+')]
    for game,pattern in names:
        if re.match(pattern,lines[0],re.I):
            return result(game,'needs_review',raw,{'identified_game':game},['catalogue_only_not_implemented'])
    return result(None,'unrecognized',raw,issues=['unsupported_or_non_game_message'])

def parse_transcript(text):
    return [{'transport':m['transport'],'parsed':parse_share(m['text'])} for m in split_messages(text)]

if __name__=='__main__':
    print(json.dumps(parse_transcript(sys.stdin.read()),ensure_ascii=False,indent=2))
