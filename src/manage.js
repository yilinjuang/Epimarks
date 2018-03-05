function limitStr(s, n) {
    if (s.length > n) {
        return s.substring(0, n) + "...";
    }
    return s;
}

function addCell(row, content, maxLength) {
    let c = row.insertCell();
    c.appendChild(document.createTextNode(limitStr(content, maxLength)));
    c.title = content;
}

function newIcon(type) {
    let d = document.createElement("i");
    d.className = "material-icons button " + type;
    d.innerText = type;
    return d;
}

function fillOutTable(name, link, rule) {
    let t = document.getElementById("rules");
    let r = t.insertRow();
    addCell(r, name, 15);
    addCell(r, link, 30);
    addCell(r, rule, 30);
    let iconCell = r.insertCell();
    iconCell.appendChild(newIcon("edit"));
    iconCell.appendChild(newIcon("delete"));
}

(function() {
    chrome.storage.local.get(null, (rules) => {
        for (let re in rules) {
            if (rules.hasOwnProperty(re)) {
                let bmId = rules[re];
                chrome.bookmarks.get(bmId, (nodes) => {
                    if (chrome.runtime.lastError) {
                        console.error(chrome.runtime.lastError.message);
                        return;
                    }
                    if (!Array.isArray(nodes) || !nodes.length) {
                        return;
                    }
                    fillOutTable(nodes[0].title, nodes[0].url, re);
                });
            }
        }
    });
})();
