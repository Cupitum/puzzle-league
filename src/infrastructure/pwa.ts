/** Inbound Android shares stay in same-origin IndexedDB until the player reviews them. */
const DB_NAME = 'puzzle-league-share-intake';
const STORE_NAME = 'inbound';

function openInbox(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(STORE_NAME)) {
        request.result.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(new Error('Share inbox unavailable; use paste instead.'));
  });
}

/** Dequeue exactly ONE original share; newer/older unconsumed shares are not discarded. */
export async function consumeIncomingShare(): Promise<string | null> {
  if (typeof indexedDB === 'undefined') return null;
  const db = await openInbox();
  try {
    return await new Promise<string | null>((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      let value: string | null = null;
      const all = store.getAll();
      all.onsuccess = () => {
        const rows = (all.result as { id: string; text: string; receivedAt: number }[])
          .sort((a, b) => a.receivedAt - b.receivedAt);
        const oldest = rows[0];
        if (oldest) {
          value = oldest.text;
          store.delete(oldest.id);
        }
      };
      transaction.oncomplete = () => resolve(value);
      transaction.onerror = () => reject(new Error('Could not load shared text; please paste it.'));
      transaction.onabort = () => reject(new Error('Share inbox transaction stopped; please paste it.'));
      all.onerror = () => reject(new Error('Could not read incoming share; please paste it.'));
    });
  } finally { db.close(); }
}

export async function registerPwa(): Promise<boolean> {
  if (!('serviceWorker' in navigator) || !window.isSecureContext) return false;
  await navigator.serviceWorker.register('/sw.js', { scope: '/', updateViaCache: 'none' });
  return true;
}
