import {
  findFirstVisible,
  findSenderByHeaderText,
  readSubjectFromTitle,
  senderFromElement,
  senderFromHeaderText,
  type MailDomExtraction
} from "./mail-dom-shared.js";

const provider = "generic-chrome-extension";

const senderAttributeSelectors = [
  "[data-testid*='sender' i]",
  "[data-test-id*='sender' i]",
  "[class*='sender' i]",
  "[class*='from' i]",
  "address",
  "img[aria-label*='@']"
];

const senderHeaderSelectors = [
  "[aria-label^='From:']",
  "[data-testid*='from' i]",
  "[class*='message-header' i]",
  "[class*='header-from' i]",
  "th[title*='@']"
];

const senderContainerSelectors = [
  "[role='article']",
  "[data-message-id]",
  "[class*='message-view' i]",
  "[class*='message-body' i]",
  "[role='main']",
  "main"
];

const subjectSelectors = [
  "[data-testid*='subject' i]",
  "[data-test-id*='subject' i]",
  "h1[title]",
  "h2[title]",
  "[class*='subject' i]",
  "[aria-label^='Subject:']"
];

const titleSuffixes = ["Webmail", "Mail", "Inbox"];

export function extractVisibleGenericMetadata(root: ParentNode = document): MailDomExtraction | null {
  const subject = findFirstVisible(root, subjectSelectors)?.textContent?.trim() || readSubjectFromTitle(titleSuffixes) || "";

  for (const selector of senderAttributeSelectors) {
    for (const element of Array.from(root.querySelectorAll(selector))) {
      const extraction = senderFromElement(element, subject, provider);
      if (extraction.metadata) return extraction;
    }
  }

  for (const selector of senderHeaderSelectors) {
    const header = findFirstVisible(root, [selector]);
    if (header) {
      const extraction = senderFromHeaderText(header, subject, provider) ?? senderFromElement(header, subject, provider);
      if (extraction?.metadata) return extraction;
    }
  }

  return findSenderByHeaderText(root, senderContainerSelectors, subject, provider);
}
