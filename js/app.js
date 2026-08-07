(function () {
  "use strict";

  var STORAGE_KEY = "contractionTimer.contractions";
  var ACTIVE_KEY = "contractionTimer.activeStart";

  var formatDuration = TimerUtils.formatDuration;
  var formatTime = TimerUtils.formatTime;
  var average = TimerUtils.average;

  /** @type {{id:string, start:number, end:number, duration:number, intensity:(string|null)}[]} */
  var contractions = [];
  var activeStart = null; // epoch ms while a contraction is in progress
  var tickHandle = null;
  var selectedRangeHours = 1;

  var els = {};

  function $(id) {
    return document.getElementById(id);
  }

  function init() {
    els.timerBtn = $("timerBtn");
    els.timerDisplay = $("timerDisplay");
    els.timerSub = $("timerSub");
    els.statAvgDuration = $("statAvgDuration");
    els.statCount = $("statCount");
    els.statAvgInterval = $("statAvgInterval");
    els.historyBody = $("historyBody");
    els.emptyState = $("emptyState");
    els.clearBtn = $("clearBtn");
    els.rangeTabs = document.querySelectorAll(".range-tab");

    load();

    els.timerBtn.addEventListener("click", onTimerClick);
    els.clearBtn.addEventListener("click", onClear);
    els.rangeTabs.forEach(function (btn) {
      btn.addEventListener("click", function () {
        els.rangeTabs.forEach(function (b) { b.classList.remove("active"); });
        btn.classList.add("active");
        selectedRangeHours = parseInt(btn.dataset.hours, 10);
        renderHistory();
      });
    });

    if (activeStart) {
      startTicking();
      els.timerBtn.classList.add("running");
      els.timerBtn.querySelector(".icon").textContent = "■";
      els.timerBtn.querySelector(".label").textContent = "Stop Contraction";
      els.timerSub.textContent = "Contraction in progress…";
    }

    renderAll();
  }

  // ---------- persistence ----------

  function load() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      contractions = raw ? JSON.parse(raw) : [];
    } catch (e) {
      contractions = [];
    }
    // Always keep contractions sorted by start time — this is what makes
    // "interval since previous contraction" and history order correct,
    // including after a record's start/end time was hand-edited.
    contractions.sort(function (a, b) { return a.start - b.start; });

    try {
      var activeRaw = localStorage.getItem(ACTIVE_KEY);
      activeStart = activeRaw ? parseInt(activeRaw, 10) : null;
    } catch (e) {
      activeStart = null;
    }
  }

  function save() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(contractions));
  }

  function saveActive() {
    if (activeStart) {
      localStorage.setItem(ACTIVE_KEY, String(activeStart));
    } else {
      localStorage.removeItem(ACTIVE_KEY);
    }
  }

  // ---------- timer ----------

  function onTimerClick() {
    if (activeStart) {
      stopContraction();
    } else {
      startContraction();
    }
  }

  function startContraction() {
    activeStart = Date.now();
    saveActive();
    els.timerBtn.classList.add("running");
    els.timerBtn.querySelector(".icon").textContent = "■";
    els.timerBtn.querySelector(".label").textContent = "Stop Contraction";
    els.timerSub.textContent = "Contraction in progress…";
    startTicking();
    tick();
  }

  function stopContraction() {
    var end = Date.now();
    var duration = Math.round((end - activeStart) / 1000);
    contractions.push({
      id: "c" + activeStart,
      start: activeStart,
      end: end,
      duration: duration,
      intensity: null
    });
    contractions.sort(function (a, b) { return a.start - b.start; });
    save();

    activeStart = null;
    saveActive();
    stopTicking();

    els.timerBtn.classList.remove("running");
    els.timerBtn.querySelector(".icon").textContent = "▶";
    els.timerBtn.querySelector(".label").textContent = "Start Contraction";
    els.timerDisplay.textContent = "0:00";
    els.timerSub.textContent = "Ready";

    renderAll();
  }

  function startTicking() {
    stopTicking();
    tickHandle = setInterval(tick, 1000);
  }

  function stopTicking() {
    if (tickHandle) {
      clearInterval(tickHandle);
      tickHandle = null;
    }
  }

  function tick() {
    if (!activeStart) return;
    var elapsed = Math.round((Date.now() - activeStart) / 1000);
    els.timerDisplay.textContent = formatDuration(elapsed);
  }

  // ---------- clear all ----------

  function onClear() {
    if (!contractions.length) return;
    var ok = window.confirm("Delete all recorded contractions? This cannot be undone.");
    if (!ok) return;
    contractions = [];
    save();
    renderAll();
  }

  // ---------- rendering ----------

  function renderAll() {
    renderStats();
    renderHistory();
  }

  function contractionsInWindow(hours) {
    var cutoff = Date.now() - hours * 3600 * 1000;
    return contractions.filter(function (c) { return c.start >= cutoff; });
  }

  function intervalsFor(list) {
    // list must be sorted ascending by start time; interval = gap from previous
    // contraction's start (using full contraction history, not just the window)
    var intervals = [];
    for (var i = 0; i < list.length; i++) {
      var idxInAll = contractions.indexOf(list[i]);
      if (idxInAll > 0) {
        var prev = contractions[idxInAll - 1];
        intervals.push(Math.round((list[i].start - prev.start) / 1000));
      }
    }
    return intervals;
  }

  function renderStats() {
    var lastHour = contractionsInWindow(1);

    if (lastHour.length === 0) {
      els.statAvgDuration.textContent = "–";
      els.statCount.textContent = "0";
      els.statAvgInterval.textContent = "–";
      return;
    }

    var avgDuration = average(lastHour.map(function (c) { return c.duration; }));
    els.statAvgDuration.textContent = formatDuration(avgDuration);
    els.statCount.textContent = String(lastHour.length);

    var intervals = intervalsFor(lastHour);
    els.statAvgInterval.textContent = intervals.length
      ? formatDuration(average(intervals))
      : "–";
  }

  function renderHistory() {
    var windowList = contractionsInWindow(selectedRangeHours)
      .slice()
      .sort(function (a, b) { return b.start - a.start; }); // newest first

    els.historyBody.innerHTML = "";

    if (windowList.length === 0) {
      els.emptyState.style.display = "block";
      return;
    }
    els.emptyState.style.display = "none";

    windowList.forEach(function (c) {
      var idxInAll = contractions.indexOf(c);
      var interval = idxInAll > 0 ? Math.round((c.start - contractions[idxInAll - 1].start) / 1000) : null;

      var tr = document.createElement("tr");
      tr.className = "history-row";
      tr.tabIndex = 0;
      tr.setAttribute("role", "button");
      tr.setAttribute("aria-label", "Edit contraction at " + formatTime(c.start));

      var goToEdit = function () {
        window.location.href = "edit.html?id=" + encodeURIComponent(c.id);
      };
      tr.addEventListener("click", goToEdit);
      tr.addEventListener("keydown", function (e) {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          goToEdit();
        }
      });

      var tdTime = document.createElement("td");
      tdTime.textContent = formatTime(c.start);
      tr.appendChild(tdTime);

      var tdInterval = document.createElement("td");
      tdInterval.textContent = interval !== null ? formatDuration(interval) : "–";
      tr.appendChild(tdInterval);

      var tdDuration = document.createElement("td");
      tdDuration.textContent = formatDuration(c.duration);
      tdDuration.className = "duration-cell";
      tr.appendChild(tdDuration);

      var tdIntensity = document.createElement("td");
      tdIntensity.className = "intensity-cell";

      var badge = document.createElement("span");
      var label = Intensity.labelFor(c.intensity);
      badge.className = "intensity-badge" + (label ? " intensity-" + c.intensity : " intensity-none");
      badge.textContent = label || "Add";
      tdIntensity.appendChild(badge);

      var chevron = document.createElement("span");
      chevron.className = "row-chevron";
      chevron.textContent = "›";
      chevron.setAttribute("aria-hidden", "true");
      tdIntensity.appendChild(chevron);

      tr.appendChild(tdIntensity);

      els.historyBody.appendChild(tr);
    });
  }

  document.addEventListener("DOMContentLoaded", init);
})();
