import {
  findFirstVisible,
  findSenderByHeaderText,
  readSubjectFromTitle,
  senderFromElement,
  senderFromHeaderText,
  type MailDomExtraction
} from "./mail-dom-shared.js";

const provider = "proton-chrome-extension";

const senderAttributeSelectors = [
  "[data-testid='message-header-from'] [data-testid*='address']",
  "[data-testid='message-header-from'] [title*='@']",
  "[data-testid='message-header-from'] [aria-label*='@']",
  "[data-testid='from-address']"
];

const senderHeaderSelectors = [
  "[data-testid='message-header-from']",
  "[data-testid='from']",
  "[class*='message-header-from']"
];

const senderContainerSelectors = [
  "[data-testid='message-header']",
  "[data-testid='message-container']",
  "[role='main']"
];

const subjectSelectors = [
  "[data-testid='message-subject']",
  "[data-testid='conversation-subject']",
  "[class*='message-subject']",
  "[role='heading'][data-testid*='subject' i]"
];

function readProtonSubject(root: ParentNode): string | null {
  const subjectElement = findFirstVisible(root, subjectSelectors);
  const subject = subjectElement?.textContent?.trim();
  if (subject) return subject;
  return readSubjectFromTitle([" | Proton Mail"]);
}

export function extractVisibleProtonMetadata(root: ParentNode = document): MailDomExtraction | null {
  const subject = readProtonSubject(root);
  if (!subject) {
    return { metadata: null, anchor: null };
  }

  for (const element of Array.from(root.querySelectorAll(senderAttributeSelectors.join(",")))) {
    const extraction = senderFromElement(element, subject, provider);
    if (extraction.metadata) return extraction;
  }

  const headerSender = findFirstVisible(root, senderHeaderSelectors);
  if (headerSender) {
    const extraction = senderFromHeaderText(headerSender, subject, provider);
    if (extraction) return extraction;
  }

  return findSenderByHeaderText(root, senderContainerSelectors, subject, provider);
}
