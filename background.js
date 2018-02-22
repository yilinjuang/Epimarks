"use strict";

// TODO: right-click edit/remove rule, rule page

let currentTabId = "";  // Current tab id of activated tab.
let currentBmId = "";   // Current bookmark id of activated tab.
let listening = false;
let anotherEpisodeTab = null;

chrome.tabs.onActivated.addListener(async function(info) {
    if (listening) return;
    currentTabId = info.tabId;
    currentBmId = await resolveBmId(currentTabId);
});

chrome.tabs.onUpdated.addListener(async function(tabId, info, tab) {
    if (listening) return;
    if (tabId === currentTabId) {  // Activated tab.
        currentBmId = await resolveBmId(currentTabId);
    }
});

chrome.tabs.onCreated.addListener(tab => {
    if (!listening) return;
    anotherEpisodeTab = tab;
});

chrome.storage.onChanged.addListener((changes, area) => {
    console.debug(area + " changed");
    console.debug(changes);
});

function resolveBmExistence(url, bmId) {
    return new Promise(resolve => {
        chrome.bookmarks.get(bmId, nodes => {
            if (chrome.runtime.lastError !== undefined) {
                resolve(false);
                return;
            }
            if (nodes[0].url.toLowerCase() !== url) {  // New episode ready for update.
                chrome.browserAction.setBadgeText({text: " "});
            }
            resolve(true);
        });
    });
}

function resolveBmId(tabId) {
    return new Promise(resolve => {
        unstarIcon();
        chrome.browserAction.setBadgeText({text: ""});
        chrome.tabs.get(tabId, tab => {
            console.debug(tab.url);
            let url = tab.url.toLowerCase();
            chrome.storage.local.get(null, async function(items) {
                for (let [r, bmId] of Object.entries(items)) {
                    let re = new RegExp(r.substring(1, r.length-1));  // Deserialize regexp object.
                    if (re.test(url)) {  // Regexp matches the url (this page).
                        if (await resolveBmExistence(url, bmId)) {
                            resolve(bmId);
                            starIcon();
                            return;
                        } else {  // Bookmark of this rule was removed.
                            chrome.storage.local.remove(r);  // Remove this rule.
                        }
                    }
                }
                resolve("");
            });
        });
    });
}

function resolveStatement(u) {
    return new Promise(resolve => {
        let statement = "Comfirm the tracking rule\n";
        chrome.bookmarks.search({url: u}, nodes => {  // TODO: substring search?
            console.log(nodes);
            if (nodes.length > 0) {
                statement += "Also matches\n";
                for (let n of nodes) {
                    statement += n.title + "\n";
                }
            }
            resolve(statement);
        });
    });
}

chrome.browserAction.onClicked.addListener(tab => {
    if (tab.url.toLowerCase().startsWith("chrome://")) {
        return;
    }
    if (currentBmId === "") {  // Untracked series.
        alert("Open another episode in new tab to start tracking");
        anotherEpisodeTab = null;
        listening = true;
        let checkTimes = 0;
        let check = setInterval(async function() {
            if (anotherEpisodeTab !== null) {
                let url = tab.url.toLowerCase();
                let ss = getSharedStart(url, anotherEpisodeTab.url.toLowerCase());

                // Prompt for confirmation.
                let statement = await resolveStatement(ss);
                let r = prompt(statement, "^" + ss + ".*");

                // Track series!
                let re = new RegExp(r);
                if (r !== null && re.test(url)) {
                    chrome.bookmarks.create({
                        title: tab.title,
                        url: tab.url
                    }, node => {
                        let item = {};
                        item[re] = node.id;
                        chrome.storage.local.set(item);
                        currentBmId = node.id;
                        starIcon();
                    });
                } else {
                    alert("Track failed")
                }

                // Stop checking.
                chrome.tabs.remove(anotherEpisodeTab.id);
                listening = false;
                clearInterval(check);
            } else {
                checkTimes += 1;
                if (checkTimes === 20) {
                    // Stop checking.
                    listening = false;
                    clearInterval(check);
                }
            }
        }, 500);
    } else {  // Tracked series.
        console.debug("Bookmark " + currentBmId + " is updated")
        chrome.browserAction.setBadgeText({text: ""});
        chrome.bookmarks.update(currentBmId, {
            title: tab.title,
            url: tab.url
        });
    }
});

function getSharedStart(s1, s2) {
    let i = 0;
    while (i < s1.length && s1.charAt(i) === s2.charAt(i)) i++;
    return s1.substring(0, i);
};

function starIcon() {
    chrome.browserAction.setIcon({
        path: {
            "16": "icons/bookmark16.png",
            "24": "icons/bookmark24.png",
            "32": "icons/bookmark32.png",
            "64": "icons/bookmark64.png"
        }
    });
};

function unstarIcon() {
    chrome.browserAction.setIcon({
        path: {
            "16": "icons/unbookmark16.png",
            "24": "icons/unbookmark24.png",
            "32": "icons/unbookmark32.png",
            "64": "icons/unbookmark64.png"
        }
    });
};
