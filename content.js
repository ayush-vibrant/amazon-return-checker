// Amazon Return Policy Checker - Content Script

class ReturnPolicyChecker {
    constructor() {
        this.processedProducts = new Set();
        this.init();
    }

    init() {
        console.log('Amazon Return Policy Checker initialized');
        this.checkForProducts();
        
        // Watch for new products being loaded (infinite scroll, etc.)
        this.observeChanges();
    }

    checkForProducts() {
        // Find all product links on the search results page
        const productLinks = document.querySelectorAll('a[href*="/dp/"]');
        
        productLinks.forEach(link => {
            const href = link.getAttribute('href');
            if (href && href.includes('/dp/') && !this.processedProducts.has(href)) {
                this.processedProducts.add(href);
                this.processProduct(link, href);
            }
        });
    }

    processProduct(linkElement, href) {
        // Find the product container
        const productContainer = this.findProductContainer(linkElement);
        if (!productContainer) return;

        // Check if we already added a return policy badge
        if (productContainer.querySelector('.return-policy-badge')) return;

        // Add loading badge
        this.addReturnPolicyBadge(productContainer, 'Loading...', 'loading');

        // Get clean product URL
        const productUrl = this.getCleanProductUrl(href);
        
        // Fetch return policy
        this.fetchReturnPolicy(productUrl)
            .then(returnPolicy => {
                this.updateReturnPolicyBadge(productContainer, returnPolicy);
            })
            .catch(error => {
                console.error('Error fetching return policy:', error);
                this.updateReturnPolicyBadge(productContainer, 'Error');
            });
    }

    findProductContainer(linkElement) {
        // Find the main product container (usually a few levels up)
        let container = linkElement;
        let attempts = 0;
        
        while (container && attempts < 10) {
            if (container.querySelector('h2, h3') && 
                (container.classList.contains('s-result-item') || 
                 container.getAttribute('data-component-type') === 's-search-result')) {
                return container;
            }
            container = container.parentElement;
            attempts++;
        }
        
        // Fallback: find closest container with reasonable size
        container = linkElement;
        attempts = 0;
        while (container && attempts < 5) {
            if (container.offsetHeight > 100) {
                return container;
            }
            container = container.parentElement;
            attempts++;
        }
        
        return null;
    }

    getCleanProductUrl(href) {
        let cleanUrl = href;
        if (href.startsWith('/')) {
            cleanUrl = window.location.origin + href;
        }
        
        // Remove unnecessary parameters for faster loading
        const urlObj = new URL(cleanUrl);
        urlObj.search = '';
        
        return urlObj.toString();
    }

    addReturnPolicyBadge(container, text, status = 'loading') {
        const badge = document.createElement('div');
        badge.className = `return-policy-badge return-policy-${status}`;
        badge.textContent = text;
        badge.setAttribute('data-full-text', text);
        
        // Try to insert near the title
        const title = container.querySelector('h2, h3');
        if (title) {
            title.appendChild(badge);
        } else {
            // Fallback: add to container
            container.style.position = 'relative';
            container.appendChild(badge);
        }
    }

    updateReturnPolicyBadge(container, returnPolicy) {
        const badge = container.querySelector('.return-policy-badge');
        if (!badge) return;

        if (returnPolicy) {
            const { shortText, fullText, type } = this.formatReturnPolicy(returnPolicy);
            badge.textContent = shortText;
            badge.setAttribute('data-full-text', fullText);
            badge.className = `return-policy-badge return-policy-${type}`;
        } else {
            badge.textContent = 'Not Returnable';
            badge.setAttribute('data-full-text', 'This product is not returnable');
            badge.className = 'return-policy-badge return-policy-not-returnable';
        }
    }

    formatReturnPolicy(policyText) {
        // Extract days and type from policy text
        const match = policyText.match(/(\d+)\s*days?\s*(.*)/i);
        
        if (match) {
            const days = match[1];
            const typeText = match[2].trim().toLowerCase();
            
            if (typeText.includes('returnable')) {
                return {
                    shortText: `${days}: Returnable`,
                    fullText: policyText,
                    type: 'returnable'
                };
            } else if (typeText.includes('replacement')) {
                return {
                    shortText: `${days}: Replacement`,
                    fullText: policyText,
                    type: 'replacement'
                };
            }
        }
        
        // Fallback for unrecognized format
        return {
            shortText: 'Unknown',
            fullText: policyText,
            type: 'not-returnable'
        };
    }

    async fetchReturnPolicy(productUrl) {
        try {
            // Use background script to fetch the page to avoid CORS issues
            const response = await chrome.runtime.sendMessage({
                action: 'fetchReturnPolicy',
                url: productUrl
            });
            
            if (response.success) {
                return this.parseReturnPolicy(response.html);
            } else {
                throw new Error(response.error);
            }
        } catch (error) {
            console.error('Fetch error:', error);
            return null;
        }
    }

    parseReturnPolicy(html) {
        // Create a temporary DOM element to parse the HTML
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = html;
        
        // Look for return policy elements
        const returnElements = tempDiv.querySelectorAll('div.icon-content a');
        
        for (const element of returnElements) {
            const text = element.textContent.trim();
            if (text.match(/\d+\s*days.*(Returnable|Replacement)/i)) {
                return text;
            }
        }
        
        return null;
    }

    observeChanges() {
        // Watch for new products being added to the page
        const observer = new MutationObserver((mutations) => {
            let shouldCheck = false;
            
            mutations.forEach((mutation) => {
                if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
                    // Check if new product links were added
                    mutation.addedNodes.forEach(node => {
                        if (node.nodeType === Node.ELEMENT_NODE) {
                            if (node.querySelector && node.querySelector('a[href*="/dp/"]')) {
                                shouldCheck = true;
                            }
                        }
                    });
                }
            });
            
            if (shouldCheck) {
                setTimeout(() => this.checkForProducts(), 1000);
            }
        });
        
        observer.observe(document.body, {
            childList: true,
            subtree: true
        });
    }
}

// Initialize when page is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        new ReturnPolicyChecker();
    });
} else {
    new ReturnPolicyChecker();
}