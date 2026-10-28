import express, { Request, Response } from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import multer from 'multer';
import crypto from 'crypto';
import { createServer as createViteServer } from 'vite';
import { Equipment, SparePart, SystemConfig, DatabaseSchema, FileRecord, FileType, MaintenanceRecord } from './src/types.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = 3000;
const DATA_DIR = path.join(__dirname, 'data');
const UPLOAD_DIR = path.join(DATA_DIR, 'uploads');
const DB_FILE = path.join(DATA_DIR, 'db.json');

// Ensure directories exist
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

// Helper to get MIME type from filename or path
function getMimeType(filenameOrPath: string): string {
  const ext = path.extname(filenameOrPath).toLowerCase();
  switch (ext) {
    case '.jpg':
    case '.jpeg':
      return 'image/jpeg';
    case '.png':
      return 'image/png';
    case '.gif':
      return 'image/gif';
    case '.webp':
      return 'image/webp';
    case '.svg':
      return 'image/svg+xml';
    case '.bmp':
      return 'image/bmp';
    case '.pdf':
      return 'application/pdf';
    case '.doc':
      return 'application/msword';
    case '.docx':
      return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
    default:
      return 'application/octet-stream';
  }
}

// Multer storage setup - use consistent fileId prefix
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, UPLOAD_DIR);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname);
    const uniqueId = `f_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
    const filename = `${uniqueId}${ext}`;
    cb(null, filename);
  },
});
const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB
});

// Helper to create a clean minimal PDF file
function createSamplePdf(title: string, subtitle: string, contentLines: string[]): Buffer {
  const streamContent = `BT
/F1 18 Tf
50 740 Td
(${title.replace(/[()]/g, '')}) Tj
/F1 12 Tf
0 -26 Td
(${subtitle.replace(/[()]/g, '')}) Tj
/F1 10 Tf
0 -30 Td
${contentLines.map((line, idx) => `0 -18 Td (${line.replace(/[()]/g, '')}) Tj`).join('\n')}
ET`;
  const streamLen = Buffer.byteLength(streamContent, 'utf-8');

  const pdf = `%PDF-1.4
1 0 obj
<< /Type /Catalog /Pages 2 0 R >>
endobj
2 0 obj
<< /Type /Pages /Kids [3 0 R] /Count 1 >>
endobj
3 0 obj
<< /Type /Page
   /Parent 2 0 R
   /MediaBox [0 0 595 842]
   /Contents 4 0 R
   /Resources <<
     /Font <<
       /F1 <<
         /Type /Font
         /Subtype /Type1
         /BaseFont /Helvetica
       >>
     >>
   >>
>>
endobj
4 0 obj
<< /Length ${streamLen} >>
stream
${streamContent}
endstream
endobj
xref
0 5
0000000000 65535 f 
0000000009 00000 n 
0000000058 00000 n 
0000000115 00000 n 
0000000305 00000 n 
trailer
<< /Size 5 /Root 1 0 R >>
startxref
${400 + streamLen}
%%EOF`;
  return Buffer.from(pdf, 'utf-8');
}

// Helper to create sample SVG image
function createSampleSvg(title: string, subtitle: string, badge: string, color = '#2563eb'): Buffer {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="500" viewBox="0 0 800 500">
  <defs>
    <linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#0f172a" />
      <stop offset="100%" stop-color="#1e293b" />
    </linearGradient>
  </defs>
  <rect width="800" height="500" fill="url(#g)" />
  <rect x="30" y="30" width="740" height="440" rx="12" fill="none" stroke="#334155" stroke-width="2" />
  
  <!-- Technical Grid pattern -->
  <line x1="40" y1="120" x2="760" y2="120" stroke="#334155" stroke-dasharray="4" />
  <line x1="40" y1="380" x2="760" y2="380" stroke="#334155" stroke-dasharray="4" />
  
  <rect x="60" y="60" width="140" height="32" rx="6" fill="${color}" />
  <text x="130" y="81" font-family="sans-serif" font-size="13" font-weight="bold" fill="#ffffff" text-anchor="middle">${badge}</text>
  
  <text x="60" y="180" font-family="sans-serif" font-size="32" font-weight="bold" fill="#f8fafc">${title}</text>
  <text x="60" y="220" font-family="sans-serif" font-size="18" fill="#94a3b8">${subtitle}</text>
  
  <!-- Schematic / Equipment Diagram Box -->
  <rect x="60" y="260" width="280" height="90" rx="8" fill="#1e293b" stroke="${color}" stroke-width="2" />
  <text x="200" y="300" font-family="monospace" font-size="14" fill="#38bdf8" text-anchor="middle">[ POWER: 380V / 3P ]</text>
  <text x="200" y="325" font-family="monospace" font-size="13" fill="#cbd5e1" text-anchor="middle">CONTROL: 24VDC PLC</text>

  <rect x="380" y="260" width="360" height="90" rx="8" fill="#1e293b" stroke="#475569" stroke-width="2" />
  <text x="560" y="300" font-family="monospace" font-size="14" fill="#a7f3d0" text-anchor="middle">STATUS: OPERATIONAL</text>
  <text x="560" y="325" font-family="monospace" font-size="13" fill="#94a3b8" text-anchor="middle">MAINTENANCE VERIFIED</text>
  
  <text x="60" y="420" font-family="sans-serif" font-size="12" fill="#64748b">電控設備與備品管理系統 V1.0 - 系統已驗證存檔</text>
</svg>`;
  return Buffer.from(svg, 'utf-8');
}

