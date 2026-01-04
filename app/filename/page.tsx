"use client";

import { useState } from "react";

function CodeBlock({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="relative mt-4 rounded-xl bg-neutral-900 p-4 text-sm text-neutral-100 font-mono overflow-x-auto">
      <button
        onClick={copy}
        className="absolute top-3 right-3 rounded-md bg-neutral-700 px-3 py-1 text-xs hover:bg-neutral-600 transition"
      >
        {copied ? "Copied ✓" : "Copy"}
      </button>
      <pre>
        <code>{code}</code>
      </pre>
    </div>
  );
}

export default function WindowsFileRenameDocs() {
  return (
    <main className="mx-auto max-w-4xl px-6 py-12">
      <h1 className="text-3xl font-semibold tracking-tight text-neutral-800">
        Windows Batch File Renaming (PowerShell)
      </h1>

      <p className="mt-4 text-neutral-600">
        This page documents <strong>Windows-native PowerShell commands</strong>
        for safely renaming files in bulk. No Bash, no Perl, no installs.
      </p>
      {/* SECTION 1 */}
      <section className="mt-12">
        <h2 className="text-xl font-medium text-neutral-800">
          Advanced PDF Rename (Counter + Random Code)
        </h2>

        <p className="mt-2 text-neutral-800">
          This script renames all PDF files using the first two words of the
          filename, adds a counter, and appends a random code.
        </p>

        <CodeBlock
          code={`
            cd pdfs
            $counts = @{}
Get-ChildItem *.pdf | ForEach-Object {
  $base = $_.Name -replace '\\{.*?\\}', ''
  $words = $base -split '\\s+'
  $short = ($words[0] + $words[1]).ToLower() -replace '[^a-z0-9]', ''

  if (-not $counts.ContainsKey($short)) { $counts[$short] = 0 }
  $counts[$short]++

  $chars = ('A'..'Z') + ('a'..'z') + (0..9)
  $code = -join (1..4 | ForEach-Object { $chars | Get-Random })

  Rename-Item $_ "\${short}_$($counts[$short])_$code.pdf"
}`}
        />
      </section>
      {/* SECTION 2 */}
      <section className="mt-10">
        <h2 className="text-xl font-medium text-neutral-800">
          Rename File Prefix (aiporn → pornai, aisex → sexai)
        </h2>

        <p className="mt-2 text-neutral-800">
          Use this when you only want to change a word in the filename while
          keeping everything else untouched.
        </p>

        <CodeBlock
          code={`Get-ChildItem aiporn_* | Rename-Item -NewName { $_.Name -replace 'aiporn', 'pornai' }
Get-ChildItem aisex_*  | Rename-Item -NewName { $_.Name -replace 'aisex', 'sexai' }`}
        />

        <div className="mt-4 rounded-lg bg-neutral-50 p-4 text-sm text-neutral-700">
          <strong>Example</strong>
          <div className="mt-2 font-mono text-neutral-600">
            aiporn_video_01.mp4 → pornai_video_01.mp4
            <br />
            aisex_data_backup.zip → sexai_data_backup.zip
          </div>
        </div>
      </section>

      {/* HOW TO RUN */}
      <section className="mt-12 rounded-xl border border-neutral-200 bg-neutral-50 p-6">
        <h3 className="font-medium">How to run</h3>
        <ol className="mt-3 list-decimal space-y-2 pl-5 text-neutral-600">
          <li>Open the folder containing your files</li>
          <li>
            Hold <strong>Shift</strong> + Right-Click →{" "}
            <strong>Open PowerShell here</strong>
          </li>
          <li>Paste the command and press Enter</li>
        </ol>
      </section>

      <p className="mt-10 text-sm text-neutral-500">
        ⚠️ Tip: Always test in a copy folder first. PowerShell renames are
        instant.
      </p>
    </main>
  );
}
