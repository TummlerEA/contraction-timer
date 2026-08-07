// Shared intensity scale used by both index.html and edit.html.
// Intensity is always optional — null means "not set" (skipped).
(function (global) {
  "use strict";

  var LEVELS = [
    { value: "mild", label: "Mild" },
    { value: "moderate", label: "Moderate" },
    { value: "strong", label: "Strong" },
    { value: "severe", label: "Severe" }
  ];

  function labelFor(value) {
    var found = LEVELS.filter(function (l) { return l.value === value; })[0];
    return found ? found.label : null;
  }

  function indexFor(value) {
    for (var i = 0; i < LEVELS.length; i++) {
      if (LEVELS[i].value === value) return i;
    }
    return -1;
  }

  function valueForIndex(idx) {
    return LEVELS[idx] ? LEVELS[idx].value : null;
  }

  global.Intensity = {
    LEVELS: LEVELS,
    labelFor: labelFor,
    indexFor: indexFor,
    valueForIndex: valueForIndex
  };
})(window);
