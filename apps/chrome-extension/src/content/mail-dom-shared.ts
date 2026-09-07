import type { MessageLinkMetadata, MessageMetadata } from "@anti-phishing/detector";

export interface MailDomExtraction {
  metadata: MessageMetadata | null;
  anchor: Element | null;
}

export const angleBracketSenderPattern = /(.+?)\s*<([^<>\s@]+@[^<>\s@]+\.[^<>\s@]+)>/;

export const ignoredBodyContentSelectors = [
  "blockquote",
  "[class*='quote']",
  "[data-test-id*='quote']",
  ".signature",
  "[class*='signature']"
];

export function isProbablyVisible(element: Element): boolean {
  const htmlElement = element as HTMLElement;
  if (htmlElement.hidden || htmlElement.getAttribute("aria-hidden") === "true") return false;
  return true;
}

export function normalizeHeaderText(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

export function formatFrom(displayName: string, address: string): string {
  if (!address) return displayName;
  const cleanName = displayName.replace(/"/g, "").trim();
  return cleanName && cleanName.toLowerCase() !== address.toLowerCase() ? `"${cleanName}" <${address}>` : address;
}

export function findFirstVisible(root: ParentNode, selectors: string[]): Element | null {
  for (const selector of selectors) {
    for (const match of Array.from(root.querySelectorAll(selector))) {
      if (isProbablyVisible(match)) return match;
    }
  }
  return null;
}

const bareAddressPattern = /[\w.+-]+@[\w.-]+\.[a-z]{2,}/i;

function firstAddressIn(value: string | null | undefined): string | null {
  return value?.match(bareAddressPattern)?.[0] ?? null;
}

export function closestMessageContainer(element: Element): HTMLElement | null {
  const selectors = "[role='listitem'], [role='article'], article, [data-message-id], [data-test-id], [data-testid], [role='main']";
  let node: Element | null = element.parentElement;
  while (node) {
    if (node.matches(selectors)) return node as HTMLElement;
    node = node.parentElement;
  }
  return null;
}

export function senderFromElement(senderElement: Element, subject: string, provider: string): MailDomExtraction {
  let senderAddress =
    senderElement.getAttribute("email")
    ?? senderElement.getAttribute("data-hovercard-id")
    ?? firstAddressIn(senderElement.getAttribute("title"))
    ?? firstAddressIn(senderElement.getAttribute("aria-label"))
    ?? "";
  let senderDisplayName = senderElement.getAttribute("name") ?? normalizeHeaderText(senderElement.textContent ?? "");
  if (!senderAddress) {
    const container = closestMessageContainer(senderElement);
    const addressElement = container?.querySelector("[title*='@'], [aria-label*='@'], [data-testid*='address' i], [data-test-id*='address' i], [class*='address' i]");
    const addressCandidate = addressElement
      ? firstAddressIn(addressElement.getAttribute("title") ?? addressElement.getAttribute("aria-label") ?? addressElement.textContent ?? "")
      : null;
    if (addressCandidate) {
      senderAddress = addressCandidate;
      if (!senderDisplayName) senderDisplayName = normalizeHeaderText(senderElement.textContent ?? "");
    }
  }
  return extractionFromSender(senderElement, senderDisplayName, senderAddress, subject, provider);
}

export function senderFromHeaderText(element: Element, subject: string, provider: string): MailDomExtraction | null {
  const sources = [normalizeHeaderText(element.textContent ?? ""), normalizeHeaderText(element.getAttribute("aria-label") ?? "")];
  for (const source of sources) {
    const match = source.match(angleBracketSenderPattern);
    if (!match) continue;
    const displayName = (match[1]?.trim() ?? "").replace(/^(from|sender)\s*:\s*/i, "").trim();
    const address = (match[2] ?? "").trim();
    if (!displayName || !address) continue;
    return extractionFromSender(element, displayName, address, subject, provider);
  }
  return null;
}

export function findSenderByHeaderText(root: ParentNode, containerSelectors: string[], subject: string, provider: string): MailDomExtraction | null {
  for (const selector of containerSelectors) {
    for (const container of Array.from(root.querySelectorAll(selector))) {
      if (!isProbablyVisible(container)) continue;
      const mailto = findMailtoSender(container, subject, provider);
      if (mailto) return mailto;
      const pattern = findSenderByPatternInText(container, subject, provider);
      if (pattern) return pattern;
    }
  }
  return null;
}

export function findSenderByPatternInText(container: Element, subject: string, provider: string): MailDomExtraction | null {
  for (const element of Array.from(container.querySelectorAll("*"))) {
    if (!isProbablyVisible(element)) continue;
    const text = element.textContent ?? "";
    if (text.length > 400) continue;
    if (!/[\w.+-]+@[\w.-]+\.[a-z]{2,}/i.test(text)) continue;
    if (element.querySelector("*")) continue;
    const match = normalizeHeaderText(text).match(angleBracketSenderPattern);
    if (match?.[2]) {
      return extractionFromSender(element, match[1]?.trim() ?? "", match[2].trim(), subject, provider);
    }
  }
  return null;
}

export function findMailtoSender(root: ParentNode, subject: string, provider: string): MailDomExtraction | null {
  const link = root.querySelector<HTMLAnchorElement>("a[href^='mailto:']");
  if (!link) return null;
  const address = decodeURIComponent(link.getAttribute("href")?.replace(/^mailto:/i, "").split("?")[0] ?? "");
  if (!/[\w.+-]+@[\w.-]+\.[a-z]{2,}/i.test(address)) return null;
  return extractionFromSender(link, normalizeHeaderText(link.textContent ?? ""), address, subject, provider);
}

export function readSubjectFromTitle(titleSuffixes: string[]): string | null {
  if (typeof document === "undefined") return null;
  const title = normalizeHeaderText(document.title ?? "");
  for (const suffix of titleSuffixes) {
    if (title.toLowerCase().endsWith(suffix.toLowerCase())) {
      const subject = title.slice(0, title.length - suffix.length).trim();
      if (subject) return subject;
    }
  }
  return null;
}

export function extractionFromSender(
  senderElement: Element,
  senderDisplayName: string,
  senderAddress: string,
  subject: string,
  provider: string
): MailDomExtraction {
  const messageContent = closestMessageContainer(senderElement);
  const anchor = messageContent ?? senderElement.parentElement ?? senderElement;
  const bodyElement = resolveBodyNear(senderElement, messageContent ?? senderElement);
  const bodyText = bodyElement ? readBodyText(bodyElement) : null;
  const links = bodyElement ? readBodyLinks(bodyElement) : [];

  return {
    metadata: {
      from: formatFrom(senderDisplayName, senderAddress),
      ...(subject ? { subject } : {}),
      ...(bodyText ? { bodyText } : {}),
      ...(links.length > 0 ? { links } : {}),
      provider
    },
    anchor
  };
}

export function resolveBodyNear(senderElement: Element, firstScope: Element): Element | null {
  let scope: Element | null = firstScope;
  for (let depth = 0; depth < 4 && scope; depth += 1) {
    const body = resolveBodyElement(scope);
    if (body) return body;
    scope = scope.parentElement;
  }
  return null;
}

export function resolveBodyElement(scope: Element): Element | null {
  const candidates = [
    "[role='document']",
    "[data-testid='message-body']",
    "[data-test-id='message-view-body']",
    ".protonmail_message",
    "[data-testid='message-body-container']"
  ];
  for (const selector of candidates) {
    for (const match of Array.from(scope.querySelectorAll(selector))) {
      if ((match.textContent ?? "").trim().length > 0) return match;
    }
  }
  for (const iframe of Array.from(scope.querySelectorAll("iframe"))) {
    try {
      const inner = iframe.contentDocument?.body;
      if (inner && (inner.textContent ?? "").trim().length > 0) return inner;
    } catch {
      continue;
    }
  }
  return null;
}

export function readBodyText(body: Element): string | null {
  const bodyTextSource = body.cloneNode(true) as Element;
  for (const element of Array.from(bodyTextSource.querySelectorAll([
    "a",
    "[href]",
    "img",
    "style",
    "script",
    ...ignoredBodyContentSelectors
  ].join(",")))) {
    element.remove();
  }

  const textParts = [bodyTextSource.textContent ?? ""];
  for (const image of Array.from(body.querySelectorAll("img"))) {
    if (isInsideIgnoredBodyContent(image)) continue;
    textParts.push(
      image.getAttribute("alt") ?? "",
      image.getAttribute("title") ?? "",
      image.getAttribute("aria-label") ?? ""
    );
  }

  const bodyText = normalizeHeaderText(textParts.join(" "));
  return bodyText || null;
}

export function readBodyLinks(body: Element): MessageLinkMetadata[] {
  const bodies = [body];
  for (const iframe of Array.from(body.querySelectorAll("iframe"))) {
    try {
      const inner = iframe.contentDocument?.body;
      if (inner) bodies.push(inner);
    } catch {
      continue;
    }
  }

  const links: MessageLinkMetadata[] = [];
  for (const current of bodies) {
    for (const link of Array.from(current.querySelectorAll<HTMLAnchorElement>("a[href]"))) {
      const href = link.href || link.getAttribute("href") || "";
      if (!/^https?:\/\//i.test(href)) continue;
      links.push({ href, text: normalizeHeaderText(link.textContent ?? "") });
      if (links.length >= 20) return links;
    }
  }
  return links;
}

export function isInsideIgnoredBodyContent(element: Element): boolean {
  return ignoredBodyContentSelectors.some((selector) => element.closest(selector));
}
