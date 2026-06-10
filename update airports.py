#!/usr/bin/env python3
"""
Firehawk Ops — Airport Database Updater
Updates the embedded AIRPORT_DB in index.html from OurAirports data.

Usage:
    python3 update_airports.py

Replaces AIRPORT_DB in index.html with fresh data.
Run every 6 months or after a major airspace change event.
Data source: OurAirports (https://ourairports.com) — updated weekly from FAA NASR.
"""

import csv, json, urllib.request, os, re, shutil, tempfile
from datetime import date

BASE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
INDEX = os.path.join(BASE, 'index.html')

AIRPORTS_URL = 'https://raw.githubusercontent.com/davidmegginson/ourairports-data/main/airports.csv'
FREQS_URL    = 'https://raw.githubusercontent.com/davidmegginson/ourairports-data/main/airport-frequencies.csv'

def download(url, path):
    print(f'  Downloading {url.split("/")[-1]}...')
    req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
    with urllib.request.urlopen(req, timeout=30) as r, open(path, 'wb') as f:
        f.write(r.read())

def build_db(apt_csv, frq_csv):
    # Load frequencies
    freqs = {}
    with open(frq_csv, newline='', encoding='utf-8') as f:
        for row in csv.DictReader(f):
            ident = row['airport_ident'].strip()
            ftype = row['type'].strip().upper()
            freq  = row['frequency_mhz'].strip()
            if ident not in freqs:
                freqs[ident] = {}
            if ftype in ('TWR', 'LCL/P', 'LCL') and 'twr' not in freqs[ident]:
                freqs[ident]['twr'] = freq
            elif ftype == 'ATIS' and 'atis' not in freqs[ident]:
                freqs[ident]['atis'] = freq
            elif ftype == 'CTAF' and 'ctaf' not in freqs[ident]:
                freqs[ident]['ctaf'] = freq

    # Load airports
    KEEP = {'large_airport', 'medium_airport', 'small_airport'}
    MIL  = ['AFB','AFS','AAF','NAS','NAF','MCAS','MCAF','ANG','ARB','AAP','ANGB','JRB','JBMD','JBLM','JBSA','ARMY','AIR FORCE','NAVAL','MARINE','MILITARY','GUARD']
    airports = []
    with open(apt_csv, newline='', encoding='utf-8') as f:
        for row in csv.DictReader(f):
            if row['iso_country'] != 'US': continue
            if row['type'] not in KEEP: continue
            ident = (row['icao_code'] or row['gps_code'] or row['local_code'] or '').strip()
            if not ident or not ident.startswith('K'): continue
            lat = row['latitude_deg'].strip()
            lon = row['longitude_deg'].strip()
            if not lat or not lon: continue
            fd = freqs.get(ident, freqs.get(row['local_code'], {}))
            twr  = fd.get('twr')
            atis = fd.get('atis')
            ctaf = fd.get('ctaf')
            if not twr and row['type'] == 'small_airport': continue
            cls  = 'B' if row['type'] == 'large_airport' else 'C' if row['type'] == 'medium_airport' else 'D'
            name = row['name'].strip()
            is_mil = any(k in name.upper() for k in MIL)
            ctaf_str = ('Tower ' + twr) if twr else ('CTAF ' + ctaf) if ctaf else 'See chart'
            airports.append({'id':ident,'n':name,'cls':cls,'lat':round(float(lat),4),'lon':round(float(lon),4),'twr':twr,'atis':atis,'ctaf':ctaf_str,'mil':is_mil})
    return airports

def build_js(airports):
    today = date.today().strftime('%B %Y')
    lines = [f'  // FAA airport database — OurAirports data, updated {today}']
    lines.append('  // Run scripts/update_airports.py to refresh')
    lines.append('  const AIRPORT_DB = [')
    for a in airports:
        lines.append(f'    {{id:{json.dumps(a["id"])},n:{json.dumps(a["n"])},cls:{json.dumps(a["cls"])},lat:{a["lat"]},lon:{a["lon"]},twr:{json.dumps(a["twr"])},atis:{json.dumps(a["atis"])},ctaf:{json.dumps(a["ctaf"])},mil:{"true" if a["mil"] else "false"}}},')
    lines.append('  ];')
    return '\n'.join(lines)

def inject(js_block, index_path):
    html = open(index_path, encoding='utf-8').read()
    # Replace existing AIRPORT_DB block
    pattern = r'  // FAA airport database.*?  \];'
    if not re.search(pattern, html, re.DOTALL):
        print('ERROR: AIRPORT_DB marker not found in index.html')
        return False
    new_html = re.sub(pattern, js_block, html, count=1, flags=re.DOTALL)
    # Backup
    shutil.copy(index_path, index_path + '.bak')
    open(index_path, 'w', encoding='utf-8').write(new_html)
    return True

if __name__ == '__main__':
    print('Firehawk Airport DB Updater')
    print('===========================')
    with tempfile.TemporaryDirectory() as tmp:
        apt_csv = os.path.join(tmp, 'airports.csv')
        frq_csv = os.path.join(tmp, 'frequencies.csv')
        download(AIRPORTS_URL, apt_csv)
        download(FREQS_URL,    frq_csv)
        print('  Building database...')
        airports = build_db(apt_csv, frq_csv)
        print(f'  {len(airports)} towered airports')
        js = build_js(airports)
        print(f'  JS block: {len(js)//1024}KB')
        print('  Injecting into index.html...')
        if inject(js, INDEX):
            print(f'Done. Backup saved as index.html.bak')
        else:
            print('Failed.')
