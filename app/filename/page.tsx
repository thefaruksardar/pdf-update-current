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
perl -e '
use strict;
use warnings;

my %count;

for my $f (glob "*.pdf") {
  my $base = $f;
  $base =~ s/\\{.*?\\}//g;

  my @w = split /\\s+/, $base;
  my $short = lc( ($w[0] // "") . ($w[1] // "") );
  $short =~ s/[^a-z0-9]//g;

  $count{$short}++;

  my @c = ("A".."Z", "a".."z", 0..9);
  my $code = join "", map { $c[rand @c] } 1..4;

  rename $f, "\${short}_$count{$short}_$code.pdf"
    or warn "Could not rename $f\\n";
}
'

for f in aiporn_*; do
  mv "$f" "\${f/aiporn/pornai}"
done

for f in aisex_*; do
  mv "$f" "\${f/aisex/sexai}"
done
`}
        />
      </section>

      {/* HOW TO RUN */}
      <section className="mt-12 rounded-xl border border-neutral-200 bg-neutral-50 p-6">
        <h3 className="font-medium text-neutral-950">How to run</h3>
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
