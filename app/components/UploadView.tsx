"use client";

import { useState, useRef } from "react";
import { cn } from "@/lib/utils";

interface UploadViewProps {
  onFilesSelect: (files: File[]) => void;
  error?: string | null;
  isLoading?: boolean;
}

export function UploadView({ onFilesSelect, error, isLoading }: UploadViewProps) {
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

    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      onFilesSelect(files);
    }
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    if (files.length > 0) {
      onFilesSelect(files);
    }
  }

  return (
    <div
      className="animate-soft-rise"
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.05fr)_minmax(300px,0.95fr)] lg:items-start">
        <div className="space-y-5">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-text-muted">
              Add files
            </p>
            <h2 className="mt-1 text-2xl font-semibold text-text-primary">
              Import portfolio CSVs
            </h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-text-muted">
              Add Fidelity exports to the picker.
            </p>
          </div>

          <div className="space-y-3">
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
              .
            </Step>
            <Step number={2}>
              Open the <OverflowMenuIcon /> menu on the right, then click{" "}
              <strong>Download</strong>.
            </Step>
            <Step number={3}>Drop one or more files here or click to browse.</Step>
          </div>

          {error && (
            <div className="rounded-2xl border border-negative/15 bg-negative-bg px-4 py-3 text-sm text-negative animate-slide-down">
              {error}
            </div>
          )}
        </div>

        <div>
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={isLoading}
            className={cn(
              "w-full rounded-[26px] border-2 border-dashed px-6 py-12",
              "flex min-h-[260px] flex-col items-center justify-center gap-4",
              "transition-all duration-200 cursor-pointer bg-bg/70",
              isDragOver
                ? "border-accent bg-accent-bg scale-[1.01]"
                : "border-border hover:border-accent/50 hover:bg-surface-hover/80",
              isLoading && "opacity-60 pointer-events-none"
            )}
            style={
              isDragOver ? { animation: "pulse-border 1.5s ease-in-out infinite" } : undefined
            }
          >
            {isLoading ? (
              <>
                <Spinner />
                <div className="space-y-1 text-center">
                  <p className="text-sm font-medium text-text-primary">
                    Processing files
                  </p>
                  <p className="text-sm text-text-muted">
                    Building the updated picker...
                  </p>
                </div>
              </>
            ) : (
              <>
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-accent-bg text-accent">
                  <UploadIcon />
                </div>
                <div className="space-y-2 text-center">
                  <p className="text-base font-medium text-text-primary">
                    {isDragOver
                      ? "Drop your files here"
                      : "Drag and drop CSVs or click to browse"}
                  </p>
                  <p className="text-sm text-text-muted">
                    Multiple Fidelity exports supported.
                  </p>
                </div>
              </>
            )}
          </button>

          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,text/csv"
            multiple
            className="hidden"
            onChange={handleFileChange}
          />
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
      <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-accent-bg text-xs font-bold text-accent">
        {number}
      </span>
      <span className="text-sm text-text-primary">{children}</span>
    </div>
  );
}

function UploadIcon() {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="text-current"
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
