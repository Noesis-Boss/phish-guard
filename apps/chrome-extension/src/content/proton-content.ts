import { analyzeMessage } from "@anti-phishing/detector";
import { extractVisibleProtonMetadata } from "./proton-dom.js";
import { startMessageWatching } from "./message-watcher.js";
import { removeInlineWarning, renderInlineWarning } from "../ui/banner.js";

if (typeof document !== "undefined") {
  startMessageWatching(
    "__protonPhishGuardStarted",
    extractVisibleProtonMetadata,
    (anchor, extraction) => {
      if (!extraction.metadata) return;
      renderInlineWarning(anchor, analyzeMessage(extraction.metadata));
    },
    removeInlineWarning
  );
}
