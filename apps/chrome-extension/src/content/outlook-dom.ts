import {
  findFirstVisible,
  findSenderByHeaderText,
  findSenderByPatternInText,
  readSubjectFromTitle,
  senderFromElement,
  senderFromHeaderText,
  type MailDomExtraction
} from "./mail-dom-shared.js";

const provider = "outlook-chrome-extension";

const senderAttributeSelectors = [
  "[data-testid='MessageItemDisplayName']",
  "[data-testid='DisplayName']",
  "img[aria-label*='@']",
  "[data-legacy-selected='true'] [aria-label*='@']"
];

const senderHeaderSelectors = [
  "[aria-label^='From:']",
  "[role='heading'][aria-label^='From:']",
  "[data-testid='message-header-sender']"
];

const senderContainerSelectors = [
  "[role='listitem'][aria-label]",
  "[data-testid='message-header']",
  "[role='main']"
];

const subjectSelectors = [
  "[data-testid='ConversationHeaderSubject']",
  "[role='heading'][aria-label^='Subject:']",
  "[aria-label^='Subject:']"
];

function readOutlookSubject(root: ParentNode): string | null {
  const subjectElement = findFirstVisible(root, subjectSelectors);
  if (subjectElement) {
    const ariaLabel = subjectElement.getAttribute("aria-label") ?? "";
    const fromLabel = ariaLabel.replace(/^Subject:\s*/i, "").trim();
    const text = subjectElement.textContent?.trim() ?? "";
    const subject = fromLabel || text;
    if (subject) return subject;
  }
  return readSubjectFromTitle([" - Outlook"]);
}

export function extractVisibleOutlookMetadata(root: ParentNode = document): MailDomExtraction | null {
  const subject = readOutlookSubject(root);
  if (!subject) {
    return { metadata: null, anchor: null };
  }

  for (const element of Array.from(root.querySelectorAll(senderAttributeSelectors.join(",")))) {
    if (element.getAttribute("email") || /@/.test(element.getAttribute("aria-label") ?? "")) {
      const extraction = senderFromElement(element, subject, provider);
      if (extraction.metadata) return extraction;
    }
  }

  const headerSender = findFirstVisible(root, senderHeaderSelectors);
  if (headerSender) {
    const extraction = senderFromHeaderText(headerSender, subject, provider);
    if (extraction) return extraction;
  }

  return findSenderByHeaderText(root, senderContainerSelectors, subject, provider);
}
