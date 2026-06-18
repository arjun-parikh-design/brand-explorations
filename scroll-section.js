/* ============================================================
   scroll-section.js — builds the 4 stacking content cards +
   transitioning illustrations, and drives the scroll-jack.
   ============================================================ */
(function () {
  "use strict";

  var ORDER = window.SHAPE_ORDER;
  var SHAPES = window.SHAPES;
  var N = ORDER.length;
  function isMobile() { return window.innerWidth <= 820; }
  function paceVal() { return isMobile() ? 0.8 : 0.95; }   // shorter travel on mobile so one swipe completes a transition
  var PACE = paceVal();            // viewport-heights of scroll per transition
  // Cached viewport height. iOS Safari changes window.innerHeight as the URL bar
  // collapses during scroll; rebuilding the scroll-jack on every nudge is what makes
  // it jerky. Cache the height and ignore small height-only changes.
  var VPH = window.innerHeight;
  var VPW = window.innerWidth;

  var BODY = "The AI-native workspace where Agent Mode acts as an embedded collaborator for developers.";

  /* ---------- per-shape card content (verbatim from the Figma frames) ---------- */
  var CONTENT = {
    postman: {
      title: "Postman Workspace", dot: "hex", accent: "#FF6C37", tint: "#FFD7C7",
      grad: ["#FF875B", "#CDAFF7", "#FFD7C7"],
      sub: "Your AI-native workspace.",
      body: "Agent Mode is an embedded collaborator built into the workspace developers already live in. Describe what you need in plain language \u2014 it designs the API, writes the collection, runs the tests, and flags the edge cases. The full lifecycle, from prompt to production-ready, without leaving your environment.",
      cta: "Open Postman \u2192"
    },
    fabric: {
      title: "Fabric Gateway", dot: "arch", accent: "#F37FFE", tint: "#FFCCFC",
      grad: ["#F8BEFE", "#CDAFF7", "#FEF1FD"],
      sub: "Govern what agents can reach.",
      body: "Agents don't browse \u2014 they call. Fabric Gateway is the secure control plane that sits between your agents and your enterprise API surface. Set exactly what each agent can access, under what conditions, and what it can never touch. Policy-driven, auditable, and built for environments where the blast radius of a misconfigured agent is not acceptable.",
      cta: "Explore Fabric Gateway \u2192"
    },
    fern: {
      title: "Fern", dot: "triangle", accent: "#1FB02E", tint: "#D9FFDD",
      grad: ["#AAFAB2", "#CDAFF7", "#D9FFDD"],
      sub: "Docs built for machines, not just humans.",
      body: "An agent that can't find your API can't call it. Fern rebuilds documentation infrastructure from the ground up for discoverability \u2014 structured, machine-readable, always in sync with your spec. Auto-generated SDKs, typed clients, and agent-readable reference so every API you ship is immediately callable by any agent.",
      cta: "Explore Fern \u2192"
    },
    astro: {
      title: "Astro AI", dot: "circle", accent: "#198CF7", tint: "#D6E9FF",
      grad: ["#80C1FF", "#CDAFF7", "#E5F4FF"],
      sub: "Orchestrate and govern agents at scale.",
      body: "When agents run in production, visibility isn't optional. Astro AI is the operational control plane for every agent working against your APIs \u2014 observe what they're calling, catch what's drifting, intervene before failures compound. Purpose-built for the moment when agent infrastructure becomes business-critical infrastructure.",
      cta: "Explore Astro AI \u2192"
    }
  };

  /* ---------- noise texture (shared) ---------- */
  // Soft ~50%-coverage grain — matches the recipe approved on the Postman card.
  var TV = "1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0";
  var noiseSVG =
    '<svg xmlns="http://www.w3.org/2000/svg" width="180" height="180" viewBox="0 0 180 180">' +
    '<filter id="n" x="0" y="0" width="100%" height="100%">' +
    '<feTurbulence type="fractalNoise" baseFrequency="1.05" numOctaves="3" stitchTiles="stitch" seed="3606" result="t"/>' +
    '<feColorMatrix in="t" type="luminanceToAlpha" result="a"/>' +
    '<feComponentTransfer in="a" result="c"><feFuncA type="discrete" tableValues="' + TV + '"/></feComponentTransfer>' +
    '<feFlood flood-color="#000000" result="f"/>' +
    '<feComposite operator="in" in="f" in2="c" result="m"/>' +
    '<feGaussianBlur in="m" stdDeviation="0.18"/></filter>' +
    '<rect width="180" height="180" filter="url(#n)"/></svg>';
  document.documentElement.style.setProperty("--noiseTex",
    'url("data:image/svg+xml,' + encodeURIComponent(noiseSVG) + '")');

  /* ---------- small title-dot icons ---------- */
  function dotSVG(kind, color) {
    if (kind === "hex")
      return '<svg class="cc-dot" viewBox="0 0 24 26" fill="' + color + '"><path d="M12 0l10.39 6v12L12 24 1.61 18V6z"/></svg>';
    if (kind === "arch")
      return '<svg class="cc-dot" viewBox="-1.6 -1.6 25.2 29" fill="' + color + '"><path d="M0 11a11 11 0 0 1 22 0v15H0z"/></svg>';
    if (kind === "triangle")
      return '<svg class="cc-dot" viewBox="0 0 26 24" fill="' + color + '"><path d="M13 1l12 22H1z" stroke="' + color + '" stroke-width="2" stroke-linejoin="round"/></svg>';
    return '<svg class="cc-dot" viewBox="0 0 24 24" fill="' + color + '"><circle cx="12" cy="12" r="11"/></svg>';
  }

  /* ---------- inline glyphs for the glass menu ---------- */
  var I = {
    cloud: '<svg class="gm-icon" viewBox="0 0 24 24" fill="none"><path d="M7.5 18.5h9a4 4 0 0 0 .6-7.95 5.5 5.5 0 0 0-10.6-1.1A3.75 3.75 0 0 0 7.5 18.5z" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round"/></svg>',
    branch: '<svg class="gm-icon" viewBox="0 0 24 24" fill="none"><circle cx="7" cy="6" r="2.2" stroke="currentColor" stroke-width="1.4"/><circle cx="7" cy="18" r="2.2" stroke="currentColor" stroke-width="1.4"/><circle cx="17" cy="9" r="2.2" stroke="currentColor" stroke-width="1.4"/><path d="M7 8.2v7.6M9.1 7.6 15 8.7M17 11.2c0 3-3 3.4-6 4.2" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/></svg>',
    check: '<svg class="gm-icon" viewBox="0 0 24 24" fill="none"><path d="M5 12.5l4.5 4.5L19 7" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    search: '<svg class="spin" viewBox="0 0 24 24" fill="none"><circle cx="11" cy="11" r="6.5" stroke="#A6A6A6" stroke-width="1.5"/><path d="M16 16l4 4" stroke="#A6A6A6" stroke-width="1.5" stroke-linecap="round"/></svg>'
  };

  /* ---------- code panel content ---------- */
  var CODE = [
    [25, "", ""], [26, "parameters:", "k"], [27, " - name: response_type", ""],
    [28, "description: |-", "k"], [29, "The type of response.", "c"], [30, "in: query", ""],
    [31, "example: code", ""], [32, "required: true", ""], [33, "schema:", "k"],
    [34, "type: string", ""], [35, "format: token", ""], [36, "enum:", "k"],
    [37, " - code", "c"], [38, "", ""], [39, " - name: client_id", ""],
    [40, "description: |-", "k"], [41, "The Client ID of the app", "c"]
  ];
  function codePanel() {
    var rows = CODE.map(function (r) {
      var cls = r[2] === "k" ? "ct k" : "ct";
      return '<div class="cl"><span class="ln">' + r[0] + '</span><span class="' + cls + '">' +
        r[1].replace(/</g, "&lt;") + '</span></div>';
    }).join("");
    return '<div class="code-panel">' + rows + '</div><div class="code-tabs"><i></i><i></i><i></i></div>';
  }

  /* ---------- glass branch menu ---------- */
  function glassMenu() {
    return '<div class="glass"><div class="glass-inner">' +
      '<div class="gm-row"><span class="lead">' + I.cloud + '</span>Push to Postman Cloud</div>' +
      '<div class="gm-row"><span class="lead">' + I.cloud + '</span>Pull to Postman Cloud</div>' +
      '<div class="gm-label">Switch to</div>' +
      '<div class="gm-row indent">' + I.cloud + 'Cloud View</div>' +
      '<div class="gm-row indent"><span class="check">' + I.check + '</span>' + I.branch + 'Local View</div>' +
      '<div class="gm-label">Switch branch</div>' +
      '<div class="gm-input">' + I.search + '<span>Type branch name…</span></div>' +
      '<div style="height:10px"></div>' +
      '<div class="gm-branch">' + I.branch + 'main</div>' +
      '<div class="gm-branch">' + I.cloud + 'origin</div>' +
      '<div class="gm-branch">' + I.cloud + 'origin/main</div>' +
      '</div></div>';
  }

  /* ---------- build content card ---------- */
  function buildCard(key) {
    var c = CONTENT[key];
    var card = document.createElement("div");
    card.className = "content-card";
    card.setAttribute("data-screen-label", c.title);
    card.style.setProperty("--soft", c.tint);
    card.style.setProperty("--edge", c.accent);
    card.innerHTML =
      '<div class="cc-noise"></div>' +
      '<div class="cc-inner">' +
        '<div class="cc-head">' + dotSVG(c.dot, c.accent) + '<h2 class="cc-title">' + c.title + '</h2></div>' +
        '<p class="cc-sub">' + c.sub + '</p>' +
        '<p class="cc-body">' + c.body + '</p>' +
        '<div class="cc-cta"><button class="cc-btn">' + c.cta.replace(/\s*\u2192\s*$/, "") + '</button></div>' +
      '</div>';
    return card;
  }

  /* ---------- color helpers ---------- */
  function hex2rgb(h) {
    h = h.replace("#", "");
    return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
  }
  function rgba(h, a) { var c = hex2rgb(h); return "rgba(" + c[0] + "," + c[1] + "," + c[2] + "," + a + ")"; }
  function lerpC(a, b, t) {
    var x = hex2rgb(a), y = hex2rgb(b);
    return "rgb(" + Math.round(x[0] + (y[0] - x[0]) * t) + "," +
      Math.round(x[1] + (y[1] - x[1]) * t) + "," + Math.round(x[2] + (y[2] - x[2]) * t) + ")";
  }
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }

  /* ---------- mount ---------- */
  var stackEl = document.getElementById("card-stack");
  var illoLayer = document.getElementById("illo-layer");
  var illoCard = document.getElementById("illo-card");
  var eyebrow = document.querySelector(".eyebrow");
  var railEl = document.getElementById("rail");

  var cards = [], illos = [];
  ORDER.forEach(function (key, k) {
    var card = buildCard(key);
    stackEl.appendChild(card);
    cards.push(card);

    var illo = window.createIllustration(SHAPES[key]);
    illoLayer.appendChild(illo.el);
    illos.push(illo);

    var dot = document.createElement("button");
    dot.title = SHAPES[key].title;
    dot.addEventListener("click", function () { scrollToSection(k); });
    railEl.appendChild(dot);
  });
  var railBtns = railEl.querySelectorAll("button");

  /* ---------- scaling ---------- */
  var pin = document.getElementById("sj-pin");
  var stage = document.getElementById("stage");
  function fit() {
    var s = Math.min(window.innerWidth / 1440, VPH / 906);
    stage.style.transform = "translate(-50%,-50%) scale(" + s + ")";
    // publish the section's actual content gutter so other page sections can align to it
    var gutter = (window.innerWidth - 1440 * s) / 2 + 80 * s;
    document.documentElement.style.setProperty("--gutter", gutter.toFixed(1) + "px");
  }
  fit();

  /* ---------- track height ---------- */
  var track = document.getElementById("sj-track");
  var snaps = [];
  for (var si = 0; si < N; si++) {
    var snap = document.createElement("div");
    snap.className = "snap";
    track.appendChild(snap);
    snaps.push(snap);
  }
  function sizeTrack() {
    PACE = paceVal();
    document.documentElement.style.setProperty("--sjvh", VPH + "px");
    track.style.height = (VPH * (1 + (N - 1) * PACE)) + "px";
    var total = track.offsetHeight - VPH;
    snaps.forEach(function (s, k) { s.style.top = ((k / (N - 1)) * total) + "px"; });
  }
  sizeTrack();
  // Single guarded resize handler: ignore the small height-only changes iOS fires while
  // the URL bar shows/hides (the cause of the jerk); recompute only on a real width
  // change (orientation) or a large height delta.
  window.addEventListener("resize", function () {
    var w = window.innerWidth, h = window.innerHeight;
    if (w !== VPW || Math.abs(h - VPH) > 140) {
      VPW = w; VPH = h;
      fit(); sizeTrack(); update();
    }
  });

  function scrollToSection(k) {
    var total = track.offsetHeight - VPH;
    var top = track.offsetTop + (k / (N - 1)) * total;
    // lift scroll-snap during the jump so scroll-snap-stop:always doesn't clamp it mid-way
    var de = document.documentElement, had = de.classList.contains("snap-on");
    if (had) de.classList.remove("snap-on");
    window.scrollTo({ top: top, behavior: "smooth" });
    if (had) setTimeout(function () { de.classList.add("snap-on"); }, 1200);
  }

  /* ---------- state ---------- */
  var stackMode = "pushback", transMode = "pushback";
  var lastActive = -1;

  function setStack(card, k, seg) {
    var rel = seg - k, st = card.style, z = 100 + k;
    var show = true, ty = 0, sc = 1, op = 1, br = 1, tyUnit = "%";

    if (stackMode === "accumulate") {
      if (rel <= -1) { show = false; }
      else if (rel <= 0) { ty = (-rel) * 112; }            // entering from below (%)
      else { var d = Math.min(rel, 4); sc = 1 - d * 0.035; ty = -d * 1.6; br = 1 - d * 0.07; }
    } else if (stackMode === "pushback") {
      var mob = window.innerWidth <= 820;
      if (rel <= -1) show = false;
      else if (rel <= 0) { if (mob) { ty = (-rel) * 108; tyUnit = "vh"; } else { ty = (-rel) * 112; } }
      else if (rel <= 1) { sc = 1 - rel * 0.1; ty = -rel * 1.4; op = 1 - rel * 0.55; }
      else show = false;
    } else { /* swap */
      if (rel <= -1 || rel > 1) show = false;
      else if (rel <= 0) { ty = (-rel) * 56; op = clamp(rel + 1, 0, 1); }
      else { ty = -rel * 56; op = clamp(1 - rel, 0, 1); }
    }

    if (!show) { st.display = "none"; return; }
    st.display = "";
    st.zIndex = z;
    st.opacity = op.toFixed(3);
    st.filter = br < 1 ? "brightness(" + br.toFixed(3) + ")" : "";
    st.transform = "translateY(" + ty.toFixed(2) + tyUnit + ") scale(" + sc.toFixed(3) + ")";
    // ty unit: % for slides, but settled offsets are tiny — use % of card height anyway
  }

  function setTrans(ai, frac) {
    var from = ai, to = Math.min(ai + 1, N - 1);
    illos.forEach(function (illo, k) {
      var el = illo.el;
      // 'to' only participates once a transition is actually underway — otherwise
      // the incoming shape can peek into the resting section (e.g. arch under Postman).
      var role = (k === from) ? "from" : (k === to && to !== from && frac > 0.004) ? "to" : "off";
      // reset
      el.style.backfaceVisibility = "";
      if (role === "off") {
        if (el.style.display !== "none") { el.style.display = "none"; illo.hide(); }
        return;
      }
      if (el.style.display === "none") { el.style.display = ""; illo.show(); }

      if (transMode === "pushback") {
        illo.setScatter(0);
        if (role === "from") {
          el.style.zIndex = 1;
          el.style.opacity = clamp(1 - frac * 1.15, 0, 1).toFixed(3);
          el.style.transform = "translateY(" + (-frac * 4).toFixed(2) + "%) scale(" + (1 - frac * 0.16).toFixed(3) + ")";
        } else {
          el.style.zIndex = 2;
          el.style.opacity = "1";
          el.style.transform = "translateY(" + ((1 - frac) * (isMobile() ? 240 : 136)).toFixed(2) + "%) scale(1)";
        }
      } else if (transMode === "dissolve") {
        illo.setScatter(0); el.style.zIndex = role === "to" ? 2 : 1;
        if (role === "from") { el.style.opacity = (1 - frac).toFixed(3); el.style.transform = "scale(" + (1 - frac * 0.08).toFixed(3) + ")"; }
        else { el.style.opacity = frac.toFixed(3); el.style.transform = "scale(" + (1.08 - frac * 0.08).toFixed(3) + ")"; }
      } else if (transMode === "decompose") {
        el.style.transform = "";
        if (role === "from") { el.style.opacity = "1"; illo.setScatter(frac); }
        else { el.style.opacity = "1"; illo.setScatter(1 - frac); }
      } else { /* flip */
        illo.setScatter(0);
        el.style.opacity = "1";
        el.style.backfaceVisibility = "hidden";
        var ang = role === "from" ? frac * 180 : (-180 + frac * 180);
        el.style.transform = "rotateY(" + ang.toFixed(2) + "deg)";
      }
    });

    // active (interactive) illustration
    var activeK = frac < 0.5 ? from : to;
    illos.forEach(function (illo, k) { illo.el.style.pointerEvents = (k === activeK ? "auto" : "none"); });

    // illustration-card background + eyebrow color crossfade
    var gf = CONTENT[ORDER[from]].grad, gt = CONTENT[ORDER[to]].grad;
    var g0 = lerpC(gf[0], gt[0], frac), g1 = lerpC(gf[1], gt[1], frac), g2 = lerpC(gf[2], gt[2], frac);
    illoCard.style.setProperty("--illoBg", "linear-gradient(0deg, " + g0 + " 0%, " + g1 + " 40%, " + g2 + " 100%)");
    // eyebrow stays orange — intentionally not recolored
  }

  /* ---------- main scroll update ---------- */
  function update() {
    var rect = track.getBoundingClientRect();
    var total = track.offsetHeight - VPH;
    var p = clamp(-rect.top / total, 0, 1);
    var seg = p * (N - 1);
    var ai = Math.min(Math.floor(seg + 1e-6), N - 1);
    var frac = clamp(seg - ai, 0, 1);

    for (var k = 0; k < N; k++) setStack(cards[k], k, seg);
    setTrans(ai, frac);

    var act = Math.round(seg);
    if (act !== lastActive) {
      lastActive = act;
      railBtns.forEach(function (b, i) { b.classList.toggle("on", i === act); });
    }
  }

  var ticking = false;
  window.addEventListener("scroll", function () {
    if (!ticking) { ticking = true; requestAnimationFrame(function () { update(); ticking = false; }); }
  }, { passive: true });

  /* ---------- public API (driven by the Tweaks panel) ---------- */
  function applyNoise(cPct, iPct) {
    document.querySelectorAll(".cc-noise").forEach(function (n) { n.style.opacity = cPct / 100; });
    document.querySelectorAll(".ic-noise").forEach(function (n) { n.style.opacity = iPct / 100; });
    document.querySelectorAll(".shape-noise").forEach(function (f) { f.setAttribute("flood-opacity", (iPct / 100).toFixed(3)); });
  }
  window.ShapeScroll = {
    _illos: illos,
    scrollToSection: scrollToSection,
    setStack: function (v) { stackMode = v; update(); },
    setTransition: function (v) {
      transMode = v;
      illos.forEach(function (il) { il.setScatter(0); il.el.style.backfaceVisibility = ""; il.el.style.zIndex = ""; il.el.style.transform = ""; });
      update();
    },
    setNoise: function (c, i) { applyNoise(c, i); },
    setGlow: function (v) { illos.forEach(function (il) { il.setGlow(v); }); },
    setFeel: function (name) { illos.forEach(function (il) { il.setFeel(name); }); },
    setKfFx: function (o) { illos.forEach(function (il) { il.setFx(o); }); }
  };

  /* ---------- go ---------- */
  applyNoise(5, 12);
  illos[0].show();
  update();
  // enable snap only after the page has settled at the top (prevents a load-time jump to section 2)
  if ("scrollRestoration" in history) history.scrollRestoration = "manual";
  window.scrollTo(0, 0);
  setTimeout(function () {
    window.scrollTo(0, 0);
    document.documentElement.classList.add("snap-on");
  }, 90);

  /* ---------- standalone noise bar ---------- */
  (function () {
    var tgl = document.getElementById("noiseToggle");
    var pop = document.getElementById("noisepop");
    var nC = document.getElementById("nC"), nI = document.getElementById("nI"), nD = document.getElementById("nD"), nB = document.getElementById("nB");
    var nCV = document.getElementById("nCV"), nIV = document.getElementById("nIV"), nDV = document.getElementById("nDV"), nBV = document.getElementById("nBV");
    if (!tgl) return;
    function apply() {
      nCV.textContent = nC.value + "%";
      nIV.textContent = nI.value + "%";
      nDV.textContent = nD.value + "%";
      nBV.textContent = nB.value + "%";
      applyNoise(+nC.value, +nI.value);
      document.documentElement.style.setProperty("--kf-dim", (+nD.value / 100).toFixed(3));
      document.documentElement.style.setProperty("--kf-bg", (+nB.value / 100).toFixed(3));
    }
    tgl.addEventListener("click", function () {
      pop.classList.toggle("show"); tgl.classList.toggle("on");
    });
    nC.addEventListener("input", apply);
    nI.addEventListener("input", apply);
    nD.addEventListener("input", apply);
    nB.addEventListener("input", apply);
    apply();
  })();

  /* ---------- light-up feel toggle ---------- */
  (function () {
    var btn = document.getElementById("feelToggle");
    if (!btn) return;
    var FEELS = [
      { key: "natural", name: "Natural" },
      { key: "snappy", name: "Snappy" },
      { key: "soft", name: "Soft" }
    ];
    var i = 0;
    function apply() {
      if (window.ShapeScroll) window.ShapeScroll.setFeel(FEELS[i].key);
      btn.innerHTML = "Feel: <b>" + FEELS[i].name + "</b>";
    }
    btn.addEventListener("click", function () { i = (i + 1) % FEELS.length; apply(); });
    apply();
  })();
})();
