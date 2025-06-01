// Amazon Return Policy Checker - Popup Script

document.addEventListener('DOMContentLoaded', function() {
    const statusDiv = document.getElementById('status');
    const statusText = document.getElementById('status-text');
    const toggleBtn = document.getElementById('toggle-btn');
    
    let isExtensionEnabled = true;
    let currentTab = null;
    
    // Load extension state and check current tab
    Promise.all([
        chrome.storage.sync.get(['extensionEnabled']),
        chrome.tabs.query({active: true, currentWindow: true})
    ]).then(([storage, tabs]) => {
        currentTab = tabs[0];
        isExtensionEnabled = storage.extensionEnabled !== false; // Default to true
        updateUI();
    });
    
    function updateUI() {
        const isAmazonPage = currentTab.url.includes('amazon.');
        const isSearchPage = currentTab.url.includes('/s?') || currentTab.url.includes('/s/');
        
        if (!isExtensionEnabled) {
            // Extension is disabled
            statusDiv.className = 'status status-inactive';
            statusText.textContent = '⏸️ Extension is disabled';
            toggleBtn.textContent = 'Enable Extension';
            toggleBtn.className = 'toggle-btn disabled';
            toggleBtn.disabled = false;
        } else if (isSearchPage) {
            // Extension is enabled and on search page
            statusDiv.className = 'status status-active';
            statusText.textContent = '✅ Active on Amazon search page';
            toggleBtn.textContent = 'Disable Extension';
            toggleBtn.className = 'toggle-btn enabled';
            toggleBtn.disabled = false;
        } else if (isAmazonPage) {
            // Extension is enabled but not on search page
            statusDiv.className = 'status status-active';
            statusText.textContent = '✅ Extension enabled - Go to search page';
            toggleBtn.textContent = 'Disable Extension';
            toggleBtn.className = 'toggle-btn enabled';
            toggleBtn.disabled = false;
        } else {
            // Not on Amazon
            statusDiv.className = 'status status-inactive';
            statusText.textContent = '❌ Not on Amazon';
            toggleBtn.textContent = isExtensionEnabled ? 'Visit Amazon' : 'Enable & Visit Amazon';
            toggleBtn.className = 'toggle-btn disabled';
            toggleBtn.disabled = false;
        }
    }
    
    toggleBtn.addEventListener('click', function() {
        if (!currentTab.url.includes('amazon.')) {
            // Go to Amazon
            chrome.tabs.update(currentTab.id, {
                url: 'https://www.amazon.in'
            });
            window.close();
            return;
        }
        
        // Toggle extension state
        isExtensionEnabled = !isExtensionEnabled;
        
        // Save state
        chrome.storage.sync.set({ extensionEnabled: isExtensionEnabled });
        
        // Send message to content script
        chrome.tabs.sendMessage(currentTab.id, {
            action: 'toggleExtension',
            enabled: isExtensionEnabled
        });
        
        // Update UI
        updateUI();
        
        // Show feedback
        const originalText = toggleBtn.textContent;
        toggleBtn.textContent = isExtensionEnabled ? 'Enabled!' : 'Disabled!';
        setTimeout(() => {
            updateUI();
        }, 1000);
    });
});