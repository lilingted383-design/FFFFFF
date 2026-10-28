import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Upload,
  Clipboard,
  Image,
  FileText,
  X,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Plus,
  Sparkles,
} from 'lucide-react';
import { FileRecord, FileType } from '../types.ts';
import { uploadMultipleFiles } from '../services/api.ts';

interface PasteAndBatchUploadZoneProps {
  fileType: FileType;
  title: string;
  subtitle?: string;
  accept?: string;
  onFilesUploaded: (records: FileRecord[]) => void;
  compact?: boolean;
}

interface PendingFile {
  id: string;
  file: File;
  previewUrl: string | null;
  name: string;
  size: number;
  isImage: boolean;
}

export const PasteAndBatchUploadZone: React.FC<PasteAndBatchUploadZoneProps> = ({
  fileType,
  title,
  subtitle = '',
  accept = 'image/*,.pdf',
  onFilesUploaded,
  compact = false,
}) => {
  const [pendingFiles, setPendingFiles] = useState<PendingFile[]>([]);
  const [batchDescription, setBatchDescription] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(
    null
  );
  const [autoUploadOnPaste, setAutoUploadOnPaste] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const zoneRef = useRef<HTMLDivElement>(null);

  // Helper to format file size
  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  // Convert File to PendingFile with preview
  const processFiles = useCallback((files: File[]): PendingFile[] => {
    return files.map((file, idx) => {
      const isImg = file.type.startsWith('image/');
      let previewUrl: string | null = null;
      if (isImg) {
        previewUrl = URL.createObjectURL(file);
      }
      return {
        id: `pending_${Date.now()}_${idx}_${Math.random().toString(36).substring(2, 7)}`,
        file,
        previewUrl,
        name: file.name,
        size: file.size,
        isImage: isImg,
      };
    });
  }, []);

  // Add files to pending queue
  const addFilesToQueue = useCallback(
    async (files: File[]) => {
      if (files.length === 0) return;
      const newItems = processFiles(files);

      if (autoUploadOnPaste && newItems.length > 0) {
        // Auto upload immediately
        setIsUploading(true);
        setStatusMessage(null);
        try {
          const records = await uploadMultipleFiles(files, fileType, batchDescription);
          onFilesUploaded(records);
          setStatusMessage({
            type: 'success',
            text: `已自動成功上傳 ${records.length} 個檔案！`,
          });
          setTimeout(() => setStatusMessage(null), 4000);
        } catch (err: unknown) {
          setStatusMessage({
            type: 'error',
            text: err instanceof Error ? err.message : '上傳失敗',
          });
        } finally {
          setIsUploading(false);
        }
      } else {
        setPendingFiles((prev) => [...prev, ...newItems]);
        setStatusMessage({
          type: 'success',
          text: `已加入 ${newItems.length} 個檔案，點擊「確認批次上傳」即可保存`,
        });
      }
    },
    [autoUploadOnPaste, fileType, batchDescription, onFilesUploaded, processFiles]
  );

  // Clean up object URLs
  const removePendingFile = (id: string) => {
    setPendingFiles((prev) => {
      const target = prev.find((item) => item.id === id);
      if (target?.previewUrl) {
        URL.revokeObjectURL(target.previewUrl);
      }
      return prev.filter((item) => item.id !== id);
    });
  };

  const clearAllPending = () => {
    pendingFiles.forEach((item) => {
      if (item.previewUrl) URL.revokeObjectURL(item.previewUrl);
    });
    setPendingFiles([]);
  };

  // Clipboard Paste Handler (attached to window or zone)
  const handlePaste = useCallback(
    (e: ClipboardEvent) => {
      // Don't intercept if user is typing in an input or textarea
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
      const files: File[] = [];

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
            const renamedFile = new File([blob], `${prefix}_${timeStr}_${i + 1}${ext}`, {
              type: blob.type,
            });
            files.push(renamedFile);
          }
        }
      }

      if (files.length > 0) {
        e.preventDefault();
        addFilesToQueue(files);
      }
    },
    [fileType, addFilesToQueue]
  );

  useEffect(() => {
    window.addEventListener('paste', handlePaste);
    return () => {
      window.removeEventListener('paste', handlePaste);
    };
  }, [handlePaste]);

  // Click to paste via Clipboard API
  const handleReadClipboardClick = async () => {
    try {
      if (!navigator.clipboard || !navigator.clipboard.read) {
        alert('請直接在鍵盤按下 Ctrl+V (或 Cmd+V) 即可貼上剪貼簿照片！');
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
        addFilesToQueue(files);
      } else {
        alert('剪貼簿中未偵測到圖片。請先截圖或複製照片後，再按 Ctrl+V 貼上！');
      }
    } catch {
      alert('請直接在畫面上按 Ctrl+V (或 Mac Cmd+V) 即可貼上剪貼簿圖片！');
    }
  };

  // Drag & drop handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const droppedFiles = Array.from(e.dataTransfer.files);
      addFilesToQueue(droppedFiles);
    }
  };

  // File input change
  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const selected = Array.from(e.target.files);
      addFilesToQueue(selected);
      e.target.value = '';
    }
  };

  // Perform Batch Upload
  const handleUploadAll = async () => {
    if (pendingFiles.length === 0) return;
    setIsUploading(true);
    setStatusMessage(null);
    try {
      const filesToUpload = pendingFiles.map((p) => p.file);
      const records = await uploadMultipleFiles(filesToUpload, fileType, batchDescription);
      onFilesUploaded(records);
      clearAllPending();
      setBatchDescription('');
      setStatusMessage({
        type: 'success',
        text: `成功批次上傳 ${records.length} 個檔案！`,
      });
      setTimeout(() => setStatusMessage(null), 5000);
    } catch (err: unknown) {
      setStatusMessage({
        type: 'error',
        text: err instanceof Error ? err.message : '批次上傳失敗，請重試',
      });
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Drop / Paste Container */}
      <div
        ref={zoneRef}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`relative border-2 border-dashed rounded-xl transition-all p-4 sm:p-5 text-center ${
          isDragging
            ? 'border-blue-500 bg-blue-50/80 scale-[1.01]'
            : 'border-slate-300 hover:border-blue-400 bg-slate-50/70 hover:bg-slate-50'
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept={accept}
          onChange={handleFileInputChange}
          className="sr-only"
        />

        <div className="flex flex-col items-center justify-center space-y-2">
          <div className="flex items-center space-x-2">
            <span className="p-2.5 bg-blue-100 text-blue-700 rounded-xl shadow-xs">
              <Clipboard className="w-5 h-5 sm:w-6 sm:h-6" />
            </span>
            <span className="p-2.5 bg-emerald-100 text-emerald-700 rounded-xl shadow-xs">
              <Upload className="w-5 h-5 sm:w-6 sm:h-6" />
            </span>
          </div>

          <div>
            <h4 className="text-sm sm:text-base font-bold text-slate-900 flex items-center justify-center space-x-1.5">
              <span>{title}</span>
              <span className="text-[11px] font-mono px-2 py-0.5 bg-blue-600 text-white rounded-full font-semibold">
                支援 Ctrl+V 貼上
              </span>
            </h4>
            <p className="text-xs text-slate-500 mt-1 max-w-lg mx-auto">{subtitle}</p>
          </div>

          {/* Quick Action Buttons */}
          <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
            <button
              type="button"
              onClick={handleReadClipboardClick}
              className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-xs flex items-center space-x-1.5 transition-colors"
            >
              <Clipboard className="w-4 h-4" />
              <span>貼上剪貼簿照片 (Ctrl+V)</span>
            </button>

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="px-3.5 py-2 bg-white hover:bg-slate-100 border border-slate-300 text-slate-700 rounded-lg text-xs font-semibold shadow-2xs flex items-center space-x-1.5 transition-colors"
            >
              <Plus className="w-4 h-4 text-slate-500" />
              <span>批次選取多個檔案 (多選)</span>
            </button>
          </div>

          {/* Shortcut hint */}
          <div className="text-[11px] text-slate-400 pt-1 flex items-center space-x-2">
            <span>💡 提示：使用螢幕截圖（Win+Shift+S / 複製圖片）後，直接在畫面按 Ctrl+V 即可貼上</span>
          </div>
        </div>
      </div>

      {/* Status Alert */}
      {statusMessage && (
        <div
          className={`p-3 rounded-lg text-xs font-medium flex items-center space-x-2 border ${
            statusMessage.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
              : 'bg-rose-50 text-rose-800 border-rose-200'
          }`}
        >
          {statusMessage.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 shrink-0" />
          )}
          <span>{statusMessage.text}</span>
        </div>
      )}

      {/* Pending Files Queue (Preview before upload) */}
      {pendingFiles.length > 0 && (
        <div className="bg-white rounded-xl border border-blue-200 p-4 shadow-sm space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-slate-100">
            <div className="flex items-center space-x-2">
              <span className="font-bold text-sm text-slate-900">
                待上傳清單（已貼上 / 選擇 {pendingFiles.length} 個檔案）
              </span>
              <span className="text-xs text-slate-500 font-mono">
                共 {formatSize(pendingFiles.reduce((acc, cur) => acc + cur.size, 0))}
              </span>
            </div>

            <div className="flex items-center space-x-2">
              <button
                type="button"
                onClick={clearAllPending}
                disabled={isUploading}
                className="text-xs text-slate-500 hover:text-rose-600 px-2 py-1 rounded hover:bg-slate-100"
              >
                清空清單
              </button>
              <button
                type="button"
                onClick={handleUploadAll}
                disabled={isUploading}
                className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-xs flex items-center space-x-1.5 disabled:opacity-50"
              >
                {isUploading ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>上傳中...</span>
                  </>
                ) : (
                  <>
                    <Upload className="w-3.5 h-3.5" />
                    <span>一鍵全部上傳保存 ({pendingFiles.length})</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Description field for this batch */}
          <div className="flex items-center space-x-2">
            <input
              type="text"
              value={batchDescription}
              onChange={(e) => setBatchDescription(e.target.value)}
              placeholder="可選：輸入此批次照片或線路圖的備註說明（例如：2026現場實景照、控制迴路修改）..."
              className="flex-1 px-3 py-1.5 border border-slate-300 rounded-lg text-xs bg-slate-50 focus:bg-white focus:outline-hidden focus:ring-1 focus:ring-blue-500"
            />
          </div>

          {/* Thumbnails Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 pt-2">
            {pendingFiles.map((item) => (
              <div
                key={item.id}
                className="group relative border border-slate-200 rounded-lg overflow-hidden bg-slate-900 flex flex-col justify-between shadow-2xs hover:shadow-xs transition-shadow"
              >
                <div className="aspect-square w-full bg-slate-950 flex items-center justify-center overflow-hidden">
                  {item.isImage && item.previewUrl ? (
                    <img
                      src={item.previewUrl}
                      alt={item.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                    />
                  ) : (
                    <div className="flex flex-col items-center justify-center p-2 text-slate-300">
                      <FileText className="w-8 h-8 text-blue-400 mb-1" />
                      <span className="text-[10px] uppercase font-bold text-slate-400">PDF 文件</span>
                    </div>
                  )}
                </div>

                <div className="p-1.5 bg-white border-t border-slate-100 flex items-center justify-between">
                  <div className="truncate pr-1">
                    <p className="text-[11px] font-medium text-slate-800 truncate" title={item.name}>
                      {item.name}
                    </p>
                    <p className="text-[10px] text-slate-400 font-mono">{formatSize(item.size)}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => removePendingFile(item.id)}
                    title="移除此項"
                    className="p-1 text-slate-400 hover:text-rose-600 rounded"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
