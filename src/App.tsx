import React, { useState, useEffect, useCallback } from 'react';
import {
  Layers,
  Wrench,
  Search,
  Home,
  Database,
  Plus,
  RefreshCw,
  AlertCircle,
  Menu,
  X,
  FileCode,
  FolderTree,
  CheckCircle2,
  Cloud,
} from 'lucide-react';
import { DatabaseSchema, Equipment, SparePart, SystemConfig } from './types.ts';
import {
  fetchDatabase,
  createEquipment,
  updateEquipment,
  deleteEquipment,
  createSparePart,
  updateSparePart,
  deleteSparePart,
  adjustStock,
  toggleAssociation,
  deleteFileRecord,
  updateSystemConfig,
} from './services/api.ts';
import { HomeView } from './components/HomeView.tsx';
import { EquipmentListView } from './components/EquipmentListView.tsx';
import { EquipmentDetailView } from './components/EquipmentDetailView.tsx';
import { EquipmentFormModal } from './components/EquipmentFormModal.tsx';
import { SparePartListView } from './components/SparePartListView.tsx';
import { SparePartDetailView } from './components/SparePartDetailView.tsx';
import { SparePartFormModal } from './components/SparePartFormModal.tsx';
import { BackupSettingsView } from './components/BackupSettingsView.tsx';

type TabType = 'home' | 'equipment' | 'equipment_detail' | 'parts' | 'part_detail' | 'backup';

const RECENT_EQ_KEY = 'elec_mgmt_recent_equipment';
const RECENT_PARTS_KEY = 'elec_mgmt_recent_parts';

