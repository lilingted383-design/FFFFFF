import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Upload,
  X,
  File as FileIcon,
  AlertCircle,
  Loader2,
  Clipboard,
  Image as ImageIcon,
  CheckCircle2,
} from 'lucide-react';
import { FileRecord, FileType } from '../types.ts';
import { uploadMultipleFiles } from '../services/api.ts';

interface FileUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUploaded: (fileRecords: FileRecord[]) => void;
  targetType: 'equipment' | 'spare_part';
  defaultFileType?: FileType;
}

interface SelectedFileItem {
  id: string;
  file: File;
  previewUrl: string | null;
  name: string;
  size: number;
}

export const FileUploadModal: React.FC<FileUploadModalProps> = ({
  isOpen,
  onClose,
  onUploaded,
  targetType,
  defaultFileType,
}) => {
  const [selectedFiles, setSelectedFiles] = useState<SelectedFileItem[]>([]);
  const [fileType, setFileType] = useState<FileType>(
    defaultFileType || (targetType === 'equipment' ? 'circuit_diagram' : 'manual')
  );
  const [description, setDescription] = useState('');
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (defaultFileType) {
      setFileType(defaultFileType);
    }
  }, [defaultFileType]);

  // Clean preview URLs when modal closes or unmounts
  useEffect(() => {
    if (!isOpen) {
      selectedFiles.forEach((item) => {
        if (item.previewUrl) URL.revokeObjectURL(item.previewUrl);
      });
      setSelectedFiles([]);
      setDescription('');
      setError(null);
    }
  }, [isOpen]);

  const addFiles = useCallback((files: File[]) => {
    if (files.length === 0) return;
    const newItems: SelectedFileItem[] = files.map((f, i) => {
      const isImg = f.type.startsWith('image/');
      return {
        id: `${Date.now()}_${i}_${Math.random().toString(36).substring(2, 6)}`,
        file: f,
        previewUrl: isImg ? URL.createObjectURL(f) : null,
        name: f.name,
        size: f.size,
      };
    });
    setSelectedFiles((prev) => [...prev, ...newItems]);
    setError(null);
  }, []);

  // Listen for paste event inside modal
  const handlePaste = useCallback(
    (e: ClipboardEvent) => {
      if (!isOpen) return;
      const activeEl = document.activeElement;
      if (
        activeEl &&
        (activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA') &&
        activeEl.getAttribute('type') !== 'file'
      ) {
        return;
      }

      if (!e.clipboardData) return;
      const items = e.clipboardData.items;
      const pastedFiles: File[] = [];

      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        if (item.type.indexOf('image') !== -1) {
          const blob = item.getAsFile();
          if (blob) {
            const now = new Date();
            const timeStr = `${now.getFullYear()}${(now.getMonth() + 1)
              .toString()
              .padStart(2, '0')}${now.getDate().toString().padStart(2, '0')}_${now
              .getHours()
              .toString()
              .padStart(2, '0')}${now.getMinutes().toString().padStart(2, '0')}${now
              .getSeconds()
              .toString()
              .padStart(2, '0')}`;
            const ext = blob.type === 'image/jpeg' ? '.jpg' : '.png';
            const prefix =
              fileType === 'circuit_diagram'
                ? '線路圖_貼上'
                : fileType === 'site_photo'
                ? '現場照片_貼上'
                : '元件照片_貼上';
            const f = new File([blob], `${prefix}_${timeStr}_${i + 1}${ext}`, {
              type: blob.type,
            });
            pastedFiles.push(f);
          }
        }
      }

      if (pastedFiles.length > 0) {
        e.preventDefault();
        addFiles(pastedFiles);
      }
    },
    [isOpen, fileType, addFiles]
  );

  useEffect(() => {
    window.addEventListener('paste', handlePaste);
    return () => {
      window.removeEventListener('paste', handlePaste);
    };
  }, [handlePaste]);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      addFiles(Array.from(e.target.files));
      e.target.value = '';
    }
  };

  const handleReadClipboard = async () => {
    try {
      if (!navigator.clipboard || !navigator.clipboard.read) {
        alert('請直接在鍵盤按下 Ctrl+V (或 Mac Cmd+V) 即可貼上剪貼簿照片！');
        return;
      }
      const clipboardItems = await navigator.clipboard.read();
      const files: File[] = [];

      for (const item of clipboardItems) {
        for (const type of item.types) {
          if (type.startsWith('image/')) {
            const blob = await item.getType(type);
            const now = new Date();
            const timeStr = `${now.getFullYear()}${(now.getMonth() + 1)
              .toString()
              .padStart(2, '0')}${now.getDate().toString().padStart(2, '0')}_${now
              .getHours()
              .toString()
              .padStart(2, '0')}${now.getMinutes().toString().padStart(2, '0')}`;
            const ext = type === 'image/jpeg' ? '.jpg' : '.png';
            const prefix =
              fileType === 'circuit_diagram'
                ? '線路圖_貼上'
                : fileType === 'site_photo'
                ? '現場照片_貼上'
                : '元件照片_貼上';
            const f = new File([blob], `${prefix}_${timeStr}${ext}`, { type });
            files.push(f);
          }
        }
      }

      if (files.length > 0) {
        addFiles(files);
      } else {
        alert('剪貼簿中未偵測到圖片。請先截圖或複製圖片後，按 Ctrl+V 貼上！');
      }
    } catch {
      alert('請直接在鍵盤按下 Ctrl+V (或 Cmd+V) 即可貼上剪貼簿照片！');
    }
  };

  const removeFile = (id: string) => {
    setSelectedFiles((prev) => {
      const item = prev.find((x) => x.id === id);
      if (item?.previewUrl) URL.revokeObjectURL(item.previewUrl);
      return prev.filter((x) => x.id !== id);
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedFiles.length === 0) {
      setError('請選擇或貼上至少一個檔案');
      return;
    }

    setUploading(true);
    setError(null);
    try {
      const filesToUpload = selectedFiles.map((x) => x.file);
      const records = await uploadMultipleFiles(filesToUpload, fileType, description);
      onUploaded(records);
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : '上傳失敗');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
      <div className="w-full max-w-xl bg-white rounded-xl shadow-2xl border border-slate-200 overflow-hidden text-slate-800 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 bg-slate-50">
          <div className="flex items-center space-x-2">
            <Upload className="w-5 h-5 text-blue-600" />
            <h3 className="font-semibold text-slate-900">
              {targetType === 'equipment' ? '上傳設備文件 / 現場照片' : '上傳備品手冊 / 元件照片'}
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

        <form onSubmit={handleSubmit} className="p-5 space-y-4 overflow-y-auto flex-1">
          {error && (
            <div className="flex items-center space-x-2 p-3 text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Drag & Paste Zone */}
          <div>
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragging(true);
              }}
              onDragLeave={(e) => {
                e.preventDefault();
                setIsDragging(false);
              }}
              onDrop={(e) => {
                e.preventDefault();
                setIsDragging(false);
                if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                  addFiles(Array.from(e.dataTransfer.files));
                }
              }}
              className={`p-5 border-2 border-dashed rounded-xl text-center transition-all ${
                isDragging
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-slate-300 hover:border-blue-400 bg-slate-50'
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept=".pdf,image/*,.doc,.docx"
                onChange={handleFileChange}
                className="sr-only"
              />

              <div className="space-y-2">
                <div className="flex items-center justify-center space-x-2">
                  <span className="p-2 bg-blue-100 text-blue-700 rounded-lg">
                    <Clipboard className="w-5 h-5" />
                  </span>
                  <span className="p-2 bg-emerald-100 text-emerald-700 rounded-lg">
                    <Upload className="w-5 h-5" />
                  </span>
                </div>

                <div className="text-sm font-semibold text-slate-800">
                  支援直接按 Ctrl+V 貼上照片，或一次拖曳多個檔案
                </div>
                <p className="text-xs text-slate-500">
                  可一次選取多張照片或 PDF，無需一張張上傳
                </p>

                <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
                  <button
                    type="button"
                    onClick={handleReadClipboard}
                    className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-xs flex items-center space-x-1"
                  >
                    <Clipboard className="w-3.5 h-3.5" />
                    <span>貼上剪貼簿照片 (Ctrl+V)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="px-3 py-1.5 bg-white hover:bg-slate-100 border border-slate-300 text-slate-700 rounded-lg text-xs font-semibold shadow-2xs flex items-center space-x-1"
                  >
                    <FileIcon className="w-3.5 h-3.5 text-slate-500" />
                    <span>批次選取多個檔案</span>
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Selected Files List */}
          {selectedFiles.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs font-bold text-slate-700">
                <span>已選取 {selectedFiles.length} 個檔案</span>
                <button
                  type="button"
                  onClick={() => setSelectedFiles([])}
                  className="text-slate-400 hover:text-rose-600 font-normal"
                >
                  清空
                </button>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-48 overflow-y-auto p-1 border border-slate-200 rounded-lg bg-slate-50">
                {selectedFiles.map((item) => (
                  <div
                    key={item.id}
                    className="relative border border-slate-200 rounded-lg bg-white overflow-hidden p-1.5 flex items-center space-x-2"
                  >
                    <div className="w-10 h-10 rounded bg-slate-100 flex items-center justify-center overflow-hidden shrink-0">
                      {item.previewUrl ? (
                        <img src={item.previewUrl} alt={item.name} className="w-full h-full object-cover" />
                      ) : (
                        <FileIcon className="w-5 h-5 text-slate-400" />
                      )}
                    </div>
                    <div className="truncate flex-1 min-w-0">
                      <p className="text-xs text-slate-800 truncate font-medium">{item.name}</p>
                      <p className="text-[10px] text-slate-400 font-mono">
                        {(item.size / 1024).toFixed(1)} KB
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeFile(item.id)}
                      className="text-slate-400 hover:text-rose-600 p-1"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* File Type */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              文件分類標籤
            </label>
            <select
              value={fileType}
              onChange={(e) => setFileType(e.target.value as FileType)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white text-slate-900 text-sm focus:outline-hidden focus:ring-2 focus:ring-blue-500"
            >
              {targetType === 'equipment' ? (
                <>
                  <option value="circuit_diagram">線路圖 (PDF / 圖片 / 截圖)</option>
                  <option value="site_photo">現場照片 (安裝實景照片)</option>
                  <option value="other">其他設備相關文件</option>
                </>
              ) : (
                <>
                  <option value="manual">原廠操作手冊 (PDF)</option>
                  <option value="spec_sheet">技術規格書 (Datasheet)</option>
                  <option value="component_photo">元件實體照片</option>
                  <option value="other">其他技術文件</option>
                </>
              )}
            </select>
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              檔案備註 / 圖號說明 (選填)
            </label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="例如：主控制盤接線圖 Rev.2、2026年現場拍照銘板"
              className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white text-slate-900 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-blue-500 text-sm"
            />
          </div>

          <div className="flex justify-end space-x-3 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              disabled={uploading}
              className="px-4 py-2 border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50 text-sm font-medium transition-colors"
            >
              取消
            </button>
            <button
              type="submit"
              disabled={uploading || selectedFiles.length === 0}
              className="px-5 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg text-sm font-medium transition-colors flex items-center space-x-2"
            >
              {uploading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>批次上傳中...</span>
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4" />
                  <span>
                    開始上傳保存 {selectedFiles.length > 0 ? `(${selectedFiles.length})` : ''}
                  </span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
