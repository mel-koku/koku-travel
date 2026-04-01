const STORAGE_KEY = "koku-cookie-consent";
const CONSENT_EVENT = "koku-consent-change";

export type ConsentState = "granted" | "denied" | "undecided";

export function getConsent(): ConsentState {
  if (typeof window === "undefined") return "undecided";
  const value = localStorage.getItem(STORAGE_KEY);
  if (value === "granted" || value === "denied") return value;
  return "undecided";
}

export function setConsent(granted: boolean): void {
  const state: ConsentState = granted ? "granted" : "denied";
  localStorage.setItem(STORAGE_KEY, state);
  window.dispatchEvent(new CustomEvent(CONSENT_EVENT, { detail: state }));
}

export function hasResponded(): boolean {
  return getConsent() !== "undecided";
}

export { CONSENT_EVENT };
