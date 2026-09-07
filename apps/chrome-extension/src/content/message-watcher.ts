import type { MailDomExtraction } from "./mail-dom-shared.js";

declare global {
  interface Window {
    [key: string]: unknown;
  }
}

export function startMessageWatching(
  flagKey: string,
  extract: (root: ParentNode) => MailDomExtraction | null,
  renderWarning: (anchor: Element, extraction: MailDomExtraction) => void,
  removeWarning: (root: ParentNode) => void,
  root: ParentNode = document
): void {
  if (typeof window === "undefined" || window[flagKey]) {
    return;
  }
  window[flagKey] = true;

  let timeout: number | undefined;
  const schedule = () => {
    if (timeout !== undefined) {
      window.clearTimeout(timeout);
    }
    timeout = window.setTimeout(check, 120);
  };

  const check = () => {
    const extraction = extract(document);
    if (!extraction?.metadata || !extraction.anchor) {
      removeWarning(document);
      return;
    }
    renderWarning(extraction.anchor, extraction);
  };

  const observer = new MutationObserver(schedule);
  observer.observe(root, {
    childList: true,
    subtree: true
  });

  schedule();
}
