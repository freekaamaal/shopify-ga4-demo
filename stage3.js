console.log("Stage 3 loaded: Thank you page tracking active");

gtag('event', 'purchase', {
  transaction_id: '{{ORDER_ID}}',
  value: {{TOTAL_AMOUNT}},
  currency: 'INR'
});
