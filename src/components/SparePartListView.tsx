import React, { useState, useMemo, useRef } from 'react';
import * as XLSX from 'xlsx';
import {
  Wrench,
  Search,
  Plus,
  Minus,
  MapPin,
  Layers,
  BookOpen,
  Image,
  ArrowRight,
  Filter,
  Grid,
  List,
  AlertTriangle,
  CheckCircle2,
  FileSpreadsheet,
  Download,
  Upload,
} from 'lucide-react';
import { Equipment, SparePart } from '../types.ts';
import { batchImportSpareParts } from '../services/api.ts';

interface SparePartListViewProps {
  partsList: SparePart[];
  allEquipment: Equipment[];
  partNames: string[];
  onSelectPart: (partNumber: string) => void;
  onAddPart: () => void;
  onAdjustStock: (partNumber: string, delta?: number, absolute?: number) => Promise<void>;
}

export const SparePartListView: React.FC<SparePartListViewProps> = ({
  partsList,
  allEquipment,
  partNames,
  onSelectPart,
  onAddPart,
  onAdjustStock,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStorageFilter, setSelectedStorageFilter] = useState('ALL');
  const [stockStatusFilter, setStockStatusFilter] = useState<'ALL' | 'OUT' | 'LOW' | 'OK'>('ALL');
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('cards');
  const [adjustingPartNo, setAdjustingPartNo] = useState<string | null>(null);

  const [importingExcel, setImportingExcel] = useState(false);
  const [excelMessage, setExcelMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDownloadTemplate = () => {
    const templateData = [
      {
        '料號 (必填)': 'VFD-SAMPLE-01',
        '品名 (必填)': '變頻器',
        '廠牌': 'FUJI 富士電機',
        '型號': 'FRN0060C2S-4C (37kW)',
        '現有庫存': 5,
        '安全庫存': 2,
        '存放儲位 (可填多個)': '備品庫 A架-02-01、B櫃',
        '備註說明': '粉碎主馬達專用變頻器範例',
      },
      {
        '料號 (必填)': 'SEN-SAMPLE-02',
        '品名 (必填)': '近接開關',
        '廠牌': 'OMRON 歐姆龍',
        '型號': 'E2E-X10MF1',
        '現有庫存': 12,
        '安全庫存': 3,
        '存放儲位 (可填多個)': '備品庫 C抽屜-03',
        '備註說明': '感應距離 10mm 範例',
      },
    ];
    const ws = XLSX.utils.json_to_sheet(templateData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, '備品匯入範例');
    XLSX.writeFile(wb, 'spare_parts_import_template.xlsx');
  };

  const handleExportExcel = () => {
    const exportData = partsList.map((p) => ({
      '料號': p.partNumber,
      '品名': p.name,
      '廠牌': p.brand,
      '型號': p.model,
      '現有庫存': p.stockQty,
      '安全庫存': p.minStockQty ?? 0,
      '存放儲位': p.storageLocation || (p.storageLocations ? p.storageLocations.join('、') : ''),
      '備註說明': p.notes || '',
    }));
    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, '電控備品清單');
    XLSX.writeFile(wb, `electrical_spare_parts_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImportingExcel(true);
    setExcelMessage(null);
    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data, { type: 'array' });
      const firstSheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[firstSheetName];
      const rawRows = XLSX.utils.sheet_to_json<Record<string, any>>(worksheet);

      if (!rawRows || rawRows.length === 0) {
        throw new Error('Excel 檔案內無有效資料列');
      }

      const mappedParts = rawRows.map((row) => {
        const partNumber = String(row['料號 (必填)'] || row['料號'] || row['partNumber'] || '').trim();
        const name = String(row['品名 (必填)'] || row['品名'] || row['name'] || '').trim();
        const brand = String(row['廠牌'] || row['brand'] || '').trim();
        const model = String(row['型號'] || row['model'] || '').trim();
        const stockQty = Number(row['現有庫存'] ?? row['stockQty'] ?? 0);
        const minStockQty = Number(row['安全庫存'] ?? row['minStockQty'] ?? 0);
        const storageLocation = String(row['存放儲位 (可填多個)'] || row['存放儲位'] || row['storageLocation'] || '').trim();
        const notes = String(row['備註說明'] || row['notes'] || '').trim();

        return {
          partNumber,
          name,
          brand,
          model,
          stockQty: Number.isFinite(stockQty) ? stockQty : 0,
          minStockQty: Number.isFinite(minStockQty) ? minStockQty : 0,
          storageLocation,
          notes,
        };
      }).filter((p) => p.partNumber);

      if (mappedParts.length === 0) {
        throw new Error('未能在 Excel 中找到合法的「料號」欄位資料');
      }

      const result = await batchImportSpareParts(mappedParts);
      setExcelMessage({ type: 'success', text: result.message });
      window.location.reload();
    } catch (err: unknown) {
      setExcelMessage({
        type: 'error',
        text: err instanceof Error ? err.message : 'Excel 匯入失敗，請確認檔案格式是否正確',
      });
    } finally {
      setImportingExcel(false);
      if (e.target) e.target.value = '';
    }
  };

  // Collect distinct storage locations
  const storageLocations = useMemo(() => {
    const set = new Set<string>();
    partsList.forEach((p) => {
      if (Array.isArray(p.storageLocations) && p.storageLocations.length > 0) {
        p.storageLocations.forEach((loc) => loc.trim() && set.add(loc.trim()));
      } else if (p.storageLocation && p.storageLocation.trim()) {
        p.storageLocation
          .split(/[,/、，\n]+/)
          .forEach((loc) => loc.trim() && set.add(loc.trim()));
      }
    });
    return Array.from(set).sort();
  }, [partsList]);

  const hasSearch = searchTerm.trim().length > 0;
  const hasStorageFilter = selectedStorageFilter !== 'ALL';
  const hasStockFilter = stockStatusFilter !== 'ALL';
  const isInitialEmpty = !hasSearch && !hasStorageFilter && !hasStockFilter;

  const filteredParts = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    const hasS = q.length > 0;
    const hasSto = selectedStorageFilter !== 'ALL';
    const hasStk = stockStatusFilter !== 'ALL';

    if (!hasS && !hasSto && !hasStk) {
      return [];
    }

    return partsList.filter((p) => {
      // Storage filter
      if (hasSto) {
        const hasMatch =
          (p.storageLocation && p.storageLocation.toLowerCase().includes(selectedStorageFilter.toLowerCase())) ||
          (p.storageLocations && p.storageLocations.some((loc) => loc.toLowerCase().includes(selectedStorageFilter.toLowerCase())));
        if (!hasMatch) return false;
      }

      // Stock status filter
      if (stockStatusFilter === 'OUT' && p.stockQty > 0) return false;
      if (
        stockStatusFilter === 'LOW' &&
        !(p.stockQty > 0 && p.stockQty <= (p.minStockQty ?? 0))
      )
        return false;
      if (
        stockStatusFilter === 'OK' &&
        p.stockQty <= (p.minStockQty ?? 0)
      )
        return false;

      // Search term
      if (!hasS) return true;
      return (
        p.partNumber.toLowerCase().includes(q) ||
        p.name.toLowerCase().includes(q) ||
        p.brand.toLowerCase().includes(q) ||
        p.model.toLowerCase().includes(q) ||
        p.storageLocation.toLowerCase().includes(q) ||
        (p.storageLocations && p.storageLocations.some((loc) => loc.toLowerCase().includes(q))) ||
        (p.notes && p.notes.toLowerCase().includes(q))
      );
    });
  }, [partsList, selectedStorageFilter, stockStatusFilter, searchTerm]);

  const handleQuickAdjust = async (partNo: string, delta: number, e: React.MouseEvent) => {
    e.stopPropagation();
    setAdjustingPartNo(partNo);
    try {
      await onAdjustStock(partNo, delta);
    } finally {
      setAdjustingPartNo(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner / Filter Bar */}
      <div className="bg-white p-4 sm:p-5 rounded-xl border border-slate-200 shadow-xs space-y-4">
        {excelMessage && (
          <div
            className={`p-3 rounded-xl flex items-center space-x-2 text-xs font-medium border ${
              excelMessage.type === 'success'
                ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                : 'bg-rose-50 text-rose-800 border-rose-200'
            }`}
          >
            {excelMessage.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 shrink-0" />
            ) : (
              <AlertTriangle className="w-4 h-4 shrink-0" />
            )}
            <span>{excelMessage.text}</span>
          </div>
        )}

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 flex items-center space-x-2">
              <Wrench className="w-6 h-6 text-emerald-600" />
              <span>電控元件與備品庫存管理</span>
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
              快速查詢備品料號、品名、原廠規格、現有庫存量與儲位架號，支援 Excel 批次匯入與匯出
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleDownloadTemplate}
              title="下載 Excel 填寫範例表格"
              className="flex items-center space-x-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold transition-colors"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
              <span>下載範例表格</span>
            </button>
            <button
              type="button"
              onClick={handleExportExcel}
              title="匯出現有所有備品為 Excel"
              className="flex items-center space-x-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold transition-colors"
            >
              <Download className="w-4 h-4 text-blue-600" />
              <span>匯出 Excel</span>
            </button>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={importingExcel}
              title="上傳 Excel 檔案批次匯入備品"
              className="flex items-center space-x-1.5 px-3 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 rounded-lg text-xs font-semibold transition-colors disabled:opacity-50"
            >
              <Upload className="w-4 h-4 text-emerald-700" />
              <span>{importingExcel ? '批次載入中...' : '匯入 Excel 批次載入'}</span>
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx, .xls, .csv"
              className="hidden"
              onChange={handleFileUpload}
            />
            <button
              type="button"
              onClick={onAddPart}
              className="flex items-center justify-center space-x-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs sm:text-sm font-semibold transition-colors shadow-xs"
            >
              <Plus className="w-4 h-4" />
              <span>新增備品</span>
            </button>
          </div>
        </div>

        {/* Filters and Search */}
        <div className="flex flex-col gap-3 pt-3 border-t border-slate-100">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
            {/* Search Input */}
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="依料號、品名 (變頻器/接觸器)、廠牌、型號或儲位搜尋..."
                className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg text-sm bg-slate-50 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            {/* Filter by Storage Location */}
            <select
              value={selectedStorageFilter}
              onChange={(e) => setSelectedStorageFilter(e.target.value)}
              className="px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-emerald-500 shrink-0"
            >
              <option value="ALL">全部儲位 ({storageLocations.length} 處)</option>
              {storageLocations.map((loc) => (
                <option key={loc} value={loc}>
                  {loc}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center justify-between flex-wrap gap-2 pt-1">
            {/* Quick stock status pill filters */}
            <div className="flex items-center space-x-1.5 overflow-x-auto text-xs">
              <span className="text-slate-500 font-medium mr-1">庫存狀態：</span>
              <button
                type="button"
                onClick={() => setStockStatusFilter('ALL')}
                className={`px-2.5 py-1 rounded-md font-semibold transition-colors ${
                  stockStatusFilter === 'ALL'
                    ? 'bg-slate-800 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                全部 ({partsList.length})
              </button>
              <button
                type="button"
                onClick={() => setStockStatusFilter('OUT')}
                className={`px-2.5 py-1 rounded-md font-semibold transition-colors flex items-center space-x-1 ${
                  stockStatusFilter === 'OUT'
                    ? 'bg-rose-600 text-white'
                    : 'bg-rose-50 text-rose-700 hover:bg-rose-100'
                }`}
              >
                <span>缺料</span>
                <span>({partsList.filter((p) => p.stockQty <= 0).length})</span>
              </button>
              <button
                type="button"
                onClick={() => setStockStatusFilter('LOW')}
                className={`px-2.5 py-1 rounded-md font-semibold transition-colors flex items-center space-x-1 ${
                  stockStatusFilter === 'LOW'
                    ? 'bg-amber-600 text-white'
                    : 'bg-amber-50 text-amber-700 hover:bg-amber-100'
                }`}
              >
                <span>庫存低於預警</span>
                <span>
                  ({partsList.filter((p) => p.stockQty > 0 && p.stockQty <= (p.minStockQty ?? 0)).length})
                </span>
              </button>
              <button
                type="button"
                onClick={() => setStockStatusFilter('OK')}
                className={`px-2.5 py-1 rounded-md font-semibold transition-colors flex items-center space-x-1 ${
                  stockStatusFilter === 'OK'
                    ? 'bg-emerald-600 text-white'
                    : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                }`}
              >
                <span>充足</span>
                <span>
                  ({partsList.filter((p) => p.stockQty > (p.minStockQty ?? 0)).length})
                </span>
              </button>
            </div>

            {/* View Mode Toggle */}
            <div className="flex items-center space-x-1 bg-slate-100 p-1 rounded-lg shrink-0">
              <button
                type="button"
                onClick={() => setViewMode('cards')}
                className={`p-1.5 rounded-md text-xs font-medium flex items-center space-x-1 transition-colors ${
                  viewMode === 'cards'
                    ? 'bg-white text-emerald-700 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Grid className="w-4 h-4" />
                <span>卡片</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode('table')}
                className={`p-1.5 rounded-md text-xs font-medium flex items-center space-x-1 transition-colors ${
                  viewMode === 'table'
                    ? 'bg-white text-emerald-700 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <List className="w-4 h-4" />
                <span>列表</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Cards View */}
      {viewMode === 'cards' && (
        <>
          {filteredParts.length === 0 ? (
            <div className="bg-white p-12 text-center rounded-xl border border-slate-200">
              <Wrench className="w-12 h-12 text-slate-400 mx-auto mb-3" />
              <p className="text-base font-semibold text-slate-800">查無符合條件的備品物料</p>
              <p className="text-xs text-slate-500 mt-1">請嘗試變更搜尋關鍵字、品名或儲位篩選</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredParts.map((part) => {
                const isOutOfStock = part.stockQty <= 0;
                const isLowStock =
                  part.stockQty <= (part.minStockQty ?? 0) && part.stockQty > 0;
                const manualCount = part.files.filter((f) => f.fileType === 'manual' || f.fileType === 'spec_sheet').length;
                const photoCount = part.files.filter(
                  (f) =>
                    f.fileType === 'component_photo' ||
                    f.mimeType?.startsWith('image/') ||
                    f.storedFilename?.match(/\.(png|jpe?g|webp|svg)$/i)
                ).length;
                const previewPhoto = part.files.find(
                  (f) =>
                    f.fileType === 'component_photo' ||
                    f.mimeType?.startsWith('image/') ||
                    f.storedFilename?.match(/\.(png|jpe?g|webp|svg)$/i)
                );
                const usingCount = allEquipment.filter((e) =>
                  e.componentPartNumbers.includes(part.partNumber)
                ).length;

                return (
                  <div
                    key={part.partNumber}
                    onClick={() => onSelectPart(part.partNumber)}
                    className="bg-white border border-slate-200 hover:border-emerald-500 hover:shadow-md rounded-xl p-4 sm:p-5 cursor-pointer transition-all flex flex-col justify-between group"
                  >
                    <div>
                      {/* Top Row: Part Info on Left, Photo Preview on Right */}
                      <div className="flex items-start justify-between gap-3">
                        {/* Left Info Column */}
                        <div className="min-w-0 flex-1">
                          {/* Top Part Number & Name */}
                          <div className="flex items-center flex-wrap gap-1.5">
                            <span className="font-mono text-xs sm:text-sm font-bold bg-emerald-50 text-emerald-800 border border-emerald-200 px-2.5 py-0.5 rounded-md">
                              {part.partNumber}
                            </span>
                            <span className="text-xs px-2 py-0.5 bg-slate-100 text-slate-700 rounded-md font-medium">
                              {part.name}
                            </span>
                          </div>

                          {/* Brand & Model */}
                          <h3 className="text-base font-bold text-slate-900 mt-2.5 group-hover:text-emerald-700 transition-colors line-clamp-2 leading-snug">
                            {part.brand ? `${part.brand} ` : ''}
                            {part.model || part.name}
                          </h3>
                        </div>

                        {/* Right Photo Preview */}
                        <div className="w-20 h-20 sm:w-24 sm:h-24 shrink-0 rounded-lg overflow-hidden bg-slate-50 border border-slate-200 flex flex-col items-center justify-center relative group-hover:border-emerald-400 transition-colors">
                          {previewPhoto ? (
                            <>
                              <img
                                src={previewPhoto.url}
                                alt={part.name}
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
                            <div className="flex flex-col items-center justify-center text-slate-300 p-1.5 text-center select-none">
                              <Image className="w-5 h-5 stroke-[1.5]" />
                              <span className="text-[10px] text-slate-400 mt-0.5 font-medium">尚無照片</span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* High-Visibility KPI Grid (Stock & Storage) */}
                      <div className="grid grid-cols-2 gap-2 mt-3.5">
                        {/* Storage Location Box */}
                        <div className="p-2.5 bg-blue-50/70 border border-blue-200 rounded-lg">
                          {(() => {
                            const locList = (part.storageLocations && part.storageLocations.length > 0)
                              ? part.storageLocations
                              : (part.storageLocation ? part.storageLocation.split(/[,/、，\n]+/).map((s) => s.trim()).filter(Boolean) : []);
                            return (
                              <>
                                <div className="flex items-center justify-between">
                                  <span className="text-[10px] font-bold text-blue-600 uppercase tracking-wider block">
                                    存放儲位
                                  </span>
                                  {locList.length > 1 && (
                                    <span className="text-[10px] font-bold text-blue-700 bg-blue-100 px-1.5 py-0.2 rounded">
                                      共 {locList.length} 處
                                    </span>
                                  )}
                                </div>
                                <span
                                  title={locList.join('、') || '未指定'}
                                  className="font-mono font-bold text-xs sm:text-sm text-blue-900 truncate block mt-0.5"
                                >
                                  {locList[0] || '未指定'}
                                </span>
                              </>
                            );
                          })()}
                        </div>

                        {/* Stock Quantity Box */}
                        <div
                          className={`p-2.5 border rounded-lg flex items-center justify-between ${
                            isOutOfStock
                              ? 'bg-rose-50 border-rose-200 text-rose-800'
                              : isLowStock
                              ? 'bg-amber-50 border-amber-200 text-amber-800'
                              : 'bg-emerald-50 border-emerald-200 text-emerald-800'
                          }`}
                        >
                          <div>
                            <span className="text-[10px] font-bold uppercase tracking-wider block">
                              現有庫存
                            </span>
                            <span className="font-mono font-extrabold text-base sm:text-lg block leading-none mt-1">
                              {part.stockQty}
                            </span>
                          </div>

                          {/* Quick Adjust Buttons */}
                          <div className="flex flex-col space-y-1">
                            <button
                              type="button"
                              onClick={(e) => handleQuickAdjust(part.partNumber, 1, e)}
                              title="入庫 +1"
                              className="p-1 bg-white hover:bg-slate-100 rounded text-slate-700 shadow-2xs text-[10px] font-bold"
                            >
                              +
                            </button>
                            <button
                              type="button"
                              disabled={part.stockQty <= 0}
                              onClick={(e) => handleQuickAdjust(part.partNumber, -1, e)}
                              title="出庫 -1"
                              className="p-1 bg-white hover:bg-slate-100 disabled:opacity-40 rounded text-slate-700 shadow-2xs text-[10px] font-bold"
                            >
                              -
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Bottom Badges & Navigation */}
                    <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                      <div className="flex items-center space-x-2">
                        {manualCount > 0 && (
                          <span
                            title={`${manualCount} 份手冊/規格書`}
                            className="flex items-center space-x-1 text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded text-[11px]"
                          >
                            <BookOpen className="w-3 h-3" />
                            <span>{manualCount} 手冊</span>
                          </span>
                        )}
                        {usingCount > 0 && (
                          <span
                            title={`${usingCount} 台設備使用中`}
                            className="flex items-center space-x-1 text-blue-700 bg-blue-50 px-2 py-0.5 rounded text-[11px]"
                          >
                            <Layers className="w-3 h-3" />
                            <span>{usingCount} 台使用</span>
                          </span>
                        )}
                      </div>

                      <span className="text-emerald-700 group-hover:translate-x-1 transition-transform flex items-center space-x-0.5 font-medium text-xs">
                        <span>查看手冊與儲位</span>
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

      {/* Table View */}
      {viewMode === 'table' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  <th className="py-3 px-4">料號</th>
                  <th className="py-3 px-4">品名</th>
                  <th className="py-3 px-4">廠牌</th>
                  <th className="py-3 px-4">型號規格</th>
                  <th className="py-3 px-4 text-center">庫存量</th>
                  <th className="py-3 px-4">儲位</th>
                  <th className="py-3 px-4 text-center">原廠手冊</th>
                  <th className="py-3 px-4 text-center">共用設備</th>
                  <th className="py-3 px-4 text-right">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredParts.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-8 text-center text-slate-400">
                      查無符合條件的備品
                    </td>
                  </tr>
                ) : (
                  filteredParts.map((part) => {
                    const isOutOfStock = part.stockQty <= 0;
                    const isLowStock =
                      part.stockQty <= (part.minStockQty ?? 0) && part.stockQty > 0;
                    const manualCount = part.files.filter((f) => f.fileType === 'manual' || f.fileType === 'spec_sheet').length;
                    const usingCount = allEquipment.filter((e) =>
                      e.componentPartNumbers.includes(part.partNumber)
                    ).length;

                    return (
                      <tr
                        key={part.partNumber}
                        onClick={() => onSelectPart(part.partNumber)}
                        className="hover:bg-emerald-50/40 cursor-pointer transition-colors"
                      >
                        <td className="py-3 px-4 font-mono font-bold text-emerald-800">
                          {part.partNumber}
                        </td>
                        <td className="py-3 px-4 font-semibold text-slate-900">{part.name}</td>
                        <td className="py-3 px-4 text-xs text-slate-700">{part.brand || '-'}</td>
                        <td className="py-3 px-4 font-mono text-xs text-slate-600">
                          {part.model || '-'}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span
                            className={`font-mono font-bold text-sm px-2.5 py-0.5 rounded-md inline-block ${
                              isOutOfStock
                                ? 'bg-rose-100 text-rose-800'
                                : isLowStock
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-emerald-100 text-emerald-800'
                            }`}
                          >
                            {part.stockQty}
                          </span>
                        </td>
                        <td className="py-3 px-4 font-mono text-xs">
                          {(() => {
                            const locList = (part.storageLocations && part.storageLocations.length > 0)
                              ? part.storageLocations
                              : (part.storageLocation ? part.storageLocation.split(/[,/、，\n]+/).map((s) => s.trim()).filter(Boolean) : []);
                            if (locList.length === 0) return <span className="text-slate-400">-</span>;
                            if (locList.length === 1) {
                              return <span className="font-bold text-blue-800">{locList[0]}</span>;
                            }
                            return (
                              <div className="flex flex-col gap-0.5">
                                <span className="font-bold text-blue-800">{locList[0]}</span>
                                <span className="text-[10px] text-blue-600 font-normal">
                                  +{locList.length - 1} 處 ({locList.slice(1).join('、')})
                                </span>
                              </div>
                            );
                          })()}
                        </td>
                        <td className="py-3 px-4 text-center text-xs">
                          {manualCount > 0 ? (
                            <span className="text-emerald-700 font-semibold">{manualCount} 份</span>
                          ) : (
                            <span className="text-slate-400">-</span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-center text-xs font-mono font-bold text-slate-700">
                          {usingCount} 台
                        </td>
                        <td className="py-3 px-4 text-right">
                          <span className="text-emerald-700 font-semibold text-xs hover:underline">
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
