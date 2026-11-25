import type { WatchTarget } from '../types/scout';
import { buildKleinanzeigenSearchUrl } from './listingEvaluator';

function escapePsSingleQuoted(value: string): string {
  return value.replace(/'/g, "''");
}

export function generateWindowsScoutFiles(
  targets: WatchTarget[],
  intervalMinutes: number
): {
  ps1Content: string;
  batContent: string;
  readmeContent: string;
  pyContent: string;
} {
  const activeTargets = targets.filter((t) => t.enabled);
  const targetEntries = activeTargets
    .map((target) => {
      const searchUrl = buildKleinanzeigenSearchUrl(target.searchQuery);
      const posList = target.positiveKeywords.map((k) => `'${escapePsSingleQuoted(k)}'`).join(', ');
      const negList = target.excludedFlawKeywords
        .map((k) => `'${escapePsSingleQuoted(k)}'`)
        .join(', ');
      const forbidList = target.forbiddenModelTerms
        .map((k) => `'${escapePsSingleQuoted(k)}'`)
        .join(', ');
      const reqGroups = target.requiredTermGroups
        .map((grp) => `@(${grp.map((g) => `'${escapePsSingleQuoted(g)}'`).join(', ')})`)
        .join(', ');

      return `  @{
    Id = '${escapePsSingleQuoted(target.id)}'
    Name = '${escapePsSingleQuoted(target.name)}'
    Url = '${escapePsSingleQuoted(searchUrl)}'
    MaxPriceEur = ${target.maxPriceEur}
    IdealPriceEur = ${target.idealPriceEur}
    RequiredGroups = @(${reqGroups})
    ForbiddenTerms = @(${forbidList})
    PositiveKeywords = @(${posList})
    ExcludedFlaws = @(${negList})
  }`;
    })
    .join(",\n");

  const ps1Content = `# KleinScout Gift Radar - Windows Desktop Price Scout
# Automatically polls Kleinanzeigen every ${intervalMinutes} minutes while open
# and displays native Windows desktop notifications for mint-condition gift matches.

[CmdletBinding()]
param()

Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing
Add-Type -AssemblyName System.Web

$IntervalMinutes = ${intervalMinutes}
$SeenDealsFile = Join-Path $PSScriptRoot "kleinscout-seen.json"
$AlertsCsvFile = Join-Path $PSScriptRoot "kleinscout-alerts.csv"

$Targets = @(
${targetEntries}
)

function Show-WindowsNotification {
  param(
    [string]$Title,
    [string]$Message
  )
  $notify = New-Object System.Windows.Forms.NotifyIcon
  $notify.Icon = [System.Drawing.SystemIcons]::Information
  $notify.BalloonTipIcon = [System.Windows.Forms.ToolTipIcon]::Info
  $notify.BalloonTipTitle = $Title
  $notify.BalloonTipText = $Message
  $notify.Visible = $true
  $notify.ShowBalloonTip(8000)
  Start-Sleep -Milliseconds 900
  $notify.Dispose()
}

function Parse-EuroPrice {
  param([string]$RawPrice)
  if ([string]::IsNullOrWhiteSpace($RawPrice)) { return $null }
  $m = [regex]::Match($RawPrice, '(\\d{1,3}(?:\\.\\d{3})*(?:,\\d{1,2})?|\\d+)')
  if (-not $m.Success) { return $null }
  $clean = $m.Groups[1].Value -replace '\\.', '' -replace ',', '.'
  [double]$val = 0
  if ([double]::TryParse($clean, [System.Globalization.CultureInfo]::InvariantCulture, [ref]$val)) {
    return [math]::Round($val)
  }
  return $null
}

function Test-GiftCondition {
  param(
    [string]$Title,
    [string]$Description,
    [Nullable[int]]$PriceEur,
    [hashtable]$Target
  )
  if ($null -eq $PriceEur -or $PriceEur -le 0 -or $PriceEur -gt $Target.MaxPriceEur) {
    return $false
  }

  $combined = ($Title + " " + $Description).ToLowerInvariant()
  $sanitized = $combined -replace '\\b(keine|ohne|frei von)\\s+kratzer\\b', ' '
  $sanitized = $sanitized -replace '\\bkratzerfrei\\b', ' '
  $sanitized = $sanitized -replace '\\b(keine|ohne)\\s+gebrauchsspuren\\b', ' '
  $sanitized = $sanitized -replace '\\b(keine|ohne)\\s+(macken|dellen|schaeden|schäden)\\b', ' '

  foreach ($group in $Target.RequiredGroups) {
    $groupOk = $false
    foreach ($term in $group) {
      if ($combined.Contains($term.ToLowerInvariant())) {
        $groupOk = $true
        break
      }
    }
    if (-not $groupOk) { return $false }
  }

  foreach ($bad in $Target.ForbiddenTerms) {
    if ($sanitized.Contains($bad.ToLowerInvariant())) { return $false }
  }

  foreach ($flaw in $Target.ExcludedFlaws) {
    if ($sanitized.Contains($flaw.ToLowerInvariant())) { return $false }
  }

  $hasMintSignal = $false
  foreach ($good in $Target.PositiveKeywords) {
    if ($combined.Contains($good.ToLowerInvariant())) {
      $hasMintSignal = $true
      break
    }
  }
  return $hasMintSignal
}

$SeenPrices = @{}
if (Test-Path $SeenDealsFile) {
  try {
    $loaded = Get-Content $SeenDealsFile -Raw | ConvertFrom-Json
    foreach ($prop in $loaded.PSObject.Properties) {
      $SeenPrices[$prop.Name] = [int]$prop.Value
    }
  } catch { }
}

Write-Host "=========================================================" -ForegroundColor Cyan
Write-Host " KleinScout Gift Radar (Windows Desktop Scout)" -ForegroundColor Cyan
Write-Host " Monitoring $($Targets.Count) priority gift targets every $IntervalMinutes minutes" -ForegroundColor Gray
Write-Host " Press Ctrl+C or close this window to stop." -ForegroundColor Gray
Write-Host "=========================================================" -ForegroundColor Cyan

Show-WindowsNotification -Title "KleinScout Active" -Message "Scouting Kleinanzeigen every $IntervalMinutes min for your 3 priority gifts."

while ($true) {
  $stamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
  Write-Host "\`n[$stamp] Running Kleinanzeigen scout cycle..." -ForegroundColor Yellow

  foreach ($target in $Targets) {
    try {
      $headers = @{
        "User-Agent" = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36"
        "Accept-Language" = "de-DE,de;q=0.9,en;q=0.8"
      }
      $resp = Invoke-WebRequest -Uri $target.Url -Headers $headers -TimeoutSec 20 -UseBasicParsing
      $html = $resp.Content

      $articlePattern = '<article[^>]*data-adid="([^"]+)"[^>]*>([\\s\\S]*?)</article>'
      $matches = [regex]::Matches($html, $articlePattern)
      Write-Host "  [$($target.Name)] Scanned $($matches.Count) listings" -ForegroundColor White

      foreach ($m in $matches) {
        $adId = $m.Groups[1].Value
        $block = $m.Groups[2].Value

        $titleMatch = [regex]::Match($block, '<h[23][^>]*>[\\s\\S]*?<a[^>]*href="([^"]+)"[^>]*>([\\s\\S]*?)</a>')
        if (-not $titleMatch.Success) {
          $titleMatch = [regex]::Match($block, '<a[^>]*class="[^"]*ellipsis[^"]*"[^>]*href="([^"]+)"[^>]*>([\\s\\S]*?)</a>')
        }
        if (-not $titleMatch.Success) { continue }
        $href = $titleMatch.Groups[1].Value
        $title = [System.Web.HttpUtility]::HtmlDecode(($titleMatch.Groups[2].Value -replace '<[^>]+>', '')).Trim()

        $priceMatch = [regex]::Match($block, '<p[^>]*>([^<]{1,28}(?:€|VB|verschenken)[^<]{0,12})</p>')
        $priceRaw = if ($priceMatch.Success) { [System.Web.HttpUtility]::HtmlDecode(($priceMatch.Groups[1].Value -replace '<[^>]+>', '')).Trim() } else { "" }
        $priceEur = Parse-EuroPrice -RawPrice $priceRaw

        $descMatch = [regex]::Match($block, '"description":"([^"]+)"')
        if (-not $descMatch.Success) {
          $descMatch = [regex]::Match($block, '(?:aditem-main--middle--description|text-bodyRegular)[^>]*>([\\s\\S]*?)</p>')
        }
        $desc = if ($descMatch.Success) { [System.Web.HttpUtility]::HtmlDecode(($descMatch.Groups[1].Value -replace '<[^>]+>', '')).Trim() } else { "" }

        if (Test-GiftCondition -Title $title -Description $desc -PriceEur $priceEur -Target $target) {
          $key = "$($target.Id)-$adId"
          $isNewOrDrop = (-not $SeenPrices.ContainsKey($key)) -or ($priceEur -lt $SeenPrices[$key])

          if ($isNewOrDrop) {
            $prevText = if ($SeenPrices.ContainsKey($key)) { " (dropped from EUR $($SeenPrices[$key]))" } else { "" }
            $SeenPrices[$key] = $priceEur
            $fullUrl = if ($href.StartsWith("http")) { $href } else { "https://www.kleinanzeigen.de$href" }

            Write-Host "    [GIFT MATCH] EUR $priceEur$prevText - $title" -ForegroundColor Green
            Write-Host "                 $fullUrl" -ForegroundColor DarkGray

            Show-WindowsNotification -Title "$($target.Name): EUR $priceEur$prevText" -Message $title

            $csvLine = '"' + $stamp + '","' + ($target.Name -replace '"', '""') + '",' + $priceEur + ',"' + ($title -replace '"', '""') + '","' + $fullUrl + '"'
            if (-not (Test-Path $AlertsCsvFile)) {
              "Timestamp,Target,PriceEUR,Title,URL" | Out-File -FilePath $AlertsCsvFile -Encoding UTF8
            }
            $csvLine | Out-File -FilePath $AlertsCsvFile -Append -Encoding UTF8
          }
        }
      }
    } catch {
      Write-Host "  [$($target.Name)] Fetch warning: $($_.Exception.Message)" -ForegroundColor Red
    }
  }

  $SeenPrices | ConvertTo-Json | Out-File -FilePath $SeenDealsFile -Encoding UTF8
  Write-Host "Next check in $IntervalMinutes minutes..." -ForegroundColor Cyan
  Start-Sleep -Seconds ($IntervalMinutes * 60)
}
`;

  const batContent = `@echo off
title KleinScout Gift Radar
echo Starting KleinScout Gift Radar (Windows Desktop Scout)...
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0KleinScout-Windows.ps1"
pause
`;

  const readmeContent = `KleinScout Gift Radar — Windows Desktop Launcher
================================================

Why run this locally on Windows?
Kleinanzeigen blocks automated requests from cloud data-center IPs.
Running this lightweight Windows launcher on your own PC uses your home
connection and displays native Windows desktop notifications every ${intervalMinutes} minutes.

Quick Start (Zero Installation Required):
1. Save both "KleinScout-Windows.ps1" and "Start-KleinScout.bat" into the same folder.
2. Double-click "Start-KleinScout.bat".
3. Keep the window open (or minimize it) — it will scout Kleinanzeigen every ${intervalMinutes} minutes
   for mint-condition matches and save alerts to "kleinscout-alerts.csv".

Optional: Compile into a standalone Windows .exe
1) PowerShell route:
  Install-Module ps2exe -Scope CurrentUser
  Invoke-ps2exe .\\KleinScout-Windows.ps1 .\\KleinScout.exe

2) Python standalone .exe route (zero external pip runtime packages needed):
  pip install pyinstaller
  pyinstaller --onefile --windowed --name KleinScout KleinScout-Desktop.py
`;

  const pyTargetsJson = JSON.stringify(
    activeTargets.map((t) => ({
      id: t.id,
      name: t.name,
      url: buildKleinanzeigenSearchUrl(t.searchQuery),
      maxPriceEur: t.maxPriceEur,
      idealPriceEur: t.idealPriceEur,
      requiredTermGroups: t.requiredTermGroups,
      forbiddenModelTerms: t.forbiddenModelTerms,
      positiveKeywords: t.positiveKeywords,
      excludedFlawKeywords: t.excludedFlawKeywords,
    })),
    null,
    2
  );

  const pyContent = `"""
KleinScout Gift Radar - Standalone Windows Desktop App
Compiles directly to a single Windows .exe with PyInstaller:
  pip install pyinstaller
  pyinstaller --onefile --windowed --name KleinScout KleinScout-Desktop.py
"""

import csv
import datetime
import html as html_lib
import json
import os
import re
import subprocess
import tempfile
import threading
import tkinter as tk
from tkinter import ttk
import urllib.request
import webbrowser

INTERVAL_MINUTES = ${intervalMinutes}


def get_data_dir():
    base = os.environ.get("LOCALAPPDATA") or os.environ.get("APPDATA") or os.path.expanduser("~")
    data_dir = os.path.join(base, "KleinScout")
    try:
        os.makedirs(data_dir, exist_ok=True)
        test_path = os.path.join(data_dir, ".write_test")
        with open(test_path, "w", encoding="utf-8") as f:
            f.write("ok")
        os.remove(test_path)
        return data_dir
    except OSError:
        fallback = os.path.join(tempfile.gettempdir(), "KleinScout")
        os.makedirs(fallback, exist_ok=True)
        return fallback


DATA_DIR = get_data_dir()
SEEN_FILE = os.path.join(DATA_DIR, "kleinscout_seen.json")
ALERTS_CSV = os.path.join(DATA_DIR, "kleinscout_alerts.csv")

TARGETS = json.loads(${JSON.stringify(pyTargetsJson)})

NEGATED_PATTERNS = [
    (re.compile(r"\\b(keine|ohne|frei von|null)\\s+kratzer\\b", re.I), "keine Kratzer"),
    (re.compile(r"\\bkratzerfrei\\b", re.I), "kratzerfrei"),
    (re.compile(r"\\b(keine|ohne)\\s+gebrauchsspuren\\b", re.I), "keine Gebrauchsspuren"),
    (re.compile(r"\\b(keine|ohne)\\s+(macken|dellen|schäden|schaeden|beschädigungen)\\b", re.I), "ohne Macken"),
    (re.compile(r"\\bnicht\\s+defekt\\b", re.I), "funktionsfähig"),
    (re.compile(r"\\bohne\\s+simlock\\b", re.I), "simlockfrei"),
    (re.compile(r"\\bohne\\s+icloud[-\\s]?sperre\\b", re.I), "iCloud frei"),
    (re.compile(r"\\b(mit|in|immer mit)\\s+(panzerglas|hülle|case|schutzhülle)(\\s+und\\s+(panzerglas|hülle|case|schutzhülle))?\\s*(genutzt|getragen|verwendet|geschützt)\\b", re.I), "geschützt genutzt"),
]

WORD_BOUNDARY_FLAWS = {"kaufe", "suche", "ankauf", "riss", "defekt"}


def parse_euro_price(raw_price: str):
    if not raw_price:
        return None
    if "zu verschenken" in raw_price.lower():
        return 0
    m = re.search(r"(\\d{1,3}(?:\\.\\d{3})*(?:,\\d{1,2})?|\\d+(?:[.,]\\d{1,2})?)", raw_price)
    if not m:
        return None
    num = m.group(1)
    if "." in num and "," in num:
        num = num.replace(".", "").replace(",", ".")
    elif "." in num and re.search(r"\\.\\d{3}$", num):
        num = num.replace(".", "")
    elif "," in num:
        num = num.replace(",", ".")
    try:
        return round(float(num))
    except ValueError:
        return None


def evaluate_listing(title: str, description: str, price_eur, target: dict):
    if price_eur is None or price_eur <= 0 or price_eur > target["maxPriceEur"]:
        return False, []

    combined_raw = re.sub(r"\\s+", " ", f"{title} {description}".replace("\\u00a0", " ")).strip()
    combined_lower = combined_raw.lower()
    sanitized = combined_lower

    positives = set()
    for pat, label in NEGATED_PATTERNS:
        if pat.search(sanitized):
            positives.add(label)
            sanitized = pat.sub(" ", sanitized)

    for group in target["requiredTermGroups"]:
        if not any(term.lower() in combined_lower for term in group):
            return False, []

    for forbidden in target["forbiddenModelTerms"]:
        esc = re.escape(forbidden.strip().lower())
        if re.search(rf"(^|[^a-z0-9äöüß]){esc}([^a-z0-9äöüß]|$)", sanitized, re.I):
            return False, []

    for flaw in target["excludedFlawKeywords"]:
        lf = flaw.strip().lower()
        if not lf:
            continue
        if lf in WORD_BOUNDARY_FLAWS:
            esc = re.escape(lf)
            if re.search(rf"(^|[^a-z0-9äöüß]){esc}([^a-z0-9äöüß]|$)", sanitized, re.I):
                return False, []
        elif lf in sanitized:
            return False, []

    for kw in target["positiveKeywords"]:
        if kw.lower() in combined_lower:
            positives.add(kw)

    if not positives:
        return False, []

    return True, sorted(positives)


def fetch_kleinanzeigen_target(target: dict):
    req = urllib.request.Request(
        target["url"],
        headers={
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
            "Accept-Language": "de-DE,de;q=0.9,en;q=0.8",
        },
    )
    with urllib.request.urlopen(req, timeout=15) as resp:
        page_html = resp.read().decode("utf-8", errors="replace")

    results = []
    article_re = re.compile(r'<article[^>]*data-adid="([^"]+)"[^>]*>([\\s\\S]*?)</article>', re.I)
    for m in article_re.finditer(page_html):
        ad_id = m.group(1)
        block = m.group(2)

        ld_desc = ""
        ld_match = re.search(r'<script[^>]*type="application/ld\\+json"[^>]*>([\\s\\S]*?)</script>', block, re.I)
        if ld_match:
            try:
                ld_obj = json.loads(ld_match.group(1))
                ld_desc = ld_obj.get("description", "") or ""
            except Exception:
                pass

        title_match = re.search(r'<h[23][^>]*>[\\s\\S]*?<a[^>]*href="([^"]+)"[^>]*>([\\s\\S]*?)</a>', block, re.I)
        if not title_match:
            continue
        href = html_lib.unescape(title_match.group(1))
        title = html_lib.unescape(re.sub(r"<[^>]+>", "", title_match.group(2))).strip()
        full_url = href if href.startswith("http") else f"https://www.kleinanzeigen.de{href}"

        price_raw = ""
        for pm in re.finditer(r"<p[^>]*>([\\s\\S]*?)</p>", block, re.I):
            txt = html_lib.unescape(re.sub(r"<[^>]+>", "", pm.group(1))).strip()
            if 0 < len(txt) <= 32 and re.search(r"€|\\bVB\\b|zu verschenken", txt, re.I):
                price_raw = txt
                break

        price_eur = parse_euro_price(price_raw)
        desc = ld_desc or title
        ok, signals = evaluate_listing(title, desc, price_eur, target)
        if ok:
            results.append({
                "key": f"{target['id']}-{ad_id}",
                "target": target["name"],
                "title": title,
                "price_eur": price_eur,
                "price_raw": price_raw,
                "signals": ", ".join(signals[:4]),
                "url": full_url,
            })
    return results


def show_windows_toast(title: str, message: str):
    if os.name != "nt":
        return
    safe_title = title.replace("'", "''")
    safe_msg = message.replace("'", "''")
    ps_cmd = (
        "Add-Type -AssemblyName System.Windows.Forms; "
        "$n = New-Object System.Windows.Forms.NotifyIcon; "
        "$n.Icon = [System.Drawing.SystemIcons]::Information; "
        "$n.Visible = $true; "
        f"$n.ShowBalloonTip(7000, '{safe_title}', '{safe_msg}', [System.Windows.Forms.ToolTipIcon]::Info); "
        "Start-Sleep -Seconds 2; $n.Dispose()"
    )
    try:
        subprocess.Popen(["powershell", "-NoProfile", "-WindowStyle", "Hidden", "-Command", ps_cmd])
    except Exception:
        pass


class KleinScoutApp:
    def __init__(self, root: tk.Tk):
        self.root = root
        self.root.title("KleinScout Gift Radar")
        self.root.geometry("920x540")
        self.seen_prices = self._load_seen()
        self.url_by_row = {}
        self.is_running = False

        top = ttk.Frame(root, padding=12)
        top.pack(fill="x")
        self.status_var = tk.StringVar(value="Starting initial Kleinanzeigen scout...")
        ttk.Label(top, textvariable=self.status_var, font=("Segoe UI", 10, "bold")).pack(side="left")
        ttk.Button(top, text="Run Scout Now", command=self.trigger_scout).pack(side="right")
        ttk.Button(top, text="Open Alerts Folder", command=self._open_data_dir).pack(side="right", padx=(0, 8))

        cols = ("target", "price", "title", "signals")
        self.tree = ttk.Treeview(root, columns=cols, show="headings", height=18)
        self.tree.heading("target", text="Priority Gift")
        self.tree.heading("price", text="Price (EUR)")
        self.tree.heading("title", text="Listing Title (Double-click to open)")
        self.tree.heading("signals", text="Condition Signals")
        self.tree.column("target", width=220)
        self.tree.column("price", width=90, anchor="e")
        self.tree.column("title", width=390)
        self.tree.column("signals", width=190)
        self.tree.pack(fill="both", expand=True, padx=12, pady=(0, 12))
        self.tree.bind("<Double-1>", self._open_selected)

        self.trigger_scout()
        self.root.after(INTERVAL_MINUTES * 60 * 1000, self._schedule_next)

    def _open_data_dir(self):
        try:
            if os.name == "nt":
                os.startfile(DATA_DIR)
            else:
                webbrowser.open(f"file://{DATA_DIR}")
        except Exception:
            pass

    def _load_seen(self):
        if os.path.exists(SEEN_FILE):
            try:
                with open(SEEN_FILE, "r", encoding="utf-8") as f:
                    return json.load(f)
            except Exception:
                pass
        return {}

    def _save_seen(self):
        tmp_path = f"{SEEN_FILE}.tmp"
        with open(tmp_path, "w", encoding="utf-8") as f:
            json.dump(self.seen_prices, f, indent=2)
        os.replace(tmp_path, SEEN_FILE)

    def _schedule_next(self):
        self.trigger_scout()
        self.root.after(INTERVAL_MINUTES * 60 * 1000, self._schedule_next)

    def _open_selected(self, _event):
        sel = self.tree.selection()
        if sel and sel[0] in self.url_by_row:
            webbrowser.open(self.url_by_row[sel[0]])

    def trigger_scout(self):
        if self.is_running:
            return
        self.is_running = True
        self.status_var.set("Scouting Kleinanzeigen for mint-condition gifts...")
        threading.Thread(target=self._run_worker, daemon=True).start()

    def _run_worker(self):
        all_matches = []
        new_alerts = []
        errors = 0
        io_warning = ""
        try:
            for target in TARGETS:
                try:
                    matches = fetch_kleinanzeigen_target(target)
                    for item in matches:
                        all_matches.append(item)
                        prev = self.seen_prices.get(item["key"])
                        if prev is None or item["price_eur"] < prev:
                            self.seen_prices[item["key"]] = item["price_eur"]
                            new_alerts.append((item, prev))
                except Exception:
                    errors += 1

            if new_alerts:
                try:
                    self._save_seen()
                    self._append_csv(new_alerts)
                except OSError as exc:
                    io_warning = f"Save warning: {exc}"
                top_item, prev = new_alerts[0]
                note = f" (down from EUR {prev})" if prev else ""
                show_windows_toast(f"{top_item['target']}: EUR {top_item['price_eur']}{note}", top_item["title"])
        finally:
            self.root.after(0, lambda: self._update_ui(all_matches, len(new_alerts), errors, io_warning))

    def _append_csv(self, new_alerts):
        write_header = not os.path.exists(ALERTS_CSV)
        stamp = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        with open(ALERTS_CSV, "a", newline="", encoding="utf-8") as f:
            writer = csv.writer(f)
            if write_header:
                writer.writerow(["Timestamp", "Target", "PriceEUR", "Title", "URL"])
            for item, _ in new_alerts:
                writer.writerow([stamp, item["target"], item["price_eur"], item["title"], item["url"]])

    def _update_ui(self, matches, new_count, errors, io_warning=""):
        self.is_running = False
        for row_id in self.tree.get_children():
            self.tree.delete(row_id)
        self.url_by_row.clear()
        for item in matches:
            rid = self.tree.insert("", "end", values=(
                item["target"], f"EUR {item['price_eur']}", item["title"], item["signals"]
            ))
            self.url_by_row[rid] = item["url"]
        now_str = datetime.datetime.now().strftime("%H:%M:%S")
        err_note = f" | {errors} feed warnings" if errors else ""
        save_note = f" | {io_warning}" if io_warning else ""
        self.status_var.set(
            f"Last check {now_str} | {len(matches)} mint matches ({new_count} new/dropped){err_note}{save_note} | Interval: {INTERVAL_MINUTES}m"
        )


if __name__ == "__main__":
    root_win = tk.Tk()
    KleinScoutApp(root_win)
    root_win.mainloop()
`;

  return { ps1Content, batContent, readmeContent, pyContent };
}
