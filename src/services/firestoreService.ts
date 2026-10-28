import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  deleteDoc,
  writeBatch,
} from 'firebase/firestore';
import { db } from '../firebase/config.ts';
import { handleFirestoreError, OperationType } from '../firebase/errors.ts';
import {
  DatabaseSchema,
  Equipment,
  MaintenanceRecord,
  SparePart,
  SystemConfig,
} from '../types.ts';

// Helper to escape characters that Firestore document IDs forbid
export function toDocId(id: string): string {
  return encodeURIComponent(String(id).trim()).replace(/\./g, '%2E');
}

// Remove undefined fields since Firestore rejects undefined
export function cleanFirestoreData<T extends Record<string, any>>(obj: T): T {
  const result: any = {};
  for (const [key, val] of Object.entries(obj)) {
    if (val === undefined) continue;
    if (val !== null && typeof val === 'object' && !Array.isArray(val)) {
      result[key] = cleanFirestoreData(val);
    } else if (Array.isArray(val)) {
      result[key] = val.map((item) =>
        item !== null && typeof item === 'object' ? cleanFirestoreData(item) : item
      );
    } else {
      result[key] = val;
    }
  }
  return result;
}

const DEFAULT_CONFIG: SystemConfig = {
  equipmentCategories: [
    '主設備',
    '馬達',
    '變頻器',
    '感測器',
    '控制盤',
    'PLC I/O',
    '冷卻風扇',
    '氣動/液壓',
    '輸送機構',
    '其他',
  ],
  partNames: [
    '變頻器',
    '高效率馬達',
    '電源供應器',
    '近接開關',
    '繼電器',
    '接觸器',
    'PLC 模組',
    '無熔絲開關',
    '光電開關',
    '電磁閥',
    '伺服驅動器',
    '微動開關',
    '溫控器',
    '端子台',
    '其他',
  ],
};

/**
 * Fetch full database state from Cloud Firestore.
 * If Firestore is completely fresh and empty, automatically migrate existing data from /api/database once.
 * Never resets or overwrites existing Firestore records.
 */
export async function getDatabaseFromFirestore(): Promise<DatabaseSchema> {
  const sparePartsPath = 'spareParts';
  const equipmentPath = 'equipment';
  const maintPath = 'maintenanceRecords';
  const configPath = 'systemConfig';

  try {
    // 1. Fetch spare parts
    const partsSnap = await getDocs(collection(db, sparePartsPath)).catch((err) =>
      handleFirestoreError(err, OperationType.LIST, sparePartsPath)
    );
    const parts: SparePart[] = partsSnap.docs.map((d) => d.data() as SparePart);

    // 2. Fetch equipment
    const eqSnap = await getDocs(collection(db, equipmentPath)).catch((err) =>
      handleFirestoreError(err, OperationType.LIST, equipmentPath)
    );
    const equipment: Equipment[] = eqSnap.docs.map((d) => d.data() as Equipment);

    // 3. Fetch maintenance records
    const maintSnap = await getDocs(collection(db, maintPath)).catch((err) =>
      handleFirestoreError(err, OperationType.LIST, maintPath)
    );
    const maintenanceRecords: MaintenanceRecord[] = maintSnap.docs.map(
      (d) => d.data() as MaintenanceRecord
    );

    // 4. Fetch config
    let config: SystemConfig = DEFAULT_CONFIG;
    try {
      const configDoc = await getDoc(doc(db, configPath, 'main'));
      if (configDoc.exists()) {
        const data = configDoc.data() as SystemConfig;
        config = {
          equipmentCategories: data.equipmentCategories || DEFAULT_CONFIG.equipmentCategories,
          partNames: data.partNames || DEFAULT_CONFIG.partNames,
        };
      }
    } catch {
      // fallback to DEFAULT_CONFIG
    }

    // If Firestore is already populated with spare parts or equipment, RETURN IMMEDIATELY!
    // Never overwrite with seed defaults if data exists in Firestore!
    if (parts.length > 0 || equipment.length > 0) {
      // Synchronize maintenance records into equipment
      equipment.forEach((eq) => {
        eq.maintenanceRecords = maintenanceRecords.filter(
          (m) => m.equipmentTagNumber?.toLowerCase() === eq.tagNumber?.toLowerCase()
        );
      });

      return {
        spareParts: parts,
        equipment,
        maintenanceRecords,
        config,
      };
    }

    // 5. First Boot Ever: Migrate from server seed once
    console.log('Firestore is empty. Performing one-time initial seed migration...');
    try {
      const res = await fetch('/api/database');
      if (res.ok) {
        const seedData: DatabaseSchema = await res.json();
        const batch = writeBatch(db);

        // Seed spare parts
        if (Array.isArray(seedData.spareParts)) {
          for (const p of seedData.spareParts) {
            batch.set(doc(db, sparePartsPath, toDocId(p.partNumber)), cleanFirestoreData(p));
          }
        }

        // Seed equipment
        if (Array.isArray(seedData.equipment)) {
          for (const eq of seedData.equipment) {
            batch.set(doc(db, equipmentPath, toDocId(eq.tagNumber)), cleanFirestoreData(eq));
          }
        }

        // Seed maintenance records
        if (Array.isArray(seedData.maintenanceRecords)) {
          for (const m of seedData.maintenanceRecords) {
            batch.set(doc(db, maintPath, toDocId(m.id)), cleanFirestoreData(m));
          }
        }

        // Seed config
        const finalConfig = seedData.config || DEFAULT_CONFIG;
        batch.set(doc(db, configPath, 'main'), cleanFirestoreData(finalConfig));

        await batch.commit();
        console.log('One-time initial migration to Firestore completed successfully.');

        return {
          spareParts: seedData.spareParts || [],
          equipment: seedData.equipment || [],
          maintenanceRecords: seedData.maintenanceRecords || [],
          config: finalConfig,
        };
      }
    } catch (migErr) {
      console.warn('One-time initial migration fetch failed, proceeding with blank schema:', migErr);
    }

    return {
      spareParts: [],
      equipment: [],
      maintenanceRecords: [],
      config: DEFAULT_CONFIG,
    };
  } catch (err: unknown) {
    handleFirestoreError(err, OperationType.GET, 'database');
  }
}

