// ==UserScript==
// @name         Reddit Arrow Keys
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  Allow arrowkeys to control reddit gallery
// @author       Rumo
// @homepageURL  https://github.com/ItsRumo/userscripts
// @homepage     https://github.com/ItsRumo/userscripts
// @supportURL   https://github.com/ItsRumo/userscripts/issues
// @downloadURL  https://github.com/ItsRumo/userscripts/master/reddit-arrows.user.js
// @updateURL    https://github.com/ItsRumo/userscripts/master/reddit-arrows.user.js
// @match        http*://*.reddit.com/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=reddit.com
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