// Seed initial files & database
// Seed initial files & database (Non-destructive: preserves existing files and user edits)
function initDatabase(): DatabaseSchema {
  if (fs.existsSync(DB_FILE)) {
    try {
      const content = fs.readFileSync(DB_FILE, 'utf-8');
      const parsed = JSON.parse(content);
      if (parsed.equipment && parsed.spareParts && parsed.config) {
        if (!parsed.files) parsed.files = {};
        for (const eq of parsed.equipment) {
          if (Array.isArray(eq.files)) {
            for (const f of eq.files) {
              if (f?.id) parsed.files[f.id] = f;
            }
          }
        }
        for (const pt of parsed.spareParts) {
          if (Array.isArray(pt.files)) {
            for (const f of pt.files) {
              if (f?.id) parsed.files[f.id] = f;
            }
          }
        }

        // 1. Maintain & Index all disk uploads into db.files registry
        try {
          if (fs.existsSync(UPLOAD_DIR)) {
            const diskFiles = fs.readdirSync(UPLOAD_DIR);
            for (const dFile of diskFiles) {
              const fullPath = path.join(UPLOAD_DIR, dFile);
              if (fs.statSync(fullPath).isFile()) {
                const ext = path.extname(dFile);
                const fileId = path.basename(dFile, ext);
                if (!parsed.files[fileId] && !parsed.files[dFile]) {
                  const mime = getMimeType(dFile);
                  const guessedType: FileType = mime.startsWith('image/')
                    ? 'site_photo'
                    : mime === 'application/pdf'
                    ? 'circuit_diagram'
                    : 'other';
                  const record: FileRecord = {
                    id: fileId,
                    originalName: dFile,
                    fileType: guessedType,
                    mimeType: mime,
                    size: fs.statSync(fullPath).size,
                    storedFilename: dFile,
                    url: `/api/files/${fileId}`,
                    downloadUrl: `/api/files/${fileId}/download`,
                    uploadedAt: new Date(fs.statSync(fullPath).mtime).toISOString(),
                    description: '系統永久保存之上傳檔案',
                  };
                  parsed.files[fileId] = record;
                }
              }
            }
          }
        } catch (scanErr) {
          console.error('Error scanning uploads directory during init:', scanErr);
        }

        // 2. Ensure maintenanceRecords array exists
        if (!Array.isArray(parsed.maintenanceRecords)) {
          parsed.maintenanceRecords = [];
        }

        // If maintenance records are empty, add two initial sample records for CR-001
        if (parsed.maintenanceRecords.length === 0) {
          const nowStr = new Date().toISOString();
          parsed.maintenanceRecords = [
            {
              id: 'maint_seed_1',
              equipmentTagNumber: 'CR-001',
              date: new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0],
              personnel: '張文豪 (機電工程師)',
              content: '執行每週例行巡檢：檢查主馬達變頻器冷卻風扇運轉與端子螺絲鎖緊度，以紅外線熱成像檢測三相電源進線端子，溫度為 38.2°C (正常)，絕緣阻抗 > 50MΩ。',
              files: [],
              createdAt: nowStr,
            },
            {
              id: 'maint_seed_2',
              equipmentTagNumber: 'CR-001',
              date: new Date(Date.now() - 2 * 86400000).toISOString().split('T')[0],
              personnel: '李建志 (現場技術員)',
              content: '料斗安全連鎖近接開關 SEN-001 重新清潔與校正，感測距離調整為 8mm，測試急停按鈕與雙迴路安全繼電器連鎖停機功能均正常無誤。',
              files: [],
              createdAt: nowStr,
            },
          ];
        }

        // Also sync maintenanceRecords onto equipment objects
        for (const eq of parsed.equipment) {
          eq.maintenanceRecords = parsed.maintenanceRecords.filter(
            (r: MaintenanceRecord) => r.equipmentTagNumber?.toLowerCase() === eq.tagNumber?.toLowerCase()
          );
        }

        // 3. Ensure spare parts storageLocations array is populated
        for (const pt of parsed.spareParts) {
          if (!Array.isArray(pt.storageLocations) || pt.storageLocations.length === 0) {
            if (pt.storageLocation) {
              pt.storageLocations = pt.storageLocation
                .split(/[,/、，]+/)
                .map((s: string) => s.trim())
                .filter(Boolean);
            } else {
              pt.storageLocations = [];
            }
          }
        }

        // 4. Create automatic backup of db.json
        try {
          const backupPath = path.join(DATA_DIR, 'db.backup.json');
          fs.writeFileSync(backupPath, JSON.stringify(parsed, null, 2), 'utf-8');
        } catch (bkErr) {
          console.error('Failed to create db backup:', bkErr);
        }

        saveDatabase(parsed);
        return parsed;
      }
    } catch (e) {
      console.error('Failed reading existing db.json, reseeding...', e);
    }
  }

  // Create sample files on disk
  const samplePdfName1 = `seed-cr001-schematic.pdf`;
  const samplePdfPath1 = path.join(UPLOAD_DIR, samplePdfName1);
  if (!fs.existsSync(samplePdfPath1)) {
    fs.writeFileSync(
      samplePdfPath1,
      createSamplePdf(
        'CR-001 Crusher Control Circuit Diagram',
        'Main Power 380VAC 3-Phase / 24VDC Control Loop',
        [
          'Drawing No: E-CR001-REV3',
          'VFD Speed Control: 0-10V Analog Out from PLC Ch1',
          'Safety Circuit: Dual-channel Emergency Stop Loop with Pilz Relay',
          'Interlock: Hopper Limit Switch SEN-001 connected to PLC X0',
        ]
      )
    );
  }

  const samplePdfName2 = `seed-vfd-manual.pdf`;
  const samplePdfPath2 = path.join(UPLOAD_DIR, samplePdfName2);
  if (!fs.existsSync(samplePdfPath2)) {
    fs.writeFileSync(
      samplePdfPath2,
      createSamplePdf(
        'FUJI FRENIC VFD Technical Operation Manual',
        'Model: FRN0060C2S-4C (37kW / 50HP)',
        [
          'Input: 3-Phase 380-480V 50/60Hz',
          'Output: 0-480V 0.1-400Hz 75A',
          'Parameter F01: Frequency Command (0: Keypad, 1: 0-10V terminal)',
          'Parameter F02: Operation Command (1: External FW/REV terminals)',
          'Alarm Code OC1/OC2: Overcurrent protection active',
        ]
      )
    );
  }

  const samplePhotoName1 = `seed-cr001-site.svg`;
  const samplePhotoPath1 = path.join(UPLOAD_DIR, samplePhotoName1);
  if (!fs.existsSync(samplePhotoPath1)) {
    fs.writeFileSync(
      samplePhotoPath1,
      createSampleSvg('CR-001 粉碎機現場實景', '安裝位置：A棟原料粉碎區 1號線', '現場照片', '#0284c7')
    );
  }

  const samplePhotoName2 = `seed-vfd-part.svg`;
  const samplePhotoPath2 = path.join(UPLOAD_DIR, samplePhotoName2);
  if (!fs.existsSync(samplePhotoPath2)) {
    fs.writeFileSync(
      samplePhotoPath2,
      createSampleSvg('FUJI FRN0060C2S-4C 變頻器', '廠牌：富士電機 FUJI / 37kW', '備品照片', '#16a34a')
    );
  }

  const now = new Date().toISOString();

  const file1: FileRecord = {
    id: 'seed-f1',
    originalName: 'CR-001_粉碎機控制電路圖_REV3.pdf',
    fileType: 'circuit_diagram',
    mimeType: 'application/pdf',
    size: 980,
    storedFilename: samplePdfName1,
    url: '/api/files/seed-f1',
    downloadUrl: '/api/files/seed-f1/download',
    uploadedAt: now,
    description: '主馬達 380V 與 PLC 控制迴路圖',
  };

  const file2: FileRecord = {
    id: 'seed-f2',
    originalName: 'CR-001_粉碎機現場安裝照.svg',
    fileType: 'site_photo',
    mimeType: 'image/svg+xml',
    size: 1540,
    storedFilename: samplePhotoName1,
    url: '/api/files/seed-f2',
    downloadUrl: '/api/files/seed-f2/download',
    uploadedAt: now,
    description: 'A棟粉碎車間現場全景照',
  };

  const file3: FileRecord = {
    id: 'seed-f3',
    originalName: 'FUJI_FRN_變頻器原廠操作手冊.pdf',
    fileType: 'manual',
    mimeType: 'application/pdf',
    size: 1040,
    storedFilename: samplePdfName2,
    url: '/api/files/seed-f3',
    downloadUrl: '/api/files/seed-f3/download',
    uploadedAt: now,
    description: '富士 FRENIC 繁體中文參數設定手冊',
  };

  const file4: FileRecord = {
    id: 'seed-f4',
    originalName: 'FRN0060C2S-4C_外觀照片.svg',
    fileType: 'component_photo',
    mimeType: 'image/svg+xml',
    size: 1480,
    storedFilename: samplePhotoName2,
    url: '/api/files/seed-f4',
    downloadUrl: '/api/files/seed-f4/download',
    uploadedAt: now,
    description: '備品庫存外箱與銘板實拍',
  };

  const seedSpareParts: SparePart[] = [
    {
      partNumber: 'VFD-FUJI-37K',
      name: '變頻器',
      brand: 'FUJI 富士電機',
      model: 'FRN0060C2S-4C (37kW)',
      stockQty: 2,
      minStockQty: 1,
      storageLocation: '備品庫 A架-02-01',
      files: [file3, file4],
      notes: '粉碎主馬達專用變頻器，出廠已載入 CR-01 專用加減速參數。',
      createdAt: now,
      updatedAt: now,
    },
    {
      partNumber: 'MTR-TECO-37K',
      name: '高效率馬達',
      brand: 'TECO 東元',
      model: 'AEEV 37kW 4P 380V IE3',
      stockQty: 1,
      minStockQty: 1,
      storageLocation: '重型馬達專用區 M-01',
      files: [],
      notes: '法蘭臥式安裝，附 PTC 熱敏保護接點。',
      createdAt: now,
      updatedAt: now,
    },
    {
      partNumber: 'PSU-MW-24V',
      name: '電源供應器',
      brand: 'MEAN WELL 明緯',
      model: 'NDR-120-24 (24V 5A 120W)',
      stockQty: 6,
      minStockQty: 2,
      storageLocation: '備品庫 B櫃-01-04',
      files: [],
      notes: '標準 DIN 導軌型，工廠控制盤通用備品。',
      createdAt: now,
      updatedAt: now,
    },
    {
      partNumber: 'SEN-OMR-PRX',
      name: '近接開關',
      brand: 'OMRON 歐姆龍',
      model: 'E2E-X10MF1 (M18 PNP NO 10mm)',
      stockQty: 12,
      minStockQty: 3,
      storageLocation: '備品庫 C抽屜-03',
      files: [],
      notes: '感應距離 10mm，耐油耐震型，適用於各料斗料位感測。',
      createdAt: now,
      updatedAt: now,
    },
    {
      partNumber: 'RLY-OMR-MY4',
      name: '繼電器',
      brand: 'OMRON 歐姆龍',
      model: 'MY4N-D2 24VDC (帶二極體與LED)',
      stockQty: 24,
      minStockQty: 10,
      storageLocation: '備品庫 C抽屜-01',
      files: [],
      notes: '配 PYF14A-E 導軌底座。',
      createdAt: now,
      updatedAt: now,
    },
    {
      partNumber: 'MC-SCH-32A',
      name: '接觸器',
      brand: 'Schneider 施耐德',
      model: 'LC1D32M7 (32A 3P 220VAC線圈)',
      stockQty: 4,
      minStockQty: 2,
      storageLocation: '備品庫 B櫃-02-02',
      files: [],
      notes: '盤內輔助接觸器與排風冷卻風扇啟動器。',
      createdAt: now,
      updatedAt: now,
    },
    {
      partNumber: 'PLC-FX5U-32M',
      name: 'PLC 模組',
      brand: 'MITSUBISHI 三菱',
      model: 'FX5U-32MT/ES (16入16晶體出)',
      stockQty: 2,
      minStockQty: 1,
      storageLocation: '防潮箱 E-02',
      files: [],
      notes: '內建乙太網路介面，備份程式在 SD 卡備份匣內。',
      createdAt: now,
      updatedAt: now,
    },
    {
      partNumber: 'NFB-SHIN-50A',
      name: '無熔絲開關',
      brand: 'SHIHLIN 士林電機',
      model: 'NF50-CW 3P 50A 10kA',
      stockQty: 5,
      minStockQty: 2,
      storageLocation: '備品庫 B櫃-03-01',
      files: [],
      notes: '控制盤主電源進線隔離斷路器。',
      createdAt: now,
      updatedAt: now,
    },
  ];

  const seedEquipment: Equipment[] = [
    {
      tagNumber: 'CR-001',
      name: '大型塑膠粉碎機',
      parentTagNumber: null,
      category: '主設備',
      installationLocation: 'A棟原料粉碎區 1號線',
      notes: '廠區核心粉碎機，負責回收料初碎。雙重安全極限開關與連鎖控制。',
      files: [file1, file2],
      componentPartNumbers: ['VFD-FUJI-37K', 'SEN-OMR-PRX'],
      createdAt: now,
      updatedAt: now,
    },
    {
      tagNumber: 'MTR-001',
      name: '粉碎主馬達',
      parentTagNumber: 'CR-001',
      category: '馬達',
      installationLocation: '粉碎機 CR-001 本體底座',
      notes: '37kW 三相 380V 馬達，皮帶輪減速傳動。注意定期檢測絕緣阻抗與軸承溫度。',
      files: [],
      componentPartNumbers: ['MTR-TECO-37K'],
      createdAt: now,
      updatedAt: now,
    },
    {
      tagNumber: 'VFD-001',
      name: '馬達變頻器單元',
      parentTagNumber: 'CR-001',
      category: '變頻器',
      installationLocation: '控制盤 CP-01 內部左側',
      notes: '驅動 MTR-001 主馬達，通訊由 PLC 經比率類比電壓調速。',
      files: [],
      componentPartNumbers: ['VFD-FUJI-37K'],
      createdAt: now,
      updatedAt: now,
    },
    {
      tagNumber: 'CP-01',
      name: '粉碎機主控制盤',
      parentTagNumber: 'CR-001',
      category: '控制盤',
      installationLocation: 'A棟原料粉碎區 1號機右側立柱旁',
      notes: 'IP55 防水防塵電控盤，包含主進線 NFB、PLC、直流 24V 電源及繼電器陣列。',
      files: [],
      componentPartNumbers: ['PSU-MW-24V', 'RLY-OMR-MY4', 'MC-SCH-32A', 'NFB-SHIN-50A'],
      createdAt: now,
      updatedAt: now,
    },
    {
      tagNumber: 'PLC-01',
      name: '中央 PLC 控制器',
      parentTagNumber: 'CP-01',
      category: 'PLC I/O',
      installationLocation: '控制盤 CP-01 導軌第二層',
      notes: '執行設備啟停順序、過載連鎖、震動異常停機程式。',
      files: [],
      componentPartNumbers: ['PLC-FX5U-32M', 'PSU-MW-24V'],
      createdAt: now,
      updatedAt: now,
    },
    {
      tagNumber: 'SEN-001',
      name: '進料斗近接 Sensor',
      parentTagNumber: 'CR-001',
      category: '感測器',
      installationLocation: '粉碎機進料導槽側邊',
      notes: '檢測入料斗滿料狀態，觸發自動進料減速。',
      files: [],
      componentPartNumbers: ['SEN-OMR-PRX'],
      createdAt: now,
      updatedAt: now,
    },
    {
      tagNumber: 'FAN-001',
      name: '盤頂散熱風扇組',
      parentTagNumber: 'CP-01',
      category: '冷卻風扇',
      installationLocation: '控制盤 CP-01 頂部排熱口',
      notes: '溫控器設定 35°C 自動啟動強制抽風。',
      files: [],
      componentPartNumbers: [],
      createdAt: now,
      updatedAt: now,
    },
    {
      tagNumber: 'CV-001',
      name: '碎料出料輸送機',
      parentTagNumber: null,
      category: '主設備',
      installationLocation: 'A棟原料粉碎區 輸送段',
      notes: '承接 CR-001 粉碎碎料並輸送至儲料槽。',
      files: [],
      componentPartNumbers: ['PSU-MW-24V', 'RLY-OMR-MY4'],
      createdAt: now,
      updatedAt: now,
    },
  ];

  const seedConfig: SystemConfig = {
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

  const db: DatabaseSchema = {
    equipment: seedEquipment,
    spareParts: seedSpareParts,
    config: seedConfig,
    files: {
      [file1.id]: file1,
      [file2.id]: file2,
      [file3.id]: file3,
      [file4.id]: file4,
    },
  };

  saveDatabase(db);
  return db;
}

