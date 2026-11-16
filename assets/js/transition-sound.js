/**
 * Screen 1 -> Screen 2 Sunlight Transition Atmospheric Audio Controller
 * Subtle, soft ethereal sound corresponding to the scroll-driven sunlight bloom.
 * Triggers once per transition entry with gentle fade-in, peak swell, and natural fade-out.
 */
(function() {
  'use strict';

  // 1. Accessibility & Reduced Motion Guard
  if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    return;
  }

  // 2. Asset Path Resolution
  var scriptTag = document.currentScript;
  var audioSrc = 'assets/audio/sunlight-transition.mp4';
  if (scriptTag && scriptTag.src) {
    var match = scriptTag.src.match(/^(.*)\/js\/transition-sound\.js(\?.*)?$/i);
    if (match) {
      audioSrc = match[1] + '/audio/sunlight-transition.mp4';
    }
  }

  // 3. Audio & State Setup
  var audio = null;
  var isUnlocked = false;
  var hasTriggered = false;
  var transitionState = 'IDLE'; // 'IDLE' | 'FADING_IN' | 'SWELLING' | 'FADING_OUT' | 'COMPLETED'
  var fadeStartTime = 0;
  var fadeStartVolume = 0;
  var targetVolume = 0;
  var fadeDuration = 400; // ms
  var maxPeakVolume = 0.20; // 20% of original amplitude (15–25% requirement)
  var playbackStartTime = 0;
  var maxAudibleDuration = 1850; // ~1.85s natural audible duration
  var rafId = null;

  function initAudio() {
    if (audio) return audio;
    audio = new Audio();
    audio.src = audioSrc;
    audio.preload = 'auto';
    audio.loop = false;
    audio.volume = 0;
    return audio;
  }

  // 4. Browser Autoplay Unlock
  function unlockAudio() {
    if (isUnlocked) return;
    isUnlocked = true;
    window.removeEventListener('pointerdown', unlockAudio);
    window.removeEventListener('scroll', unlockAudio);
    window.removeEventListener('touchstart', unlockAudio);
    window.removeEventListener('keydown', unlockAudio);

    initAudio();
    audio.volume = 0;
    var p = audio.play();
    if (p !== undefined) {
      p.then(function() {
        audio.pause();
        audio.currentTime = 0;
      }).catch(function() {});
    }
  }

  window.addEventListener('pointerdown', unlockAudio, { once: true, passive: true });
  window.addEventListener('scroll', unlockAudio, { once: true, passive: true });
  window.addEventListener('touchstart', unlockAudio, { once: true, passive: true });
  window.addEventListener('keydown', unlockAudio, { once: true, passive: true });

  // 5. Sound Mute Check
  function isSoundEnabled() {
    try {
      if (sessionStorage.getItem('portfolio_sound') === 'false') return false;
    } catch (e) {}
    var soundBtn = document.querySelector('.sound-toggle');
    if (soundBtn && soundBtn.getAttribute('aria-pressed') === 'false') return false;
    return true;
  }

  // 6. Volume Interpolation & Fade Loop
  function startFade(target, duration, onComplete) {
    if (!audio) return;
    fadeStartTime = performance.now();
    fadeStartVolume = audio.volume;
    targetVolume = Math.max(0, Math.min(1, target));
    fadeDuration = Math.max(16, duration);

    if (rafId) cancelAnimationFrame(rafId);

    function step(now) {
      var elapsed = now - fadeStartTime;
      var prog = Math.min(1, elapsed / fadeDuration);
      // Smooth cubic ease curve for gradual ramp
      var ease = prog * prog * (3 - 2 * prog);
      var currentVol = fadeStartVolume + (targetVolume - fadeStartVolume) * ease;
      audio.volume = Math.max(0, Math.min(1, currentVol));

      if (prog < 1) {
        rafId = requestAnimationFrame(step);
      } else {
        rafId = null;
        if (typeof onComplete === 'function') onComplete();
      }
    }
    rafId = requestAnimationFrame(step);
  }

  // 7. Transition Trigger & Scroll Monitor
  function onScroll() {
    var pRoot = document.querySelector('.portfolio-root');
    if (!pRoot) return;

    var pTop = pRoot.getBoundingClientRect().top + window.scrollY;
    var maxScroll = pRoot.offsetHeight - window.innerHeight;
    if (maxScroll <= 0) return;

    var t = (window.scrollY - pTop) / maxScroll;

    // Reset condition: if user scrolls back to the very top of Screen 1
    if (t < 0.02 && transitionState === 'COMPLETED') {
      transitionState = 'IDLE';
      hasTriggered = false;
      if (audio) {
        audio.pause();
        audio.currentTime = 0;
        audio.volume = 0;
      }
      return;
    }

    // Stage 1: Beginning of transition (t ~ 0.04 to 0.08)
    // Triggers only once when visitor initially enters the transition
    if (t >= 0.04 && t < 0.26 && transitionState === 'IDLE' && !hasTriggered) {
      if (!isSoundEnabled()) return;

      initAudio();
      hasTriggered = true;
      transitionState = 'FADING_IN';
      audio.currentTime = 0;
      audio.volume = 0;
      playbackStartTime = performance.now();

      var playPromise = audio.play();
      if (playPromise !== undefined) {
        playPromise.then(function() {
          // Stage 1: Gentle fade-in over 380ms
          startFade(maxPeakVolume * 0.85, 380, function() {
            if (transitionState === 'FADING_IN') {
              transitionState = 'SWELLING';
            }
          });
        }).catch(function() {
          // Handled gracefully without errors
          transitionState = 'COMPLETED';
        });
      }
    }

    // Stage 2 & 3: Sunlight expansion & Brightest point (t ~ 0.08 to 0.22)
    if (transitionState === 'SWELLING') {
      var elapsed = performance.now() - playbackStartTime;

      // Swell subtly with visual progression towards peak flare at t ~ 0.14 - 0.18
      var flareProg = Math.max(0, Math.min(1, (t - 0.06) / 0.12));
      var targetPeak = maxPeakVolume * (0.85 + flareProg * 0.15); // smoothly reaches 0.20
      audio.volume = Math.max(0, Math.min(1, targetPeak));

      // Stage 4: Trigger fade-out when transition finishes (t >= 0.24) OR max audible duration reached
      if (t >= 0.24 || elapsed >= maxAudibleDuration) {
        transitionState = 'FADING_OUT';
        // Stage 4: Smooth fade-out of approximately 600ms down to inaudible
        startFade(0, 600, function() {
          if (audio) {
            audio.pause();
            audio.currentTime = 0;
          }
          transitionState = 'COMPLETED';
        });
      }
    }

    // Backward scroll guard: if visitor scrolls back to Screen 1 before transition completes
    if ((transitionState === 'FADING_IN' || transitionState === 'SWELLING') && t < 0.03) {
      transitionState = 'FADING_OUT';
      startFade(0, 350, function() {
        if (audio) {
          audio.pause();
          audio.currentTime = 0;
        }
        transitionState = 'IDLE';
        hasTriggered = false;
      });
    }

    // Fast-scroll guard: if visitor scrolls quickly through into Screen 2 (t >= 0.28)
    if (t >= 0.28 && (transitionState === 'FADING_IN' || transitionState === 'SWELLING')) {
      transitionState = 'FADING_OUT';
      startFade(0, 300, function() {
        if (audio) {
          audio.pause();
          audio.currentTime = 0;
        }
        transitionState = 'COMPLETED';
      });
    }
  }

  window.addEventListener('scroll', onScroll, { passive: true });
})();

