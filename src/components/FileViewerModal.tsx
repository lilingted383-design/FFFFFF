import React, { useState, useEffect } from 'react';
import {
  Download,
  ExternalLink,
  X,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  FileText,
  Loader2,
  AlertCircle,
  Image as ImageIcon,
} from 'lucide-react';
import { FileRecord } from '../types.ts';

interface FileViewerModalProps {
  file: FileRecord | null;
  onClose: () => void;
}

export const FileViewerModal: React.FC<FileViewerModalProps> = ({ file, onClose }) => {
  const [zoom, setZoom] = useState(1);
  const [imgLoading, setImgLoading] = useState(true);
  const [imgError, setImgError] = useState(false);

  useEffect(() => {
    setZoom(1);
    setImgLoading(true);
    setImgError(false);
  }, [file?.id, file?.url]);

  if (!file) return null;

  const isPdf =
    (file.mimeType && file.mimeType.toLowerCase().includes('pdf')) ||
    file.originalName.toLowerCase().endsWith('.pdf');

  const isImage =
    (file.mimeType && file.mimeType.toLowerCase().includes('image')) ||
    /\.(jpg|jpeg|png|svg|webp|gif|bmp|avif|ico|tiff)$/i.test(file.originalName) ||
    file.fileType === 'site_photo' ||
    file.fileType === 'component_photo';

  const handleZoomIn = () => setZoom((prev) => Math.min(prev + 0.25, 3));
  const handleZoomOut = () => setZoom((prev) => Math.max(prev - 0.25, 0.5));
  const handleResetZoom = () => setZoom(1);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-2 sm:p-4 backdrop-blur-xs">
      <div className="flex flex-col w-full h-[95vh] max-w-6xl bg-slate-900 border border-slate-700 rounded-xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 bg-slate-800 border-b border-slate-700 text-slate-100">
          <div className="flex items-center space-x-3 overflow-hidden">
            <span className="p-1.5 bg-blue-600/20 text-blue-400 rounded">
              {isImage ? <ImageIcon className="w-5 h-5" /> : <FileText className="w-5 h-5" />}
            </span>
            <div className="truncate">
              <h3 className="text-sm sm:text-base font-semibold truncate text-white">
                {file.originalName}
              </h3>
              <p className="text-xs text-slate-400">
                {file.description ? `${file.description} • ` : ''}
                {(file.size / 1024).toFixed(1)} KB • 上傳時間：
                {new Date(file.uploadedAt).toLocaleString('zh-TW')}
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2 shrink-0">
            {isImage && !imgError && (
              <div className="flex items-center space-x-1 mr-2 bg-slate-700/80 rounded-lg p-1">
                <button
                  type="button"
                  onClick={handleZoomOut}
                  title="縮小"
                  className="p-1 hover:bg-slate-600 rounded text-slate-300 hover:text-white"
                >
                  <ZoomOut className="w-4 h-4" />
                </button>
                <span className="text-xs font-mono px-1 text-slate-300">
                  {Math.round(zoom * 100)}%
                </span>
                <button
                  type="button"
                  onClick={handleZoomIn}
                  title="放大"
                  className="p-1 hover:bg-slate-600 rounded text-slate-300 hover:text-white"
                >
                  <ZoomIn className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={handleResetZoom}
                  title="重設大小"
                  className="p-1 hover:bg-slate-600 rounded text-slate-300 hover:text-white"
                >
                  <RotateCcw className="w-4 h-4" />
                </button>
              </div>
            )}

            <a
              href={file.url}
              target="_blank"
              rel="noreferrer"
              title="在新分頁開啟"
              className="p-2 hover:bg-slate-700 rounded-lg text-slate-300 hover:text-white transition-colors"
            >
              <ExternalLink className="w-5 h-5" />
            </a>
            <a
              href={file.downloadUrl}
              download={file.originalName}
              title="下載檔案"
              className="p-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-colors flex items-center space-x-1 text-xs sm:text-sm font-medium"
            >
              <Download className="w-4 h-4" />
              <span className="hidden sm:inline">下載</span>
            </a>
            <button
              type="button"
              onClick={onClose}
              className="p-2 hover:bg-slate-700 rounded-lg text-slate-400 hover:text-white transition-colors ml-2"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Content Viewer Body */}
        <div className="flex-1 bg-slate-950 relative overflow-auto flex items-center justify-center p-2 sm:p-4">
          {isPdf ? (
            <iframe
              src={`${file.url}#toolbar=1&navpanes=0`}
              className="w-full h-full rounded border border-slate-800 bg-white"
              title={file.originalName}
            />
          ) : isImage ? (
            <div className="w-full h-full overflow-auto flex items-center justify-center relative">
              {imgLoading && !imgError && (
                <div className="absolute inset-0 flex items-center justify-center text-slate-400 z-10 bg-slate-950/60">
                  <Loader2 className="w-8 h-8 animate-spin" />
                  <span className="ml-2 text-sm font-medium">讀取照片中...</span>
                </div>
              )}
              {imgError ? (
                <div className="text-center p-8 text-slate-300 max-w-md bg-slate-900/90 rounded-xl border border-slate-700 shadow-xl">
                  <AlertCircle className="w-12 h-12 text-amber-500 mx-auto mb-3" />
                  <p className="text-base font-bold text-white mb-1">照片預覽載入失敗</p>
                  <p className="text-xs text-slate-400 mb-5 leading-relaxed">
                    瀏覽器無法直接載入此圖片網址（{file.url}），請點擊下方按鈕在新分頁開啟或直接下載。
                  </p>
                  <div className="flex items-center justify-center space-x-3">
                    <a
                      href={file.url}
                      target="_blank"
                      rel="noreferrer"
                      className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition-colors"
                    >
                      <ExternalLink className="w-4 h-4" />
                      <span>在新分頁開啟</span>
                    </a>
                    <a
                      href={file.downloadUrl}
                      download={file.originalName}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition-colors"
                    >
                      <Download className="w-4 h-4" />
                      <span>直接下載</span>
                    </a>
                  </div>
                </div>
              ) : (
                <img
                  src={file.url}
                  alt={file.originalName}
                  onLoad={() => setImgLoading(false)}
                  onError={() => {
                    setImgLoading(false);
                    setImgError(true);
                  }}
                  style={{ transform: `scale(${zoom})`, transformOrigin: 'center center' }}
                  className="max-w-full max-h-full object-contain transition-transform duration-150 select-none shadow-lg rounded"
                />
              )}
            </div>
          ) : (
            <div className="text-center p-8 text-slate-300 max-w-md">
              <FileText className="w-16 h-16 mx-auto mb-4 text-slate-500" />
              <p className="text-lg font-medium mb-2">此檔案格式無法直接在瀏覽器預覽</p>
              <p className="text-sm text-slate-400 mb-6">請點選下方按鈕下載或在新分頁開啟。</p>
              <a
                href={file.downloadUrl}
                download={file.originalName}
                className="inline-flex items-center space-x-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-medium shadow"
              >
                <Download className="w-5 h-5" />
                <span>立即下載 {file.originalName}</span>
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
