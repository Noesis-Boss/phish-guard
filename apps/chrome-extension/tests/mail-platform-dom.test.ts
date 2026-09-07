import { Window } from "happy-dom";

import { beforeEach, describe, expect, it } from "vitest";
import { extractVisibleOutlookMetadata } from "../src/content/outlook-dom.js";
import { extractVisibleProtonMetadata } from "../src/content/proton-dom.js";
import { extractVisibleYahooMetadata } from "../src/content/yahoo-dom.js";

let window: Window;

beforeEach(() => {
  window = new Window();
  (globalThis as { document?: Document }).document = window.document as unknown as Document;
});

function render(html: string, title = ""): void {
  if (title) window.document.title = title;
  window.document.body.innerHTML = html;
}

describe("multi-platform DOM extraction", () => {
  it("extracts Outlook sender, subject, and body via data-testid selectors", () => {
    render(
      `<div role="main">
        <h1 data-testid="ConversationHeaderSubject">Verify your account now</h1>
        <div role="listitem" aria-label="From: Microsoft Account <no-reply@microsoft-verify.com>">
          <span data-testid="MessageItemDisplayName" aria-label="From: Microsoft Account <no-reply@microsoft-verify.com>">Microsoft Account</span>
          <div role="document">Secure your mailbox at <a href="https://microsoft-verify.com/login">this link</a> today.</div>
        </div>
      </div>`
    );

    const result = extractVisibleOutlookMetadata(window.document as unknown as Document);
    expect(result?.metadata?.from).toBe('"Microsoft Account" <no-reply@microsoft-verify.com>');
    expect(result?.metadata?.subject).toBe("Verify your account now");
    expect(result?.metadata?.bodyText).toContain("Secure your mailbox at");
    expect(result?.metadata?.links?.[0]?.href).toBe("https://microsoft-verify.com/login");
  });

  it("extracts Outlook sender via header text when test-ids are absent", () => {
    render(
      `<div role="main">
        <div aria-label="From: Hr Dept">Hr Dept &lt;hr@payroll-update.com&gt;</div>
        <div role="document">Review the updated payroll schedule.</div>
      </div>`,
      "Payroll update - Outlook"
    );

    const result = extractVisibleOutlookMetadata(window.document as unknown as Document);
    expect(result?.metadata?.from).toBe('"Hr Dept" <hr@payroll-update.com>');
    expect(result?.metadata?.subject).toBe("Payroll update");
  });

  it("extracts Yahoo sender, subject, and body via data-test-id selectors", () => {
    render(
      `<div data-test-id="message-container">
        <span data-test-id="message-view-subject">Your invoice is ready</span>
        <span data-test-id="message-from-name" title="billing@netflix-billing.net">Netflix Billing</span>
        <div data-test-id="message-view-body">Pay your invoice at <a href="https://netflix-billing.net/pay">payment center</a>.</div>
      </div>`
    );

    const result = extractVisibleYahooMetadata(window.document as unknown as Document);
    expect(result?.metadata?.from).toBe('"Netflix Billing" <billing@netflix-billing.net>');
    expect(result?.metadata?.subject).toBe("Your invoice is ready");
    expect(result?.metadata?.links?.[0]?.href).toBe("https://netflix-billing.net/pay");
  });

  it("extracts Yahoo sender via mailto fallback and title subject", () => {
    render(
      `<div data-test-id="message-container">
        <a href="mailto:support@paypal-resolution.com">PayPal Support</a>
        <div data-test-id="message-view-body">Your account is limited.</div>
      </div>`,
      "Account Notice - Yahoo Mail"
    );

    const result = extractVisibleYahooMetadata(window.document as unknown as Document);
    expect(result?.metadata?.from).toBe('"PayPal Support" <support@paypal-resolution.com>');
    expect(result?.metadata?.subject).toBe("Account Notice");
  });

  it("extracts Proton sender, subject, and body via data-testid selectors", () => {
    render(
      `<div data-testid="message-container">
        <span data-testid="message-subject">Security alert</span>
        <div data-testid="message-header-from"><span data-testid="from-address" title="security@chase-verify.net">Chase Security</span></div>
        <div class="protonmail_message">Confirm your identity at <a href="https://chase-verify.net/id">verify now</a>.</div>
      </div>`
    );

    const result = extractVisibleProtonMetadata(window.document as unknown as Document);
    expect(result?.metadata?.from).toBe('"Chase Security" <security@chase-verify.net>');
    expect(result?.metadata?.subject).toBe("Security alert");
    expect(result?.metadata?.links?.[0]?.href).toBe("https://chase-verify.net/id");
  });

  it("extracts Proton sender via visible header text fallback", () => {
    render(
      `<div data-testid="message-container">
        <span>Amazon Security &lt;no-reply@amazon-alerts.net&gt;</span>
        <div class="protonmail_message">Your package could not be delivered.</div>
      </div>`,
      "Delivery problem | Proton Mail"
    );

    const result = extractVisibleProtonMetadata(window.document as unknown as Document);
    expect(result?.metadata?.from).toBe('"Amazon Security" <no-reply@amazon-alerts.net>');
    expect(result?.metadata?.subject).toBe("Delivery problem");
  });
});
