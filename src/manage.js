function limitStr(s, n) {
    if (s.length > n) {
        return s.substring(0, n) + "...";
    }
    return s;
}

function addCell(row, content, maxLength, bmId) {
    let c = row.insertCell();
    c.appendChild(document.createTextNode(limitStr(content, maxLength)));
    c.title = content;
    if (bmId !== undefined) { // Store bmId with cell match rule.
        c.dataset.bmId = bmId;
    }
}

function newIcon(type) {
    let d = document.createElement("i");
    d.className = "epifont-icons button " + type;
    d.innerText = type;
    d.addEventListener("click", (e) => {
        let clickedType = e.target.innerText;
        let matchRule = e.target.parentElement.previousElementSibling;
        let reStr = matchRule.title;
        if (clickedType === "edit") {
            let newReStr = prompt("Edit Match Rule (RegEx)", reStr);
            if (!newReStr || newReStr === reStr) { // Cancelled or unchanged.
                return;
            }
            let bmLink = matchRule.previousElementSibling.title;
            let newRe = new RegExp(newReStr.substring(1, newReStr.length-1));
            if (newRe.test(bmLink)) { // Check if new match rule fits bookmark.
                // Update match rule to storage. Delete first and insert again.
                chrome.storage.local.remove(reStr, () => {
                    if (chrome.runtime.lastError) { // Failed to remove.
                        alert("Something went wrong...Try again later");
                        return;
                    }
                    let item = {};
                    item[newReStr] = matchRule.dataset.bmId;
                    chrome.storage.local.set(item);
                    // Update table UI.
                    matchRule.innerText = limitStr(newReStr, 30);
                    matchRule.title = newReStr;
                });
            } else {
                alert("Edit failed. New rule doesn't match bookmark link.");
            }
        } else if (clickedType === "delete") {
            chrome.storage.local.remove(reStr, () => {
                if (chrome.runtime.lastError) { // Failed to remove.
                    alert("Something went wrong...Try again later");
                    return;
                }
                // Update table UI.
                let row = e.target.parentElement.parentElement;
                row.parentElement.removeChild(row);
            });
        } else {
            console.info("Unknown rule operation:", clickedType);
        }
    });
    return d;
}

function fillOutTable(name, link, rule, bmId) {
    let t = document.getElementById("rules");
    let r = t.insertRow();
    addCell(r, name, 15);
    addCell(r, link, 30);
    addCell(r, rule, 30, bmId);
    let iconCell = r.insertCell();
    iconCell.appendChild(newIcon("edit"));
    iconCell.appendChild(newIcon("delete"));
}

(function() {
    chrome.storage.local.get(null, (rules) => {
        if (chrome.runtime.lastError) { // Failed to retrieve.
            alert("Something went wrong...Try again later");
            console.error(chrome.runtime.lastError.message);
            return;
        }
        for (let [re, bmId] of Object.entries(rules)) {
            chrome.bookmarks.get(bmId, (nodes) => {
                if (chrome.runtime.lastError) {
                    console.error(chrome.runtime.lastError.message);
                    return;
                }
                if (!Array.isArray(nodes) || !nodes.length) {
                    return;
                }
                fillOutTable(nodes[0].title, nodes[0].url, re, bmId);
            });
        }
    });
})();
