"use client";

import { useState, type ReactNode } from "react";
import type { FundOption } from "@/lib/types";
import { cn } from "@/lib/utils";

interface HeaderFundSelectorProps {
  funds: FundOption[];
  selectedFunds: string[];
  onToggleFund: (symbol: string) => void;
  onClearFunds: () => void;
}

export function HeaderFundSelector({
  funds,
  selectedFunds,
  onToggleFund,
  onClearFunds,
}: HeaderFundSelectorProps) {
  const [showChooser, setShowChooser] = useState(false);
  const selectedOptions = funds.filter((fund) =>
    selectedFunds.includes(fund.symbol)
  );

  if (funds.length === 0) {
    return null;
  }

  return (
    <div className="mt-5 max-w-[780px] rounded-2xl border border-border/70 bg-surface/86 backdrop-blur-xl shadow-[var(--shadow-md)] px-4 py-3">
      <div className="flex flex-wrap items-center gap-2">
        <HeaderLabel>Funds</HeaderLabel>

        <button
          onClick={onClearFunds}
          className={cn(
            "px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-200 border cursor-pointer whitespace-nowrap",
            selectedFunds.length === 0
              ? "bg-surface-hover text-text-primary border-border shadow-sm"
              : "bg-surface text-text-muted border-border hover:text-text-primary hover:bg-surface-hover"
          )}
        >
          All funds
        </button>

        {selectedOptions.map((fund) => (
          <button
            key={fund.symbol}
            onClick={() => onToggleFund(fund.symbol)}
            aria-label={`Remove ${fund.symbol}`}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold text-white border border-white/0 shadow-sm cursor-pointer transition-all duration-200 hover:brightness-110 active:scale-95 whitespace-nowrap"
            style={{
              backgroundColor: fund.color,
              borderColor: `${fund.color}66`,
            }}
          >
            {fund.symbol}
            <span className="text-[10px] opacity-70">x</span>
          </button>
        ))}

        <button
          onClick={() => setShowChooser((open) => !open)}
          className={cn(
            "px-3 py-1.5 rounded-full text-xs font-medium transition-colors border cursor-pointer whitespace-nowrap",
            showChooser
              ? "bg-surface-hover text-text-primary border-border shadow-sm"
              : "bg-surface text-text-muted border-border hover:text-text-primary hover:bg-surface-hover"
          )}
        >
          {showChooser
            ? "Hide funds"
            : selectedFunds.length > 0
              ? "Add fund"
              : "Select funds"}
        </button>
      </div>

      {showChooser && (
        <div className="mt-3 rounded-2xl border border-border/70 bg-surface/94 backdrop-blur-xl shadow-[var(--shadow-lg)] p-4 animate-fade-in">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
            <div>
              <p className="text-sm font-medium text-text-primary">
                Compare specific funds
              </p>
              <p className="text-xs text-text-muted">
                Select one or more funds. Treemap clicks still work too.
              </p>
            </div>

            {selectedFunds.length > 0 && (
              <button
                onClick={onClearFunds}
                className="text-xs font-medium text-text-muted hover:text-text-primary transition-colors cursor-pointer"
              >
                Clear selection
              </button>
            )}
          </div>

          <div className="flex flex-wrap gap-2">
            {funds.map((fund) => {
              const selected = selectedFunds.includes(fund.symbol);

              return (
                <button
                  key={fund.symbol}
                  onClick={() => onToggleFund(fund.symbol)}
                  title={fund.name}
                  className={cn(
                    "px-3 py-1.5 rounded-full text-xs font-semibold transition-all duration-200 border cursor-pointer whitespace-nowrap",
                    "hover:brightness-110 active:scale-95",
                    selected
                      ? "text-white border-white/0 shadow-sm"
                      : "bg-surface text-text-muted border-border hover:text-text-primary hover:bg-surface-hover"
                  )}
                  style={
                    selected
                      ? {
                          backgroundColor: fund.color,
                          borderColor: `${fund.color}66`,
                        }
                      : undefined
                  }
                >
                  {fund.symbol}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function HeaderLabel({ children }: { children: ReactNode }) {
  return (
    <span className="text-[11px] font-medium uppercase tracking-[0.14em] text-text-muted whitespace-nowrap">
      {children}
    </span>
  );
}
