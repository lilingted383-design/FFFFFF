import React, { useState, useEffect } from 'react';
import {
  Layers,
  ArrowLeft,
  Edit2,
  Trash2,
  Plus,
  FileText,
  Image,
  Cpu,
  MapPin,
  Calendar,
  ExternalLink,
  Download,
  Link as LinkIcon,
  Eye,
  AlertCircle,
  FileCode,
  FolderTree,
  Clipboard,
  ClipboardList,
  PenTool,
  CheckCircle2,
  User,
  Clock,
  Printer,
  Search,
  Copy,
  Check,
  Save,
  RotateCcw,
  Sparkles,
} from 'lucide-react';
import { Equipment, FileRecord, MaintenanceRecord, SparePart } from '../types.ts';
import {
  fetchMaintenanceRecords,
  createMaintenanceRecord,
  deleteMaintenanceRecord,
} from '../services/api.ts';
import { FileViewerModal } from './FileViewerModal.tsx';
import { FileUploadModal } from './FileUploadModal.tsx';
import { AssociateModal } from './AssociateModal.tsx';
import { PasteAndBatchUploadZone } from './PasteAndBatchUploadZone.tsx';

interface EquipmentDetailViewProps {
  equipment: Equipment;
  allEquipment: Equipment[];
  allParts: SparePart[];
  onBack: () => void;
  onEdit: (eq: Equipment) => void;
  onDelete: (tagNumber: string) => void;
  onSelectPart: (partNumber: string) => void;
  onSelectEquipment: (tagNumber: string) => void;
  onUpdateEquipment: (eq: Equipment) => void;
  onToggleAssociation: (tagNumber: string, partNumber: string, action: 'add' | 'remove') => Promise<void>;
  onDeleteFile: (fileId: string) => Promise<void>;
}

export type EquipmentDetailTab =
  | 'info'
  | 'write_maintenance'
  | 'maintenance_list'
  | 'circuits'
  | 'photos'
  | 'parts'
  | 'documents';

