export const gmailHostPermission = "https://mail.google.com/*";
export const outlookHostPermissions = [
  "https://outlook.office.com/*",
  "https://outlook.office365.com/*",
  "https://outlook.live.com/*"
];
export const yahooHostPermissions = ["https://mail.yahoo.com/*"];
export const protonHostPermissions = ["https://mail.proton.me/*", "https://mail.protonmail.com/*"];

export interface MailPlatformDefinition {
  id: string;
  label: string;
  matches: string[];
  contentScriptId: string;
  contentScriptJs: string;
}

export const gmailPlatform: MailPlatformDefinition = {
  id: "gmail",
  label: "Gmail",
  matches: [gmailHostPermission],
  contentScriptId: "gmail-phish-guard-content",
  contentScriptJs: "content/gmail-content.js"
};

export const outlookPlatform: MailPlatformDefinition = {
  id: "outlook",
  label: "Outlook",
  matches: outlookHostPermissions,
  contentScriptId: "outlook-phish-guard-content",
  contentScriptJs: "content/outlook-content.js"
};

export const yahooPlatform: MailPlatformDefinition = {
  id: "yahoo",
  label: "Yahoo Mail",
  matches: yahooHostPermissions,
  contentScriptId: "yahoo-phish-guard-content",
  contentScriptJs: "content/yahoo-content.js"
};

export const protonPlatform: MailPlatformDefinition = {
  id: "proton",
  label: "Proton Mail",
  matches: protonHostPermissions,
  contentScriptId: "proton-phish-guard-content",
  contentScriptJs: "content/proton-content.js"
};

export const mailPlatforms: MailPlatformDefinition[] = [
  gmailPlatform,
  outlookPlatform,
  yahooPlatform,
  protonPlatform
];

export const contentScriptIds = mailPlatforms.map((platform) => platform.contentScriptId);

export interface ExtensionPermissionsApi {
  contains(request: { origins: string[] }): Promise<boolean>;
  request(request: { origins: string[] }): Promise<boolean>;
}

export interface ExtensionScriptingApi {
  registerContentScripts(scripts: Array<{
    id: string;
    matches: string[];
    js: string[];
    css?: string[];
    runAt?: "document_idle";
    persistAcrossSessions?: boolean;
  }>): Promise<void>;
  unregisterContentScripts(filter: { ids: string[] }): Promise<void>;
  executeScript(injection: { target: { tabId: number }; files: string[] }): Promise<unknown>;
  insertCSS(injection: { target: { tabId: number }; files: string[] }): Promise<void>;
}

export interface ExtensionTabsApi {
  query(queryInfo: { active?: boolean; currentWindow?: boolean; url?: string | string[] }): Promise<Array<{ id?: number; url?: string }>>;
}

export interface ExtensionChromeApi {
  permissions: ExtensionPermissionsApi;
  scripting: ExtensionScriptingApi;
  tabs?: ExtensionTabsApi;
}

export const gmailContentScriptId = gmailPlatform.contentScriptId;

export function gmailPermissionRequest(): { origins: string[] } {
  return { origins: [gmailHostPermission] };
}

export function mailPermissionRequest(): { origins: string[] } {
  return {
    origins: Array.from(new Set(mailPlatforms.flatMap((platform) => platform.matches)))
  };
}

export async function hasGmailPermission(api: ExtensionPermissionsApi): Promise<boolean> {
  return api.contains(gmailPermissionRequest());
}

export async function requestGmailPermission(api: ExtensionPermissionsApi): Promise<boolean> {
  return api.request(gmailPermissionRequest());
}

export async function hasMailPermission(api: ExtensionPermissionsApi): Promise<boolean> {
  return api.contains(mailPermissionRequest());
}

export async function requestMailPermission(api: ExtensionPermissionsApi): Promise<boolean> {
  return api.request(mailPermissionRequest());
}

export async function registerGmailProtection(api: ExtensionScriptingApi): Promise<void> {
  await registerPlatformProtection(api, gmailPlatform);
}

export async function registerPlatformProtection(api: ExtensionScriptingApi, platform: MailPlatformDefinition): Promise<void> {
  await api.unregisterContentScripts({ ids: [platform.contentScriptId] }).catch(() => undefined);
  await api.registerContentScripts([
    {
      id: platform.contentScriptId,
      matches: platform.matches,
      js: [platform.contentScriptJs],
      css: ["ui/banner.css"],
      runAt: "document_idle",
      persistAcrossSessions: true
    }
  ]);
}

export async function registerMailProtection(api: ExtensionScriptingApi): Promise<void> {
  for (const platform of mailPlatforms) {
    await registerPlatformProtection(api, platform);
  }
}

function urlMatchesAnyPlatform(url: string | undefined): MailPlatformDefinition | null {
  if (!url || !url.startsWith("https://")) return null;
  for (const platform of mailPlatforms) {
    for (const pattern of platform.matches) {
      const prefix = pattern.replace(/\/\*$/, "/");
      if (url.startsWith(prefix)) return platform;
    }
  }
  return null;
}

export async function activateMailTab(api: Pick<ExtensionChromeApi, "scripting">, tab: { id?: number; url?: string }): Promise<boolean> {
  if (!tab.id || !urlMatchesAnyPlatform(tab.url)) {
    return false;
  }

  await api.scripting.insertCSS({
    target: { tabId: tab.id },
    files: ["ui/banner.css"]
  });
  await api.scripting.executeScript({
    target: { tabId: tab.id },
    files: [gmailPlatform.contentScriptJs, outlookPlatform.contentScriptJs, yahooPlatform.contentScriptJs, protonPlatform.contentScriptJs]
  });
  return true;
}

export async function activateGmailTab(api: Pick<ExtensionChromeApi, "scripting">, tab: { id?: number; url?: string }): Promise<boolean> {
  if (!tab.id || !tab.url?.startsWith("https://mail.google.com/")) {
    return false;
  }

  await api.scripting.insertCSS({
    target: { tabId: tab.id },
    files: ["ui/banner.css"]
  });
  await api.scripting.executeScript({
    target: { tabId: tab.id },
    files: [gmailPlatform.contentScriptJs]
  });
  return true;
}

export async function activateOpenGmailTabs(api: Pick<ExtensionChromeApi, "scripting" | "tabs">): Promise<number> {
  const tabs = await api.tabs?.query({ url: gmailHostPermission }) ?? [];
  const results = await Promise.all(tabs.map((tab) => activateGmailTab(api, tab).catch(() => false)));
  return results.filter(Boolean).length;
}

export async function activateOpenMailTabs(api: Pick<ExtensionChromeApi, "scripting" | "tabs">): Promise<number> {
  const tabs = await api.tabs?.query({ url: mailPermissionRequest().origins }) ?? [];
  const results = await Promise.all(tabs.map((tab) => activateMailTab(api, tab).catch(() => false)));
  return results.filter(Boolean).length;
}

export async function activateCurrentGmailTab(api: Pick<ExtensionChromeApi, "scripting" | "tabs">): Promise<boolean> {
  const [tab] = await api.tabs?.query({ active: true, currentWindow: true }) ?? [];
  return tab ? activateGmailTab(api, tab) : false;
}
