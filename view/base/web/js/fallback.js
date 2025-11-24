/**
 * Copyright (C) 2023 Pixel Développement
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

/**
 * Fallback for themes without Knockout.js (e.g., Hyvä Theme)
 * This script only activates if Knockout.js is not available or fails to render
 */
(function() {
    'use strict';
    
    /**
     * Initialize fallback for a specific container
     * 
     * @param {string} elementId - The ID of the container element
     */
    function initFallback(elementId) {
        const container = document.getElementById(elementId);
        const fallbackContainer = document.getElementById('cf-turnstile-fallback-' + elementId);
        
        if (!container || !fallbackContainer) {
            return;
        }
        
        // Check if Knockout.js is available
        function isKnockoutAvailable() {
            // Check if ko is defined globally or if Magento UI components are available
            return typeof window.ko !== 'undefined' || 
                   (typeof window.require !== 'undefined' && window.require.specified && window.require.specified('ko'));
        }
        
        // Check if Knockout has rendered the widget
        function hasKnockoutRendered() {
            // Look for the widget rendered by Knockout (it should have a cf-turnstile class but not our fallback ID)
            const koWidget = container.querySelector('.cf-turnstile:not([id*="cf-turnstile-fallback-"])');
            // Also check if there's a cf-turnstile-response input (which means the widget was rendered)
            const form = container.closest('form');
            const hasResponseInput = form && form.querySelector('input[name="cf-turnstile-response"]');
            return koWidget !== null || hasResponseInput !== null;
        }
        
        // Initialize fallback after checking if Knockout is working
        function init() {
            // Only use fallback if Knockout is not available or didn't render
            if (isKnockoutAvailable()) {
                // Knockout is available, wait a bit to see if it renders
                setTimeout(function() {
                    if (!hasKnockoutRendered()) {
                        // Knockout is available but didn't render, use fallback
                        activateFallback();
                    }
                }, 1000); // Wait 1 second for Knockout to initialize and render
            } else {
                // Knockout is not available, use fallback immediately
                activateFallback();
            }
        }
        
        // Activate the fallback widget
        function activateFallback() {
            // Make sure we don't activate if Knockout already rendered
            if (hasKnockoutRendered()) {
                return;
            }
            
            fallbackContainer.style.display = 'block';
            
            // Configuration from data attributes
            const config = {
                sitekey: container.getAttribute('data-sitekey'),
                theme: container.getAttribute('data-theme') || 'auto',
                size: container.getAttribute('data-size') || 'normal',
                action: container.getAttribute('data-action')
            };
            
            // Load Cloudflare Turnstile script if not already loaded
            function loadTurnstileScript() {
                if (window.turnstile) {
                    renderWidget();
                    return;
                }
                
                // Check if script is already being loaded
                if (document.querySelector('script[src*="challenges.cloudflare.com/turnstile"]')) {
                    // Wait for script to load
                    const checkInterval = setInterval(function() {
                        if (window.turnstile) {
                            clearInterval(checkInterval);
                            renderWidget();
                        }
                    }, 100);
                    
                    // Timeout after 10 seconds
                    setTimeout(function() {
                        clearInterval(checkInterval);
                        if (!window.turnstile) {
                            console.error('Cloudflare Turnstile: Script failed to load');
                            fallbackContainer.innerText = 'Unable to load security verification. Please refresh the page.';
                        }
                    }, 10000);
                    
                    return;
                }
                
                // Load the script
                const script = document.createElement('script');
                script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js';
                script.async = true;
                script.defer = true;
                script.onload = function() {
                    renderWidget();
                };
                script.onerror = function() {
                    console.error('Cloudflare Turnstile: Failed to load script');
                    fallbackContainer.innerText = 'Unable to load security verification. Please refresh the page.';
                };
                document.head.appendChild(script);
            }
            
            // Render the widget
            function renderWidget() {
                if (!window.turnstile || !window.turnstile.render) {
                    console.error('Cloudflare Turnstile: turnstile object not available');
                    fallbackContainer.innerText = 'Unable to initialize security verification.';
                    return;
                }
                
                // Double check that Knockout didn't render in the meantime
                if (hasKnockoutRendered()) {
                    fallbackContainer.style.display = 'none';
                    return;
                }
                
                try {
                    const widgetId = window.turnstile.render(fallbackContainer, {
                        sitekey: config.sitekey,
                        theme: config.theme,
                        size: config.size,
                        action: config.action
                    });
                    
                    if (typeof widgetId === 'undefined') {
                        console.error('Cloudflare Turnstile: Failed to render widget');
                        fallbackContainer.innerText = 'Unable to secure the form.';
                    } else {
                        // Store widget ID for potential reset
                        fallbackContainer.setAttribute('data-widget-id', widgetId);
                    }
                } catch (error) {
                    console.error('Cloudflare Turnstile: Error rendering widget', error);
                    fallbackContainer.innerText = 'Unable to secure the form.';
                }
            }
            
            // Initialize when DOM is ready
            if (document.readyState === 'loading') {
                document.addEventListener('DOMContentLoaded', loadTurnstileScript);
            } else {
                // DOM is already ready
                loadTurnstileScript();
            }
        }
        
        // Start checking after DOM is ready
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', init);
        } else {
            init();
        }
    }
    
    // Auto-initialize all containers with class 'cloudflare-turnstile' that have data attributes
    function autoInit() {
        const containers = document.querySelectorAll('.cloudflare-turnstile[data-sitekey]');
        containers.forEach(function(container) {
            if (container.id) {
                initFallback(container.id);
            }
        });
    }
    
    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', autoInit);
    } else {
        autoInit();
    }
    
    // Export function for manual initialization if needed
    window.CloudflareTurnstileFallback = {
        init: initFallback
    };
})();

