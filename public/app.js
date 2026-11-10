'use strict';
const $ = (selector, scope = document) => scope.querySelector(selector);
const $$ = (selector, scope = document) => [...scope.querySelectorAll(selector)];
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

// Navigation is ordinary anchors; the compact menu is fully keyboard operable.
const header = $('.header');
const menu = $('#navigation');
const toggle = $('.menu-toggle');
function updateHeaderGlass() {
  header.classList.toggle('is-scrolled', window.scrollY > 8);
}
window.addEventListener('scroll', updateHeaderGlass, { passive: true });
updateHeaderGlass();

const navLens = $('.nav-lens', menu);
const navLinks = $$('a', menu);
const lensPointer = window.matchMedia('(min-width: 701px) and (hover: hover) and (pointer: fine)');
let lensFrame = 0;
let lensTime;
let lensCenter;
let lensWidth;
let lensHeight;
let lensTarget;

function drawNavLens(time) {
  lensFrame = 0;
  const elapsed = time - (lensTime ?? time - 16);
  lensTime = time;
  const blend = 1 - Math.exp(-elapsed / 48);
  lensCenter += (lensTarget.center - lensCenter) * blend;
  lensWidth += (lensTarget.width - lensWidth) * blend;
  lensHeight += (1 - lensHeight) * blend;

  const travel = Math.abs(lensTarget.center - lensCenter);
  const width = lensWidth + Math.min(6, travel * .12);
  const inset = width / 2 + lensTarget.inset;
  const center = Math.min(lensTarget.bounds - inset, Math.max(inset, lensCenter));
  navLens.style.transform = `translate3d(${(center - 50).toFixed(2)}px, 0, 0) scale(${(width / 100).toFixed(3)}, ${lensHeight.toFixed(3)})`;
  if (travel > .25 || Math.abs(lensTarget.width - lensWidth) > .25 || lensHeight < .995) {
    lensFrame = requestAnimationFrame(drawNavLens);
  }
}

function aimNavLens(event) {
  if (!lensPointer.matches || reducedMotion.matches || event.pointerType === 'touch') return;
  if (event.target.closest('.lang-switch')) { hideNavLens(); return; }
  const bounds = menu.getBoundingClientRect();
  const position = event.clientX - bounds.left;
  const link = navLinks.find(item => position < item.offsetLeft + item.offsetWidth + 2) ?? navLinks.at(-1);
  const linkCenter = link.offsetLeft + link.offsetWidth / 2;
  const width = link.offsetWidth;
  const inset = navLinks[0].offsetLeft;
  const drift = Math.max(-6, Math.min(6, (position - linkCenter) * .35));
  lensTarget = {center:linkCenter + drift, width, bounds:bounds.width, inset};

  if (lensCenter === undefined) {
    lensCenter = lensTarget.center;
    lensWidth = width;
    lensHeight = .86;
    menu.classList.add('has-lens', 'is-lens-active');
  }
  if (!lensFrame) {
    lensTime = undefined;
    lensFrame = requestAnimationFrame(drawNavLens);
  }
}

function hideNavLens() {
  cancelAnimationFrame(lensFrame);
  lensFrame = 0;
  lensCenter = undefined;
  menu.classList.remove('is-lens-active');
}

menu.addEventListener('pointerenter', aimNavLens);
menu.addEventListener('pointermove', aimNavLens, { passive: true });
menu.addEventListener('pointerleave', hideNavLens);
lensPointer.addEventListener('change', hideNavLens);
reducedMotion.addEventListener('change', hideNavLens);

function closeMenu(restoreFocus = false) {
  toggle.setAttribute('aria-expanded', 'false');
  menu.classList.remove('open');
  if (restoreFocus) toggle.focus();
}
toggle.addEventListener('click', () => {
  const open = toggle.getAttribute('aria-expanded') !== 'true';
  toggle.setAttribute('aria-expanded', String(open));
  menu.classList.toggle('open', open);
});
menu.addEventListener('click', event => { if (event.target.closest('a')) closeMenu(); });
document.addEventListener('keydown', event => { if (event.key === 'Escape' && menu.classList.contains('open')) closeMenu(true); });
document.addEventListener('click', event => { if (!event.target.closest('.header')) closeMenu(); });
window.matchMedia('(min-width: 701px)').addEventListener('change', event => { if (event.matches) closeMenu(); });
$$('a[href^="#"]').forEach(link => {
  link.addEventListener('click', () => {
    const target = document.getElementById(link.hash.slice(1));
    if (target && !target.hidden) {
      if (!target.hasAttribute('tabindex')) target.setAttribute('tabindex', '-1');
      target.focus({ preventScroll: true });
    }
  });
});

