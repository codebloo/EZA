// assets/sticky-product-bar.js

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
    this.teardown();

    this.sentinel = this.querySelector('.sticky-product-bar__sentinel');
    this.shopNowBtn = this.querySelector('[data-shop-now]');

    // ---- Header offset ----
    const headerSelector =
      this.dataset.headerSelector ||
      'header[role="banner"], header.header, .header-component, #header';
    this.headerEl = document.querySelector(headerSelector);

    if (this.headerEl && 'ResizeObserver' in window) {
      this.headerResizeObserver = new ResizeObserver(this.handleHeaderResize);
      this.headerResizeObserver.observe(this.headerEl);
    }
    this.updateHeaderOffset();

    // ---- Inline ATC reference ----
    const atcSelector =
      this.dataset.atcSelector ||
      "[ref='addToCartButton'], button[name='add'], .product-form__submit";
    this.inlineAtc = document.querySelector(atcSelector);

    // ---- Observer 1: stuck state (built in attachStuckObserver) ----
    this.attachStuckObserver();

    // ---- Observer 2: inline ATC ----
    if (this.inl