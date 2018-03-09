// https://robinparisi.github.io/tingle/

(function() {
    let modal = new tingle.modal({
        closeMethods: ["overlay", "button", "escape"],
        onClose: () => {
            chrome.runtime.sendMessage({hintClosed: true});
        },
    });
    let generalCss = "display:block;padding:0;font-family:sans-serif";
    modal.setContent(`
<h1 style="${generalCss};font-size:2em;margin:0.67em 0;font-weight:bold;">
    Almost Done!
</h1>
<h3 style="${generalCss};font-size:1.17em;margin:1em 0;font-weight:bold;">
    Open another episode in this window and click Epimarks again to confirm.
</h3>
<p style="${generalCss};margin:0;">
    Hint: Open <i>same-season</i> episode for season tracking.
</p>
<p style="${generalCss};margin:0;">
    Open <i>different-season but same-series</i> episode for series tracking.
</p>
`);
    modal.open();
})();
