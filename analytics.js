/**
 * Vercel Web Analytics Utility
 * 
 * This file provides helper functions for custom event tracking using @vercel/analytics.
 * 
 * Web Analytics page views are automatically tracked via the script tag in HTML files:
 * <script defer src="/_vercel/insights/script.js"></script>
 * 
 * This utility allows you to track custom events throughout your site.
 * 
 * Usage:
 * <script src="/analytics.js"></script>
 * <script>
 *   // Track a button click
 *   trackEvent('Button Click', { button: 'CTA', page: 'home' });
 *   
 *   // Track a form submission
 *   trackEvent('Form Submit', { form: 'contact', success: true });
 * </script>
 */

/**
 * Track a custom event
 * @param {string} name - The name of the event (e.g., 'Button Click', 'Form Submit')
 * @param {Object} [properties] - Optional properties (string, number, boolean, or null values)
 */
function trackEvent(name, properties = {}) {
  // Check if Vercel Analytics is loaded
  if (typeof window.va === 'function') {
    window.va('event', { name, data: properties });
  } else if (typeof window.vaq === 'object') {
    // Fallback to queue if analytics hasn't loaded yet
    window.vaq = window.vaq || [];
    window.vaq.push(['event', { name, data: properties }]);
  } else {
    console.warn('Vercel Analytics is not loaded. Event not tracked:', name);
  }
}

/**
 * Track a custom page view
 * Useful for single-page applications or custom routing
 * @param {string} path - The path to track (e.g., '/custom-page')
 */
function trackPageView(path) {
  if (typeof window.va === 'function') {
    window.va('pageview', { path });
  } else {
    console.warn('Vercel Analytics is not loaded. Page view not tracked:', path);
  }
}

// Make functions available globally
window.trackEvent = trackEvent;
window.trackPageView = trackPageView;
