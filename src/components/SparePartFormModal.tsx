import React, { useState, useEffect } from 'react';
import { X, Save, AlertCircle, Wrench, Plus, Trash2, MapPin } from 'lucide-react';
import { SparePart } from '../types.ts';

interface SparePartFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: Partial<SparePart>) => Promise<void>;
  initialPart?: SparePart | null;
  commonPartNames: string[];
}

export const SparePartFormModal: React.FC<SparePartFormModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  initialPart,
  commonPartNames,
}) => {
  const isEditing = !!initialPart;
  const [partNumber, setPartNumber] = useState('');
  const [name, setName] = useState('');
  const [brand, setBrand] = useState('');
  const [model, setModel] = useState('');
  const [stockQty, setStockQty] = useState<number>(1);
  const [minStockQty, setMinStockQty] = useState<number>(1);
  const [storageLocations, setStorageLocations] = useState<string[]>(['']);
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (initialPart) {
      setPartNumber(initialPart.partNumber);
      setName(initialPart.name || '');
      setBrand(initialPart.brand || '');
      setModel(initialPart.model || '');
      setStockQty(initialPart.stockQty ?? 0);
      setMinStockQty(initialPart.minStockQty ?? 0);
      
      // Parse multi-location storage
      if (Array.isArray(initialPart.storageLocations) && initialPart.storageLocations.length > 0) {
        setStorageLocations(initialPart.storageLocations);
      } else if (initialPart.storageLocation) {
        const splitLocs = initialPart.storageLocation
          .split(/[,/、，\n]+/)
          .map((s) => s.trim())
          .filter(Boolean);
        setStorageLocations(splitLocs.length > 0 ? splitLocs : ['']);
      } else {
        setStorageLocations(['']);
      }
      setNotes(initialPart.notes || '');
    } else {
      setPartNumber('');
      setName('');
      setBrand('');
      setModel('');
      setStockQty(1);
      setMinStockQty(1);
      setStorageLocations(['']);
      setNotes('');
    }
    setError(null);
  }, [initialPart, isOpen]);

  if (!isOpen) return null;

  const handleAddStorageLocation = () => {
    setStorageLocations((prev) => [...prev, '']);
  };

  const handleRemoveStorageLocation = (index: number) => {
    setStorageLocations((prev) => {
      const updated = prev.filter((_, idx) => idx !== index);
      return updated.length > 0 ? updated : [''];
    });
  };

  const handleStorageLocationChange = (index: number, val: string) => {
    setStorageLocations((prev) => {
      const updated = [...prev];
      updated[index] = val;
      return updated;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const finalPartNo = partNumber.trim().toUpperCase();
    const finalName = name.trim();

    if (!finalPartNo) {
      setError('料號為必填唯一識別碼');
      return;
    }
    if (!finalName) {
      setError('品名為必填欄位，請直接輸入品名');
      return;
    }

    const cleanLocations = storageLocations.map((s) => s.trim()).filter(Boolean);
    if (cleanLocations.length === 0) {
      setError('請至少填寫一個存放儲位 (可填寫兩個以上)');
      return;
    }

    setSaving(true);
    setError(null);
    try {
      await onSubmit({
        partNumber: finalPartNo,
        name: finalName,
        brand: brand.trim(),
        model: model.trim(),
        stockQty: Number(stockQty) || 0,
        minStockQty: Number(minStockQty) || 0,
        storageLocation: cleanLocations.join('、'),
        storageLocations: cleanLocations,
        notes: notes.trim(),
      });
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : '儲存備品失敗');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
      <div className="w-full max-w-xl bg-white rounded-xl shadow-2xl border border-slate-200 overflow-hidden text-slate-800">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 bg-slate-50">
          <div className="flex items-center space-x-2">
            <Wrench className="w-5 h-5 text-emerald-600" />
            <h3 className="font-semibold text-slate-900">
              {isEditing ? `編輯備品物料 [${initialPart.partNumber}]` : '新增電控備品物料'}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-200 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4 max-h-[85vh] overflow-y-auto">
          {error && (
            <div className="flex items-center space-x-2 p-3 text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Part Number */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                料號 (主識別碼) <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={partNumber}
                onChange={(e) => setPartNumber(e.target.value.toUpperCase())}
                placeholder="例如：VFD-001、SEN-001"
                className="w-full font-mono uppercase px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
              />
              <p className="text-[11px] text-slate-500 mt-1">物料主要唯一識別碼，可被多台設備共用</p>
            </div>

            {/* Part Name: Text Input (No Dropdown, as user requested) */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                品名 <span className="text-red-500">* (手動填寫欄位)</span>
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="請直接輸入品名，例如：變頻器、接觸器、電源供應器"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
              />
              <p className="text-[11px] text-slate-500 mt-1">可自由手動填寫任何品名</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Brand */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                廠牌 (Brand)
              </label>
              <input
                type="text"
                value={brand}
                onChange={(e) => setBrand(e.target.value)}
                placeholder="例如：FUJI 富士、OMRON 歐姆龍、MEAN WELL"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            {/* Model */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                型號 (Model)
              </label>
              <input
                type="text"
                value={model}
                onChange={(e) => setModel(e.target.value)}
                placeholder="例如：FRN0060C2S-4C、E2E-X10MF1"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Stock Quantity */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                當前庫存量 <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                min="0"
                step="1"
                required
                value={stockQty}
                onChange={(e) => setStockQty(Math.max(0, parseInt(e.target.value, 10) || 0))}
                className="w-full font-mono font-bold text-base px-3 py-2 border border-slate-300 rounded-lg bg-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            {/* Min Stock Warning */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                安全庫存量
              </label>
              <input
                type="number"
                min="0"
                step="1"
                value={minStockQty}
                onChange={(e) => setMinStockQty(Math.max(0, parseInt(e.target.value, 10) || 0))}
                className="w-full font-mono text-base px-3 py-2 border border-slate-300 rounded-lg bg-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
              />
              <p className="text-[11px] text-slate-500 mt-1">低於此數量將黃色預警提示</p>
            </div>
          </div>

          {/* Storage Locations: Supports 2 or more locations (儲位可以兩個以上) */}
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center space-x-1.5">
                <MapPin className="w-4 h-4 text-emerald-600" />
                <span>存放儲位 (支援填寫 2 個以上儲位) <span className="text-red-500">*</span></span>
              </label>
              <button
                type="button"
                onClick={handleAddStorageLocation}
                className="inline-flex items-center space-x-1 px-2.5 py-1 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded-md transition-colors shadow-2xs"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>新增儲位</span>
              </button>
            </div>

            <div className="space-y-2">
              {storageLocations.map((loc, idx) => (
                <div key={idx} className="flex items-center space-x-2">
                  <div className="relative flex-1">
                    <span className="absolute left-3 top-2.5 text-xs font-mono font-bold text-slate-400 select-none">
                      #{idx + 1}
                    </span>
                    <input
                      type="text"
                      required={idx === 0}
                      value={loc}
                      onChange={(e) => handleStorageLocationChange(idx, e.target.value)}
                      placeholder={
                        idx === 0
                          ? '主要儲位，例如：備品庫 A架-02-01'
                          : `次要儲位 #${idx + 1}，例如：二廠 3樓備品櫃-05、現場備用料台`
                      }
                      className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg text-sm bg-white font-mono focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                  {storageLocations.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveStorageLocation(idx)}
                      className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors shrink-0"
                      title="刪除此儲位欄位"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
            <p className="text-[11px] text-slate-500">
              提示：若同一備品分散存放於主庫房、各車間料架或外包倉庫，可點擊「新增儲位」隨時填寫 2 個或更多存放位置。
            </p>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              備註說明 (規格細節、替用料或保管注意)
            </label>
            <textarea
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="例如：380V輸入，已預調好參數；防潮箱專用保管..."
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500 placeholder-slate-400"
            />
          </div>

          <div className="flex justify-end space-x-3 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="px-4 py-2 border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50 text-sm font-medium transition-colors"
            >
              取消
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-lg text-sm font-medium transition-colors flex items-center space-x-2"
            >
              <Save className="w-4 h-4" />
              <span>{saving ? '儲存中...' : isEditing ? '儲存變更' : '建立備品'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