// Spare Parts Firestore CRUD
export async function createSparePartFirestore(data: Partial<SparePart>): Promise<SparePart> {
  const path = 'spareParts';
  if (!data.partNumber || !data.partNumber.trim()) {
    throw new Error('料號為必填欄位');
  }
  const cleanPartNo = data.partNumber.trim();
  const docRef = doc(db, path, toDocId(cleanPartNo));

  try {
    const existing = await getDoc(docRef);
    if (existing.exists()) {
      throw new Error(`料號 "${cleanPartNo}" 已存在於雲端資料庫，不可重複建立！`);
    }

    const now = new Date().toISOString();
    const newPart: SparePart = {
      partNumber: cleanPartNo,
      name: data.name?.trim() || '',
      brand: data.brand?.trim() || '',
      model: data.model?.trim() || '',
      stockQty: Number.isFinite(Number(data.stockQty)) ? Number(data.stockQty) : 0,
      minStockQty: Number.isFinite(Number(data.minStockQty)) ? Number(data.minStockQty) : 0,
      storageLocation: data.storageLocation?.trim() || '',
      storageLocations: Array.isArray(data.storageLocations) ? data.storageLocations : [],
      files: Array.isArray(data.files) ? data.files : [],
      notes: data.notes?.trim() || '',
      requisitionRecords: Array.isArray(data.requisitionRecords) ? data.requisitionRecords : [],
      createdAt: now,
      updatedAt: now,
    };

    await setDoc(docRef, cleanFirestoreData(newPart));

    // Also update server for local backup
    fetch('/api/parts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newPart),
    }).catch(() => {});

    return newPart;
  } catch (err: unknown) {
    if (err instanceof Error && err.message.includes('已存在')) {
      throw err;
    }
    handleFirestoreError(err, OperationType.CREATE, `${path}/${cleanPartNo}`);
  }
}

