import { DatabaseSchema, Equipment, FileRecord, FileType, MaintenanceRecord, SparePart, SystemConfig } from '../types.ts';
import {
  getDatabaseFromFirestore,
  createSparePartFirestore,
  updateSparePartFirestore,
  deleteSparePartFirestore,
  adjustStockFirestore,
  batchImportSparePartsFirestore,
  createEquipmentFirestore,
  updateEquipmentFirestore,
  deleteEquipmentFirestore,
  toggleAssociationFirestore,
  createMaintenanceRecordFirestore,
  updateMaintenanceRecordFirestore,
  deleteMaintenanceRecordFirestore,
  updateSystemConfigFirestore,
} from './firestoreService.ts';

/**
 * Fetch full database state directly from Cloud Firestore.
 * Guaranteed to persist across sessions, page refreshes, and redeployments.
 */
export async function fetchDatabase(): Promise<DatabaseSchema> {
  return await getDatabaseFromFirestore();
}

export async function fetchEquipmentList(q = '', category = ''): Promise<Equipment[]> {
  const db = await getDatabaseFromFirestore();
  let list = db.equipment;
  if (category) {
    list = list.filter((e) => e.category === category);
  }
  if (q) {
    const qLower = q.trim().toLowerCase();
    list = list.filter(
      (e) =>
        e.tagNumber.toLowerCase().includes(qLower) ||
        e.name.toLowerCase().includes(qLower) ||
        e.installationLocation.toLowerCase().includes(qLower) ||
        (e.notes && e.notes.toLowerCase().includes(qLower))
    );
  }
  return list;
}

export async function fetchEquipment(tag: string): Promise<Equipment> {
  const db = await getDatabaseFromFirestore();
  const item = db.equipment.find((e) => e.tagNumber.toLowerCase() === tag.toLowerCase());
  if (!item) throw new Error(`找不到設備 "${tag}"`);
  return item;
}

export async function createEquipment(data: Partial<Equipment>): Promise<Equipment> {
  return await createEquipmentFirestore(data);
}

export async function updateEquipment(tag: string, data: Partial<Equipment>): Promise<Equipment> {
  return await updateEquipmentFirestore(tag, data);
}

export async function deleteEquipment(tag: string): Promise<void> {
  await deleteEquipmentFirestore(tag);
}

export async function fetchSpareParts(q = '', name = '', storage = ''): Promise<SparePart[]> {
  const db = await getDatabaseFromFirestore();
  let list = db.spareParts;
  if (name) {
    list = list.filter((p) => p.name === name);
  }
  if (storage) {
    const sLower = storage.toLowerCase();
    list = list.filter((p) => {
      const inMain = p.storageLocation && p.storageLocation.toLowerCase().includes(sLower);
      const inList = p.storageLocations && p.storageLocations.some((loc) => loc.toLowerCase().includes(sLower));
      return inMain || inList;
    });
  }
  if (q) {
    const qLower = q.trim().toLowerCase();
    list = list.filter(
      (p) =>
        p.partNumber.toLowerCase().includes(qLower) ||
        p.name.toLowerCase().includes(qLower) ||
        p.brand.toLowerCase().includes(qLower) ||
        p.model.toLowerCase().includes(qLower) ||
        p.storageLocation.toLowerCase().includes(qLower) ||
        (p.storageLocations && p.storageLocations.some((loc) => loc.toLowerCase().includes(qLower))) ||
        (p.notes && p.notes.toLowerCase().includes(qLower))
    );
  }
  return list;
}

export async function fetchSparePart(partNumber: string): Promise<SparePart> {
  const db = await getDatabaseFromFirestore();
  const item = db.spareParts.find((p) => p.partNumber.toLowerCase() === partNumber.toLowerCase());
  if (!item) throw new Error(`找不到備品 "${partNumber}"`);
  return item;
}

export async function createSparePart(data: Partial<SparePart>): Promise<SparePart> {
  return await createSparePartFirestore(data);
}

export async function updateSparePart(partNumber: string, data: Partial<SparePart>): Promise<SparePart> {
  return await updateSparePartFirestore(partNumber, data);
}

export async function deleteSparePart(partNumber: string): Promise<void> {
  await deleteSparePartFirestore(partNumber);
}

export async function adjustStock(partNumber: string, delta?: number, absolute?: number): Promise<SparePart> {
  return await adjustStockFirestore(partNumber, delta, absolute);
}

export async function toggleAssociation(tagNumber: string, partNumber: string, action: 'add' | 'remove'): Promise<Equipment> {
  return await toggleAssociationFirestore(tagNumber, partNumber, action);
}

