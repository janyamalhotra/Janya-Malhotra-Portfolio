/**
 * Universal Portfolio Image Lightbox
 * Features:
 * - Click-to-expand on every carousel slide and standalone project image
 * - Maintains aspect ratio without cropping or distortion
 * - Close button, backdrop click, Escape key
 * - Previous/Next arrow buttons and keyboard arrow navigation
 * - Synchronizes with underlying carousel slides and title tabs
 * - Mobile responsive with touch swipe gestures
 */

(function () {
  'use strict';

  var lightboxEl = null;
  var imgEl = null;
  var titleEl = null;
  var subtitleEl = null;
  var counterEl = null;
  var prevBtn = null;
  var nextBtn = null;
  var closeBtn = null;

  var currentItems = [];
  var currentIndex = 0;
  var isOpen = false;

  // Touch handling
  var touchStartX = 0;
  var touchStartY = 0;

  function createLightboxDOM() {
    if (document.getElementById('portfolio-universal-lightbox')) {
      lightboxEl = document.getElementById('portfolio-universal-lightbox');
      imgEl = lightboxEl.querySelector('.portfolio-lightbox-img');
      titleEl = lightboxEl.querySelector('.portfolio-lightbox-title');
      subtitleEl = lightboxEl.querySelector('.portfolio-lightbox-subtitle');
      counterEl = lightboxEl.querySelector('.portfolio-lightbox-counter');
      prevBtn = lightboxEl.querySelector('.portfolio-lightbox-prev');
      nextBtn = lightboxEl.querySelector('.portfolio-lightbox-next');
      closeBtn = lightboxEl.querySelector('.portfolio-lightbox-close');
      return;
    }

    lightboxEl = document.createElement('div');
    lightboxEl.id = 'portfolio-universal-lightbox';
    lightboxEl.className = 'portfolio-lightbox';
    lightboxEl.setAttribute('role', 'dialog');
    lightboxEl.setAttribute('aria-modal', 'true');
    lightboxEl.setAttribute('aria-label', 'Enlarged image viewer');

    lightboxEl.innerHTML = [
      '<button type="button" class="portfolio-lightbox-close" aria-label="Close enlarged view">',
      '  <svg viewBox="0 0 24 24" fill="none"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>',
      '</button>',
      '<button type="button" class="portfolio-lightbox-nav portfolio-lightbox-prev" aria-label="Previous image">',
      '  <svg viewBox="0 0 24 24" fill="none"><polyline points="15 18 9 12 15 6"></polyline></svg>',
      '</button>',
      '<button type="button" class="portfolio-lightbox-nav portfolio-lightbox-next" aria-label="Next image">',
      '  <svg viewBox="0 0 24 24" fill="none"><polyline points="9 18 15 12 9 6"></polyline></svg>',
      '</button>',
      '<div class="portfolio-lightbox-container">',
      '  <div class="portfolio-lightbox-frame">',
      '    <img class="portfolio-lightbox-img" src="" alt="">',
      '  </div>',
      '  <div class="portfolio-lightbox-caption">',
      '    <h3 class="portfolio-lightbox-title"></h3>',
      '    <p class="portfolio-lightbox-subtitle"></p>',
      '    <span class="portfolio-lightbox-counter"></span>',
      '  </div>',
      '</div>'
    ].join('');

    document.body.appendChild(lightboxEl);

    imgEl = lightboxEl.querySelector('.portfolio-lightbox-img');
    titleEl = lightboxEl.querySelector('.portfolio-lightbox-title');
    subtitleEl = lightboxEl.querySelector('.portfolio-lightbox-subtitle');
    counterEl = lightboxEl.querySelector('.portfolio-lightbox-counter');
    prevBtn = lightboxEl.querySelector('.portfolio-lightbox-prev');
    nextBtn = lightboxEl.querySelector('.portfolio-lightbox-next');
    closeBtn = lightboxEl.querySelector('.portfolio-lightbox-close');

    // Close button click
    closeBtn.addEventListener('click', function (e) {
      e.stopPropagation();
      closeLightbox();
    });

    // Previous & Next navigation
    prevBtn.addEventListener('click', function (e) {
      e.stopPropagation();
      prevSlide();
    });

    nextBtn.addEventListener('click', function (e) {
      e.stopPropagation();
      nextSlide();
    });

    // Click outside image closes lightbox
    lightboxEl.addEventListener('click', function (e) {
      if (
        e.target === lightboxEl ||
        e.target.classList.contains('portfolio-lightbox-container') ||
        e.target.classList.contains('portfolio-lightbox-frame')
      ) {
        closeLightbox();
      }
    });

    // Keyboard controls
    document.addEventListener('keydown', function (e) {
      if (!isOpen) return;
      if (e.key === 'Escape') {
        closeLightbox();
      } else if (e.key === 'ArrowLeft') {
        if (currentItems.length > 1) prevSlide();
      } else if (e.key === 'ArrowRight') {
        if (currentItems.length > 1) nextSlide();
      }
    });

    // Touch Swipe gestures
    lightboxEl.addEventListener('touchstart', function (e) {
      if (e.touches && e.touches.length > 0) {
        touchStartX = e.touches[0].clientX;
        touchStartY = e.touches[0].clientY;
      }
    }, { passive: true });

    lightboxEl.addEventListener('touchend', function (e) {
      if (!e.changedTouches || e.changedTouches.length === 0) return;
      var diffX = touchStartX - e.changedTouches[0].clientX;
      var diffY = touchStartY - e.changedTouches[0].clientY;

      if (Math.abs(diffX) > 45 && Math.abs(diffX) > Math.abs(diffY)) {
        if (diffX > 0) {
          nextSlide();
        } else {
          prevSlide();
        }
      } else if (diffY > 80 && Math.abs(diffY) > Math.abs(diffX)) {
        closeLightbox();
      }
    }, { passive: true });
  }

  function renderCurrentItem() {
    if (!currentItems || currentItems.length === 0) return;
    var item = currentItems[currentIndex];
    if (!item) return;

    imgEl.classList.add('is-switching');
    setTimeout(function () {
      imgEl.src = item.src;
      imgEl.alt = item.alt || item.title || 'Enlarged project image';
      imgEl.classList.remove('is-switching');
    }, 50);

    if (item.title) {
      titleEl.textContent = item.title;
      titleEl.style.display = 'block';
    } else {
      titleEl.textContent = '';
      titleEl.style.display = 'none';
    }

    if (item.subtitle) {
      subtitleEl.textContent = item.subtitle;
      subtitleEl.style.display = 'block';
    } else {
      subtitleEl.textContent = '';
      subtitleEl.style.display = 'none';
    }

    if (currentItems.length > 1) {
      var curStr = String(currentIndex + 1).padStart(2, '0');
      var totStr = String(currentItems.length).padStart(2, '0');
      counterEl.textContent = curStr + ' / ' + totStr;
      counterEl.style.display = 'block';

      prevBtn.classList.remove('is-hidden');
      nextBtn.classList.remove('is-hidden');
    } else {
      counterEl.textContent = '';
      counterEl.style.display = 'none';

      prevBtn.classList.add('is-hidden');
      nextBtn.classList.add('is-hidden');
    }

    // Synchronize underlying carousel if this item belongs to one
    if (item.carouselEl) {
      syncCarousel(item.carouselEl, item.slideIndex !== undefined ? item.slideIndex : currentIndex);
    }
  }

  function syncCarousel(carouselEl, targetIndex) {
    if (!carouselEl) return;

    // 1. If tabbed carousel, trigger corresponding tab button click
    var tabs = carouselEl.querySelectorAll('.process-tab-btn, .tab-btn');
    if (tabs && tabs[targetIndex]) {
      // Check if already active
      if (!tabs[targetIndex].classList.contains('is-active')) {
        tabs[targetIndex].click();
        return;
      }
    }

    // 2. If rulebook document viewer
    var rulebookSlides = carouselEl.querySelectorAll('.rulebook-slide');
    if (rulebookSlides && rulebookSlides.length > 0) {
      var track = carouselEl.querySelector('.rulebook-track');
      if (track) {
        track.style.transform = 'translateX(-' + (targetIndex * 100) + '%)';
        rulebookSlides.forEach(function (s, idx) {
          if (idx === targetIndex) {
            s.classList.add('is-active');
            s.setAttribute('aria-hidden', 'false');
          } else {
            s.classList.remove('is-active');
            s.setAttribute('aria-hidden', 'true');
          }
        });
        var counter = carouselEl.querySelector('.rulebook-counter');
        if (counter) {
          counter.textContent = String(targetIndex + 1).padStart(2, '0') + ' / ' + String(rulebookSlides.length).padStart(2, '0');
        }
      }
      return;
    }

    // 3. If standard carousel with track and slides
    var track = carouselEl.querySelector('.carousel-track, #strategy-carousel-track');
    var slides = carouselEl.querySelectorAll('.carousel-slide');
    if (track && slides && slides.length > 0) {
      track.style.transform = 'translateX(-' + (targetIndex * 100) + '%)';
      slides.forEach(function (s, idx) {
        if (idx === targetIndex) {
          s.classList.add('is-active');
          s.setAttribute('aria-hidden', 'false');
        } else {
          s.classList.remove('is-active');
          s.setAttribute('aria-hidden', 'true');
        }
      });
      var counter = carouselEl.querySelector('.carousel-counter, #strategy-carousel-counter');
      if (counter) {
        counter.textContent = String(targetIndex + 1).padStart(2, '0') + ' / ' + String(slides.length).padStart(2, '0');
      }
    }
  }

  function openLightbox(items, startIndex) {
    if (!items || items.length === 0) return;
    createLightboxDOM();

    currentItems = items;
    currentIndex = Math.max(0, Math.min(items.length - 1, startIndex || 0));
    isOpen = true;

    renderCurrentItem();

    lightboxEl.classList.add('is-open');
    document.body.style.overflow = 'hidden';
  }

  function closeLightbox() {
    if (!isOpen) return;
    isOpen = false;
    if (lightboxEl) {
      lightboxEl.classList.remove('is-open');
    }
    document.body.style.overflow = '';
  }

  function nextSlide() {
    if (currentItems.length <= 1) return;
    currentIndex = (currentIndex + 1) % currentItems.length;
    renderCurrentItem();
  }

  function prevSlide() {
    if (currentItems.length <= 1) return;
    currentIndex = (currentIndex - 1 + currentItems.length) % currentItems.length;
    renderCurrentItem();
  }

  // Find all items in a carousel container
  function getCarouselItems(carouselEl) {
    var items = [];
    // Identify slides
    var slides = carouselEl.querySelectorAll('.carousel-slide, .rulebook-slide, .bts-slide, .episode-carousel-slide');
    if (slides && slides.length > 0) {
      slides.forEach(function (slide, idx) {
        var img = slide.querySelector('img');
        if (!img) return;

        var title = '';
        var subtitle = '';

        var titleEl = slide.querySelector('.carousel-slide-title, .rulebook-slide-title, h3, h4');
        if (titleEl) {
          title = titleEl.textContent.trim();
        } else if (img.alt) {
          title = img.alt;
        }

        var descEl = slide.querySelector('.carousel-slide-desc, .rulebook-slide-desc, p');
        if (descEl) {
          subtitle = descEl.textContent.trim();
        }

        items.push({
          src: img.currentSrc || img.src,
          alt: img.alt || title,
          title: title,
          subtitle: subtitle,
          carouselEl: carouselEl,
          slideIndex: idx
        });
      });
    }
    return items;
  }

  // Check if an image is eligible for lightbox expansion
  function isEligibleImage(img) {
    if (!img) return false;

    // Explicit opt-out
    if (img.getAttribute('data-no-lightbox') === 'true' || img.classList.contains('no-lightbox')) {
      return false;
    }

    // Exclude images inside navigational links (like "other projects" cards)
    if (img.closest('a') && !img.closest('.carousel-slide-image-wrap')) {
      return false;
    }

    // Exclude animated dragonfly parts, decorative ornaments, tiny icons, vinyl record
    if (
      img.closest('.dragonfly-assembly') ||
      img.closest('.decorative-ornament') ||
      img.closest('.about-ornament-art') ||
      img.closest('.vinyl-player') ||
      img.closest('.about-tools-item') ||
      img.closest('.tools-software-grid') ||
      img.closest('.mobile-nav-bar') ||
      img.closest('.about-nav-container')
    ) {
      return false;
    }

    // Exclude tiny icons
    var w = img.naturalWidth || img.width || img.offsetWidth;
    var h = img.naturalHeight || img.height || img.offsetHeight;
    if (w > 0 && h > 0 && w < 60 && h < 60) {
      return false;
    }

    return true;
  }

  function handleImageClick(e) {
    var target = e.target;

    // Check if clicked element or its container is an image or zoom hint
    var zoomBtn = target.closest('.carousel-slide-zoom-hint, .portfolio-slide-zoom-badge, #strategy-zoom-btn');
    var img = null;

    if (zoomBtn) {
      e.preventDefault();
      e.stopPropagation();
      var wrap = zoomBtn.closest('.carousel-slide-image-wrap, .carousel-slide');
      if (wrap) img = wrap.querySelector('img');
    } else {
      img = target.closest('img');
    }

    if (!img || !isEligibleImage(img)) return;

    // Prevent default and stop propagation so parent links or clicks don't fire
    e.preventDefault();
    e.stopPropagation();

    // Check if image belongs to a carousel
    var carouselEl = img.closest('.case-study-carousel, .tabbed-carousel, .rulebook-document-viewer, .bts-carousel');
    if (carouselEl) {
      var items = getCarouselItems(carouselEl);
      if (items.length > 0) {
        // Find which slide this is
        var currentSrc = img.currentSrc || img.src;
        var foundIdx = 0;
        for (var i = 0; i < items.length; i++) {
          if (items[i].src === currentSrc) {
            foundIdx = i;
            break;
          }
        }
        // Fallback: check slide element data-index
        var slideEl = img.closest('.carousel-slide, .rulebook-slide, .bts-slide');
        if (slideEl && slideEl.dataset && slideEl.dataset.index !== undefined) {
          foundIdx = parseInt(slideEl.dataset.index, 10) || foundIdx;
        }

        openLightbox(items, foundIdx);
        return;
      }
    }

    // Standalone image
    var title = img.alt || '';
    var figcaption = img.closest('figure') ? img.closest('figure').querySelector('figcaption') : null;
    var subtitle = figcaption ? figcaption.textContent.trim() : '';

    var standaloneItem = {
      src: img.currentSrc || img.src,
      alt: img.alt || title,
      title: title,
      subtitle: subtitle,
      carouselEl: null,
      slideIndex: 0
    };

    openLightbox([standaloneItem], 0);
  }

  // Initialize
  function init() {
    createLightboxDOM();

    // Mark eligible images with styling class
    var allImages = document.querySelectorAll('img');
    allImages.forEach(function (img) {
      if (isEligibleImage(img)) {
        img.classList.add('portfolio-expandable');
      }
    });

    // Delegate click listener on document
    document.addEventListener('click', handleImageClick, true);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  // Expose global API
  window.PortfolioLightbox = {
    open: openLightbox,
    close: closeLightbox,
    next: nextSlide,
    prev: prevSlide
  };
})();
