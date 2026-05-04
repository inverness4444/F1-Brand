"use client";

import type { StateStorage } from "zustand/middleware";

type IndexedDbStorageOptions = {
  dbName: string;
  storeName: string;
};

const databasePromises = new Map<string, Promise<IDBDatabase>>();

function storageId({ dbName, storeName }: IndexedDbStorageOptions) {
  return `${dbName}:${storeName}`;
}

function canUseIndexedDb() {
  return typeof window !== "undefined" && "indexedDB" in window;
}

function readLegacyLocalStorage(name: string) {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    return window.localStorage.getItem(name);
  } catch {
    return null;
  }
}

function removeLegacyLocalStorage(name: string) {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.localStorage.removeItem(name);
  } catch {
    // Ignore storage cleanup failures.
  }
}

function writeLegacyLocalStorage(name: string, value: string) {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.localStorage.setItem(name, value);
  } catch {
    // Ignore storage fallback failures.
  }
}

function openDatabase(options: IndexedDbStorageOptions) {
  const key = storageId(options);

  if (databasePromises.has(key)) {
    return databasePromises.get(key)!;
  }

  const promise = new Promise<IDBDatabase>((resolve, reject) => {
    const request = window.indexedDB.open(options.dbName, 1);

    request.onupgradeneeded = () => {
      const database = request.result;

      if (!database.objectStoreNames.contains(options.storeName)) {
        database.createObjectStore(options.storeName);
      }
    };

    request.onsuccess = () => {
      const database = request.result;

      database.onversionchange = () => {
        database.close();
        databasePromises.delete(key);
      };

      resolve(database);
    };

    request.onerror = () => {
      databasePromises.delete(key);
      reject(request.error ?? new Error("Failed to open IndexedDB database."));
    };
  });

  databasePromises.set(key, promise);

  return promise;
}

async function getIndexedDbValue(options: IndexedDbStorageOptions, name: string) {
  const database = await openDatabase(options);

  return new Promise<string | null>((resolve, reject) => {
    const transaction = database.transaction(options.storeName, "readonly");
    const store = transaction.objectStore(options.storeName);
    const request = store.get(name);

    request.onsuccess = () => {
      resolve(typeof request.result === "string" ? request.result : null);
    };

    request.onerror = () => {
      reject(request.error ?? new Error("Failed to read IndexedDB value."));
    };
  });
}

async function setIndexedDbValue(options: IndexedDbStorageOptions, name: string, value: string) {
  const database = await openDatabase(options);

  return new Promise<void>((resolve, reject) => {
    const transaction = database.transaction(options.storeName, "readwrite");

    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error ?? new Error("Failed to write IndexedDB value."));

    transaction.objectStore(options.storeName).put(value, name);
  });
}

async function removeIndexedDbValue(options: IndexedDbStorageOptions, name: string) {
  const database = await openDatabase(options);

  return new Promise<void>((resolve, reject) => {
    const transaction = database.transaction(options.storeName, "readwrite");

    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error ?? new Error("Failed to remove IndexedDB value."));

    transaction.objectStore(options.storeName).delete(name);
  });
}

export function createIndexedDbStateStorage(options: IndexedDbStorageOptions): StateStorage<Promise<void>> {
  return {
    getItem: async (name) => {
      const legacyValue = readLegacyLocalStorage(name);

      if (!canUseIndexedDb()) {
        return legacyValue;
      }

      try {
        const indexedDbValue = await getIndexedDbValue(options, name);

        if (indexedDbValue !== null) {
          return indexedDbValue;
        }

        if (legacyValue !== null) {
          await setIndexedDbValue(options, name, legacyValue);
          removeLegacyLocalStorage(name);
          return legacyValue;
        }

        return null;
      } catch {
        return legacyValue;
      }
    },

    setItem: async (name, value) => {
      if (!canUseIndexedDb()) {
        writeLegacyLocalStorage(name, value);
        return;
      }

      await setIndexedDbValue(options, name, value);
      removeLegacyLocalStorage(name);
    },

    removeItem: async (name) => {
      if (!canUseIndexedDb()) {
        removeLegacyLocalStorage(name);
        return;
      }

      await removeIndexedDbValue(options, name);
      removeLegacyLocalStorage(name);
    },
  };
}
