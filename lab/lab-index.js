(function () {
  "use strict";
  // A category chip filters the whole Lab: the index list and the demo sections below it.
  var chips = document.querySelectorAll(".lab-chip"), items = document.querySelectorAll(".lab-list li"),
      sections = document.querySelectorAll(".lab-cat"), note = document.getElementById("lab-filter-note");
  function show(cat) {
    chips.forEach(function (c) { c.setAttribute("aria-pressed", String(c.getAttribute("data-cat") === cat)); });
    items.forEach(function (li) { li.hidden = !!cat && li.getAttribute("data-cat") !== cat; });
    sections.forEach(function (s) { s.hidden = !!cat && s.getAttribute("data-cat") !== cat; });
    if (note) {
      var chip = document.querySelector('.lab-chip[data-cat="' + cat + '"]');
      note.textContent = cat ? "Showing only " + chip.firstChild.textContent.trim() + ". Choose All to see every demo." : "";
    }
  }
  chips.forEach(function (chip) { chip.addEventListener("click", function () { show(chip.getAttribute("data-cat")); }); });
  // A link to a demo (from the index, a project page or the assistant) always reveals the section it sits in.
  function reveal() {
    var id = decodeURIComponent(location.hash.slice(1)), el = id && document.getElementById(id);
    var sec = el && el.closest(".lab-cat");
    if (sec && sec.hidden) { show(""); el.scrollIntoView(); }
  }
  window.addEventListener("hashchange", reveal);
  reveal();
})();
