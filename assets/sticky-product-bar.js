// assets/sticky-product-bar.js
//
// Mobile sticky condensed product header for EZ-A (Horizon theme).
//
// Stuck behavior uses position:fixed on the inner bar (with a spacer
// in the wrapper to preserve layout) instead of position:sticky, so
// the bar stays pinned indefinitely once stuck — it doesn't unstick
// at the bottom of .product-information.

class StickyProductBar extends HTMLElement {
  static MOBILE_QUERY = '(max-width: 749px)';
  static STUCK_CLASS = 'is-stuck';
  static CTA_CLASS = 'show-cta';

  constructor() {
    super();
    this.handleShopNowClick = this.handleShopNowClick.bind(this);
    this.handleMediaChange = this.handleMediaChange.bind(this);
    this.handleHeaderResize = this.handleHeaderResize.bind(this);
    this.handleInnerResize = this.handleInnerResize.bind(this);
    this.headerOffset = 0;
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

    // Reposition into .product-information so we render at the top of the
    // section regardless of where Liquid put us.
    const productInfo = this.closest('.product-information');
    if (productInfo && productInfo.firstElementChild !== this) {
      productInfo.insertBefore(this, productInfo.firstElementChild);
    }

    this.sentinel = this.querySelector('.sticky-product-bar__sentinel');
    this.inner = this.querySelector('.sticky-product-bar__inner');
    this.shopNowBtn = this.querySelector('[data-shop-now]');

    // ---- Track inner's natural height (used as wrapper's min-height when stuck) ----
    if (this.inner && 'ResizeObserver' in window) {
      this.innerResizeObserver = new ResizeObserver(this.handleInnerResize);
      this.innerResizeObserver.observe(this.inner);
    }

    // ---- Header offset ----
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
        attributeFilter: ['data-sticky-state', 'data-scroll-direction', 'class'],
      });
    }
    this.updateHeaderOffset();

    // ---- Inline ATC reference ----
    const atcSelector =
      this.dataset.atcSelector ||
      "[ref='addToCartButton'], button[name='add'], .product-form__submit";
    this.inlineAtc = document.querySelector(atcSelector);

    // ---- Observer 1: stuck state ----
    this.attachStuckObserver();

    // ---- Observer 2: ATC visibility ----
    if (this.inlineAtc) {
      this.atcObserver = new IntersectionObserver(
        ([entry]) => {
          const scrolledPast =
            !entry.isIntersecting && entry.boundingClientRect.top < 0;
          this.toggleCta(scrolledPast);
        },
        { threshold: 0 }
      );
      this.atcObserver.observe(this.inlineAtc);
    } else {
      this.toggleCta(false);
      console.warn(
        '[sticky-product-bar] No inline add-to-cart button found. ' +
          'Update data-atc-selector on the element.'
      );
    }

    if (this.shopNowBtn) {
      this.shopNowBtn.addEventListener('click', this.handleShopNowClick);
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
    // Only capture natural height when NOT stuck — otherwise we'd record
    // the condensed-state height as the spacer size and content below
    // would shift up when the bar pinned.
    if (!this.classList.contains(StickyProductBar.STUCK_CLASS) && this.inner) {
      const h = this.inner.offsetHeight;
      if (h > 0) {
        this.style.setProperty('--bar-natural-height', `${h}px`);
      }
    }
  }

  updateHeaderOffset() {
    let offset = parseInt(this.dataset.headerOffset, 10);
    if (Number.isNaN(offset)) {
      offset = this.headerEl
        ? Math.round(this.headerEl.getBoundingClientRect().height)
        : 0;
    }
    if (offset === this.headerOffset) return;

    this.headerOffset = offset;
    this.style.setProperty('--sticky-bar-top', `${offset}px`);
    this.attachStuckObserver();
  }

  teardown() {
    this.stuckObserver?.disconnect();
    this.atcObserver?.disconnect();
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