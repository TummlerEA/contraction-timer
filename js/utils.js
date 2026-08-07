// Shared helpers used by both index.html and edit.html.
(function (global) {
  "use strict";

  function pad(n) {
    return n < 10 ? "0" + n : String(n);
  }

  function formatDuration(totalSeconds) {
    totalSeconds = Math.max(0, Math.round(totalSeconds));
    var h = Math.floor(totalSeconds / 3600);
    var m = Math.floor((totalSeconds % 3600) / 60);
    var s = totalSeconds % 60;
    if (h > 0) {
      return h + ":" + pad(m) + ":" + pad(s);
    }
    return m + ":" + pad(s);
  }

  function formatTime(epochMs) {
    var d = new Date(epochMs);
    return pad(d.getHours()) + ":" + pad(d.getMinutes());
  }

  function formatDate(epochMs) {
    var d = new Date(epochMs);
    var months = ["January", "February", "March", "April", "May", "June",
      "July", "August", "September", "October", "November", "December"];
    return months[d.getMonth()] + " " + d.getDate();
  }

  function average(nums) {
    if (!nums.length) return 0;
    var sum = nums.reduce(function (a, b) { return a + b; }, 0);
    return Math.round(sum / nums.length);
  }

  global.TimerUtils = {
    pad: pad,
    formatDuration: formatDuration,
    formatTime: formatTime,
    formatDate: formatDate,
    average: average
  };
})(window);
