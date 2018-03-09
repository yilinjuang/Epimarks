"use strict";

let currentTabId = ""; // Current tab id of activated tab.
let currentBmId = ""; // Current bookmark id of activated tab.
let newTracking = {}; // Tracking new series. `windowId`, `title` and `url`.

chrome.runtime.onMessage.addListener((msg, sender, response) => {
    if (msg.hintClosed) {
        chrome.windows.create({
            url: newTracking.url,
            focused: true,
            type: "normal",
        }, (w) => {
            newTracking.windowId = w.id;
        });
    } else {
        console.info("Received unknown message:", msg);
    }
});

chrome.windows.onFocusChanged.addListener((windowId) => {
    if ((!newTracking.windowId && newTracking.url) ||
            windowId === newTracking.windowId) {
        halfableIcon();
    } else {
        chrome.tabs.query({
            active: true,
            windowId: windowId,
        }, async (tabs) => {
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

chrome.tabs.onActivated.addListener(async (info) => {
    if (info.windowId === newTracking.windowId) return;
    currentTabId = info.tabId;
    currentBmId = await resolveBmId(currentTabId);
});

chrome.tabs.onUpdated.addListener(async (tabId, info, tab) => {
    if (tab.windowId === newTracking.windowId) return;
    if (tabId === currentTabId) { // Activated tab.
        currentBmId = await resolveBmId(currentTabId);
    }
});

chrome.storage.onChanged.addListener((changes, area) => {
    console.debug(area, "changed:", changes);
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
            if (chrome.runtime.lastError) { // Tab closed before resolved.
                console.error(chrome.runtime.lastError.message);
                resolve("");
                return;
            }
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
    if (!tab.url.toLowerCase().startsWith("http://") &&
        !tab.url.toLowerCase().startsWith("https://")) {
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
            alert("Something went wrong...Try again later");
        }

        chrome.windows.remove(newTracking.windowId);
        newTracking = {};
        return;
    }
    if (currentBmId === "") { // Untracked series.
        newTracking.url = tab.url;
        newTracking.title = tab.title;
        // Hint!
        chrome.tabs.executeScript(tab.id, {
            file: "src/tingle.min.js",
        }, () => {
            if (chrome.runtime.lastError) {
                console.error(chrome.runtime.lastError.message);
                return;
            }
            chrome.tabs.insertCSS(tab.id, {
                file: "src/tingle.min.css",
            }, () => {
                chrome.tabs.executeScript(tab.id, {
                    file: "src/hint.js",
                });
            });
        });
    } else { // Tracked series.
        chrome.browserAction.getBadgeText({}, (text) => {
            if (text === "") { // Already up-to-date.
                return;
            }
            chrome.browserAction.setBadgeText({text: ""});
            chrome.bookmarks.update(currentBmId, {
                title: tab.title,
                url: tab.url,
            }, (bm) => {
                if (chrome.runtime.lastError) { // Bookmark was removed.
                    console.log(chrome.runtime.lastError.message);
                    disableIcon();
                    currentBmId = "";
                    return;
                }
                console.debug("Bookmark", currentBmId, "is updated");
            });
        });
    }
});

chrome.contextMenus.create({
    title: "Manage My Epimarks",
    contexts: ["browser_action"],
    onclick: (info, tab) => {
        chrome.tabs.create({
            url: chrome.runtime.getURL("src/manage.html"),
        });
    },
});

function getSharedStart(s1, s2) {
    let i = 0;
    while (i < s1.length && s1.charAt(i) === s2.charAt(i)) i++;
    return s1.substring(0, i);
}

function changeIcon(type) {
    chrome.browserAction.setIcon({
        path: {
            "16": "icons/" + type + "bookmark16.png",
            "24": "icons/" + type + "bookmark24.png",
            "32": "icons/" + type + "bookmark32.png",
            "64": "icons/" + type + "bookmark64.png",
        },
    });
}

function enableIcon() {
    changeIcon("");
}

function halfableIcon() {
    changeIcon("half");
}

function disableIcon() {
    changeIcon("un");
}
