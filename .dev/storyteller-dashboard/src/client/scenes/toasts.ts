export type ToastKind = "idle" | "loading" | "error" | "success";

const ICONS: Record<Exclude<ToastKind, "idle">, string> = {
  error: "/client/icons/uncertainty.svg",
  success: "/client/icons/check-mark.svg",
  loading: "/client/icons/sands-of-time.svg"
};

export const initToasts = (root: HTMLElement): { push: (kind: ToastKind, message: string) => void } => {
  const push = (kind: ToastKind, message: string): void => {
    if (kind === "idle") {
      return;
    }
    const toast = document.createElement("button");
    toast.type = "button";
    toast.className = `scenes-toast scenes-toast-${kind}`;
    toast.title = "Click to dismiss";
    const icon = document.createElement("img");
    icon.className = "scenes-toast-icon";
    icon.alt = "";
    icon.src = ICONS[kind];
    const text = document.createElement("span");
    text.className = "scenes-toast-text";
    text.textContent = message;
    toast.append(icon, text);
    let autoRemove: number | undefined;
    const dismiss = (): void => {
      if (autoRemove !== undefined) {
        window.clearTimeout(autoRemove);
      }
      toast.remove();
    };
    toast.addEventListener("click", dismiss);
    root.append(toast);
    if (kind === "success") {
      autoRemove = window.setTimeout(dismiss, 8000);
    }
  };
  return { push };
};
