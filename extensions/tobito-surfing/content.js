(function () {
    'use strict';
    if (window.__tbtSurfExtension) return;
    let engine;
    let current = TobitoSurf.settings();
    const state = () => ({ active: !!engine?.active, settings: current });
    const stop = () => { engine?.stop(); engine = null; };
    const start = () => {
        stop();
        engine = new TobitoSurf.Engine(document.documentElement, {
            settings: current, fullScreen: true,
            assetUrl: name => chrome.runtime.getURL('images/' + name),
            onClose: () => { engine = null; }
        });
    };
    window.__tbtSurfExtension = true;
    chrome.runtime.onMessage.addListener((message, sender, reply) => {
        if (message?.namespace !== 'tbt-surf') return;
        if (message.settings) current = TobitoSurf.settings(message.settings);
        if (message.command === 'start') start();
        if (message.command === 'stop') stop();
        if (message.command === 'update') engine?.update(current);
        reply(state());
    });
    chrome.storage.onChanged.addListener((changes, area) => {
        if (area === 'local' && changes.surfSettings) {
            current = TobitoSurf.settings(changes.surfSettings.newValue);
            engine?.update(current);
        }
    });
    chrome.storage.local.get(['surfSettings', 'autoSites']).then(saved => {
        current = TobitoSurf.settings(saved.surfSettings);
        if (saved.autoSites?.includes(location.origin) && !engine) start();
    });
})();
