// ==UserScript==
// @name         Pokemon Cafe Timing Tool
// @namespace    http://tampermonkey.net/
// @version      2026-05-01
// @description  Optimizes the timing of actions when making a reservation
// @author       Rumo
// @match        https://*.pokemon-cafe.jp
// @match        https://*.pokemon-cafe.jp/reserve/step*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=pokemon-cafe.jp
// @grant        none
// @run-at       document-start
// ==/UserScript==

(async function() {
    'use strict';

    function needsReload() {
        // return document.head.querySelector("link[data-turbolinks-track=reload]") !== null;
        console.log(window.performance.getEntriesByType("navigation")[0])
        let status = window.performance.getEntriesByType("navigation")[0].responseStatus;
        return status >= 500 && status < 600;
        //return document.body.querySelector("h3.page-english-title").textContent.includes("congested");
    }
    if (needsReload()) {
        location.reload();
        return;
    }

    const DEBUG = false;
    const TIMEZONE = "Asia/Tokyo";
    const OPENINGS = ["18:00", "18:20", "18:40", "19:00"].map(e => Temporal.PlainTime.from(e));
    const MS = "milliseconds";
    const PREFIRE = 250;
    const TIMEREGEX = /^(\d{1,2}:\d{1,2})~$/;
    const PREHEAT = Temporal.Duration.from({seconds: 2});

    async function preheatSocket(baseurl) {
        let url = new URL(baseurl);
        let uuid = encodeURI(crypto.randomUUID()) ;
        const start = Temporal.Now.instant().epochMilliseconds
        url.searchParams.append("_reqid", uuid);
        let observer = new Promise((resolve, reject) => {
            const obs = new PerformanceObserver((list, self) => {
                list = list.getEntries()
                    .filter(e => e.name.includes(uuid))
                for (const timings of list) {
                    let rtt = timings.secureConnectionStart - timings.connectStart;
                    if (isNaN(rtt)) {
                        rtt = 0;
                    }
                    self.disconnect();
                    console.log(`Oberserver/Fetch took ${Temporal.Now.instant().epochMilliseconds - start} ms`);
                    resolve(Math.round(rtt / 2));
                }
            });
            obs.observe({type: "resource"});
        });
        console.log("Sending warm-up request to server");
        let res = fetch(url, {method: "HEAD", cache: "no-store", credentials: "omit", priority: "high"});
        return observer;
    }

    function prettyUntil(instant) {
        return Temporal.Now.instant().until(instant).round({smallestUnit: "seconds", largestUnit: "hours"}).toLocaleString();
    }

    function pickRandom(slots) {
        let slot = slots[Math.floor(Math.random() * slots.length)];
        return slot;
    }

    function pickBest(slots) {
        let slot = slots.sort(s => s.rank)[0];
        return slot;
    }

    function closeTo(slots, time) {
        for (let slot of slots) {
            if (slot.time !== null) {
                slot.rank = slot.time?.until(time).abs().round({largestUnit: "minutes"}).minutes;
            }
        }
        return slots;
    }

    function parseSlot(slotElement) {
        let out = {
            area: null,
            time: null,
            slot: slotElement,
            rank: 0
        };
        try {
            out.area = slotElement.childNodes[0].textContent[0];
            out.time = Temporal.PlainTime.from(slotElement.childNodes[1].textContent.match(TIMEREGEX)[1]);
        } catch (e) {
            console.error(e);
        }
        return out;
    }

    function preferArea(slots, areaPref) {
        const areas = {};
        for (const slot of slots) {
            if (slot.area in areas) {
                areas[slot.area].push(slot);
            } else {
                areas[slot.area] = [slot];
            }
        }
        for (const c of areaPref) {
            if (c in areas && areas[c].length > 0) {
                return areas[c];
            }
        }
        return slots;
    }

    function msInDuration(duration) {
        let now = Temporal.Now.instant();
        let ms = duration.round({smallestUnit: MS, largestUnit: MS}).milliseconds;
        return ms;
    }

    function getNextOpening(now) {
        if (now === undefined) {
            now = Temporal.Now.instant();
        } else if (!(now instanceof Temporal.Instant)) {
            now = now.toInstant();
        }
        let date = now.toZonedDateTimeISO(TIMEZONE);
        let day = date.toPlainDateTime();
        let os = [day, day.add({days: 1})].map(
            d => OPENINGS
            .map(Temporal.PlainDateTime.prototype.withPlainTime.bind(d))
            .map(e => e.toZonedDateTime(TIMEZONE))
            .filter(o => Temporal.Instant.compare(o, now) >= 0)
            .sort(Temporal.Instant.compare)
        ).flat();
        return os[0];
    }

    async function until(instant, value) {
        let ms = msInDuration(Temporal.Now.instant().until(instant));
        return sleep(ms, value);
    }

    async function sleep(ms, value) {
        if (ms <= 0) return Promise.resolve(value);
        const target = Temporal.Now.instant().epochMilliseconds + ms;

        return new Promise((resolve, reject) => {
            function waiting() {
                let now = Temporal.Now.instant().epochMilliseconds
                if (now > target) {
                    console.debug(`Missed timing by ${now - target} ms`);
                    resolve(value);
                } else if (target - now < 1000) {
                    requestAnimationFrame(waiting);
                } else {
                    setTimeout(waiting, 1);
                }
            }
            setTimeout(waiting, ms - 2000);
        });
    }

    async function timedLogin(instant) {
    // https://osaka.pokemon-cafe.jp/
        let checkbox = document.querySelector("#agreeChecked");
        checkbox.click();

        await until(instant);
        let submit = document.querySelector(".button-container-agree button");
        submit.click();
    }

    async function tryReserve(instant) {
    // https://osaka.pokemon-cafe.jp/reserve/step1

        if (document.forms.length !== 2) return;

        let form = document.forms[1];

        let preheatInstant = instant.subtract(PREHEAT);
        console.log(`Will warm-up socket in ${prettyUntil(preheatInstant)}`);
        await until(preheatInstant);
        let delay = await Promise.race([
            preheatSocket(`${location.protocol}//${location.hostname}`),
            until(instant, 0)
        ]);

        await until(instant.subtract({milliseconds: Math.min(PREFIRE, delay)}));
        console.log(`Form submitted at ${Temporal.Now.instant()}`);
        form.submit();
    }

    function ready(callback) {
        console.log(document.readyState);
        if (document.readyState !== "loading") {
            callback();
        } else {
            console.log(document, window.addEventListener("DOMContentLoaded", callback));
        }
    }

    async function pickSlot(strategy) {
    // https://osaka.pokemon-cafe.jp/reserve/step2

        let slots = document.querySelectorAll("#time_table td a").values().map(parseSlot).toArray();

        let slot = null;
        if (slots.length >= 2) {
            slot = strategy(slots);
        } else if (slots.length === 1) {
            slot = slots[0];
        }

        if (slot !== null) {
            !DEBUG && slot.slot.click();
        } else {
            console.log("Unlucky... better luck next time :3");
        }
    }

    let rumoTT = {
        strategies: {
            pickBest: pickBest,
            pickRandom: pickRandom,
            closeTo: closeTo,
            preferArea: preferArea
        },
        utils: {
            sleep: sleep,
            until: until,
            msInDuration: msInDuration,
            getNextOpening: getNextOpening,
            needsReload: needsReload,
            parseSlot: parseSlot,
            prettyUntil: prettyUntil,
            preheatSocket: preheatSocket,
            ready: ready
        },
        CONSTS: Object.freeze({
            TIMEZONE: TIMEZONE,
            OPENINGS: OPENINGS,
            MS: MS,
            PREFIRE: PREFIRE,
            TIMEREGEX: TIMEREGEX,
            PREHEAT: PREHEAT
        }),
        trainers: {
            timedLogin: timedLogin,
            tryReserve: tryReserve,
            pickSlot: pickSlot
        },
        tips: [
            `For firefox: set dom.confirm_repost.testing.always_accept to true in about:config to enable fastest reloads on congestion`,
            `For windows: sync the local clock using: Win + R > timedate.cpl > Internet Time > Change settings... > Update now`
        ]
    };
    if (!("rumoTT" in window)) {
        window.rumoTT = rumoTT;
    }


    ready(function() {
        let chance = getNextOpening();
        if (DEBUG) {
            chance = Temporal.Now.instant().add({minutes: 3, seconds: 30}).toZonedDateTimeISO(TIMEZONE).with({second: 0, millisecond: 0, nanosecond: 0});
        }
        let login = chance.subtract({minutes: 3});

        const strategy = (slots => pickRandom(preferArea(slots, "ABC")));

        switch(location.pathname) {
            case "/":
                console.log(`Will automatically login in ${prettyUntil(login)}`);
                timedLogin(login);
                break;
            case "/reserve/step1":
                console.log(`Will automatically goto reservations in ${prettyUntil(chance)}\nPlease select number of guests and date of reservation in the meantime.`);
                tryReserve(chance);
                break;
            case "/reserve/step2":
                console.log(`Will select an available slot using the provided strategy: ${strategy.toString()}`);
                pickSlot(strategy);
                break;
        }
    });
})();
