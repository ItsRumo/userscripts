// ==UserScript==
// @name         Zelda Spoilerfree Interactive Map
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  Adds a modal to check off a Waypoint with coordinates
// @author       Metasion
// @match        https://www.zeldadungeon.net/tears-of-the-kingdom-interactive-map/*
// @icon         data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==
// @grant        none
// ==/UserScript==

const pois = [{name: "hinox", adr: [[0,24],[2,9]]}, {name: "talus", file: "ore.png", adr: [[0,25],[2,10]]}, {name:"molduga", adr: [[0,27]]}, {name:"frox", adr: [[2,12]]}, {name: "construct", file: "square.png", adr: [[1,12],[2,11]]}, {name:"gleeok", adr: [[0,26],[1,13],[2,13]]}, {name:"hudsonsign", adr: [[0,23]]}, {name:"oldmap", file:"oldmap.png", adr: [[1,16]]}, {name:"sageswill", file:"sageswill.png", adr: [[1,15]]}, {name: "cave", file: "cave.png", adr: [[0,14],[1,6]]}, {name: "well", file: "well.png", adr: [[0,15]]}, {name: "korok", file: "korok.png", adr: [[0,18],[1,8]]}];
function makeAllRadio(indent) {
    makeRadio = (poi) => `${indent}<input type="radio" name="poi" value="${poi.name}" id="poi-radio-${poi.name}"/>
${indent}<label for="poi-radio-${poi.name}">
${indent}    <img class="zd-legend__icon${!poi.file ? "__svg" : ""}" src="/maps/totk/icons/${poi.file ? poi.file : poi.name + ".svg"}"/>
${indent}</label>`;
    return pois.map(makeRadio).join("\n");
}
function makeDialog() {
    let d = document.createElement("dialog");
    d.setAttribute("id", "spoilerfree-modal");
    d.innerHTML = `<style>
        #spoilerfree-modal form {
            display: flex;
            flex-direction: column;
            gap: 0.1em;
            align-items: center;
            padding: 0.1em;
        }
        .coord-input {
            width: 6em;
        }
        #spoilerfree-modal input[type="radio"] {
            display: none;
        }
        #spoilerfree-modal label {
            height: 2em;
            width: 2em;
            display: inline-block;
        }
        #spoilerfree-modal :checked + label {
            outline: 3px solid black;
        }
        #spoilerfree-modal fieldset {
            border: 0;
            display:flex;
            flex-wrap: wrap;
            gap: 0.2em;
        }
        #spoilerfree-modal label > img {
            width: 100%;
            height: 100%;
        }
    </style>
    <button id="close">Close</button>
    <form>
        <input type="text" inputmode="numeric" pattern="-?\\d+" class="coord-input" name="lon" autofocus>
        <input type="text" inputmode="numeric" pattern="-?\\d+" class="coord-input" name="lat">
        <input type="text" inputmode="numeric" pattern="-?\\d+" class="coord-input" name="elv">
        <fieldset>
${makeAllRadio("          ")}
        </fieldset>
        <input type="submit" value="Mark completed">
    </form>`;
    return d;
}
const sfmarkers = await (async () => {
    let result = {};
    const jsonFetch = (layer) => fetch(`https://www.zeldadungeon.net/maps/totk/markers/${layer}/locations.json?v=2`, {
        "credentials": "include",
        "method": "GET",
    }).then((res) => res.json());
    const locs = await Promise.all([ "surface", "sky", "depths" ].map(jsonFetch));
    function collectFromAll(layers, addresses) {
        let res = [];
        for (let [layer,group] of addresses) {
            let pingroup = layers[layer][group];
            for (let zoomlayer of pingroup.layers) {
                res = res.concat(zoomlayer.markers.map((obj) => { return {name: obj.name, id:obj.id, coords: obj.coords.concat([obj.elv])}}));
            }
        }
        return res;
    }
    for (let poi of pois) {
        let name = poi.name;
        let list = collectFromAll(locs, poi.adr);
        result[name] = list;
    }
    return result;
})();
let closest = function(list, coords) {
    const sqDist = (a, b) => a.map((e,i) => Math.pow(e - b[i],2)).reduce((acc,e) => acc + e);
    let closestObj = list[0];
    let minDistance = sqDist(closestObj.coords, coords);
    for (let obj of list) {
        let d = sqDist(obj.coords, coords);
        if (d < minDistance) {
            minDistance = d;
            closestObj = obj;
        }
    }
    return [closestObj, Math.sqrt(minDistance)];
}
let spoilerfreeSubmit = async (event) => {
    event.preventDefault();
    let form = new FormData(event.target);
    console.log(form);
    let [marker, distance] = closest(sfmarkers[form.get("poi")], [form.get("lat"), form.get("lon"), form.get("elv")]);
    console.log(marker, distance);
    if (distance > 50) {
        alert(`There is no ${form.get("poi")} within 50m of those coordinates.`);
    } else {
        let token = await fetch("https://www.zeldadungeon.net/wiki/api.php?format=json&action=query&meta=tokens&type=csrf", {
            "credentials": "include",
            "referrer": "https://www.zeldadungeon.net/tears-of-the-kingdom-interactive-map/?lon=&lat=&elv=&poi=hinox&z=4&x=477&y=645&l=Surface&m=Talus_G23",
            "method": "GET",
        }).then((res) => res.json()).then((json) => json.query.tokens.csrftoken);
        fetch(`https://www.zeldadungeon.net/wiki/api.php?format=json&action=map_complete&map=totk&marker=${encodeURIComponent(marker.id)}`, {
            "credentials": "include",
            "headers": {
                'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8'
            },
            "body": `token=${encodeURIComponent(token)}`,
            "method": "POST",
        });
    }
}
(() => {
    let d = makeDialog();
    d.setAttribute("id", "spoilerfree-modal");
    let body = document.querySelector("body");
    body.insertBefore(d, body.firstChild);
    d.querySelector("form").addEventListener("submit", spoilerfreeSubmit);
    d.querySelector("#close").addEventListener("click", () => d.close());
    document.addEventListener("keyup", (e) => {
        if (e.key == "m") {
            document.querySelector("#spoilerfree-modal").showModal();
        }
    });
})();
