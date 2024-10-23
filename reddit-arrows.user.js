// ==UserScript==
// @name         Reddit Arrow Keys
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  Allow arrowkeys to control reddit gallery
// @author       Rumo
// @match        http*://*.reddit.com/*
// @icon         data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==
// @grant        none
// ==/UserScript==

(() => {
  let keymap = {
    ArrowLeft: "prevButton",
    ArrowRight: "nextButton",
  };
  document.addEventListener("keydown", event => {
    if (!(event.key in keymap)) return;

    document.querySelector("#shreddit-media-lightbox gallery-carousel")?.shadowRoot.querySelector(`span[slot="${keymap[event.key]}"]`).click();
  });
})();
