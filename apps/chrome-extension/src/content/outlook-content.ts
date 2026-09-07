import { analyzeMessage } from "@anti-phishing/detector";
import { extractVisibleOutlookMetadata } from "./outlook-dom.js";
import { startMessageWatching } from "./message-watcher.js";
import { removeInlineWarning, renderInlineWarning } from "../ui/banner.js";

if (typeof document !== "undefined") {
  startMessageWatching(
    "__outlookPhishGuardStarted",
    extractVisibleOutlookMetadata,
    (anchor, extraction) => {
      if (!extraction.metadata) return;
      renderInlineWarning(anchor, analyzeMessage(extraction.metadata));
    },
    removeInlineWarning
  );
}
