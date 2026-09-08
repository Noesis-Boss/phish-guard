import {
  activateOpenMailTabs,
  addCustomMailPlatform,
  customPlatformFromOriginInput,
  hasMailPermission,
  listCustomMailPlatforms,
  registerMailProtection,
  removeCustomMailPlatform,
  requestMailPermission,
  type ExtensionChromeApi
} from "../background/permissions.js";

declare const chrome: ExtensionChromeApi;

export type PopupState = "ready" | "needs-permission" | "denied" | "busy";

export interface PopupView {
  buttonLabel: string;
  buttonDisabled: boolean;
  statusText: string;
  statusState: Exclude<PopupState, "busy">;
}

export function popupViewForState(state: PopupState): PopupView {
  if (state === "ready") {
    return {
      buttonLabel: "Mail warnings are on",
      buttonDisabled: true,
      statusText: "Ready. Suspicious senders will show a warning inside Gmail, Outlook, Yahoo Mail, and Proton Mail.",
      statusState: "ready"
    };
  }

  if (state === "busy") {
    return {
      buttonLabel: "Turning on...",
      buttonDisabled: true,
      statusText: "Opening Chrome's mail access prompt.",
      statusState: "needs-permission"
    };
  }

  if (state === "denied") {
    return {
      buttonLabel: "Try again",
      buttonDisabled: false,
      statusText: "Mail warnings are off. Nothing changes until you allow access.",
      statusState: "denied"
    };
  }

  return {
    buttonLabel: "Turn on mail warnings",
    buttonDisabled: false,
    statusText: "Mail warnings are off until you allow access to Gmail, Outlook, Yahoo Mail, and Proton Mail.",
    statusState: "needs-permission"
  };
}

export async function enableMailProtection(api: ExtensionChromeApi): Promise<PopupState> {
  const granted = await requestMailPermission(api.permissions);
  if (!granted) {
    return "denied";
  }

  await registerMailProtection(api.scripting);
  await activateOpenMailTabs(api);
  return "ready";
}

function render(view: PopupView): void {
  const button = document.querySelector<HTMLButtonElement>("#enable-mail");
  const status = document.querySelector<HTMLElement>("#status");
  if (!button || !status) return;

  button.textContent = view.buttonLabel;
  button.disabled = view.buttonDisabled;
  status.textContent = view.statusText;
  status.dataset.state = view.statusState;
}

async function init(): Promise<void> {
  render(popupViewForState("busy"));
  const hasPermission = await hasMailPermission(chrome.permissions);
  if (hasPermission) {
    await registerMailProtection(chrome.scripting);
    await activateOpenMailTabs(chrome);
  }
  const initialState: PopupState = hasPermission ? "ready" : "needs-permission";
  render(popupViewForState(initialState));

  document.querySelector<HTMLButtonElement>("#enable-mail")?.addEventListener("click", async () => {
    render(popupViewForState("busy"));
    render(popupViewForState(await enableMailProtection(chrome)));
  });
}

function siteLabelFromOrigin(originPattern: string): string {
  try {
    return new URL(originPattern.replace(/\/\*$/, "/")).hostname;
  } catch {
    return originPattern;
  }
}

function setCustomStatus(message: string, ok: boolean): void {
  const status = document.querySelector<HTMLElement>("#custom-site-status");
  if (!status) return;
  status.textContent = message;
  status.dataset.ok = ok ? "true" : "false";
  status.hidden = false;
}

async function renderCustomSites(): Promise<void> {
  const list = document.querySelector<HTMLUListElement>("#custom-sites");
  if (!list) return;
  const platforms = await listCustomMailPlatforms(chrome.scripting);
  list.textContent = "";
  for (const platform of platforms) {
    const item = document.createElement("li");
    const label = document.createElement("span");
    label.textContent = siteLabelFromOrigin(platform.originPattern);
    label.title = platform.originPattern;
    const remove = document.createElement("button");
    remove.type = "button";
    remove.textContent = "Remove";
    remove.addEventListener("click", async () => {
      await removeCustomMailPlatform(chrome.scripting, chrome.permissions, platform.id);
      await renderCustomSites();
    });
    item.append(label, remove);
    list.append(item);
  }
}

async function initCustomSites(): Promise<void> {
  await renderCustomSites();

  const input = document.querySelector<HTMLInputElement>("#custom-site-input");
  const add = document.querySelector<HTMLButtonElement>("#add-custom-site");
  if (!input || !add) return;

  add.addEventListener("click", async () => {
    if (!customPlatformFromOriginInput(input.value)) {
      setCustomStatus("Enter the site's web address, like https://mail.example.com.", false);
    } else {
      setCustomStatus("Asking Chrome for access...", true);
      try {
        const platform = await addCustomMailPlatform(chrome, input.value);
        if (platform) {
          input.value = "";
          setCustomStatus("Warnings are on for that site.", true);
        } else {
          setCustomStatus("Access was not granted. Nothing changed.", false);
        }
      } catch {
        setCustomStatus("Chrome could not add that site. Nothing changed.", false);
      }
    }
    await renderCustomSites();
  });
}

if (typeof document !== "undefined") {
  init().catch(() => render(popupViewForState("denied")));
  initCustomSites().catch(() => undefined);
}
