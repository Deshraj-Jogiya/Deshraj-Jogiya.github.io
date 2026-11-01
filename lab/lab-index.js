// The Lab's index: filter chips show only the demos with that tag (lab/demos.json).
(function () {
  "use strict";
  var chips = document.querySelectorAll(".lab-chip"), items = document.querySelectorAll(".lab-list li");
  chips.forEach(function (chip) {
    chip.addEventListener("click", function () {
      var tag = chip.getAttribute("data-tag");
      chips.forEach(function (c) { c.setAttribute("aria-pressed", String(c === chip)); });
      items.forEach(function (li) { li.hidden = !!tag && li.getAttribute("data-tags").split(" ").indexOf(tag) < 0; });
    });
  });
})();
