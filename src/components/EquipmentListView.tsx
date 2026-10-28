import React, { useState, useMemo } from 'react';
import {
  Layers,
  Search,
  Plus,
  FolderTree,
  Grid,
  List,
  MapPin,
  Cpu,
  FileCode,
  Image,
  ArrowRight,
  Filter,
} from 'lucide-react';
import { Equipment, SparePart } from '../types.ts';
import { EquipmentHierarchyTree } from './EquipmentHierarchyTree.tsx';

interface EquipmentListViewProps {
  equipmentList: Equipment[];
  allParts: SparePart[];
  categories: string[];
  onSelectEquipment: (tagNumber: string) => void;
  onAddEquipment: () => void;
  onEditEquipment: (eq: Equipment) => void;
}

export const EquipmentListView: React.FC<EquipmentListViewProps> = ({
  equipmentList,
  allParts,
  categories,
  onSelectEquipment,
  onAddEquipment,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [viewMode, setViewMode] = useState<'cards' | 'tree' | 'table'>('cards');

  const filteredEquipment = useMemo(() => {
    return equipmentList.filter((eq) => {
      const matchCategory = selectedCategory === 'ALL' || eq.category === selectedCategory;
      const q = searchTerm.trim().toLowerCase();
      const matchSearch =
        !q ||
        eq.tagNumber.toLowerCase().includes(q) ||
        eq.name.toLowerCase().includes(q) ||
        eq.category.toLowerCase().includes(q) ||
        eq.installationLocation.toLowerCase().includes(q) ||
        (eq.notes && eq.notes.toLowerCase().includes(q));
      return matchCategory && matchSearch;
    });
  }, [equipmentList, selectedCategory, searchTerm]);

  return (
    <div className="space-y-6">
      {/* Top Banner / Filter Bar */}
      <div className="bg-white p-4 sm:p-5 rounded-xl border border-slate-200 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 flex items-center space-x-2">
              <Layers className="w-6 h-6 text-blue-600" />
              <span>工廠電控設備管理</span>
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
              快速查閱設備資料、上下層階層架構、電氣線路圖與現場實景照片
            </p>
          </div>

          <button
            type="button"
            onClick={onAddEquipment}
            className="flex items-center justify-center space-x-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-semibold transition-colors shadow-xs"
          >
            <Plus className="w-4 h-4" />
            <span>新增電控設備</span>
          </button>
        </div>

        {/* Filters and Search */}
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 pt-3 border-t border-slate-100">
          <div className="flex-1 flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="搜尋 TAG NUMBER、設備名稱、產線位置或備註..."
                className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg text-sm bg-slate-50 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="flex items-center space-x-2">
              <Filter className="w-4 h-4 text-slate-400 hidden sm:block" />
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-blue-500 shrink-0"
              >
                <option value="ALL">全部分類 ({equipmentList.length})</option>
                {categories.map((c) => {
                  const count = equipmentList.filter((e) => e.category === c).length;
                  return (
                    <option key={c} value={c}>
                      {c} ({count})
                    </option>
                  );
                })}
              </select>
            </div>
          </div>

          {/* View Mode Toggle */}
          <div className="flex items-center space-x-1 bg-slate-100 p-1 rounded-lg shrink-0 self-end md:self-auto">
            <button
              type="button"
              onClick={() => setViewMode('cards')}
              title="卡片檢視"
              className={`p-1.5 rounded-md text-xs font-medium flex items-center space-x-1 transition-colors ${
                viewMode === 'cards'
                  ? 'bg-white text-blue-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Grid className="w-4 h-4" />
              <span className="hidden sm:inline">卡片</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('tree')}
              title="階層樹狀檢視"
              className={`p-1.5 rounded-md text-xs font-medium flex items-center space-x-1 transition-colors ${
                viewMode === 'tree'
                  ? 'bg-white text-blue-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <FolderTree className="w-4 h-4" />
              <span className="hidden sm:inline">階層樹狀圖</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('table')}
              title="表格檢視"
              className={`p-1.5 rounded-md text-xs font-medium flex items-center space-x-1 transition-colors ${
                viewMode === 'table'
                  ? 'bg-white text-blue-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <List className="w-4 h-4" />
              <span className="hidden sm:inline">列表</span>
            </button>
          </div>
        </div>
      </div>

      {/* View Mode 1: Hierarchy Tree */}
      {viewMode === 'tree' && (
        <EquipmentHierarchyTree
          equipmentList={equipmentList}
          onSelectEquipment={onSelectEquipment}
        />
      )}

      {/* View Mode 2: Card Grid */}
      {viewMode === 'cards' && (
        <>
          {filteredEquipment.length === 0 ? (
            <div className="bg-white p-12 text-center rounded-xl border border-slate-200">
              <Layers className="w-12 h-12 text-slate-400 mx-auto mb-3" />
              <p className="text-base font-semibold text-slate-800">查無符合條件的設備</p>
              <p className="text-xs text-slate-500 mt-1">請嘗試變更搜尋關鍵字或分類篩選</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredEquipment.map((eq) => {
                const circuitCount = eq.files.filter((f) => f.fileType === 'circuit_diagram').length;
                const photoCount = eq.files.filter(
                  (f) =>
                    f.fileType === 'site_photo' ||
                    f.mimeType?.startsWith('image/') ||
                    f.storedFilename?.match(/\.(png|jpe?g|webp|svg)$/i)
                ).length;
                const partCount = eq.componentPartNumbers.length;

                // Find primary photo for preview
                const previewPhoto =
                  eq.files.find(
                    (f) =>
                      f.fileType === 'site_photo' ||
                      f.mimeType?.startsWith('image/') ||
                      f.storedFilename?.match(/\.(png|jpe?g|webp|svg)$/i)
                  ) ||
                  eq.maintenanceRecords
                    ?.flatMap((m) => m.files || [])
                    .find(
                      (f) =>
                        f.mimeType?.startsWith('image/') ||
                        f.storedFilename?.match(/\.(png|jpe?g|webp|svg)$/i)
                    );

                return (
                  <div
                    key={eq.tagNumber}
                    onClick={() => onSelectEquipment(eq.tagNumber)}
                    className="bg-white border border-slate-200 hover:border-blue-500 hover:shadow-md rounded-xl p-4 sm:p-5 cursor-pointer transition-all flex flex-col justify-between group"
                  >
                    {/* Top Row: Info on Left, Photo Preview on Right */}
                    <div className="flex items-start justify-between gap-3.5">
                      {/* Left Info Column */}
                      <div className="min-w-0 flex-1">
                        {/* Top Tag & Category */}
                        <div className="flex items-center flex-wrap gap-1.5">
                          <span className="font-mono text-xs sm:text-sm font-bold bg-blue-50 text-blue-700 border border-blue-200 px-2.5 py-0.5 rounded-md">
                            {eq.tagNumber}
                          </span>
                          <span className="text-xs px-2 py-0.5 bg-slate-100 text-slate-600 rounded-md font-medium">
                            {eq.category}
                          </span>
                        </div>

                        {/* Title */}
                        <h3 className="text-base font-bold text-slate-900 mt-2.5 group-hover:text-blue-600 transition-colors line-clamp-2 leading-snug">
                          {eq.name}
                        </h3>

                        {/* Parent info */}
                        {eq.parentTagNumber && (
                          <div className="text-[11px] text-slate-500 mt-1.5 flex items-center space-x-1 truncate">
                            <span>上層：</span>
                            <span className="font-mono font-medium text-slate-700">
                              {eq.parentTagNumber}
                            </span>
                          </div>
                        )}

                        {/* Location */}
                        <div className="flex items-center space-x-1.5 text-xs text-slate-600 mt-2.5">
                          <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span className="truncate">{eq.installationLocation || '未設定安裝位置'}</span>
                        </div>
                      </div>

                      {/* Right Photo Preview */}
                      <div className="w-24 h-24 sm:w-28 sm:h-28 shrink-0 rounded-lg overflow-hidden bg-slate-50 border border-slate-200 flex flex-col items-center justify-center relative group-hover:border-blue-400 transition-colors">
                        {previewPhoto ? (
                          <>
                            <img
                              src={previewPhoto.url}
                              alt={eq.name}
                              className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                              loading="lazy"
                            />
                            {photoCount > 1 && (
                              <span className="absolute bottom-1 right-1 bg-slate-900/80 text-white text-[10px] px-1.5 py-0.2 rounded font-mono font-semibold backdrop-blur-xs">
                                {photoCount}P
                              </span>
                            )}
                          </>
                        ) : (
                          <div className="flex flex-col items-center justify-center text-slate-300 p-2 text-center select-none">
                            <Image className="w-6 h-6 stroke-[1.5]" />
                            <span className="text-[10px] text-slate-400 mt-1 font-medium">尚無照片</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Bottom Badges */}
                    <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                      <div className="flex items-center space-x-2">
                        {circuitCount > 0 && (
                          <span
                            title={`${circuitCount} 份線路圖`}
                            className="flex items-center space-x-1 text-blue-700 bg-blue-50 px-2 py-0.5 rounded text-[11px]"
                          >
                            <FileCode className="w-3 h-3" />
                            <span>{circuitCount}</span>
                          </span>
                        )}
                        {photoCount > 0 && (
                          <span
                            title={`${photoCount} 張現場照片`}
                            className="flex items-center space-x-1 text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded text-[11px]"
                          >
                            <Image className="w-3 h-3" />
                            <span>{photoCount}</span>
                          </span>
                        )}
                        {partCount > 0 && (
                          <span
                            title={`關聯 ${partCount} 項電控備品`}
                            className="flex items-center space-x-1 text-amber-700 bg-amber-50 px-2 py-0.5 rounded text-[11px]"
                          >
                            <Cpu className="w-3 h-3" />
                            <span>{partCount}</span>
                          </span>
                        )}
                      </div>

                      <span className="text-blue-600 group-hover:translate-x-1 transition-transform flex items-center space-x-0.5 font-medium text-xs">
                        <span>查看詳細</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* View Mode 3: Table View */}
      {viewMode === 'table' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  <th className="py-3 px-4">TAG NUMBER</th>
                  <th className="py-3 px-4">設備名稱</th>
                  <th className="py-3 px-4">分類</th>
                  <th className="py-3 px-4">上層設備</th>
                  <th className="py-3 px-4">安裝位置</th>
                  <th className="py-3 px-4 text-center">線路圖 / 照片</th>
                  <th className="py-3 px-4 text-center">關聯備品</th>
                  <th className="py-3 px-4 text-right">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredEquipment.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-slate-400">
                      查無符合條件的設備
                    </td>
                  </tr>
                ) : (
                  filteredEquipment.map((eq) => {
                    const circuitCount = eq.files.filter((f) => f.fileType === 'circuit_diagram').length;
                    const photoCount = eq.files.filter((f) => f.fileType === 'site_photo').length;

                    return (
                      <tr
                        key={eq.tagNumber}
                        onClick={() => onSelectEquipment(eq.tagNumber)}
                        className="hover:bg-blue-50/50 cursor-pointer transition-colors"
                      >
                        <td className="py-3 px-4 font-mono font-bold text-blue-700">
                          {eq.tagNumber}
                        </td>
                        <td className="py-3 px-4 font-semibold text-slate-900">{eq.name}</td>
                        <td className="py-3 px-4">
                          <span className="text-xs px-2 py-0.5 bg-slate-100 text-slate-700 rounded-full font-medium">
                            {eq.category}
                          </span>
                        </td>
                        <td className="py-3 px-4 font-mono text-xs text-slate-600">
                          {eq.parentTagNumber || '-'}
                        </td>
                        <td className="py-3 px-4 text-xs text-slate-600">
                          {eq.installationLocation || '-'}
                        </td>
                        <td className="py-3 px-4 text-center text-xs">
                          <span className="text-blue-600">{circuitCount} 圖</span> /{' '}
                          <span className="text-emerald-600">{photoCount} 照</span>
                        </td>
                        <td className="py-3 px-4 text-center text-xs font-mono font-bold text-amber-700">
                          {eq.componentPartNumbers.length} 項
                        </td>
                        <td className="py-3 px-4 text-right">
                          <span className="text-blue-600 font-semibold text-xs hover:underline">
                            檢視 &rarr;
                          </span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
