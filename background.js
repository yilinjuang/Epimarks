"use strict";

// TODO: right-click edit/remove rule, rule page, storage

let rules = new Map();  // Map of regexp rule to bookmark id.
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

function resolveBmId(tabId) {
    return new Promise(resolve => {
        unstarIcon();
        chrome.browserAction.setBadgeText({text: ""});
        chrome.tabs.get(tabId, tab => {
            console.log(tab.url);
            let url = tab.url.toLowerCase();
            for (let [re, bmId] of rules) {
                if (re.test(url)) {
                    resolve(bmId);
                    chrome.bookmarks.get(bmId, nodes => {
                        if (nodes[0].url.toLowerCase() !== url) {  // New episode ready for update.
                            chrome.browserAction.setBadgeText({text: " "});
                        }
                    });
                    starIcon();
                    return;
                }
            }
            resolve("");
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
                        // parentId:,
                        title: tab.title,
                        url: tab.url
                    }, node => {
                        rules.set(re, node.id);
                        currentBmId = node.id;
                        starIcon();
                        console.log(rules);
                    });
                } else {
                    alert("Track failed")
                }

                // Stop checking.
                chrome.tabs.remove(anotherEpisodeTab.id);
                listening = false;
                clearInterval(check);
            } else {
                console.log(checkTimes);
                checkTimes += 1;
                if (checkTimes === 20) {
                    // Stop checking.
                    listening = false;
                    clearInterval(check);
                }
            }
        }, 500);
    } else {  // Tracked series.
        console.log("Bookmark " + currentBmId + " is updated")
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
            "16": "icons/star16.png",
            "24": "icons/star24.png",
            "32": "icons/star32.png",
            "64": "icons/star64.png"
        }
    });
};

function unstarIcon() {
    chrome.browserAction.setIcon({
        path: {
            "16": "icons/unstar16.png",
            "24": "icons/unstar24.png",
            "32": "icons/unstar32.png",
            "64": "icons/unstar64.png"
        }
    });
};
