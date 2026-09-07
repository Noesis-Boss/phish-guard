import { describe, expect, it } from "vitest";
import manifest from "../manifest.json" with { type: "json" };

describe("Chrome extension manifest permissions", () => {
  it("uses narrow optional host permissions for each supported mail platform", () => {
    expect(manifest.optional_host_permissions).toEqual([
      "https://mail.google.com/*",
      "https://outlook.office.com/*",
      "https://outlook.office365.com/*",
      "https://outlook.live.com/*",
      "https://mail.yahoo.com/*",
      "https://mail.proton.me/*",
      "https://mail.protonmail.com/*"
    ]);
    expect(manifest.permissions).toEqual(["scripting"]);
  });

  it("declares store-ready extension icons", () => {
    expect(manifest.icons).toEqual({
      "16": "assets/icon-16.png",
      "32": "assets/icon-32.png",
      "48": "assets/icon-48.png",
      "128": "assets/icon-128.png"
    });
    expect(manifest.action.default_icon).toEqual({
      "16": "assets/icon-16.png",
      "32": "assets/icon-32.png"
    });
  });

  it("does not request scary broad or unrelated permissions", () => {
    const manifestText = JSON.stringify(manifest);

    expect(manifestText).not.toContain("<all_urls>");
    expect(manifestText).not.toContain("cookies");
    expect(manifestText).not.toContain("webRequest");
    expect(manifestText).not.toContain("gmail.readonly");
    expect(manifest).not.toHaveProperty("content_scripts");
  });
});
