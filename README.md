# Insurance Voice Training

這是一個給保險業務練習話術的簡易網頁工具。你只要照著下面步驟上傳到 GitHub，
再用 Vercel 產生網址，就可以在手機或電腦上使用。

## 你會需要 
- 一個 **GitHub 帳號**（免費）
- 一個 **Vercel 帳號**（免費，可用 GitHub 登入）
- 一把 **OpenAI API 金鑰**

---

## 步驟 1：把專案上傳到 GitHub
1. 打開 <https://github.com> 並登入。
2. 點右上角「+」→ **New repository**。
3. Repository name 請輸入 `insurance-voice-training`。
4. 按下 **Create repository**。
5. 在新建的 GitHub 頁面中，找到「Upload files」。
6. 把整個專案資料夾拖進去（包含裡面的所有檔案）。
7. 按下 **Commit changes**。

完成後，你會看到 GitHub 上有一個完整的專案。

---

## 步驟 2：在 Vercel 建立網站
1. 打開 <https://vercel.com> 並登入（建議用 GitHub）。
2. 點 **Add New** → **Project**。
3. 從清單中選剛剛的 GitHub 專案。
4. 保持預設設定，直接按 **Deploy**。

幾十秒後 Vercel 會顯示一個網址，這就是你的網站。

---

## 步驟 3：設定 OPENAI_API_KEY
1. 在 Vercel 專案畫面中，點 **Settings**。
2. 左側選單點 **Environment Variables**。
3. 新增一個變數：
   - Name：`OPENAI_API_KEY`
   - Value：貼上你的 OpenAI API 金鑰
4. 按 **Save**。
5. 回到專案首頁，點 **Redeploy** 讓設定生效。

> 小提醒：OpenAI API 金鑰可以在 <https://platform.openai.com/api-keys> 產生。

---

## 步驟 4：取得網址並使用
1. 回到 Vercel 專案首頁，會看到像 `https://xxx.vercel.app` 的網址。
2. 打開網址後：
   - 首頁會告訴你練習步驟。
   - 點「進入模擬對話」進到練習頁。
3. 跟著畫面上的提示朗讀並練習。

---

## 本機測試（選用）
如果你會用電腦終端機，可以在本機測試：

```bash
npm install
npm run dev
```

完成後打開 <http://localhost:3000>。
