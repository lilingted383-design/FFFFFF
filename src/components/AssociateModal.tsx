import React, { useState, useMemo } from 'react';
import { X, Search, Check, Plus, Minus, Layers, Cpu } from 'lucide-react';
import { Equipment, SparePart } from '../types.ts';

interface AssociateModalProps {
  isOpen: boolean;
  onClose: () => void;
  mode: 'equipment_to_parts' | 'part_to_equipments';
  equipment?: Equipment | null;
  part?: SparePart | null;
  allEquipment: Equipment[];
  allParts: SparePart[];
  onToggleAssociation: (tagNumber: string, partNumber: string, action: 'add' | 'remove') => Promise<void>;
}

export const AssociateModal: React.FC<AssociateModalProps> = ({
  isOpen,
  onClose,
  mode,
  equipment,
  part,
  allEquipment,
  allParts,
  onToggleAssociation,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [loadingKey, setLoadingKey] = useState<string | null>(null);

  const filteredParts = useMemo(() => {
    if (mode !== 'equipment_to_parts') return [];
    const q = searchTerm.trim().toLowerCase();
    if (!q) return allParts;
    return allParts.filter(
      (p) =>
        p.partNumber.toLowerCase().includes(q) ||
        p.name.toLowerCase().includes(q) ||
        p.brand.toLowerCase().includes(q) ||
        p.model.toLowerCase().includes(q) ||
        p.storageLocation.toLowerCase().includes(q)
    );
  }, [allParts, searchTerm, mode]);

  const filteredEquipments = useMemo(() => {
    if (mode !== 'part_to_equipments') return [];
    const q = searchTerm.trim().toLowerCase();
    if (!q) return allEquipment;
    return allEquipment.filter(
      (e) =>
        e.tagNumber.toLowerCase().includes(q) ||
        e.name.toLowerCase().includes(q) ||
        e.category.toLowerCase().includes(q) ||
        e.installationLocation.toLowerCase().includes(q)
    );
  }, [allEquipment, searchTerm, mode]);

  if (!isOpen) return null;

  const handleToggle = async (tag: string, partNo: string, isAssociated: boolean) => {
    const key = `${tag}_${partNo}`;
    setLoadingKey(key);
    try {
      await onToggleAssociation(tag, partNo, isAssociated ? 'remove' : 'add');
    } finally {
      setLoadingKey(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
      <div className="w-full max-w-2xl bg-white rounded-xl shadow-2xl border border-slate-200 overflow-hidden text-slate-800 flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 bg-slate-50">
          <div className="flex items-center space-x-2">
            {mode === 'equipment_to_parts' ? (
              <Cpu className="w-5 h-5 text-blue-600" />
            ) : (
              <Layers className="w-5 h-5 text-emerald-600" />
            )}
            <div>
              <h3 className="font-semibold text-slate-900">
                {mode === 'equipment_to_parts'
                  ? `關聯電控元件 / 備品至設備：[${equipment?.tagNumber}] ${equipment?.name}`
                  : `關聯使用此備品的設備：[${part?.partNumber}] ${part?.name}`}
              </h3>
              <p className="text-xs text-slate-500">
                點選按鈕即可快速建立或取消雙向關聯，同一個元件可被多台設備共用。
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-200 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search */}
        <div className="p-4 border-b border-slate-200 bg-white">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder={
                mode === 'equipment_to_parts'
                  ? '搜尋備品料號、品名、廠牌、型號或儲位...'
                  : '搜尋設備 TAG NUMBER、名稱、分類或安裝位置...'
              }
              className="w-full pl-9 pr-4 py-2 border border-slate-300 rounded-lg text-sm bg-slate-50 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* List Body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2 divide-y divide-slate-100">
          {mode === 'equipment_to_parts' && equipment && (
            <>
              {filteredParts.length === 0 ? (
                <div className="text-center py-8 text-slate-400 text-sm">找不到符合條件的備品物料</div>
              ) : (
                filteredParts.map((p) => {
                  const isAssociated = equipment.componentPartNumbers.includes(p.partNumber);
                  const isActionLoading = loadingKey === `${equipment.tagNumber}_${p.partNumber}`;

                  return (
                    <div
                      key={p.partNumber}
                      className={`pt-2 pb-2 flex items-center justify-between px-3 rounded-lg transition-colors ${
                        isAssociated ? 'bg-blue-50/70 border border-blue-200' : 'hover:bg-slate-50'
                      }`}
                    >
                      <div className="min-w-0 pr-3">
                        <div className="flex items-center space-x-2">
                          <span className="font-mono font-bold text-sm text-blue-700 bg-blue-100/60 px-2 py-0.5 rounded">
                            {p.partNumber}
                          </span>
                          <span className="font-semibold text-sm text-slate-800">{p.name}</span>
                          <span className="text-xs text-slate-500">
                            {p.brand} {p.model}
                          </span>
                        </div>
                        <div className="flex items-center space-x-3 text-xs text-slate-500 mt-1">
                          <span>
                            庫存：
                            <strong className={p.stockQty > 0 ? 'text-emerald-700' : 'text-red-600'}>
                              {p.stockQty}
                            </strong>
                          </span>
                          <span>•</span>
                          <span>
                            儲位：<strong className="text-slate-700">{p.storageLocation || '未指定'}</strong>
                          </span>
                        </div>
                      </div>

                      <button
                        type="button"
                        disabled={isActionLoading}
                        onClick={() => handleToggle(equipment.tagNumber, p.partNumber, isAssociated)}
                        className={`shrink-0 flex items-center space-x-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                          isAssociated
                            ? 'bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200'
                            : 'bg-blue-600 text-white hover:bg-blue-700 shadow-xs'
                        }`}
                      >
                        {isAssociated ? (
                          <>
                            <Minus className="w-3.5 h-3.5" />
                            <span>解除關聯</span>
                          </>
                        ) : (
                          <>
                            <Plus className="w-3.5 h-3.5" />
                            <span>加入關聯</span>
                          </>
                        )}
                      </button>
                    </div>
                  );
                })
              )}
            </>
          )}

          {mode === 'part_to_equipments' && part && (
            <>
              {filteredEquipments.length === 0 ? (
                <div className="text-center py-8 text-slate-400 text-sm">找不到符合條件的設備</div>
              ) : (
                filteredEquipments.map((e) => {
                  const isAssociated = e.componentPartNumbers.includes(part.partNumber);
                  const isActionLoading = loadingKey === `${e.tagNumber}_${part.partNumber}`;

                  return (
                    <div
                      key={e.tagNumber}
                      className={`pt-2 pb-2 flex items-center justify-between px-3 rounded-lg transition-colors ${
                        isAssociated ? 'bg-emerald-50/70 border border-emerald-200' : 'hover:bg-slate-50'
                      }`}
                    >
                      <div className="min-w-0 pr-3">
                        <div className="flex items-center space-x-2">
                          <span className="font-mono font-bold text-sm text-emerald-800 bg-emerald-100/60 px-2 py-0.5 rounded">
                            {e.tagNumber}
                          </span>
                          <span className="font-semibold text-sm text-slate-800">{e.name}</span>
                          <span className="text-xs bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded">
                            {e.category}
                          </span>
                        </div>
                        <div className="text-xs text-slate-500 mt-1">
                          位置：{e.installationLocation || '未設定'}
                        </div>
                      </div>

                      <button
                        type="button"
                        disabled={isActionLoading}
                        onClick={() => handleToggle(e.tagNumber, part.partNumber, isAssociated)}
                        className={`shrink-0 flex items-center space-x-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                          isAssociated
                            ? 'bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200'
                            : 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-xs'
                        }`}
                      >
                        {isAssociated ? (
                          <>
                            <Minus className="w-3.5 h-3.5" />
                            <span>解除關聯</span>
                          </>
                        ) : (
                          <>
                            <Plus className="w-3.5 h-3.5" />
                            <span>關聯此設備</span>
                          </>
                        )}
                      </button>
                    </div>
                  );
                })
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="p-3 bg-slate-50 border-t border-slate-200 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-800 hover:bg-slate-900 text-white rounded-lg text-xs sm:text-sm font-medium transition-colors"
          >
            完成並關閉
          </button>
        </div>
      </div>
    </div>
  );
};
