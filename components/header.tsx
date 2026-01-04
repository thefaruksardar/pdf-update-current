import React from "react";
import { FileText, Download } from "lucide-react"; // npm i lucide-react

export default function Header() {
  return (
    <header className="py-6 shadow-lg bg-white/80 backdrop-blur-md border-b border-neutral-200 mb-6">
      <div className="max-w-5xl mx-auto px-4 flex items-center gap-4 justify-center">
        <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg ">
          <FileText className="w-7 h-7 text-white" />
        </div>
        <h1 className="text-4xl font-bold text-neutral-950 bg-clip-text ">
          PDF Update
        </h1>
      </div>
    </header>
  );
}