// Each capability describes the subject of the reserved visual. Content
// comes from T10_I18N (i18n.js) so it stays in sync with the active language.
function currentFeatures() { return window.T10_I18N[window.t10Lang()].features; }
function renderActiveFeature() {
  const active = $('[data-feature].active') || $('[data-feature]');
  const feature = currentFeatures()[active.dataset.feature];
  $('#capture-kicker').textContent = feature.kicker;
  $('#capture-title').textContent = feature.title;
  $('#capture-description').textContent = feature.description;
  $('#capture-caption').textContent = feature.caption;
  const img = $('#capture-image');
  if (feature.image) img.src = feature.image;
  img.alt = feature.visualBrief;
}
$$('[data-feature]').forEach(button => button.addEventListener('click', () => {
  $$('[data-feature]').forEach(item => {
    const selected = item === button;
    item.classList.toggle('active', selected);
    item.setAttribute('aria-pressed', String(selected));
  });
  renderActiveFeature();
  if (!reducedMotion.matches) $('#capture-content').animate([{opacity:.35},{opacity:1}], {duration:240,easing:'ease-out'});
}));
document.addEventListener('t10:langchange', renderActiveFeature);

// The chat stages one prewritten exchange with fictional data.
const aiDemo = $('.ai-demo');
const aiDraft = $('#typed-prompt');
const aiQuestion = $('#ai-sent');
const aiQuestionText = $('#ai-sent-text');
const aiReplayLabel = $('#play-ai span');
const aiStatus = $('#ai-status');
function aiDict() { return window.T10_I18N[window.t10Lang()].ai; }
function samplePrompt() { return aiDict().samplePrompt; }
function draftPlaceholder() { return aiDict().draftPlaceholder; }
let aiFrame = 0;
let aiTimer = 0;
let aiAutoplayTimer = 0;
let aiPlaying = false;
let aiAutoPlayed = false;
let aiInView = false;

function completeAI(announce = true) {
  cancelAnimationFrame(aiFrame);
  clearTimeout(aiTimer);
  aiDemo.classList.toggle('responding', aiPlaying && announce && aiDemo.dataset.aiPhase === 'answer');
  aiPlaying = false;
  aiDemo.dataset.aiPhase = 'answer';
  aiDraft.textContent = draftPlaceholder();
  aiReplayLabel.textContent = aiDict().replay;
  if (announce) aiStatus.textContent = aiDict().statusComplete;
}

function advanceAI(phase, delay, next) {
  aiTimer = setTimeout(() => {
    aiDemo.dataset.aiPhase = phase;
    if (next) next();
  }, delay);
}

function playAI() {
  if (aiPlaying || reducedMotion.matches) { completeAI(); return; }
  aiPlaying = true;
  aiAutoPlayed = true;
  aiDemo.classList.remove('responding');
  aiDemo.dataset.aiPhase = 'ready';
  aiDraft.textContent = draftPlaceholder();
  aiReplayLabel.textContent = aiDict().showFull;
  aiStatus.textContent = aiDict().statusPlaying;
  $('#ai-record').hidden = true;
  $('.source-reference').setAttribute('aria-expanded', 'false');

  advanceAI('typing', 400, () => {
    aiDraft.textContent = '';
    const start = performance.now();
    let length = 0;
    const prompt = samplePrompt();
    function typePrompt(now) {
      const nextLength = Math.min(prompt.length, Math.floor((now - start) / 38));
      if (length !== nextLength) aiDraft.textContent = prompt.slice(0, nextLength);
      length = nextLength;
      if (length < prompt.length) {
        aiFrame = requestAnimationFrame(typePrompt);
        return;
      }

      advanceAI('sending', 360, () => {
        const composer = aiDraft.getBoundingClientRect();
        const message = aiQuestion.getBoundingClientRect();
        aiQuestion.style.setProperty('--sent-rise', `${composer.top - message.top}px`);
        advanceAI('sent', 150, () => {
          aiDraft.textContent = draftPlaceholder();
          advanceAI('thinking', 380, () => {
            advanceAI('answer', 1150, () => completeAI());
          });
        });
      });
    }
    aiFrame = requestAnimationFrame(typePrompt);
  });
}
$('#play-ai').addEventListener('click', playAI);
document.addEventListener('t10:langchange', () => {
  aiQuestionText.textContent = samplePrompt();
  if (!aiPlaying) completeAI(false);
});

