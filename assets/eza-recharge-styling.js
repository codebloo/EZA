(function() {
  const injectStyles = () => {
    const widget = document.querySelector('recharge-subscription-widget');
    if (widget && widget.shadowRoot) {
      const benefits = widget.shadowRoot.querySelector('rc-benefits');
      if (benefits && benefits.shadowRoot) {
        const existing = benefits.shadowRoot.querySelector('#custom-benefits-style');
        if (existing) return;
        
        const style = document.createElement('style');
        style.id = 'custom-benefits-style';
        style.textContent = `
          ul {
            list-style-type: none;
            display: flex;
            flex-direction: row;
            align-items: center;
            gap: 8px;
            padding: 0;
            margin: 0;
          }
          ul li {
            font-size: 12px;
            font-family: "Helvetica Neue";
            font-style: normal;
            font-weight: 500;
            line-height: normal;
            margin-bottom: 0 !important;
            padding: 0 6px;
            text-align: center;
          }
          ul li:before {
            background-color: #202020;
            border-radius: 999px;
            height: 4px;
            mask-image: none;
            mask-size: unset;
            mask-position: unset;
            top: 50%;
            transform: translate(-50%);
            width: 4px;
          }
          ul li p {
            margin: 0;
            padding: 0;
          }
          ul li:first-of-type {
            padding-left: 0;
          }
          ul li:first-of-type:before {
            display: none;
          }
        `;
        benefits.shadowRoot.appendChild(style);
      }
    }
  };

  const startObserving = () => {
    const widget = document.querySelector('recharge-subscription-widget');
    if (widget && widget.shadowRoot) {
      injectStyles();
      
      // Watch the widget's shadow root for changes
      const observer = new MutationObserver(() => {
        injectStyles();
      });
      
      observer.observe(widget.shadowRoot, { 
        childList: true, 
        subtree: true 
      });
      
      return true;
    }
    return false;
  };

  if (!startObserving()) {
    const initObserver = new MutationObserver(() => {
      if (startObserving()) initObserver.disconnect();
    });
    initObserver.observe(document.body, { childList: true, subtree: true });
  }
})();