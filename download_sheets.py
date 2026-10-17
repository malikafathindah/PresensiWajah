import urllib.request
import urllib.parse
import os

tabs = ['Users', 'Absensi', 'Log_Login', 'Izin']
target_dirs = [r'd:\PROJECT AI\PresensiWajah\sheets_data', r'd:\PROJECT AI\TestSupabase\sheets_data']

for td in target_dirs:
    os.makedirs(td, exist_ok=True)

for tab in tabs:
    encoded_tab = urllib.parse.quote(tab)
    url = f"https://docs.google.com/spreadsheets/d/1SboSRXp_AH6m0VIWQ5Gd3fCAwAtC5Ktl83rTpo8_NWI/gviz/tq?tqx=out:csv&sheet={encoded_tab}"
    try:
        req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
        with urllib.request.urlopen(req) as resp:
            content = resp.read().decode('utf-8')
        for td in target_dirs:
            fp = os.path.join(td, f"{tab}.csv")
            with open(fp, 'w', encoding='utf-8') as f:
                f.write(content)
        print(f"Downloaded {tab}.csv successfully to both dirs!")
    except Exception as e:
        print(f"Error downloading {tab}: {e}")
