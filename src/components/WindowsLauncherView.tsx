import { useMemo, useState } from 'react';
import { BellRing, Check, Copy, Download, Monitor, Terminal } from 'lucide-react';
import type { WatchTarget } from '../types/scout';
import { generateWindowsScoutFiles } from '../utils/windowsScriptGenerator';

interface WindowsLauncherViewProps {
  targets: WatchTarget[];
  intervalMinutes: number;
  onTriggerTestNotification: () => void;
}

function downloadTextFile(filename: string, content: string) {
  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function WindowsLauncherView({
  targets,
  intervalMinutes,
  onTriggerTestNotification,
}: WindowsLauncherViewProps) {
  const [copiedCmd, setCopiedCmd] = useState(false);
  const [copiedSource, setCopiedSource] = useState(false);
  const [previewTab, setPreviewTab] = useState<'py' | 'ps1'>('py');

  const generated = useMemo(
    () => generateWindowsScoutFiles(targets, intervalMinutes),
    [targets, intervalMinutes]
  );

  const pyinstallerCommand =
    'pip install pyinstaller\npyinstaller --onefile --windowed --name KleinScout KleinScout-Desktop.py';

  const handleCopyCommand = async () => {
    try {
      await navigator.clipboard.writeText(pyinstallerCommand);
      setCopiedCmd(true);
      setTimeout(() => setCopiedCmd(false), 2000);
    } catch {
      // Clipboard blocked in headless mode
    }
  };

  const activePreviewCode = previewTab === 'py' ? generated.pyContent : generated.ps1Content;

  const handleCopyFullSource = async () => {
    try {
      await navigator.clipboard.writeText(activePreviewCode);
      setCopiedSource(true);
      setTimeout(() => setCopiedSource(false), 2000);
    } catch {
      // Clipboard blocked in headless mode
    }
  };

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-slate-200 bg-white p-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="max-w-2xl">
            <h1 className="font-display text-lg font-semibold text-slate-900">
              Windows Desktop Scout & .EXE Packaging
            </h1>
            <p className="mt-1.5 text-sm leading-relaxed text-slate-600">
              This cloud workspace runs on Linux, so it cannot directly compile a signed Windows{' '}
              <span className="font-mono text-xs text-slate-800">.exe</span> binary. Download the synced Python GUI source or PowerShell launcher below to run every{' '}
              <span className="font-mono font-medium text-slate-900">{intervalMinutes} minutes</span> natively on your Windows PC or compile to a standalone{' '}
              <span className="font-mono text-xs text-slate-800">.exe</span>.
            </p>
          </div>

          <button
            type="button"
            onClick={onTriggerTestNotification}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 whitespace-nowrap shrink-0"
          >
            <BellRing className="h-3.5 w-3.5 text-slate-500" />
            <span>Test Browser Alert</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        <div className="rounded-xl border border-slate-200 bg-white p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 text-slate-900 font-display text-sm font-semibold">
              <Terminal className="h-4 w-4 text-slate-700 shrink-0" />
              <span>1. Python .EXE Source</span>
            </div>
            <p className="mt-2 text-xs leading-relaxed text-slate-600">
              Standalone zero-dependency Python 3 GUI app synced with your rules. Compile directly to <span className="font-mono">KleinScout.exe</span> with PyInstaller or hand to any AI compiler.
            </p>
          </div>
          <button
            type="button"
            onClick={() => downloadTextFile('KleinScout-Desktop.py', generated.pyContent)}
            className="mt-4 inline-flex items-center justify-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-800 transition-colors whitespace-nowrap"
          >
            <Download className="h-3.5 w-3.5 shrink-0" />
            <span>Download .py Source</span>
          </button>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 text-slate-900 font-display text-sm font-semibold">
              <Terminal className="h-4 w-4 text-slate-700 shrink-0" />
              <span>2. PowerShell Script</span>
            </div>
            <p className="mt-2 text-xs leading-relaxed text-slate-600">
              PowerShell 5.1 desktop scout embedded with your {targets.filter((t) => t.enabled).length} gift targets, price ceilings, mint-condition rules, and Windows System Tray balloon alerts.
            </p>
          </div>
          <button
            type="button"
            onClick={() => downloadTextFile('KleinScout-Windows.ps1', generated.ps1Content)}
            className="mt-4 inline-flex items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-900 hover:bg-slate-50 transition-colors whitespace-nowrap"
          >
            <Download className="h-3.5 w-3.5 shrink-0" />
            <span>Download .ps1 Script</span>
          </button>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 text-slate-900 font-display text-sm font-semibold">
              <Monitor className="h-4 w-4 text-slate-700 shrink-0" />
              <span>3. Batch Launcher</span>
            </div>
            <p className="mt-2 text-xs leading-relaxed text-slate-600">
              Double-click Windows launcher that starts the {intervalMinutes}-minute PowerShell loop in one click. Place in the same folder as <span className="font-mono">KleinScout-Windows.ps1</span>.
            </p>
          </div>
          <button
            type="button"
            onClick={() => downloadTextFile('Start-KleinScout.bat', generated.batContent)}
            className="mt-4 inline-flex items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-900 hover:bg-slate-50 transition-colors whitespace-nowrap"
          >
            <Download className="h-3.5 w-3.5 shrink-0" />
            <span>Download .bat Launcher</span>
          </button>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 text-slate-900 font-display text-sm font-semibold">
              <Download className="h-4 w-4 text-slate-700 shrink-0" />
              <span>4. Compile to .EXE</span>
            </div>
            <p className="mt-2 text-xs leading-relaxed text-slate-600">
              To compile <span className="font-mono">KleinScout-Desktop.py</span> into <span className="font-mono">KleinScout.exe</span> on Windows:
            </p>
            <pre className="mt-2 whitespace-pre-wrap break-words rounded-lg border border-slate-200 bg-slate-50 p-2.5 font-mono text-[11px] leading-relaxed text-slate-800">
              {pyinstallerCommand}
            </pre>
          </div>
          <button
            type="button"
            onClick={handleCopyCommand}
            className="mt-4 inline-flex items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors whitespace-nowrap"
          >
            {copiedCmd ? <Check className="h-3.5 w-3.5 text-emerald-700 shrink-0" /> : <Copy className="h-3.5 w-3.5 shrink-0" />}
            <span>{copiedCmd ? 'Copied Command' : 'Copy .EXE Build Command'}</span>
          </button>
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-5">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <h2 className="font-display text-sm font-semibold text-slate-900">
              Generated Source Preview
            </h2>
            <div className="inline-flex rounded-lg border border-slate-200 bg-slate-50 p-0.5 text-xs">
              <button
                type="button"
                onClick={() => setPreviewTab('py')}
                className={`rounded-md px-2.5 py-1 font-medium transition-colors whitespace-nowrap ${
                  previewTab === 'py'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                KleinScout-Desktop.py
              </button>
              <button
                type="button"
                onClick={() => setPreviewTab('ps1')}
                className={`rounded-md px-2.5 py-1 font-medium transition-colors whitespace-nowrap ${
                  previewTab === 'ps1'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                KleinScout-Windows.ps1
              </button>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleCopyFullSource}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 whitespace-nowrap"
            >
              {copiedSource ? <Check className="h-3.5 w-3.5 text-emerald-700" /> : <Copy className="h-3.5 w-3.5" />}
              <span>{copiedSource ? 'Copied Full Code' : 'Copy Full Source'}</span>
            </button>
            <button
              type="button"
              onClick={() => downloadTextFile('README-Windows.txt', generated.readmeContent)}
              className="text-xs font-medium text-slate-600 hover:text-slate-900 underline-offset-4 hover:underline whitespace-nowrap"
            >
              Download README-Windows.txt
            </button>
          </div>
        </div>
        <pre className="mt-3 max-h-80 overflow-auto rounded-lg bg-slate-950 p-4 font-mono text-xs leading-relaxed text-slate-200">
          {activePreviewCode}
        </pre>
      </div>
    </div>
  );
}
