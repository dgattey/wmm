"use client";

import { flushSync } from "react-dom";

export type ViewTransitionNavDirection = "forward" | "back";

const DIR_ATTR = "data-view-transition-dir";

/**
 * Runs a Next.js App Router navigation inside the browser View Transitions API
 * so route changes can animate (e.g. push / pop between home and a portfolio).
 */
export function navigateWithViewTransition(
  direction: ViewTransitionNavDirection,
  update: () => void
): void {
  if (typeof document === "undefined") {
    update();
    return;
  }

  document.documentElement.setAttribute(DIR_ATTR, direction);

  const runUpdate = () => {
    flushSync(update);
  };

  const transition = document.startViewTransition?.(runUpdate);
  if (!transition) {
    try {
      runUpdate();
    } finally {
      document.documentElement.removeAttribute(DIR_ATTR);
    }
    return;
  }

  void transition.finished.finally(() => {
    document.documentElement.removeAttribute(DIR_ATTR);
  });
}
