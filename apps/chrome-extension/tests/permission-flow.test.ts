import { describe, expect, it, vi } from "vitest";
import { syncMailProtection } from "../src/background/service-worker.js";
import {
  enableMailProtection,
  popupViewForState
} from "../src/popup/popup.js";
import {
  contentScriptIds,
  mailPermissionRequest,
  type ExtensionChromeApi
} from "../src/background/permissions.js";

const mailOrigins = mailPermissionRequest().origins;

function fakeChrome(granted: boolean): ExtensionChromeApi {
  return {
    permissions: {
      contains: vi.fn(async () => granted),
      request: vi.fn(async (request) => {
        expect(request.origins).toEqual(mailOrigins);
        return granted;
      }),
      remove: vi.fn(async () => true)
    },
    scripting: {
      registerContentScripts: vi.fn(async () => undefined),
      unregisterContentScripts: vi.fn(async () => undefined),
      executeScript: vi.fn(async () => undefined),
      insertCSS: vi.fn(async () => undefined)
    },
    tabs: {
      query: vi.fn(async (queryInfo) => {
        if ("url" in queryInfo) {
          return [
            { id: 123, url: "https://mail.google.com/mail/u/0/#inbox" },
            { id: 456, url: "https://outlook.office.com/mail/inbox" },
            { id: 789, url: "https://mail.yahoo.com/d/folders/1" },
            { id: 321, url: "https://mail.proton.me/u/0/inbox" },
            { id: 999, url: "https://example.com/" }
          ];
        }
        return [{ id: 123, url: "https://mail.google.com/mail/u/0/#inbox" }];
      })
    }
  };
}

describe("permission-first onboarding", () => {
  it("keeps the pre-permission state calm and explicit", () => {
    expect(popupViewForState("needs-permission")).toMatchObject({
      buttonLabel: "Turn on mail warnings",
      buttonDisabled: false,
      statusText: "Mail warnings are off until you allow access to Gmail, Outlook, Yahoo Mail, and Proton Mail."
    });
  });

  it("registers always-on protection for all platforms only after permission is granted", async () => {
    const api = fakeChrome(true);

    await expect(enableMailProtection(api)).resolves.toBe("ready");
    expect(api.permissions.request).toHaveBeenCalledTimes(1);
    expect(api.scripting.registerContentScripts).toHaveBeenCalledTimes(4);
    const registerMock = vi.mocked(api.scripting.registerContentScripts);
    const registeredIds = registerMock.mock.calls.flatMap(
      (call) => call[0].map((script: { id: string }) => script.id)
    );
    expect(registeredIds).toEqual(contentScriptIds);
    expect(api.scripting.executeScript).toHaveBeenCalledTimes(4);
    expect(api.scripting.insertCSS).toHaveBeenCalledTimes(4);
  });

  it("injects into already-open mail tabs when permission was previously granted", async () => {
    const api = fakeChrome(true);

    await expect(syncMailProtection(api)).resolves.toBe(true);

    expect(api.scripting.registerContentScripts).toHaveBeenCalledTimes(4);
    expect(api.tabs?.query).toHaveBeenCalledWith({ url: mailOrigins });
    expect(api.scripting.executeScript).toHaveBeenCalledTimes(4);
    expect(api.scripting.insertCSS).toHaveBeenCalledTimes(4);
  });

  it("keeps protection off when the user denies permission", async () => {
    const api = fakeChrome(false);

    await expect(enableMailProtection(api)).resolves.toBe("denied");
    expect(api.scripting.registerContentScripts).not.toHaveBeenCalled();
  });
});
