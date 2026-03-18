import {
  matchesPositionFilters,
  matchesPositionFundSelection,
} from "./portfolioFilters";
import type { FidelityPosition, FilterState } from "./types";

interface FilterSelectionState {
  filters: FilterState;
  selectedFunds: string[];
}

export function sanitizeSelectionForFilterChange(
  positions: FidelityPosition[] | null,
  previousFilters: FilterState,
  nextFilters: FilterState,
  selectedFunds: string[]
): FilterSelectionState {
  if (!positions) {
    return { filters: normalizeFilterState(nextFilters), selectedFunds };
  }

  const accountChanged = !areStringArraysEqual(
    previousFilters.accounts,
    nextFilters.accounts
  );
  const typeChanged = !areStringArraysEqual(
    previousFilters.investmentTypes,
    nextFilters.investmentTypes
  );

  const nextState: FilterSelectionState = {
    filters: normalizeFilterState(nextFilters),
    selectedFunds: [...selectedFunds],
  };

  if (accountChanged || typeChanged) {
    nextState.selectedFunds = getValidSelectedFunds(
      positions,
      nextState.filters,
      nextState.selectedFunds
    );
  }

  if (accountChanged) {
    nextState.filters.investmentTypes = getValidInvestmentTypes(
      positions,
      nextState.filters.accounts,
      [],
      nextState.filters.investmentTypes
    );
  }

  if (typeChanged) {
    nextState.filters.accounts = getValidAccounts(
      positions,
      [],
      nextState.filters.investmentTypes,
      nextState.filters.accounts
    );
  }

  return nextState;
}

export function sanitizeSelectionForFundChange(
  positions: FidelityPosition[] | null,
  filters: FilterState,
  nextSelectedFunds: string[]
): FilterSelectionState {
  if (!positions) {
    return {
      filters: normalizeFilterState(filters),
      selectedFunds: [...nextSelectedFunds],
    };
  }

  const nextState: FilterSelectionState = {
    filters: normalizeFilterState(filters),
    selectedFunds: [...nextSelectedFunds],
  };

  nextState.filters.accounts = getValidAccounts(
    positions,
    nextState.selectedFunds,
    [],
    nextState.filters.accounts
  );
  nextState.filters.investmentTypes = getValidInvestmentTypes(
    positions,
    nextState.filters.accounts,
    nextState.selectedFunds,
    nextState.filters.investmentTypes
  );

  return nextState;
}

export function sanitizeCurrentSelection(
  positions: FidelityPosition[] | null,
  filters: FilterState,
  selectedFunds: string[]
): FilterSelectionState {
  if (!positions) {
    return {
      filters: normalizeFilterState(filters),
      selectedFunds: [...selectedFunds],
    };
  }

  const normalizedFilters = normalizeFilterState(filters);
  const nextSelectedFunds = getValidSelectedFunds(
    positions,
    normalizedFilters,
    selectedFunds
  );
  const nextAccounts = getValidAccounts(
    positions,
    nextSelectedFunds,
    normalizedFilters.investmentTypes,
    normalizedFilters.accounts
  );
  const nextInvestmentTypes = getValidInvestmentTypes(
    positions,
    nextAccounts,
    nextSelectedFunds,
    normalizedFilters.investmentTypes
  );

  return {
    filters: {
      ...normalizedFilters,
      accounts: nextAccounts,
      investmentTypes: nextInvestmentTypes,
    },
    selectedFunds: nextSelectedFunds,
  };
}

function getValidSelectedFunds(
  positions: FidelityPosition[],
  filters: FilterState,
  selectedFunds: string[]
): string[] {
  return selectedFunds.filter((symbol) =>
    positions.some(
      (position) =>
        position.symbol === symbol && matchesPositionFilters(position, filters)
    )
  );
}

function getValidAccounts(
  positions: FidelityPosition[],
  selectedFunds: string[],
  investmentTypes: string[],
  accounts: string[]
): string[] {
  if (accounts.length === 0) {
    return accounts;
  }

  return accounts.filter((account) =>
    positions.some(
      (position) =>
        matchesPositionFilters(position, {
          accounts: [account],
          investmentTypes,
        }) && matchesPositionFundSelection(position, selectedFunds)
    )
  );
}

function getValidInvestmentTypes(
  positions: FidelityPosition[],
  accounts: string[],
  selectedFunds: string[],
  investmentTypes: string[]
): string[] {
  if (investmentTypes.length === 0) {
    return investmentTypes;
  }

  return investmentTypes.filter((investmentType) =>
    positions.some(
      (position) =>
        matchesPositionFilters(position, {
          accounts,
          investmentTypes: [investmentType],
        }) && matchesPositionFundSelection(position, selectedFunds)
    )
  );
}

function normalizeFilterState(filters: FilterState): FilterState {
  const searchQuery = filters.searchQuery?.trim();

  return {
    accounts: [...filters.accounts],
    investmentTypes: [...filters.investmentTypes],
    ...(searchQuery ? { searchQuery } : {}),
  };
}

function areStringArraysEqual(a: string[], b: string[]): boolean {
  return a.length === b.length && a.every((value, index) => value === b[index]);
}
