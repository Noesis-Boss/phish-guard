import {
  findFirstVisible,
  findSenderByHeaderText,
  readSubjectFromTitle,
  senderFromElement,
  senderFromHeaderText,
  type MailDomExtraction
} from "./mail-dom-shared.js";

const provider = "yahoo-chrome-extension";

const senderAttributeSelectors = [
  "[data-test-id='message-from-name']",
  "[data-test-id='from'] [title*='@']",
  "[data-test-id='message-sender']"
];

const senderHeaderSelectors = [
  "[data-test-id='msg-header']",
  "[data-test-id='message-header']",
  "[aria-label*='From:']"
];

const senderContainerSelectors = [
  "[data-test-id='message-view-body']",
  "[data-test-id='message-container']",
  "[role='main']"
];

const subjectSelectors = [
  "[data-test-id='message-view-subject']",
  "[data-test-id='msg-subject']",
  "[role='heading'][data-test-id*='subject' i]"
];

function readYahooSubject(root: ParentNode): string | null {
  const subjectElement = findFirstVisible(root, subjectSelectors);
  const subject = subjectElement?.textContent?.trim();
  if (subject) return subject;
  return readSubjectFromTitle([" - Yahoo Mail"]);
}

export function extractVisibleYahooMetadata(root: ParentNode = document): MailDomExtraction | null {
  const subject = readYahooSubject(root);
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