function autoplayAI() {
  clearTimeout(aiAutoplayTimer);
  if (!aiInView || aiAutoPlayed || document.hidden || reducedMotion.matches) return;
  // Let an anchor scroll pass the chat without consuming its one autoplay.
  aiAutoplayTimer = setTimeout(() => {
    if (!aiAutoPlayed) playAI();
  }, 300);
}
new IntersectionObserver(([entry]) => {
  aiInView = entry.intersectionRatio >= .55;
  if (!entry.isIntersecting && aiPlaying) completeAI(false);
  else autoplayAI();
}, { threshold: [0, .55] }).observe(aiDemo);

$('.source-reference').addEventListener('click', event => {
  event.preventDefault();
  const source = $('#ai-record');
  source.hidden = !source.hidden;
  $('.source-reference').setAttribute('aria-expanded', String(!source.hidden));
  if (!source.hidden) source.focus({ preventScroll: true });
});
$('.source-reference').setAttribute('aria-controls', 'ai-record');
$('.source-reference').setAttribute('aria-expanded', 'false');

// Import is an editorial animation with fictional data, not a file picker.
// Content comes from T10_I18N (i18n.js) so it stays in sync with the active language.
function importSteps() { return window.T10_I18N[window.t10Lang()].importSteps; }
const importDemo = $('.import-demo');
const importStage = $('#import-stage');
const importButtons = $$('[data-import-step]');
const importPlayLabel = $('#play-import span');
const importStageTime = [2050, 2300];
let importTimer;
let importPlaying = false;
let importStarted = false;
let importInView = false;
let importResumeOnView = false;
let importStep = 0;

function showImportStep(index) {
  importStep = index;
  const step = importSteps()[index];
  importDemo.dataset.step = String(index);
  importStage.dataset.stage = String(index);
  importStage.classList.toggle('is-animated', !reducedMotion.matches);
  $('#import-stage-title').textContent = step.title;
  $('#import-stage-copy').textContent = step.copy;
  $('#file-status').textContent = step.status;
  $('#import-symbol').textContent = step.symbol;
  $$('.table-head span', importStage).forEach((cell, i) => { cell.textContent = step.headers[i]; });
  importButtons.forEach((button, i) => button.setAttribute('aria-pressed', String(i === index)));
}

function importLabels() { return window.T10_I18N[window.t10Lang()].importLabels; }

function stopImport() {
  clearTimeout(importTimer);
  importPlaying = false;
  const atEnd = importStep === importSteps().length - 1;
  const labels = importLabels();
  importPlayLabel.textContent = reducedMotion.matches ? labels.showNext :
    atEnd ? labels.replayConcept : labels.playConcept;
}

function playImport() {
  importStarted = true;
  importResumeOnView = false;
  importPlaying = true;
  importPlayLabel.textContent = importLabels().pauseConcept;
  function next() {
    showImportStep(importStep + 1);
    if (importStep < importSteps().length - 1) importTimer = setTimeout(next, importStageTime[importStep]);
    else stopImport();
  }
  importTimer = setTimeout(next, importStageTime[importStep]);
}

function suspendImport() {
  if (!importPlaying) return;
  stopImport();
  importResumeOnView = true;
}

function autoplayImport() {
  if (!importInView || document.hidden || reducedMotion.matches) return;
  if (!importStarted) {
    showImportStep(0);
    playImport();
  } else if (importResumeOnView) playImport();
}

new IntersectionObserver(([entry]) => {
  importInView = entry.intersectionRatio >= .5;
  if (!entry.isIntersecting) suspendImport();
  else autoplayImport();
}, { threshold: [0, .5] }).observe(importDemo);

