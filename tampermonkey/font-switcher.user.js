// ==UserScript==
// @name         RMS Font Switcher
// @namespace    https://chatao.github.io/rms-fonts/
// @version      1.0.1
// @description  Live-Switcher fuer headbadge RMS Fonts auf beliebigen Seiten
// @author       headbadge
// @match        *://*/*
// @include      *
// @run-at       document-end
// @grant        none
// @noframes
// ==/UserScript==

(function () {
  'use strict';
  try { window.__RMS_FS_LOADED__ = true; } catch (e) {}
  console.log('[RMS Font Switcher] v1.0.1 loaded on', location.href);

  const FONT_BASE = 'https://chatao.github.io/rms-fonts/fonts/';
  const STORAGE_KEY = 'rms-font-switcher-v1';

  const FONTS = {
    'system': { family: null, label: 'Original' },
    'pp-editorial': {
      family: 'PP Editorial Old',
      label: 'PP Editorial Old',
      faces: [
        { file: 'PPEditorialOld-Regular.woff2',    weight: 400, style: 'normal' },
        { file: 'PPEditorialOld-Italic.woff2',     weight: 400, style: 'italic' },
        { file: 'PPEditorialOld-Bold.woff2',       weight: 700, style: 'normal' },
        { file: 'PPEditorialOld-BoldItalic.woff2', weight: 700, style: 'italic' },
      ],
    },
    'pp-watch': {
      family: 'PP Watch',
      label: 'PP Watch',
      faces: [
        { file: 'PPWatch-Regular.woff2', weight: 400, style: 'normal' },
        { file: 'PPWatch-Medium.woff2',  weight: 500, style: 'normal' },
        { file: 'PPWatch-Bold.woff2',    weight: 700, style: 'normal' },
      ],
    },
    'founders-hand': {
      family: 'Founders Hand',
      label: 'Founders Hand',
      faces: [
        { file: 'FoundersHandRegular.woff2', weight: 400, style: 'normal' },
      ],
    },
  };

  const faceCss = Object.values(FONTS)
    .filter((f) => f.faces)
    .flatMap((f) =>
      f.faces.map(
        (face) => `@font-face{font-family:'${f.family}';src:url('${FONT_BASE}${face.file}') format('woff2');font-weight:${face.weight};font-style:${face.style};font-display:swap;}`
      )
    )
    .join('\n');

  const faceStyle = document.createElement('style');
  faceStyle.id = 'rms-fonts-face';
  faceStyle.textContent = faceCss;
  document.head.appendChild(faceStyle);

  const overrideStyle = document.createElement('style');
  overrideStyle.id = 'rms-fonts-override';
  document.head.appendChild(overrideStyle);

  const applyOverride = (bodyKey, headingKey) => {
    const bodyFont = FONTS[bodyKey];
    const headingFont = FONTS[headingKey];
    const rules = [];

    if (bodyFont && bodyFont.family) {
      const bf = `'${bodyFont.family}'`;
      rules.push(`body{font-family:${bf} !important;}`);
      rules.push(
        `p,li,td,th,a,button,input,textarea,select,label,blockquote,figcaption,dd,dt,summary,caption,div,span{font-family:inherit !important;}`
      );
    }
    if (headingFont && headingFont.family) {
      const hf = `'${headingFont.family}'`;
      rules.push(`h1,h2,h3,h4,h5,h6{font-family:${hf} !important;}`);
    }
    overrideStyle.textContent = rules.join('\n');
  };

  const saved = (() => {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}'); }
    catch { return {}; }
  })();
  let bodyKey = FONTS[saved.body] ? saved.body : 'system';
  let headingKey = FONTS[saved.heading] ? saved.heading : 'system';
  applyOverride(bodyKey, headingKey);

  const uiStyle = document.createElement('style');
  uiStyle.textContent = `
    #rms-fs-panel{position:fixed;bottom:16px;right:16px;z-index:2147483647;font-family:-apple-system,system-ui,"Segoe UI",sans-serif !important;font-size:13px;color:#111;line-height:1.3;}
    #rms-fs-toggle{width:44px;height:44px;border-radius:22px;background:#111;color:#fff;border:none;cursor:pointer;font-weight:600;font-size:16px;box-shadow:0 4px 12px rgba(0,0,0,.25);font-family:inherit !important;}
    #rms-fs-toggle:hover{background:#333;}
    #rms-fs-controls{position:absolute;bottom:52px;right:0;background:#fff;padding:14px;border-radius:10px;min-width:240px;box-shadow:0 6px 20px rgba(0,0,0,.18);display:flex;flex-direction:column;gap:10px;border:1px solid #e5e5e5;}
    #rms-fs-controls[hidden]{display:none;}
    #rms-fs-controls .rms-fs-row{display:flex;flex-direction:column;gap:4px;}
    #rms-fs-controls label{font-weight:600;font-size:11px;text-transform:uppercase;letter-spacing:.04em;color:#555;}
    #rms-fs-controls select{padding:6px 8px;border:1px solid #ccc;border-radius:6px;background:#fff;font-family:inherit !important;font-size:13px;}
    #rms-fs-controls .rms-fs-actions{display:flex;gap:6px;margin-top:4px;}
    #rms-fs-controls .rms-fs-actions button{flex:1;padding:7px;cursor:pointer;border:1px solid #ccc;border-radius:6px;background:#f5f5f5;font-family:inherit !important;font-size:12px;}
    #rms-fs-controls .rms-fs-actions button:hover{background:#eaeaea;}
    #rms-fs-head{display:flex;justify-content:space-between;align-items:center;}
    #rms-fs-head strong{font-size:12px;text-transform:uppercase;letter-spacing:.06em;}
    #rms-fs-close{background:none;border:none;font-size:16px;cursor:pointer;color:#888;padding:0;line-height:1;}
  `;
  document.head.appendChild(uiStyle);

  const panel = document.createElement('div');
  panel.id = 'rms-fs-panel';
  panel.innerHTML = `
    <button id="rms-fs-toggle" title="RMS Font Switcher">Aa</button>
    <div id="rms-fs-controls" hidden>
      <div id="rms-fs-head">
        <strong>RMS Fonts</strong>
        <button id="rms-fs-close" aria-label="Schliessen">&times;</button>
      </div>
      <div class="rms-fs-row">
        <label for="rms-fs-body">Body</label>
        <select id="rms-fs-body"></select>
      </div>
      <div class="rms-fs-row">
        <label for="rms-fs-heading">Headings</label>
        <select id="rms-fs-heading"></select>
      </div>
      <div class="rms-fs-actions">
        <button id="rms-fs-reset">Zuruecksetzen</button>
      </div>
    </div>
  `;

  const mount = () => {
    if (!document.body) return requestAnimationFrame(mount);
    document.body.appendChild(panel);
    init();
  };
  mount();

  function init() {
    const toggle = panel.querySelector('#rms-fs-toggle');
    const controls = panel.querySelector('#rms-fs-controls');
    const closeBtn = panel.querySelector('#rms-fs-close');
    const bodySel = panel.querySelector('#rms-fs-body');
    const headingSel = panel.querySelector('#rms-fs-heading');
    const resetBtn = panel.querySelector('#rms-fs-reset');

    Object.entries(FONTS).forEach(([key, { label }]) => {
      [bodySel, headingSel].forEach((sel) => {
        const opt = document.createElement('option');
        opt.value = key;
        opt.textContent = label;
        sel.appendChild(opt);
      });
    });
    bodySel.value = bodyKey;
    headingSel.value = headingKey;

    const persist = () => {
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify({ body: bodyKey, heading: headingKey })); }
      catch {}
      applyOverride(bodyKey, headingKey);
    };

    toggle.addEventListener('click', () => { controls.hidden = !controls.hidden; });
    closeBtn.addEventListener('click', () => { controls.hidden = true; });
    bodySel.addEventListener('change', (e) => { bodyKey = e.target.value; persist(); });
    headingSel.addEventListener('change', (e) => { headingKey = e.target.value; persist(); });
    resetBtn.addEventListener('click', () => {
      bodyKey = 'system';
      headingKey = 'system';
      bodySel.value = 'system';
      headingSel.value = 'system';
      persist();
    });
  }
})();
