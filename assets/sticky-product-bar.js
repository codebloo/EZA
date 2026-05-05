// assets/sticky-product-bar.js
//
// Mobile sticky condensed product header for EZ-A (Horizon theme).
//
// Stuck behavior uses position:fixed on the inner bar with a spacer in
// the wrapper to preserve layout. The spacer is measured eagerly on
// init so the bar stays pinned for the entire scroll, not just until
// the section bottoms out.
//
// Header offset is read from a CSS variable (default
// `--header-group-height`, set on :root by Horizon) so we stay in sync
// with the theme's own header sizing — including announcement bar
// state, sticky header collapse, etc. The header element is still
// observed as a *trigger* for re-reading the variable; it is no longer
// the measurement source.

class StickyProductBar extends HTMLElement {
  static MOBILE_QUERY = '(max-width: 749px)';
  static STUCK_CLASS = 'is-stuck';
  static CTA_CLASS = 'show-cta';

  static DEFAULT_TRIGGER_SELECTOR =
    "subscription-selector, .vpv-sub-selector, " +
    "[ref='addToCartButton'], button[name='add'], .product-form__submit";

  static DEFAULT_HEADER_OFFSET_VAR = '--header-group-height';

  constructor() {
    super();
    this.handleShopNowClick = this.handleShopNowClick.bind(this);
    this.handleMediaChange = this.handleMediaChange.bind(this);
    this.handleHeaderResize = this.handleHeaderResize.bind(this);
    this.handleInnerResize = this.handleInnerResize.bind(this);
    this.headerOffset = 0;
    this.naturalHeight = 0;
  }

  connectedCallback() {
    this.mediaQuery = window.matchMedia(StickyProductBar.MOBILE_QUERY);
    this.mediaQuery.addEventListener('change', this.handleMediaChange);
    if (this.mediaQuery.matches) this.init();
  }

  disconnectedCallback() {
    this.mediaQuery?.removeEventListener('change', this.handleMediaChange);
    this.teardown();
  }

  handleMediaChange(e) {
    if (e.matches) this.init();
    else this.teardown();
  }

  init() {
    this.teardown();

    // Reposition into .product-information so we render at the top of
    // the section regardless of where Liquid put us.
    const productInfo = this.closest('.product-information');
    if (productInfo && productInfo.firstElementChild !== this) {
      productInfo.insertBefore(this, productInfo.firstElementChild);
    }

    this.sentinel = this.querySelector('.sticky-product-bar__sentinel');
    this.inner = this.querySelector('.sticky-product-bar__inner');
    this.shopNowBtn = this.querySelector('[data-shop-now]');

    // ---- Capture natural height EAGERLY ----
    // This must happen before any sticky logic runs, otherwise the
    // wrapper has no min-height when stuck and collapses, causing the
    // sentinel to re-enter view and the bar to unstick.
    this.captureNaturalHeight();

    // Re-capture on resize, but only when not stuck (otherwise we'd
    // overwrite the natural height with the condensed-state height).
    if (this.inner && 'ResizeObserver' in window) {
      this.innerResizeObserver = new ResizeObserver(this.handleInnerResize);
      this.innerResizeObserver.observe(this.inner);
    }

    // ---- Header offset ----
    // The actual offset value comes from the CSS variable
    // (--header-group-height by default). The header element is only
    // observed so we know WHEN to re-read it.
    this.headerOffsetVar =
      this.dataset.headerOffsetVar || StickyProductBar.DEFAULT_HEADER_OFFSET_VAR;

    const headerSelector = this.dataset.headerSelector || '#header-component';
    this.headerEl = document.querySelector(headerSelector);

    if (this.headerEl) {
      if ('ResizeObserver' in window) {
        this.headerResizeObserver = new ResizeObserver(this.handleHeaderResize);
        this.headerResizeObserver.observe(this.headerEl);
      }
      this.headerStateObserver = new MutationObserver(this.handleHeaderResize);
      this.headerStateObserver.observe(this.headerEl, {
        attributes: true,
        attributeFilter: ['data-sticky-state', 'data-scroll-direction', 'class', 'style'],
      });
    }
    this.updateHeaderOffset();

    // ---- Inline purchase trigger reference ----
    const triggerSelector =
      this.dataset.atcSelector || StickyProductBar.DEFAULT_TRIGGER_SELECTOR;
    this.inlineTrigger = document.querySelector(triggerSelector);

    // ---- Observer 1: stuck state ----
    this.attachStuckObserver();

    // ---- Observer 2: trigger visibility ----
    if (this.inlineTrigger) {
      this.triggerObserver = new IntersectionObserver(
        ([entry]) => {
          const scrolledPast =
            !entry.isIntersecting && entry.boundingClientRect.top < 0;
          this.toggleCta(scrolledPast);
        },
        { threshold: 0 }
      );
      this.triggerObserver.observe(this.inlineTrigger);
    } else {
      this.toggleCta(false);
      console.warn(
        '[sticky-product-bar] No inline purchase trigger found. ' +
          'Looked for: ' + triggerSelector + '. ' +
          'Update data-atc-selector on the element.'
      );
    }

    if (this.shopNowBtn) {
      this.shopNowBtn.addEventListener('click', this.handleShopNowClick);
    }
  }

