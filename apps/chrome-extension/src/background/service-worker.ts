import {
  activateOpenGmailTabs,
  activateOpenMailTabs,
  gmailPermissionRequest,
  hasGmailPermission,
  hasMailPermission,
  mailPermissionRequest,
  registerGmailProtection,
  registerMailProtection,
  type ExtensionChromeApi
} from "./permissions.js";

declare const chrome: ExtensionChromeApi;

if (typeof chrome !== "undefined") {
  chrome.permissions.contains(mailPermissionRequest()).then(async (granted) => {
    if (!granted) return;
    await registerMailProtection(chrome.scripting);
    await activateOpenMailTabs(chrome);
  }).catch(() => undefined);

  chrome.permissions.contains(gmailPermissionRequest()).then(async (granted) => {
    if (!granted) return;
    await registerGmailProtection(chrome.scripting);
    await activateOpenGmailTabs(chrome);
  }).catch(() => undefined);
}

export async function syncGmailProtection(api: ExtensionChromeApi): Promise<boolean> {
  const granted = await hasGmailPermission(api.permissions);
  if (granted) {
    await registerGmailProtection(api.scripting);
    await activateOpenGmailTabs(api);
  }
  return granted;
}

export async function syncMailProtection(api: ExtensionChromeApi): Promise<boolean> {
  const granted = await hasMailPermission(api.permissions);
  if (granted) {
    await registerMailProtection(api.scripting);
    await activateOpenMailTabs(api);
  }
  return granted;
}
