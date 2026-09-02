import { useEffect } from 'react';

export function usePersistentStorage() {
  useEffect(() => {
    if (!navigator.storage?.persist) return;
    void navigator.storage.persist();
  }, []);
}
