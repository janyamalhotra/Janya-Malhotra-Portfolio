/**
 * Global Navigation Scroll-Aware Controller — Janya Malhotra Portfolio
 * Manages visibility of the global navigation bar across the portfolio.
 * - Stays visible near the top during regular browsing.
 * - Smoothly hides when the footer / bottom boundary enters the viewport.
 * - Smoothly restores when scrolling back up above the footer.
 */
(function() {
  'use strict';

  function initGlobalNavigation() {
    function getFooter() {
      return document.getElementById('footer-boundary') ||
             document.querySelector('footer.portfolio-gradient-footer') ||
             document.querySelector('footer#contact') ||
             document.querySelector('footer#footer') ||
             document.getElementById('contact') ||
             document.getElementById('footer') ||
             document.getElementById('other-projects');
    }

    var footer = getFooter();
    if (!footer) return;

    function setNavHidden(hide) {
      var navs = document.querySelectorAll('.case-study-global-nav, .about-nav-container, nav.framer-hcdo59');
      var mobileBars = document.querySelectorAll('.mobile-nav-bar');
      for (var i = 0; i < navs.length; i++) {
        if (hide) {
          navs[i].classList.add('is-hidden');
        } else {
          navs[i].classList.remove('is-hidden');
        }
      }
      for (var j = 0; j < mobileBars.length; j++) {
        if (hide) {
          mobileBars[j].classList.add('is-hidden');
        } else {
          mobileBars[j].classList.remove('is-hidden');
        }
      }
    }

    // Scroll-aware position checker
    function evaluatePosition() {
      var activeFooter = getFooter() || footer;
      if (!activeFooter) return;
      var rect = activeFooter.getBoundingClientRect();
      var winH = window.innerHeight || document.documentElement.clientHeight;
      // When footer approaches within 40px of entering viewport bottom
      if (rect.top < winH + 40 && rect.bottom > 0) {
        setNavHidden(true);
      } else {
        setNavHidden(false);
      }
    }

    // IntersectionObserver for performant edge detection
    if ('IntersectionObserver' in window) {
      var observer = new IntersectionObserver(function(entries) {
        evaluatePosition();
      }, {
        root: null,
        threshold: [0, 0.05, 0.1, 0.2, 0.5, 1.0],
        rootMargin: '0px 0px 40px 0px'
      });

      observer.observe(footer);
    }

    // Throttle scroll checks using requestAnimationFrame for instant responsiveness
    var ticking = false;
    function onScroll() {
      if (!ticking) {
        window.requestAnimationFrame(function() {
          evaluatePosition();
          ticking = false;
        });
        ticking = true;
      }
    }

    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll, { passive: true });

    // Initial check
    evaluatePosition();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initGlobalNavigation);
  } else {
    initGlobalNavigation();
  }
})();