// Atomic save database helper
function saveDatabase(db: DatabaseSchema) {
  const tmpFile = `${DB_FILE}.tmp`;
  fs.writeFileSync(tmpFile, JSON.stringify(db, null, 2), 'utf-8');
  fs.renameSync(tmpFile, DB_FILE);
}

// In-memory reference synced with disk
let db = initDatabase();

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '10mb' }));

  // API Routes
  // 1. Get full database / state
  app.get('/api/database', (_req: Request, res: Response) => {
    res.json(db);
  });

  // 2. Equipment CRUD
  app.get('/api/equipment', (req: Request, res: Response) => {
    const q = ((req.query.q as string) || '').trim().toLowerCase();
    const category = (req.query.category as string) || '';

    let list = db.equipment;
    if (category) {
      list = list.filter((e) => e.category === category);
    }
    if (q) {
      list = list.filter(
        (e) =>
          e.tagNumber.toLowerCase().includes(q) ||
          e.name.toLowerCase().includes(q) ||
          e.installationLocation.toLowerCase().includes(q) ||
          (e.notes && e.notes.toLowerCase().includes(q))
      );
    }
    res.json(list);
  });

  app.get('/api/equipment/:tag', (req: Request, res: Response) => {
    const item = db.equipment.find((e) => e.tagNumber === req.params.tag);
    if (!item) {
      return res.status(404).json({ error: '找不到該設備' });
    }
    res.json(item);
  });

  app.post('/api/equipment', (req: Request, res: Response) => {
    const {
      tagNumber,
      name,
      parentTagNumber,
      category,
      installationLocation,
      notes,
      files,
      componentPartNumbers,
    } = req.body;

    if (!tagNumber || !tagNumber.trim()) {
      return res.status(400).json({ error: 'TAG NUMBER 為必填欄位' });
    }
    const cleanTag = tagNumber.trim();
    if (db.equipment.some((e) => e.tagNumber.toLowerCase() === cleanTag.toLowerCase())) {
      return res.status(400).json({ error: `設備 TAG NUMBER "${cleanTag}" 已存在，不可重複！` });
    }
    if (!name || !name.trim()) {
      return res.status(400).json({ error: '設備名稱為必填欄位' });
    }

    // Auto-register category if new
    if (category && !db.config.equipmentCategories.includes(category.trim())) {
      db.config.equipmentCategories.push(category.trim());
    }

    const now = new Date().toISOString();
    const newEquipment: Equipment = {
      tagNumber: cleanTag,
      name: name.trim(),
      parentTagNumber: parentTagNumber && parentTagNumber.trim() ? parentTagNumber.trim() : null,
      category: category ? category.trim() : '主設備',
      installationLocation: installationLocation ? installationLocation.trim() : '',
      notes: notes ? notes.trim() : '',
      files: Array.isArray(files) ? files : [],
      componentPartNumbers: Array.isArray(componentPartNumbers) ? componentPartNumbers : [],
      createdAt: now,
      updatedAt: now,
    };

    db.equipment.push(newEquipment);
    saveDatabase(db);
    res.status(201).json(newEquipment);
  });

  app.put('/api/equipment/:tag', (req: Request, res: Response) => {
    const oldTag = req.params.tag;
    const index = db.equipment.findIndex((e) => e.tagNumber === oldTag);
    if (index === -1) {
      return res.status(404).json({ error: '找不到要更新的設備' });
    }

    const {
      tagNumber: newTag,
      name,
      parentTagNumber,
      category,
      installationLocation,
      notes,
      files,
      componentPartNumbers,
    } = req.body;

    if (!newTag || !newTag.trim()) {
      return res.status(400).json({ error: 'TAG NUMBER 為必填欄位' });
    }
    const cleanNewTag = newTag.trim();

    // If tag changed, ensure newTag is not taken by another equipment
    if (cleanNewTag.toLowerCase() !== oldTag.toLowerCase()) {
      if (db.equipment.some((e) => e.tagNumber.toLowerCase() === cleanNewTag.toLowerCase())) {
        return res.status(400).json({ error: `TAG NUMBER "${cleanNewTag}" 已被其他設備使用！` });
      }

      // Cascade update children parentTagNumber
      db.equipment.forEach((e) => {
        if (e.parentTagNumber === oldTag) {
          e.parentTagNumber = cleanNewTag;
        }
      });
    }

    if (!name || !name.trim()) {
      return res.status(400).json({ error: '設備名稱為必填欄位' });
    }

    // Auto register category if new
    if (category && !db.config.equipmentCategories.includes(category.trim())) {
      db.config.equipmentCategories.push(category.trim());
    }

    const prev = db.equipment[index];
    const now = new Date().toISOString();

    const updated: Equipment = {
      ...prev,
      tagNumber: cleanNewTag,
      name: name.trim(),
      parentTagNumber:
        parentTagNumber && parentTagNumber.trim() && parentTagNumber.trim() !== cleanNewTag
          ? parentTagNumber.trim()
          : null,
      category: category ? category.trim() : prev.category,
      installationLocation:
        installationLocation !== undefined ? installationLocation.trim() : prev.installationLocation,
      notes: notes !== undefined ? notes.trim() : prev.notes,
      files: Array.isArray(files) ? files : prev.files,
      componentPartNumbers: Array.isArray(componentPartNumbers)
        ? componentPartNumbers
        : prev.componentPartNumbers,
      updatedAt: now,
    };

    db.equipment[index] = updated;
    saveDatabase(db);
    res.json(updated);
  });

  app.delete('/api/equipment/:tag', (req: Request, res: Response) => {
    const tag = req.params.tag;
    const index = db.equipment.findIndex((e) => e.tagNumber === tag);
    if (index === -1) {
      return res.status(404).json({ error: '找不到要刪除的設備' });
    }

    // When deleting, disconnect children so they don't have dangling parent
    db.equipment.forEach((e) => {
      if (e.parentTagNumber === tag) {
        e.parentTagNumber = null;
      }
    });

    db.equipment.splice(index, 1);
    // Cascade remove maintenance records for this equipment
    if (db.maintenanceRecords) {
      db.maintenanceRecords = db.maintenanceRecords.filter(
        (r) => r.equipmentTagNumber?.toLowerCase() !== tag.toLowerCase()
      );
    }
    saveDatabase(db);
    res.json({ success: true, message: `設備 ${tag} 已成功刪除` });
  });

  // 2b. Maintenance Records CRUD
  app.get('/api/equipment/:tag/maintenance', (req: Request, res: Response) => {
    const tag = req.params.tag;
    const records = (db.maintenanceRecords || [])
      .filter((r) => r.equipmentTagNumber?.toLowerCase() === tag.toLowerCase())
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    res.json(records);
  });

  app.post('/api/equipment/:tag/maintenance', (req: Request, res: Response) => {
    const tag = req.params.tag;
    const eq = db.equipment.find((e) => e.tagNumber.toLowerCase() === tag.toLowerCase());
    if (!eq) {
      return res.status(404).json({ error: `找不到設備 ${tag}` });
    }

    const { date, personnel, content, files } = req.body;
    if (!date || !String(date).trim()) {
      return res.status(400).json({ error: '維修日期為必填欄位' });
    }
    if (!personnel || !String(personnel).trim()) {
      return res.status(400).json({ error: '維修人員為必填欄位' });
    }
    if (!content || !String(content).trim()) {
      return res.status(400).json({ error: '維修內容為必填欄位' });
    }

    const now = new Date().toISOString();
    const newRecord: MaintenanceRecord = {
      id: `maint_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`,
      equipmentTagNumber: eq.tagNumber,
      date: String(date).trim(),
      personnel: String(personnel).trim(),
      content: String(content).trim(),
      files: Array.isArray(files) ? files : [],
      createdAt: now,
      updatedAt: now,
    };

    if (!db.maintenanceRecords) db.maintenanceRecords = [];
    db.maintenanceRecords.unshift(newRecord);

    if (!eq.maintenanceRecords) eq.maintenanceRecords = [];
    eq.maintenanceRecords.unshift(newRecord);
    eq.updatedAt = now;

    saveDatabase(db);
    res.status(201).json(newRecord);
  });

  app.put('/api/maintenance/:id', (req: Request, res: Response) => {
    const id = req.params.id;
    if (!db.maintenanceRecords) db.maintenanceRecords = [];
    const idx = db.maintenanceRecords.findIndex((r) => r.id === id);
    if (idx === -1) {
      return res.status(404).json({ error: '找不到該維修紀錄' });
    }

    const { date, personnel, content, files } = req.body;
    const prev = db.maintenanceRecords[idx];
    const now = new Date().toISOString();

    const updated: MaintenanceRecord = {
      ...prev,
      date: date !== undefined ? String(date).trim() : prev.date,
      personnel: personnel !== undefined ? String(personnel).trim() : prev.personnel,
      content: content !== undefined ? String(content).trim() : prev.content,
      files: Array.isArray(files) ? files : prev.files,
      updatedAt: now,
    };

    db.maintenanceRecords[idx] = updated;

    // Update in equipment if attached
    const eq = db.equipment.find(
      (e) => e.tagNumber.toLowerCase() === updated.equipmentTagNumber.toLowerCase()
    );
    if (eq && eq.maintenanceRecords) {
      const eqIdx = eq.maintenanceRecords.findIndex((r) => r.id === id);
      if (eqIdx !== -1) {
        eq.maintenanceRecords[eqIdx] = updated;
      }
    }

    saveDatabase(db);
    res.json(updated);
  });

  app.delete('/api/maintenance/:id', (req: Request, res: Response) => {
    const id = req.params.id;
    if (!db.maintenanceRecords) db.maintenanceRecords = [];
    const idx = db.maintenanceRecords.findIndex((r) => r.id === id);
    if (idx === -1) {
      return res.status(404).json({ error: '找不到該維修紀錄' });
    }

    const removed = db.maintenanceRecords.splice(idx, 1)[0];

    // Remove from equipment
    const eq = db.equipment.find(
      (e) => e.tagNumber.toLowerCase() === removed.equipmentTagNumber.toLowerCase()
    );
    if (eq && eq.maintenanceRecords) {
      eq.maintenanceRecords = eq.maintenanceRecords.filter((r) => r.id !== id);
    }

    saveDatabase(db);
    res.json({ success: true, message: '維修紀錄已成功刪除' });
  });

  // 3. Spare Parts CRUD
  app.get('/api/parts', (req: Request, res: Response) => {
    const q = ((req.query.q as string) || '').trim().toLowerCase();
    const nameFilter = (req.query.name as string) || '';
    const storageLocation = (req.query.storage as string) || '';

    let list = db.spareParts;
    if (nameFilter) {
      list = list.filter((p) => p.name === nameFilter);
    }
    if (storageLocation) {
      list = list.filter((p) => {
        const inMain = p.storageLocation && p.storageLocation.toLowerCase().includes(storageLocation.toLowerCase());
        const inList = p.storageLocations && p.storageLocations.some((loc) => loc.toLowerCase().includes(storageLocation.toLowerCase()));
        return inMain || inList;
      });
    }
    if (q) {
      list = list.filter(
        (p) =>
          p.partNumber.toLowerCase().includes(q) ||
          p.name.toLowerCase().includes(q) ||
          p.brand.toLowerCase().includes(q) ||
          p.model.toLowerCase().includes(q) ||
          p.storageLocation.toLowerCase().includes(q) ||
          (p.storageLocations && p.storageLocations.some((loc) => loc.toLowerCase().includes(q))) ||
          (p.notes && p.notes.toLowerCase().includes(q))
      );
    }
    res.json(list);
  });

  app.get('/api/parts/:partNumber', (req: Request, res: Response) => {
    const item = db.spareParts.find((p) => p.partNumber === req.params.partNumber);
    if (!item) {
      return res.status(404).json({ error: '找不到該備品物料' });
    }
    res.json(item);
  });

  app.post('/api/parts', (req: Request, res: Response) => {
    const {
      partNumber,
      name,
      brand,
      model,
      stockQty,
      minStockQty,
      storageLocation,
      storageLocations,
      files,
      notes,
    } = req.body;

    if (!partNumber || !partNumber.trim()) {
      return res.status(400).json({ error: '料號為必填欄位' });
    }
    const cleanPartNo = partNumber.trim();
    if (db.spareParts.some((p) => p.partNumber.toLowerCase() === cleanPartNo.toLowerCase())) {
      return res.status(400).json({ error: `料號 "${cleanPartNo}" 已存在，不可重複建立！` });
    }
    if (!name || !name.trim()) {
      return res.status(400).json({ error: '品名為必填欄位' });
    }

    // Auto-register part name in config
    if (name && !db.config.partNames.includes(name.trim())) {
      db.config.partNames.push(name.trim());
    }

    // Parse storage locations (support 2 or more locations)
    let finalLocations: string[] = [];
    if (Array.isArray(storageLocations) && storageLocations.length > 0) {
      finalLocations = storageLocations.map((s: string) => String(s).trim()).filter(Boolean);
    } else if (storageLocation && typeof storageLocation === 'string') {
      finalLocations = storageLocation.split(/[,/、，]+/).map((s: string) => s.trim()).filter(Boolean);
    }
    const finalStorageLocation =
      finalLocations.length > 0
        ? finalLocations.join('、')
        : storageLocation
        ? String(storageLocation).trim()
        : '';

    const now = new Date().toISOString();
    const newPart: SparePart = {
      partNumber: cleanPartNo,
      name: name.trim(),
      brand: brand ? brand.trim() : '',
      model: model ? model.trim() : '',
      stockQty: Number.isFinite(Number(stockQty)) ? Number(stockQty) : 0,
      minStockQty: Number.isFinite(Number(minStockQty)) ? Number(minStockQty) : 0,
      storageLocation: finalStorageLocation,
      storageLocations: finalLocations.length > 0 ? finalLocations : (finalStorageLocation ? [finalStorageLocation] : []),
      files: Array.isArray(files) ? files : [],
      notes: notes ? notes.trim() : '',
      createdAt: now,
      updatedAt: now,
    };

    db.spareParts.push(newPart);
    saveDatabase(db);
    res.status(201).json(newPart);
  });

  app.post('/api/parts/batch-import', (req: Request, res: Response) => {
    const { parts } = req.body;
    if (!Array.isArray(parts)) {
      return res.status(400).json({ error: '請求格式不正確，parts 必須為陣列' });
    }

    const now = new Date().toISOString();
    let importedCount = 0;
    let updatedCount = 0;

    for (const item of parts) {
      if (!item.partNumber || !String(item.partNumber).trim()) continue;
      const cleanPartNo = String(item.partNumber).trim();
      const cleanName = item.name ? String(item.name).trim() : '未命名備品';

      if (cleanName && !db.config.partNames.includes(cleanName)) {
        db.config.partNames.push(cleanName);
      }

      const storageLocInput = item.storageLocation || item.storageLocations || '';
      let finalLocations: string[] = [];
      if (Array.isArray(storageLocInput)) {
        finalLocations = storageLocInput.map((s: string) => String(s).trim()).filter(Boolean);
      } else if (typeof storageLocInput === 'string') {
        finalLocations = storageLocInput.split(/[,/、，\n]+/).map((s: string) => s.trim()).filter(Boolean);
      }
      const finalStorageLocation = finalLocations.join('、');

      const existingIdx = db.spareParts.findIndex(
        (p) => p.partNumber.toLowerCase() === cleanPartNo.toLowerCase()
      );

      if (existingIdx !== -1) {
        const prev = db.spareParts[existingIdx];
        db.spareParts[existingIdx] = {
          ...prev,
          name: cleanName,
          brand: item.brand !== undefined ? String(item.brand).trim() : prev.brand,
          model: item.model !== undefined ? String(item.model).trim() : prev.model,
          stockQty: Number.isFinite(Number(item.stockQty)) ? Number(item.stockQty) : prev.stockQty,
          minStockQty: Number.isFinite(Number(item.minStockQty)) ? Number(item.minStockQty) : (prev.minStockQty ?? 0),
          storageLocation: finalStorageLocation || prev.storageLocation,
          storageLocations: finalLocations.length > 0 ? finalLocations : prev.storageLocations,
          notes: item.notes !== undefined ? String(item.notes).trim() : prev.notes,
          updatedAt: now,
        };
        updatedCount++;
      } else {
        const newPart: SparePart = {
          partNumber: cleanPartNo,
          name: cleanName,
          brand: item.brand ? String(item.brand).trim() : '',
          model: item.model ? String(item.model).trim() : '',
          stockQty: Number.isFinite(Number(item.stockQty)) ? Number(item.stockQty) : 0,
          minStockQty: Number.isFinite(Number(item.minStockQty)) ? Number(item.minStockQty) : 0,
          storageLocation: finalStorageLocation,
          storageLocations: finalLocations,
          files: [],
          notes: item.notes ? String(item.notes).trim() : '',
          createdAt: now,
          updatedAt: now,
        };
        db.spareParts.push(newPart);
        importedCount++;
      }
    }

    saveDatabase(db);
    res.json({
      success: true,
      importedCount,
      updatedCount,
      message: `Excel 備品批次匯入完成！新增 ${importedCount} 項、更新 ${updatedCount} 項備品。`,
    });
  });

  app.put('/api/parts/:partNumber', (req: Request, res: Response) => {
    const oldPartNo = req.params.partNumber;
    const index = db.spareParts.findIndex((p) => p.partNumber === oldPartNo);
    if (index === -1) {
      return res.status(404).json({ error: '找不到要更新的備品' });
    }

    const {
      partNumber: newPartNo,
      name,
      brand,
      model,
      stockQty,
      minStockQty,
      storageLocation,
      storageLocations,
      files,
      notes,
    } = req.body;

    if (!newPartNo || !newPartNo.trim()) {
      return res.status(400).json({ error: '料號為必填欄位' });
    }
    const cleanNewPartNo = newPartNo.trim();

    // If partNumber changed, ensure uniqueness and cascade to equipment associations
    if (cleanNewPartNo.toLowerCase() !== oldPartNo.toLowerCase()) {
      if (db.spareParts.some((p) => p.partNumber.toLowerCase() === cleanNewPartNo.toLowerCase())) {
        return res.status(400).json({ error: `料號 "${cleanNewPartNo}" 已被其他元件使用！` });
      }

      // Update in equipment associations
      db.equipment.forEach((e) => {
        const pIdx = e.componentPartNumbers.indexOf(oldPartNo);
        if (pIdx !== -1) {
          e.componentPartNumbers[pIdx] = cleanNewPartNo;
        }
      });
    }

    if (!name || !name.trim()) {
      return res.status(400).json({ error: '品名為必填欄位' });
    }

    if (name && !db.config.partNames.includes(name.trim())) {
      db.config.partNames.push(name.trim());
    }

    const prev = db.spareParts[index];
    const now = new Date().toISOString();

    // Handle multiple storage locations
    let finalLocations: string[] = prev.storageLocations || [];
    if (Array.isArray(storageLocations)) {
      finalLocations = storageLocations.map((s: string) => String(s).trim()).filter(Boolean);
    } else if (storageLocation !== undefined) {
      finalLocations = String(storageLocation).split(/[,/、，]+/).map((s: string) => s.trim()).filter(Boolean);
    }
    const finalStorageLocation =
      finalLocations.length > 0
        ? finalLocations.join('、')
        : storageLocation !== undefined
        ? String(storageLocation).trim()
        : prev.storageLocation;

    const updated: SparePart = {
      ...prev,
      partNumber: cleanNewPartNo,
      name: name.trim(),
      brand: brand !== undefined ? brand.trim() : prev.brand,
      model: model !== undefined ? model.trim() : prev.model,
      stockQty: Number.isFinite(Number(stockQty)) ? Number(stockQty) : prev.stockQty,
      minStockQty: Number.isFinite(Number(minStockQty)) ? Number(minStockQty) : prev.minStockQty,
      storageLocation: finalStorageLocation,
      storageLocations: finalLocations.length > 0 ? finalLocations : (finalStorageLocation ? [finalStorageLocation] : []),
      files: Array.isArray(files) ? files : prev.files,
      notes: notes !== undefined ? notes.trim() : prev.notes,
      requisitionRecords: Array.isArray(req.body.requisitionRecords) ? req.body.requisitionRecords : prev.requisitionRecords,
      updatedAt: now,
    };

    db.spareParts[index] = updated;
    saveDatabase(db);
    res.json(updated);
  });

  app.delete('/api/parts/:partNumber', (req: Request, res: Response) => {
    const partNo = req.params.partNumber;
    const index = db.spareParts.findIndex((p) => p.partNumber === partNo);
    if (index === -1) {
      return res.status(404).json({ error: '找不到要刪除的備品' });
    }

    // Remove from equipment component associations
    db.equipment.forEach((e) => {
      e.componentPartNumbers = e.componentPartNumbers.filter((pn) => pn !== partNo);
    });

    db.spareParts.splice(index, 1);
    saveDatabase(db);
    res.json({ success: true, message: `備品 ${partNo} 已刪除，並已解除所有設備關聯` });
  });

  // 4. Quick Stock Adjustment
  app.post('/api/parts/:partNumber/adjust-stock', (req: Request, res: Response) => {
    const partNo = req.params.partNumber;
    const { delta, absolute } = req.body;
    const part = db.spareParts.find((p) => p.partNumber === partNo);
    if (!part) {
      return res.status(404).json({ error: '找不到該備品物料' });
    }

    if (typeof absolute === 'number') {
      part.stockQty = Math.max(0, absolute);
    } else if (typeof delta === 'number') {
      part.stockQty = Math.max(0, part.stockQty + delta);
    }
    part.updatedAt = new Date().toISOString();
    saveDatabase(db);
    res.json(part);
  });

  // 5. Equipment-Component Associations Management
  app.post('/api/associations', (req: Request, res: Response) => {
    const { tagNumber, partNumber, action } = req.body; // action: 'add' | 'remove'
    if (!tagNumber || !partNumber) {
      return res.status(400).json({ error: '請提供 tagNumber 與 partNumber' });
    }

    const eq = db.equipment.find((e) => e.tagNumber === tagNumber);
    if (!eq) {
      return res.status(404).json({ error: '找不到指定的設備' });
    }
    const part = db.spareParts.find((p) => p.partNumber === partNumber);
    if (!part) {
      return res.status(404).json({ error: '找不到指定的備品' });
    }

    if (action === 'remove') {
      eq.componentPartNumbers = eq.componentPartNumbers.filter((p) => p !== partNumber);
    } else {
      if (!eq.componentPartNumbers.includes(partNumber)) {
        eq.componentPartNumbers.push(partNumber);
      }
    }
    eq.updatedAt = new Date().toISOString();
    saveDatabase(db);
    res.json({ success: true, equipment: eq });
  });

  // 6. File Upload Endpoint
  app.post('/api/files/upload', upload.single('file'), (req: Request, res: Response) => {
    if (!req.file) {
      return res.status(400).json({ error: '未接收到上傳的檔案' });
    }

    const fileType = (req.body.fileType as FileType) || 'other';
    const description = (req.body.description as string) || '';
    const ext = path.extname(req.file.filename);
    const fileId = path.basename(req.file.filename, ext);

    const fileRecord: FileRecord = {
      id: fileId,
      originalName: req.file.originalname,
      fileType,
      mimeType: req.file.mimetype || getMimeType(req.file.originalname),
      size: req.file.size,
      storedFilename: req.file.filename,
      url: `/api/files/${fileId}`,
      downloadUrl: `/api/files/${fileId}/download`,
      uploadedAt: new Date().toISOString(),
      description,
    };

    if (!db.files) db.files = {};
    db.files[fileId] = fileRecord;
    saveDatabase(db);

    res.status(201).json(fileRecord);
  });

  // 6b. Multiple Files Batch Upload Endpoint
  app.post('/api/files/upload-multiple', upload.array('files', 50), (req: Request, res: Response) => {
    const files = req.files as Express.Multer.File[];
    if (!files || files.length === 0) {
      return res.status(400).json({ error: '未接收到上傳的檔案' });
    }

    const fileType = (req.body.fileType as FileType) || 'other';
    const description = (req.body.description as string) || '';

    if (!db.files) db.files = {};

    const records: FileRecord[] = files.map((file) => {
      const ext = path.extname(file.filename);
      const fileId = path.basename(file.filename, ext);
      const rec: FileRecord = {
        id: fileId,
        originalName: file.originalname,
        fileType,
        mimeType: file.mimetype || getMimeType(file.originalname),
        size: file.size,
        storedFilename: file.filename,
        url: `/api/files/${fileId}`,
        downloadUrl: `/api/files/${fileId}/download`,
        uploadedAt: new Date().toISOString(),
        description,
      };
      db.files![fileId] = rec;
      return rec;
    });

    saveDatabase(db);
    res.status(201).json(records);
  });

  // Find file on disk by ID or filename
  function findFileRecord(fileId: string): { record?: FileRecord; filepath?: string } {
    // 1. Check in db.files registry
    if (db.files && db.files[fileId]) {
      const rec = db.files[fileId];
      const fp = path.join(UPLOAD_DIR, rec.storedFilename);
      if (fs.existsSync(fp)) return { record: rec, filepath: fp };
    }

    // 2. Check all files in equipment and spare parts
    for (const eq of db.equipment) {
      const match = eq.files.find((f) => f.id === fileId);
      if (match) {
        const fp = path.join(UPLOAD_DIR, match.storedFilename);
        if (fs.existsSync(fp)) return { record: match, filepath: fp };
      }
    }
    for (const pt of db.spareParts) {
      const match = pt.files.find((f) => f.id === fileId);
      if (match) {
        const fp = path.join(UPLOAD_DIR, match.storedFilename);
        if (fs.existsSync(fp)) return { record: match, filepath: fp };
      }
    }

    // 3. Direct match in upload dir by exact filename
    const directPath = path.join(UPLOAD_DIR, fileId);
    if (fs.existsSync(directPath) && fs.statSync(directPath).isFile()) {
      return { filepath: directPath };
    }

    // 4. Scan upload dir for file matching fileId as basename, prefix, or normalized legacy hash
    try {
      const allFilesInUpload = fs.readdirSync(UPLOAD_DIR);
      const cleanId = fileId.replace(/^f_/, '').replace(/_/g, '-');
      const matchFile = allFilesInUpload.find((f) => {
        if (f === fileId) return true;
        const b = path.basename(f, path.extname(f));
        if (b === fileId) return true;
        if (f.startsWith(fileId)) return true;
        const bClean = b.replace(/_/g, '-');
        if (bClean === cleanId) return true;
        if (bClean.startsWith(cleanId) || cleanId.startsWith(bClean)) return true;
        return false;
      });

      if (matchFile) {
        const fp = path.join(UPLOAD_DIR, matchFile);
        const mime = getMimeType(matchFile);
        const guessedType: FileType = mime.startsWith('image/')
          ? 'site_photo'
          : mime === 'application/pdf'
          ? 'circuit_diagram'
          : 'other';

        return {
          record: {
            id: fileId,
            originalName: matchFile,
            fileType: guessedType,
            mimeType: mime,
            size: fs.statSync(fp).size,
            storedFilename: matchFile,
            url: `/api/files/${fileId}`,
            downloadUrl: `/api/files/${fileId}/download`,
            uploadedAt: new Date().toISOString(),
          },
          filepath: fp,
        };
      }
    } catch (e) {
      console.error('Error reading upload dir in findFileRecord:', e);
    }

    return {};
  }

  // 7. Inline File View (PDF / Image)
  app.get('/api/files/:id', (req: Request, res: Response) => {
    const fileId = req.params.id;
    const { record, filepath } = findFileRecord(fileId);

    if (!filepath || !fs.existsSync(filepath)) {
      return res.status(404).json({ error: '找不到該檔案' });
    }

    let mime = record?.mimeType;
    if (!mime || mime === 'application/octet-stream') {
      mime = getMimeType(record?.originalName || filepath);
    }
    const filename = record?.originalName || path.basename(filepath);

    res.setHeader('Content-Type', mime);
    res.setHeader('Content-Disposition', `inline; filename*=UTF-8''${encodeURIComponent(filename)}`);
    fs.createReadStream(filepath).pipe(res);
  });

  // 8. File Download
  app.get('/api/files/:id/download', (req: Request, res: Response) => {
    const fileId = req.params.id;
    const { record, filepath } = findFileRecord(fileId);

    if (!filepath || !fs.existsSync(filepath)) {
      return res.status(404).json({ error: '找不到要下載的檔案' });
    }

    const filename = record?.originalName || path.basename(filepath);
    res.download(filepath, filename);
  });

  // 9. Delete File
  app.delete('/api/files/:id', (req: Request, res: Response) => {
    const fileId = req.params.id;
    let deletedFilename: string | null = null;

    // Remove from equipment
    db.equipment.forEach((eq) => {
      const match = eq.files.find((f) => f.id === fileId);
      if (match) {
        deletedFilename = match.storedFilename;
        eq.files = eq.files.filter((f) => f.id !== fileId);
      }
    });

    // Remove from spare parts
    db.spareParts.forEach((pt) => {
      const match = pt.files.find((f) => f.id === fileId);
      if (match) {
        deletedFilename = match.storedFilename;
        pt.files = pt.files.filter((f) => f.id !== fileId);
      }
    });

    // Remove from files registry
    if (db.files && db.files[fileId]) {
      if (!deletedFilename) {
        deletedFilename = db.files[fileId].storedFilename;
      }
      delete db.files[fileId];
    }

    if (deletedFilename) {
      const fp = path.join(UPLOAD_DIR, deletedFilename);
      if (fs.existsSync(fp)) {
        try {
          fs.unlinkSync(fp);
        } catch (e) {
          console.warn('Could not remove file from disk:', e);
        }
      }
    }

    saveDatabase(db);
    res.json({ success: true, message: '檔案已刪除' });
  });

  // 10. Global Search API
  app.get('/api/search', (req: Request, res: Response) => {
    const q = ((req.query.q as string) || '').trim().toLowerCase();
    if (!q) {
      return res.json({ equipment: [], spareParts: [] });
    }

    const matchedEquipment = db.equipment.filter(
      (e) =>
        e.tagNumber.toLowerCase().includes(q) ||
        e.name.toLowerCase().includes(q) ||
        e.category.toLowerCase().includes(q) ||
        e.installationLocation.toLowerCase().includes(q) ||
        (e.notes && e.notes.toLowerCase().includes(q))
    );

    const matchedParts = db.spareParts.filter(
      (p) =>
        p.partNumber.toLowerCase().includes(q) ||
        p.name.toLowerCase().includes(q) ||
        p.brand.toLowerCase().includes(q) ||
        p.model.toLowerCase().includes(q) ||
        p.storageLocation.toLowerCase().includes(q) ||
        (p.storageLocations && p.storageLocations.some((loc) => loc.toLowerCase().includes(q))) ||
        (p.notes && p.notes.toLowerCase().includes(q))
    );

    res.json({
      equipment: matchedEquipment,
      spareParts: matchedParts,
      totalCount: matchedEquipment.length + matchedParts.length,
    });
  });

  // 11. Configuration API
  app.get('/api/config', (_req: Request, res: Response) => {
    res.json(db.config);
  });

  app.put('/api/config', (req: Request, res: Response) => {
    const { equipmentCategories, partNames } = req.body;
    if (Array.isArray(equipmentCategories)) {
      db.config.equipmentCategories = equipmentCategories;
    }
    if (Array.isArray(partNames)) {
      db.config.partNames = partNames;
    }
    saveDatabase(db);
    res.json(db.config);
  });

  // 12. Backup Export / Import with Embedded Photo Binaries
  app.get('/api/backup/export', (_req: Request, res: Response) => {
    const dateStr = new Date().toISOString().split('T')[0];
    const filename = `backup_electrical_mgmt_${dateStr}.json`;
    const utf8Filename = encodeURIComponent(`電控設備與備品資料庫備份_${dateStr}.json`);

    // Collect all file binaries as base64
    const filesBase64: Record<string, string> = {};
    if (db.files) {
      for (const [fileId, rec] of Object.entries(db.files)) {
        if (rec && rec.storedFilename) {
          const fp = path.join(UPLOAD_DIR, rec.storedFilename);
          if (fs.existsSync(fp)) {
            try {
              const fileBuffer = fs.readFileSync(fp);
              filesBase64[rec.storedFilename] = fileBuffer.toString('base64');
            } catch (err) {
              console.error(`Error reading file for export ${rec.storedFilename}:`, err);
            }
          }
        }
      }
    }

    // Also scan upload dir for any files not explicitly in db.files
    try {
      if (fs.existsSync(UPLOAD_DIR)) {
        const diskFiles = fs.readdirSync(UPLOAD_DIR);
        for (const dFile of diskFiles) {
          if (!filesBase64[dFile]) {
            const fp = path.join(UPLOAD_DIR, dFile);
            if (fs.statSync(fp).isFile()) {
              const fileBuffer = fs.readFileSync(fp);
              filesBase64[dFile] = fileBuffer.toString('base64');
            }
          }
        }
      }
    } catch (e) {
      console.error('Error scanning upload dir for backup export:', e);
    }

    const exportPayload = {
      ...db,
      filesBase64,
      exportedAt: new Date().toISOString(),
    };

    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${filename}"; filename*=UTF-8''${utf8Filename}`
    );
    res.send(JSON.stringify(exportPayload, null, 2));
  });

  app.post('/api/backup/import', (req: Request, res: Response) => {
    const importedData = req.body;
    if (!importedData || !Array.isArray(importedData.equipment) || !Array.isArray(importedData.spareParts)) {
      return res.status(400).json({ error: '匯入檔案格式不正確，缺少 equipment 或 spareParts 陣列' });
    }

    // Restore filesBase64 to UPLOAD_DIR if present
    let restoredFileCount = 0;
    if (importedData.filesBase64 && typeof importedData.filesBase64 === 'object') {
      for (const [storedFilename, b64Data] of Object.entries(importedData.filesBase64)) {
        if (typeof b64Data === 'string' && storedFilename) {
          try {
            const buffer = Buffer.from(b64Data, 'base64');
            const targetPath = path.join(UPLOAD_DIR, storedFilename);
            fs.writeFileSync(targetPath, buffer);
            restoredFileCount++;
          } catch (fileErr) {
            console.error(`Error restoring file ${storedFilename}:`, fileErr);
          }
        }
      }
    }

    db = {
      equipment: importedData.equipment,
      spareParts: importedData.spareParts,
      config: importedData.config || db.config,
      files: importedData.files || db.files || {},
      maintenanceRecords: importedData.maintenanceRecords || db.maintenanceRecords || [],
    };

    // Rescan UPLOAD_DIR to make sure any restored or existing files are correctly registered in db.files
    try {
      if (fs.existsSync(UPLOAD_DIR)) {
        const diskFiles = fs.readdirSync(UPLOAD_DIR);
        if (!db.files) db.files = {};
        for (const dFile of diskFiles) {
          const fullPath = path.join(UPLOAD_DIR, dFile);
          if (fs.statSync(fullPath).isFile()) {
            const ext = path.extname(dFile);
            const fileId = path.basename(dFile, ext);
            const existingEntry = Object.values(db.files).find(
              (f) => f.storedFilename === dFile || f.id === fileId
            );
            if (!existingEntry) {
              const mime = getMimeType(dFile);
              const guessedType: FileType = mime.startsWith('image/')
                ? 'site_photo'
                : mime === 'application/pdf'
                ? 'circuit_diagram'
                : 'other';
              const record: FileRecord = {
                id: fileId,
                originalName: dFile,
                fileType: guessedType,
                mimeType: mime,
                size: fs.statSync(fullPath).size,
                storedFilename: dFile,
                url: `/api/files/${fileId}`,
                downloadUrl: `/api/files/${fileId}/download`,
                uploadedAt: new Date().toISOString(),
                description: '備份還原恢復之檔案',
              };
              db.files[fileId] = record;
            }
          }
        }
      }
    } catch (scanErr) {
      console.error('Error scanning uploads during import:', scanErr);
    }

    saveDatabase(db);
    res.json({
      success: true,
      message: `資料庫與照片匯入成功！包含 ${db.equipment.length} 台設備、${db.spareParts.length} 項備品、${restoredFileCount} 張/筆還原照片與檔案。`,
    });
  });

  // Mount Vite middleware in dev or static files in production
  if (process.env.NODE_ENV === 'production') {
    app.use(express.static(path.join(__dirname, 'dist')));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.join(__dirname, 'dist', 'index.html'));
    });
  } else {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`電控設備與備品管理系統 V1.0 服務器已啟動於 http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Server startup error:', err);
  process.exit(1);
});
