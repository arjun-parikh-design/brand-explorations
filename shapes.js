/* ============================================================
   shapes.js — Shape definitions + the light-up / tilt / float
   illustration engine for the AI-era tech-stack scroll section.
   Plain ES5-ish vanilla JS. No build step.
   ============================================================ */
(function (global) {
  "use strict";

  var NS = "http://www.w3.org/2000/svg";
  var VW = 303, VH = 338;            // shared illustration viewBox
  var PITCH = 22.4;                  // grid pitch (px in viewBox)
  var SIDE = 21.2, RX = 6.8;         // square size + corner

  /* ---------- geometry helpers ---------- */

  // Rounded polygon path from an array of [x,y] points.
  function roundedPoly(pts, r) {
    var n = pts.length, d = "";
    for (var i = 0; i < n; i++) {
      var p0 = pts[(i - 1 + n) % n], p1 = pts[i], p2 = pts[(i + 1) % n];
      var v1 = norm(p0, p1), v2 = norm(p2, p1);
      var a = [p1[0] + v1[0] * r, p1[1] + v1[1] * r];
      var b = [p1[0] + v2[0] * r, p1[1] + v2[1] * r];
      d += (i === 0 ? "M" : "L") + fmt(a) + "Q" + fmt(p1) + " " + fmt(b);
    }
    return d + "Z";
  }
  function norm(from, to) {
    var dx = from[0] - to[0], dy = from[1] - to[1], L = Math.hypot(dx, dy) || 1;
    return [dx / L, dy / L];
  }
  function fmt(p) { return p[0].toFixed(2) + " " + p[1].toFixed(2); }

  // Hexagon (pointy-top) — matches the original Postman tile outline.
  var HEX_FILL = "M288.48 104.15V233.47C288.48 242.4 283.71 250.65 275.98 255.12L163.99 319.77C163.5 320.05 162.77 320.44 161.77 320.91C160.76 321.35 157.43 322.6 151.49 323.12C147.98 323.12 144.48 322.39 141.21 320.91C140.21 320.44 139.48 320.05 138.99 319.77L27 255.12C19.27 250.65 14.5 242.4 14.5 233.47V104.15C14.5 95.22 19.27 86.97 27 82.5L138.99 17.85C139.48 17.57 140.21 16.94 141.21 16.71C144.48 15.23 147.98 14.5 151.49 14.5C154.46 14.5 157.43 15.02 160.25 16.08C161.27 16.48 162.77 17.18 163.26 17.44L275.98 82.5C283.71 86.97 288.48 95.22 288.48 104.15Z";
  var HEX_RIM = "M282.98 70.38L170.99 5.72C165.07 2.3 158.33 0.5 151.49 0.5C144.65 0.5 137.91 2.3 131.99 5.72L20 70.38C7.97 77.32 0.5 90.26 0.5 104.15V233.47C0.5 247.35 7.97 260.3 20 267.24L131.99 331.9C137.91 335.32 144.65 337.12 151.49 337.12C158.33 337.12 165.07 335.32 170.99 331.9L282.98 267.24C295.01 260.3 302.48 247.35 302.48 233.47V104.15C302.48 90.26 295.01 77.32 282.98 70.38ZM288.48 233.47C288.48 242.4 283.71 250.65 275.98 255.12L163.99 319.77C163.5 320.05 162.27 320.68 161.77 320.91C160.76 321.35 154.46 323.12 151.49 323.12C147.98 323.12 144.48 322.39 141.21 320.91C140.21 320.44 139.48 320.05 138.99 319.77L27 255.12C19.27 250.65 14.5 242.4 14.5 233.47V104.15C14.5 95.22 19.27 86.97 27 82.5L138.99 17.85C139.48 17.57 140.7 16.94 141.21 16.71C144.48 15.23 147.98 14.5 151.49 14.5C154.46 14.5 157.43 15.02 160.25 16.08C161.27 16.48 162.77 17.18 163.26 17.44L275.98 82.5C283.71 86.97 288.48 95.22 288.48 104.15V233.47Z";

  var TRI_PTS = [[151.5, 24], [281, 300], [22, 300]];
  var TRI_PATH = roundedPoly(TRI_PTS, 30);

  // Arch: vertical sides, semicircular top, rounded bottom corners.
  var A_L = 41, A_R = 262, A_BTM = 304, A_STR = 150, A_BR = 24;
  var A_AR = (A_R - A_L) / 2;
  var ARCH_PATH =
    "M" + A_L + " " + A_STR +
    "V" + (A_BTM - A_BR) +
    "Q" + A_L + " " + A_BTM + " " + (A_L + A_BR) + " " + A_BTM +
    "H" + (A_R - A_BR) +
    "Q" + A_R + " " + A_BTM + " " + A_R + " " + (A_BTM - A_BR) +
    "V" + A_STR +
    "A" + A_AR + " " + A_AR + " 0 0 0 " + A_L + " " + A_STR + "Z";

  /* ---------- inside tests (fill region, inset from rim) ---------- */
  function insideCircle(x, y) { return Math.hypot(x - 151.5, y - 169) <= 118; }
  function insideTriangle(x, y) {
    var A = [151.5, 70], B = [248, 286], C = [55, 286];
    function side(p, a, b) { return (b[0]-a[0])*(p[1]-a[1]) - (b[1]-a[1])*(p[0]-a[0]); }
    var d1 = side([x,y],A,B), d2 = side([x,y],B,C), d3 = side([x,y],C,A);
    var neg = (d1<0)||(d2<0)||(d3<0), pos=(d1>0)||(d2>0)||(d3>0);
    return !(neg && pos);
  }
  function insideArch(x, y) {
    var inRect = (x >= 60 && x <= 243 && y >= A_STR && y <= 290);
    var inTop = (y < A_STR && Math.hypot(x - 151.5, y - A_STR) <= 89);
    return inRect || inTop;
  }

  /* ---------- grid generation ---------- */
  function genCells(insideFn) {
    var raw = [], i, j, x, y;
    for (j = 0; j < 16; j++) {
      for (i = 0; i < 16; i++) {
        x = 151.5 + (i - 7.5) * PITCH;
        y = 169 + (j - 7.5) * PITCH;
        if (x < 6 || x > VW - 6 || y < 6 || y > VH - 6) continue;
        if (insideFn(x, y)) raw.push({ i: i, j: j, x: x, y: y });
      }
    }
    // centroid for radial patterns
    var sx = 0, sy = 0;
    raw.forEach(function (c) { sx += c.x; sy += c.y; });
    var cxc = sx / raw.length, cyc = sy / raw.length;
    var present = {};
    raw.forEach(function (c) { present[c.i + "," + c.j] = true; });
    raw.forEach(function (c) {
      c.dx = c.x - cxc; c.dy = c.y - cyc; c.r = Math.hypot(c.dx, c.dy);
      c.edge = !(present[(c.i-1)+","+c.j] && present[(c.i+1)+","+c.j] &&
                 present[c.i+","+(c.j-1)] && present[c.i+","+(c.j+1)]);
    });
    return raw;
  }

  // Hexagon from the approved model (present cells + Postman-mark base-lit).
  var HEX_MODEL = [
    "____##____",
    "__#....#__",
    "_###..###_",
    "..#....#..",
    "#...##...#",
    "#...##...#",
    "..#....#..",
    "_###..###_",
    "__#....#__",
    "____##____"
  ];
  function genHexCells() {
    var X0 = 52.448, Y0 = 69.755, P = 22.01, cells = [], present = {};
    HEX_MODEL.forEach(function (row, j) {
      for (var i = 0; i < row.length; i++) {
        var ch = row[i];
        if (ch === "_") continue;
        present[i + "," + j] = true;
        cells.push({ i: i, j: j, x: X0 + P * i, y: Y0 + P * j, mark: ch === "#" });
      }
    });
    cells.forEach(function (c) {
      c.dx = c.x - 151.5; c.dy = c.y - 168.5; c.r = Math.hypot(c.dx, c.dy);
      c.edge = !(present[(c.i-1)+","+c.j] && present[(c.i+1)+","+c.j] &&
                 present[c.i+","+(c.j-1)] && present[c.i+","+(c.j+1)]);
      c.base = c.mark;          // resting = Postman logo
    });
    return cells;
  }

  /* ---------- pattern predicate library (px space from centroid) ---------- */
  var PAT = {
    full:   function () { return true; },
    none:   function () { return false; },
    checker:function (c) { return (c.i + c.j) % 2 === 0; },
    edge:   function (c) { return c.edge; },
    plus:   function (c) { return Math.abs(c.dx) < 13 || Math.abs(c.dy) < 13; },
    x:      function (c) { return Math.abs(Math.abs(c.dx) - Math.abs(c.dy)) < 16; },
    cross:  function (c) { return Math.abs(c.dx) < 13 || Math.abs(c.dy) < 13 ||
                                  Math.abs(Math.abs(c.dx) - Math.abs(c.dy)) < 16; },
    diamond:function (c) { return (Math.abs(c.dx) + Math.abs(c.dy)) < 78; },
    rNear:  function (c) { return c.r < 50; },
    rMid:   function (c) { return c.r >= 44 && c.r < 86; },
    rFar:   function (c) { return c.r >= 80; },
    diagA:  function (c) { return Math.abs(c.dx - c.dy) < 18; },
    diagB:  function (c) { return Math.abs(c.dx + c.dy) < 18; },
    colOdd: function (c) { return c.i % 2 === 0; },
    bandT:  function (c) { return c.dy < -34; },
    bandM:  function (c) { return c.dy >= -34 && c.dy < 40; },
    bandB:  function (c) { return c.dy >= 34; },
    // ---- shape-following: depth = rings of distance inward from the outline,
    //      so these trace nested copies of whatever shape the cells form ----
    contour:function (c) { return c.depth <= 0; },              // the outline itself
    shellOut:function (c){ return c.dn < 0.5; },                // outer half: outline + first ring
    shellIn:function (c) { return c.dn >= 0.5; },               // inner half: toward the core
    altRing:function (c) { return c.depth % 2 === 0; },         // alternating nested outlines
    sweepA: function (c) { return c.ny < 0.30; },               // tri: apex slice (small triangle)
    sweepB: function (c) { return c.ny < 0.56; },               // tri: grows wider...
    sweepC: function (c) { return c.ny < 0.80; },               // tri: ...like the triangle itself
    riseA:  function (c) { return c.ny > 0.70; },               // arch: base slice
    riseB:  function (c) { return c.ny > 0.44; },               // arch: fills up the legs
    dome:   function (c) { return c.ny < 0.40; },               // arch dome / triangle apex band
    // ---- symmetric, shape-tracing primitives (arch / triangle / circle) ----
    ring0:   function (c) { return c.depth <= 0; },              // outermost outline
    ring1:   function (c) { return c.depth === 1; },             // 1st nested outline (smaller copy)
    ring2:   function (c) { return c.depth === 2; },             // 2nd nested outline
    ringIn:  function (c) { return c.depth >= 1; },              // everything inside the outline
    altDepth:function (c) { return c.depth % 2 === 0; },         // concentric nested copies (target)
    coreDot: function (c) { return c.r < 17; },                  // centre seed
    spine:   function (c) { return Math.abs(c.dx) < 13; },       // vertical centre column
    diamondS:function (c) { return (Math.abs(c.dx) + Math.abs(c.dy)) < 50; },
    diamondL:function (c) { return (Math.abs(c.dx) + Math.abs(c.dy)) < 88; }
  };
  function pats() {
    var a = []; for (var k = 0; k < arguments.length; k++) a.push(PAT[arguments[k]]); return a;
  }

  /* ---------- shape catalogue ---------- */
  var SHAPES = {
    postman: {
      key: "postman", title: "Postman (v12)", dot: "hex",
      framesGlobal: "POSTMAN_FRAMES",
      kfLit: ["#FFEFE3", "#FF9B5E", "#EE5A1C"],
      bright: "#FF6C37", mid: "#604791",
      litInner: "#FFE7DC", litMid: "#FFA070", litOuter: "#E0531F",
      dimInner: "#822A0D", dimOuter: "#2B0121",
      rimFill: "#FF6C37", rimStroke: "#FFA17F", glow: "rgba(255,108,55,.55)",
      cardSoft: "#FFD9C6", cardEdge: "#FF875B",
      noise: 1.9,
      cells: genHexCells,
      backdrop: function (id) {
        return '<g filter="url(#noise_' + id + ')"><path d="' + HEX_FILL + '" fill="url(#bg_' + id + ')"></path></g>' +
               '<path d="' + HEX_RIM + '" fill="#FF6C37" fill-opacity="0.5" stroke="#FFA17F" stroke-miterlimit="10"></path>';
      },
      patterns: pats("plus", "x", "cross", "diamond", "edge", "checker", "full")
    },
    fabric: {
      key: "fabric", title: "Fabric Gateway", dot: "arch",
      kfLit: ["#FFEAFE", "#FB8BF2", "#E24FD0"],
      bright: "#F37FFE", mid: "#604791",
      litInner: "#FCE0FF", litMid: "#F19BF8", litOuter: "#C939DE",
      dimInner: "#7A1E86", dimOuter: "#2B0121",
      rimFill: "#F37FFE", rimStroke: "#F8BEFE", glow: "rgba(243,127,254,.5)",
      cardSoft: "#F3CFFA", cardEdge: "#F37FFE",
      noise: 1.9,
      inside: insideArch, path: ARCH_PATH,
      // symmetric about the vertical axis: nested arches + centred spine / diamond
      patterns: pats("ring1", "spine", "plus", "diamondL", "ring0", "full"),
      rest: "altDepth", idle: pats("ring0", "ring1", "ring2")
    },
    fern: {
      key: "fern", title: "Fern", dot: "triangle",
      kfLit: ["#EAFFEE", "#76E184", "#1FA834"], rimStrokeFrom: ["#7BE389", "#1FB02E", "#1fb02e"],
      bright: "#5CBF66", mid: "#604791",
      litInner: "#D6F8DA", litMid: "#74D981", litOuter: "#1E9E2C",
      dimInner: "#1B6E25", dimOuter: "#06210A",
      rimFill: "#1FB02E", rimStroke: "#24C939", glow: "rgba(46,204,64,.5)",
      cardSoft: "#CDEFD2", cardEdge: "#5CBF66",
      noise: 1.9,
      inside: insideTriangle, path: TRI_PATH,
      // symmetric about the vertical axis: nested triangles + centred spine
      patterns: pats("ring0", "ring1", "spine", "diamondL", "ring2", "full"),
      rest: "altDepth", idle: pats("ring0", "ring1", "ring2")
    },
    astro: {
      key: "astro", title: "Astro AI", dot: "circle",
      kfLit: ["#E6F3FF", "#7ABCFF", "#1E84E8"], bgBoost: 1.9, bgDark: "#16436E",
      bright: "#42A4FF", mid: "#604791",
      litInner: "#DCEEFF", litMid: "#7CC0FF", litOuter: "#1E78D6",
      dimInner: "#134A86", dimOuter: "#031A33",
      rimFill: "#42A4FF", rimStroke: "#A9D4FF", glow: "rgba(66,164,255,.5)",
      cardSoft: "#CFE4FB", cardEdge: "#42A4FF",
      noise: 1.9,
      inside: insideCircle,
      backdrop: function (id) {
        return '<g filter="url(#noise_' + id + ')"><circle cx="151.5" cy="169" r="150" fill="url(#bg_' + id + ')"></circle></g>' +
               '<circle cx="151.5" cy="169" r="150" fill="none" stroke="#42A4FF" stroke-opacity="0.5" stroke-width="2"></circle>';
      },
      patterns: pats("coreDot", "diamondS", "plus", "x", "diamondL", "full"),
      rest: "altDepth", idle: pats("coreDot", "ring1", "ring0")
    }
  };

  // default backdrop for path-based shapes (arch, triangle)
  function pathBackdrop(shape, id) {
    return '<g filter="url(#noise_' + id + ')"><path d="' + shape.path + '" fill="url(#bg_' + id + ')"></path></g>' +
           '<path d="' + shape.path + '" fill="' + shape.rimFill + '" fill-opacity="0.42" stroke="' +
           shape.rimStroke + '" stroke-width="1.5" stroke-miterlimit="10"></path>';
  }

  // light card variant: just the shape outline stroked in its brand color
  function outlineEl(shape) {
    var col = shape.bright, sw = 6;
    if (shape.key === "postman")
      return '<path d="' + HEX_FILL + '" fill="none" stroke="' + col + '" stroke-width="' + sw + '" stroke-linejoin="round"></path>';
    if (shape.key === "astro")
      return '<circle cx="151.5" cy="169" r="146" fill="none" stroke="' + col + '" stroke-width="' + sw + '"></circle>';
    return '<path d="' + shape.path + '" fill="none" stroke="' + col + '" stroke-width="' + sw + '" stroke-linejoin="round"></path>';
  }

  /* ============================================================
     createIllustration(shape) → live, interactive illustration.
     ============================================================ */
  /* ============================================================
     createKeyframeIllustration(shape) — plays the shape's real
     keyframe SVGs in sequence (resting = frame 0, hover = cycle).
     Exposes the same interface as createIllustration.
     ============================================================ */
  function kfClamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function createKeyframeIllustration(shape) {
    var data = window.KF_DATA[shape.key];
    var uid = "kf" + (UID++);
    var root = document.createElement("div");
    root.className = "illo illo-kf";
    if (shape.bgBoost) root.style.setProperty("--kf-bg-mul", shape.bgBoost);

    var litCol = shape.kfLit || ((data.litCol && data.litCol.length >= 2) ? data.litCol : ["#FFE7DC", "#FFA070", "#E0531F"]);
    var dimCol = (data.dimCol && data.dimCol.length >= 2) ? data.dimCol : (shape.kfDim || ["#822A0D", "#2B0121"]);
    var stroke = dimCol[dimCol.length - 1] || "#2B0121";
    function gradStr(id, cols) {
      var n = cols.length;
      var stops = cols.map(function (c, k) {
        return '<stop offset="' + (n < 2 ? "0" : (k / (n - 1)).toFixed(3)) + '" stop-color="' + c + '"></stop>';
      }).join("");
      return '<radialGradient id="' + id + '" cx="0.5" cy="0.42" r="0.72">' + stops + '</radialGradient>';
    }
    var grads = gradStr(uid + "L", litCol) + gradStr(uid + "D", dimCol);
    var defsMatch = data.backdrop.match(/<defs>[\s\S]*<\/defs>/);
    var origDefs = defsMatch ? defsMatch[0] : "<defs></defs>";
    var bgBody = data.backdrop.replace(/<defs>[\s\S]*<\/defs>/, "");
    // only the interior gradient fill (paint0) is adjustable — leave the glass rim alone
    bgBody = bgBody.replace(/(<path\b)([^>]*?fill="url\(#paint0_radial)/, '$1 class="kf-bg"$2');
    if (shape.rimStroke) {
      if (shape.rimStrokeFrom) {
        var froms = [].concat(shape.rimStrokeFrom);
        froms.forEach(function (c) { bgBody = bgBody.split(c).join(shape.rimStroke); });
      } else bgBody = bgBody.replace(/stroke="#[0-9A-Fa-f]+"(?=[^>]*stroke-miterlimit="10")/, 'stroke="' + shape.rimStroke + '"');
    }
    if (shape.bgDark) {
      origDefs = origDefs.split('stop-color="#000000"').join('stop-color="' + shape.bgDark + '"')
        .split('stop-color="#000"').join('stop-color="' + shape.bgDark + '"')
        .replace(/<stop offset="1"><\/stop>/g, '<stop offset="1" stop-color="' + shape.bgDark + '"></stop>');
    }
    var defsFinal = origDefs.replace("</defs>", grads + "</defs>");

    var tiles = data.tiles.map(function (d, i) {
      return '<path class="kf-dim" d="' + d + '" fill="url(#' + uid + 'D)" stroke="' + stroke + '" stroke-width="1.25" stroke-linecap="round" stroke-linejoin="round"></path>' +
             '<path class="kf-lit" data-i="' + i + '" d="' + d + '" fill="url(#' + uid + 'L)" stroke="' + stroke + '" stroke-width="1.25" stroke-linejoin="round"></path>';
    }).join("");

    var svg =
      '<svg viewBox="' + data.viewBox + '" xmlns="http://www.w3.org/2000/svg">' + defsFinal +
      bgBody +
      '<g class="kf-tiles">' + tiles + '</g></svg>';

    root.innerHTML = '<div class="illo-float"><div class="illo-tilt">' + svg + "</div></div>";
    var tiltEl = root.querySelector(".illo-tilt");
    var litEls = root.querySelectorAll(".kf-lit");
    var reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;

    // tile centres (first M x y of each path) for ripple ordering
    var pos = data.tiles.map(function (d) {
      var m = d.match(/M\s*([\d.]+)\s+([\d.]+)/);
      return { x: m ? +m[1] : 189, y: m ? +m[2] : 211 };
    });
    var cx = pos.reduce(function (s, p) { return s + p.x; }, 0) / pos.length;
    var cy = pos.reduce(function (s, p) { return s + p.y; }, 0) / pos.length;
    var maxD = 1, dist01 = pos.map(function (p) { var d = Math.hypot(p.x - cx, p.y - cy); if (d > maxD) maxD = d; return d; });
    dist01 = dist01.map(function (d) { return d / maxD; });

    var haloBase = shape.glow || "rgba(255,150,95,.9)";
    function rgbaA(c, a) { return c.replace(/[\d.]+\)$/, a + ")"); }

    // ---- enhancement levels (0..1), shown by default at moderate strength ----
    var fx = { bloom: 0.5, ripple: 0.45, flicker: 0.25 };
    var glowOn = "", glowOff = "";
    function recomputeGlow() {
      var b = fx.bloom;
      var r1 = (2 + b * 4).toFixed(1), r2 = (5 + b * 18).toFixed(1);
      glowOn = "drop-shadow(0 0 " + r1 + "px rgba(255,243,230," + (0.55 + 0.4 * b).toFixed(2) + ")) " +
               "drop-shadow(0 0 " + r2 + "px " + rgbaA(haloBase, (0.45 + 0.4 * b).toFixed(2)) + ")";
      glowOff = "drop-shadow(0 0 1px " + rgbaA(haloBase, "0.3") + ")";
    }
    recomputeGlow();

    var cur = -1, timer = null;
    var FEELS = {
      natural: { on: "0.14s cubic-bezier(.2,.6,.3,1)", off: "0.5s cubic-bezier(.4,0,.3,1)" },
      snappy:  { on: "0.10s ease-out",                  off: "0.20s ease-out" },
      soft:    { on: "0.50s ease",                      off: "0.55s ease" }
    };
    var feel = FEELS.natural;

    function render(n) {
      var fr = data.frames[n];
      var rip = fx.ripple * 520; // ms spread across the grid
      for (var i = 0; i < litEls.length; i++) {
        var on = fr[i] === 1;
        var was = litEls[i].__on;
        litEls[i].__on = on;
        if (i === hoverIdx) continue;          // cursor owns this tile right now
        if (cur >= 0 && was === on) continue;
        litEls[i].style.transitionDelay = rip > 0 ? (dist01[i] * rip).toFixed(0) + "ms" : "0ms";
        litEls[i].style.transition = "opacity " + (on ? feel.on : feel.off) + ", filter " + (on ? feel.on : feel.off);
        litEls[i].style.opacity = on ? "1" : "0";
        litEls[i].style.filter = on ? glowOn : glowOff;
      }
      cur = n;
    }
    function setFeel(name) { feel = FEELS[name] || FEELS.natural; }

    // ---- cursor: the tile under the pointer glows brightly ----
    var hoverIdx = -1;
    var hoverGlow = "drop-shadow(0 0 3px rgba(255,250,245,.95)) drop-shadow(0 0 12px " + rgbaA(haloBase, "0.95") + ")";
    function restoreTile(i) {
      if (i < 0) return;
      var el = litEls[i];
      el.style.transition = "opacity " + feel.off + ", filter " + feel.off + ", transform .25s ease";
      el.style.transitionDelay = "0ms";
      el.style.opacity = el.__on ? "1" : "0";
      el.style.filter = el.__on ? glowOn : glowOff;
      el.style.transform = "";
    }
    function glowTile(i) {
      var el = litEls[i];
      el.style.transition = "opacity .12s ease, filter .14s ease";
      el.style.transitionDelay = "0ms";
      el.style.opacity = "1";
      el.style.filter = hoverGlow;
    }

    // ---- idle micro-flicker: a few lit tiles gently pulse between holds ----
    var flickerT = null;
    function flickerTick() {
      if (fx.flicker <= 0) return;
      var ons = [];
      for (var i = 0; i < litEls.length; i++) if (litEls[i].__on) ons.push(litEls[i]);
      if (!ons.length) return;
      var count = Math.max(1, Math.round(fx.flicker * 5));
      for (var k = 0; k < count; k++) {
        var el = ons[(Math.random() * ons.length) | 0];
        var dipMin = 1 - 0.45 * fx.flicker;
        var dip = (dipMin + Math.random() * (1 - dipMin)).toFixed(2);
        el.style.transition = "opacity 90ms ease"; el.style.transitionDelay = "0ms";
        el.style.opacity = dip;
        (function (e) { setTimeout(function () { if (e.__on) e.style.opacity = "1"; }, 110); })(el);
      }
    }
    function restartFlicker() {
      if (flickerT) { clearInterval(flickerT); flickerT = null; }
      if (!reduce && fx.flicker > 0) flickerT = setInterval(flickerTick, 150);
    }
    function stopFlicker() { if (flickerT) { clearInterval(flickerT); flickerT = null; } }

    function setFx(o) {
      if (o.bloom != null) fx.bloom = o.bloom;
      if (o.ripple != null) fx.ripple = o.ripple;
      if (o.flicker != null) fx.flicker = o.flicker;
      recomputeGlow();
      for (var i = 0; i < litEls.length; i++) if (litEls[i].__on) litEls[i].style.filter = glowOn;
      restartFlicker();
    }
    function startSeq() {
      if (reduce || timer) return;
      timer = setInterval(function () { render((cur + 1) % data.frames.length); }, 2000);
    }
    function stopSeq() { if (timer) { clearInterval(timer); timer = null; } }

    // ---- per-tile cursor glow: the tile under the pointer lights brightly ----
    if (!reduce) {
      var kfSvg = root.querySelector("svg");
      var kfBoxes = null;
      function ensureBoxes() {
        if (kfBoxes) return;
        kfBoxes = [];
        for (var i = 0; i < litEls.length; i++) { try { kfBoxes[i] = litEls[i].getBBox(); } catch (e) { kfBoxes[i] = null; } }
      }
      function tileAt(cx, cy) {
        if (!kfSvg || !kfSvg.getScreenCTM) return -1;
        ensureBoxes();
        var ctm = kfSvg.getScreenCTM(); if (!ctm) return -1;
        var pt = kfSvg.createSVGPoint(); pt.x = cx; pt.y = cy;
        var p = pt.matrixTransform(ctm.inverse());
        for (var i = 0; i < kfBoxes.length; i++) {
          var b = kfBoxes[i];
          if (b && p.x >= b.x && p.x <= b.x + b.width && p.y >= b.y && p.y <= b.y + b.height) return i;
        }
        return -1;
      }
      root.addEventListener("mousemove", function (e) {
        var idx = tileAt(e.clientX, e.clientY);
        if (idx === hoverIdx) return;
        if (hoverIdx >= 0) restoreTile(hoverIdx);
        hoverIdx = idx;
        if (idx >= 0) glowTile(idx);
      });
      root.addEventListener("mouseleave", function () {
        if (hoverIdx >= 0) { restoreTile(hoverIdx); hoverIdx = -1; }
      });
    }

    render(0);
    return {
      el: root, key: shape.key, shape: shape,
      setScatter: function () {}, setGlow: function () {}, setFeel: setFeel, setFx: setFx,
      show: function () { if (cur < 0) render(0); startSeq(); restartFlicker(); },
      hide: function () { stopSeq(); stopFlicker(); }
    };
  }

  var UID = 0;
  function createIllustration(shape, opts) {
    var card = !!(opts && opts.card);
    // shapes that ship real keyframe SVGs play those verbatim (no generated tiles)
    if (!card && window.KF_DATA && window.KF_DATA[shape.key]) return createKeyframeIllustration(shape);
    var id = "s" + (UID++);
    var glowVar = 0.55;
    var isHex = !!shape.cells;
    var cells = isHex ? shape.cells() : genCells(shape.inside);
    // per-cell seed + distance-from-boundary depth (drives varied, still-geometric glow)
    (function () {
      var present = {}, byKey = {};
      cells.forEach(function (c) { present[c.i + "," + c.j] = true; byKey[c.i + "," + c.j] = c; });
      function hash(i, j) { var n = Math.sin(i * 127.1 + j * 311.7) * 43758.5453; return n - Math.floor(n); }
      var nb = [[1, 0], [-1, 0], [0, 1], [0, -1]], q = [], head = 0;
      cells.forEach(function (c) {
        c.seed = hash(c.i, c.j); c.depth = -1;
        var border = nb.some(function (d) { return !present[(c.i + d[0]) + "," + (c.j + d[1])]; });
        if (border) { c.depth = 0; q.push(c); }
      });
      while (head < q.length) {
        var c = q[head++];
        nb.forEach(function (d) {
          var n2 = byKey[(c.i + d[0]) + "," + (c.j + d[1])];
          if (n2 && n2.depth === -1) { n2.depth = c.depth + 1; q.push(n2); }
        });
      }
      // normalize depth + position so patterns can trace the shape itself
      var maxD = 0, minX = 1e9, maxX = -1e9, minY = 1e9, maxY = -1e9;
      cells.forEach(function (c) {
        if (c.depth > maxD) maxD = c.depth;
        if (c.x < minX) minX = c.x; if (c.x > maxX) maxX = c.x;
        if (c.y < minY) minY = c.y; if (c.y > maxY) maxY = c.y;
      });
      var spanX = (maxX - minX) || 1, spanY = (maxY - minY) || 1;
      cells.forEach(function (c) {
        c.dn = c.depth / (maxD || 1);   // 0 = on the outline, 1 = deepest core
        c.nx = (c.x - minX) / spanX;    // 0..1 left -> right within the shape
        c.ny = (c.y - minY) / spanY;    // 0..1 top -> bottom within the shape
      });
    })();

    var root = document.createElement("div");
    root.className = "illo" + (card ? " illo-card" : "");
    var bgInner = card
      ? outlineEl(shape)
      : ('<defs>' + noiseFilter(id, shape.noise) + bgGrad(id, shape) + '</defs>' +
         (shape.backdrop ? shape.backdrop(id) : pathBackdrop(shape, id)));
    root.innerHTML =
      '<div class="illo-float"><div class="illo-tilt">' +
        '<svg class="illo-bg" viewBox="0 0 ' + VW + ' ' + VH + '" xmlns="' + NS + '">' +
          bgInner +
        '</svg>' +
        '<svg class="illo-sq" viewBox="0 0 ' + VW + ' ' + VH + '" xmlns="' + NS + '">' +
          '<defs>' + litGrad(id, shape) + dimGrad(id, shape) + '</defs>' +
          '<g class="sq-group"></g>' +
        '</svg>' +
      '</div></div>';

    var group = root.querySelector(".sq-group");
    var tiltEl = root.querySelector(".illo-tilt");

    cells.forEach(function (c) {
      var b = mkRect(c, "url(#dim_" + id + ")");
      if (card) {
        b.setAttribute("fill", "none");
        b.setAttribute("stroke", shape.bright);
        b.setAttribute("stroke-opacity", "0.32");
        b.setAttribute("stroke-width", "1.1");
      } else {
        b.setAttribute("fill-opacity", "0.32");
        b.setAttribute("stroke", shape.dimOuter);
        b.setAttribute("stroke-width", "0.8");
      }
      group.appendChild(b);
      var lit = mkRect(c, "url(#lit_" + id + ")");
      lit.setAttribute("class", "sq-lit");
      lit.style.transitionDelay = (c.r * 0.8 + (isHex ? 0 : c.seed * 210)).toFixed(0) + "ms";
      group.appendChild(lit);
      c.lit = lit;
    });

    function light(c, v) {
      var el = c.lit;
      el.style.opacity = v.toFixed(3);
      el.style.transform = "scale(" + (0.5 + 0.5 * Math.min(1, v)).toFixed(3) + ")";
      if (v > 0.55)      el.style.filter = "drop-shadow(0 0 3.6px " + shape.glow.replace(/[\d.]+\)$/, "0.9)") + ")";
      else if (v > 0.05) el.style.filter = "drop-shadow(0 0 1.8px " + shape.glow.replace(/[\d.]+\)$/, "0.45)") + ")";
      else               el.style.filter = "none";
    }
    // per-cell brightness variance driven by glowVar (organic, but still geometric)
    function vary(base, c) { return base * (1 - glowVar * 0.6 * (1 - c.seed)); }
    function restI(c) {
      if (isHex) return c.base ? 1 : 0;             // Postman: exact mark, untouched
      // resting motif = a deliberate symmetric figure (concentric nested copies of the shape)
      var restFn = shape.rest ? PAT[shape.rest] : null;
      var on = restFn ? restFn(c) : c.edge;
      var g = on ? 1 : (c.depth <= 0 ? 0.18 : 0);   // lit motif + faint outline ghost
      return vary(g, c);
    }
    function applyRest(idleFn) {
      cells.forEach(function (c) {
        var v = restI(c);
        if (idleFn && idleFn(c)) {
          var boost = isHex ? (c.base ? 1 : 0.42) : vary(0.7, c);
          v = Math.max(v, boost);
        }
        light(c, v);
      });
    }
    function applyPat(fn) {
      cells.forEach(function (c) { light(c, fn(c) ? vary(1, c) : 0); });
    }

    var reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
    var idleSet = shape.cells
      ? [PAT.rNear, PAT.rMid, PAT.rFar, PAT.diagA, PAT.diagB]
      : (shape.idle || [PAT.ring0, PAT.ring1, PAT.ring2]);   // symmetric nested-shape pulse

    var idleT = null, idleI = 0, hoverT = null, hoverI = 0, alive = false;
    function startIdle() {
      if (reduce || idleT) return;
      idleI = 0;
      idleT = setInterval(function () { applyRest(idleSet[idleI % idleSet.length]); idleI++; }, 1750);
    }
    function stopIdle() { if (idleT) { clearInterval(idleT); idleT = null; } }
    function startHover() {
      stopIdle();
      if (reduce) { applyRest(null); return; }
      hoverI = 0; applyPat(shape.patterns[0]);
      hoverT = setInterval(function () {
        hoverI = (hoverI + 1) % shape.patterns.length;
        applyPat(shape.patterns[hoverI]);
      }, 820);
    }
    function stopHover() {
      if (hoverT) { clearInterval(hoverT); hoverT = null; }
      applyRest(null); if (alive) startIdle();
    }

    root.addEventListener("mouseenter", startHover);
    root.addEventListener("mouseleave", stopHover);
    root.addEventListener("touchstart", function () {
      if (hoverT) stopHover(); else startHover();
    }, { passive: true });

    // cursor tilt (only when interactive / on top)
    var MAXT = 11;
    root.addEventListener("mousemove", function (e) {
      if (reduce) return;
      var r = root.getBoundingClientRect();
      var nx = (e.clientX - (r.left + r.width / 2)) / (r.width / 2);
      var ny = (e.clientY - (r.top + r.height / 2)) / (r.height / 2);
      nx = Math.max(-1.5, Math.min(1.5, nx));
      ny = Math.max(-1.5, Math.min(1.5, ny));
      tiltEl.style.transform = "rotateY(" + (nx * MAXT).toFixed(2) + "deg) rotateX(" + (-ny * MAXT).toFixed(2) + "deg)";
    });
    root.addEventListener("mouseleave", function () { tiltEl.style.transform = ""; });

    applyRest(null);

    return {
      el: root,
      key: shape.key,
      shape: shape,
      cells: cells,
      // decompose helper: push each square outward by amt (0..1)
      setScatter: function (amt) {
        var k = amt * 1.4;
        cells.forEach(function (c) {
          var ux = c.dx / (c.r || 1), uy = c.dy / (c.r || 1);
          c.lit.style.transition = amt > 0 ? "none" : "";
          c.lit.parentNode; // noop
        });
        group.style.transform = "scale(" + (1 + amt * 0.12).toFixed(3) + ")";
        group.style.opacity = (1 - amt).toFixed(3);
        group.style.filter = amt > 0.01 ? "blur(" + (amt * 2).toFixed(2) + "px)" : "";
      },
      show: function () { alive = true; startIdle(); },
      hide: function () { alive = false; stopIdle(); stopHover(); },
      setFeel: function () {}, setFx: function () {},
      setGlow: function (v) { glowVar = v; if (!hoverT) applyRest(null); },
      noiseEls: root.querySelectorAll(".shape-noise")
    };
  }

  /* ---------- svg defs builders ---------- */
  function mkRect(c, fill) {
    var r = document.createElementNS(NS, "rect");
    r.setAttribute("x", (c.x - SIDE / 2).toFixed(2));
    r.setAttribute("y", (c.y - SIDE / 2).toFixed(2));
    r.setAttribute("width", SIDE); r.setAttribute("height", SIDE);
    r.setAttribute("rx", RX); r.setAttribute("ry", RX);
    r.setAttribute("fill", fill);
    return r;
  }
  function bgGrad(id, s) {
    return '<radialGradient id="bg_' + id + '" cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" ' +
      'gradientTransform="translate(151.5 168.5) rotate(-90) scale(154 154)">' +
      '<stop stop-color="' + s.bright + '"></stop>' +
      '<stop offset="0.6286" stop-color="' + s.mid + '"></stop>' +
      '<stop offset="1" stop-color="#000000"></stop></radialGradient>';
  }
  function litGrad(id, s) {
    return '<radialGradient id="lit_' + id + '" cx="0.5" cy="0.4" r="0.72">' +
      '<stop stop-color="' + s.litInner + '"></stop>' +
      '<stop offset="0.45" stop-color="' + s.litMid + '"></stop>' +
      '<stop offset="1" stop-color="' + s.litOuter + '"></stop></radialGradient>';
  }
  function dimGrad(id, s) {
    return '<radialGradient id="dim_' + id + '" cx="0.5" cy="0.42" r="0.72">' +
      '<stop stop-color="' + s.dimInner + '"></stop>' +
      '<stop offset="1" stop-color="' + s.dimOuter + '"></stop></radialGradient>';
  }
  function noiseFilter(id, freq) {
    return '<filter id="noise_' + id + '" x="0" y="0" width="100%" height="100%" filterUnits="objectBoundingBox" color-interpolation-filters="sRGB">' +
      '<feFlood flood-opacity="0" result="bg"></feFlood>' +
      '<feBlend mode="normal" in="SourceGraphic" in2="bg" result="shape"></feBlend>' +
      '<feTurbulence type="fractalNoise" baseFrequency="' + freq + ' ' + freq + '" stitchTiles="stitch" numOctaves="3" result="noise" seed="3606"></feTurbulence>' +
      '<feColorMatrix in="noise" type="luminanceToAlpha" result="an"></feColorMatrix>' +
      '<feComponentTransfer in="an" result="cn"><feFuncA type="discrete" tableValues="1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0"></feFuncA></feComponentTransfer>' +
      '<feComposite operator="in" in2="shape" in="cn" result="clip"></feComposite>' +
      '<feFlood flood-color="#000000" flood-opacity="0.55" class="shape-noise" result="cf"></feFlood>' +
      '<feComposite operator="in" in2="clip" in="cf" result="craw"></feComposite>' +
      '<feGaussianBlur in="craw" stdDeviation="0.2" result="c"></feGaussianBlur>' +
      '<feMerge><feMergeNode in="shape"></feMergeNode><feMergeNode in="c"></feMergeNode></feMerge>' +
      '</filter>';
  }

  global.SHAPES = SHAPES;
  global.SHAPE_ORDER = ["postman", "fabric", "fern", "astro"];
  global.createIllustration = createIllustration;
})(window);
