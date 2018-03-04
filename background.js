"use strict";

// TODO: right-click edit/remove rule, rule page

let currentTabId = ""; // Current tab id of activated tab.
let currentBmId = ""; // Current bookmark id of activated tab.
let newTracking = {}; // Tracking new series. `windowId`, `title` and `url`.

chrome.windows.onFocusChanged.addListener((windowId) => {
    if ((!newTracking.windowId && newTracking.url) ||
            windowId === newTracking.windowId) {
        halfableIcon();
    } else {
        chrome.tabs.query({
            active: true,
            windowId: windowId,
        }, async function(tabs) {
            if (tabs.length > 1) { // Current at abnormal window.
                return;
            }
            currentTabId = tabs[0].id;
            currentBmId = await resolveBmId(currentTabId);
        });
    }
});


chrome.windows.onRemoved.addListener((windowId) => {
    if (windowId === newTracking.windowId) {
        newTracking = {};
    }
});

chrome.tabs.onActivated.addListener(async function(info) {
    if (info.windowId === newTracking.windowId) return;
    currentTabId = info.tabId;
    currentBmId = await resolveBmId(currentTabId);
});

chrome.tabs.onUpdated.addListener(async function(tabId, info, tab) {
    if (tab.windowId === newTracking.windowId) return;
    if (tabId === currentTabId) { // Activated tab.
        currentBmId = await resolveBmId(currentTabId);
    }
});

chrome.storage.onChanged.addListener((changes, area) => {
    console.debug(area + " changed");
    console.debug(changes);
});

function resolveBmExistence(url, bmId) {
    return new Promise((resolve) => {
        chrome.bookmarks.get(bmId, (nodes) => {
            if (chrome.runtime.lastError) {
                console.error(chrome.runtime.lastError.message);
                resolve(false);
                return;
            }
            if (!Array.isArray(nodes) || !nodes.length) {
                resolve(false);
                return;
            }

            // New episode ready for update.
            if (nodes[0].url.toLowerCase() !== url) {
                chrome.browserAction.setBadgeText({text: " "});
            }
            resolve(true);
        });
    });
}

function resolveBmId(tabId) {
    return new Promise((resolve) => {
        disableIcon();
        chrome.browserAction.setBadgeText({text: ""});
        chrome.tabs.get(tabId, (tab) => {
            console.debug(tab.url);
            let url = tab.url.toLowerCase();
            chrome.storage.local.get(null, async function(items) {
                for (let [r, bmId] of Object.entries(items)) {
                    // Deserialize regexp object.
                    let re = new RegExp(r.substring(1, r.length-1));
                    if (re.test(url)) { // Regexp matches the url (this page).
                        if (await resolveBmExistence(url, bmId)) {
                            resolve(bmId);
                            enableIcon();
                            return;
                        } else { // Bookmark of this rule was removed.
                            chrome.storage.local.remove(r); // Remove this rule.
                        }
                    }
                }
                resolve("");
            });
        });
    });
}

chrome.browserAction.onClicked.addListener((tab) => {
    if (tab.url.toLowerCase().startsWith("chrome://")) {
        return;
    }
    if (tab.windowId === newTracking.windowId) { // Tracking window.
        let url = tab.url.toLowerCase();
        let ss = getSharedStart(url, newTracking.url.toLowerCase());

        // Track series!
        let re = new RegExp("^" + ss + ".*");
        if (re.test(url)) {
            chrome.bookmarks.create({
                title: newTracking.title,
                url: newTracking.url,
            }, (node) => {
                let item = {};
                item[re] = node.id;
                chrome.storage.local.set(item);
            });
        } else {
            alert("Track failed");
        }

        chrome.windows.remove(newTracking.windowId);
        newTracking = {};
        return;
    }
    if (currentBmId === "") { // Untracked series.
        newTracking.url = tab.url;
        newTracking.title = tab.title;
        chrome.windows.create({
            url: tab.url,
            focused: true,
            type: "normal", // "popup"
        }, (w) => {
            newTracking.windowId = w.id;
        });
        alert("Open another episode in this window and click Epimarks again " +
            "to confirm.\n\nHint:\nOpen same-season episode for season " +
            "tracking.\nOpen different-season same-series episode for series " +
            "tracking.");
    } else { // Tracked series.
        console.debug("Bookmark " + currentBmId + " is updated");
        chrome.browserAction.setBadgeText({text: ""});
        chrome.bookmarks.update(currentBmId, {
            title: tab.title,
            url: tab.url,
        });
    }
});

function getSharedStart(s1, s2) {
    let i = 0;
    while (i < s1.length && s1.charAt(i) === s2.charAt(i)) i++;
    return s1.substring(0, i);
}

function enableIcon() {
    chrome.browserAction.setIcon({
        path: {
            "16": "icons/bookmark16.png",
            "24": "icons/bookmark24.png",
            "32": "icons/bookmark32.png",
            "64": "icons/bookmark64.png",
        },
    });
}

function halfableIcon() {
    chrome.browserAction.setIcon({
        path: {
            "16": "icons/halfbookmark16.png",
            "24": "icons/halfbookmark24.png",
            "32": "icons/halfbookmark32.png",
            "64": "icons/halfbookmark64.png",
        },
    });
}

function disableIcon() {
    chrome.browserAction.setIcon({
        path: {
            "16": "icons/unbookmark16.png",
            "24": "icons/unbookmark24.png",
            "32": "icons/unbookmark32.png",
            "64": "icons/unbookmark64.png",
        },
    });
}
