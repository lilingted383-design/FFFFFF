import React, { useState } from 'react';
import {
  Download,
  Upload,
  Database,
  Server,
  Settings,
  Plus,
  Trash2,
  CheckCircle,
  AlertCircle,
  HardDrive,
  FileText,
  Info,
} from 'lucide-react';
import { SystemConfig } from '../types.ts';
import { importBackupDatabase } from '../services/api.ts';

interface BackupSettingsViewProps {
  config: SystemConfig;
  onUpdateConfig: (config: SystemConfig) => Promise<void>;
  onRefreshDatabase: () => Promise<void>;
}

export const BackupSettingsView: React.FC<BackupSettingsViewProps> = ({
  config,
  onUpdateConfig,
  onRefreshDatabase,
}) => {
  const [newCategory, setNewCategory] = useState('');
  const [newPartName, setNewPartName] = useState('');
  const [importing, setImporting] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(
    null
  );

  const handleAddCategory = async () => {
    if (!newCategory.trim()) return;
    const cat = newCategory.trim();
    if (config.equipmentCategories.includes(cat)) return;
    const updated = {
      ...config,
      equipmentCategories: [...config.equipmentCategories, cat],
    };
    await onUpdateConfig(updated);
    setNewCategory('');
  };

  const handleRemoveCategory = async (cat: string) => {
    if (config.equipmentCategories.length <= 1) return;
    const updated = {
      ...config,
      equipmentCategories: config.equipmentCategories.filter((c) => c !== cat),
    };
    await onUpdateConfig(updated);
  };

  const handleAddPartName = async () => {
    if (!newPartName.trim()) return;
    const name = newPartName.trim();
    if (config.partNames.includes(name)) return;
    const updated = {
      ...config,
      partNames: [...config.partNames, name],
    };
    await onUpdateConfig(updated);
    setNewPartName('');
  };

  const handleRemovePartName = async (name: string) => {
    if (config.partNames.length <= 1) return;
    const updated = {
      ...config,
      partNames: config.partNames.filter((n) => n !== name),
    };
    await onUpdateConfig(updated);
  };

  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || !e.target.files[0]) return;
    const file = e.target.files[0];

    if (!confirm(`確定要匯入備份檔「${file.name}」嗎？這將覆蓋現有系統資料！`)) {
      e.target.value = '';
      return;
    }

    setImporting(true);
    setStatusMessage(null);
    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      const res = await importBackupDatabase(parsed);
      setStatusMessage({ type: 'success', text: res.message });
      await onRefreshDatabase();
    } catch (err: unknown) {
      setStatusMessage({
        type: 'error',
        text: err instanceof Error ? err.message : '備份檔案匯入失敗，請確認 JSON 格式正確',
      });
    } finally {
      setImporting(false);
      e.target.value = '';
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Title */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
        <h1 className="text-xl sm:text-2xl font-bold text-slate-900 flex items-center space-x-2">
          <Database className="w-6 h-6 text-blue-600" />
          <span>資料儲存持久化與系統設定</span>
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 mt-1">
          管理系統資料備份、匯入還原，自訂設備分類與常用元件品名，檢視正式部署儲存說明。
        </p>
      </div>

      {statusMessage && (
        <div
          className={`p-4 rounded-xl flex items-center space-x-3 text-sm font-medium border ${
            statusMessage.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
              : 'bg-rose-50 text-rose-800 border-rose-200'
          }`}
        >
          {statusMessage.type === 'success' ? (
            <CheckCircle className="w-5 h-5 shrink-0" />
          ) : (
            <AlertCircle className="w-5 h-5 shrink-0" />
          )}
          <span>{statusMessage.text}</span>
        </div>
      )}

      {/* Backup and Restore Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Export Backup */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center space-x-2 text-slate-900 font-bold text-base mb-2">
              <Download className="w-5 h-5 text-blue-600" />
              <span>匯出全系統資料庫備份</span>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              下載完整的 JSON 備份檔，內含所有設備資料、設備階層架構、電控備品物料、庫存量、儲位資料與檔案關聯紀錄。
            </p>
          </div>

          <div className="mt-5 pt-4 border-t border-slate-100">
            <a
              href="/api/backup/export"
              className="inline-flex items-center justify-center space-x-2 w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-semibold transition-colors shadow-xs"
            >
              <Download className="w-4 h-4" />
              <span>下載資料庫備份 (.json)</span>
            </a>
          </div>
        </div>

        {/* Import Restore */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center space-x-2 text-slate-900 font-bold text-base mb-2">
              <Upload className="w-5 h-5 text-emerald-600" />
              <span>匯入備份還原資料庫</span>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              上傳先前匯出的 JSON 備份檔，即可一鍵還原所有設備與備品資料。
            </p>
          </div>

          <div className="mt-5 pt-4 border-t border-slate-100">
            <label className="flex items-center justify-center space-x-2 w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-semibold transition-colors cursor-pointer shadow-xs">
              <Upload className="w-4 h-4" />
              <span>{importing ? '還原中...' : '選擇 JSON 檔案並還原'}</span>
              <input
                type="file"
                accept=".json"
                onChange={handleImportFile}
                disabled={importing}
                className="sr-only"
              />
            </label>
          </div>
        </div>
      </div>

      {/* Storage Architecture Explanation */}
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs space-y-4">
        <h2 className="text-base font-bold text-slate-900 flex items-center space-x-2">
          <Server className="w-5 h-5 text-indigo-600" />
          <span>系統架構與檔案儲存設計規範（符合正式部署需求）</span>
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs text-slate-700">
          <div className="p-4 bg-slate-50 rounded-lg border border-slate-200 space-y-2">
            <span className="font-bold text-slate-900 text-sm flex items-center space-x-1">
              <HardDrive className="w-4 h-4 text-blue-600" />
              <span>獨立二進位實體檔案儲存</span>
            </span>
            <p className="text-slate-600 leading-relaxed">
              大型 PDF 線路圖、原廠手冊與高解析度現場照片<strong>絕不使用 Base64 塞入資料表</strong>。所有上傳檔案經由 Multer 儲存至專屬目錄，透過唯一的安全 File ID 提供原創線上預覽與安全下載。
            </p>
          </div>

          <div className="p-4 bg-slate-50 rounded-lg border border-slate-200 space-y-2">
            <span className="font-bold text-slate-900 text-sm flex items-center space-x-1">
              <Database className="w-4 h-4 text-emerald-600" />
              <span>原子性寫入與關聯完整性</span>
            </span>
            <p className="text-slate-600 leading-relaxed">
              每次新增、修改或刪除時，後端採用原子性（Atomic Rename）寫入，確保在重開機或重新載入時資料絕對不遺失或損壞；設備 TAG NUMBER 與備品料號變更時，自動聯動更新階層與關聯。
            </p>
          </div>

          <div className="p-4 bg-slate-50 rounded-lg border border-slate-200 space-y-2">
            <span className="font-bold text-slate-900 text-sm flex items-center space-x-1">
              <Info className="w-4 h-4 text-amber-600" />
              <span>正式雲端部署方案指引</span>
            </span>
            <p className="text-slate-600 leading-relaxed">
              正式部署至 Google Cloud Run 或本機工廠伺服器時，只需將 <code>./data/</code> 目錄掛載至 Persistent Volume，或於後端替換為 Cloud Storage (GCS) 及 Cloud SQL，即可長期保存數千台設備與上萬份手冊。
            </p>
          </div>
        </div>
      </div>

      {/* Dynamic Categories & Part Names Configuration */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Equipment Categories */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-4">
          <div>
            <h3 className="font-bold text-slate-900 text-sm flex items-center space-x-2">
              <Settings className="w-4 h-4 text-blue-600" />
              <span>設備分類自訂清單</span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              建立設備時的下拉選單選項，非寫死在程式碼中，可隨時自由增刪。
            </p>
          </div>

          {/* Add Category */}
          <div className="flex space-x-2">
            <input
              type="text"
              value={newCategory}
              onChange={(e) => setNewCategory(e.target.value)}
              placeholder="新增自訂分類名稱..."
              className="flex-1 px-3 py-1.5 border border-slate-300 rounded-lg text-xs"
            />
            <button
              type="button"
              onClick={handleAddCategory}
              className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold flex items-center space-x-1"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>新增</span>
            </button>
          </div>

          {/* Category Badges */}
          <div className="flex flex-wrap gap-1.5 max-h-48 overflow-y-auto pt-1">
            {config.equipmentCategories.map((cat) => (
              <span
                key={cat}
                className="inline-flex items-center space-x-1 px-2.5 py-1 bg-slate-100 text-slate-700 rounded-lg text-xs font-medium"
              >
                <span>{cat}</span>
                {config.equipmentCategories.length > 1 && (
                  <button
                    type="button"
                    onClick={() => handleRemoveCategory(cat)}
                    className="text-slate-400 hover:text-rose-600 ml-1"
                    title="移除此分類"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                )}
              </span>
            ))}
          </div>
        </div>

        {/* Part Names */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-4">
          <div>
            <h3 className="font-bold text-slate-900 text-sm flex items-center space-x-2">
              <Settings className="w-4 h-4 text-emerald-600" />
              <span>常用元件品名清單</span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              用於新增備品時的品名下拉選單與快速分類搜尋。
            </p>
          </div>

          {/* Add Part Name */}
          <div className="flex space-x-2">
            <input
              type="text"
              value={newPartName}
              onChange={(e) => setNewPartName(e.target.value)}
              placeholder="新增品名（例如：電磁閥、斷路器）..."
              className="flex-1 px-3 py-1.5 border border-slate-300 rounded-lg text-xs"
            />
            <button
              type="button"
              onClick={handleAddPartName}
              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold flex items-center space-x-1"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>新增</span>
            </button>
          </div>

          {/* Part Name Badges */}
          <div className="flex flex-wrap gap-1.5 max-h-48 overflow-y-auto pt-1">
            {config.partNames.map((name) => (
              <span
                key={name}
                className="inline-flex items-center space-x-1 px-2.5 py-1 bg-slate-100 text-slate-700 rounded-lg text-xs font-medium"
              >
                <span>{name}</span>
                {config.partNames.length > 1 && (
                  <button
                    type="button"
                    onClick={() => handleRemovePartName(name)}
                    className="text-slate-400 hover:text-rose-600 ml-1"
                    title="移除此品名"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                )}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
