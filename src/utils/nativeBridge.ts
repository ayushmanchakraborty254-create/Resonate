/**
 * Resonate Native Secure Bridge (AndroidX WebKit WebViewCompat.addWebMessageListener)
 *
 * Provides asynchronous, promise-based communication between React and Android native Media3 engine.
 * Validated by Chromium at C++ process level with explicit origin rules (https://resonate.app)
 * and main-frame enforcement.
 */

interface PendingRequest {
  resolve: (value: any) => void;
  reject: (reason: any) => void;
  timer: ReturnType<typeof setTimeout>;
  onProgress?: (progressData: any) => void;
}

let messageSeq = 0;
const pendingRequests = new Map<string, PendingRequest>();

/**
 * Returns true if the secure Android native bridge is available in this environment.
 */
export const isSecureNativeBridgeAvailable = (): boolean => {
  return (
    typeof window !== 'undefined' &&
    typeof (window as any).ResonateNativeSecure?.postMessage === 'function'
  );
};

// Wire up global message listener for responses from JavaScriptReplyProxy
if (typeof window !== 'undefined') {
  const attachListener = () => {
    const bridge = (window as any).ResonateNativeSecure;
    if (bridge && !bridge.__resonateListenerAttached) {
      bridge.__resonateListenerAttached = true;
      bridge.onmessage = (event: MessageEvent) => {
        try {
          const data = typeof event.data === 'string' ? JSON.parse(event.data) : event.data;
          if (data && data.id && pendingRequests.has(data.id)) {
            const entry = pendingRequests.get(data.id)!;
            if (data.type === 'progress') {
              entry.onProgress?.(data);
              return;
            }
            clearTimeout(entry.timer);
            pendingRequests.delete(data.id);
            entry.resolve(data);
          }
        } catch (err) {
          console.error('[ResonateNativeSecure] Error parsing message from native:', err);
        }
      };
    }
  };

  attachListener();
  window.addEventListener('load', attachListener);
}

/**
 * Sends an asynchronous request to the Android native service and awaits the typed response.
 */
export const sendNativeMessage = <T = any>(
  action: string,
  payload: Record<string, any> = {},
  timeoutMs = 8000,
  onProgress?: (progressData: any) => void
): Promise<T> => {
  return new Promise((resolve, reject) => {
    const bridge = (window as any).ResonateNativeSecure;
    if (!bridge || typeof bridge.postMessage !== 'function') {
      reject(new Error('ResonateNativeSecure bridge is not available (only active on Android APK)'));
      return;
    }

    const id = `req_${++messageSeq}_${Date.now()}`;
    const timer = setTimeout(() => {
      if (pendingRequests.has(id)) {
        pendingRequests.delete(id);
        reject(new Error(`Native bridge request timed out after ${timeoutMs}ms (action: ${action})`));
      }
    }, timeoutMs);

    pendingRequests.set(id, { resolve, reject, timer, onProgress });

    // Make sure listener is attached
    if (!bridge.__resonateListenerAttached) {
      bridge.__resonateListenerAttached = true;
      bridge.onmessage = (event: MessageEvent) => {
        try {
          const data = typeof event.data === 'string' ? JSON.parse(event.data) : event.data;
          if (data && data.id && pendingRequests.has(data.id)) {
            const entry = pendingRequests.get(data.id)!;
            if (data.type === 'progress') {
              entry.onProgress?.(data);
              return;
            }
            clearTimeout(entry.timer);
            pendingRequests.delete(data.id);
            entry.resolve(data);
          }
        } catch (err) {
          console.error('[ResonateNativeSecure] Error parsing message from native:', err);
        }
      };
    }

    try {
      bridge.postMessage(JSON.stringify({ id, action, ...payload }));
    } catch (sendErr) {
      clearTimeout(timer);
      pendingRequests.delete(id);
      reject(sendErr);
    }
  });
};

