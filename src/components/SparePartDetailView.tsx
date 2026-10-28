import React, { useState } from 'react';
import {
  Wrench,
  ArrowLeft,
  Edit2,
  Trash2,
  Plus,
  Minus,
  FileText,
  Image,
  MapPin,
  ExternalLink,
  Download,
  Link as LinkIcon,
  Eye,
  AlertCircle,
  Layers,
  BookOpen,
  CheckCircle2,
  AlertTriangle,
  ShoppingCart,
  DollarSign,
  Calendar,
} from 'lucide-react';
import { Equipment, FileRecord, RequisitionRecord, SparePart } from '../types.ts';
import { FileViewerModal } from './FileViewerModal.tsx';
import { FileUploadModal } from './FileUploadModal.tsx';
import { AssociateModal } from './AssociateModal.tsx';
import { PasteAndBatchUploadZone } from './PasteAndBatchUploadZone.tsx';

interface SparePartDetailViewProps {
  part: SparePart;
  allEquipment: Equipment[];
  allParts: SparePart[];
  onBack: () => void;
  onEdit: (part: SparePart) => void;
  onDelete: (partNumber: string) => void;
  onSelectEquipment: (tagNumber: string) => void;
  onUpdatePart: (part: SparePart) => void;
  onAdjustStock: (partNumber: string, delta?: number, absolute?: number) => Promise<void>;
  onToggleAssociation: (tagNumber: string, partNumber: string, action: 'add' | 'remove') => Promise<void>;
  onDeleteFile: (fileId: string) => Promise<void>;
}

