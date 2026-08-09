# Contraction Timer

A simple, private contraction timer for tracking labor contractions: start the
timer when a contraction begins, stop it when it ends, and see your history
for the last 1, 3, or 6 hours — plus rolling averages for the past hour.

It's a static, client-side web app. There's no backend server and no
external account: all data is stored locally in your browser
(`localStorage`), and all the app's code lives in this repository.

## Quick start (new users)

1. Open the app (locally or at your GitHub Pages URL — see below).
2. Tap **Start Contraction** when a contraction begins, tap it again when it
   ends. Repeat for each contraction.
3. Watch the **Past hour** card and the **History** table to track duration,
   interval, and count over time.
4. Tap any history row to correct a time, set an intensity, or delete it.
5. Log everything else (admission, medication, checks) in the **Labor
   Notes** box.

The app itself also has a **"How to use this app & the 5-1-1 rule"**
section right at the top — tap it to expand.

### The 5-1-1 rule

A common rule of thumb for when to head to the hospital or call your
provider: contractions about **5 minutes apart**, each lasting about
**1 minute**, for at least **1 hour**.

This is general guidance only, not medical advice — always follow your own
provider's specific instructions, and don't wait on any rule of thumb if
something feels wrong.

## Features

- **Start / Stop button** — tap once to start timing a contraction, tap again
  to stop. The live elapsed time is shown while a contraction is in progress.
- **History table** — every recorded contraction shows its start time,
  interval since the previous contraction started, duration, and an
  optional intensity. Tap any row to open its edit page.
- **Edit page** — adjust a contraction's start time, end time, or intensity
  by hand, or delete it outright. Editing a start/end time automatically
  re-sorts the history and recalculates intervals for the affected records,
  so "interval since previous contraction" stays correct even after a
  correction.
- **Manual intensity** — tag any contraction Mild / Moderate / Strong /
  Severe from a slider on the edit page, or leave it unset ("Add") to skip
  it. Fully optional and editable any time, with a one-tap "Clear intensity"
  to unset it again.
- **1h / 3h / 6h filters** — switch the history view between the last one,
  three, or six hours.
- **Past-hour stats** — average duration, number of contractions, and average
  interval, all computed over the trailing 60 minutes.
- **Clear history** — wipe everything and start fresh.
- **Labor notes** — a free-form multiline text box under the history table
  for logging events that aren't contractions (admission, medication,
  checks, etc.). An "Insert time" button stamps the current time onto a new
  line so entries stay easy to scan. Saved automatically as you type, in
  `localStorage`, on the same device.
- **Survives refresh** — an in-progress contraction and all past entries are
  restored automatically if you reload or close/reopen the page.

## Running it

No build step or server is required.

- **Locally:** open `index.html` directly in a browser, or serve the folder
  with any static file server, e.g.:
  ```bash
  npx serve .
  # or
  python3 -m http.server 8080
  ```
- **GitHub Pages:** the included workflow (`.github/workflows/deploy.yml`)
  publishes the site to GitHub Pages automatically on every push to `main`.
  Enable Pages for this repository under **Settings → Pages → Source →
  GitHub Actions**, and the app will be available at
  `https://<your-username>.github.io/contraction-timer/`.

## Data & privacy

All contraction data stays in your browser's local storage on the device you
use — nothing is sent to a server. Clearing your browser's site data (or
using a different browser/device) will not carry history over.

## Project structure

```
index.html        Timer + history page
edit.html          Edit-a-record page (time, duration, intensity, delete)
css/style.css      Styling (dark theme)
js/app.js          Timer logic, storage, and rendering for index.html
js/edit.js         Editing logic for edit.html
js/notes.js        Labor notes text box logic
js/intensity.js    Shared intensity scale (Mild/Moderate/Strong/Severe)
js/utils.js        Shared formatting helpers
.github/workflows/deploy.yml   GitHub Pages deployment
LICENSE            MIT license
```

## Disclaimer

This tool is for personal tracking convenience only and is not a medical
device. Always follow guidance from your healthcare provider, especially
regarding when to seek care.

## License

MIT — see [LICENSE](LICENSE). Free to use, modify, and share.