export async function updateSparePartFirestore(
  partNumber: string,
  data: Partial<SparePart>
): Promise<SparePart> {
  const path = 'spareParts';
  const oldDocId = toDocId(partNumber);
  const docRef = doc(db, path, oldDocId);

  try {
    const snap = await getDoc(docRef);
    if (!snap.exists()) {
      throw new Error(`找不到備品 "${partNumber}"`);
    }

    const prev = snap.data() as SparePart;
    const now = new Date().toISOString();
    const cleanNewPartNo = data.partNumber ? data.partNumber.trim() : prev.partNumber;

    const updated: SparePart = {
      ...prev,
      ...data,
      partNumber: cleanNewPartNo,
      name: data.name !== undefined ? data.name.trim() : prev.name,
      brand: data.brand !== undefined ? data.brand.trim() : prev.brand,
      model: data.model !== undefined ? data.model.trim() : prev.model,
      stockQty: Number.isFinite(Number(data.stockQty)) ? Number(data.stockQty) : prev.stockQty,
      minStockQty: Number.isFinite(Number(data.minStockQty)) ? Number(data.minStockQty) : (prev.minStockQty ?? 0),
      storageLocation: data.storageLocation !== undefined ? data.storageLocation.trim() : prev.storageLocation,
      storageLocations: Array.isArray(data.storageLocations) ? data.storageLocations : prev.storageLocations,
      files: Array.isArray(data.files) ? data.files : prev.files,
      notes: data.notes !== undefined ? data.notes.trim() : prev.notes,
      requisitionRecords: Array.isArray(data.requisitionRecords) ? data.requisitionRecords : prev.requisitionRecords,
      updatedAt: now,
    };

    // If partNumber changed, delete old doc and create new doc
    if (cleanNewPartNo !== prev.partNumber) {
      const newDocRef = doc(db, path, toDocId(cleanNewPartNo));
      await setDoc(newDocRef, cleanFirestoreData(updated));
      await deleteDoc(docRef);
    } else {
      await setDoc(docRef, cleanFirestoreData(updated));
    }

    // Sync to server backup
    fetch(`/api/parts/${encodeURIComponent(partNumber)}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updated),
    }).catch(() => {});

    return updated;
  } catch (err: unknown) {
    handleFirestoreError(err, OperationType.UPDATE, `${path}/${partNumber}`);
  }
}

export async function deleteSparePartFirestore(partNumber: string): Promise<void> {
  const path = 'spareParts';
  try {
    await deleteDoc(doc(db, path, toDocId(partNumber)));
    // Sync to server backup
    fetch(`/api/parts/${encodeURIComponent(partNumber)}`, {
      method: 'DELETE',
    }).catch(() => {});
  } catch (err: unknown) {
    handleFirestoreError(err, OperationType.DELETE, `${path}/${partNumber}`);
  }
}

export async function adjustStockFirestore(
  partNumber: string,
  delta?: number,
  absolute?: number
): Promise<SparePart> {
  const path = 'spareParts';
  const docRef = doc(db, path, toDocId(partNumber));
  try {
    const snap = await getDoc(docRef);
    if (!snap.exists()) {
      throw new Error(`找不到備品 "${partNumber}"`);
    }
    const part = snap.data() as SparePart;
    let newQty = part.stockQty;
    if (typeof absolute === 'number') {
      newQty = Math.max(0, absolute);
    } else if (typeof delta === 'number') {
      newQty = Math.max(0, part.stockQty + delta);
    }
    const updated: SparePart = {
      ...part,
      stockQty: newQty,
      updatedAt: new Date().toISOString(),
    };
    await setDoc(docRef, cleanFirestoreData(updated));

    // Sync to server backup
    fetch(`/api/parts/${encodeURIComponent(partNumber)}/adjust-stock`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ delta, absolute }),
    }).catch(() => {});

    return updated;
  } catch (err: unknown) {
    handleFirestoreError(err, OperationType.UPDATE, `${path}/${partNumber}`);
  }
}

export async function batchImportSparePartsFirestore(
  parts: Partial<SparePart>[]
): Promise<{ success: boolean; importedCount: number; updatedCount: number; message: string }> {
  const path = 'spareParts';
  try {
    const batch = writeBatch(db);
    const now = new Date().toISOString();
    let count = 0;

    for (const item of parts) {
      if (!item.partNumber || !String(item.partNumber).trim()) continue;
      const cleanPartNo = String(item.partNumber).trim();
      const docRef = doc(db, path, toDocId(cleanPartNo));

      const newPart: SparePart = {
        partNumber: cleanPartNo,
        name: item.name ? String(item.name).trim() : '未命名備品',
        brand: item.brand ? String(item.brand).trim() : '',
        model: item.model ? String(item.model).trim() : '',
        stockQty: Number.isFinite(Number(item.stockQty)) ? Number(item.stockQty) : 0,
        minStockQty: Number.isFinite(Number(item.minStockQty)) ? Number(item.minStockQty) : 0,
        storageLocation: item.storageLocation ? String(item.storageLocation).trim() : '',
        storageLocations: Array.isArray(item.storageLocations) ? item.storageLocations : [],
        files: Array.isArray(item.files) ? item.files : [],
        notes: item.notes ? String(item.notes).trim() : '',
        requisitionRecords: Array.isArray(item.requisitionRecords) ? item.requisitionRecords : [],
        createdAt: now,
        updatedAt: now,
      };

      batch.set(docRef, cleanFirestoreData(newPart));
      count++;
    }

    await batch.commit();

    // Sync to server
    fetch('/api/parts/batch-import', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ parts }),
    }).catch(() => {});

    return {
      success: true,
      importedCount: count,
      updatedCount: 0,
      message: `已成功同步寫入 Cloud Firestore 雲端資料庫（共 ${count} 筆備品）！`,
    };
  } catch (err: unknown) {
    handleFirestoreError(err, OperationType.WRITE, path);
  }
}

// Equipment Firestore CRUD
export async function createEquipmentFirestore(data: Partial<Equipment>): Promise<Equipment> {
  const path = 'equipment';
  if (!data.tagNumber || !data.tagNumber.trim()) {
    throw new Error('TAG NUMBER 為必填欄位');
  }
  const cleanTag = data.tagNumber.trim();
  const docRef = doc(db, path, toDocId(cleanTag));

  try {
    const existing = await getDoc(docRef);
    if (existing.exists()) {
      throw new Error(`設備 TAG NUMBER "${cleanTag}" 已存在，不可重複建立！`);
    }

    const now = new Date().toISOString();
    const newEq: Equipment = {
      tagNumber: cleanTag,
      name: data.name?.trim() || '',
      parentTagNumber: data.parentTagNumber?.trim() || null,
      category: data.category?.trim() || '主設備',
      installationLocation: data.installationLocation?.trim() || '',
      notes: data.notes?.trim() || '',
      files: Array.isArray(data.files) ? data.files : [],
      componentPartNumbers: Array.isArray(data.componentPartNumbers) ? data.componentPartNumbers : [],
      maintenanceRecords: [],
      createdAt: now,
      updatedAt: now,
    };

    await setDoc(docRef, cleanFirestoreData(newEq));

    // Sync to server backup
    fetch('/api/equipment', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newEq),
    }).catch(() => {});

    return newEq;
  } catch (err: unknown) {
    if (err instanceof Error && err.message.includes('已存在')) {
      throw err;
    }
    handleFirestoreError(err, OperationType.CREATE, `${path}/${cleanTag}`);
  }
}

export async function updateEquipmentFirestore(
  tag: string,
  data: Partial<Equipment>
): Promise<Equipment> {
  const path = 'equipment';
  const docRef = doc(db, path, toDocId(tag));

  try {
    const snap = await getDoc(docRef);
    if (!snap.exists()) {
      throw new Error(`找不到設備 "${tag}"`);
    }

    const prev = snap.data() as Equipment;
    const now = new Date().toISOString();
    const cleanNewTag = data.tagNumber ? data.tagNumber.trim() : prev.tagNumber;

    const updated: Equipment = {
      ...prev,
      ...data,
      tagNumber: cleanNewTag,
      name: data.name !== undefined ? data.name.trim() : prev.name,
      parentTagNumber: data.parentTagNumber !== undefined ? (data.parentTagNumber?.trim() || null) : prev.parentTagNumber,
      category: data.category !== undefined ? data.category.trim() : prev.category,
      installationLocation: data.installationLocation !== undefined ? data.installationLocation.trim() : prev.installationLocation,
      notes: data.notes !== undefined ? data.notes.trim() : prev.notes,
      files: Array.isArray(data.files) ? data.files : prev.files,
      componentPartNumbers: Array.isArray(data.componentPartNumbers) ? data.componentPartNumbers : prev.componentPartNumbers,
      updatedAt: now,
    };

    if (cleanNewTag !== prev.tagNumber) {
      const newDocRef = doc(db, path, toDocId(cleanNewTag));
      await setDoc(newDocRef, cleanFirestoreData(updated));
      await deleteDoc(docRef);
    } else {
      await setDoc(docRef, cleanFirestoreData(updated));
    }

    // Sync to server backup
    fetch(`/api/equipment/${encodeURIComponent(tag)}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updated),
    }).catch(() => {});

    return updated;
  } catch (err: unknown) {
    handleFirestoreError(err, OperationType.UPDATE, `${path}/${tag}`);
  }
}

