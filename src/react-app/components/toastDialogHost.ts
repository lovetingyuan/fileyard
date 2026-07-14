const dialogHosts: HTMLDialogElement[] = [];
const listeners = new Set<() => void>();

function notifyListeners() {
  for (const listener of listeners) {
    listener();
  }
}

export function subscribeToToastDialogHost(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getToastDialogHost() {
  return dialogHosts[dialogHosts.length - 1] ?? null;
}

export function registerToastDialogHost(dialog: HTMLDialogElement) {
  dialogHosts.push(dialog);
  notifyListeners();

  return () => {
    const index = dialogHosts.lastIndexOf(dialog);
    if (index === -1) {
      return;
    }

    dialogHosts.splice(index, 1);
    notifyListeners();
  };
}
