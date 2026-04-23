// ==UserScript==
// @name         RMS Font Switcher
// @namespace    https://chatao.github.io/rms-fonts/
// @version      1.4.0
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
  console.log('[RMS Font Switcher] v1.4.0 loaded on', location.href);

  const WEIGHT_LABELS = {
    100: 'Thin', 200: 'Extralight', 300: 'Light', 400: 'Regular',
    500: 'Medium', 600: 'Semibold', 700: 'Bold', 800: 'Extrabold', 900: 'Black',
  };

  const BODY_CLASS = 'rms-fs-active';
  const SLOTS = [
    { key: 'title',    label: 'Title',    selector: '.is-size-huge, .is-size-1, .hero-title' },
    { key: 'h1',       label: 'H1',       selector: 'h1' },
    { key: 'h2',       label: 'H2',       selector: 'h2' },
    { key: 'h3',       label: 'H3',       selector: 'h3' },
    { key: 'subtitle', label: 'Subtitle', selector: '.subtitle, .teaser-subtitle' },
    { key: 'teaser',   label: 'Teaser',   selector: '.teaser-headline, .card-headline, .kpi-figures__headline, .kpi-figures__subheadline, .nav-item-title, .accordion-header-title' },
    { key: 'body',     label: 'Body',     selector: null },
  ];

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

  const VARIANTS = [{ value: 'system', label: 'Original', family: null, weight: null }];
  Object.entries(FONTS).forEach(([key, font]) => {
    if (!font.faces) return;
    const weights = [...new Set(font.faces.filter((f) => f.style === 'normal').map((f) => f.weight))].sort((a, b) => a - b);
    if (weights.length === 1) {
      VARIANTS.push({ value: key, label: font.label, family: key, weight: weights[0] });
    } else {
      weights.forEach((w) => {
        VARIANTS.push({
          value: `${key}:${w}`,
          label: `${font.label} — ${WEIGHT_LABELS[w] || w}`,
          family: key,
          weight: w,
        });
      });
    }
  });
  const VARIANT_BY_VALUE = Object.fromEntries(VARIANTS.map((v) => [v.value, v]));

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

  const declFor = (variant) => {
    if (!variant || !variant.family) return null;
    const font = FONTS[variant.family];
    if (!font) return null;
    let d = `font-family:'${font.family}' !important;`;
    if (variant.weight) d += `font-weight:${variant.weight} !important;`;
    return d;
  };

  const applyOverride = (selection) => {
    const rules = [];
    const bodyDecl = declFor(VARIANT_BY_VALUE[selection.body]);

    if (bodyDecl) {
      rules.push(`body.${BODY_CLASS}{${bodyDecl}}`);
      rules.push(`body.${BODY_CLASS} *{font-family:inherit !important;}`);
    }
    SLOTS.forEach((slot) => {
      if (slot.key === 'body' || !slot.selector) return;
      const decl = declFor(VARIANT_BY_VALUE[selection[slot.key]]);
      if (decl) {
        rules.push(`body.${BODY_CLASS} :is(${slot.selector}){${decl}}`);
      }
    });
    overrideStyle.textContent = rules.join('\n');
  };

  const saved = (() => {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}'); }
    catch { return {}; }
  })();
  const selection = {};
  SLOTS.forEach((slot) => {
    const s = saved[slot.key];
    selection[slot.key] = VARIANT_BY_VALUE[s] ? s : 'system';
  });
  applyOverride(selection);

  const uiStyle = document.createElement('style');
  uiStyle.textContent = `
    #rms-fs-panel{position:fixed;bottom:16px;right:16px;z-index:2147483647;font-family:-apple-system,system-ui,"Segoe UI",sans-serif !important;font-size:13px;color:#111;line-height:1.3;}
    #rms-fs-toggle{width:44px;height:44px;border-radius:22px;background:#111;color:#fff;border:none;cursor:pointer;font-weight:600;font-size:16px;box-shadow:0 4px 12px rgba(0,0,0,.25);font-family:inherit !important;}
    #rms-fs-toggle:hover{background:#333;}
    #rms-fs-controls{position:absolute;bottom:52px;right:0;background:#fff;padding:14px;border-radius:10px;min-width:280px;box-shadow:0 6px 20px rgba(0,0,0,.18);display:flex;flex-direction:column;gap:10px;border:1px solid #e5e5e5;}
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
  const rowsHtml = SLOTS.map(
    (slot) => `
      <div class="rms-fs-row">
        <label for="rms-fs-${slot.key}">${slot.label}</label>
        <select id="rms-fs-${slot.key}" data-target="${slot.key}"></select>
      </div>`
  ).join('');
  panel.innerHTML = `
    <button id="rms-fs-toggle" title="RMS Font Switcher">Aa</button>
    <div id="rms-fs-controls" hidden>
      <div id="rms-fs-head">
        <strong>RMS Fonts</strong>
        <button id="rms-fs-close" aria-label="Schliessen">&times;</button>
      </div>
      ${rowsHtml}
      <div class="rms-fs-actions">
        <button id="rms-fs-reset">Zuruecksetzen</button>
      </div>
    </div>
  `;

  const mount = () => {
    if (!document.body) return requestAnimationFrame(mount);
    document.body.classList.add(BODY_CLASS);
    document.body.appendChild(panel);
    init();
  };
  mount();

  function init() {
    const toggle = panel.querySelector('#rms-fs-toggle');
    const controls = panel.querySelector('#rms-fs-controls');
    const closeBtn = panel.querySelector('#rms-fs-close');
    const resetBtn = panel.querySelector('#rms-fs-reset');
    const selects = SLOTS.map((slot) => panel.querySelector(`#rms-fs-${slot.key}`));

    selects.forEach((sel) => {
      VARIANTS.forEach((v) => {
        const opt = document.createElement('option');
        opt.value = v.value;
        opt.textContent = v.label;
        sel.appendChild(opt);
      });
      sel.value = selection[sel.dataset.target];
    });

    const persist = () => {
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(selection)); }
      catch {}
      applyOverride(selection);
    };

    toggle.addEventListener('click', () => { controls.hidden = !controls.hidden; });
    closeBtn.addEventListener('click', () => { controls.hidden = true; });
    selects.forEach((sel) => {
      sel.addEventListener('change', (e) => {
        selection[sel.dataset.target] = e.target.value;
        persist();
      });
    });
    resetBtn.addEventListener('click', () => {
      SLOTS.forEach((slot) => { selection[slot.key] = 'system'; });
      selects.forEach((sel) => { sel.value = 'system'; });
      persist();
    });
  }
})();