export async function deleteEquipmentFirestore(tag: string): Promise<void> {
  const path = 'equipment';
  try {
    await deleteDoc(doc(db, path, toDocId(tag)));
    // Sync to server backup
    fetch(`/api/equipment/${encodeURIComponent(tag)}`, {
      method: 'DELETE',
    }).catch(() => {});
  } catch (err: unknown) {
    handleFirestoreError(err, OperationType.DELETE, `${path}/${tag}`);
  }
}

export async function toggleAssociationFirestore(
  tagNumber: string,
  partNumber: string,
  action: 'add' | 'remove'
): Promise<Equipment> {
  const path = 'equipment';
  const docRef = doc(db, path, toDocId(tagNumber));
  try {
    const snap = await getDoc(docRef);
    if (!snap.exists()) {
      throw new Error(`找不到設備 "${tagNumber}"`);
    }
    const eq = snap.data() as Equipment;
    let list = Array.isArray(eq.componentPartNumbers) ? [...eq.componentPartNumbers] : [];
    if (action === 'remove') {
      list = list.filter((p) => p !== partNumber);
    } else {
      if (!list.includes(partNumber)) list.push(partNumber);
    }
    const updated: Equipment = {
      ...eq,
      componentPartNumbers: list,
      updatedAt: new Date().toISOString(),
    };
    await setDoc(docRef, cleanFirestoreData(updated));

    // Sync to server backup
    fetch('/api/associations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tagNumber, partNumber, action }),
    }).catch(() => {});

    return updated;
  } catch (err: unknown) {
    handleFirestoreError(err, OperationType.UPDATE, `${path}/${tagNumber}`);
  }
}

