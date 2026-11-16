'use strict';
const { contextBridge, ipcRenderer } = require('electron');
const fs = require('fs');
const path = require('path');
const settings = structuredClone(require('../src/core/store').DEFAULT_SETTINGS);
settings.engine.priorityMode = 'game';
const { getCatalog } = require('../src/core/i18n');
const api = {};
for (const match of fs.readFileSync(path.join(__dirname, '../src/preload.js'), 'utf8').matchAll(/^  (\w+): /gm)) {
  api[match[1]] = async () => ({ ok: true });
}
api.getI18n = async () => {
  const locale = await ipcRenderer.invoke('test:language');
  return { locale, preference: locale, messages: getCatalog(locale) };
};
api.getSettings = async () => ({ ...settings, language: await ipcRenderer.invoke('test:language') });
api.setSettings = async (patch) => { if (patch.language) await ipcRenderer.invoke('test:setLanguage', patch.language); return { ...settings, ...patch }; };
api.listApps = async () => [{ package: 'org.example.app', label: 'Sample app', versionName: '1.0', installedAt: Date.now() }];
api.runtimeStatus = async () => ({ adbOk: false, env: {}, phase: 'stopped' });
api.startupInfo = async () => ({ smoke: true, version: '0.4.2-i18n.1' });
api.info = async () => ({ version: '0.4.2-i18n.1', dataDir: 'F:\\Test', runtimeDir: 'F:\\Test\\runtime' });
api.doctorProfile = async () => ({});
api.runtimeUsage = async () => ({ totalText: '0 MB', reclaimable: 0, count: 0 });
api.dataInfo = async () => ({ imageGB: 6, freeDiskMB: 20480 });
api.selfCheck = async () => ({ issues: [] });
api.on = () => () => {};
api.android = { status: async () => ({ ok: false }), set: async () => ({ ok: true }) };
api.shell = { onState: () => () => {}, state: async () => ({ label: '', tip: '' }), minimize: () => {}, maximize: () => {}, close: () => {}, rotate: () => {} };
contextBridge.exposeInMainWorld('apkstart', api);