export async function uploadFile(file: File, fileType: FileType, description = ''): Promise<FileRecord> {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('fileType', fileType);
  formData.append('description', description);

  const res = await fetch('/api/files/upload', {
    method: 'POST',
    body: formData,
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error || '檔案上傳失敗');
  return json;
}

export async function uploadMultipleFiles(
  files: File[],
  fileType: FileType,
  description = ''
): Promise<FileRecord[]> {
  const formData = new FormData();
  files.forEach((file) => {
    formData.append('files', file);
  });
  formData.append('fileType', fileType);
  formData.append('description', description);

  const res = await fetch('/api/files/upload-multiple', {
    method: 'POST',
    body: formData,
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error || '批次檔案上傳失敗');
  return json;
}

export async function deleteFileRecord(fileId: string): Promise<void> {
  const res = await fetch(`/api/files/${encodeURIComponent(fileId)}`, {
    method: 'DELETE',
  });
  if (!res.ok) {
    const json = await res.json();
    throw new Error(json.error || '刪除檔案失敗');
  }
}

export async function globalSearch(q: string): Promise<{ equipment: Equipment[]; spareParts: SparePart[]; totalCount: number }> {
  const db = await getDatabaseFromFirestore();
  const qLower = q.trim().toLowerCase();
  if (!qLower) {
    return { equipment: [], spareParts: [], totalCount: 0 };
  }

  const matchedEquipment = db.equipment.filter(
    (e) =>
      e.tagNumber.toLowerCase().includes(qLower) ||
      e.name.toLowerCase().includes(qLower) ||
      e.category.toLowerCase().includes(qLower) ||
      e.installationLocation.toLowerCase().includes(qLower) ||
      (e.notes && e.notes.toLowerCase().includes(qLower))
  );

  const matchedParts = db.spareParts.filter(
    (p) =>
      p.partNumber.toLowerCase().includes(qLower) ||
      p.name.toLowerCase().includes(qLower) ||
      p.brand.toLowerCase().includes(qLower) ||
      p.model.toLowerCase().includes(qLower) ||
      p.storageLocation.toLowerCase().includes(qLower) ||
      (p.storageLocations && p.storageLocations.some((loc) => loc.toLowerCase().includes(qLower))) ||
      (p.notes && p.notes.toLowerCase().includes(qLower))
  );

  return {
    equipment: matchedEquipment,
    spareParts: matchedParts,
    totalCount: matchedEquipment.length + matchedParts.length,
  };
}

export async function fetchSystemConfig(): Promise<SystemConfig> {
  const db = await getDatabaseFromFirestore();
  return db.config;
}

export async function updateSystemConfig(config: SystemConfig): Promise<SystemConfig> {
  return await updateSystemConfigFirestore(config);
}

export async function importBackupDatabase(data: any): Promise<{ message: string }> {
  // First, upload to server backup
  const res = await fetch('/api/backup/import', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error || '匯入失敗');

  // Also sync to Cloud Firestore
  if (Array.isArray(data.spareParts)) {
    await batchImportSparePartsFirestore(data.spareParts);
  }
  if (Array.isArray(data.equipment)) {
    for (const eq of data.equipment) {
      await createEquipmentFirestore(eq).catch(() => updateEquipmentFirestore(eq.tagNumber, eq));
    }
  }

  return { message: '備份資料已成功還原並同步至 Cloud Firestore 雲端資料庫！' };
}

export async function fetchMaintenanceRecords(tagNumber: string): Promise<MaintenanceRecord[]> {
  const db = await getDatabaseFromFirestore();
  return (db.maintenanceRecords || [])
    .filter((r) => r.equipmentTagNumber?.toLowerCase() === tagNumber.toLowerCase())
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}

export async function createMaintenanceRecord(
  tagNumber: string,
  data: { date: string; personnel: string; content: string; files?: FileRecord[] }
): Promise<MaintenanceRecord> {
  return await createMaintenanceRecordFirestore(tagNumber, data);
}

export async function updateMaintenanceRecord(
  id: string,
  data: Partial<MaintenanceRecord>
): Promise<MaintenanceRecord> {
  return await updateMaintenanceRecordFirestore(id, data);
}

export async function deleteMaintenanceRecord(id: string): Promise<void> {
  await deleteMaintenanceRecordFirestore(id);
}

export async function batchImportSpareParts(
  parts: Partial<SparePart>[]
): Promise<{ success: boolean; importedCount: number; updatedCount: number; message: string }> {
  return await batchImportSparePartsFirestore(parts);
}
