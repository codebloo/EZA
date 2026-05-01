class SubscriptionSelector extends HTMLElement {
  connectedCallback() {
    this.form = this.closest('form[action*="/cart/add"]');
    this.priceDisplay = this.form?.querySelector('[data-product-price]');
    
    this.addEventListener('change', this.handleChange.bind(this));
    
    // Intercept submit if theme uses AJAX cart that strips selling_plan
    if (this.form) {
      this.form.addEventListener('submit', this.ensureSellingPlan.bind(this));
    }
  }
  
  handleChange(e) {
    if (e.target.name !== 'selling_plan') return;
    if (!this.priceDisplay) return;
    
    const cents = parseInt(e.target.dataset.price, 10);
    this.priceDisplay.textContent = this.formatMoney(cents);
  }
  
  ensureSellingPlan(e) {
    const selected = this.querySelector('input[name="selling_plan"]:checked');
    if (!selected || !selected.value) return; // one-time, no action needed
    
    // If theme JS rebuilds form data, make sure selling_plan is preserved
    let hidden = this.form.querySelector('input[type="hidden"][name="selling_plan"]');
    if (!hidden) {
      hidden = document.createElement('input');
      hidden.type = 'hidden';
      hidden.name = 'selling_plan';
      this.form.appendChild(hidden);
    }
    hidden.value = selected.value;
  }
  
  formatMoney(cents) {
    // Replace with theme's money formatter if available, e.g. window.Shopify.formatMoney
    return '$' + (cents / 100).toFixed(2);
  }
}

customElements.define('subscription-selector', SubscriptionSelector);