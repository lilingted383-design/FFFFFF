import React, { useState, useMemo } from 'react';
import {
  ChevronRight,
  ChevronDown,
  Box,
  Layers,
  Cpu,
  ArrowRight,
  Maximize2,
  Minimize2,
  FolderTree,
} from 'lucide-react';
import { Equipment, EquipmentHierarchyNode } from '../types.ts';

interface EquipmentHierarchyTreeProps {
  equipmentList: Equipment[];
  onSelectEquipment: (tagNumber: string) => void;
  selectedTagNumber?: string;
}

export const EquipmentHierarchyTree: React.FC<EquipmentHierarchyTreeProps> = ({
  equipmentList,
  onSelectEquipment,
  selectedTagNumber,
}) => {
  const [collapsedMap, setCollapsedMap] = useState<Record<string, boolean>>({});
  const [filterText, setFilterText] = useState('');

  // Build recursive tree
  const treeRoots = useMemo(() => {
    const map = new Map<string, EquipmentHierarchyNode>();
    equipmentList.forEach((eq) => {
      map.set(eq.tagNumber, { equipment: eq, children: [] });
    });

    const roots: EquipmentHierarchyNode[] = [];
    equipmentList.forEach((eq) => {
      const node = map.get(eq.tagNumber)!;
      if (eq.parentTagNumber && map.has(eq.parentTagNumber) && eq.parentTagNumber !== eq.tagNumber) {
        map.get(eq.parentTagNumber)!.children.push(node);
      } else {
        roots.push(node);
      }
    });

    return roots;
  }, [equipmentList]);

  const toggleCollapse = (tag: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setCollapsedMap((prev) => ({ ...prev, [tag]: !prev[tag] }));
  };

  const expandAll = () => setCollapsedMap({});
  const collapseAll = () => {
    const allCollapsed: Record<string, boolean> = {};
    equipmentList.forEach((eq) => {
      allCollapsed[eq.tagNumber] = true;
    });
    setCollapsedMap(allCollapsed);
  };

  const renderNode = (node: EquipmentHierarchyNode, depth = 0) => {
    const { equipment, children } = node;
    const hasChildren = children.length > 0;
    const isCollapsed = !!collapsedMap[equipment.tagNumber];
    const isSelected = equipment.tagNumber === selectedTagNumber;

    // Filter check
    const matchesFilter =
      !filterText ||
      equipment.tagNumber.toLowerCase().includes(filterText.toLowerCase()) ||
      equipment.name.toLowerCase().includes(filterText.toLowerCase()) ||
      equipment.category.toLowerCase().includes(filterText.toLowerCase());

    return (
      <div key={equipment.tagNumber} className="relative">
        <div
          onClick={() => onSelectEquipment(equipment.tagNumber)}
          className={`group flex items-center justify-between py-2 px-3 rounded-lg cursor-pointer transition-colors border ${
            isSelected
              ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
              : matchesFilter
              ? 'bg-white hover:bg-slate-100 border-slate-200 text-slate-800'
              : 'opacity-40 hover:opacity-100 bg-white border-slate-200 text-slate-500'
          }`}
          style={{ marginLeft: `${Math.min(depth * 20, 100)}px` }}
        >
          <div className="flex items-center space-x-2 min-w-0 pr-2">
            {hasChildren ? (
              <button
                type="button"
                onClick={(e) => toggleCollapse(equipment.tagNumber, e)}
                className={`p-1 rounded hover:bg-black/10 transition-colors shrink-0 ${
                  isSelected ? 'text-white' : 'text-slate-500'
                }`}
              >
                {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>
            ) : (
              <span className="w-6 h-4 shrink-0 flex items-center justify-center">
                <span className="w-1.5 h-1.5 rounded-full bg-slate-300" />
              </span>
            )}

            <span
              className={`font-mono font-bold text-xs px-2 py-0.5 rounded shrink-0 ${
                isSelected ? 'bg-blue-800 text-white' : 'bg-slate-100 text-blue-700 border border-slate-200'
              }`}
            >
              {equipment.tagNumber}
            </span>

            <span className="font-medium text-sm truncate">{equipment.name}</span>

            <span
              className={`text-[11px] px-2 py-0.5 rounded-full font-medium shrink-0 hidden sm:inline-block ${
                isSelected ? 'bg-blue-700 text-blue-100' : 'bg-slate-100 text-slate-600'
              }`}
            >
              {equipment.category}
            </span>
          </div>

          <div className="flex items-center space-x-2 shrink-0">
            {equipment.componentPartNumbers.length > 0 && (
              <span
                title={`關聯 ${equipment.componentPartNumbers.length} 項備品元件`}
                className={`flex items-center space-x-1 text-xs px-2 py-0.5 rounded-full ${
                  isSelected ? 'bg-blue-700 text-white' : 'bg-amber-50 text-amber-700 border border-amber-200'
                }`}
              >
                <Cpu className="w-3 h-3" />
                <span>{equipment.componentPartNumbers.length}</span>
              </span>
            )}

            {hasChildren && (
              <span
                title={`包含 ${children.length} 個子設備`}
                className={`text-xs px-1.5 py-0.5 rounded ${
                  isSelected ? 'bg-blue-800 text-white' : 'bg-slate-200 text-slate-700'
                }`}
              >
                {children.length} 子設備
              </span>
            )}

            <ArrowRight
              className={`w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity ${
                isSelected ? 'text-white' : 'text-blue-600'
              }`}
            />
          </div>
        </div>

        {/* Render Children */}
        {hasChildren && !isCollapsed && (
          <div className="mt-1 space-y-1 relative pl-3 border-l-2 border-slate-200 ml-4">
            {children.map((child) => renderNode(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 shadow-xs">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200">
        <div className="flex items-center space-x-2">
          <FolderTree className="w-5 h-5 text-blue-600" />
          <h3 className="font-bold text-slate-900 text-base">設備階層架構樹狀圖</h3>
          <span className="text-xs text-slate-500">（共 {equipmentList.length} 台設備）</span>
        </div>

        <div className="flex items-center space-x-2">
          <input
            type="text"
            value={filterText}
            onChange={(e) => setFilterText(e.target.value)}
            placeholder="搜尋階層中的設備..."
            className="px-3 py-1 text-xs bg-white border border-slate-300 rounded-lg text-slate-800 focus:outline-hidden focus:ring-1 focus:ring-blue-500"
          />
          <button
            type="button"
            onClick={expandAll}
            title="全部展開"
            className="flex items-center space-x-1 px-2.5 py-1 text-xs bg-white hover:bg-slate-100 border border-slate-300 rounded-lg text-slate-700 transition-colors"
          >
            <Maximize2 className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">全部展開</span>
          </button>
          <button
            type="button"
            onClick={collapseAll}
            title="全部收合"
            className="flex items-center space-x-1 px-2.5 py-1 text-xs bg-white hover:bg-slate-100 border border-slate-300 rounded-lg text-slate-700 transition-colors"
          >
            <Minimize2 className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">全部收合</span>
          </button>
        </div>
      </div>

      <div className="mt-3 space-y-2 max-h-[600px] overflow-y-auto pr-1">
        {treeRoots.length === 0 ? (
          <div className="text-center py-8 text-slate-400 text-sm">目前尚無設備資料</div>
        ) : (
          treeRoots.map((root) => renderNode(root, 0))
        )}
      </div>
    </div>
  );
};
