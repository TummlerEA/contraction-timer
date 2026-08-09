// Contraction Timer — MIT License, see LICENSE file.
// Export contractions + notes to JSON / CSV / Markdown, and restore from a
// previously exported JSON backup (e.g. moving to another phone).
(function () {
  "use strict";

  var STORAGE_KEY = "contractionTimer.contractions";
  var NOTES_KEY = "contractionTimer.notes";

  var BACKUP_FORMAT = 1;
  var APP_ID = "contraction-timer";

  var formatDuration = TimerUtils.formatDuration;
  var pad = TimerUtils.pad;

  var els = {};

  function $(id) {
    return document.getElementById(id);
  }

  function init() {
    els.exportJsonBtn = $("exportJsonBtn");
    els.exportCsvBtn = $("exportCsvBtn");
    els.exportMdBtn = $("exportMdBtn");
    els.restoreInput = $("restoreInput");
    els.restoreMode = $("restoreMode");
    els.backupStatus = $("backupStatus");

    if (!els.exportJsonBtn) return; // this page has no backup section

    els.exportJsonBtn.addEventListener("click", function () { exportAs("json"); });
    els.exportCsvBtn.addEventListener("click", function () { exportAs("csv"); });
    els.exportMdBtn.addEventListener("click", function () { exportAs("md"); });
    els.restoreInput.addEventListener("change", onFileChosen);
  }

  // ---------- reading current data ----------

  function loadContractions() {
    var list;
    try {
      list = JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
    } catch (e) {
      list = [];
    }
    if (!Array.isArray(list)) list = [];
    list.sort(function (a, b) { return a.start - b.start; });
    return list;
  }

  function loadNotes() {
    return localStorage.getItem(NOTES_KEY) || "";
  }

  // Interval = time from the previous contraction's start. Computed against
  // the full sorted list so exported intervals match what the app displays.
  function withIntervals(list) {
    return list.map(function (c, i) {
      return {
        record: c,
        interval: i > 0 ? Math.round((c.start - list[i - 1].start) / 1000) : null
      };
    });
  }

  // ---------- export ----------

  function exportAs(format) {
    var list = loadContractions();
    var notes = loadNotes();

    if (!list.length && !notes.trim()) {
      setStatus("Nothing to export yet.", true);
      return;
    }

    var built;
    if (format === "json") {
      built = { text: buildJson(list, notes), mime: "application/json", ext: "json" };
    } else if (format === "csv") {
      built = { text: buildCsv(list), mime: "text/csv", ext: "csv" };
    } else {
      built = { text: buildMarkdown(list, notes), mime: "text/markdown", ext: "md" };
    }

    download(built.text, "contraction-timer-" + fileStamp() + "." + built.ext, built.mime);
    setStatus("Exported " + list.length + " contraction" + (list.length === 1 ? "" : "s") +
      " as " + built.ext.toUpperCase() + ".");
  }

  function buildJson(list, notes) {
    return JSON.stringify({
      app: APP_ID,
      formatVersion: BACKUP_FORMAT,
      exportedAt: new Date().toISOString(),
      contractions: list,
      notes: notes
    }, null, 2);
  }

  function buildCsv(list) {
    // Contractions only — free-form notes don't fit a table; use JSON or
    // Markdown to carry those across.
    var header = [
      "Start (ISO)", "Start (local)", "End (ISO)",
      "Duration (s)", "Duration (m:ss)",
      "Interval (s)", "Interval (m:ss)",
      "Intensity"
    ];
    var rows = [header.map(csvCell).join(",")];

    withIntervals(list).forEach(function (item) {
      var c = item.record;
      rows.push([
        new Date(c.start).toISOString(),
        localDateTime(c.start),
        new Date(c.end).toISOString(),
        String(c.duration),
        formatDuration(c.duration),
        item.interval === null ? "" : String(item.interval),
        item.interval === null ? "" : formatDuration(item.interval),
        c.intensity ? Intensity.labelFor(c.intensity) || "" : ""
      ].map(csvCell).join(","));
    });

    return rows.join("\r\n") + "\r\n";
  }

  function csvCell(value) {
    return '"' + String(value).replace(/"/g, '""') + '"';
  }

  function buildMarkdown(list, notes) {
    var out = ["# Contraction Timer export", "", "Exported " + localDateTime(Date.now()), ""];

    if (list.length) {
      out.push("## Contractions (" + list.length + ")", "");
      out.push("| Start | Interval | Duration | Intensity |");
      out.push("| --- | --- | --- | --- |");
      withIntervals(list).forEach(function (item) {
        var c = item.record;
        out.push("| " + [
          localDateTime(c.start),
          item.interval === null ? "–" : formatDuration(item.interval),
          formatDuration(c.duration),
          (c.intensity && Intensity.labelFor(c.intensity)) || "–"
        ].join(" | ") + " |");
      });
      out.push("");
    } else {
      out.push("## Contractions", "", "_No contractions recorded._", "");
    }

    out.push("## Labor notes", "");
    out.push(notes.trim() ? notes.trim() : "_No notes recorded._");
    out.push("");

    return out.join("\n");
  }

  function download(text, filename, mime) {
    var blob = new Blob([text], { type: mime + ";charset=utf-8" });
    var url = URL.createObjectURL(blob);
    var a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    // Revoke on a later tick so the download has already been handed off.
    setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
  }

  // ---------- restore ----------

  function onFileChosen() {
    var file = els.restoreInput.files && els.restoreInput.files[0];
    if (!file) return;

    var reader = new FileReader();
    reader.onload = function () {
      try {
        applyRestore(String(reader.result));
      } catch (err) {
        setStatus(err.message || "That file could not be restored.", true);
      }
      els.restoreInput.value = ""; // allow re-picking the same file
    };
    reader.onerror = function () {
      setStatus("Could not read that file.", true);
      els.restoreInput.value = "";
    };
    reader.readAsText(file);
  }

  function applyRestore(rawText) {
    var parsed = parseBackup(rawText);
    var incoming = parsed.contractions;
    var mode = els.restoreMode.value;

    var existing = loadContractions();
    var result;

    if (mode === "replace") {
      if (!window.confirm(
        "Replace all data on this device with the backup?\n\n" +
        "Current: " + existing.length + " contraction(s)\n" +
        "Backup: " + incoming.length + " contraction(s)\n\n" +
        "This cannot be undone."
      )) {
        setStatus("Restore cancelled.");
        return;
      }
      result = { list: incoming, added: incoming.length, skipped: 0 };
      localStorage.setItem(NOTES_KEY, parsed.notes);
    } else {
      result = mergeContractions(existing, incoming);
      if (!window.confirm(
        "Merge the backup into this device?\n\n" +
        result.added + " new contraction(s) will be added.\n" +
        result.skipped + " already present will be skipped.\n\n" +
        "Nothing currently on this device is removed."
      )) {
        setStatus("Restore cancelled.");
        return;
      }
      localStorage.setItem(NOTES_KEY, mergeNotes(loadNotes(), parsed.notes));
    }

    localStorage.setItem(STORAGE_KEY, JSON.stringify(result.list));
    setStatus("Restored. Reloading…");
    setTimeout(function () { window.location.reload(); }, 400);
  }

  function parseBackup(rawText) {
    var data;
    try {
      data = JSON.parse(rawText);
    } catch (e) {
      throw new Error("That file isn't valid JSON. Pick a .json backup exported from this app.");
    }

    if (!data || typeof data !== "object" || !Array.isArray(data.contractions)) {
      throw new Error("That JSON isn't a Contraction Timer backup (no contractions list).");
    }

    var contractions = data.contractions
      .map(sanitizeRecord)
      .filter(Boolean)
      .sort(function (a, b) { return a.start - b.start; });

    if (!contractions.length && !String(data.notes || "").trim()) {
      throw new Error("That backup is empty — nothing to restore.");
    }

    return {
      contractions: contractions,
      notes: typeof data.notes === "string" ? data.notes : ""
    };
  }

  // Drop anything that isn't a usable record rather than importing garbage
  // that would break the history table or the stats.
  function sanitizeRecord(raw) {
    if (!raw || typeof raw !== "object") return null;

    var start = Number(raw.start);
    var end = Number(raw.end);
    if (!isFinite(start) || !isFinite(end)) return null;
    if (end < start) return null;

    var duration = Number(raw.duration);
    if (!isFinite(duration) || duration < 0) {
      duration = Math.round((end - start) / 1000);
    }

    var intensity = null;
    if (raw.intensity && Intensity.indexFor(raw.intensity) !== -1) {
      intensity = raw.intensity;
    }

    return {
      id: typeof raw.id === "string" && raw.id ? raw.id : "c" + start,
      start: start,
      end: end,
      duration: duration,
      intensity: intensity
    };
  }

  // Records carry a stable id derived from their start time, so the same
  // contraction saved on two phones lands on the same id and is only kept once.
  function mergeContractions(existing, incoming) {
    var seen = {};
    existing.forEach(function (c) { seen[c.id] = true; });

    var merged = existing.slice();
    var added = 0;
    var skipped = 0;

    incoming.forEach(function (c) {
      if (seen[c.id]) {
        skipped++;
        return;
      }
      seen[c.id] = true;
      merged.push(c);
      added++;
    });

    merged.sort(function (a, b) { return a.start - b.start; });
    return { list: merged, added: added, skipped: skipped };
  }

  function mergeNotes(current, incoming) {
    var a = current.trim();
    var b = incoming.trim();
    if (!b || a === b) return current;
    if (!a) return incoming;
    return a + "\n\n--- restored from backup ---\n" + b;
  }

  // ---------- helpers ----------

  function setStatus(message, isError) {
    els.backupStatus.textContent = message;
    els.backupStatus.classList.toggle("is-error", !!isError);
  }

  function localDateTime(epochMs) {
    var d = new Date(epochMs);
    return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate()) +
      " " + pad(d.getHours()) + ":" + pad(d.getMinutes());
  }

  function fileStamp() {
    var d = new Date();
    return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate()) +
      "-" + pad(d.getHours()) + pad(d.getMinutes());
  }

  document.addEventListener("DOMContentLoaded", init);
})();
