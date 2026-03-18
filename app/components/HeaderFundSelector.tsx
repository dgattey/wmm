"use client";

import {
  useEffect,
  useRef,
  useState,
  type MouseEvent as ReactMouseEvent,
  type ReactNode,
} from "react";
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
  const [showMenu, setShowMenu] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const selectedOptions = funds.filter((fund) =>
    selectedFunds.includes(fund.symbol)
  );

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (!containerRef.current?.contains(event.target as Node)) {
        setShowMenu(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  if (funds.length === 0) {
    return null;
  }

  return (
    <div
      ref={containerRef}
      className="relative mt-4 max-w-full rounded-2xl border border-border/70 bg-surface/86 px-3 py-3 backdrop-blur-xl shadow-[var(--shadow-md)] sm:mt-5 sm:max-w-[780px] sm:px-4"
    >
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
          onClick={() => setShowMenu((open) => !open)}
          className={cn(
            "px-3 py-1.5 rounded-full text-xs font-medium transition-colors border cursor-pointer whitespace-nowrap",
            showMenu
              ? "bg-surface-hover text-text-primary border-border shadow-sm"
              : "bg-surface text-text-muted border-border hover:text-text-primary hover:bg-surface-hover"
          )}
        >
          Add funds
        </button>
      </div>

      {showMenu && (
        <div className="absolute inset-x-0 top-full z-20 mt-2 rounded-2xl border border-border/70 bg-surface p-2 shadow-[var(--shadow-lg)] animate-fade-in sm:inset-x-auto sm:left-0 sm:w-[320px] sm:max-w-[calc(100vw-3rem)]">
          <button
            type="button"
            onClick={(event) => {
              event.preventDefault();
              onClearFunds();
            }}
            className={cn(
              "flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-left text-sm transition-colors cursor-pointer",
              selectedFunds.length === 0
                ? "bg-surface-hover text-text-primary"
                : "text-text-primary hover:bg-surface-hover"
            )}
          >
            <span className="min-w-0 flex-1">All funds</span>
            <MenuCheck checked={selectedFunds.length === 0} />
          </button>

          <div className="my-2 h-px bg-border/80" />

          <div className="max-h-[min(50vh,260px)] overflow-y-auto">
            {funds.map((fund) => {
              const selected = selectedFunds.includes(fund.symbol);

              return (
                <button
                  key={fund.symbol}
                  type="button"
                  onClick={(event) => handleMenuToggle(event, fund.symbol)}
                  className="flex w-full items-center justify-between gap-3 rounded-xl px-3 py-2.5 text-left hover:bg-surface-hover transition-colors cursor-pointer"
                >
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium text-text-primary">
                      {fund.symbol}
                    </div>
                    <div className="truncate text-xs text-text-muted">
                      {fund.name}
                    </div>
                  </div>
                  <MenuCheck checked={selected} color={fund.color} />
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );

  function handleMenuToggle(event: ReactMouseEvent<HTMLButtonElement>, symbol: string) {
    event.preventDefault();
    onToggleFund(symbol);
  }
}

function HeaderLabel({ children }: { children: ReactNode }) {
  return (
    <span className="text-[11px] font-medium uppercase tracking-[0.14em] text-text-muted whitespace-nowrap">
      {children}
    </span>
  );
}

function MenuCheck({
  checked,
  color,
}: {
  checked: boolean;
  color?: string;
}) {
  return (
    <span
      className={cn(
        "flex h-5 w-5 shrink-0 items-center justify-center rounded-md border text-[11px] leading-none font-bold transition-colors",
        checked
          ? "text-white border-transparent"
          : "text-transparent border-border bg-surface"
      )}
      style={checked && color ? { backgroundColor: color } : undefined}
      aria-hidden="true"
    >
      ✓
    </span>
  );
}
