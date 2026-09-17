<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/drive/1A_lo1msZAA5Jby1rL5OOFsRIG_4IjXoE

## About

MoneyVerse is a gamified personal-finance companion: track a budget, run an
investing simulator, set savings goals, and learn as you go — earning XP and
badges along the way.

## Your data

Everything lives **on your device** in `localStorage` — nothing is uploaded.
From **Profile → Settings** you can:

- **Transactions CSV** — export your ledger (also available from the Budget view's "Recent History").
- **Full Backup (JSON)** — download every MoneyVerse data set in one versioned file.
- **Restore from Backup** — load a backup JSON back in (validated before it overwrites).

Because data is per-browser, exporting a backup is the way to move your data to
another device or keep it safe before clearing site data.

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
3. Run the app:
   `npm run dev`
