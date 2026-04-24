(function() {
  let lastValue = null;
  
  setInterval(() => {
    const input = document.querySelector('input[name="selling_plan"]');
    const btn = document.querySelector('.add-to-cart-text__content');
    const currentValue = input?.value || '';
    
    if (btn && currentValue !== lastValue) {
      lastValue = currentValue;
      btn.textContent = currentValue ? 'Subscribe' : 'Buy Now';
    }
  }, 100);
})();