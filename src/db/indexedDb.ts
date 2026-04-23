import { openDB, type IDBPDatabase } from 'idb';
import type { SavedCalculationDto } from '../types/dto';

const DB_NAME = 'date-checker-db';
const DB_VERSION = 1;
const STORE_NAME = 'calculations';

let dbPromise: Promise<IDBPDatabase<{ calculations: SavedCalculationDto }>> | null = null;

function getDb() {
  if (!dbPromise) {
    dbPromise = openDB<{ calculations: SavedCalculationDto }>(DB_NAME, DB_VERSION, {
      upgrade(database) {
        database.createObjectStore(STORE_NAME, { keyPath: 'id' });
      },
    });
  }
  return dbPromise;
}

export async function getAllCalculations(): Promise<SavedCalculationDto[]> {
  const db = await getDb();
  const list = await db.getAll(STORE_NAME);
  return list.sort((a, b) => b.updatedAt - a.updatedAt);
}

export async function getCalculation(id: string): Promise<SavedCalculationDto | undefined> {
  const db = await getDb();
  return db.get(STORE_NAME, id);
}

export async function saveCalculation(
  data: Omit<SavedCalculationDto, 'id' | 'createdAt' | 'updatedAt'> & { id?: string },
): Promise<SavedCalculationDto> {
  const db = await getDb();
  const now = Date.now();
  const id = data.id ?? `calc-${now}-${Math.random().toString(36).slice(2, 11)}`;
  const existing = await db.get(STORE_NAME, id);
  const record: SavedCalculationDto = {
    id,
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
    person: data.person,
    rows: data.rows,
  };
  await db.put(STORE_NAME, record);
  return record;
}

export async function deleteCalculation(id: string): Promise<void> {
  const db = await getDb();
  await db.delete(STORE_NAME, id);
}