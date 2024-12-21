// ==UserScript==
// @name         Delete Reddit Local Store
// @namespace    http://tampermonkey.net/
// @version      2024-12-03
// @description  Removes recent searches etc.
// @author       Rumo
// @homepageURL  https://github.com/ItsRumo/userscripts
// @homepage     https://github.com/ItsRumo/userscripts
// @supportURL   https://github.com/ItsRumo/userscripts/issues
// @downloadURL  https://github.com/ItsRumo/userscripts/master/no-reddit-history.user.js
// @updateURL    https://github.com/ItsRumo/userscripts/master/no-reddit-history.user.js
// @match        http*://*.reddit.com/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=reddit.com
// @grant        none
// ==/UserScript==

(function() {
    'use strict';
    const keys = ["recent-subreddits-store", "recent-searches-store"];

    for (let k of keys) {
        if (k in localStorage) {
            delete localStorage[k];
        }
    }
})();
