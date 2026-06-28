# 健康能力紀錄工具 v3

Vue 3 + Vite + Tailwind CSS v4。

這版已移除 PostCSS，不需要 `postcss.config.js`。

## 安裝與啟動

```bash
npm install
npm run dev
```

## Tailwind 設定方式

本專案使用 Tailwind v4 的 Vite Plugin：

```js
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [vue(), tailwindcss()],
})
```

CSS 只需要：

```css
@import "tailwindcss";
```

## Google Apps Script 設定

1. 開啟 Google Apps Script。
2. 建立新專案。
3. 將 `apps-script/Code.gs` 貼進去。
4. 部署為 Web App。
5. 執行身分選「我」。
6. 存取權限可先選「知道連結的任何人」。
7. 複製 Web App URL。
8. 貼到 `src/App.vue` 的：

```js
const APPS_SCRIPT_URL = '請貼上你的 Google Apps Script Web App URL'
```

## 寫入邏輯

輸入日期後，例如：

```text
2027-03-15
```

Apps Script 會自動尋找：

```text
2027 健康能力紀錄
```

再進入：

```text
03月
```

接著找到 15 日那一列，並將表單資料寫入對應欄位。

## 檔案命名規則

Google Sheets 檔名需維持：

```text
年份 健康能力紀錄
```

例如：

```text
2026 健康能力紀錄
2027 健康能力紀錄
2028 健康能力紀錄
```
