import "fake-indexeddb/auto";
import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";

if (typeof window !== "undefined" && !window.matchMedia) {
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    value: (query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addEventListener: () => {},
      removeEventListener: () => {},
      addListener: () => {},
      removeListener: () => {},
      dispatchEvent: () => false,
    }),
  });
}

if (typeof window !== "undefined" && typeof IntersectionObserver === "undefined") {
  class MockIntersectionObserver implements IntersectionObserver {
    readonly root = null;
    readonly rootMargin = "";
    readonly thresholds: number[] = [];
    observe = () => undefined;
    unobserve = () => undefined;
    disconnect = () => undefined;
    takeRecords = (): IntersectionObserverEntry[] => [];
  }
  Object.defineProperty(window, "IntersectionObserver", {
    value: MockIntersectionObserver,
    writable: true,
  });
}

if (typeof window !== "undefined" && typeof ResizeObserver === "undefined") {
  class MockResizeObserver implements ResizeObserver {
    observe = () => undefined;
    unobserve = () => undefined;
    disconnect = () => undefined;
  }
  Object.defineProperty(window, "ResizeObserver", {
    value: MockResizeObserver,
    writable: true,
  });
}

afterEach(() => cleanup());
