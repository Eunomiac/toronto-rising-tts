/**
 * Toronto Rising - Custom HUD JavaScript
 * Handles interaction between the HTML UI and Tabletop Simulator
 */

// Global reference to TTS API (will be injected by TTS)
let ttsAPI = null;

/**
 * Initialize the HUD when the page loads
 */
document.addEventListener("DOMContentLoaded", function() {
    console.log("Toronto Rising HUD initialized");
    
    // Set up event listeners
    setupEventListeners();
    
    // Initialize UI state
    updatePlayerInfo("Player", "Active");
});

/**
 * Set up all event listeners for UI interactions
 */
function setupEventListeners() {
    const actionBtn = document.getElementById("action-btn");
    const resetBtn = document.getElementById("reset-btn");
    
    if (actionBtn) {
        actionBtn.addEventListener("click", handleActionClick);
    }
    
    if (resetBtn) {
        resetBtn.addEventListener("click", handleResetClick);
    }
}

/**
 * Handle action button click
 * This function will be called from TTS via the UI
 */
function handleActionClick() {
    console.log("Action button clicked");
    
    // Send message to TTS
    if (window.parent && window.parent.postMessage) {
        window.parent.postMessage({
            action: "buttonClick",
            buttonId: "action-btn"
        }, "*");
    }
    
    // Visual feedback
    const btn = document.getElementById("action-btn");
    btn.classList.add("fade-in");
    setTimeout(() => btn.classList.remove("fade-in"), 500);
}

/**
 * Handle reset button click
 */
function handleResetClick() {
    console.log("Reset button clicked");
    
    if (window.parent && window.parent.postMessage) {
        window.parent.postMessage({
            action: "buttonClick",
            buttonId: "reset-btn"
        }, "*");
    }
}

/**
 * Update player information display
 * @param {string} name - Player name
 * @param {string} status - Player status
 */
function updatePlayerInfo(name, status) {
    const nameElement = document.getElementById("player-name");
    const statusElement = document.getElementById("player-status");
    
    if (nameElement) {
        nameElement.textContent = name;
    }
    
    if (statusElement) {
        statusElement.textContent = status;
    }
}

/**
 * Receive messages from TTS
 * This function is called by TTS to update the UI
 */
function receiveMessage(data) {
    console.log("Received message from TTS:", data);
    
    if (data.type === "playerUpdate") {
        updatePlayerInfo(data.name, data.status);
    } else if (data.type === "uiUpdate") {
        // Handle other UI updates
        updateUI(data);
    }
}

/**
 * Update UI based on data from TTS
 * @param {Object} data - Update data
 */
function updateUI(data) {
    // Implement UI update logic based on your needs
    console.log("Updating UI with:", data);
}

// Export functions for TTS to call
if (typeof window !== "undefined") {
    window.receiveMessage = receiveMessage;
    window.updatePlayerInfo = updatePlayerInfo;
}