export const SparePartDetailView: React.FC<SparePartDetailViewProps> = ({
  part,
  allEquipment,
  allParts,
  onBack,
  onEdit,
  onDelete,
  onSelectEquipment,
  onUpdatePart,
  onAdjustStock,
  onToggleAssociation,
  onDeleteFile,
}) => {
  const [activeTab, setActiveTab] = useState<'manuals' | 'photos' | 'equipments' | 'specs' | 'requisitions'>('requisitions');
  const [previewFile, setPreviewFile] = useState<FileRecord | null>(null);
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [uploadDefaultType, setUploadDefaultType] = useState<'manual' | 'component_photo' | 'spec_sheet'>('manual');
  const [associateModalOpen, setAssociateModalOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [isAdjustingStock, setIsAdjustingStock] = useState(false);

  // Requisitions state
  const [showReqModal, setShowReqModal] = useState(false);
  const [editingReqId, setEditingReqId] = useState<string | null>(null);
  const [reqDate, setReqDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [reqQty, setReqQty] = useState('1');
  const [reqInspectionDate, setReqInspectionDate] = useState('');
  const [reqPrice, setReqPrice] = useState('0');
  const [reqNotes, setReqNotes] = useState('');

  const handleSaveRequisition = (e: React.FormEvent) => {
    e.preventDefault();
    const q = Number(reqQty) || 1;
    const p = Number(reqPrice) || 0;
    if (!reqDate) {
      alert('請填寫請購時間');
      return;
    }

    const existingRecords = part.requisitionRecords || [];
    let updatedRecords: RequisitionRecord[];

    if (editingReqId) {
      updatedRecords = existingRecords.map((r) =>
        r.id === editingReqId
          ? {
              ...r,
              requisitionDate: reqDate,
              quantity: q,
              inspectionDate: reqInspectionDate ? reqInspectionDate : undefined,
              price: p,
              notes: reqNotes.trim(),
            }
          : r
      );
    } else {
      const newRec: RequisitionRecord = {
        id: `req_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        partNumber: part.partNumber,
        requisitionDate: reqDate,
        quantity: q,
        inspectionDate: reqInspectionDate ? reqInspectionDate : undefined,
        price: p,
        notes: reqNotes.trim(),
        createdAt: new Date().toISOString(),
      };
      updatedRecords = [newRec, ...existingRecords];
    }

    const updatedPart = {
      ...part,
      requisitionRecords: updatedRecords,
      updatedAt: new Date().toISOString(),
    };

    onUpdatePart(updatedPart);
    setShowReqModal(false);
    setEditingReqId(null);
    setReqNotes('');
    setReqPrice('0');
    setReqQty('1');
    setReqInspectionDate('');
  };

  const handleDeleteRequisition = (id: string) => {
    if (confirm('確定要刪除這筆請購紀錄嗎？')) {
      const updatedRecords = (part.requisitionRecords || []).filter((r) => r.id !== id);
      const updatedPart = {
        ...part,
        requisitionRecords: updatedRecords,
        updatedAt: new Date().toISOString(),
      };
      onUpdatePart(updatedPart);
    }
  };

  const handleEditRequisition = (r: RequisitionRecord) => {
    setEditingReqId(r.id);
    setReqDate(r.requisitionDate);
    setReqQty(String(r.quantity));
    setReqInspectionDate(r.inspectionDate || '');
    setReqPrice(String(r.price));
    setReqNotes(r.notes || '');
    setShowReqModal(true);
  };

  // Equipment using this part (Reverse lookup)
  const usingEquipments = allEquipment.filter((e) => e.componentPartNumbers.includes(part.partNumber));

  // Partition files
  const manualFiles = part.files.filter((f) => f.fileType === 'manual' || f.fileType === 'spec_sheet');
  const photoFiles = part.files.filter((f) => f.fileType === 'component_photo');
  const otherFiles = part.files.filter(
    (f) => f.fileType !== 'manual' && f.fileType !== 'spec_sheet' && f.fileType !== 'component_photo'
  );

  const handleStockDelta = async (delta: number) => {
    setIsAdjustingStock(true);
    try {
      await onAdjustStock(part.partNumber, delta);
    } finally {
      setIsAdjustingStock(false);
    }
  };

  const handleOpenUpload = (type: 'manual' | 'component_photo' | 'spec_sheet') => {
    setUploadDefaultType(type);
    setUploadModalOpen(true);
  };

  const handleFileUploaded = (record: FileRecord | FileRecord[]) => {
    const newRecords = Array.isArray(record) ? record : [record];
    const updated = {
      ...part,
      files: [...part.files, ...newRecords],
      updatedAt: new Date().toISOString(),
    };
    onUpdatePart(updated);
  };

  const handleDeleteFileClick = async (fileId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm('確定要刪除這筆檔案嗎？此操作不可復原。')) {
      await onDeleteFile(fileId);
      const updated = {
        ...part,
        files: part.files.filter((f) => f.id !== fileId),
        updatedAt: new Date().toISOString(),
      };
      onUpdatePart(updated);
    }
  };

  const isLowStock = part.stockQty <= (part.minStockQty ?? 0) && part.stockQty > 0;
  const isOutOfStock = part.stockQty <= 0;

  return (
    <div className="space-y-6">
      {/* Top Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
        <div className="flex items-center space-x-3">
          <button
            type="button"
            onClick={onBack}
            className="p-2 hover:bg-slate-100 rounded-lg text-slate-600 transition-colors"
            title="返回備品列表"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <div className="flex items-center space-x-2">
              <span className="font-mono text-xs sm:text-sm font-bold bg-emerald-100 text-emerald-800 px-2.5 py-0.5 rounded-md border border-emerald-200">
                {part.partNumber}
              </span>
              <span className="text-xs px-2 py-0.5 bg-slate-100 text-slate-700 rounded-full font-medium">
                {part.name}
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 mt-0.5">
              {part.brand ? `${part.brand} ` : ''}
              {part.model || part.name}
            </h1>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <button
            type="button"
            onClick={() => onEdit(part)}
            className="flex items-center space-x-1 px-3 py-1.5 text-xs sm:text-sm bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-medium transition-colors"
          >
            <Edit2 className="w-4 h-4" />
            <span>編輯物料</span>
          </button>
          <button
            type="button"
            onClick={() => setDeleteConfirmOpen(true)}
            className="flex items-center space-x-1 px-3 py-1.5 text-xs sm:text-sm bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-lg font-medium border border-rose-200 transition-colors"
          >
            <Trash2 className="w-4 h-4" />
            <span>刪除物料</span>
          </button>
        </div>
      </div>

      {/* Prominent High-Visibility KPI Boxes for On-Site Tech */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Box 1: Storage Location (儲位 - 支援多儲位顯示) */}
        {(() => {
          const locList = (part.storageLocations && part.storageLocations.length > 0)
            ? part.storageLocations
            : (part.storageLocation ? part.storageLocation.split(/[,/、，\n]+/).map(s => s.trim()).filter(Boolean) : []);
          return (
            <div className="bg-gradient-to-br from-blue-700 to-indigo-800 text-white p-5 rounded-xl shadow-sm flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between text-blue-200 text-xs font-semibold uppercase tracking-wider mb-1">
                  <span>存放儲位 (LOCATION)</span>
                  <div className="flex items-center space-x-1">
                    <MapPin className="w-4 h-4" />
                    {locList.length > 1 && (
                      <span className="bg-white/25 text-white text-[10px] px-1.5 py-0.5 rounded font-bold">
                        共 {locList.length} 處儲位
                      </span>
                    )}
                  </div>
                </div>
                {locList.length <= 1 ? (
                  <div className="text-xl sm:text-2xl font-mono font-black tracking-wide mt-1">
                    {locList[0] || '尚未指定儲位'}
                  </div>
                ) : (
                  <div className="mt-2 space-y-1.5 max-h-28 overflow-y-auto pr-1">
                    {locList.map((loc, idx) => (
                      <div
                        key={idx}
                        className="flex items-center space-x-1.5 bg-black/25 px-2.5 py-1 rounded-md text-xs sm:text-sm font-mono font-bold"
                      >
                        <span className="text-[10px] text-blue-200 font-normal">#{idx + 1}</span>
                        <span className="truncate">{loc}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div className="text-[11px] text-blue-200/80 mt-3">
                {locList.length > 1 ? '支援多庫位分區保管' : '現場維修備品架位代號'}
              </div>
            </div>
          );
        })()}

        {/* Box 2: Stock Quantity (庫存量) with Quick Tally */}
        <div
          className={`p-5 rounded-xl shadow-sm text-white flex flex-col justify-between ${
            isOutOfStock
              ? 'bg-gradient-to-br from-rose-600 to-red-700'
              : isLowStock
              ? 'bg-gradient-to-br from-amber-600 to-yellow-600'
              : 'bg-gradient-to-br from-emerald-600 to-teal-700'
          }`}
        >
          <div>
            <div className="flex items-center justify-between text-white/80 text-xs font-semibold uppercase tracking-wider mb-1">
              <span>現有庫存量 (IN STOCK)</span>
              {isOutOfStock ? (
                <span className="flex items-center space-x-1 bg-red-900/60 text-white text-[10px] px-1.5 py-0.5 rounded font-bold">
                  <AlertTriangle className="w-3 h-3" />
                  <span>缺料中</span>
                </span>
              ) : isLowStock ? (
                <span className="flex items-center space-x-1 bg-amber-900/60 text-white text-[10px] px-1.5 py-0.5 rounded font-bold">
                  <AlertTriangle className="w-3 h-3" />
                  <span>庫存偏低</span>
                </span>
              ) : (
                <span className="flex items-center space-x-1 bg-emerald-900/40 text-white text-[10px] px-1.5 py-0.5 rounded font-bold">
                  <CheckCircle2 className="w-3 h-3" />
                  <span>庫存充足</span>
                </span>
              )}
            </div>
            <div className="flex items-baseline space-x-2">
              <span className="text-3xl sm:text-4xl font-mono font-black">{part.stockQty}</span>
              <span className="text-xs text-white/80 font-medium">件 / 組</span>
            </div>
          </div>

          {/* Quick Adjust Buttons */}
          <div className="flex items-center space-x-2 mt-3 pt-2 border-t border-white/20">
            <span className="text-xs text-white/80 shrink-0">現場盤點：</span>
            <button
              type="button"
              disabled={isAdjustingStock || part.stockQty <= 0}
              onClick={() => handleStockDelta(-1)}
              className="p-1.5 bg-white/20 hover:bg-white/30 rounded disabled:opacity-40 transition-colors"
              title="領料出庫 -1"
            >
              <Minus className="w-4 h-4" />
            </button>
            <button
              type="button"
              disabled={isAdjustingStock}
              onClick={() => handleStockDelta(1)}
              className="p-1.5 bg-white/20 hover:bg-white/30 rounded disabled:opacity-40 transition-colors"
              title="進料入庫 +1"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Box 3: Brand & Model */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between">
          <div>
            <span className="text-xs text-slate-500 font-semibold uppercase tracking-wider block mb-1">
              廠牌與型號
            </span>
            <div className="text-sm font-bold text-slate-900 truncate">
              {part.brand || '未指定廠牌'}
            </div>
            <div className="text-xs font-mono text-slate-600 truncate mt-0.5">
              {part.model || '未指定型號'}
            </div>
          </div>
          <div className="text-[11px] text-slate-400 mt-2">
            安全庫存閥值：{part.minStockQty ?? 0}
          </div>
        </div>

        {/* Box 4: Equipment Usage Count */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between">
          <div>
            <span className="text-xs text-slate-500 font-semibold uppercase tracking-wider block mb-1">
              共用設備數量
            </span>
            <div className="flex items-baseline space-x-1.5">
              <span className="text-2xl font-mono font-bold text-blue-700">{usingEquipments.length}</span>
              <span className="text-xs text-slate-600">台設備使用</span>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setActiveTab('equipments')}
            className="text-xs text-blue-600 hover:text-blue-800 font-semibold text-left mt-2"
          >
            查看所有關聯設備 &rarr;
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex overflow-x-auto space-x-1 border-b border-slate-200 bg-white p-1 rounded-xl shadow-xs">
        <button
          type="button"
          onClick={() => setActiveTab('requisitions')}
          className={`px-4 py-2 text-xs sm:text-sm font-semibold rounded-lg transition-colors flex items-center space-x-1.5 shrink-0 ${
            activeTab === 'requisitions'
              ? 'bg-emerald-600 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <ShoppingCart className="w-4 h-4" />
          <span>請購紀錄 ({(part.requisitionRecords || []).length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('manuals')}
          className={`px-4 py-2 text-xs sm:text-sm font-semibold rounded-lg transition-colors flex items-center space-x-1.5 shrink-0 ${
            activeTab === 'manuals'
              ? 'bg-emerald-600 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <BookOpen className="w-4 h-4" />
          <span>原廠手冊與規格書 ({manualFiles.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('photos')}
          className={`px-4 py-2 text-xs sm:text-sm font-semibold rounded-lg transition-colors flex items-center space-x-1.5 shrink-0 ${
            activeTab === 'photos'
              ? 'bg-emerald-600 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <Image className="w-4 h-4" />
          <span>元件外觀實拍照 ({photoFiles.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('equipments')}
          className={`px-4 py-2 text-xs sm:text-sm font-semibold rounded-lg transition-colors flex items-center space-x-1.5 shrink-0 ${
            activeTab === 'equipments'
              ? 'bg-emerald-600 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>使用此元件的設備 ({usingEquipments.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('specs')}
          className={`px-4 py-2 text-xs sm:text-sm font-semibold rounded-lg transition-colors flex items-center space-x-1.5 shrink-0 ${
            activeTab === 'specs'
              ? 'bg-emerald-600 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <FileText className="w-4 h-4" />
          <span>技術備註與資訊</span>
        </button>
      </div>

      {/* Tab: Requisitions */}
      {activeTab === 'requisitions' && (
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-200">
            <div>
              <h2 className="text-lg font-bold text-slate-900 flex items-center space-x-2">
                <ShoppingCart className="w-5 h-5 text-emerald-600" />
                <span>備品請購與採購驗收紀錄</span>
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                記錄此備品之請購時間、採購數量、到貨檢收時間與採購價格。
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                setEditingReqId(null);
                setReqDate(new Date().toISOString().split('T')[0]);
                setReqQty('1');
                setReqInspectionDate('');
                setReqPrice('0');
                setReqNotes('');
                setShowReqModal(true);
              }}
              className="flex items-center space-x-1 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs sm:text-sm font-semibold transition-colors shadow-xs"
            >
              <Plus className="w-4 h-4" />
              <span>新增請購紀錄</span>
            </button>
          </div>

          {(part.requisitionRecords || []).length === 0 ? (
            <div className="text-center py-12 border-2 border-dashed border-slate-200 rounded-xl bg-slate-50">
              <ShoppingCart className="w-10 h-10 text-slate-400 mx-auto mb-2" />
              <p className="text-sm font-medium text-slate-600">目前尚無請購紀錄</p>
              <p className="text-xs text-slate-400 mt-1">點擊上方「新增請購紀錄」按鈕開始建立採購與驗收歷程</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="bg-slate-100 text-slate-700 text-xs uppercase tracking-wider border-b border-slate-200">
                    <th className="py-3 px-4 font-bold">請購時間</th>
                    <th className="py-3 px-4 font-bold text-center">數量</th>
                    <th className="py-3 px-4 font-bold">檢收時間</th>
                    <th className="py-3 px-4 font-bold text-right">價格 ($)</th>
                    <th className="py-3 px-4 font-bold">備註說明</th>
                    <th className="py-3 px-4 font-bold text-center">操作</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {(part.requisitionRecords || []).map((r) => (
                    <tr key={r.id} className="hover:bg-slate-50 transition-colors">
                      <td className="py-3 px-4 font-mono text-xs font-semibold text-slate-800 flex items-center space-x-1.5">
                        <Calendar className="w-3.5 h-3.5 text-slate-400" />
                        <span>{r.requisitionDate}</span>
                      </td>
                      <td className="py-3 px-4 font-mono font-bold text-center text-emerald-700">
                        {r.quantity}
                      </td>
                      <td className="py-3 px-4 font-mono text-xs text-slate-600">
                        {r.inspectionDate ? (
                          <span className="inline-flex items-center space-x-1 text-blue-700 bg-blue-50 px-2 py-0.5 rounded text-[11px]">
                            <CheckCircle2 className="w-3 h-3" />
                            <span>{r.inspectionDate}</span>
                          </span>
                        ) : (
                          <span className="text-amber-600 text-[11px] font-medium bg-amber-50 px-2 py-0.5 rounded">
                            尚未檢收
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 font-mono font-bold text-right text-slate-900">
                        ${Number(r.price || 0).toLocaleString()}
                      </td>
                      <td className="py-3 px-4 text-xs text-slate-600 max-w-xs truncate" title={r.notes}>
                        {r.notes || '—'}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <div className="flex items-center justify-center space-x-1">
                          <button
                            type="button"
                            onClick={() => handleEditRequisition(r)}
                            className="p-1.5 text-slate-600 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                            title="編輯"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteRequisition(r.id)}
                            className="p-1.5 text-slate-600 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors"
                            title="刪除"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Tab 1: Manuals & Spec Sheets */}
      {activeTab === 'manuals' && (
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-200">
            <div>
              <h2 className="text-lg font-bold text-slate-900 flex items-center space-x-2">
                <BookOpen className="w-5 h-5 text-emerald-600" />
                <span>原廠操作手冊與技術規格書 (PDF / 文件 / 截圖貼上)</span>
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                支援按 Ctrl+V 貼上手冊規格截圖，或將多份 PDF 手冊一次拖曳批次上傳。
              </p>
            </div>
            <button
              type="button"
              onClick={() => handleOpenUpload('manual')}
              className="flex items-center space-x-1 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs sm:text-sm font-semibold transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>批次上傳或開啟視窗</span>
            </button>
          </div>

          {/* Quick Paste & Batch Upload Dropzone */}
          <PasteAndBatchUploadZone
            fileType="manual"
            title="手冊與規格書剪貼簿直接貼上或批次拖曳"
            subtitle="在畫面任何地方按 Ctrl+V 即可直接貼上規格截圖，或將多個 PDF / 圖檔一次拖曳進來批次儲存"
            accept=".pdf,image/*,.doc,.docx"
            onFilesUploaded={handleFileUploaded}
          />

          {manualFiles.length === 0 ? (
            <div className="text-center py-8 border-2 border-dashed border-slate-200 rounded-xl bg-slate-50">
              <BookOpen className="w-10 h-10 text-slate-400 mx-auto mb-2" />
              <p className="text-sm font-medium text-slate-600">目前尚無原廠操作手冊或規格書</p>
              <p className="text-xs text-slate-400 mt-1">
                上傳原廠 PDF 手冊或按 Ctrl+V 貼上規格銘板，現場維修時能迅速查閱接線與故障碼
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {manualFiles.map((file) => (
                <div
                  key={file.id}
                  className="p-4 border border-slate-200 rounded-xl hover:border-emerald-400 hover:shadow-sm transition-all bg-white flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center space-x-2">
                        <span className="p-2 bg-emerald-50 text-emerald-600 rounded-lg">
                          <BookOpen className="w-5 h-5" />
                        </span>
                        <div>
                          <h4 className="font-semibold text-sm text-slate-900 truncate max-w-xs" title={file.originalName}>
                            {file.originalName}
                          </h4>
                          <span className="text-xs text-slate-400">
                            {file.fileType === 'spec_sheet' ? '規格書 • ' : '原廠手冊 • '}
                            {(file.size / 1024).toFixed(1)} KB • {new Date(file.uploadedAt).toLocaleDateString('zh-TW')}
                          </span>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={(e) => handleDeleteFileClick(file.id, e)}
                        title="刪除此手冊"
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
                      className="flex-1 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs font-semibold rounded-lg transition-colors flex items-center justify-center space-x-1"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>直接開啟線上閱讀</span>
                    </button>
                    <a
                      href={file.downloadUrl}
                      download={file.originalName}
                      className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-colors"
                      title="下載手冊"
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

      {/* Tab 2: Photos */}
      {activeTab === 'photos' && (
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-200">
            <div>
              <h2 className="text-lg font-bold text-slate-900 flex items-center space-x-2">
                <Image className="w-5 h-5 text-emerald-600" />
                <span>元件外觀與銘板照片 (支援直接貼上照片)</span>
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                直接按 Ctrl+V 貼上截圖，或一次拖曳多張相片批次儲存，無需一張張上傳。
              </p>
            </div>
            <button
              type="button"
              onClick={() => handleOpenUpload('component_photo')}
              className="flex items-center space-x-1 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs sm:text-sm font-semibold transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>批次上傳或開啟視窗</span>
            </button>
          </div>

          {/* Quick Paste & Batch Upload Dropzone */}
          <PasteAndBatchUploadZone
            fileType="component_photo"
            title="元件照片剪貼簿直接貼上或批次拖曳"
            subtitle="在畫面任何地方按 Ctrl+V 即可直接貼上外觀或銘板截圖，或將多張實照一次拖曳進來批次儲存"
            accept="image/*"
            onFilesUploaded={handleFileUploaded}
          />

          {photoFiles.length === 0 ? (
            <div className="text-center py-8 border-2 border-dashed border-slate-200 rounded-xl bg-slate-50">
              <Image className="w-10 h-10 text-slate-400 mx-auto mb-2" />
              <p className="text-sm font-medium text-slate-600">尚無元件照片</p>
              <p className="text-xs text-slate-400 mt-1">
                直接按 Ctrl+V 貼上照片，或使用上方拖曳區一次上傳多張相片
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

      {/* Tab 3: Reverse Lookup - Equipment using this part */}
      {activeTab === 'equipments' && (
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-200">
            <div>
              <h2 className="text-lg font-bold text-slate-900 flex items-center space-x-2">
                <Layers className="w-5 h-5 text-blue-600" />
                <span>使用此電控元件的設備 (反向查詢)</span>
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                此處顯示所有安裝或共用此備品物料的設備，點選即可前往該設備檢視線路圖與現場照片。
              </p>
            </div>
            <button
              type="button"
              onClick={() => setAssociateModalOpen(true)}
              className="flex items-center space-x-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs sm:text-sm font-semibold transition-colors"
            >
              <LinkIcon className="w-4 h-4" />
              <span>變更關聯設備</span>
            </button>
          </div>

          {usingEquipments.length === 0 ? (
            <div className="text-center py-12 border-2 border-dashed border-slate-200 rounded-xl bg-slate-50">
              <Layers className="w-12 h-12 text-slate-400 mx-auto mb-2" />
              <p className="text-sm font-medium text-slate-600">目前尚無設備關聯此備品</p>
              <p className="text-xs text-slate-400 mt-1 mb-4">
                您可以將此備品關聯到廠內任何設備，方便日後故障替換追蹤
              </p>
              <button
                type="button"
                onClick={() => setAssociateModalOpen(true)}
                className="px-4 py-2 bg-blue-600 text-white text-xs font-semibold rounded-lg hover:bg-blue-700"
              >
                立即關聯設備
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {usingEquipments.map((eq) => (
                <div
                  key={eq.tagNumber}
                  onClick={() => onSelectEquipment(eq.tagNumber)}
                  className="p-4 border border-slate-200 rounded-xl hover:border-blue-400 hover:shadow-sm cursor-pointer transition-all bg-white flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center space-x-2">
                          <span className="font-mono text-sm font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded">
                            {eq.tagNumber}
                          </span>
                          <span className="font-semibold text-sm text-slate-900">{eq.name}</span>
                        </div>
                        <span className="text-xs px-2 py-0.5 bg-slate-100 text-slate-600 rounded-full font-medium mt-1 inline-block">
                          {eq.category}
                        </span>
                      </div>
                    </div>

                    <div className="mt-3 p-2 bg-slate-50 rounded-lg text-xs text-slate-600 flex items-center space-x-1">
                      <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span className="truncate">{eq.installationLocation || '未設定位置'}</span>
                    </div>

                    {eq.files.length > 0 && (
                      <div className="flex items-center space-x-2 text-xs text-slate-500 mt-2">
                        <span>含 {eq.files.filter((f) => f.fileType === 'circuit_diagram').length} 份線路圖</span>
                        <span>•</span>
                        <span>{eq.files.filter((f) => f.fileType === 'site_photo').length} 張現場照</span>
                      </div>
                    )}
                  </div>

                  <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-blue-600 font-medium">
                    <span>檢視設備線路圖與詳細頁面 &rarr;</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab 4: Specs & Notes */}
      {activeTab === 'specs' && (
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs space-y-4">
          <h2 className="text-base font-bold text-slate-900 flex items-center space-x-2">
            <FileText className="w-5 h-5 text-emerald-600" />
            <span>詳細物料規格與維護備註</span>
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-3 bg-slate-50 rounded-lg">
              <span className="text-xs text-slate-500 block mb-1">主識別料號 (Part Number)</span>
              <span className="font-mono text-base font-bold text-slate-900">{part.partNumber}</span>
            </div>
            <div className="p-3 bg-slate-50 rounded-lg">
              <span className="text-xs text-slate-500 block mb-1">元件品名</span>
              <span className="text-sm font-semibold text-slate-900">{part.name}</span>
            </div>
            <div className="p-3 bg-slate-50 rounded-lg">
              <span className="text-xs text-slate-500 block mb-1">廠牌 (Brand)</span>
              <span className="text-sm font-semibold text-slate-900">{part.brand || '無'}</span>
            </div>
            <div className="p-3 bg-slate-50 rounded-lg sm:col-span-2">
              {(() => {
                const locList = (part.storageLocations && part.storageLocations.length > 0)
                  ? part.storageLocations
                  : (part.storageLocation ? part.storageLocation.split(/[,/、，\n]+/).map(s => s.trim()).filter(Boolean) : []);
                return (
                  <>
                    <span className="text-xs text-slate-500 block mb-1.5 flex items-center space-x-1">
                      <MapPin className="w-3.5 h-3.5 text-blue-600" />
                      <span>存放儲位清單 ({locList.length} 處儲位)</span>
                    </span>
                    <div className="flex flex-wrap gap-2">
                      {locList.map((loc, idx) => (
                        <span
                          key={idx}
                          className="inline-flex items-center space-x-1 font-mono text-xs font-bold bg-blue-50 text-blue-800 border border-blue-200 px-2.5 py-1 rounded-md"
                        >
                          <span className="text-[10px] text-blue-500">#{idx + 1}</span>
                          <span>{loc}</span>
                        </span>
                      ))}
                      {locList.length === 0 && (
                        <span className="text-xs text-slate-400">尚未指定儲位</span>
                      )}
                    </div>
                  </>
                );
              })()}
            </div>
          </div>

          <div>
            <span className="text-xs font-semibold text-slate-700 block mb-1">備註說明 (保管注意 / 參數提示)</span>
            <div className="p-3 bg-slate-50 rounded-lg border border-slate-100 text-sm text-slate-800 whitespace-pre-wrap leading-relaxed min-h-[80px]">
              {part.notes || '無特殊備註說明。'}
            </div>
          </div>

          <div className="text-xs text-slate-400 pt-2 flex items-center justify-between border-t border-slate-100">
            <span>建立時間：{new Date(part.createdAt).toLocaleDateString('zh-TW')}</span>
            <span>最後更新：{new Date(part.updatedAt).toLocaleString('zh-TW')}</span>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-md bg-white rounded-xl p-5 border border-slate-200 shadow-xl space-y-4">
            <div className="flex items-center space-x-2 text-rose-600">
              <AlertCircle className="w-5 h-5 shrink-0" />
              <h3 className="font-bold text-base">確認刪除備品物料 [{part.partNumber}]？</h3>
            </div>
            <p className="text-sm text-slate-600">
              刪除此備品將同時解除所有關聯設備的物料記錄，上傳的手冊與照片亦將被清理。確定要執行嗎？
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
                  onDelete(part.partNumber);
                }}
                className="px-4 py-2 text-xs font-semibold bg-rose-600 text-white rounded-lg hover:bg-rose-700 shadow-xs"
              >
                確認永久刪除
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Requisition Modal */}
      {showReqModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md bg-white rounded-xl shadow-2xl border border-slate-200 overflow-hidden text-slate-800">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 bg-slate-50">
              <h3 className="font-semibold text-slate-900 flex items-center space-x-2">
                <ShoppingCart className="w-4 h-4 text-emerald-600" />
                <span>{editingReqId ? '編輯請購紀錄' : '新增請購紀錄'}</span>
              </h3>
              <button
                type="button"
                onClick={() => setShowReqModal(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-200"
              >
                &times;
              </button>
            </div>
            <form onSubmit={handleSaveRequisition} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  請購時間 <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  required
                  value={reqDate}
                  onChange={(e) => setReqDate(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    數量 <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={reqQty}
                    onChange={(e) => setReqQty(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    價格 ($) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    required
                    value={reqPrice}
                    onChange={(e) => setReqPrice(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  檢收時間 (選填)
                </label>
                <input
                  type="date"
                  value={reqInspectionDate}
                  onChange={(e) => setReqInspectionDate(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  備註說明
                </label>
                <textarea
                  rows={2}
                  value={reqNotes}
                  onChange={(e) => setReqNotes(e.target.value)}
                  placeholder="例如：供應商名稱、發票號碼、採購單號等..."
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowReqModal(false)}
                  className="px-4 py-2 text-xs font-semibold border border-slate-300 rounded-lg hover:bg-slate-50"
                >
                  取消
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-semibold bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 shadow-xs"
                >
                  儲存請購紀錄
                </button>
              </div>
            </form>
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
        targetType="spare_part"
        defaultFileType={uploadDefaultType}
      />

      {/* Associate Modal */}
      <AssociateModal
        isOpen={associateModalOpen}
        onClose={() => setAssociateModalOpen(false)}
        mode="part_to_equipments"
        part={part}
        allEquipment={allEquipment}
        allParts={allParts}
        onToggleAssociation={onToggleAssociation}
      />
    </div>
  );
};
