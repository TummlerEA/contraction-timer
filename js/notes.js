// Contraction Timer — MIT License, see LICENSE file.
(function () {
  "use strict";

  var STORAGE_KEY = "contractionTimer.notes";
  var SAVE_DELAY = 400; // ms, debounce while typing

  var formatTime = TimerUtils.formatTime;

  var els = {};
  var saveTimer = null;

  function init() {
    els.textarea = document.getElementById("notesArea");
    els.insertTimeBtn = document.getElementById("insertTimeBtn");
    els.status = document.getElementById("notesStatus");

    if (!els.textarea) return; // this page has no notes section

    els.textarea.value = localStorage.getItem(STORAGE_KEY) || "";

    els.textarea.addEventListener("input", scheduleSave);
    els.textarea.addEventListener("blur", flushSave);
    els.insertTimeBtn.addEventListener("click", insertTime);
    window.addEventListener("beforeunload", flushSave);
  }

  function scheduleSave() {
    if (saveTimer) clearTimeout(saveTimer);
    saveTimer = setTimeout(save, SAVE_DELAY);
  }

  function flushSave() {
    if (saveTimer) {
      clearTimeout(saveTimer);
      saveTimer = null;
      save();
    }
  }

  function save() {
    localStorage.setItem(STORAGE_KEY, els.textarea.value);
    els.status.textContent = "Saved · " + formatTime(Date.now());
  }

  function insertTime() {
    var ta = els.textarea;
    var prefix = formatTime(Date.now()) + " - ";
    var start = ta.selectionStart != null ? ta.selectionStart : ta.value.length;
    var end = ta.selectionEnd != null ? ta.selectionEnd : ta.value.length;

    // Start the stamp on its own line, unless the box is empty or the
    // cursor already sits at the start of a line.
    var needsNewline = start > 0 && ta.value.charAt(start - 1) !== "\n";
    var insertText = (needsNewline ? "\n" : "") + prefix;

    ta.value = ta.value.slice(0, start) + insertText + ta.value.slice(end);
    var cursor = start + insertText.length;
    ta.focus();
    ta.setSelectionRange(cursor, cursor);

    save();
  }

  document.addEventListener("DOMContentLoaded", init);
})();
