import {
  activateOpenMailTabs,
  hasMailPermission,
  registerMailProtection,
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
  const button = document.querySelector<HTMLButtonElement>("#enable-gmail");
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

  document.querySelector<HTMLButtonElement>("#enable-gmail")?.addEventListener("click", async () => {
    render(popupViewForState("busy"));
    render(popupViewForState(await enableMailProtection(chrome)));
  });
}

if (typeof document !== "undefined") {
  init().catch(() => render(popupViewForState("denied")));
}
