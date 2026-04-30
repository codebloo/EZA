// assets/sticky-product-bar.js
//
// Mobile sticky condensed product header for EZ-A (Horizon theme).
//
// Behavior:
//   1. Renders inside <main-product>, auto-repositions itself to be the
//      first child of .product-information so position:sticky has the full
//      section to grip against.
//   2. Sticks below the site header using --sticky-bar-top, which is set
//      from data-header-offset (default 70px) or measured live from the
//      element matching data-header-selector if no offset is provided.
//   3. Toggles 'is-stuck' class via a sentinel + IntersectionObserver
//      (drives condense + drop shadow).
//   4. Toggles 'show-cta' class via a second IntersectionObserver on the
//      inline ATC button — Shop Now fades in only after ATC is scrolled
//      past viewport top.
//   5. Shop Now click scrolls the page to the top.

class StickyProductBar extends HTMLElement {
  static MOBILE_QUERY = '(max-width: 749px)';
  static STUCK_CLASS = 'is-stuck';
  static CTA_CLASS = 'show-cta';

  constructor() {
    super();
    this.handleShopNowClick = this.handleShopNowClick.bind(this);
    this.handleMediaChange = this.handleMediaChange.bind(this);
    this.handleHeaderResize = this.handleHeaderResize.bind(this);
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
    this.teardown(); // safe to call repeatedly

    // ---- Reposition into .product-information if we're not already first ----
    // Liquid may render this snippet anywhere within the section; sticky
    // positioning needs us to be the first child so we have full height to grip.
    const productInfo = this.closest('.product-information');
    if (productInfo && productInfo.firstElementChild !== this) {
      productInfo.insertBefore(this, productInfo.firstElementChild);
    }

    this.sentinel = this.querySelector('.sticky-product-bar__sentinel');
    this.shopNowBtn = this.querySelector('[data-shop-now]');

    // ---- Header offset ----
    const headerSelector = this.dataset.headerSelector || '#header-component';
    this.headerEl = document.querySelector(headerSelector);

    if (this.headerEl) {
      if ('ResizeObserver' in window) {
        this.headerResizeObserver = new ResizeObserver(this.handleHeaderResize);
        this.headerResizeObserver.observe(this.headerEl);
      }
      // Watch sticky state changes (Horizon toggles data-sticky-state on scroll
      // direction). If it ever unsticks/re-sticks, we want to re-measure.
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

    // ---- Observer 1: stuck state (rebuilt on header offset changes) ----
    this.attachStuckObserver();

    // ---- Observer 2