// Amazon Return Policy Checker - Popup Script

document.addEventListener('DOMContentLoaded', function() {
    const statusDiv = document.getElementById('status');
    const statusText = document.getElementById('status-text');
    const toggleBtn = document.getElementById('toggle-btn');
    
    // Check if we're on an Amazon page
    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
        const currentTab = tabs[0];
        const isAmazonPage = currentTab.url.includes('amazon.');
        const isSearchPage = currentTab.url.includes('/s?') || currentTab.url.includes('/s/');
        
        updateStatus(isAmazonPage, isSearchPage);
    });
    
    function updateStatus(isAmazonPage, isSearchPage) {
        if (isSearchPage) {
            statusDiv.className = 'status status-active';
            statusText.textContent = '✅ Active on Amazon search page';
            toggleBtn.textContent = 'Extension is Running';
            toggleBtn.className = 'toggle-btn enabled';
            toggleBtn.disabled = true;
        } else if (isAmazonPage) {
            statusDiv.className = 'status status-inactive';
            statusText.textContent = '⚠️ Navigate to search results to use';
            toggleBtn.textContent = 'Go to Search Page';
            toggleBtn.className = 'toggle-btn disabled';
            toggleBtn.disabled = false;
        } else {
            statusDiv.className = 'status status-inactive';
            statusText.textContent = '❌ Not on Amazon';
            toggleBtn.textContent = 'Visit Amazon';
            toggleBtn.className = 'toggle-btn disabled';
            toggleBtn.disabled = false;
        }
    }
    
    toggleBtn.addEventListener('click', function() {
        chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
            const currentTab = tabs[0];
            
            if (currentTab.url.includes('amazon.')) {
                // If on Amazon but not search page, go to search
                chrome.tabs.update(currentTab.id, {
                    url: 'https://www.amazon.in/s?k=laptop'
                });
            } else {
                // If not on Amazon, go to Amazon
                chrome.tabs.update(currentTab.id, {
                    url: 'https://www.amazon.in'
                });
            }
            
            window.close();
        });
    });
});