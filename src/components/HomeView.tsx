import React, { useState, useMemo } from 'react';
import {
  Search,
  Layers,
  Wrench,
  Clock,
  ArrowRight,
  MapPin,
  FolderTree,
  Cpu,
  FileCode,
  Image,
  BookOpen,
  Plus,
  Database,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';
import { Equipment, SparePart } from '../types.ts';

interface HomeViewProps {
  allEquipment: Equipment[];
  allParts: SparePart[];
  recentEquipmentTags: string[];
  recentPartNumbers: string[];
  onSelectEquipment: (tagNumber: string) => void;
  onSelectPart: (partNumber: string) => void;
  onNavigateTab: (tab: 'equipment' | 'parts' | 'backup') => void;
  onAddEquipment: () => void;
  onAddPart: () => void;
}

export const HomeView: React.FC<HomeViewProps> = ({
  allEquipment,
  allParts,
  recentEquipmentTags,
  recentPartNumbers,
  onSelectEquipment,
  onSelectPart,
  onNavigateTab,
  onAddEquipment,
  onAddPart,
}) => {
  const [searchQuery, setSearchQuery] = useState('');

  // Global search filtering
  const searchResults = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return null;

    const matchedEquipment = allEquipment.filter(
      (e) =>
        e.tagNumber.toLowerCase().includes(q) ||
        e.name.toLowerCase().includes(q) ||
        e.category.toLowerCase().includes(q) ||
        e.installationLocation.toLowerCase().includes(q) ||
        (e.notes && e.notes.toLowerCase().includes(q))
    );

    const matchedParts = allParts.filter(
      (p) =>
        p.partNumber.toLowerCase().includes(q) ||
        p.name.toLowerCase().includes(q) ||
        p.brand.toLowerCase().includes(q) ||
        p.model.toLowerCase().includes(q) ||
        p.storageLocation.toLowerCase().includes(q) ||
        (p.notes && p.notes.toLowerCase().includes(q))
    );

    return {
      equipment: matchedEquipment,
      spareParts: matchedParts,
      totalCount: matchedEquipment.length + matchedParts.length,
    };
  }, [searchQuery, allEquipment, allParts]);

  // Resolve recently viewed items
  const recentEquipments = useMemo(() => {
    return recentEquipmentTags
      .map((tag) => allEquipment.find((e) => e.tagNumber === tag))
      .filter((e): e is Equipment => Boolean(e))
      .slice(0, 6);
  }, [recentEquipmentTags, allEquipment]);

  const recentParts = useMemo(() => {
    return recentPartNumbers
      .map((pn) => allParts.find((p) => p.partNumber === pn))
      .filter((p): p is SparePart => Boolean(p))
      .slice(0, 6);
  }, [recentPartNumbers, allParts]);

  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      {/* Search Hero */}
      <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white rounded-2xl p-6 sm:p-10 shadow-lg border border-slate-700 relative overflow-hidden">
        <div className="relative z-10 max-w-3xl">
          <div className="inline-flex items-center space-x-2 px-3 py-1 bg-blue-500/20 text-blue-300 rounded-full text-xs font-semibold mb-3 border border-blue-400/30">
            <span>現場電控維修快速查詢入口</span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white mb-2">
            電控設備與備品管理系統 V1.0
          </h1>
          <p className="text-sm sm:text-base text-slate-300 mb-6">
            迅速尋找設備資料、查看電氣線路圖、現場實拍照、原廠操作手冊與備品儲位。
          </p>

          {/* Global Search Bar */}
          <div className="relative">
            <Search className="w-5 h-5 text-slate-400 absolute left-4 top-3.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="全域搜尋：輸入設備 TAG、設備名稱、料號、品名、廠牌、型號或儲位..."
              className="w-full pl-12 pr-4 py-3 sm:py-3.5 bg-white text-slate-900 rounded-xl text-sm sm:text-base placeholder-slate-400 focus:outline-hidden focus:ring-4 focus:ring-blue-500/40 shadow-inner"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-3 text-xs text-slate-400 hover:text-slate-600 bg-slate-100 px-2 py-1 rounded"
              >
                清除
              </button>
            )}
          </div>

          {/* Quick Search Chips */}
          <div className="flex flex-wrap items-center gap-1.5 mt-3 text-xs text-slate-300">
            <span className="text-slate-400">快速範例：</span>
            {['CR-001', '粉碎機', '變頻器', 'VFD-FUJI-37K', 'CP-01', '備品庫 A架'].map((sample) => (
              <button
                key={sample}
                type="button"
                onClick={() => setSearchQuery(sample)}
                className="px-2 py-0.5 bg-slate-800/80 hover:bg-slate-700 text-slate-200 rounded border border-slate-700 transition-colors"
              >
                {sample}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Realtime Search Results Area */}
      {searchResults !== null && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-6">
          <div className="flex items-center justify-between pb-3 border-b border-slate-200">
            <div>
              <h2 className="text-lg font-bold text-slate-900 flex items-center space-x-2">
                <Search className="w-5 h-5 text-blue-600" />
                <span>全域搜尋結果</span>
              </h2>
              <p className="text-xs text-slate-500">
                關鍵字「{searchQuery}」，共找到 {searchResults.totalCount} 項符合結果
              </p>
            </div>
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="text-xs text-slate-500 hover:text-slate-700 underline"
            >
              關閉搜尋結果
            </button>
          </div>

          {searchResults.totalCount === 0 ? (
            <div className="text-center py-8 text-slate-400 text-sm">
              查無任何符合「{searchQuery}」的設備或備品資料。
            </div>
          ) : (
            <div className="space-y-6">
              {/* Equipment Matches */}
              {searchResults.equipment.length > 0 && (
                <div>
                  <h3 className="text-sm font-bold text-slate-800 flex items-center space-x-2 mb-3">
                    <Layers className="w-4 h-4 text-blue-600" />
                    <span>符合的設備 ({searchResults.equipment.length})</span>
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {searchResults.equipment.map((eq) => (
                      <div
                        key={eq.tagNumber}
                        onClick={() => onSelectEquipment(eq.tagNumber)}
                        className="p-3.5 border border-slate-200 hover:border-blue-500 hover:bg-blue-50/30 rounded-xl cursor-pointer transition-all flex items-center justify-between"
                      >
                        <div>
                          <div className="flex items-center space-x-2">
                            <span className="font-mono text-xs font-bold text-blue-700 bg-blue-100 px-2 py-0.5 rounded">
                              {eq.tagNumber}
                            </span>
                            <span className="font-semibold text-sm text-slate-900">{eq.name}</span>
                          </div>
                          <div className="text-xs text-slate-500 mt-1 flex items-center space-x-2">
                            <span className="bg-slate-100 px-1.5 py-0.2 rounded text-[11px]">
                              {eq.category}
                            </span>
                            <span>•</span>
                            <span>{eq.installationLocation || '未設定位置'}</span>
                          </div>
                        </div>
                        <ArrowRight className="w-4 h-4 text-blue-600" />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Spare Parts Matches */}
              {searchResults.spareParts.length > 0 && (
                <div>
                  <h3 className="text-sm font-bold text-slate-800 flex items-center space-x-2 mb-3">
                    <Wrench className="w-4 h-4 text-emerald-600" />
                    <span>符合的備品物料 ({searchResults.spareParts.length})</span>
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {searchResults.spareParts.map((part) => (
                      <div
                        key={part.partNumber}
                        onClick={() => onSelectPart(part.partNumber)}
                        className="p-3.5 border border-slate-200 hover:border-emerald-500 hover:bg-emerald-50/30 rounded-xl cursor-pointer transition-all flex items-center justify-between"
                      >
                        <div>
                          <div className="flex items-center space-x-2">
                            <span className="font-mono text-xs font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded">
                              {part.partNumber}
                            </span>
                            <span className="font-semibold text-sm text-slate-900">{part.name}</span>
                            <span className="text-xs text-slate-500">
                              {part.brand} {part.model}
                            </span>
                          </div>
                          <div className="text-xs text-slate-600 mt-1 flex items-center space-x-3">
                            <span>
                              儲位：<strong className="text-blue-800">{part.storageLocation || '未指定'}</strong>
                            </span>
                            <span>•</span>
                            <span>
                              庫存：
                              <strong className={part.stockQty > 0 ? 'text-emerald-700' : 'text-red-600'}>
                                {part.stockQty}
                              </strong>
                            </span>
                          </div>
                        </div>
                        <ArrowRight className="w-4 h-4 text-emerald-600" />
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Main Portals: Equipment & Spare Parts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Equipment Portal */}
        <div
          onClick={() => onNavigateTab('equipment')}
          className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs hover:border-blue-500 hover:shadow-md cursor-pointer transition-all group flex flex-col justify-between"
        >
          <div>
            <div className="flex items-center justify-between mb-4">
              <span className="p-3 bg-blue-100 text-blue-700 rounded-xl group-hover:scale-110 transition-transform">
                <Layers className="w-7 h-7" />
              </span>
              <span className="text-xs font-semibold px-2.5 py-1 bg-slate-100 text-slate-600 rounded-full">
                共 {allEquipment.length} 台設備
              </span>
            </div>
            <h2 className="text-xl font-bold text-slate-900 group-hover:text-blue-600 transition-colors">
              設備查詢入口
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 mt-1.5 leading-relaxed">
              依 TAG NUMBER 查閱設備資料、上下層階層關係樹狀圖、電氣線路圖（PDF/圖檔）、現場實景照片與相關備品。
            </p>
          </div>

          <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between text-sm font-semibold text-blue-600">
            <span className="flex items-center space-x-1">
              <FolderTree className="w-4 h-4" />
              <span>進入設備管理與階層樹</span>
            </span>
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </div>
        </div>

        {/* Spare Parts Portal */}
        <div
          onClick={() => onNavigateTab('parts')}
          className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs hover:border-emerald-500 hover:shadow-md cursor-pointer transition-all group flex flex-col justify-between"
        >
          <div>
            <div className="flex items-center justify-between mb-4">
              <span className="p-3 bg-emerald-100 text-emerald-700 rounded-xl group-hover:scale-110 transition-transform">
                <Wrench className="w-7 h-7" />
              </span>
              <span className="text-xs font-semibold px-2.5 py-1 bg-slate-100 text-slate-600 rounded-full">
                共 {allParts.length} 項備品
              </span>
            </div>
            <h2 className="text-xl font-bold text-slate-900 group-hover:text-emerald-700 transition-colors">
              備品查詢入口
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 mt-1.5 leading-relaxed">
              依料號、品名、廠牌型號或儲位快速查詢備品庫存量，直接檢視原廠 PDF 操作手冊與元件照片。
            </p>
          </div>

          <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between text-sm font-semibold text-emerald-700">
            <span className="flex items-center space-x-1">
              <MapPin className="w-4 h-4" />
              <span>進入備品庫存與儲位查詢</span>
            </span>
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </div>
        </div>
      </div>

      {/* Recently Viewed Equipment Section */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center space-x-2">
            <Clock className="w-5 h-5 text-blue-600" />
            <h3 className="font-bold text-slate-900 text-base">最近查看的設備</h3>
          </div>
          <button
            type="button"
            onClick={() => onNavigateTab('equipment')}
            className="text-xs font-semibold text-blue-600 hover:text-blue-800"
          >
            查看所有設備 &rarr;
          </button>
        </div>

        {recentEquipments.length === 0 ? (
          <p className="text-xs text-slate-400 py-4 text-center">
            尚未有設備瀏覽紀錄，點選上方設備查詢即可開始查閱。
          </p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {recentEquipments.map((eq) => {
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
                  className="p-3 border border-slate-200 rounded-xl hover:border-blue-400 hover:bg-blue-50/40 cursor-pointer transition-colors flex items-center justify-between gap-3 group"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center space-x-2">
                      <span className="font-mono text-xs font-bold text-blue-700 bg-blue-100 px-2 py-0.5 rounded">
                        {eq.tagNumber}
                      </span>
                      <span className="font-semibold text-sm text-slate-900 group-hover:text-blue-600 transition-colors truncate">
                        {eq.name}
                      </span>
                    </div>
                    <div className="text-xs text-slate-500 mt-1 truncate">
                      {eq.installationLocation || eq.category}
                    </div>
                  </div>
                  {previewPhoto ? (
                    <img
                      src={previewPhoto.url}
                      alt={eq.name}
                      className="w-12 h-12 rounded-lg object-cover border border-slate-200 shrink-0"
                      loading="lazy"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-center shrink-0 text-slate-300">
                      <Image className="w-4 h-4" />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Recently Viewed Spare Parts Section */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center space-x-2">
            <Clock className="w-5 h-5 text-emerald-600" />
            <h3 className="font-bold text-slate-900 text-base">最近查看的備品</h3>
          </div>
          <button
            type="button"
            onClick={() => onNavigateTab('parts')}
            className="text-xs font-semibold text-emerald-700 hover:text-emerald-900"
          >
            查看所有備品 &rarr;
          </button>
        </div>

        {recentParts.length === 0 ? (
          <p className="text-xs text-slate-400 py-4 text-center">
            尚未有備品瀏覽紀錄，點選上方備品查詢即可開始查閱。
          </p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {recentParts.map((part) => {
              const previewPhoto = part.files.find(
                (f) =>
                  f.fileType === 'component_photo' ||
                  f.mimeType?.startsWith('image/') ||
                  f.storedFilename?.match(/\.(png|jpe?g|webp|svg)$/i)
              );

              return (
                <div
                  key={part.partNumber}
                  onClick={() => onSelectPart(part.partNumber)}
                  className="p-3 border border-slate-200 rounded-xl hover:border-emerald-400 hover:bg-emerald-50/40 cursor-pointer transition-colors flex items-center justify-between gap-3 group"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center space-x-2">
                      <span className="font-mono text-xs font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded">
                        {part.partNumber}
                      </span>
                      <span className="font-semibold text-sm text-slate-900 group-hover:text-emerald-700 transition-colors truncate">
                        {part.name}
                      </span>
                    </div>
                    <div className="flex items-center space-x-2 text-xs text-slate-600 mt-1 truncate">
                      <span>
                        儲位：<strong>{part.storageLocation || '未指定'}</strong>
                      </span>
                      <span>•</span>
                      <span>
                        庫存：
                        <strong className={part.stockQty > 0 ? 'text-emerald-700' : 'text-red-600'}>
                          {part.stockQty}
                        </strong>
                      </span>
                    </div>
                  </div>
                  {previewPhoto ? (
                    <img
                      src={previewPhoto.url}
                      alt={part.name}
                      className="w-12 h-12 rounded-lg object-cover border border-slate-200 shrink-0"
                      loading="lazy"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-center shrink-0 text-slate-300">
                      <Image className="w-4 h-4" />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Quick Action Footer Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-4 bg-slate-100 rounded-xl border border-slate-200 text-xs text-slate-600">
        <div className="flex items-center space-x-2">
          <Database className="w-4 h-4 text-slate-500" />
          <span>電控設備與備品管理系統 V1.0 - 伺服器持久化儲存已啟用</span>
        </div>
        <div className="flex items-center space-x-2">
          <button
            type="button"
            onClick={onAddEquipment}
            className="px-3 py-1.5 bg-white hover:bg-slate-50 border border-slate-300 rounded-lg text-slate-700 font-semibold"
          >
            + 新增設備
          </button>
          <button
            type="button"
            onClick={onAddPart}
            className="px-3 py-1.5 bg-white hover:bg-slate-50 border border-slate-300 rounded-lg text-slate-700 font-semibold"
          >
            + 新增備品
          </button>
          <button
            type="button"
            onClick={() => onNavigateTab('backup')}
            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-900 text-white rounded-lg font-semibold"
          >
            資料備份與還原
          </button>
        </div>
      </div>
    </div>
  );
};
