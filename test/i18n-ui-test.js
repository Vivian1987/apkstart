'use strict';
const { app, BrowserWindow, ipcMain } = require('electron');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { getCatalog } = require('../src/core/i18n');
const sourceRoot = process.env.APKSTART_UI_SOURCE || path.join(__dirname, '../src');
let locale = 'pt-BR';
ipcMain.handle('test:language', () => locale);
ipcMain.handle('test:setLanguage', (_event, value) => { locale = value; });
const out = path.join(__dirname, 'out', 'i18n');
fs.mkdirSync(out, { recursive: true });
app.setPath('userData', path.join(out, 'profile'));
app.commandLine.appendSwitch('disable-features', 'CalculateNativeWinOcclusion');
app.whenReady().then(async () => {
  const win = new BrowserWindow({ width: 1120, height: 800, show: true, webPreferences: { preload: path.join(__dirname, 'i18n-ui-preload.js'), contextIsolation: true, nodeIntegration: false, sandbox: false } });
  const errors = [];
  win.webContents.on('console-message', (_event, level, message) => { if (level === 3) errors.push(message); });
  const waitReady = () => win.webContents.executeJavaScript(`new Promise((resolve, reject) => { let tries = 0; const tick = () => { if (window.i18n && document.documentElement.lang === '${locale}' && document.querySelector('.card')) resolve(true); else if (++tries > 100) reject(new Error('UI did not initialize')); else setTimeout(tick, 50); }; tick(); })`);
  try {
    await win.loadFile(path.join(sourceRoot, 'ui/index.html'));
    for (const next of ['pt-BR', 'en', 'zh-CN', 'pt-BR']) {
      if (locale !== next) {
        const loaded = new Promise(resolve => win.webContents.once('did-finish-load', resolve));
        await win.webContents.executeJavaScript(`document.getElementById('setLanguage').value = '${next}'; document.getElementById('setLanguage').dispatchEvent(new Event('change')); true;`);
        await loaded;
      }
      await waitReady();
      await win.webContents.executeJavaScript('openSettings()');
      const result = await win.webContents.executeJavaScript(`({lang: document.documentElement.lang, language: document.getElementById('setLanguage').value, title: document.querySelector('.modal-head h2').textContent, horizontalOverflow: document.querySelector('.modal-body').scrollWidth > document.querySelector('.modal-body').clientWidth, untranslated: [...document.querySelectorAll('[data-i18n]')].filter(el => el.textContent === el.dataset.i18n).length })`);
      assert.equal(result.lang, next);
      assert.equal(result.language, next);
      assert.equal(result.title, getCatalog(next).m0390);
      assert.equal(result.untranslated, 0);
      const priority = await win.webContents.executeJavaScript(`({ value: document.getElementById('setPriorityMode').value, label: document.querySelector('#setPriorityMode option[value="game"]').textContent, note: document.querySelector('[data-i18n="settings.gamePriorityNote"]').textContent })`);
      assert.equal(priority.value, 'game');
      assert.equal(priority.label, getCatalog(next)['settings.gamePriority']);
      assert.equal(priority.note, getCatalog(next)['settings.gamePriorityNote']);
      await new Promise(r => setTimeout(r, 600));
      fs.writeFileSync(path.join(out, `${next}-settings.png`), (await win.webContents.capturePage()).toPNG());
      console.log(next, JSON.stringify(result));
      assert.equal(result.horizontalOverflow, false, `${next}: settings overflow`);
      await win.webContents.executeJavaScript("document.getElementById('perfGroup').scrollIntoView({block:'start'}); true;");
      await new Promise(r => setTimeout(r, 300));
      fs.writeFileSync(path.join(out, `${next}-performance.png`), (await win.webContents.capturePage()).toPNG());
    }
    await win.webContents.executeJavaScript("closeSettings(); launchApp('org.example.app')");
    const toast = await win.webContents.executeJavaScript("document.querySelector('.t-title-text').textContent");
    assert.equal(toast, getCatalog('pt-BR').m0097);
    assert.deepEqual(errors, []);
    console.log('UI language persistence, settings, app launch toast and screenshots passed');
    app.exit(0);
  } catch (error) { console.error(error); app.exit(1); }
});

