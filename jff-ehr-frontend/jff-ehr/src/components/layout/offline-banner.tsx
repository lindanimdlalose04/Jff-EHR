import { useSyncExternalStore } from "react";

function subscribe(callback: () => void) {
  window.addEventListener("online", callback);
  window.addEventListener("offline", callback);
  return () => {
    window.removeEventListener("online", callback);
    window.removeEventListener("offline", callback);
  };
}

export function useOnlineStatus() {
  return useSyncExternalStore(
    subscribe,
    () => navigator.onLine,
    () => true,
  );
}

export function OfflineBanner() {
  const online = useOnlineStatus();
  if (online) return null;
  return (
    <div className="mb-3 flex items-center gap-2 rounded-control bg-warning-tint px-3 py-2.5 text-xs text-warning">
      <span aria-hidden>⚠</span>
      Offline. Reading cached data. Saving is paused until you reconnect.
    </div>
  );
}
