// assets/sticky-product-bar.js

class StickyProductBar extends HTMLElement {
  static MOBILE_QUERY = '(max-width: 749px)';
  static STUCK_CLASS = 'is-stuck';
  static CTA_CLASS = 'show-cta';

  constructor() {
    super();
    this.handleShopNowClick = this.handleShopNowClick.bind(this);
    this.handleMediaChange = this.handleMediaChange.bind(this);
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
    this.teardown(); // safe to call repeatedly

    this.sentinel = this.querySelector('.sticky-product-bar__sentinel');
    this.shopNowBtn = this.querySelector('[data-shop-now]');

    const atcSelector =
      this.dataset.atcSelector ||
      "[ref='addToCartButton'], button[name='add'], .product-form__submit";
    this.inlineAtc = document.querySelector(atcSelector);

    // Observer 1: stuck state
    if (this.sentinel) {
      this.stuckObserver = new IntersectionObserver(
        ([entry]) => {
          this.classList.toggle(
            StickyProductBar.STUCK_CLASS,
            !entry.isIntersecting
          );
        },
        { threshold: 0 }
      );
      this.stuckObserver.observe(this.sentinel);
    }

    // Observer 2: inline ATC visibility — only show CTA when ATC is ABOVE
    // viewport (already scrolled past). When ATC is below viewport (not yet
    // reached), keep CTA hidden.
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
      // No ATC found — hide CTA permanently rather than show it everywhere.
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

  teardown() {
    this.stuckObserver?.disconnect();
    this.atcObserver?.disconnect();
    this.shopNowBtn?.removeEventListener('click', this.handleShopNowClick);
    this.classList.remove(StickyProductBar.STUCK_CLASS, StickyProductBar.CTA_CLASS);
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