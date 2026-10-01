// La chiave di coppia sbloccata resta sul dispositivo, in IndexedDB, come
// CryptoKey non estraibile: l'app può usarla ma nessuno può leggerne i byte.
import Dexie, { type Table } from 'dexie'

interface StoredKey {
  userId: string
  householdId: string
  key: CryptoKey
}

const db = new Dexie('nami-keys') as Dexie & { keys: Table<StoredKey, string> }
db.version(1).stores({ keys: 'userId' })

export function saveKey(entry: StoredKey): Promise<string> {
  return db.keys.put(entry)
}

export function loadKey(userId: string): Promise<StoredKey | undefined> {
  return db.keys.get(userId)
}

export function clearKeys(): Promise<void> {
  return db.keys.clear()
}
