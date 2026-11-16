/**
 * Shared Fluid Binary Surface ASCII Engine for Portfolio Footers
 * Reference Implementation: Homepage Natural Gradient Footer
 * 
 * Features:
 * - Fluid organic binary field (0 and 1) positioned behind and around closing statement
 * - Subtle organic idle shimmering & continuous character flipping
 * - Dynamic velocity-driven swishing displacement & Hermite influence
 * - Fixed 135px interaction radius
 * - Elastic damped spring return to origin
 * - IntersectionObserver-based lifecycle to eliminate CPU usage when off-screen
 * - Complete cleanup on route/page transitions to prevent duplicate loops
 * - Dynamic year & projects smooth scroll handling
 */
(function() {
  'use strict';

  // Check prefers-reduced-motion
  if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    return;
  }

  var PALETTE = ['#F8F5EC', '#1E3020', '#FFC46B', '#96C8FF', '#F6C4C9'];
  var SHIMMER_HIGHLIGHT = '#FAF7EE';

  function createFooterAsciiEngine(footer) {
    if (!footer) return null;

    var canvas = footer.querySelector('canvas.footer-ascii-canvas') || footer.querySelector('#footer-ascii-canvas') || footer.querySelector('canvas');
    if (!canvas) {
      canvas = document.createElement('canvas');
      canvas.id = 'footer-ascii-canvas';
      canvas.className = 'footer-ascii-canvas';
      canvas.setAttribute('aria-hidden', 'true');
      var backdrop = footer.querySelector('.footer-gradient-backdrop') || footer;
      backdrop.appendChild(canvas);
    }

    var ctx = canvas.getContext('2d');
    if (!ctx) return null;

    var width = 0, height = 0, dpr = 1;
    var nodes = [];
    var isNear = false;
    var targetAlpha = 0, currentAlpha = 0;
    var targetX = -999, targetY = -999;
    var currentX = -999, currentY = -999;
    var rafId = null;
    var touchActive = false;
    var touchTimer = null;
    var isVisible = true;
    var isDestroyed = false;

    // Velocity & fluid trailing swish state
    var lastTimestamp = 0;
    var lastPointerX = -999, lastPointerY = -999, lastPointerTime = 0;
    var rawVelX = 0, rawVelY = 0, rawVelocity = 0;
    var smoothVelX = 0, smoothVelY = 0, smoothedVelocity = 0;

    var fixedRadius = 145;
    var fixedRadiusSq = fixedRadius * fixedRadius;
    var stepX = 13.5;
    var stepY = 16.5;

    function rebuildNodes() {
      if (isDestroyed || !footer.isConnected) return;
      var rect = footer.getBoundingClientRect();
      var w = Math.round(rect.width);
      var h = Math.round(rect.height);
      if (w <= 0 || h <= 0) return;

      width = w;
      height = h;
      dpr = Math.min(window.devicePixelRatio || 1, 2);

      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      canvas.style.width = w + 'px';
      canvas.style.height = h + 'px';

      var newNodes = [];
      var maxX = Math.min(w - 12, Math.round(w * 0.88));

      for (var y = 10; y < h - 10; y += stepY) {
        for (var x = 10; x < maxX; x += stepX) {
          var normX = x / maxX;
          if (normX > 0.76 && Math.random() < ((normX - 0.76) / 0.24) * 0.75) {
            continue; // Soft organic falloff before connect column
          }

          var char = (Math.random() < 0.5 ? '0' : '1');
          var jx = (Math.random() - 0.5) * 1.6;
          var jy = (Math.random() - 0.5) * 1.6;
          var colorIdx = Math.floor(Math.random() * PALETTE.length);

          newNodes.push({
            x: x + jx,
            y: y + jy,
            originX: x + jx,
            originY: y + jy,
            dispX: 0,
            dispY: 0,
            targetDispX: 0,
            targetDispY: 0,
            baseChar: char,
            char: char,
            colorIdx: colorIdx,
            baseAlpha: 0.22 + Math.random() * 0.22,
            seed: Math.random() * 62.8,
            flipRate: 0.0016 + Math.random() * 0.0026,
            spatialOffset: (x * 0.008 + y * 0.006),
            cursorPhaseBonus: 0,
            hoverGlow: 0,
            currentGlow: 0
          });
        }
      }
      nodes = newNodes;
    }

    function render(timestamp) {
      if (isDestroyed || !isVisible) {
        rafId = null;
        return;
      }

      var now = timestamp || performance.now();
      var dt = lastTimestamp ? Math.min((now - lastTimestamp) / 1000, 0.1) : 0.016;
      lastTimestamp = now;

      // 1. Velocity Tracking & Direction Smoothing
      rawVelX *= Math.exp(-7 * dt);
      rawVelY *= Math.exp(-7 * dt);
      rawVelocity = Math.sqrt(rawVelX * rawVelX + rawVelY * rawVelY);
      smoothedVelocity += (rawVelocity - smoothedVelocity) * (1 - Math.exp(-10 * dt));
      if (smoothedVelocity < 0.001) smoothedVelocity = 0;

      var velLerp = 1 - Math.exp(-12 * dt);
      smoothVelX += (rawVelX - smoothVelX) * velLerp;
      smoothVelY += (rawVelY - smoothVelY) * velLerp;

      var posLerp = 1 - Math.exp(-14 * dt);
      currentX += (targetX - currentX) * posLerp;
      currentY += (targetY - currentY) * posLerp;

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, width, height);

      ctx.font = '11.5px Consolas, Courier New, monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      // 2. Render Binary Nodes with Continuous Flipping and Swishing Motion
      for (var i = 0; i < nodes.length; i++) {
        var node = nodes[i];

        // Continuous organic character transition between 0 and 1
        var phase = (now * node.flipRate) + node.spatialOffset + node.seed + node.cursorPhaseBonus;
        var wave = Math.sin(phase);

        var displayChar = (wave > 0.0) ? (node.baseChar === '0' ? '1' : '0') : node.baseChar;
        var displayColor = PALETTE[node.colorIdx];
        var isHighlight = (wave > 0.88);
        if (isHighlight) {
          displayColor = SHIMMER_HIGHLIGHT;
        }

        // Cursor Swishing Interaction
        if (isNear) {
          var dx = node.originX - currentX;
          var dy = node.originY - currentY;
          var distSq = dx * dx + dy * dy;

          if (distSq < fixedRadiusSq) {
            var dist = Math.sqrt(distSq);
            var infl = 1 - (dist / fixedRadius);
            infl = infl * infl * (3 - 2 * infl); // smooth hermite

            // Swishing displacement along velocity vector + subtle radial parting
            var swishX = smoothVelX * infl * 0.85;
            var swishY = smoothVelY * infl * 0.85;
            var normDist = Math.max(dist, 14);
            var pushX = (dx / normDist) * infl * 9;
            var pushY = (dy / normDist) * infl * 9;

            node.targetDispX = Math.max(-28, Math.min(28, swishX + pushX));
            node.targetDispY = Math.max(-28, Math.min(28, swishY + pushY));

            node.cursorPhaseBonus += infl * 0.08;
            node.hoverGlow = infl * 0.45;
          } else {
            node.targetDispX = 0;
            node.targetDispY = 0;
            node.hoverGlow = 0;
          }
        } else {
          node.targetDispX = 0;
          node.targetDispY = 0;
          node.hoverGlow = 0;
        }

        // Natural damped settling back to rest position
        node.dispX += (node.targetDispX - node.dispX) * (1 - Math.exp(-9 * dt));
        node.dispY += (node.targetDispY - node.dispY) * (1 - Math.exp(-9 * dt));
        node.cursorPhaseBonus *= Math.exp(-5 * dt);
        node.currentGlow += (node.hoverGlow - node.currentGlow) * (1 - Math.exp(-10 * dt));

        var drawX = node.originX + node.dispX;
        var drawY = node.originY + node.dispY;
        var finalAlpha = (node.baseAlpha + node.currentGlow);
        if (isHighlight) finalAlpha = Math.min(1.0, finalAlpha + 0.35);

        ctx.globalAlpha = Math.min(0.95, finalAlpha);
        ctx.fillStyle = displayColor;
        ctx.fillText(displayChar, drawX, drawY);
      }

      ctx.globalAlpha = 1.0;
      rafId = requestAnimationFrame(render);
    }

    function wakeAnimation() {
      if (!isVisible || isDestroyed) return;
      if (!rafId) {
        lastTimestamp = performance.now();
        rafId = requestAnimationFrame(render);
      }
    }

    function updatePointer(clientX, clientY) {
      if (isDestroyed || !footer.isConnected) return;
      var rect = footer.getBoundingClientRect();
      var relX = clientX - rect.left;
      var relY = clientY - rect.top;

      var inProximity = (
        relX >= 0 &&
        relX <= rect.width &&
        relY >= 0 &&
        relY <= rect.height
      );

      if (inProximity) {
        var now = performance.now();
        if (lastPointerTime > 0) {
          var dtPointer = Math.max(0.001, (now - lastPointerTime) / 1000);
          var vx = (relX - lastPointerX) / dtPointer;
          var vy = (relY - lastPointerY) / dtPointer;
          rawVelX = Math.max(-500, Math.min(500, vx * 0.05));
          rawVelY = Math.max(-500, Math.min(500, vy * 0.05));
          rawVelocity = Math.sqrt(rawVelX * rawVelX + rawVelY * rawVelY);
        }
        lastPointerX = relX;
        lastPointerY = relY;
        lastPointerTime = now;

        isNear = true;
        targetX = Math.max(0, Math.min(rect.width, relX));
        targetY = Math.max(0, Math.min(rect.height, relY));

        if (currentAlpha < 0.05) {
          currentX = targetX;
          currentY = targetY;
        }
        targetAlpha = 1.0;
        wakeAnimation();
      } else {
        if (isNear) {
          isNear = false;
          targetAlpha = 0;
        }
      }
    }

    function onPointerMove(e) {
      if (touchActive) return;
      updatePointer(e.clientX, e.clientY);
    }

    function onPointerLeave() {
      isNear = false;
      targetAlpha = 0;
    }

    function onTouchStart(e) {
      if (e.touches && e.touches.length > 0) {
        touchActive = true;
        var touch = e.touches[0];
        var rect = footer.getBoundingClientRect();
        targetX = touch.clientX - rect.left;
        targetY = touch.clientY - rect.top;
        currentX = targetX;
        currentY = targetY;
        targetAlpha = 1.0;
        wakeAnimation();

        if (touchTimer) clearTimeout(touchTimer);
        touchTimer = setTimeout(function() {
          targetAlpha = 0;
          setTimeout(function() { touchActive = false; }, 800);
        }, 2500);
      }
    }

    window.addEventListener('pointermove', onPointerMove, { passive: true });
    footer.addEventListener('pointerleave', onPointerLeave);
    footer.addEventListener('touchstart', onTouchStart, { passive: true });

    var resizeTimer = null;
    var ro = window.ResizeObserver ? new ResizeObserver(function() {
      if (resizeTimer) clearTimeout(resizeTimer);
      resizeTimer = setTimeout(function() { rebuildNodes(); }, 80);
    }) : null;
    if (ro) ro.observe(footer);

    var io = ('IntersectionObserver' in window) ? new IntersectionObserver(function(entries) {
      entries.forEach(function(entry) {
        isVisible = entry.isIntersecting;
        if (isVisible) {
          wakeAnimation();
        } else {
          if (rafId) {
            cancelAnimationFrame(rafId);
            rafId = null;
          }
        }
      });
    }, { threshold: 0.05 }) : null;
    if (io) io.observe(footer);

    rebuildNodes();
    wakeAnimation();

    // Smooth scroll for footer Projects link if on homepage
    var projBtn = footer.querySelector('#footer-btn-projects') || document.getElementById('footer-btn-projects');
    if (projBtn && !projBtn._boundSmooth) {
      projBtn._boundSmooth = true;
      projBtn.addEventListener('click', function(e) {
        var pRoot = document.querySelector('.portfolio-root');
        if (pRoot) {
          e.preventDefault();
          var pTop = pRoot.getBoundingClientRect().top + window.scrollY;
          var pDist = pRoot.offsetHeight - window.innerHeight;
          var targetProg = 0.30 + (0.35 / 5.9) * 0.68;
          window.scrollTo({ top: Math.round(pTop + targetProg * pDist), behavior: 'smooth' });
        }
      });
    }

    // Dynamic year
    var yearEl = footer.querySelector('#footer-dynamic-year') || document.getElementById('footer-dynamic-year');
    if (yearEl) {
      yearEl.textContent = String(new Date().getFullYear());
    }

    function destroy() {
      isDestroyed = true;
      if (rafId) {
        cancelAnimationFrame(rafId);
        rafId = null;
      }
      window.removeEventListener('pointermove', onPointerMove);
      footer.removeEventListener('pointerleave', onPointerLeave);
      footer.removeEventListener('touchstart', onTouchStart);
      if (ro) ro.disconnect();
      if (io) io.disconnect();
      if (touchTimer) clearTimeout(touchTimer);
      if (resizeTimer) clearTimeout(resizeTimer);
    }

    return {
      rebuild: rebuildNodes,
      wake: wakeAnimation,
      destroy: destroy
    };
  }

  // Active instance tracking to prevent duplicate loops
  var currentInstance = null;
  var currentFooterEl = null;

  function initFooterAscii() {
    var footer = document.querySelector('footer.portfolio-gradient-footer') || document.querySelector('.portfolio-gradient-footer');
    if (!footer) return;

    if (currentFooterEl === footer && currentInstance && footer.isConnected) {
      return currentInstance;
    }

    if (currentInstance) {
      currentInstance.destroy();
      currentInstance = null;
    }

    currentFooterEl = footer;
    footer._asciiInitialized = true;
    currentInstance = createFooterAsciiEngine(footer);
    footer._footerAsciiInstance = currentInstance;
    return currentInstance;
  }

  // Auto-bind to page lifecycle & dynamic updates
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initFooterAscii);
  } else {
    initFooterAscii();
  }

  window.addEventListener('load', initFooterAscii);
  window.addEventListener('pageshow', initFooterAscii);
  document.addEventListener('portfolio:pagechanged', initFooterAscii);

  // MutationObserver to automatically bind if footer is mounted dynamically
  if (window.MutationObserver) {
    var mo = new MutationObserver(function() {
      var liveFooter = document.querySelector('footer.portfolio-gradient-footer') || document.querySelector('.portfolio-gradient-footer');
      if (liveFooter && liveFooter !== currentFooterEl) {
        initFooterAscii();
      }
    });
    mo.observe(document.body || document.documentElement, { childList: true, subtree: true });
  }

  // Expose global initializer
  window.initFooterAscii = initFooterAscii;
})();