importButtons.forEach((button, index) => button.addEventListener('click', () => {
  importStarted = true;
  importResumeOnView = false;
  showImportStep(index);
  stopImport();
}));
$('#play-import').addEventListener('click', () => {
  importResumeOnView = false;
  if (importPlaying) { stopImport(); return; }
  if (reducedMotion.matches) { showImportStep((importStep + 1) % importSteps().length); return; }
  if (importStep === importSteps().length - 1) showImportStep(0);
  playImport();
});
$('#reset-import').addEventListener('click', () => {
  importStarted = true;
  importResumeOnView = false;
  showImportStep(0);
  stopImport();
});
document.addEventListener('t10:langchange', () => { showImportStep(importStep); stopImport(); });
function syncMotionPreference() {
  if (reducedMotion.matches) {
    clearTimeout(aiAutoplayTimer);
    if (aiPlaying) completeAI(false);
    importResumeOnView = false;
    importStage.classList.remove('is-animated');
    stopImport();
  } else {
    if (!importPlaying) stopImport();
    autoplayAI();
    autoplayImport();
  }
}
reducedMotion.addEventListener('change', syncMotionPreference);
syncMotionPreference();
document.addEventListener('visibilitychange', () => {
  if (!document.hidden) {
    autoplayAI();
    autoplayImport();
    return;
  }
  clearTimeout(aiAutoplayTimer);
  if (aiPlaying) completeAI(false);
  suspendImport();
});

// Submits to the live API (api.tenants10.com) -- a public, unauthenticated,
// rate-limited endpoint that emails the request to the team. Nothing is
// stored server-side beyond that email; see services/marketing copy / FAQ.
const API_BASE = 'https://api.tenants10.com/api';
const form = $('#demo-form');
$('.submit-button').disabled = false;
const required = [$('#full-name'), $('#email'), $('#organisation'), $('#org-type')];
function validateField(input) {
  const valid = Boolean(input.value.trim()) && input.checkValidity();
  input.setAttribute('aria-invalid', String(!valid));
  const error = document.getElementById(input.getAttribute('aria-describedby'));
  error.hidden = valid;
  return valid;
}
required.forEach(input => {
  input.addEventListener('blur', () => { if (input.value || input.hasAttribute('aria-invalid')) validateField(input); });
  input.addEventListener('input', () => {
    if (input.getAttribute('aria-invalid') === 'true') validateField(input);
    $('#form-status').hidden = true;
  });
});
form.addEventListener('submit', async event => {
  event.preventDefault();
  const invalid = required.filter(input => !validateField(input));
  const status = $('#form-status');
  const submitButton = $('.submit-button');
  const t = () => window.T10_I18N[window.t10Lang()].formStatus;
  status.hidden = false;
  if (invalid.length) {
    status.textContent = t().invalid;
    invalid[0].focus();
    return;
  }
  submitButton.disabled = true;
  status.textContent = t().sending;
  try {
    const res = await fetch(`${API_BASE}/public/demo-request`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: $('#full-name').value.trim(),
        email: $('#email').value.trim(),
        organisation: $('#organisation').value.trim(),
        orgType: $('#org-type').value,
        role: $('#role').value.trim(),
        context: $('#use-case').value.trim(),
        website: $('#website').value, // honeypot, always empty for a real visitor
      }),
    });
    const data = await res.json().catch(() => null);
    if (!res.ok || !data || data.success === false) throw new Error((data && data.message) || `HTTP ${res.status}`);
    status.textContent = t().sent;
    form.reset();
  } catch (e) {
    status.textContent = t().error;
    console.error('Demo request failed:', e);
  } finally {
    submitButton.disabled = false;
  }
});



