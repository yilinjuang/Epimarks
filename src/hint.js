// https://robinparisi.github.io/tingle/

(function() {
    let modal = new tingle.modal({
        closeMethods: ["overlay", "button", "escape"],
        onClose: () => {
            chrome.runtime.sendMessage({hintClosed: true});
        },
    });
    modal.setContent(`<div style="font-family: 'Varela Round', sans-serif;">
<h1>Almost Done!</h1>
<h3>Open another episode in this window and click Epimarks again to confirm.</h3>
<p>Hint: Open <i>same-season</i> episode for season tracking.</p>
<p>Open <i>different-season but same-series</i> episode for series tracking.</p>
</div>`);
    modal.open();
})();
