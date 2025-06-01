// Amazon Return Policy Checker - Background Script

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'fetchReturnPolicy') {
        fetchReturnPolicy(request.url)
            .then(result => sendResponse(result))
            .catch(error => sendResponse({ success: false, error: error.message }));
        
        // Return true to indicate we'll respond asynchronously
        return true;
    }
});

async function fetchReturnPolicy(url) {
    try {
        console.log('Fetching return policy for:', url);
        
        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
            }
        });
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const html = await response.text();
        
        return {
            success: true,
            html: html
        };
        
    } catch (error) {
        console.error('Error fetching return policy:', error);
        return {
            success: false,
            error: error.message
        };
    }
}

// Optional: Add rate limiting to prevent too many requests
class RateLimiter {
    constructor(maxRequests = 5, timeWindow = 1000) {
        this.maxRequests = maxRequests;
        this.timeWindow = timeWindow;
        this.requests = [];
    }
    
    canMakeRequest() {
        const now = Date.now();
        // Remove old requests outside the time window
        this.requests = this.requests.filter(time => now - time < this.timeWindow);
        
        if (this.requests.length < this.maxRequests) {
            this.requests.push(now);
            return true;
        }
        
        return false;
    }
}

const rateLimiter = new RateLimiter(3, 2000); // 3 requests per 2 seconds

// Enhanced fetch function with rate limiting
async function fetchReturnPolicyWithRateLimit(url) {
    if (!rateLimiter.canMakeRequest()) {
        // Wait a bit and try again
        await new Promise(resolve => setTimeout(resolve, 2000));
        return fetchReturnPolicy(url);
    }
    
    return fetchReturnPolicy(url);
}