async function initHero() {
  const heroArtMount = document.getElementById('hero-art-mount');
  const heroArtResponse = await fetch('assets/hero-art.svg');
  heroArtMount.outerHTML = await heroArtResponse.text();

  const introSolid = $('#hero-intro-solid');
  const introPoints = $('#hero-intro-points');
  const introSparks = $('#hero-intro-sparks');
  const heroArtwork = $('#hero-artwork');
  const heroTerrain = $('#hero-terrain');
  const buildingDots = $('#hero-building-dots');
  const buildingSurfaces = $('#hero-building-surfaces');
  const surfaceEdge = $('#hero-surface-edge');
  const surfaceMaskFill = $('#hero-surface-mask-fill');
  const replayHero = $('#replay-hero');
  const toggleHeroLights = $('#toggle-hero-lights');
  const heroMotion = $('#hero-motion');
  const heroFigure = heroMotion.parentElement;
  const heroContext = heroMotion.getContext('2d');
  const lightDots = $$('.hero-led').map(dot => ({
    x: dot.cx.baseVal.value,
    y: dot.cy.baseVal.value,
    delay: Number(dot.dataset.delay),
    cycle: Number(dot.dataset.cycle),
  }));
  const heroCanvas = 'M0 0H1440V666H0Z';
  const heroIntroMask = 'url(#hero-intro-mask)';
  const heroDotRevealDuration = 1580;
  const surfaceRiseStart = 60;
  const surfaceOpacityEnd = 1200;
  const surfaceRiseEnd = 1320;
  const introColumns = JSON.parse($('#hero-intro-grid').textContent).map(([x,top,bottom,sparks],i) => ({
    x, top, bottom, sparks,
    delay: 28 + 145 * (1 + Math.sin(i*.20)) / 2 + (i%6)*12,
    duration: 840 + 390 * (1 + Math.sin(i*.115+1.6)) / 2 + (i%5)*16,
    pace: 1.05 + .72 * (1 + Math.cos(i*.27)) / 2,
  }));
  let heroIntroFrame = 0;


  function finishHeroIntro() {
    cancelAnimationFrame(heroIntroFrame);
    introSolid.setAttribute('d', heroCanvas);
    introPoints.removeAttribute('d');
    introSparks.removeAttribute('d');
    heroArtwork.setAttribute('mask', heroIntroMask);
    heroTerrain.removeAttribute('mask');
    buildingDots.removeAttribute('mask');
    buildingSurfaces.removeAttribute('mask');
    buildingSurfaces.removeAttribute('opacity');
  }

  function heroBuffer(width, height) {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    return canvas.getContext('2d');
  }

  function dotOutline(x,y,radius) {
    const r = radius.toFixed(2);
    const diameter = (2*radius).toFixed(2);
    return `M${(x-radius).toFixed(2)},${y}a${r},${r} 0 1 0 ${diameter},0a${r},${r} 0 1 0 -${diameter},0z`;
  }

  function startHeroIntro() {
    introSolid.removeAttribute('d');
    introPoints.removeAttribute('d');
    introSparks.removeAttribute('d');
    heroArtwork.removeAttribute('mask');
    heroTerrain.setAttribute('mask', heroIntroMask);
    buildingDots.setAttribute('mask', heroIntroMask);
    buildingSurfaces.setAttribute('mask', 'url(#hero-surface-mask)');
    buildingSurfaces.setAttribute('opacity', '0');
    surfaceMaskFill.setAttribute('opacity', '0');
    let started;

    function draw(timestamp) {
      started ??= timestamp;
      const elapsed = timestamp - started;
      if (elapsed >= heroDotRevealDuration) {
        finishHeroIntro();
        return;
      }

      const solid = [];
      const points = [];
      const sparks = [];
      for (const column of introColumns) {
        if (elapsed < column.delay) continue;
        const {x,top,bottom} = column;
        const fraction = Math.min(1,(elapsed-column.delay)/column.duration);
        const distance = bottom-top+42;
        const build = 1-(1-fraction**column.pace)**2.05;
        const edge = bottom+12-distance*build;
        solid.push(`M${x-4},${edge.toFixed(1)}h8V666h-8z`);
        for (let y=bottom-8*Math.ceil((bottom-edge)/8); y>=top && y>edge-32; y-=8) {
          const growth = Math.max(0,1-(edge-y)/32);
          if (growth>.08) points.push(dotOutline(x,y,4.1*growth**1.3));
        }
        for (const y of column.sparks) {
          const lit = 1-Math.abs((edge-y)-12)/11;
          if (lit>0) sparks.push(dotOutline(x,y,2.6*lit));
        }
      }
      introSolid.setAttribute('d', solid.join(''));
      introPoints.setAttribute('d', points.join(''));
      introSparks.setAttribute('d', sparks.join(''));

      const surfaceProgress = Math.min(1, Math.max(0, (elapsed-surfaceRiseStart)/(surfaceOpacityEnd-surfaceRiseStart)));
      const travel = Math.min(1, Math.max(0, (elapsed-surfaceRiseStart)/(surfaceRiseEnd-surfaceRiseStart)));
      const surfaceTop = 666 - 684 * travel * travel * (3-2*travel);
      surfaceEdge.setAttribute('y1', surfaceTop.toFixed(1));
      surfaceEdge.setAttribute('y2', (surfaceTop+108).toFixed(1));
      // Ease out the secondary dot mask once the dot build has reached the roofs.
      const settled = Math.min(1, Math.max(0, (elapsed-1210)/220));
      surfaceMaskFill.setAttribute('opacity', (settled*settled*(3-2*settled)).toFixed(3));
      buildingSurfaces.setAttribute('opacity', surfaceProgress.toFixed(3));
      heroIntroFrame = requestAnimationFrame(draw);
    }

    heroIntroFrame = requestAnimationFrame(draw);
  }

  let lightSprite;
  function drawHeroLights(elapsed) {
    let lit = false;
    for (const {x, y, delay, cycle} of lightDots) {
      if (elapsed < delay) continue;
      const phase = (elapsed-delay) % cycle;
      if (phase>=168) continue;
      if (!lightSprite) {
        const sprite = heroBuffer(16, 16);
        const glow = sprite.createRadialGradient(8, 8, 0, 8, 8, 8);
        glow.addColorStop(0, '#ecf9ff');
        glow.addColorStop(.24, '#ecf9ff');
        glow.addColorStop(.33, '#9bcaffb8');
        glow.addColorStop(.57, '#4e99ff60');
        glow.addColorStop(1, '#4e99ff00');
        sprite.fillStyle = glow;
        sprite.fillRect(0, 0, 16, 16);
        lightSprite = sprite.canvas;
      }
      heroContext.globalAlpha = phase<47 ? phase/47 : (168-phase)/121;
      heroContext.drawImage(lightSprite, x-8, y-8);
      lit = true;
    }
    heroContext.globalAlpha = 1;
    return lit;
  }

  let lightFrame = 0;
  let lastLightTick;
  let lightElapsed = 0;
  let lightsEnabled = false;
  let lightsPaused = false;
  let lightPainted = false;
  let autoStarted = false;
  const initialHeroBounds = heroFigure.getBoundingClientRect();
  let heroInView = initialHeroBounds.bottom>0 && initialHeroBounds.top<innerHeight;

  function clearHeroLights() {
    if (!lightPainted) return;
    heroContext.clearRect(866, 90, 510, 576);
    lightPainted = false;
  }

  function drawLightFrame(time) {
    lightFrame = 0;
    if (!heroInView || document.hidden || lightsPaused || !lightsEnabled) return;
    lightElapsed += time - (lastLightTick ?? time);
    lastLightTick = time;
    clearHeroLights();
    lightPainted = drawHeroLights(lightElapsed);
    queueLightFrame();
  }

  function queueLightFrame() {
    if (heroContext && !lightFrame && heroInView && !document.hidden && lightsEnabled && !lightsPaused) {
      lightFrame = requestAnimationFrame(drawLightFrame);
    }
  }

  function suspendHero() {
    finishHeroIntro();
    cancelAnimationFrame(lightFrame);
    lightFrame = 0;
    lastLightTick = undefined;
    clearHeroLights();
    heroMotion.hidden = true;
  }

  function playHero() {
    if (!heroInView || document.hidden) return;
    autoStarted = true;
    suspendHero();
    startHeroIntro();
    lightElapsed = 0;
    lightsEnabled = Boolean(heroContext);
    lightsPaused = false;
    toggleHeroLights.textContent = window.T10_I18N[window.t10Lang()].flat['hero.pause'];
    toggleHeroLights.hidden = !lightsEnabled;
    syncHeroVisibility();
  }

  function syncHeroVisibility() {
    if (!heroInView || document.hidden) {
      suspendHero();
    } else if (!autoStarted && !reducedMotion.matches) {
      playHero();
    } else if (lightsEnabled) {
      heroMotion.hidden = false;
      queueLightFrame();
    }
  }

  replayHero.hidden = false;
  replayHero.addEventListener('click', playHero);
  toggleHeroLights.addEventListener('click', () => {
    lightsPaused = !lightsPaused;
    const flat = window.T10_I18N[window.t10Lang()].flat;
    toggleHeroLights.textContent = lightsPaused ? flat['hero.resume'] : flat['hero.pause'];
    lastLightTick = undefined;
    queueLightFrame();
  });
  document.addEventListener('t10:langchange', () => {
    if (toggleHeroLights.hidden) return;
    const flat = window.T10_I18N[window.t10Lang()].flat;
    toggleHeroLights.textContent = lightsPaused ? flat['hero.resume'] : flat['hero.pause'];
  });
  reducedMotion.addEventListener('change', () => {
    if (reducedMotion.matches) {
      lightsEnabled = false;
      toggleHeroLights.hidden = true;
      suspendHero();
    } else syncHeroVisibility();
  });
  document.addEventListener('visibilitychange', syncHeroVisibility);
  new IntersectionObserver(([entry]) => {
    heroInView = entry.isIntersecting && entry.intersectionRatio>0;
    syncHeroVisibility();
  }).observe(heroFigure);
  syncHeroVisibility();
}
initHero();
