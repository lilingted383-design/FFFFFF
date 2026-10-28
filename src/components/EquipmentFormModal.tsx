import React, { useState, useEffect } from 'react';
import { X, Save, AlertCircle, Plus, Layers } from 'lucide-react';
import { Equipment } from '../types.ts';

interface EquipmentFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: Partial<Equipment>) => Promise<void>;
  initialEquipment?: Equipment | null;
  existingEquipments: Equipment[];
  categories: string[];
}

export const EquipmentFormModal: React.FC<EquipmentFormModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  initialEquipment,
  existingEquipments,
  categories,
}) => {
  const isEditing = !!initialEquipment;
  const [tagNumber, setTagNumber] = useState('');
  const [name, setName] = useState('');
  const [parentTagNumber, setParentTagNumber] = useState<string>('');
  const [category, setCategory] = useState('主設備');
  const [customCategory, setCustomCategory] = useState('');
  const [showCustomCategory, setShowCustomCategory] = useState(false);
  const [installationLocation, setInstallationLocation] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (initialEquipment) {
      setTagNumber(initialEquipment.tagNumber);
      setName(initialEquipment.name);
      setParentTagNumber(initialEquipment.parentTagNumber || '');
      if (categories.includes(initialEquipment.category)) {
        setCategory(initialEquipment.category);
        setShowCustomCategory(false);
      } else {
        setCategory('__CUSTOM__');
        setCustomCategory(initialEquipment.category);
        setShowCustomCategory(true);
      }
      setInstallationLocation(initialEquipment.installationLocation || '');
      setNotes(initialEquipment.notes || '');
    } else {
      setTagNumber('');
      setName('');
      setParentTagNumber('');
      setCategory(categories[0] || '主設備');
      setShowCustomCategory(false);
      setCustomCategory('');
      setInstallationLocation('');
      setNotes('');
    }
    setError(null);
  }, [initialEquipment, categories, isOpen]);

  if (!isOpen) return null;

  // Filter out self and circular candidates for parent
  const availableParents = existingEquipments.filter(
    (e) => !initialEquipment || e.tagNumber !== initialEquipment.tagNumber
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const finalTag = tagNumber.trim().toUpperCase();
    const finalName = name.trim();
    const finalCategory = showCustomCategory ? customCategory.trim() : category;

    if (!finalTag) {
      setError('TAG NUMBER 為必填唯一識別碼');
      return;
    }
    if (!finalName) {
      setError('設備名稱為必填欄位');
      return;
    }
    if (showCustomCategory && !finalCategory) {
      setError('請輸入自訂分類名稱');
      return;
    }

    setSaving(true);
    setError(null);
    try {
      await onSubmit({
        tagNumber: finalTag,
        name: finalName,
        parentTagNumber: parentTagNumber ? parentTagNumber.trim() : null,
        category: finalCategory,
        installationLocation: installationLocation.trim(),
        notes: notes.trim(),
      });
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : '儲存設備失敗');
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
            <Layers className="w-5 h-5 text-blue-600" />
            <h3 className="font-semibold text-slate-900">
              {isEditing ? `編輯設備資料 [${initialEquipment.tagNumber}]` : '新增電控設備'}
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

        <form onSubmit={handleSubmit} className="p-5 space-y-4 max-h-[80vh] overflow-y-auto">
          {error && (
            <div className="flex items-center space-x-2 p-3 text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* TAG NUMBER */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                TAG NUMBER (唯一代碼) <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={tagNumber}
                onChange={(e) => setTagNumber(e.target.value.toUpperCase())}
                placeholder="例如：CR-001、CP-01"
                className="w-full font-mono uppercase px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500"
              />
              <p className="text-[11px] text-slate-500 mt-1">設備唯一識別編號，建立後關聯將以此代碼為準</p>
            </div>

            {/* Equipment Name */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                設備名稱 <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="例如：粉碎機、粉碎主馬達"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Parent TAG NUMBER */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                上層設備 (建立設備階層)
              </label>
              <select
                value={parentTagNumber}
                onChange={(e) => setParentTagNumber(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500"
              >
                <option value="">-- 無上層（此設備為頂層設備） --</option>
                {availableParents.map((p) => (
                  <option key={p.tagNumber} value={p.tagNumber}>
                    [{p.tagNumber}] {p.name} ({p.category})
                  </option>
                ))}
              </select>
              <p className="text-[11px] text-slate-500 mt-1">可隨時自由調整上下層階層關係</p>
            </div>

            {/* Category */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                設備分類
              </label>
              {!showCustomCategory ? (
                <div className="space-y-1">
                  <div className="flex space-x-1">
                    <select
                      value={category}
                      onChange={(e) => {
                        if (e.target.value === '__CUSTOM__') {
                          setShowCustomCategory(true);
                        } else {
                          setCategory(e.target.value);
                        }
                      }}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                    >
                      {categories.map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                      <option value="__CUSTOM__">+ 自訂新分類...</option>
                    </select>
                  </div>
                </div>
              ) : (
                <div className="space-y-1">
                  <div className="flex space-x-1">
                    <input
                      type="text"
                      value={customCategory}
                      onChange={(e) => setCustomCategory(e.target.value)}
                      placeholder="輸入自訂分類名稱"
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                    />
                    <button
                      type="button"
                      onClick={() => setShowCustomCategory(false)}
                      className="px-2 py-1 text-xs border border-slate-300 rounded-lg text-slate-600 hover:bg-slate-100"
                    >
                      返回選單
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Installation Location */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              安裝位置 (所在產線或廠區)
            </label>
            <input
              type="text"
              value={installationLocation}
              onChange={(e) => setInstallationLocation(e.target.value)}
              placeholder="例如：A棟原料粉碎區 1號線、控制盤 CP-01 內部左側"
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              設備備註 / 維護重點
            </label>
            <textarea
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="例如：主馬達需定期更換潤滑脂；緊急停止連鎖保護在 X0 點位..."
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500 placeholder-slate-400"
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
              className="px-5 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg text-sm font-medium transition-colors flex items-center space-x-2"
            >
              <Save className="w-4 h-4" />
              <span>{saving ? '儲存中...' : isEditing ? '儲存變更' : '建立設備'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
