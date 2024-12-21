// ==UserScript==
// @name         You Already Own - DDB
// @namespace    http://tampermonkey.net/
// @version      2024-12-20
// @description  Indicates which digital books you own inside the shop
// @author       Rumo
// @homepageURL  https://github.com/itsRumo/userscripts
// @homepage     https://github.com/itsRumo/userscripts
// @supportURL   https://github.com/itsRumo/userscripts/issues
// @downloadURL  https://github.com/itsRumo/userscripts/master/you-own-ddb.user.js
// @updateURL    https://github.com/itsRumo/userscripts/master/you-own-ddb.user.js
// @match        https://marketplace.dndbeyond.com/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=dndbeyond.com
// @grant        GM_setValue
// @grant        GM_getValue
// ==/UserScript==

(function() {
    'use strict';
    let timeout = 0;
    function expBackoff(start, factor, max, num) {
        let delay = start * factor ** num;
        delay = Math.min(max, delay);
        return delay;
    }
    function handleBook(node, links) {
        let aNodes = node.querySelectorAll("a.chakra-link:not(.rumo-checked):has(>div>div>div)");
        for (let a of aNodes) {
            let target = a.href.split("/").slice(-1)[0];
            a.classList.add("rumo-checked");
            if (links.has(target)) {
                a.classList.add("rumo-bought");
            }
        }
    }

    function observe(links) {
        handleBook(document.body, links);
        function observer(mutationEv) {
            /*
            let targets = mutationEv.filter(record => record.addedNodes.length > 0).map(record => record.target);
            targets = new Set(targets);
            targets.forEach(node => handleBook(node, links));
            */
            clearTimeout(timeout);
            timeout = setTimeout(() => handleBook(document.body, links), 1000);
        }

        let m = new MutationObserver(observer);
        m.observe(document.body, {subtree: true, childList: true});
    }

    const Cookies = Object.fromEntries(document.cookie.split(";").map(v => {
        let i_eq = v.indexOf("=");
        let name = v.substring(0, i_eq);
        let value = v.substring(i_eq + 1);
        return [name.trim(), value.trim()];
    }));

    async function getOwnedContent() {
        let response = await fetch(`https://marketplace.dndbeyond.com/mobify/proxy/api/customer/shopper-customers/v1/organizations/f_ecom_bfst_prd/customers/${Cookies.cid_DDBUS}?siteId=DDBUS`, {
            "credentials": "include",
            "headers": {
                "Authorization": `${decodeURI(Cookies.token_DDBUS)}`,
            },
            "method": "GET",
            "mode": "cors"
        });
        let json = await response.json();
        let owned = json.c_digitalProductsLicensed.split(",");
        return owned;
    }

    async function getBookIds(books) {
        let ids = encodeURIComponent(books.join(","));
        const target = `https://marketplace.dndbeyond.com/mobify/proxy/api/product/shopper-products/v1/organizations/f_ecom_bfst_prd/products?ids=${ids}&currency=USD&locale=en-US&siteId=DDBUS`;
        console.log(target);
        let response = await fetch(target, {
            "credentials": "include",
            "headers": {
                "Authorization": `${decodeURI(Cookies.token_DDBUS)}`,
            },
            "method": "GET",
            "mode": "cors"
        });
        let json = await response.json();
        let ret = Object.fromEntries(json.data.map(o => [o.id, o.master === undefined ? "rumos_dummy_path" : o.master.masterId]));
        Object.assign(ret, Object.fromEntries(books.filter(v => !(v in ret)).map(v => [v, v])));
        return ret;
    }

    function injectStyle() {
        const style = `div:has(>div>.rumo-bought) { filter: grayscale(100%)} div:has(>div>.rumo-bought)::after { content: "BOUGHT";position: absolute; top: 40%; left: 50%; transform: translate(-50%, -50%) rotate(-22.5deg); font-size: 3em; font-weight: bold; color: white; -webkit-text-stroke: 0.05em black;}`;
        let node = document.createElement("style");
        node.innerHTML = style;
        document.head.appendChild(node);
    }

    async function run() {
        injectStyle();

        let owned = await getOwnedContent();
        let id_map = await GM.getValue("id_map", {});

        let missing;
        while ((missing = owned.filter(v => !(v in id_map)).slice(0,24)).length > 0) {
            console.log(missing);
            Object.assign(id_map, await getBookIds(missing));
        }
        GM.setValue("id_map", id_map);

        observe(new Set(Object.entries(id_map).flat()));
    }
    run();
})();
