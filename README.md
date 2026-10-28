# 電控設備與備品管理系統 V1.0

這是一套具備 **Firebase Cloud Firestore 雲端資料庫**、支援 **GitHub Pages 免費靜態網頁託管** 的工廠電控備品與設備管理系統。

---

## 🚀 如何上傳到 GitHub 並直接呈現網頁 (GitHub Pages)

### 方法一：使用內建 GitHub Actions 自動部署（最推薦、最簡單）

本專案已為您配置好 `.github/workflows/deploy.yml` 自動建置與發布流程。

1. **解壓縮並上傳至 GitHub**：
   * 在 GitHub 建立一個新的儲存庫（Repository），例如命名為 `electrical-management`。
   * 將本專案解壓縮後的**所有檔案與資料夾**（務必包含 `.github/` 資料夾）上傳或 `git push` 到 GitHub 的 `main`（或 `master`）分支。
2. **在 GitHub 開啟 Pages**：
   * 進入您的 GitHub Repository 頁面，點選上方的 **「Settings」**（設定）。
   * 在左側選單點選 **「Pages」**。
   * 在 **「Build and deployment」** 底下的 **「Source」**，下拉選擇 **「GitHub Actions」**。
3. **完成！直接瀏覽網頁**：
   * 只要儲存後，GitHub 會自動在「Actions」標籤頁執行建置。
   * 約 1~2 分鐘後，即可在 Pages 頁面看到專屬網址（例如 `https://<您的帳號>.github.io/electrical-management/`），點擊即可直接開啟系統！

---

### 方法二：直接部署 `dist` 資料夾

如果您的 Repository 設定只想使用傳統分支部署：
1. 執行 `npm run build` 生成 `dist` 目錄。
2. 在 GitHub Settings -> Pages -> Source 選擇「Deploy from a branch」，並指定包含建置結果的分支或目錄即可。

---

## ☁️ 雲端功能特色

1. **Cloud Firestore 永久儲存**：
   * 所有備品物料、庫存數量、存放儲位、設備機台資料及維修紀錄均直接與 Google Cloud Firestore 連線，重新整理網頁、更換手機或電腦均會即時同步。
2. **相對路徑相容性 (`base: './'`)**：
   * 已於 `vite.config.ts` 設定為相對路徑，無論部署在 GitHub Pages 的根目錄或子路徑，CSS、JS 與圖示均能正常載入。
3. **靜態環境自動適應**：
   * 當在 GitHub Pages 等純前端靜態主機執行時，照片與文件上傳會自動採用 Base64 Data URL 儲存至雲端資料庫，無需額外維護 Node.js 後端伺服器。
