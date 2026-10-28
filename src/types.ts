export type FileType =
  | 'circuit_diagram' // 線路圖
  | 'site_photo' // 現場照片
  | 'component_photo' // 元件照片
  | 'manual' // 原廠操作手冊
  | 'spec_sheet' // 規格書
  | 'other'; // 其他文件

export interface FileRecord {
  id: string;
  originalName: string;
  fileType: FileType;
  mimeType: string;
  size: number;
  storedFilename: string;
  url: string; // URL to view /api/files/:id
  downloadUrl: string; // URL to download /api/files/:id/download
  uploadedAt: string;
  description?: string;
}

export interface MaintenanceRecord {
  id: string; // e.g. "maint_..."
  equipmentTagNumber: string; // TAG NUMBER e.g. "CR-001"
  date: string; // 日期 YYYY-MM-DD
  personnel: string; // 人員
  content: string; // 內容 (維修內容、狀況說明、排除動作)
  files?: FileRecord[]; // 維修照片或附件
  createdAt: string;
  updatedAt?: string;
}

export interface Equipment {
  tagNumber: string; // Unique primary key, e.g. "CR-001"
  name: string; // e.g. "粉碎機"
  parentTagNumber?: string | null; // e.g. "CR-001" or empty
  category: string; // e.g. "主設備", "馬達", "變頻器", "感測器", "控制盤"
  installationLocation: string; // e.g. "A棟產線1區"
  notes?: string;
  files: FileRecord[];
  componentPartNumbers: string[]; // Associated SparePart part numbers
  maintenanceRecords?: MaintenanceRecord[];
  createdAt: string;
  updatedAt: string;
}

export interface RequisitionRecord {
  id: string;
  partNumber: string;
  requisitionDate: string; // 請購時間
  quantity: number; // 數量
  inspectionDate?: string; // 檢收時間
  price: number; // 價格
  notes?: string; // 備註
  createdAt: string;
}

export interface SparePart {
  partNumber: string; // Unique primary key, e.g. "VFD-001"
  name: string; // 品名, e.g. "變頻器", "接觸器", "電源供應器", "近接開關", "繼電器"
  brand: string; // 廠牌, e.g. "FUJI 富士", "OMRON 歐姆龍", "MEAN WELL 明緯"
  model: string; // 型號, e.g. "FRN0011C2S-4C"
  stockQty: number; // 庫存量
  minStockQty?: number; // 安全庫存預警 (預設 0)
  storageLocation: string; // 主要儲位字串, e.g. "電控備品架 A-02-03"
  storageLocations?: string[]; // 支援兩個以上儲位列表
  files: FileRecord[];
  notes?: string;
  requisitionRecords?: RequisitionRecord[]; // 請購紀錄列表
  createdAt: string;
  updatedAt: string;
}

export interface SystemConfig {
  equipmentCategories: string[];
  partNames: string[];
}

export interface DatabaseSchema {
  equipment: Equipment[];
  spareParts: SparePart[];
  config: SystemConfig;
  files?: Record<string, FileRecord>;
  maintenanceRecords?: MaintenanceRecord[];
}

export interface EquipmentHierarchyNode {
  equipment: Equipment;
  children: EquipmentHierarchyNode[];
}

