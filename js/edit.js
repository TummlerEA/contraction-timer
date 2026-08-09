// Contraction Timer — MIT License, see LICENSE file.
(function () {
  "use strict";

  var STORAGE_KEY = "contractionTimer.contractions";

  var formatDuration = TimerUtils.formatDuration;
  var formatTime = TimerUtils.formatTime;
  var formatDate = TimerUtils.formatDate;
  var pad = TimerUtils.pad;

  var contractions = [];
  var record = null; // the contraction currently being edited
  var pendingIntensity = null; // null = not set
  var intensityTouched = false;

  var els = {};

  function $(id) {
    return document.getElementById(id);
  }

  function init() {
    els.backBtn = $("backBtn");
    els.saveBtn = $("saveBtn");
    els.editDate = $("editDate");
    els.startInput = $("startInput");
    els.endInput = $("endInput");
    els.durationValue = $("durationValue");
    els.intensityValue = $("intensityValue");
    els.intensitySlider = $("intensitySlider");
    els.clearIntensityBtn = $("clearIntensityBtn");
    els.deleteBtn = $("deleteBtn");
    els.notFound = $("notFound");
    els.editCard = document.querySelector(".edit-card");

    load();

    var id = new URLSearchParams(window.location.search).get("id");
    record = contractions.filter(function (c) { return c.id === id; })[0] || null;

    if (!record) {
      showNotFound();
      return;
    }

    populate();

    els.backBtn.addEventListener("click", function () {
      window.location.href = "index.html";
    });
    els.saveBtn.addEventListener("click", onSave);
    els.deleteBtn.addEventListener("click", onDelete);
    els.startInput.addEventListener("input", updateDurationPreview);
    els.endInput.addEventListener("input", updateDurationPreview);
    els.intensitySlider.addEventListener("input", onSliderInput);
    els.clearIntensityBtn.addEventListener("click", onClearIntensity);
  }

  function showNotFound() {
    els.editCard.style.display = "none";
    els.deleteBtn.style.display = "none";
    els.notFound.style.display = "block";
  }

  // ---------- persistence ----------

  function load() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      contractions = raw ? JSON.parse(raw) : [];
    } catch (e) {
      contractions = [];
    }
  }

  function save() {
    // Keep the list sorted by start time — editing a record's start/end can
    // move it earlier or later relative to its neighbors, which changes
    // "interval since previous contraction" for it and for whichever record
    // now follows it. Re-sorting here keeps that derived data correct.
    contractions.sort(function (a, b) { return a.start - b.start; });
    localStorage.setItem(STORAGE_KEY, JSON.stringify(contractions));
  }

  // ---------- populate ----------

  function populate() {
    els.editDate.textContent = formatDate(record.start);
    els.startInput.value = toTimeInputValue(record.start);
    els.endInput.value = toTimeInputValue(record.end);

    intensityTouched = !!record.intensity;
    pendingIntensity = record.intensity || null;
    var idx = Intensity.indexFor(record.intensity);
    els.intensitySlider.value = idx === -1 ? 0 : idx;

    updateDurationPreview();
    updateIntensityLabel();
    updateSliderFill();
  }

  function toTimeInputValue(epochMs) {
    var d = new Date(epochMs);
    return pad(d.getHours()) + ":" + pad(d.getMinutes());
  }

  function applyTimeToDate(baseMs, timeStr) {
    var parts = timeStr.split(":");
    var d = new Date(baseMs);
    d.setHours(parseInt(parts[0], 10), parseInt(parts[1], 10), 0, 0);
    return d.getTime();
  }

  function computeStartEnd() {
    var start = applyTimeToDate(record.start, els.startInput.value);
    var end = applyTimeToDate(record.start, els.endInput.value);
    if (end < start) {
      // "Ended at" is earlier than "Started at" on the clock — assume the
      // contraction crossed midnight rather than treating it as negative.
      end += 24 * 60 * 60 * 1000;
    }
    return { start: start, end: end };
  }

  function updateDurationPreview() {
    if (!els.startInput.value || !els.endInput.value) return;
    var times = computeStartEnd();
    var seconds = Math.round((times.end - times.start) / 1000);
    els.durationValue.textContent = formatDuration(seconds);
  }

  // ---------- intensity ----------

  function onSliderInput() {
    intensityTouched = true;
    pendingIntensity = Intensity.valueForIndex(parseInt(els.intensitySlider.value, 10));
    updateIntensityLabel();
    updateSliderFill();
  }

  function onClearIntensity() {
    intensityTouched = false;
    pendingIntensity = null;
    els.intensitySlider.value = 0;
    updateIntensityLabel();
    updateSliderFill();
  }

  function updateIntensityLabel() {
    if (!intensityTouched || !pendingIntensity) {
      els.intensityValue.textContent = "NOT SET";
      return;
    }
    els.intensityValue.textContent = Intensity.labelFor(pendingIntensity).toUpperCase();
  }

  function updateSliderFill() {
    var input = els.intensitySlider;
    var min = parseFloat(input.min);
    var max = parseFloat(input.max);
    var val = parseFloat(input.value);
    var percent = ((val - min) / (max - min)) * 100;
    input.style.background =
      "linear-gradient(to right, var(--accent) 0%, var(--accent) " + percent +
      "%, var(--border) " + percent + "%, var(--border) 100%)";
  }

  // ---------- save / delete ----------

  function onSave() {
    var times = computeStartEnd();
    record.start = times.start;
    record.end = times.end;
    record.duration = Math.round((times.end - times.start) / 1000);
    record.intensity = intensityTouched ? pendingIntensity : null;

    save();
    window.location.href = "index.html";
  }

  function onDelete() {
    var label = formatTime(record.start);
    var ok = window.confirm("Delete the contraction at " + label + "? This cannot be undone.");
    if (!ok) return;

    contractions = contractions.filter(function (c) { return c.id !== record.id; });
    localStorage.setItem(STORAGE_KEY, JSON.stringify(contractions));
    window.location.href = "index.html";
  }

  document.addEventListener("DOMContentLoaded", init);
})();
