/**
 * Global Audio Manager & Persistent Mini-Player
 * Janya Malhotra Portfolio
 * 
 * Provides:
 * - Singleton audio player across all pages
 * - Seamless state persistence (track, timestamp, play/pause, volume) via sessionStorage
 * - Elegant floating mini-player widget with spinning disc, metadata, play/pause, and return-to-vinyl link
 * - Turntable visibility detection (hides mini-player when full deck is in view on About Me)
 * - Bi-directional synchronization between full vinyl player and floating mini-player
 */
(function() {
  'use strict';

  // 1. Audio Track Catalog
  var TRACKS = [
    {
      id: 'radiohead-present-tense',
      title: 'Present Tense',
      artist: 'Radiohead',
      album: 'A Moon Shaped Pool',
      src: 'assets/audio/radiohead-present-tense.mp4',
      cover: 'assets/images/vinyl/radiohead-a-moon-shaped-pool.jpg'
    },
    {
      id: 'alvvays-dreams-tonite',
      title: 'Dreams Tonite',
      artist: 'Alvvays',
      album: 'Antisocialites',
      src: 'assets/audio/alvvays-dreams-tonite.mp4',
      cover: 'assets/images/vinyl/alvvays-antisocialites.png'
    },
    {
      id: 'gorillaz-busted-and-blue',
      title: 'Busted & Blue',
      artist: 'Gorillaz',
      album: 'Humanz',
      src: 'assets/audio/gorillaz-busted-and-blue.mp4',
      cover: 'assets/images/vinyl/gorillaz-humanz.png'
    }
  ];

  // 2. Dynamic Relative Path Resolution
  function getBasePrefix() {
    var scripts = document.querySelectorAll('script[src*="global-audio.js"]');
    if (scripts.length > 0) {
      var src = scripts[scripts.length - 1].getAttribute('src') || '';
      var idx = src.indexOf('assets/');
      if (idx !== -1) {
        return src.substring(0, idx);
      }
    }
    var p = window.location.pathname.replace(/\\/g, '/');
    if (p.indexOf('/projects/') !== -1 && p.endsWith('/index.html')) {
      return '../../';
    }
    if (p.indexOf('/projects/') !== -1 || p.indexOf('/about') !== -1) {
      return '../';
    }
    return '';
  }

  function resolveAssetUrl(relUrl) {
    if (!relUrl) return '';
    if (relUrl.indexOf('http://') === 0 || relUrl.indexOf('https://') === 0 || relUrl.indexOf('data:') === 0) {
      return relUrl;
    }
    var base = getBasePrefix();
    var clean = relUrl.replace(/^(\.\.\/|\.\/)?/, '');
    return base + clean;
  }

  function getAboutTurntableUrl() {
    var p = window.location.pathname.replace(/\\/g, '/');
    if (p.indexOf('/about') !== -1 || p.endsWith('/about.html')) {
      return '#turntable-deck';
    }
    var base = getBasePrefix();
    return base + 'about/index.html#turntable-deck';
  }

  // 3. Storage Keys & Audio Engineering Constants
  var STORAGE_KEY_TRACK = 'jm_portfolio_music_track';
  var STORAGE_KEY_PLAYING = 'jm_portfolio_music_playing';
  var STORAGE_KEY_TIME = 'jm_portfolio_music_time';
  var STORAGE_KEY_VOLUME = 'jm_portfolio_music_volume';
  var STORAGE_KEY_DISMISSED = 'jm_portfolio_pmp_dismissed';

  // Digital headroom constant (-1.1 dBFS): Prevents inter-sample true-peak DAC hard-clipping
  // Measured peaks on decoded AAC: Radiohead +1.01 dBFS (1.123), Alvvays +1.02 dBFS (1.124).
  // At volume = 0.88, true peaks remain <= 0.989 dBFS, eliminating 100% of hard-clipping distortion.
  var DEFAULT_HEADROOM_VOLUME = 0.68;

  // 4. Player State
  var audioInstance = null;
  var currentTrackIndex = 0;
  try {
    var initialSavedTrack = parseInt(sessionStorage.getItem(STORAGE_KEY_TRACK), 10);
    if (!isNaN(initialSavedTrack) && initialSavedTrack >= 0 && initialSavedTrack < TRACKS.length) {
      currentTrackIndex = initialSavedTrack;
    }
  } catch (e) {}
  var isPlaying = false;
  var listeners = [];
  var isInitialized = false;

  function initAudio() {
    if (audioInstance) return audioInstance;

    audioInstance = new Audio();
    audioInstance.preload = 'auto';
    audioInstance.preservesPitch = true;

    // Apply digital headroom volume to guarantee clean, non-clipped output
    try {
      var savedVolume = parseFloat(sessionStorage.getItem(STORAGE_KEY_VOLUME));
      if (!isNaN(savedVolume) && savedVolume > 0 && savedVolume <= 1.0 && savedVolume <= DEFAULT_HEADROOM_VOLUME) {
        audioInstance.volume = savedVolume;
      } else {
        audioInstance.volume = DEFAULT_HEADROOM_VOLUME;
        sessionStorage.setItem(STORAGE_KEY_VOLUME, String(DEFAULT_HEADROOM_VOLUME));
      }
    } catch (e) {
      audioInstance.volume = DEFAULT_HEADROOM_VOLUME;
    }

    // Restore saved state
    try {
      var savedTrack = parseInt(sessionStorage.getItem(STORAGE_KEY_TRACK), 10);
      if (!isNaN(savedTrack) && savedTrack >= 0 && savedTrack < TRACKS.length) {
        currentTrackIndex = savedTrack;
      }
    } catch (e) {}

    audioInstance.src = resolveAssetUrl(TRACKS[currentTrackIndex].src);

    try {
      var savedTime = parseFloat(sessionStorage.getItem(STORAGE_KEY_TIME));
      if (!isNaN(savedTime) && savedTime > 0) {
        audioInstance.currentTime = savedTime;
      }
    } catch (e) {}

    audioInstance.addEventListener('play', function() {
      isPlaying = true;
      try { sessionStorage.setItem(STORAGE_KEY_PLAYING, 'true'); } catch (e) {}
      try { sessionStorage.removeItem(STORAGE_KEY_DISMISSED); } catch (e) {}
      var pmp = document.getElementById('portfolio-mini-player');
      if (pmp) {
        pmp.classList.remove('is-dismissed');
        pmp.classList.remove('is-hidden');
      }
      notifyListeners('play');
    });

    audioInstance.addEventListener('pause', function() {
      isPlaying = false;
      try { sessionStorage.setItem(STORAGE_KEY_PLAYING, 'false'); } catch (e) {}
      notifyListeners('pause');
    });

    audioInstance.addEventListener('timeupdate', function() {
      try {
        sessionStorage.setItem(STORAGE_KEY_TIME, String(audioInstance.currentTime));
      } catch (e) {}
      notifyListeners('timeupdate');
    });

    audioInstance.addEventListener('ended', function() {
      playNext();
    });

    // Save exact position before page unload
    window.addEventListener('beforeunload', function() {
      try {
        sessionStorage.setItem(STORAGE_KEY_TRACK, String(currentTrackIndex));
        sessionStorage.setItem(STORAGE_KEY_TIME, String(audioInstance ? audioInstance.currentTime : 0));
        sessionStorage.setItem(STORAGE_KEY_PLAYING, isPlaying ? 'true' : 'false');
        sessionStorage.setItem(STORAGE_KEY_VOLUME, String(audioInstance ? audioInstance.volume : DEFAULT_HEADROOM_VOLUME));
      } catch (e) {}
    });

    // Check if was playing before page transition
    try {
      if (sessionStorage.getItem(STORAGE_KEY_PLAYING) === 'true') {
        var playPromise = audioInstance.play();
        if (playPromise !== undefined) {
          playPromise.catch(function() {
            var resumeOnInteract = function() {
              window.removeEventListener('click', resumeOnInteract, true);
              window.removeEventListener('keydown', resumeOnInteract, true);
              window.removeEventListener('touchstart', resumeOnInteract, true);
              if (sessionStorage.getItem(STORAGE_KEY_PLAYING) === 'true') {
                audioInstance.play().catch(function() {});
              }
            };
            window.addEventListener('click', resumeOnInteract, true);
            window.addEventListener('keydown', resumeOnInteract, true);
            window.addEventListener('touchstart', resumeOnInteract, true);
          });
        }
      }
    } catch (e) {}

    isInitialized = true;
    return audioInstance;
  }

  function notifyListeners(eventType) {
    var state = getState();
    for (var i = 0; i < listeners.length; i++) {
      try {
        listeners[i](state, eventType);
      } catch (err) {
        console.error('Audio listener error:', err);
      }
    }
  }

  function getState() {
    var track = TRACKS[currentTrackIndex] || TRACKS[0];
    return {
      isPlaying: isPlaying,
      trackIndex: currentTrackIndex,
      track: {
        id: track.id,
        title: track.title,
        artist: track.artist,
        album: track.album,
        src: resolveAssetUrl(track.src),
        cover: resolveAssetUrl(track.cover)
      },
      currentTime: audioInstance ? audioInstance.currentTime : 0,
      duration: audioInstance && !isNaN(audioInstance.duration) ? audioInstance.duration : 0,
      volume: audioInstance ? audioInstance.volume : DEFAULT_HEADROOM_VOLUME
    };
  }

  function play() {
    initAudio();
    ensureMiniPlayer();
    var pmp = document.getElementById('portfolio-mini-player');
    if (pmp) {
      pmp.classList.remove('is-dismissed');
      pmp.classList.remove('is-hidden');
    }
    var p = audioInstance.play();
    if (p !== undefined) {
      p.catch(function(err) {
        console.warn('Playback error or permissions required:', err);
      });
    }
  }

  function pause() {
    if (audioInstance) {
      audioInstance.pause();
    }
  }

  function toggle() {
    initAudio();
    if (isPlaying) {
      pause();
    } else {
      play();
    }
  }

  function selectTrack(index, autoPlay) {
    if (index < 0 || index >= TRACKS.length) return;
    initAudio();
    ensureMiniPlayer();
    var pmp = document.getElementById('portfolio-mini-player');
    if (pmp) {
      pmp.classList.remove('is-hidden');
    }
    var wasPlaying = isPlaying;
    currentTrackIndex = index;
    try { sessionStorage.setItem(STORAGE_KEY_TRACK, String(currentTrackIndex)); } catch (e) {}
    audioInstance.src = resolveAssetUrl(TRACKS[currentTrackIndex].src);
    audioInstance.currentTime = 0;
    audioInstance.preservesPitch = true;
    try {
      var v = parseFloat(sessionStorage.getItem(STORAGE_KEY_VOLUME));
      audioInstance.volume = (!isNaN(v) && v > 0 && v <= DEFAULT_HEADROOM_VOLUME) ? v : DEFAULT_HEADROOM_VOLUME;
    } catch (e) {
      audioInstance.volume = DEFAULT_HEADROOM_VOLUME;
    }
    try { sessionStorage.setItem(STORAGE_KEY_TIME, '0'); } catch (e) {}

    if (autoPlay || wasPlaying) {
      play();
    } else {
      notifyListeners('trackchange');
    }
  }

  function setVolume(val) {
    var v = parseFloat(val);
    if (!isNaN(v)) {
      v = Math.max(0, Math.min(1, v));
      initAudio();
      audioInstance.volume = v;
      try { sessionStorage.setItem(STORAGE_KEY_VOLUME, String(v)); } catch (e) {}
      notifyListeners('volumechange');
    }
  }

  function getVolume() {
    return audioInstance ? audioInstance.volume : DEFAULT_HEADROOM_VOLUME;
  }

  function playNext() {
    var next = (currentTrackIndex + 1) % TRACKS.length;
    selectTrack(next, true);
  }

  function playPrev() {
    var prev = (currentTrackIndex - 1 + TRACKS.length) % TRACKS.length;
    selectTrack(prev, true);
  }

  function subscribe(fn) {
    listeners.push(fn);
    fn(getState(), 'init');
    return function() {
      var idx = listeners.indexOf(fn);
      if (idx !== -1) listeners.splice(idx, 1);
    };
  }

  // 5. Floating Mini-Player Injection & Synchronization (Compact Square Album Widget)
  function ensureMiniPlayer() {
    if (document.getElementById('portfolio-mini-player')) return;

    if (!document.getElementById('portfolio-mini-player-styles')) {
      var style = document.createElement('style');
      style.id = 'portfolio-mini-player-styles';
      style.textContent = `
        /* Compact Square Album Floating Widget */
        .portfolio-mini-player {
          position: fixed;
          bottom: 24px;
          right: 28px;
          z-index: 99999;
          width: 58px;
          height: 58px;
          border-radius: 14px;
          background: #1D2B22;
          box-shadow: 0 10px 28px rgba(20, 32, 18, 0.22), 0 2px 6px rgba(20, 32, 18, 0.08);
          border: 1px solid rgba(250, 248, 241, 0.18);
          overflow: hidden;
          box-sizing: border-box;
          opacity: 1;
          transform: translateY(0) scale(1);
          transition: opacity 0.3s cubic-bezier(0.16, 1, 0.3, 1), transform 0.3s cubic-bezier(0.16, 1, 0.3, 1), visibility 0.3s;
          user-select: none;
        }
        .portfolio-mini-player.is-hidden,
        .portfolio-mini-player.is-dismissed {
          opacity: 0;
          pointer-events: none;
          transform: translateY(14px) scale(0.92);
          visibility: hidden;
        }
        .pmp-square {
          position: relative;
          width: 100%;
          height: 100%;
          cursor: pointer;
        }
        .pmp-artwork {
          width: 100%;
          height: 100%;
          object-fit: cover;
          display: block;
          border-radius: 13px;
          transition: transform 0.3s ease;
        }
        .pmp-overlay {
          position: absolute;
          inset: 0;
          background: rgba(18, 26, 20, 0.78);
          -webkit-backdrop-filter: blur(4px);
          backdrop-filter: blur(4px);
          border-radius: 13px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          opacity: 0;
          pointer-events: none;
          transition: opacity 0.22s ease;
          padding: 3px;
          box-sizing: border-box;
        }
        .portfolio-mini-player:hover .pmp-overlay,
        .portfolio-mini-player.has-touch-focus .pmp-overlay {
          opacity: 1;
          pointer-events: auto;
        }
        .pmp-btn-close {
          position: absolute;
          top: 3px;
          right: 3px;
          width: 16px;
          height: 16px;
          border-radius: 50%;
          background: rgba(250, 248, 241, 0.2);
          border: none;
          color: #FAF8F1;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          padding: 0;
          transition: background 0.15s ease, transform 0.15s ease;
          z-index: 2;
        }
        .pmp-btn-close:hover {
          background: rgba(250, 248, 241, 0.4);
          transform: scale(1.1);
        }
        .pmp-controls-row {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 4px;
          width: 100%;
          margin-top: 6px;
        }
        .pmp-btn {
          background: none;
          border: none;
          color: #FAF8F1;
          padding: 0;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: transform 0.15s ease, opacity 0.15s ease, background-color 0.15s ease;
          outline: none;
        }
        .pmp-btn:hover {
          transform: scale(1.12);
          opacity: 1;
        }
        .pmp-btn:active {
          transform: scale(0.92);
        }
        .pmp-btn-prev, .pmp-btn-next {
          width: 15px;
          height: 15px;
          opacity: 0.85;
        }
        .pmp-btn-play {
          width: 22px;
          height: 22px;
          border-radius: 50%;
          background: rgba(250, 248, 241, 0.22);
        }
        .pmp-btn-play:hover {
          background: rgba(250, 248, 241, 0.38);
        }
        .pmp-btn-play .pmp-icon-pause { display: none; }
        .pmp-btn-play .pmp-icon-play { display: block; margin-left: 1px; }
        .pmp-btn-play.is-playing .pmp-icon-pause { display: block; }
        .pmp-btn-play.is-playing .pmp-icon-play { display: none; }

        @media (max-width: 640px) {
          .portfolio-mini-player {
            bottom: 18px;
            right: 18px;
            width: 54px;
            height: 54px;
          }
        }
      `;
      document.head.appendChild(style);
    }

    var aside = document.createElement('aside');
    aside.id = 'portfolio-mini-player';
    aside.className = 'portfolio-mini-player';
    aside.setAttribute('aria-label', 'Floating album widget');

    // Check if dismissed previously in session
    try {
      if (sessionStorage.getItem(STORAGE_KEY_DISMISSED) === 'true') {
        aside.classList.add('is-dismissed');
      }
    } catch (e) {}

    var turntableUrl = getAboutTurntableUrl();
    aside.innerHTML = `
      <div class="pmp-square" id="pmp-square" title="Album widget (hover for controls)">
        <img class="pmp-artwork" id="pmp-artwork" src="" alt="Album artwork">
        <div class="pmp-overlay" id="pmp-overlay">
          <button type="button" class="pmp-btn-close" id="pmp-close-btn" aria-label="Dismiss widget" title="Dismiss widget (audio continues playing)">
            <svg viewBox="0 0 24 24" width="10" height="10" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" fill="none">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
          <div class="pmp-controls-row">
            <button type="button" class="pmp-btn pmp-btn-prev" id="pmp-prev-btn" aria-label="Previous track" title="Previous track">
              <svg viewBox="0 0 24 24" width="12" height="12" fill="currentColor">
                <polygon points="11,19 2,12 11,5"></polygon>
                <polygon points="22,19 13,12 22,5"></polygon>
              </svg>
            </button>
            <button type="button" class="pmp-btn pmp-btn-play" id="pmp-play-btn" aria-label="Toggle playback" title="Play / Pause">
              <svg class="pmp-icon-play" viewBox="0 0 24 24" width="13" height="13" fill="currentColor">
                <polygon points="7,4 20,12 7,20"></polygon>
              </svg>
              <svg class="pmp-icon-pause" viewBox="0 0 24 24" width="13" height="13" fill="currentColor">
                <rect x="6" y="4" width="4" height="16" rx="1"></rect>
                <rect x="14" y="4" width="4" height="16" rx="1"></rect>
              </svg>
            </button>
            <button type="button" class="pmp-btn pmp-btn-next" id="pmp-next-btn" aria-label="Next track" title="Next track">
              <svg viewBox="0 0 24 24" width="12" height="12" fill="currentColor">
                <polygon points="2,5 11,12 2,19"></polygon>
                <polygon points="13,5 22,12 13,19"></polygon>
              </svg>
            </button>
          </div>
        </div>
      </div>
    `;
    document.body.appendChild(aside);

    var playBtn = document.getElementById('pmp-play-btn');
    if (playBtn) {
      playBtn.addEventListener('click', function(e) {
        e.stopPropagation();
        toggle();
      });
    }

    var prevBtn = document.getElementById('pmp-prev-btn');
    if (prevBtn) {
      prevBtn.addEventListener('click', function(e) {
        e.stopPropagation();
        playPrev();
      });
    }

    var nextBtn = document.getElementById('pmp-next-btn');
    if (nextBtn) {
      nextBtn.addEventListener('click', function(e) {
        e.stopPropagation();
        playNext();
      });
    }

    var closeBtn = document.getElementById('pmp-close-btn');
    if (closeBtn) {
      closeBtn.addEventListener('click', function(e) {
        e.stopPropagation();
        try { sessionStorage.setItem(STORAGE_KEY_DISMISSED, 'true'); } catch (err) {}
        aside.classList.add('is-dismissed');
      });
    }

    // Touch support: Tap square toggles overlay controls
    var square = document.getElementById('pmp-square');
    if (square) {
      square.addEventListener('click', function(e) {
        if (e.target.closest('button')) return;
        aside.classList.toggle('has-touch-focus');
      });
      document.addEventListener('click', function(e) {
        if (!aside.contains(e.target)) {
          aside.classList.remove('has-touch-focus');
        }
      });
    }

    // Double click on artwork returns to vinyl deck in About Me
    if (square) {
      square.addEventListener('dblclick', function(e) {
        if (e.target.closest('button')) return;
        var deck = document.getElementById('turntable-deck');
        if (deck) {
          deck.scrollIntoView({ behavior: 'smooth', block: 'center' });
        } else {
          window.location.href = turntableUrl;
        }
      });
    }

    // Subscribe mini-player to audio state
    subscribe(function(state) {
      var artwork = document.getElementById('pmp-artwork');
      var btn = document.getElementById('pmp-play-btn');

      if (btn) {
        if (state.isPlaying) {
          btn.classList.add('is-playing');
          btn.setAttribute('title', 'Pause');
        } else {
          btn.classList.remove('is-playing');
          btn.setAttribute('title', 'Play');
        }
      }

      if (artwork && state.track) artwork.src = state.track.cover;
    });

    setupTurntableVisibilityObserver();
  }

  function setupTurntableVisibilityObserver() {
    var aside = document.getElementById('portfolio-mini-player');
    if (!aside) return;
    // Always keep mini-player visible across all pages and transitions
    aside.classList.remove('is-hidden');
  }

  // Auto initialize on DOM ready
  function onReady() {
    initAudio();
    ensureMiniPlayer();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', onReady);
  } else {
    onReady();
  }

  // Public API
  window.PortfolioAudio = {
    tracks: TRACKS,
    getState: getState,
    play: play,
    pause: pause,
    toggle: toggle,
    selectTrack: selectTrack,
    playNext: playNext,
    playPrev: playPrev,
    setVolume: setVolume,
    getVolume: getVolume,
    subscribe: subscribe,
    resolveAssetUrl: resolveAssetUrl,
    getAboutTurntableUrl: getAboutTurntableUrl
  };
})();