export const EquipmentDetailView: React.FC<EquipmentDetailViewProps> = ({
  equipment,
  allEquipment,
  allParts,
  onBack,
  onEdit,
  onDelete,
  onSelectPart,
  onSelectEquipment,
  onUpdateEquipment,
  onToggleAssociation,
  onDeleteFile,
}) => {
  const [activeTab, setActiveTab] = useState<EquipmentDetailTab>('info');
  const [previewFile, setPreviewFile] = useState<FileRecord | null>(null);
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [uploadDefaultType, setUploadDefaultType] = useState<'circuit_diagram' | 'site_photo' | 'other'>('circuit_diagram');
  const [associateModalOpen, setAssociateModalOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);

  // Maintenance records state
  const [maintenanceRecords, setMaintenanceRecords] = useState<MaintenanceRecord[]>(
    equipment.maintenanceRecords || []
  );
  const [loadingRecords, setLoadingRecords] = useState(false);

  // Form state for writing records
  const [maintDate, setMaintDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [maintPersonnel, setMaintPersonnel] = useState('');
  const [maintContent, setMaintContent] = useState('');
  const [maintFiles, setMaintFiles] = useState<FileRecord[]>([]);
  const [submittingMaint, setSubmittingMaint] = useState(false);
  const [maintSuccessMsg, setMaintSuccessMsg] = useState<string | null>(null);
  const [maintErrorMsg, setMaintErrorMsg] = useState<string | null>(null);

  // Maintenance list filtering and actions
  const [recordSearch, setRecordSearch] = useState('');
  const [copiedRecordId, setCopiedRecordId] = useState<string | null>(null);
  const [recordToDelete, setRecordToDelete] = useState<MaintenanceRecord | null>(null);

  // Sync / reload maintenance records whenever equipment tag changes
  useEffect(() => {
    let isMounted = true;
    const loadRecords = async () => {
      try {
        setLoadingRecords(true);
        const data = await fetchMaintenanceRecords(equipment.tagNumber);
        if (isMounted) {
          setMaintenanceRecords(data);
        }
      } catch (err) {
        console.error('Failed to load maintenance records:', err);
      } finally {
        if (isMounted) {
          setLoadingRecords(false);
        }
      }
    };
    loadRecords();
    return () => {
      isMounted = false;
    };
  }, [equipment.tagNumber]);

  // Sub-equipment
  const subEquipments = allEquipment.filter((e) => e.parentTagNumber === equipment.tagNumber);

  // Parent equipment
  const parentEquipment = equipment.parentTagNumber
    ? allEquipment.find((e) => e.tagNumber === equipment.parentTagNumber)
    : null;

  // Associated parts list
  const associatedParts = allParts.filter((p) => equipment.componentPartNumbers.includes(p.partNumber));

  // Partition files
  const circuitFiles = equipment.files.filter((f) => f.fileType === 'circuit_diagram');
  const photoFiles = equipment.files.filter((f) => f.fileType === 'site_photo');
  const otherFiles = equipment.files.filter(
    (f) => f.fileType !== 'circuit_diagram' && f.fileType !== 'site_photo'
  );

  const handleOpenUpload = (type: 'circuit_diagram' | 'site_photo' | 'other') => {
    setUploadDefaultType(type);
    setUploadModalOpen(true);
  };

  const handleFileUploaded = (record: FileRecord | FileRecord[]) => {
    const newRecords = Array.isArray(record) ? record : [record];
    const updated = {
      ...equipment,
      files: [...equipment.files, ...newRecords],
      updatedAt: new Date().toISOString(),
    };
    onUpdateEquipment(updated);
  };

  const handleDeleteFileClick = async (fileId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm('確定要刪除這筆檔案嗎？此操作不可復原。')) {
      await onDeleteFile(fileId);
      const updated = {
        ...equipment,
        files: equipment.files.filter((f) => f.id !== fileId),
        updatedAt: new Date().toISOString(),
      };
      onUpdateEquipment(updated);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
        <div className="flex items-center space-x-3">
          <button
            type="button"
            onClick={onBack}
            className="p-2 hover:bg-slate-100 rounded-lg text-slate-600 transition-colors"
            title="返回設備列表"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <div className="flex items-center space-x-2">
              <span className="font-mono text-xs sm:text-sm font-bold bg-blue-100 text-blue-800 px-2.5 py-0.5 rounded-md border border-blue-200">
                {equipment.tagNumber}
              </span>
              <span className="text-xs px-2 py-0.5 bg-slate-100 text-slate-700 rounded-full font-medium">
                {equipment.category}
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 mt-0.5">{equipment.name}</h1>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <button
            type="button"
            onClick={() => onEdit(equipment)}
            className="flex items-center space-x-1 px-3 py-1.5 text-xs sm:text-sm bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-medium transition-colors"
          >
            <Edit2 className="w-4 h-4" />
            <span>編輯資料</span>
          </button>
          <button
            type="button"
            onClick={() => setDeleteConfirmOpen(true)}
            className="flex items-center space-x-1 px-3 py-1.5 text-xs sm:text-sm bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-lg font-medium border border-rose-200 transition-colors"
          >
            <Trash2 className="w-4 h-4" />
            <span>刪除設備</span>
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex overflow-x-auto space-x-1 border-b border-slate-200 bg-white p-1 rounded-xl shadow-xs">
        <button
          type="button"
          onClick={() => setActiveTab('info')}
          className={`px-3 sm:px-4 py-2 text-xs sm:text-sm font-semibold rounded-lg transition-colors flex items-center space-x-1.5 shrink-0 ${
            activeTab === 'info'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>基本資料與階層</span>
        </button>

        {/* Tab: 填寫維修紀錄 */}
        <button
          type="button"
          onClick={() => {
            setActiveTab('write_maintenance');
            setMaintSuccessMsg(null);
            setMaintErrorMsg(null);
          }}
          className={`px-3 sm:px-4 py-2 text-xs sm:text-sm font-semibold rounded-lg transition-colors flex items-center space-x-1.5 shrink-0 ${
            activeTab === 'write_maintenance'
              ? 'bg-amber-600 text-white shadow-xs'
              : 'text-amber-800 bg-amber-50 hover:bg-amber-100/80 font-bold border border-amber-200/80'
          }`}
        >
          <PenTool className="w-4 h-4 text-amber-600" />
          <span>填寫維修紀錄</span>
          <span className="text-[10px] bg-amber-500 text-white px-1.5 py-0.2 rounded-full font-bold">
            新增
          </span>
        </button>

        {/* Tab: 維修紀錄列表 */}
        <button
          type="button"
          onClick={() => setActiveTab('maintenance_list')}
          className={`px-3 sm:px-4 py-2 text-xs sm:text-sm font-semibold rounded-lg transition-colors flex items-center space-x-1.5 shrink-0 ${
            activeTab === 'maintenance_list'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <ClipboardList className="w-4 h-4" />
          <span>維修紀錄列表 ({maintenanceRecords.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('circuits')}
          className={`px-3 sm:px-4 py-2 text-xs sm:text-sm font-semibold rounded-lg transition-colors flex items-center space-x-1.5 shrink-0 ${
            activeTab === 'circuits'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <FileCode className="w-4 h-4" />
          <span>線路圖 ({circuitFiles.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('photos')}
          className={`px-3 sm:px-4 py-2 text-xs sm:text-sm font-semibold rounded-lg transition-colors flex items-center space-x-1.5 shrink-0 ${
            activeTab === 'photos'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <Image className="w-4 h-4" />
          <span>現場照片 ({photoFiles.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('parts')}
          className={`px-3 sm:px-4 py-2 text-xs sm:text-sm font-semibold rounded-lg transition-colors flex items-center space-x-1.5 shrink-0 ${
            activeTab === 'parts'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <Cpu className="w-4 h-4" />
          <span>關聯電控元件 ({associatedParts.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('documents')}
          className={`px-3 sm:px-4 py-2 text-xs sm:text-sm font-semibold rounded-lg transition-colors flex items-center space-x-1.5 shrink-0 ${
            activeTab === 'documents'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <FileText className="w-4 h-4" />
          <span>其他文件 ({otherFiles.length})</span>
        </button>
      </div>

      {/* Tab Content 1: Basic Info & Hierarchy */}
      {activeTab === 'info' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Main Info Card */}
          <div className="md:col-span-2 space-y-6">
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-4">
              <h2 className="text-base font-bold text-slate-900 flex items-center space-x-2">
                <Layers className="w-5 h-5 text-blue-600" />
                <span>設備規格與安裝資訊</span>
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-3 bg-slate-50 rounded-lg">
                  <span className="text-xs text-slate-500 block mb-1">唯一識別 TAG NUMBER</span>
                  <span className="font-mono text-base font-bold text-slate-900">{equipment.tagNumber}</span>
                </div>

                <div className="p-3 bg-slate-50 rounded-lg">
                  <span className="text-xs text-slate-500 block mb-1">設備分類</span>
                  <span className="text-sm font-semibold text-slate-900">{equipment.category}</span>
                </div>

                <div className="p-3 bg-slate-50 rounded-lg sm:col-span-2">
                  <span className="text-xs text-slate-500 block mb-1 flex items-center space-x-1">
                    <MapPin className="w-3.5 h-3.5 text-slate-400" />
                    <span>安裝位置 (所在區域 / 產線)</span>
                  </span>
                  <span className="text-sm font-semibold text-slate-900">
                    {equipment.installationLocation || '尚未設定安裝位置'}
                  </span>
                </div>
              </div>

              <div>
                <span className="text-xs font-semibold text-slate-700 block mb-1">維護說明與備註</span>
                <div className="p-3 bg-slate-50 rounded-lg border border-slate-100 text-sm text-slate-800 whitespace-pre-wrap leading-relaxed min-h-[70px]">
                  {equipment.notes || '無特殊備註說明。'}
                </div>
              </div>

              <div className="text-xs text-slate-400 pt-2 flex items-center justify-between border-t border-slate-100">
                <span>建立時間：{new Date(equipment.createdAt).toLocaleDateString('zh-TW')}</span>
                <span>最後更新：{new Date(equipment.updatedAt).toLocaleString('zh-TW')}</span>
              </div>
            </div>

            {/* Quick Component Summary */}
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-bold text-slate-900 flex items-center space-x-2">
                  <Cpu className="w-4 h-4 text-blue-600" />
                  <span>使用之電控備品 ({associatedParts.length})</span>
                </h3>
                <button
                  type="button"
                  onClick={() => setAssociateModalOpen(true)}
                  className="text-xs font-semibold text-blue-600 hover:text-blue-800"
                >
                  管理關聯備品 &rarr;
                </button>
              </div>

              {associatedParts.length === 0 ? (
                <p className="text-xs text-slate-400 py-3">尚未關聯任何電控備品物料。</p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {associatedParts.map((p) => (
                    <div
                      key={p.partNumber}
                      onClick={() => onSelectPart(p.partNumber)}
                      className="p-2.5 rounded-lg border border-slate-200 hover:border-blue-400 hover:bg-blue-50/50 cursor-pointer transition-colors flex items-center justify-between"
                    >
                      <div>
                        <div className="flex items-center space-x-2">
                          <span className="font-mono text-xs font-bold text-blue-700">{p.partNumber}</span>
                          <span className="text-xs font-semibold text-slate-800">{p.name}</span>
                        </div>
                        <div className="text-[11px] text-slate-500 mt-0.5">
                          儲位：<strong>{p.storageLocation || '未指定'}</strong>
                        </div>
                      </div>
                      <span
                        className={`text-xs px-2 py-0.5 rounded font-bold font-mono ${
                          p.stockQty > 0 ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'
                        }`}
                      >
                        庫存: {p.stockQty}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Right Hierarchy Card */}
          <div className="space-y-6">
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-4">
              <h3 className="text-sm font-bold text-slate-900 flex items-center space-x-2">
                <FolderTree className="w-4 h-4 text-blue-600" />
                <span>設備階層關係</span>
              </h3>

              {/* Parent */}
              <div>
                <span className="text-xs text-slate-500 block mb-1">上層設備 (Parent)</span>
                {parentEquipment ? (
                  <div
                    onClick={() => onSelectEquipment(parentEquipment.tagNumber)}
                    className="p-3 bg-blue-50/60 border border-blue-200 rounded-lg cursor-pointer hover:bg-blue-100/60 transition-colors flex items-center justify-between"
                  >
                    <div>
                      <div className="font-mono text-xs font-bold text-blue-800">
                        {parentEquipment.tagNumber}
                      </div>
                      <div className="text-sm font-semibold text-slate-800">{parentEquipment.name}</div>
                    </div>
                    <span className="text-xs text-blue-600">檢視 &rarr;</span>
                  </div>
                ) : (
                  <div className="p-3 bg-slate-50 rounded-lg text-xs text-slate-500 border border-slate-100">
                    此設備為頂層設備（無上層）
                  </div>
                )}
              </div>

              {/* Sub-equipment */}
              <div>
                <span className="text-xs text-slate-500 block mb-1">下層子設備 (Sub-equipment)</span>
                {subEquipments.length === 0 ? (
                  <div className="p-3 bg-slate-50 rounded-lg text-xs text-slate-500 border border-slate-100">
                    尚無下層子設備
                  </div>
                ) : (
                  <div className="space-y-1.5 max-h-60 overflow-y-auto">
                    {subEquipments.map((sub) => (
                      <div
                        key={sub.tagNumber}
                        onClick={() => onSelectEquipment(sub.tagNumber)}
                        className="p-2.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg cursor-pointer transition-colors flex items-center justify-between"
                      >
                        <div>
                          <div className="flex items-center space-x-1.5">
                            <span className="font-mono text-xs font-bold text-slate-700">
                              {sub.tagNumber}
                            </span>
                            <span className="text-[11px] px-1.5 py-0.2 bg-slate-200 text-slate-700 rounded">
                              {sub.category}
                            </span>
                          </div>
                          <div className="text-xs font-medium text-slate-900 mt-0.5">{sub.name}</div>
                        </div>
                        <span className="text-xs text-slate-400">&rarr;</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Quick Files Glance */}
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-3">
              <h3 className="text-sm font-bold text-slate-900 flex items-center space-x-2">
                <FileText className="w-4 h-4 text-blue-600" />
                <span>文件圖檔概覽</span>
              </h3>
              <div className="space-y-2 text-xs text-slate-600">
                <div
                  onClick={() => setActiveTab('circuits')}
                  className="flex items-center justify-between p-2 rounded hover:bg-slate-50 cursor-pointer"
                >
                  <span className="flex items-center space-x-1.5">
                    <FileCode className="w-4 h-4 text-blue-600" />
                    <span>線路圖檔 (PDF/圖)</span>
                  </span>
                  <span className="font-bold text-slate-800">{circuitFiles.length} 份</span>
                </div>
                <div
                  onClick={() => setActiveTab('photos')}
                  className="flex items-center justify-between p-2 rounded hover:bg-slate-50 cursor-pointer"
                >
                  <span className="flex items-center space-x-1.5">
                    <Image className="w-4 h-4 text-emerald-600" />
                    <span>現場安裝照片</span>
                  </span>
                  <span className="font-bold text-slate-800">{photoFiles.length} 張</span>
                </div>
                <div
                  onClick={() => setActiveTab('documents')}
                  className="flex items-center justify-between p-2 rounded hover:bg-slate-50 cursor-pointer"
                >
                  <span className="flex items-center space-x-1.5">
                    <FileText className="w-4 h-4 text-amber-600" />
                    <span>技術說明與手冊</span>
                  </span>
                  <span className="font-bold text-slate-800">{otherFiles.length} 份</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab Content 2: Circuit Diagrams */}
      {activeTab === 'circuits' && (
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-200">
            <div>
              <h2 className="text-lg font-bold text-slate-900 flex items-center space-x-2">
                <FileCode className="w-5 h-5 text-blue-600" />
                <span>電氣線路圖 (PDF / 圖片 / 截圖貼上)</span>
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                支援直接按 Ctrl+V 貼上截圖、多選批次拖曳上傳與 PDF 線上閱讀。
              </p>
            </div>
            <button
              type="button"
              onClick={() => handleOpenUpload('circuit_diagram')}
              className="flex items-center space-x-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs sm:text-sm font-semibold transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>批次上傳或開啟上傳視窗</span>
            </button>
          </div>

          {/* Quick Paste & Batch Upload Dropzone */}
          <PasteAndBatchUploadZone
            fileType="circuit_diagram"
            title="線路圖剪貼簿直接貼上或批次上傳"
            subtitle="在畫面任何地方按 Ctrl+V 即可直接貼上線路圖截圖，或將多個 PDF / 圖檔一次拖曳進來批次儲存"
            accept=".pdf,image/*"
            onFilesUploaded={handleFileUploaded}
          />

          {circuitFiles.length === 0 ? (
            <div className="text-center py-8 border-2 border-dashed border-slate-200 rounded-xl bg-slate-50">
              <FileCode className="w-10 h-10 text-slate-400 mx-auto mb-2" />
              <p className="text-sm font-medium text-slate-600">目前尚無線路圖檔</p>
              <p className="text-xs text-slate-400 mt-1">
                直接按鍵盤 Ctrl+V 貼上螢幕截圖，或使用上方拖曳區一次上傳多個線路圖
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {circuitFiles.map((file) => (
                <div
                  key={file.id}
                  className="p-4 border border-slate-200 rounded-xl hover:border-blue-400 hover:shadow-sm transition-all bg-white flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center space-x-2">
                        <span className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                          <FileCode className="w-5 h-5" />
                        </span>
                        <div>
                          <h4 className="font-semibold text-sm text-slate-900 truncate max-w-xs" title={file.originalName}>
                            {file.originalName}
                          </h4>
                          <span className="text-xs text-slate-400">
                            {(file.size / 1024).toFixed(1)} KB • {new Date(file.uploadedAt).toLocaleDateString('zh-TW')}
                          </span>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={(e) => handleDeleteFileClick(file.id, e)}
                        title="刪除此圖檔"
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    {file.description && (
                      <p className="text-xs text-slate-600 mt-2 bg-slate-50 p-2 rounded border border-slate-100">
                        {file.description}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center space-x-2 mt-4 pt-3 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => setPreviewFile(file)}
                      className="flex-1 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-semibold rounded-lg transition-colors flex items-center justify-center space-x-1"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>直接檢視線路圖</span>
                    </button>
                    <a
                      href={file.downloadUrl}
                      download={file.originalName}
                      className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-colors"
                      title="下載線路圖"
                    >
                      <Download className="w-4 h-4" />
                    </a>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab Content 3: Site Photos */}
      {activeTab === 'photos' && (
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-200">
            <div>
              <h2 className="text-lg font-bold text-slate-900 flex items-center space-x-2">
                <Image className="w-5 h-5 text-emerald-600" />
                <span>設備現場實景照片 (支援直接貼上多張相片)</span>
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                直接按 Ctrl+V 貼上剪貼簿相片，或一次拖曳多張相片批次儲存，無需一張張上傳。
              </p>
            </div>
            <button
              type="button"
              onClick={() => handleOpenUpload('site_photo')}
              className="flex items-center space-x-1 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs sm:text-sm font-semibold transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>批次上傳或開啟視窗</span>
            </button>
          </div>

          {/* Quick Paste & Batch Upload Dropzone */}
          <PasteAndBatchUploadZone
            fileType="site_photo"
            title="現場照片剪貼簿直接貼上或批次上傳"
            subtitle="在畫面任何地方按 Ctrl+V 即可直接貼上相片截圖，或將多張現場實照一次拖曳進來批次儲存"
            accept="image/*"
            onFilesUploaded={handleFileUploaded}
          />

          {photoFiles.length === 0 ? (
            <div className="text-center py-8 border-2 border-dashed border-slate-200 rounded-xl bg-slate-50">
              <Image className="w-10 h-10 text-slate-400 mx-auto mb-2" />
              <p className="text-sm font-medium text-slate-600">目前尚無現場照片</p>
              <p className="text-xs text-slate-400 mt-1">
                請在畫面上按 Ctrl+V 貼上照片，或使用上方拖曳區一次上傳多張相片
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {photoFiles.map((file) => (
                <div
                  key={file.id}
                  onClick={() => setPreviewFile(file)}
                  className="group relative border border-slate-200 rounded-xl overflow-hidden bg-slate-900 cursor-pointer shadow-xs hover:shadow-md transition-all"
                >
                  <div className="aspect-video w-full overflow-hidden flex items-center justify-center bg-slate-950">
                    <img
                      src={file.url}
                      alt={file.originalName}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                    />
                  </div>

                  <div className="p-3 bg-white border-t border-slate-200">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-xs text-slate-900 truncate" title={file.originalName}>
                        {file.originalName}
                      </span>
                      <button
                        type="button"
                        onClick={(e) => handleDeleteFileClick(file.id, e)}
                        className="text-slate-400 hover:text-rose-600 p-1"
                        title="刪除照片"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    {file.description && (
                      <p className="text-[11px] text-slate-500 truncate mt-0.5">{file.description}</p>
                    )}
                  </div>

                  <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity bg-black/60 text-white p-1.5 rounded-lg">
                    <Eye className="w-4 h-4" />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab Content 4: Associated Components */}
      {activeTab === 'parts' && (
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-200">
            <div>
              <h2 className="text-lg font-bold text-slate-900 flex items-center space-x-2">
                <Cpu className="w-5 h-5 text-blue-600" />
                <span>關聯電控元件與備品清單</span>
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                此處列出該設備所使用的所有電控物料，點選物料可直接查看庫存、儲位及原廠手冊。
              </p>
            </div>
            <button
              type="button"
              onClick={() => setAssociateModalOpen(true)}
              className="flex items-center space-x-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs sm:text-sm font-semibold transition-colors"
            >
              <LinkIcon className="w-4 h-4" />
              <span>關聯 / 解除備品物料</span>
            </button>
          </div>

          {associatedParts.length === 0 ? (
            <div className="text-center py-12 border-2 border-dashed border-slate-200 rounded-xl bg-slate-50">
              <Cpu className="w-12 h-12 text-slate-400 mx-auto mb-2" />
              <p className="text-sm font-medium text-slate-600">此設備尚未關聯任何電控備品</p>
              <p className="text-xs text-slate-400 mt-1 mb-4">
                同一個備品料號可關聯至多台設備，點選下方按鈕開始關聯
              </p>
              <button
                type="button"
                onClick={() => setAssociateModalOpen(true)}
                className="px-4 py-2 bg-blue-600 text-white text-xs font-semibold rounded-lg hover:bg-blue-700"
              >
                立即建立備品關聯
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {associatedParts.map((part) => (
                <div
                  key={part.partNumber}
                  onClick={() => onSelectPart(part.partNumber)}
                  className="p-4 border border-slate-200 rounded-xl hover:border-blue-400 hover:shadow-sm cursor-pointer transition-all bg-white flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center space-x-2">
                          <span className="font-mono text-sm font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded">
                            {part.partNumber}
                          </span>
                          <span className="font-semibold text-sm text-slate-900">{part.name}</span>
                        </div>
                        <p className="text-xs text-slate-600 mt-1 font-medium">
                          {part.brand} {part.model}
                        </p>
                      </div>

                      <span
                        className={`text-xs px-2.5 py-1 rounded-lg font-bold font-mono ${
                          part.stockQty <= 0
                            ? 'bg-rose-100 text-rose-800 border border-rose-200'
                            : part.stockQty <= (part.minStockQty || 1)
                            ? 'bg-amber-100 text-amber-800 border border-amber-200'
                            : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                        }`}
                      >
                        庫存: {part.stockQty}
                      </span>
                    </div>

                    <div className="mt-3 p-2 bg-slate-50 rounded-lg flex items-center justify-between text-xs">
                      <span className="text-slate-500">儲存格位：</span>
                      <strong className="text-slate-800 font-mono text-xs">{part.storageLocation || '未設定'}</strong>
                    </div>

                    {part.files.length > 0 && (
                      <div className="flex items-center space-x-3 text-xs text-slate-500 mt-2">
                        <span>含 {part.files.filter((f) => f.fileType === 'manual').length} 份原廠手冊</span>
                        <span>•</span>
                        <span>{part.files.filter((f) => f.fileType === 'component_photo').length} 張實拍照</span>
                      </div>
                    )}
                  </div>

                  <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-blue-600 font-medium">
                    <span>點選檢視詳細備品規格與原廠手冊 &rarr;</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab Content 5: Other Documents */}
      {activeTab === 'documents' && (
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-200">
            <div>
              <h2 className="text-lg font-bold text-slate-900 flex items-center space-x-2">
                <FileText className="w-5 h-5 text-amber-600" />
                <span>其他技術文件與手冊</span>
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                設備專屬操作手冊、保養規程、測試報告與合約文件。
              </p>
            </div>
            <button
              type="button"
              onClick={() => handleOpenUpload('other')}
              className="flex items-center space-x-1 px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs sm:text-sm font-semibold transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>上傳新文件</span>
            </button>
          </div>

          {otherFiles.length === 0 ? (
            <div className="text-center py-12 border-2 border-dashed border-slate-200 rounded-xl bg-slate-50">
              <FileText className="w-12 h-12 text-slate-400 mx-auto mb-2" />
              <p className="text-sm font-medium text-slate-600">尚無其他技術文件</p>
              <button
                type="button"
                onClick={() => handleOpenUpload('other')}
                className="mt-3 px-4 py-2 bg-amber-600 text-white text-xs font-semibold rounded-lg hover:bg-amber-700"
              >
                上傳技術文件
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              {otherFiles.map((file) => (
                <div
                  key={file.id}
                  className="p-3 border border-slate-200 rounded-lg hover:bg-slate-50 flex items-center justify-between transition-colors"
                >
                  <div className="flex items-center space-x-3 truncate pr-2">
                    <span className="p-2 bg-amber-50 text-amber-600 rounded">
                      <FileText className="w-4 h-4" />
                    </span>
                    <div className="truncate">
                      <h4 className="font-semibold text-xs sm:text-sm text-slate-900 truncate">
                        {file.originalName}
                      </h4>
                      <p className="text-[11px] text-slate-400">
                        {file.description ? `${file.description} • ` : ''}
                        {(file.size / 1024).toFixed(1)} KB • {new Date(file.uploadedAt).toLocaleDateString('zh-TW')}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => setPreviewFile(file)}
                      className="px-2.5 py-1 text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 rounded font-medium"
                    >
                      檢視
                    </button>
                    <a
                      href={file.downloadUrl}
                      download={file.originalName}
                      className="p-1 hover:bg-slate-200 text-slate-600 rounded"
                      title="下載檔案"
                    >
                      <Download className="w-4 h-4" />
                    </a>
                    <button
                      type="button"
                      onClick={(e) => handleDeleteFileClick(file.id, e)}
                      className="p-1 text-slate-400 hover:text-rose-600 rounded"
                      title="刪除檔案"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab: 填寫維修紀錄 (Write Maintenance Record) */}
      {activeTab === 'write_maintenance' && (
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-200">
            <div>
              <h2 className="text-lg font-bold text-slate-900 flex items-center space-x-2">
                <PenTool className="w-5 h-5 text-amber-600" />
                <span>填寫設備維修紀錄</span>
                <span className="text-xs px-2.5 py-0.5 font-mono bg-blue-50 text-blue-800 rounded border border-blue-200">
                  {equipment.tagNumber}
                </span>
              </h2>
              <p className="text-xs sm:text-sm text-slate-500 mt-1">
                記錄日常點檢、定期維護、異常故障排除、更換備品零件或測試數據
              </p>
            </div>
            <button
              type="button"
              onClick={() => setActiveTab('maintenance_list')}
              className="text-xs font-semibold text-blue-600 hover:text-blue-800 flex items-center space-x-1 self-start sm:self-auto"
            >
              <span>查看履歷列表 ({maintenanceRecords.length}) &rarr;</span>
            </button>
          </div>

          {/* Success Notification Banner */}
          {maintSuccessMsg && (
            <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-emerald-900">
              <div className="flex items-center space-x-2.5">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                <div>
                  <h4 className="font-bold text-sm">儲存成功！</h4>
                  <p className="text-xs text-emerald-700">{maintSuccessMsg}</p>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={() => setActiveTab('maintenance_list')}
                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold shadow-2xs"
                >
                  前往維修紀錄列表
                </button>
                <button
                  type="button"
                  onClick={() => setMaintSuccessMsg(null)}
                  className="px-2.5 py-1.5 border border-emerald-300 hover:bg-emerald-100 text-emerald-800 rounded-lg text-xs font-medium"
                >
                  繼續填寫
                </button>
              </div>
            </div>
          )}

          {/* Error Message */}
          {maintErrorMsg && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-center space-x-2 text-red-700 text-sm">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{maintErrorMsg}</span>
            </div>
          )}

          {/* Maintenance Record Form */}
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              if (!maintDate.trim()) {
                setMaintErrorMsg('請選擇維修日期');
                return;
              }
              if (!maintPersonnel.trim()) {
                setMaintErrorMsg('請填寫維修人員姓名');
                return;
              }
              if (!maintContent.trim()) {
                setMaintErrorMsg('請填寫維修工作內容');
                return;
              }

              setSubmittingMaint(true);
              setMaintErrorMsg(null);
              setMaintSuccessMsg(null);

              try {
                const created = await createMaintenanceRecord(equipment.tagNumber, {
                  date: maintDate.trim(),
                  personnel: maintPersonnel.trim(),
                  content: maintContent.trim(),
                  files: maintFiles,
                });

                setMaintenanceRecords((prev) => [created, ...prev]);

                // Update equipment state
                onUpdateEquipment({
                  ...equipment,
                  maintenanceRecords: [created, ...(equipment.maintenanceRecords || [])],
                  updatedAt: new Date().toISOString(),
                });

                // Clear form
                setMaintContent('');
                setMaintFiles([]);
                setMaintSuccessMsg(`維修紀錄（${created.date} / ${created.personnel}）已成功儲存！`);
              } catch (err: unknown) {
                setMaintErrorMsg(err instanceof Error ? err.message : '儲存維修紀錄失敗');
              } finally {
                setSubmittingMaint(false);
              }
            }}
            className="space-y-5"
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Field 1: 日期 (Date) */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1 flex items-center space-x-1.5">
                  <Calendar className="w-4 h-4 text-amber-600" />
                  <span>維修日期 <span className="text-red-500">*</span></span>
                </label>
                <div className="flex items-center space-x-2">
                  <input
                    type="date"
                    required
                    value={maintDate}
                    onChange={(e) => setMaintDate(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white font-mono focus:outline-hidden focus:ring-2 focus:ring-amber-500"
                  />
                  <button
                    type="button"
                    onClick={() => setMaintDate(new Date().toISOString().split('T')[0])}
                    className="px-2.5 py-2 text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg shrink-0"
                    title="設為今天"
                  >
                    今天
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const d = new Date(Date.now() - 86400000);
                      setMaintDate(d.toISOString().split('T')[0]);
                    }}
                    className="px-2.5 py-2 text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg shrink-0"
                    title="設為昨天"
                  >
                    昨天
                  </button>
                </div>
              </div>

              {/* Field 2: 人員 (Personnel) */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1 flex items-center space-x-1.5">
                  <User className="w-4 h-4 text-amber-600" />
                  <span>維修人員 <span className="text-red-500">*</span></span>
                </label>
                <input
                  type="text"
                  required
                  value={maintPersonnel}
                  onChange={(e) => setMaintPersonnel(e.target.value)}
                  placeholder="請填寫維修人員姓名，例如：張組長、李工程師"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:outline-hidden focus:ring-2 focus:ring-amber-500"
                />
                {/* Quick preset chips */}
                <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                  <span className="text-[11px] text-slate-400">快速填入：</span>
                  {['機電工程師', '電控技術員', '設備維護組', '原廠技師'].map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setMaintPersonnel(preset)}
                      className="px-2 py-0.5 text-[11px] bg-slate-100 hover:bg-slate-200 text-slate-600 rounded"
                    >
                      {preset}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Field 3: 內容 (Content) */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1 flex items-center space-x-1.5">
                <FileText className="w-4 h-4 text-amber-600" />
                <span>維修內容與檢修說明 <span className="text-red-500">*</span></span>
              </label>
              <textarea
                required
                rows={5}
                value={maintContent}
                onChange={(e) => setMaintContent(e.target.value)}
                placeholder="請詳細記錄：&#10;1. 異常現象描述（例如：過電流跳脫、馬達異音、溫度過高）&#10;2. 檢測數據與量測值（例如：三相電壓 382V、接地阻抗 8Ω、熱像溫度 41°C）&#10;3. 故障排除處理過程與更換之備品料號&#10;4. 完工測試驗證與後續觀察指示"
                className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-sm bg-white focus:outline-hidden focus:ring-2 focus:ring-amber-500 placeholder-slate-400 leading-relaxed font-sans"
              />
            </div>

            {/* Optional Attached Photos / Drawings: Supports Ctrl+V Clipboard Paste */}
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center space-x-1.5">
                  <Image className="w-4 h-4 text-amber-600" />
                  <span>附加現場照片或記錄文件 ({maintFiles.length} 份)</span>
                </span>
                <span className="text-[11px] text-slate-500">
                  可直接按 Ctrl+V 貼上剪貼簿截圖
                </span>
              </div>

              {/* Paste and batch upload zone */}
              <PasteAndBatchUploadZone
                fileType="site_photo"
                title="點擊選擇照片 / 拖曳檔案 / 或直接按 Ctrl+V 貼上照片"
                subtitle="支援手機維修現場拍攝照片、儀表數據截圖貼上，或多張相片批次拖曳"
                compact={true}
                onFilesUploaded={(newFiles) => {
                  setMaintFiles((prev) => [...prev, ...newFiles]);
                }}
              />

              {/* Attached files preview chips */}
              {maintFiles.length > 0 && (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 pt-2">
                  {maintFiles.map((file, idx) => (
                    <div
                      key={file.id || idx}
                      className="p-2 bg-white rounded-lg border border-slate-200 flex items-center justify-between shadow-2xs"
                    >
                      <div
                        onClick={() => setPreviewFile(file)}
                        className="flex items-center space-x-2 truncate cursor-pointer hover:text-blue-600"
                      >
                        {file.mimeType.startsWith('image/') ? (
                          <img
                            src={file.url}
                            alt={file.originalName}
                            className="w-8 h-8 rounded object-cover border border-slate-200 shrink-0"
                          />
                        ) : (
                          <div className="w-8 h-8 rounded bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
                            <FileText className="w-4 h-4" />
                          </div>
                        )}
                        <span className="text-xs font-medium text-slate-800 truncate" title={file.originalName}>
                          {file.originalName}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setMaintFiles((prev) => prev.filter((_, i) => i !== idx))}
                        className="p-1 text-slate-400 hover:text-rose-600 rounded transition-colors ml-1 shrink-0"
                        title="移除附件"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-between pt-2">
              <button
                type="button"
                onClick={() => {
                  setMaintContent('');
                  setMaintFiles([]);
                  setMaintErrorMsg(null);
                  setMaintSuccessMsg(null);
                }}
                className="px-4 py-2 border border-slate-300 rounded-lg text-slate-600 hover:bg-slate-50 text-xs sm:text-sm font-medium flex items-center space-x-1.5 transition-colors"
              >
                <RotateCcw className="w-4 h-4" />
                <span>清除重填</span>
              </button>

              <button
                type="submit"
                disabled={submittingMaint}
                className="px-6 py-2.5 bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white rounded-lg text-sm font-bold shadow-xs transition-colors flex items-center space-x-2"
              >
                <Save className="w-4 h-4" />
                <span>{submittingMaint ? '儲存中...' : '儲存維修紀錄'}</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Tab: 維修紀錄列表 (Maintenance Records List) */}
      {activeTab === 'maintenance_list' && (
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs space-y-6">
          {/* Header & Controls */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-200">
            <div>
              <h2 className="text-lg font-bold text-slate-900 flex items-center space-x-2">
                <ClipboardList className="w-5 h-5 text-blue-600" />
                <span>設備維修履歷與保養紀錄</span>
                <span className="text-xs px-2.5 py-0.5 font-bold bg-blue-100 text-blue-800 rounded-full">
                  共 {maintenanceRecords.length} 筆
                </span>
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                按時間倒序排列，完整保存所有現場維護、零件更換與故障排除紀錄
              </p>
            </div>

            <div className="flex items-center space-x-2">
              <button
                type="button"
                onClick={() => {
                  setActiveTab('write_maintenance');
                  setMaintSuccessMsg(null);
                }}
                className="flex items-center space-x-1.5 px-3.5 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs sm:text-sm font-semibold transition-colors shadow-2xs"
              >
                <Plus className="w-4 h-4" />
                <span>填寫新紀錄</span>
              </button>

              {maintenanceRecords.length > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    const lines = [
                      `==================================================`,
                      `設備維修履歷報表 - ${equipment.tagNumber} ${equipment.name}`,
                      `設備分類：${equipment.category} | 安裝位置：${equipment.installationLocation || '未設定'}`,
                      `報表時間：${new Date().toLocaleString('zh-TW')}`,
                      `總筆數：共 ${maintenanceRecords.length} 筆維修紀錄`,
                      `==================================================\n`,
                    ];
                    maintenanceRecords.forEach((r, idx) => {
                      lines.push(`【紀錄 #${maintenanceRecords.length - idx}】`);
                      lines.push(`維修日期：${r.date}`);
                      lines.push(`維修人員：${r.personnel}`);
                      lines.push(`維修內容：\n${r.content}`);
                      if (r.files && r.files.length > 0) {
                        lines.push(`附件清單：${r.files.map((f) => f.originalName).join(', ')}`);
                      }
                      lines.push(`--------------------------------------------------\n`);
                    });
                    const blob = new Blob([lines.join('\n')], { type: 'text/plain;charset=utf-8' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `維修履歷_${equipment.tagNumber}_${new Date().toISOString().split('T')[0]}.txt`;
                    a.click();
                    URL.revokeObjectURL(url);
                  }}
                  className="flex items-center space-x-1 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs sm:text-sm font-medium transition-colors"
                  title="匯出純文字維修履歷備份"
                >
                  <Download className="w-4 h-4" />
                  <span className="hidden sm:inline">匯出履歷清單</span>
                </button>
              )}
            </div>
          </div>

          {/* Search Bar for Records */}
          {maintenanceRecords.length > 0 && (
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={recordSearch}
                onChange={(e) => setRecordSearch(e.target.value)}
                placeholder="搜尋維修內容關鍵字、人員姓名或日期..."
                className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg text-xs sm:text-sm bg-slate-50 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500"
              />
            </div>
          )}

          {/* Records List */}
          {loadingRecords ? (
            <div className="py-12 text-center text-slate-400">
              <div className="animate-spin w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full mx-auto mb-2" />
              <p className="text-xs">載入維修紀錄中...</p>
            </div>
          ) : maintenanceRecords.length === 0 ? (
            <div className="p-12 text-center border-2 border-dashed border-slate-200 rounded-xl bg-slate-50/50">
              <ClipboardList className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <h3 className="text-base font-bold text-slate-800">此設備尚無維修紀錄</h3>
              <p className="text-xs sm:text-sm text-slate-500 mt-1 max-w-md mx-auto">
                定期建立保養與檢修紀錄，可有效掌握設備壽命、避免突發性停機並利於故障追蹤。
              </p>
              <button
                type="button"
                onClick={() => {
                  setActiveTab('write_maintenance');
                  setMaintSuccessMsg(null);
                }}
                className="mt-4 px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs sm:text-sm font-semibold transition-colors inline-flex items-center space-x-1.5"
              >
                <Plus className="w-4 h-4" />
                <span>立即填寫第一筆維修紀錄</span>
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {(() => {
                const q = recordSearch.trim().toLowerCase();
                const filtered = maintenanceRecords.filter((r) => {
                  if (!q) return true;
                  return (
                    r.date.toLowerCase().includes(q) ||
                    r.personnel.toLowerCase().includes(q) ||
                    r.content.toLowerCase().includes(q)
                  );
                });

                if (filtered.length === 0) {
                  return (
                    <div className="py-8 text-center text-slate-400">
                      查無符合「{recordSearch}」的維修紀錄
                    </div>
                  );
                }

                return filtered.map((record) => (
                  <div
                    key={record.id}
                    className="p-5 rounded-xl border border-slate-200 bg-white hover:border-blue-300 hover:shadow-xs transition-all space-y-3"
                  >
                    {/* Top Row: Date, Personnel, Actions */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
                      <div className="flex flex-wrap items-center gap-2.5">
                        <span className="inline-flex items-center space-x-1.5 bg-blue-50 text-blue-800 font-mono text-xs sm:text-sm font-bold px-3 py-1 rounded-md border border-blue-200">
                          <Calendar className="w-3.5 h-3.5 text-blue-600" />
                          <span>{record.date}</span>
                        </span>
                        <span className="inline-flex items-center space-x-1 bg-amber-50 text-amber-800 text-xs font-semibold px-2.5 py-1 rounded-md border border-amber-200">
                          <User className="w-3.5 h-3.5 text-amber-600" />
                          <span>人員：{record.personnel}</span>
                        </span>
                      </div>

                      <div className="flex items-center space-x-2 self-end sm:self-auto">
                        <button
                          type="button"
                          onClick={() => {
                            const text = `【${equipment.tagNumber} ${equipment.name} 維修紀錄】\n日期：${record.date}\n人員：${record.personnel}\n內容：\n${record.content}`;
                            navigator.clipboard.writeText(text);
                            setCopiedRecordId(record.id);
                            setTimeout(() => setCopiedRecordId(null), 2000);
                          }}
                          className="px-2 py-1 text-xs text-slate-600 hover:bg-slate-100 rounded flex items-center space-x-1 transition-colors"
                          title="複製紀錄文字"
                        >
                          {copiedRecordId === record.id ? (
                            <>
                              <Check className="w-3.5 h-3.5 text-emerald-600" />
                              <span className="text-emerald-700 font-semibold">已複製</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3.5 h-3.5 text-slate-500" />
                              <span>複製</span>
                            </>
                          )}
                        </button>

                        <button
                          type="button"
                          onClick={() => setRecordToDelete(record)}
                          className="p-1 text-slate-400 hover:text-rose-600 rounded transition-colors"
                          title="刪除此紀錄"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* Content Body */}
                    <div className="text-sm text-slate-800 whitespace-pre-wrap leading-relaxed font-sans bg-slate-50/70 p-3.5 rounded-lg border border-slate-100">
                      {record.content}
                    </div>

                    {/* Attached Photos / Documents */}
                    {record.files && record.files.length > 0 && (
                      <div className="pt-2">
                        <span className="text-xs font-semibold text-slate-500 block mb-1.5 flex items-center space-x-1">
                          <Image className="w-3.5 h-3.5 text-slate-400" />
                          <span>檢修照片與文件附件 ({record.files.length} 份)：</span>
                        </span>
                        <div className="flex flex-wrap gap-2">
                          {record.files.map((f, fIdx) => (
                            <div
                              key={f.id || fIdx}
                              onClick={() => setPreviewFile(f)}
                              className="group inline-flex items-center space-x-2 p-1.5 pr-3 bg-white border border-slate-200 hover:border-blue-400 hover:shadow-2xs rounded-lg cursor-pointer transition-all"
                            >
                              {f.mimeType.startsWith('image/') ? (
                                <img
                                  src={f.url}
                                  alt={f.originalName}
                                  className="w-7 h-7 rounded object-cover border border-slate-200 shrink-0"
                                />
                              ) : (
                                <div className="w-7 h-7 rounded bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                                  <FileText className="w-3.5 h-3.5" />
                                </div>
                              )}
                              <span className="text-xs font-medium text-slate-700 group-hover:text-blue-700 truncate max-w-[160px]">
                                {f.originalName}
                              </span>
                              <span className="text-[10px] text-blue-600 opacity-0 group-hover:opacity-100 transition-opacity">
                                預覽 &rarr;
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ));
              })()}
            </div>
          )}
        </div>
      )}

      {/* Delete Maintenance Record Confirmation Modal */}
      {recordToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-md bg-white rounded-xl p-5 border border-slate-200 shadow-xl space-y-4">
            <div className="flex items-center space-x-2 text-rose-600">
              <AlertCircle className="w-5 h-5 shrink-0" />
              <h3 className="font-bold text-base">確認刪除此筆維修紀錄？</h3>
            </div>
            <p className="text-sm text-slate-600">
              維修日期：<span className="font-mono font-bold text-slate-800">{recordToDelete.date}</span>，人員：<span className="font-bold text-slate-800">{recordToDelete.personnel}</span>。刪除後無法復原，確定要執行嗎？
            </p>
            <div className="flex justify-end space-x-2 pt-2">
              <button
                type="button"
                onClick={() => setRecordToDelete(null)}
                className="px-4 py-2 text-xs font-semibold border border-slate-300 rounded-lg hover:bg-slate-50"
              >
                取消
              </button>
              <button
                type="button"
                onClick={async () => {
                  if (!recordToDelete) return;
                  try {
                    await deleteMaintenanceRecord(recordToDelete.id);
                    const updated = maintenanceRecords.filter((r) => r.id !== recordToDelete.id);
                    setMaintenanceRecords(updated);
                    onUpdateEquipment({
                      ...equipment,
                      maintenanceRecords: updated,
                      updatedAt: new Date().toISOString(),
                    });
                    setRecordToDelete(null);
                  } catch (err: unknown) {
                    alert(err instanceof Error ? err.message : '刪除維修紀錄失敗');
                  }
                }}
                className="px-4 py-2 text-xs font-semibold bg-rose-600 text-white rounded-lg hover:bg-rose-700 shadow-xs"
              >
                確認刪除紀錄
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-md bg-white rounded-xl p-5 border border-slate-200 shadow-xl space-y-4">
            <div className="flex items-center space-x-2 text-rose-600">
              <AlertCircle className="w-5 h-5 shrink-0" />
              <h3 className="font-bold text-base">確認刪除設備 [{equipment.tagNumber}]？</h3>
            </div>
            <p className="text-sm text-slate-600">
              刪除此設備後，若有下層子設備，其階層關係將重設為頂層設備，備品物料本身不會被刪除。確定要執行嗎？
            </p>
            <div className="flex justify-end space-x-2 pt-2">
              <button
                type="button"
                onClick={() => setDeleteConfirmOpen(false)}
                className="px-4 py-2 text-xs font-semibold border border-slate-300 rounded-lg hover:bg-slate-50"
              >
                取消
              </button>
              <button
                type="button"
                onClick={() => {
                  setDeleteConfirmOpen(false);
                  onDelete(equipment.tagNumber);
                }}
                className="px-4 py-2 text-xs font-semibold bg-rose-600 text-white rounded-lg hover:bg-rose-700 shadow-xs"
              >
                確認永久刪除
              </button>
            </div>
          </div>
        </div>
      )}

      {/* File Viewer Modal */}
      <FileViewerModal file={previewFile} onClose={() => setPreviewFile(null)} />

      {/* File Upload Modal */}
      <FileUploadModal
        isOpen={uploadModalOpen}
        onClose={() => setUploadModalOpen(false)}
        onUploaded={handleFileUploaded}
        targetType="equipment"
        defaultFileType={uploadDefaultType}
      />

      {/* Associate Modal */}
      <AssociateModal
        isOpen={associateModalOpen}
        onClose={() => setAssociateModalOpen(false)}
        mode="equipment_to_parts"
        equipment={equipment}
        allEquipment={allEquipment}
        allParts={allParts}
        onToggleAssociation={onToggleAssociation}
      />
    </div>
  );
};
