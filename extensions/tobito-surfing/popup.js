(async function () {
    'use strict';
    const controls = Object.fromEntries(['enabled', 'count', 'size', 'speed', 'mode', 'skin', 'auto-site'].map(id => [id, document.getElementById(id)]));
    const status = document.getElementById('status');
    let tab, origin, active = false;
    const saved = await chrome.storage.local.get(['surfSettings', 'autoSites']);
    const initial = TobitoSurf.settings(saved.surfSettings);
    const autoSites = new Set(saved.autoSites || []);
    const read = () => TobitoSurf.settings(Object.fromEntries(['count', 'size', 'speed', 'mode', 'skin'].map(key => [key, controls[key].value])));
    const outputs = () => {
        for (const key of ['count', 'size', 'speed']) {
            document.getElementById(key + '-value').textContent = controls[key].value + (key === 'size' ? 'px' : key === 'speed' ? '×' : '');
        }
    };
    for (const [key, value] of Object.entries(initial)) controls[key].value = value;
    outputs();
    try {
        [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        const url = new URL(tab.url);
        if (!['http:', 'https:'].includes(url.protocol)) throw new Error('このページでは表示できません。通常のWebサイトで開いてください。');
        origin = url.origin;
        controls['auto-site'].checked = autoSites.has(origin);
    } catch (error) {
        Object.values(controls).forEach(control => { control.disabled = true; });
        status.textContent = error.message;
        return;
    }
    async function send(command) {
        const message = { namespace: 'tbt-surf', command, settings: read() };
        try { return await chrome.tabs.sendMessage(tab.id, message); }
        catch (error) {
            if (command === 'status' || command === 'stop') return { active: false };
            await chrome.scripting.executeScript({ target: { tabId: tab.id }, files: ['surf-core.js', 'content.js'] });
            return chrome.tabs.sendMessage(tab.id, message);
        }
    }
    const failure = error => { status.textContent = '表示できませんでした。このページでは拡張機能が制限されている場合があります。'; console.warn(error); };
    controls.enabled.addEventListener('change', async () => {
        controls.enabled.disabled = true;
        try {
            const result = await send(controls.enabled.checked ? 'start' : 'stop');
            active = result.active;
            controls.enabled.checked = active;
            status.textContent = active ? '表示中' : '停止中';
        } catch (error) { controls.enabled.checked = false; active = false; failure(error); }
        finally { controls.enabled.disabled = false; }
    });
    for (const key of ['count', 'size', 'speed', 'mode', 'skin']) {
        controls[key].addEventListener(key === 'mode' || key === 'skin' ? 'change' : 'input', async () => {
            outputs();
            try {
                await chrome.storage.local.set({ surfSettings: read() });
                if (active) active = (await send('update')).active;
            } catch (error) { failure(error); }
        });
    }
    const scriptId = 'tbt-surf-' + Array.from(origin).reduce((hash, char) => Math.imul(31, hash) + char.charCodeAt(0) | 0, 0).toString(16);
    controls['auto-site'].addEventListener('change', async () => {
        const enabled = controls['auto-site'].checked;
        controls['auto-site'].disabled = true;
        try {
            // Keep this permission request in the checkbox's user gesture.
            if (enabled && !await chrome.permissions.request({ origins: [origin + '/*'] })) {
                controls['auto-site'].checked = false;
                status.textContent = '自動表示の許可は付与されませんでした。';
                return;
            }
            const registrations = await chrome.scripting.getRegisteredContentScripts({ ids: [scriptId] });
            if (registrations.length) await chrome.scripting.unregisterContentScripts({ ids: [scriptId] });
            if (enabled) {
                await chrome.scripting.registerContentScripts([{
                    id: scriptId, matches: [origin + '/*'], js: ['surf-core.js', 'content.js'],
                    runAt: 'document_idle', persistAcrossSessions: true
                }]);
                autoSites.add(origin);
            } else {
                autoSites.delete(origin);
                await chrome.permissions.remove({ origins: [origin + '/*'] });
            }
            await chrome.storage.local.set({ autoSites: Array.from(autoSites) });
            status.textContent = enabled ? '次回から、このサイトで自動表示します。' : '自動表示を解除しました。';
        } catch (error) { controls['auto-site'].checked = autoSites.has(origin); failure(error); }
        finally { controls['auto-site'].disabled = false; }
    });
    active = (await send('status')).active;
    controls.enabled.checked = active;
    status.textContent = active ? '表示中' : '停止中';
})();