export default function App() {
  const [database, setDatabase] = useState<DatabaseSchema | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>('home');

  const [selectedEquipmentTag, setSelectedEquipmentTag] = useState<string | null>(null);
  const [selectedPartNumber, setSelectedPartNumber] = useState<string | null>(null);

  // Modals
  const [isEquipmentModalOpen, setIsEquipmentModalOpen] = useState(false);
  const [editingEquipment, setEditingEquipment] = useState<Equipment | null>(null);

  const [isPartModalOpen, setIsPartModalOpen] = useState(false);
  const [editingPart, setEditingPart] = useState<SparePart | null>(null);

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [actionToast, setActionToast] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const showToast = useCallback((type: 'success' | 'error', text: string) => {
    setActionToast({ type, text });
    setTimeout(() => {
      setActionToast((prev) => (prev?.text === text ? null : prev));
    }, 4500);
  }, []);

  // Recently viewed
  const [recentEquipmentTags, setRecentEquipmentTags] = useState<string[]>(() => {
    try {
      const stored = localStorage.getItem(RECENT_EQ_KEY);
      return stored ? JSON.parse(stored) : ['CR-001', 'CP-01'];
    } catch {
      return ['CR-001', 'CP-01'];
    }
  });

  const [recentPartNumbers, setRecentPartNumbers] = useState<string[]>(() => {
    try {
      const stored = localStorage.getItem(RECENT_PARTS_KEY);
      return stored ? JSON.parse(stored) : ['VFD-FUJI-37K', 'SEN-OMR-PRX'];
    } catch {
      return ['VFD-FUJI-37K', 'SEN-OMR-PRX'];
    }
  });

  // Track recent equipment
  const trackEquipmentView = useCallback((tagNumber: string) => {
    setRecentEquipmentTags((prev) => {
      const filtered = prev.filter((t) => t !== tagNumber);
      const updated = [tagNumber, ...filtered].slice(0, 10);
      try {
        localStorage.setItem(RECENT_EQ_KEY, JSON.stringify(updated));
      } catch {
        // ignore storage errors
      }
      return updated;
    });
  }, []);

  // Track recent part
  const trackPartView = useCallback((partNumber: string) => {
    setRecentPartNumbers((prev) => {
      const filtered = prev.filter((p) => p !== partNumber);
      const updated = [partNumber, ...filtered].slice(0, 10);
      try {
        localStorage.setItem(RECENT_PARTS_KEY, JSON.stringify(updated));
      } catch {
        // ignore storage errors
      }
      return updated;
    });
  }, []);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await fetchDatabase();
      setDatabase(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : '載入資料庫失敗，請確認後端服務運作中');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Navigate to equipment detail
  const handleSelectEquipment = (tagNumber: string) => {
    setSelectedEquipmentTag(tagNumber);
    setActiveTab('equipment_detail');
    trackEquipmentView(tagNumber);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Navigate to part detail
  const handleSelectPart = (partNumber: string) => {
    setSelectedPartNumber(partNumber);
    setActiveTab('part_detail');
    trackPartView(partNumber);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // CRUD for Equipment
  const handleSaveEquipment = async (data: Partial<Equipment>) => {
    try {
      if (editingEquipment) {
        const updated = await updateEquipment(editingEquipment.tagNumber, data);
        setDatabase((prev) => {
          if (!prev) return prev;
          const newEqList = prev.equipment.map((e) =>
            e.tagNumber === editingEquipment.tagNumber ? updated : e
          );
          return { ...prev, equipment: newEqList };
        });
        if (selectedEquipmentTag === editingEquipment.tagNumber) {
          setSelectedEquipmentTag(updated.tagNumber);
        }
        showToast('success', `設備 "${updated.name}" 已儲存至 Cloud Firestore`);
      } else {
        const created = await createEquipment(data);
        setDatabase((prev) => {
          if (!prev) return prev;
          return { ...prev, equipment: [...prev.equipment, created] };
        });
        handleSelectEquipment(created.tagNumber);
        showToast('success', `設備 "${created.name}" 已新增至 Cloud Firestore`);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : '儲存設備失敗';
      showToast('error', msg);
      throw err;
    }
  };

  const handleDeleteEquipment = async (tagNumber: string) => {
    try {
      await deleteEquipment(tagNumber);
      setDatabase((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          equipment: prev.equipment
            .filter((e) => e.tagNumber !== tagNumber)
            .map((e) => (e.parentTagNumber === tagNumber ? { ...e, parentTagNumber: null } : e)),
        };
      });
      setActiveTab('equipment');
      setSelectedEquipmentTag(null);
      showToast('success', `設備 "${tagNumber}" 已從 Cloud Firestore 刪除`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : '刪除設備失敗';
      showToast('error', msg);
    }
  };

  // CRUD for Spare Part
  const handleSavePart = async (data: Partial<SparePart>) => {
    try {
      if (editingPart) {
        const updated = await updateSparePart(editingPart.partNumber, data);
        setDatabase((prev) => {
          if (!prev) return prev;
          const newParts = prev.spareParts.map((p) =>
            p.partNumber === editingPart.partNumber ? updated : p
          );
          return { ...prev, spareParts: newParts };
        });
        if (selectedPartNumber === editingPart.partNumber) {
          setSelectedPartNumber(updated.partNumber);
        }
        showToast('success', `備品 "${updated.name} (${updated.partNumber})" 已成功更新並寫入 Cloud Firestore`);
      } else {
        const created = await createSparePart(data);
        setDatabase((prev) => {
          if (!prev) return prev;
          return { ...prev, spareParts: [...prev.spareParts, created] };
        });
        handleSelectPart(created.partNumber);
        showToast('success', `備品 "${created.name} (${created.partNumber})" 已成功新增至 Cloud Firestore 雲端資料庫`);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : '儲存備品失敗';
      showToast('error', msg);
      throw err;
    }
  };

  const handleDeletePart = async (partNumber: string) => {
    try {
      await deleteSparePart(partNumber);
      setDatabase((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          spareParts: prev.spareParts.filter((p) => p.partNumber !== partNumber),
          equipment: prev.equipment.map((e) => ({
            ...e,
            componentPartNumbers: e.componentPartNumbers.filter((pn) => pn !== partNumber),
          })),
        };
      });
      setActiveTab('parts');
      setSelectedPartNumber(null);
      showToast('success', `備品 "${partNumber}" 已從 Cloud Firestore 刪除`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : '刪除備品失敗';
      showToast('error', msg);
    }
  };

  // Adjust stock
  const handleAdjustStock = async (partNumber: string, delta?: number, absolute?: number) => {
    try {
      const updated = await adjustStock(partNumber, delta, absolute);
      setDatabase((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          spareParts: prev.spareParts.map((p) => (p.partNumber === partNumber ? updated : p)),
        };
      });
      showToast('success', `料號 ${partNumber} 庫存已更新為 ${updated.stockQty} (已寫入 Cloud Firestore)`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : '調整庫存失敗';
      showToast('error', msg);
    }
  };

  // Toggle Association
  const handleToggleAssociation = async (
    tagNumber: string,
    partNumber: string,
    action: 'add' | 'remove'
  ) => {
    try {
      const updatedEquipment = await toggleAssociation(tagNumber, partNumber, action);
      setDatabase((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          equipment: prev.equipment.map((e) =>
            e.tagNumber === tagNumber ? updatedEquipment : e
          ),
        };
      });
      showToast('success', `設備與備品關聯已同步至 Cloud Firestore`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : '更新關聯失敗';
      showToast('error', msg);
    }
  };

  // Delete File Record
  const handleDeleteFile = async (fileId: string) => {
    await deleteFileRecord(fileId);
    setDatabase((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        equipment: prev.equipment.map((e) => ({
          ...e,
          files: e.files.filter((f) => f.id !== fileId),
        })),
        spareParts: prev.spareParts.map((p) => ({
          ...p,
          files: p.files.filter((f) => f.id !== fileId),
        })),
      };
    });
  };

  // Update Config
  const handleUpdateConfig = async (newConfig: SystemConfig) => {
    const updated = await updateSystemConfig(newConfig);
    setDatabase((prev) => (prev ? { ...prev, config: updated } : prev));
  };

  // Open modals
  const handleOpenAddEquipment = () => {
    setEditingEquipment(null);
    setIsEquipmentModalOpen(true);
  };

  const handleOpenEditEquipment = (eq: Equipment) => {
    setEditingEquipment(eq);
    setIsEquipmentModalOpen(true);
  };

  const handleOpenAddPart = () => {
    setEditingPart(null);
    setIsPartModalOpen(true);
  };

  const handleOpenEditPart = (p: SparePart) => {
    setEditingPart(p);
    setIsPartModalOpen(true);
  };

  // Find currently selected items
  const currentEquipment = selectedEquipmentTag
    ? database?.equipment.find((e) => e.tagNumber === selectedEquipmentTag)
    : null;

  const currentPart = selectedPartNumber
    ? database?.spareParts.find((p) => p.partNumber === selectedPartNumber)
    : null;

  if (loading && !database) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center text-white p-4">
        <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4" />
        <h2 className="text-lg font-bold">電控設備與備品管理系統 V1.0</h2>
        <p className="text-xs text-slate-400 mt-1">載入工廠電控資料庫中...</p>
      </div>
    );
  }

  if (error && !database) {
    return (
      <div className="min-h-screen bg-slate-100 flex flex-col items-center justify-center p-4">
        <div className="bg-white p-6 rounded-2xl shadow-lg max-w-md w-full border border-rose-200 text-center">
          <AlertCircle className="w-12 h-12 text-rose-500 mx-auto mb-3" />
          <h2 className="text-lg font-bold text-slate-900 mb-2">系統連線失敗</h2>
          <p className="text-xs text-slate-600 mb-6">{error}</p>
          <button
            type="button"
            onClick={loadData}
            className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-semibold transition-colors flex items-center justify-center space-x-2"
          >
            <RefreshCw className="w-4 h-4" />
            <span>重新嘗試連線</span>
          </button>
        </div>
      </div>
    );
  }

  const allEq = database?.equipment || [];
  const allParts = database?.spareParts || [];
  const config = database?.config || { equipmentCategories: [], partNames: [] };

  return (
    <div className="min-h-screen bg-slate-100/80 text-slate-800 flex flex-col">
      {/* Top Header Bar */}
      <header className="bg-slate-900 text-white sticky top-0 z-40 shadow-md border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          {/* Logo & Title */}
          <div
            onClick={() => setActiveTab('home')}
            className="flex items-center space-x-3 cursor-pointer group"
          >
            <div className="w-9 h-9 rounded-lg bg-blue-600 flex items-center justify-center text-white shadow-sm font-black text-lg group-hover:bg-blue-500 transition-colors">
              電
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-bold text-base sm:text-lg text-white tracking-tight">
                  電控設備與備品管理系統
                </span>
                <span className="text-[10px] font-mono bg-blue-500/20 text-blue-300 border border-blue-400/30 px-1.5 py-0.2 rounded font-bold">
                  V1.0
                </span>
                <span
                  title="資料已儲存於 Firebase Cloud Firestore 雲端資料庫，永久持久保存"
                  className="text-[10px] font-medium bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 px-2 py-0.5 rounded-full flex items-center space-x-1"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                  <span>Cloud Firestore 雲端持久化</span>
                </span>
              </div>
              <span className="text-[11px] text-slate-400 hidden sm:block">
                線路圖檢視 • 現場照片 • 原廠手冊 • 庫存與儲位查詢
              </span>
            </div>
          </div>

          {/* Desktop Nav Items */}
          <nav className="hidden md:flex items-center space-x-1">
            <button
              type="button"
              onClick={() => setActiveTab('home')}
              className={`px-3.5 py-2 rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition-colors ${
                activeTab === 'home'
                  ? 'bg-blue-600 text-white'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800'
              }`}
            >
              <Home className="w-4 h-4" />
              <span>首頁搜尋</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveTab('equipment');
                setSelectedEquipmentTag(null);
              }}
              className={`px-3.5 py-2 rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition-colors ${
                activeTab === 'equipment' || activeTab === 'equipment_detail'
                  ? 'bg-blue-600 text-white'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800'
              }`}
            >
              <Layers className="w-4 h-4" />
              <span>設備清單</span>
              <span className="text-[10px] bg-slate-800 text-slate-300 px-1.5 py-0.2 rounded-full font-mono">
                {allEq.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveTab('parts');
                setSelectedPartNumber(null);
              }}
              className={`px-3.5 py-2 rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition-colors ${
                activeTab === 'parts' || activeTab === 'part_detail'
                  ? 'bg-emerald-600 text-white'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800'
              }`}
            >
              <Wrench className="w-4 h-4" />
              <span>備品庫存與儲位</span>
              <span className="text-[10px] bg-slate-800 text-slate-300 px-1.5 py-0.2 rounded-full font-mono">
                {allParts.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('backup')}
              className={`px-3.5 py-2 rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition-colors ${
                activeTab === 'backup'
                  ? 'bg-indigo-600 text-white'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800'
              }`}
            >
              <Database className="w-4 h-4" />
              <span>備份與設定</span>
            </button>
          </nav>

          {/* Mobile Menu Button */}
          <div className="md:hidden flex items-center space-x-2">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 text-slate-300 hover:text-white rounded-lg hover:bg-slate-800"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>

        {/* Mobile Nav Dropdown */}
        {mobileMenuOpen && (
          <div className="md:hidden bg-slate-900 border-t border-slate-800 px-4 py-3 space-y-2">
            <button
              type="button"
              onClick={() => {
                setActiveTab('home');
                setMobileMenuOpen(false);
              }}
              className="w-full text-left py-2 px-3 rounded-lg text-sm text-slate-200 hover:bg-slate-800 flex items-center space-x-2"
            >
              <Home className="w-4 h-4 text-blue-400" />
              <span>首頁全域搜尋</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveTab('equipment');
                setSelectedEquipmentTag(null);
                setMobileMenuOpen(false);
              }}
              className="w-full text-left py-2 px-3 rounded-lg text-sm text-slate-200 hover:bg-slate-800 flex items-center space-x-2"
            >
              <Layers className="w-4 h-4 text-blue-400" />
              <span>設備管理與線路圖 ({allEq.length})</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveTab('parts');
                setSelectedPartNumber(null);
                setMobileMenuOpen(false);
              }}
              className="w-full text-left py-2 px-3 rounded-lg text-sm text-slate-200 hover:bg-slate-800 flex items-center space-x-2"
            >
              <Wrench className="w-4 h-4 text-emerald-400" />
              <span>備品庫存與儲位 ({allParts.length})</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveTab('backup');
                setMobileMenuOpen(false);
              }}
              className="w-full text-left py-2 px-3 rounded-lg text-sm text-slate-200 hover:bg-slate-800 flex items-center space-x-2"
            >
              <Database className="w-4 h-4 text-indigo-400" />
              <span>資料庫備份與系統設定</span>
            </button>
          </div>
        )}
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8">
        {activeTab === 'home' && (
          <HomeView
            allEquipment={allEq}
            allParts={allParts}
            recentEquipmentTags={recentEquipmentTags}
            recentPartNumbers={recentPartNumbers}
            onSelectEquipment={handleSelectEquipment}
            onSelectPart={handleSelectPart}
            onNavigateTab={(tab) => {
              setActiveTab(tab);
              if (tab === 'equipment') setSelectedEquipmentTag(null);
              if (tab === 'parts') setSelectedPartNumber(null);
            }}
            onAddEquipment={handleOpenAddEquipment}
            onAddPart={handleOpenAddPart}
          />
        )}

        {activeTab === 'equipment' && (
          <EquipmentListView
            equipmentList={allEq}
            allParts={allParts}
            categories={config.equipmentCategories}
            onSelectEquipment={handleSelectEquipment}
            onAddEquipment={handleOpenAddEquipment}
            onEditEquipment={handleOpenEditEquipment}
          />
        )}

        {activeTab === 'equipment_detail' && currentEquipment && (
          <EquipmentDetailView
            equipment={currentEquipment}
            allEquipment={allEq}
            allParts={allParts}
            onBack={() => setActiveTab('equipment')}
            onEdit={handleOpenEditEquipment}
            onDelete={handleDeleteEquipment}
            onSelectPart={handleSelectPart}
            onSelectEquipment={handleSelectEquipment}
            onUpdateEquipment={async (updated) => {
              setDatabase((prev) => {
                if (!prev) return prev;
                return {
                  ...prev,
                  equipment: prev.equipment.map((e) =>
                    e.tagNumber === updated.tagNumber ? updated : e
                  ),
                };
              });
              try {
                await updateEquipment(updated.tagNumber, updated);
              } catch (err) {
                console.error('儲存設備更新失敗:', err);
              }
            }}
            onToggleAssociation={handleToggleAssociation}
            onDeleteFile={handleDeleteFile}
          />
        )}

        {activeTab === 'parts' && (
          <SparePartListView
            partsList={allParts}
            allEquipment={allEq}
            partNames={config.partNames}
            onSelectPart={handleSelectPart}
            onAddPart={handleOpenAddPart}
            onAdjustStock={handleAdjustStock}
          />
        )}

        {activeTab === 'part_detail' && currentPart && (
          <SparePartDetailView
            part={currentPart}
            allEquipment={allEq}
            allParts={allParts}
            onBack={() => setActiveTab('parts')}
            onEdit={handleOpenEditPart}
            onDelete={handleDeletePart}
            onSelectEquipment={handleSelectEquipment}
            onUpdatePart={async (updated) => {
              setDatabase((prev) => {
                if (!prev) return prev;
                return {
                  ...prev,
                  spareParts: prev.spareParts.map((p) =>
                    p.partNumber === updated.partNumber ? updated : p
                  ),
                };
              });
              try {
                await updateSparePart(updated.partNumber, updated);
              } catch (err) {
                console.error('儲存備品更新失敗:', err);
              }
            }}
            onAdjustStock={handleAdjustStock}
            onToggleAssociation={handleToggleAssociation}
            onDeleteFile={handleDeleteFile}
          />
        )}

        {activeTab === 'backup' && (
          <BackupSettingsView
            config={config}
            onUpdateConfig={handleUpdateConfig}
            onRefreshDatabase={loadData}
          />
        )}
      </main>

      {/* Equipment Form Modal */}
      <EquipmentFormModal
        isOpen={isEquipmentModalOpen}
        onClose={() => setIsEquipmentModalOpen(false)}
        onSubmit={handleSaveEquipment}
        initialEquipment={editingEquipment}
        existingEquipments={allEq}
        categories={config.equipmentCategories}
      />

      {/* Spare Part Form Modal */}
      <SparePartFormModal
        isOpen={isPartModalOpen}
        onClose={() => setIsPartModalOpen(false)}
        onSubmit={handleSavePart}
        initialPart={editingPart}
        commonPartNames={config.partNames}
      />

      {/* Action Toast Feedback */}
      {actionToast && (
        <div
          role="status"
          className={`fixed bottom-6 right-6 z-50 max-w-md px-4 py-3 rounded-xl shadow-xl border flex items-center space-x-2.5 text-sm font-medium transition-all ${
            actionToast.type === 'success'
              ? 'bg-slate-900 text-emerald-300 border-emerald-500/50 shadow-emerald-950/20'
              : 'bg-slate-900 text-rose-300 border-rose-500/50 shadow-rose-950/20'
          }`}
        >
          {actionToast.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          ) : (
            <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />
          )}
          <span>{actionToast.text}</span>
        </div>
      )}
    </div>
  );
}