  captureNaturalHeight() {
    if (!this.inner) return;
    // Force layout so we get a real measurement even if init runs early.
    const h = this.inner.offsetHeight || this.inner.getBoundingClientRect().height;
    if (h > 0) {
      this.naturalHeight = Math.round(h);
      this.style.setProperty('--bar-natural-height', `${this.naturalHeight}px`);
    } else {
      // Inner not yet laid out (deferred subtree, fonts loading, etc.).
      // Try again on the next frame.
      requestAnimationFrame(() => this.captureNaturalHeight());
    }
  }

  attachStuckObserver() {
    this.stuckObserver?.disconnect();
    if (!this.sentinel) return;

    this.stuckObserver = new IntersectionObserver(
      ([entry]) => {
        this.classList.toggle(
          StickyProductBar.STUCK_CLASS,
          !entry.isIntersecting
        );
      },
      {
        threshold: 0,
        rootMargin: `-${this.headerOffset}px 0px 0px 0px`,
      }
    );
    this.stuckObserver.observe(this.sentinel);
  }

  handleHeaderResize() {
    this.updateHeaderOffset();
  }

  handleInnerResize() {
    // Only re-measure when NOT stuck. When stuck, the inner is in its
    // condensed state and we'd shrink the spacer, breaking the layout.
    if (
      !this.classList.contains(StickyProductBar.STUCK_CLASS) &&
      this.inner
    ) {
      const h = this.inner.offsetHeight;
      if (h > 0) {
        this.naturalHeight = Math.round(h);
        this.style.setProperty('--bar-natural-height', `${this.naturalHeight}px`);
      }
    }
  }

  /**
   * Resolve header offset, in priority order:
   *   1. data-header-offset attribute (manual override, e.g. "70")
   *   2. CSS variable named by data-header-offset-var
   *      (default: --header-group-height, set on :root by Horizon)
   *   3. Header element's bounding rect (last-resort fallback)
   *   4. 0
   */
  resolveHeaderOffset() {
    // 1. Manual override
    const manual = parseFloat(this.dataset.headerOffset);
    if (!Number.isNaN(manual)) return manual;

    // 2. CSS variable
    const varValue = getComputedStyle(document.documentElement)
      .getPropertyValue(this.headerOffsetVar)
      .trim();
    if (varValue) {
      const parsed = parseFloat(varValue);
      if (!Number.isNaN(parsed)) return parsed;
    }

    // 3. Header element fallback
    if (this.headerEl) {
      return this.headerEl.getBoundingClientRect().height;
    }

    // 4. Nothing to go on
    return 0;
  }

  updateHeaderOffset() {
    const offset = Math.round(this.resolveHeaderOffset());
    if (offset === this.headerOffset) return;

    this.headerOffset = offset;
    this.style.setProperty('--sticky-bar-top', `${offset}px`);
    this.attachStuckObserver();
  }

  teardown() {
    this.stuckObserver?.disconnect();
    this.triggerObserver?.disconnect();
    this.headerResizeObserver?.disconnect();
    this.headerStateObserver?.disconnect();
    this.innerResizeObserver?.disconnect();
    this.shopNowBtn?.removeEventListener('click', this.handleShopNowClick);
    this.classList.remove(
      StickyProductBar.STUCK_CLASS,
      StickyProductBar.CTA_CLASS
    );
    this.toggleCta(false);
  }

  toggleCta(show) {
    this.classList.toggle(StickyProductBar.CTA_CLASS, show);
    if (this.shopNowBtn) {
      this.shopNowBtn.setAttribute('aria-hidden', String(!show));
      if (show) this.shopNowBtn.removeAttribute('tabindex');
      else this.shopNowBtn.setAttribute('tabindex', '-1');
    }
  }

  handleShopNowClick(e) {
    e.preventDefault();
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    window.scrollTo({
      top: 0,
      behavior: reduceMotion ? 'auto' : 'smooth',
    });
  }
}

if (!customElements.get('sticky-product-bar')) {
  customElements.define('sticky-product-bar', StickyProductBar);
}