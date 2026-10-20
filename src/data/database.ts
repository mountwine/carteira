let connection: Promise<IDBDatabase> | undefined;
export function database() {
  if (connection) return connection;
  const opening = new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open("travel-os-v1", 2);
    let settled = false;
    request.onupgradeneeded = () => {
      for (const name of [
        "records",
        "cache",
        "pending",
        "files",
        "receipts",
        "history",
        "accounts",
        "media",
        "settings",
      ])
        if (!request.result.objectStoreNames.contains(name))
          request.result.createObjectStore(name, { keyPath: "id" });
    };
    request.onblocked = () => {
      settled = true;
      reject(
        new Error(
          "Feche outras janelas do Foravento para atualizar o armazenamento. Seus dados foram preservados.",
        ),
      );
    };
    request.onsuccess = () => {
      if (settled) {
        request.result.close();
        return;
      }
      request.result.onversionchange = () => {
        request.result.close();
        if (connection === opening) connection = undefined;
      };
      resolve(request.result);
    };
    request.onerror = () =>
      reject(new Error("Não foi possível abrir o armazenamento offline."));
  });
  connection = opening;
  void opening.catch(() => {
    if (connection === opening) connection = undefined;
  });
  return opening;
}
export const requestResult = <T>(r: IDBRequest<T>) =>
  new Promise<T>((resolve, reject) => {
    r.onsuccess = () => resolve(r.result);
    r.onerror = () => reject(r.error);
  });
export const completed = (tx: IDBTransaction) =>
  new Promise<void>((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onabort = () =>
      reject(tx.error ?? new Error("Operação de armazenamento cancelada."));
    tx.onerror = () => reject(tx.error);
  });
export async function get<T>(
  store: string,
  id: string,
): Promise<T | undefined> {
  const db = await database();
  return requestResult(db.transaction(store).objectStore(store).get(id));
}
export async function all<T>(store: string): Promise<T[]> {
  const db = await database();
  return requestResult(db.transaction(store).objectStore(store).getAll());
}
export async function put<T extends { id: string }>(store: string, value: T) {
  const db = await database(),
    tx = db.transaction(store, "readwrite"),
    done = completed(tx);
  tx.objectStore(store).put(value);
  await done;
}
export async function remove(store: string, id: string) {
  const db = await database(),
    tx = db.transaction(store, "readwrite"),
    done = completed(tx);
  tx.objectStore(store).delete(id);
  await done;
}
