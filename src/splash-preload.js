'use strict';
const { contextBridge, ipcRenderer } = require('electron');

// 界面语言：与主窗口共用 src/i18n（i18n-dom.js 读取 window.apkstart.i18n）
const i18n = require('./i18n');
i18n.setLang(require('./core/store').getSettings().language);
contextBridge.exposeInMainWorld('apkstart', {
  i18n: {
    lang: i18n.getLang(),
    tag: i18n.localeTag(),
    languages: i18n.LANGUAGES.map((l) => ({ ...l })),
    t: (src, vars) => i18n.t(src, vars),
  },
});

contextBridge.exposeInMainWorld('apkstartSplash', {
  version: () => ipcRenderer.invoke('splash:version'),
  isFirstRun: () => ipcRenderer.invoke('splash:isFirstRun'),
  onProgress: (cb) => { ipcRenderer.on('splash:progress', (_e, p) => cb(p)); },
  onDone: (cb) => { ipcRenderer.on('splash:done', () => cb()); },
  close: () => ipcRenderer.send('splash:close'),
});
