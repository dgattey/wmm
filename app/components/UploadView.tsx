"use client";

import Image from "next/image";
import { useState, useRef } from "react";
import { cn } from "@/lib/utils";

interface UploadViewProps {
  onFileSelect: (file: File) => void;
  error?: string | null;
  isLoading?: boolean;
}

export function UploadView({ onFileSelect, error, isLoading }: UploadViewProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  }

  function handleDragLeave(e: React.DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);

    const file = e.dataTransfer.files[0];
    if (file) onFileSelect(file);
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) onFileSelect(file);
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center p-6"
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <div className="w-full max-w-lg animate-slide-up">
        {/* Card */}
        <div className="bg-surface rounded-2xl border border-border/60 p-8 shadow-[var(--shadow-lg)]">
          <h1 className="text-2xl font-bold text-text-primary mb-1">
            Portfolio Allocation
          </h1>
          <p className="text-text-muted text-sm mb-8">
            Visualize your investment portfolio breakdown
          </p>

          <div className="mb-8 rounded-2xl border border-border/70 bg-surface-hover/70 p-4 shadow-[var(--shadow)]">
            <div className="flex items-center gap-4">
              <div className="relative flex-shrink-0">
                <div className="flex h-16 w-16 items-center justify-center rounded-[1.25rem] border border-white/10 bg-[#151922] shadow-[0_12px_30px_rgba(0,0,0,0.28)]">
                  <Image
                    src="/icon.svg"
                    alt="Portfolio preview graphic"
                    width={44}
                    height={44}
                    className="h-11 w-11"
                    priority
                  />
                </div>
                <span className="absolute -bottom-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full border border-white/25 bg-accent text-white shadow-[var(--shadow-md)]">
                  <MiniUploadIcon />
                </span>
              </div>
              <div className="space-y-1">
                <p className="text-sm font-semibold text-text-primary">
                  Import your positions CSV
                </p>
                <p className="text-xs leading-5 text-text-muted">
                  Upload your Fidelity export to load the portfolio view.
                </p>
              </div>
            </div>
          </div>

          {/* Instructions */}
          <div className="space-y-3 mb-8">
            <Step number={1}>
              Log in to{" "}
              <a
                href="https://digital.fidelity.com/ftgw/digital/portfolio/positions"
                target="_blank"
                rel="noopener noreferrer"
                className="text-accent hover:underline font-medium"
              >
                Fidelity Positions
              </a>
            </Step>
            <Step number={2}>
              Open the <OverflowMenuIcon /> menu on the right, then click{" "}
              <strong>Download</strong> to export your positions as CSV
            </Step>
            <Step number={3}>Drop the file below or click to browse</Step>
          </div>

          {/* Drop Zone */}
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={isLoading}
            className={cn(
              "w-full p-8 rounded-xl border-2 border-dashed",
              "flex flex-col items-center justify-center gap-3",
              "transition-all duration-200 cursor-pointer",
              isDragOver
                ? "border-accent bg-accent-bg scale-[1.02]"
                : "border-border hover:border-accent/50 hover:bg-surface-hover",
              isLoading && "opacity-60 pointer-events-none"
            )}
            style={
              isDragOver ? { animation: "pulse-border 1.5s ease-in-out infinite" } : undefined
            }
          >
            {isLoading ? (
              <>
                <Spinner />
                <span className="text-sm text-text-muted">Processing...</span>
              </>
            ) : (
              <>
                <UploadIcon />
                <span className="text-sm text-text-muted">
                  {isDragOver
                    ? "Drop your file here"
                    : "Drag & drop CSV or click to browse"}
                </span>
              </>
            )}
          </button>

          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,text/csv"
            className="hidden"
            onChange={handleFileChange}
          />

          {/* Error */}
          {error && (
            <div className="mt-4 p-3 rounded-lg bg-negative-bg text-negative text-sm animate-slide-down">
              {error}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Step({
  number,
  children,
}: {
  number: number;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-3">
      <span className="flex-shrink-0 w-6 h-6 rounded-full bg-accent-bg text-accent text-xs font-bold flex items-center justify-center mt-0.5">
        {number}
      </span>
      <span className="text-sm text-text-primary">{children}</span>
    </div>
  );
}

function UploadIcon() {
  return (
    <svg
      width="32"
      height="32"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="text-text-muted"
    >
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="17 8 12 3 7 8" />
      <line x1="12" y1="3" x2="12" y2="15" />
    </svg>
  );
}

function OverflowMenuIcon() {
  return (
    <span
      aria-label="More actions menu"
      className="mx-0.5 inline-flex h-4 w-4 align-[-0.125em] items-center justify-center rounded-sm border border-border/70 bg-surface"
    >
      <svg
        width="6"
        height="12"
        viewBox="0 0 6 12"
        fill="none"
        aria-hidden="true"
        className="text-text-primary"
      >
        <circle cx="3" cy="2" r="1" fill="currentColor" />
        <circle cx="3" cy="6" r="1" fill="currentColor" />
        <circle cx="3" cy="10" r="1" fill="currentColor" />
      </svg>
    </span>
  );
}

function MiniUploadIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M12 16V4" />
      <path d="M7 9l5-5 5 5" />
      <path d="M5 20h14" />
    </svg>
  );
}

function Spinner() {
  return (
    <svg
      width="28"
      height="28"
      viewBox="0 0 24 24"
      fill="none"
      className="animate-spin text-accent"
    >
      <circle
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="2"
        opacity="0.2"
      />
      <path
        d="M12 2a10 10 0 0 1 10 10"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}