// Maintenance Record Firestore CRUD
export async function createMaintenanceRecordFirestore(
  tagNumber: string,
  data: { date: string; personnel: string; content: string; files?: any[] }
): Promise<MaintenanceRecord> {
  const path = 'maintenanceRecords';
  const now = new Date().toISOString();
  const id = `maint_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  const newRecord: MaintenanceRecord = {
    id,
    equipmentTagNumber: tagNumber,
    date: data.date,
    personnel: data.personnel,
    content: data.content,
    files: Array.isArray(data.files) ? data.files : [],
    createdAt: now,
    updatedAt: now,
  };

  try {
    await setDoc(doc(db, path, toDocId(id)), cleanFirestoreData(newRecord));

    // Sync to server backup
    fetch(`/api/equipment/${encodeURIComponent(tagNumber)}/maintenance`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    }).catch(() => {});

    return newRecord;
  } catch (err: unknown) {
    handleFirestoreError(err, OperationType.CREATE, `${path}/${id}`);
  }
}

export async function updateMaintenanceRecordFirestore(
  id: string,
  data: Partial<MaintenanceRecord>
): Promise<MaintenanceRecord> {
  const path = 'maintenanceRecords';
  const docRef = doc(db, path, toDocId(id));
  try {
    const snap = await getDoc(docRef);
    if (!snap.exists()) {
      throw new Error(`找不到維修紀錄 "${id}"`);
    }
    const prev = snap.data() as MaintenanceRecord;
    const updated: MaintenanceRecord = {
      ...prev,
      ...data,
      updatedAt: new Date().toISOString(),
    };
    await setDoc(docRef, cleanFirestoreData(updated));

    // Sync to server backup
    fetch(`/api/maintenance/${encodeURIComponent(id)}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    }).catch(() => {});

    return updated;
  } catch (err: unknown) {
    handleFirestoreError(err, OperationType.UPDATE, `${path}/${id}`);
  }
}

export async function deleteMaintenanceRecordFirestore(id: string): Promise<void> {
  const path = 'maintenanceRecords';
  try {
    await deleteDoc(doc(db, path, toDocId(id)));
    // Sync to server backup
    fetch(`/api/maintenance/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    }).catch(() => {});
  } catch (err: unknown) {
    handleFirestoreError(err, OperationType.DELETE, `${path}/${id}`);
  }
}

// System Config Firestore CRUD
export async function updateSystemConfigFirestore(config: SystemConfig): Promise<SystemConfig> {
  const path = 'systemConfig';
  try {
    await setDoc(doc(db, path, 'main'), cleanFirestoreData(config));
    // Sync to server backup
    fetch('/api/config', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(config),
    }).catch(() => {});
    return config;
  } catch (err: unknown) {
    handleFirestoreError(err, OperationType.WRITE, `${path}/main`);
  }
}
