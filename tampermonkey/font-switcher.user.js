// ==UserScript==
// @name         RMS Font Switcher
// @namespace    https://chatao.github.io/rms-fonts/
// @version      1.8.0
// @description  Live-Switcher fuer headbadge RMS Fonts auf beliebigen Seiten — pro Slot Schrift, Laufweite und Schriftgroesse einstellbar
// @author       headbadge
// @match        *://*/*
// @include      *
// @run-at       document-end
// @grant        none
// @noframes
// @updateURL    https://chatao.github.io/rms-fonts/tampermonkey/font-switcher.user.js
// @downloadURL  https://chatao.github.io/rms-fonts/tampermonkey/font-switcher.user.js
// ==/UserScript==

(function () {
  'use strict';
  try { window.__RMS_FS_LOADED__ = true; } catch (e) {}
  console.log('[RMS Font Switcher] v1.8.0 loaded on', location.href);

  const WEIGHT_LABELS = {
    100: 'Thin', 200: 'Extralight', 300: 'Light', 400: 'Regular',
    500: 'Medium', 600: 'Semibold', 700: 'Bold', 800: 'Extrabold', 900: 'Black',
  };

  const BODY_CLASS = 'rms-fs-active';
  const SLOTS = [
    { key: 'eyebrow',  label: 'Eyebrow',  selector: '.hero-small-inner p.is-7, .hero-inner p.is-7, p.is-7.is-weight-medium, .eyebrow, .kicker, .overline' },
    { key: 'title',    label: 'Title',    selector: '.is-size-huge, .is-size-1, .hero-title' },
    { key: 'h1',       label: 'H1',       selector: 'h1' },
    { key: 'h2',       label: 'H2',       selector: 'h2' },
    { key: 'h3',       label: 'H3',       selector: 'h3' },
    { key: 'subtitle',    label: 'Subtitle',    selector: '.subtitle, .teaser-subtitle' },
    { key: 'description', label: 'Description', selector: '.hero-small-description, .hero-small-description *, .hero-box .lead, .lead' },
    { key: 'teaser',   label: 'Teaser',   selector: '.teaser-headline, .card-headline, .kpi-figures__headline, .kpi-figures__subheadline, .nav-item-title, .accordion-header-title' },
    { key: 'button',   label: 'Button',   selector: '.button, a.button, button.button, .btn, .cta' },
    { key: 'body',     label: 'Body',     selector: null },
  ];

  const FONT_BASE = 'https://chatao.github.io/rms-fonts/fonts/';
  const STORAGE_KEY = 'rms-font-switcher-v1';

  // Slider-Konfiguration (sichtbare Werte = UI-Skala, intern als em/Faktor gespeichert)
  const TRACKING = { min: -0.1, max: 0.3, step: 0.005, def: 0 };   // in em
  const SCALE    = { min: 50,   max: 200, step: 5,    def: 100 };   // in % (UI), intern /100

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

  const VARIANTS = [{ value: 'system', label: 'Original', family: null, weight: null, style: null }];
  Object.entries(FONTS).forEach(([key, font]) => {
    if (!font.faces) return;
    const singleFace = font.faces.length === 1;
    [...font.faces]
      .sort((a, b) => a.weight - b.weight || (a.style === 'italic' ? 1 : -1))
      .forEach((face) => {
        const italic = face.style === 'italic';
        const weightLabel = WEIGHT_LABELS[face.weight] || String(face.weight);
        let suffix;
        if (singleFace) suffix = null;
        else if (italic && face.weight === 400) suffix = 'Italic';
        else if (italic) suffix = `${weightLabel} Italic`;
        else suffix = weightLabel;
        const value = singleFace
          ? key
          : `${key}:${face.weight}${italic ? ':italic' : ''}`;
        VARIANTS.push({
          value,
          label: suffix ? `${font.label} — ${suffix}` : font.label,
          family: key,
          weight: face.weight,
          style: face.style,
        });
      });
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
    if (variant.style === 'italic') d += `font-style:italic !important;`;
    return d;
  };

  // ---- State ----------------------------------------------------------------

  const defaultState = () => ({ variant: 'system', tracking: TRACKING.def, scale: 1 });

  const normaliseSlot = (raw) => {
    // v1.7 hat pro Slot nur einen Variant-String gespeichert — Backwards-Kompat.
    if (!raw) return defaultState();
    if (typeof raw === 'string') {
      return { ...defaultState(), variant: VARIANT_BY_VALUE[raw] ? raw : 'system' };
    }
    const tracking = Number(raw.tracking);
    const scale = Number(raw.scale);
    return {
      variant: VARIANT_BY_VALUE[raw.variant] ? raw.variant : 'system',
      tracking: Number.isFinite(tracking) ? tracking : TRACKING.def,
      scale: Number.isFinite(scale) && scale > 0 ? scale : 1,
    };
  };

  const saved = (() => {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}'); }
    catch { return {}; }
  })();

  const selection = {};
  SLOTS.forEach((slot) => { selection[slot.key] = normaliseSlot(saved[slot.key]); });

  // ---- CSS-Override (font-family + letter-spacing) -------------------------

  const applyOverride = () => {
    const rules = [];
    const bodyState = selection.body;
    const bodyDecl = declFor(VARIANT_BY_VALUE[bodyState.variant]);

    if (bodyDecl) {
      rules.push(`body.${BODY_CLASS}{${bodyDecl}}`);
      rules.push(`body.${BODY_CLASS} *{font-family:inherit !important;}`);
    }
    if (bodyState.tracking !== 0) {
      rules.push(`body.${BODY_CLASS}{letter-spacing:${bodyState.tracking}em !important;}`);
    }

    SLOTS.forEach((slot) => {
      if (slot.key === 'body' || !slot.selector) return;
      const st = selection[slot.key];
      const decl = declFor(VARIANT_BY_VALUE[st.variant]);
      const parts = [];
      if (decl) parts.push(decl);
      if (st.tracking !== 0) parts.push(`letter-spacing:${st.tracking}em !important;`);
      if (parts.length) {
        rules.push(`body.${BODY_CLASS} :is(${slot.selector}){${parts.join('')}}`);
      }
    });
    overrideStyle.textContent = rules.join('\n');
  };

  // ---- JS-Override (font-size, relativ zum Original) -----------------------

  const SIZE_DATA_KEY = 'rmsOrigSize'; // -> data-rms-orig-size

  const captureOrig = (el) => {
    if (el.dataset[SIZE_DATA_KEY]) return parseFloat(el.dataset[SIZE_DATA_KEY]);
    // Unsere eigene inline-Override kurz wegnehmen, damit das echte Original gemessen wird.
    const inline = el.style.getPropertyValue('font-size');
    const inlinePrio = el.style.getPropertyPriority('font-size');
    if (inline) el.style.removeProperty('font-size');
    const px = parseFloat(getComputedStyle(el).fontSize);
    if (inline) el.style.setProperty('font-size', inline, inlinePrio);
    if (Number.isFinite(px)) el.dataset[SIZE_DATA_KEY] = String(px);
    return px;
  };

  const applyScales = () => {
    SLOTS.forEach((slot) => {
      if (slot.key === 'body' || !slot.selector) return;
      const st = selection[slot.key];
      let elements;
      try { elements = document.querySelectorAll(slot.selector); }
      catch { return; }
      elements.forEach((el) => {
        if (st.scale === 1) {
          if (el.dataset[SIZE_DATA_KEY]) el.style.removeProperty('font-size');
          return;
        }
        const orig = captureOrig(el);
        if (Number.isFinite(orig)) {
          el.style.setProperty('font-size', (orig * st.scale) + 'px', 'important');
        }
      });
    });
    // Body-Slot
    const body = document.body;
    if (!body) return;
    const bodyScale = selection.body.scale;
    if (bodyScale === 1) {
      if (body.dataset[SIZE_DATA_KEY]) body.style.removeProperty('font-size');
    } else {
      const orig = captureOrig(body);
      if (Number.isFinite(orig)) {
        body.style.setProperty('font-size', (orig * bodyScale) + 'px', 'important');
      }
    }
  };

  let scaleScheduled = false;
  const scheduleApplyScales = () => {
    if (scaleScheduled) return;
    scaleScheduled = true;
    requestAnimationFrame(() => {
      scaleScheduled = false;
      applyScales();
    });
  };

  const applyAll = () => {
    applyOverride();
    scheduleApplyScales();
  };

  applyOverride(); // CSS-Regeln frueh einspielen, scales sobald body da ist.

  // ---- Panel ---------------------------------------------------------------

  const uiStyle = document.createElement('style');
  uiStyle.textContent = `
    #rms-fs-panel{position:fixed;bottom:16px;right:16px;z-index:2147483647;font-family:-apple-system,system-ui,"Segoe UI",sans-serif !important;font-size:13px;color:#111;line-height:1.3;}
    #rms-fs-toggle{width:44px;height:44px;border-radius:22px;background:#111;color:#fff;border:none;cursor:pointer;font-weight:600;font-size:16px;box-shadow:0 4px 12px rgba(0,0,0,.25);font-family:inherit !important;}
    #rms-fs-toggle:hover{background:#333;}
    #rms-fs-controls{position:absolute;bottom:52px;right:0;background:#fff;padding:14px;border-radius:10px;width:320px;max-height:80vh;overflow-y:auto;box-shadow:0 6px 20px rgba(0,0,0,.18);display:flex;flex-direction:column;gap:10px;border:1px solid #e5e5e5;}
    #rms-fs-controls[hidden]{display:none;}
    #rms-fs-controls .rms-fs-row{display:flex;flex-direction:column;gap:5px;padding-bottom:10px;border-bottom:1px solid #f0f0f0;}
    #rms-fs-controls .rms-fs-row:last-of-type{border-bottom:none;padding-bottom:0;}
    #rms-fs-controls label.rms-fs-slot{font-weight:600;font-size:11px;text-transform:uppercase;letter-spacing:.04em;color:#555;}
    #rms-fs-controls select{padding:6px 8px;border:1px solid #ccc;border-radius:6px;background:#fff;font-family:inherit !important;font-size:13px;}
    #rms-fs-controls .rms-fs-slider{display:grid;grid-template-columns:54px 1fr 56px;align-items:center;gap:8px;}
    #rms-fs-controls .rms-fs-slider span.rms-fs-cap{font-size:10px;text-transform:uppercase;letter-spacing:.04em;color:#888;}
    #rms-fs-controls .rms-fs-slider span.rms-fs-val{font-size:11px;color:#111;font-variant-numeric:tabular-nums;text-align:right;}
    #rms-fs-controls input[type=range]{width:100%;accent-color:#111;}
    #rms-fs-controls .rms-fs-actions{display:flex;gap:6px;margin-top:4px;position:sticky;bottom:0;background:#fff;padding-top:8px;}
    #rms-fs-controls .rms-fs-actions button{flex:1;padding:7px;cursor:pointer;border:1px solid #ccc;border-radius:6px;background:#f5f5f5;font-family:inherit !important;font-size:12px;}
    #rms-fs-controls .rms-fs-actions button:hover{background:#eaeaea;}
    #rms-fs-head{display:flex;justify-content:space-between;align-items:center;position:sticky;top:0;background:#fff;padding-bottom:6px;}
    #rms-fs-head strong{font-size:12px;text-transform:uppercase;letter-spacing:.06em;}
    #rms-fs-close{background:none;border:none;font-size:16px;cursor:pointer;color:#888;padding:0;line-height:1;}
  `;
  document.head.appendChild(uiStyle);

  const fmtTracking = (v) => `${Number(v).toFixed(3)} em`; // non-breaking space
  const fmtScale = (v) => `${Math.round(v * 100)} %`;

  const panel = document.createElement('div');
  panel.id = 'rms-fs-panel';
  const rowsHtml = SLOTS.map((slot) => `
    <div class="rms-fs-row" data-slot="${slot.key}">
      <label class="rms-fs-slot" for="rms-fs-${slot.key}">${slot.label}</label>
      <select id="rms-fs-${slot.key}" data-target="${slot.key}"></select>
      <div class="rms-fs-slider">
        <span class="rms-fs-cap">Tracking</span>
        <input type="range" data-kind="tracking" data-target="${slot.key}"
               min="${TRACKING.min}" max="${TRACKING.max}" step="${TRACKING.step}">
        <span class="rms-fs-val" data-val="tracking-${slot.key}"></span>
      </div>
      <div class="rms-fs-slider">
        <span class="rms-fs-cap">Size</span>
        <input type="range" data-kind="scale" data-target="${slot.key}"
               min="${SCALE.min}" max="${SCALE.max}" step="${SCALE.step}">
        <span class="rms-fs-val" data-val="scale-${slot.key}"></span>
      </div>
    </div>
  `).join('');

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

  let observer = null;

  const mount = () => {
    if (!document.body) return requestAnimationFrame(mount);
    document.body.classList.add(BODY_CLASS);
    document.body.appendChild(panel);
    init();
    scheduleApplyScales();

    // Neu eingefuegte Elemente (SPA, lazy content) ebenfalls scalen
    observer = new MutationObserver(() => scheduleApplyScales());
    observer.observe(document.body, { childList: true, subtree: true });
  };
  mount();

  function init() {
    const toggle = panel.querySelector('#rms-fs-toggle');
    const controls = panel.querySelector('#rms-fs-controls');
    const closeBtn = panel.querySelector('#rms-fs-close');
    const resetBtn = panel.querySelector('#rms-fs-reset');

    // Selects fuellen
    SLOTS.forEach((slot) => {
      const sel = panel.querySelector(`#rms-fs-${slot.key}`);
      VARIANTS.forEach((v) => {
        const opt = document.createElement('option');
        opt.value = v.value;
        opt.textContent = v.label;
        sel.appendChild(opt);
      });
      sel.value = selection[slot.key].variant;
    });

    // Slider-Initialwerte
    const setSliderUI = (slotKey) => {
      const st = selection[slotKey];
      const trackInput = panel.querySelector(`input[data-kind="tracking"][data-target="${slotKey}"]`);
      const scaleInput = panel.querySelector(`input[data-kind="scale"][data-target="${slotKey}"]`);
      const trackVal = panel.querySelector(`[data-val="tracking-${slotKey}"]`);
      const scaleVal = panel.querySelector(`[data-val="scale-${slotKey}"]`);
      trackInput.value = String(st.tracking);
      scaleInput.value = String(Math.round(st.scale * 100));
      trackVal.textContent = fmtTracking(st.tracking);
      scaleVal.textContent = fmtScale(st.scale);
    };
    SLOTS.forEach((slot) => setSliderUI(slot.key));

    const persist = () => {
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(selection)); }
      catch {}
    };

    toggle.addEventListener('click', () => { controls.hidden = !controls.hidden; });
    closeBtn.addEventListener('click', () => { controls.hidden = true; });

    // Font-Variante
    panel.querySelectorAll('select[data-target]').forEach((sel) => {
      sel.addEventListener('change', (e) => {
        selection[sel.dataset.target].variant = e.target.value;
        applyOverride();
        persist();
      });
    });

    // Slider (Tracking + Size)
    panel.querySelectorAll('input[type=range][data-target]').forEach((input) => {
      input.addEventListener('input', (e) => {
        const slotKey = input.dataset.target;
        const kind = input.dataset.kind;
        const raw = Number(e.target.value);
        if (kind === 'tracking') {
          selection[slotKey].tracking = raw;
          panel.querySelector(`[data-val="tracking-${slotKey}"]`).textContent = fmtTracking(raw);
          applyOverride();
        } else if (kind === 'scale') {
          selection[slotKey].scale = raw / 100;
          panel.querySelector(`[data-val="scale-${slotKey}"]`).textContent = fmtScale(raw / 100);
          scheduleApplyScales();
        }
        persist();
      });
    });

    resetBtn.addEventListener('click', () => {
      SLOTS.forEach((slot) => { selection[slot.key] = defaultState(); });
      // Inline Sizes wegnehmen + Caches verwerfen, damit nach Style-Wechsel der Site neu vermessen wird
      document.querySelectorAll(`[data-${SIZE_DATA_KEY.replace(/[A-Z]/g, m => '-' + m.toLowerCase())}]`).forEach((el) => {
        el.style.removeProperty('font-size');
        delete el.dataset[SIZE_DATA_KEY];
      });
      // Selects + Slider UI zuruecksetzen
      SLOTS.forEach((slot) => {
        const sel = panel.querySelector(`#rms-fs-${slot.key}`);
        if (sel) sel.value = 'system';
        setSliderUI(slot.key);
      });
      applyAll();
      persist();
    });
  }
})();
