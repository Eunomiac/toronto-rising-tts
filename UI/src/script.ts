/**
 * Toronto Rising - Custom HUD TypeScript
 * Handles interaction between the HTML UI and Tabletop Simulator
 * Uses GSAP for animations
 */

import { gsap } from "gsap";
import type { TTSMessage, WindowWithTTS } from "./types/tts";

// TTS API will be injected by Tabletop Simulator when available

/**
 * Initialize the HUD when the page loads
 */
document.addEventListener("DOMContentLoaded", () => {
    console.log("Toronto Rising HUD initialized");

    // Set up event listeners
    setupEventListeners();

    // Initialize UI state
    updatePlayerInfo("Player", "Active");

    // Animate initial load
    animateInitialLoad();

    // Watch for all message types from TTS (all preloaded and ready)
    setupDiceResultsWatcher();
    setupNotificationWatcher();
    setupMessageWatcher();

    // Also listen for broadcastToAll messages (fallback method)
    setupBroadcastListener();

    // Update test container status
    updateUITestStatus("UI initialized and ready");

    // Log to console to confirm UI is loaded
    console.log("Toronto Rising UI loaded and ready!");

    // Show login overlay on initial load (simulating user login)
    // In production, this would be triggered by TTS when a user actually logs in
    showLoginOverlay();
});

/**
 * Update the UI test container status message
 * @param message - Status message to display
 */
function updateUITestStatus(message: string): void {
    const statusElement = document.getElementById("ui-test-status");
    if (statusElement) {
        statusElement.textContent = `Status: ${message}`;
    }
}

/**
 * Set up listener for broadcastToAll messages (fallback method)
 * TTS may send data via broadcastToAll with [DICE_RESULTS] prefix
 */
function setupBroadcastListener(): void {
    // Listen for messages from TTS via window messages
    window.addEventListener("message", (event: MessageEvent) => {
        if (event.data && typeof event.data === "string") {
            // Check if it's a dice results message
            if (event.data.startsWith("[DICE_RESULTS]")) {
                const jsonData = event.data.substring("[DICE_RESULTS]".length);
                try {
                    const data = JSON.parse(jsonData) as TTSMessage;
                    if (data.type === "diceResults") {
                        updateUITestStatus("Received via broadcast!");
                        showDiceResults(data);
                    }
                } catch (e) {
                    console.error("Error parsing broadcast dice results:", e);
                }
            }
        }
    });

    console.log("Broadcast listener set up");
}

/**
 * Set up a watcher for dice results data from TTS
 * TTS will update the hidden input element, and we watch for changes
 */
function setupDiceResultsWatcher(): void {
    const diceDataInput = document.getElementById("dice-results-data") as HTMLInputElement;
    if (!diceDataInput) {
        console.warn("Dice results data input not found");
        return;
    }

    // Watch for value changes using MutationObserver
    const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
            if (mutation.type === "attributes" && mutation.attributeName === "value") {
                const newValue = diceDataInput.value;
                if (newValue && newValue.trim() !== "") {
                    try {
                        const data = JSON.parse(newValue) as TTSMessage;
                        if (data.type === "diceResults") {
                            updateUITestStatus("Received dice results!");
                            showDiceResults(data);
                            // Clear the value after processing
                            diceDataInput.value = "";
                        }
                    } catch (e) {
                        console.error("Error parsing dice results data:", e);
                        updateUITestStatus(`Error: ${e}`);
                    }
                }
            }
        });
    });

    observer.observe(diceDataInput, {
        attributes: true,
        attributeFilter: ["value"]
    });

    // Also poll for changes as a fallback (TTS sometimes doesn't trigger MutationObserver)
    let lastValue = diceDataInput.value;
    setInterval(() => {
        const currentValue = diceDataInput.value;
        if (currentValue !== lastValue && currentValue && currentValue.trim() !== "") {
            lastValue = currentValue;
            try {
                const data = JSON.parse(currentValue) as TTSMessage;
                if (data.type === "diceResults") {
                    updateUITestStatus("Received dice results (polling)!");
                    showDiceResults(data);
                    // Clear the value after processing
                    diceDataInput.value = "";
                    lastValue = "";
                }
            } catch (e) {
                console.error("Error parsing dice results data:", e);
                updateUITestStatus(`Error: ${e}`);
            }
        }
    }, 100); // Check every 100ms
}

/**
 * Set up all event listeners for UI interactions
 */
function setupEventListeners(): void {
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
 * Animate the initial page load using GSAP
 */
function animateInitialLoad(): void {
    const container = document.getElementById("hud-container");
    const header = document.querySelector(".hud-header");
    const panels = document.querySelectorAll(".panel");

    if (container) {
        // Fade in the entire container
        gsap.from(container, {
            duration: 0.5,
            opacity: 0,
            ease: "power2.out"
        });
    }

    if (header) {
        // Slide down the header
        gsap.from(header, {
            duration: 0.6,
            y: -50,
            opacity: 0,
            ease: "back.out(1.7)",
            delay: 0.2
        });
    }

    // Stagger panel animations
    if (panels.length > 0) {
        gsap.from(panels, {
            duration: 0.5,
            x: -30,
            opacity: 0,
            stagger: 0.15,
            ease: "power2.out",
            delay: 0.4
        });
    }
}

/**
 * Handle action button click
 * This function will be called from TTS via the UI
 */
function handleActionClick(): void {
    console.log("Action button clicked");

    // Send message to TTS
    const parentWindow = window.parent;
    if (parentWindow && parentWindow.postMessage) {
        parentWindow.postMessage({
            action: "buttonClick",
            buttonId: "action-btn"
        }, "*");
    }

    // GSAP animation for button click
    const btn = document.getElementById("action-btn");
    if (btn) {
        // Pulse animation
        gsap.to(btn, {
            duration: 0.2,
            scale: 1.1,
            yoyo: true,
            repeat: 1,
            ease: "power2.inOut"
        });

        // Shake animation for extra feedback
        gsap.to(btn, {
            duration: 0.1,
            x: -5,
            yoyo: true,
            repeat: 5,
            ease: "power1.inOut",
            delay: 0.2
        });
    }
}

/**
 * Handle reset button click
 */
function handleResetClick(): void {
    console.log("Reset button clicked");

    const parentWindow = window.parent;
    if (parentWindow && parentWindow.postMessage) {
        parentWindow.postMessage({
            action: "buttonClick",
            buttonId: "reset-btn"
        }, "*");
    }

    // GSAP animation for reset button
    const btn = document.getElementById("reset-btn");
    if (btn) {
        // Rotate and scale animation
        gsap.to(btn, {
            duration: 0.3,
            rotation: 360,
            scale: 1.2,
            yoyo: true,
            repeat: 1,
            ease: "power2.inOut"
        });
    }
}

/**
 * Update player information display with GSAP animation
 * @param name - Player name
 * @param status - Player status
 */
function updatePlayerInfo(name: string, status: string): void {
    const nameElement = document.getElementById("player-name");
    const statusElement = document.getElementById("player-status");

    if (nameElement) {
        // Animate text change
        gsap.to(nameElement, {
            duration: 0.2,
            opacity: 0,
            y: -10,
            onComplete: () => {
                nameElement.textContent = name;
                gsap.to(nameElement, {
                    duration: 0.3,
                    opacity: 1,
                    y: 0,
                    ease: "power2.out"
                });
            }
        });
    }

    if (statusElement) {
        // Animate status change with color transition
        gsap.to(statusElement, {
            duration: 0.2,
            opacity: 0,
            scale: 0.8,
            onComplete: () => {
                statusElement.textContent = status;
                gsap.to(statusElement, {
                    duration: 0.3,
                    opacity: 1,
                    scale: 1,
                    ease: "back.out(1.7)"
                });
            }
        });
    }
}

/**
 * Receive messages from TTS
 * This function is called by TTS to update the UI
 * @param data - Message data from TTS
 */
function receiveMessage(data: TTSMessage): void {
    console.log("Received message from TTS:", data);

    if (data.type === "playerUpdate") {
        if (data.name && data.status) {
            updatePlayerInfo(data.name, data.status);
        }
    } else if (data.type === "uiUpdate") {
        // Handle other UI updates
        updateUI(data);
    } else if (data.type === "animate") {
        // Handle custom animation requests
        handleAnimationRequest(data);
    } else if (data.type === "userLogin") {
        // Trigger login overlay when user logs in
        showLoginOverlay();
    } else if (data.type === "diceResults") {
        // Handle dice results display
        showDiceResults(data);
    }
}

/**
 * Update UI based on data from TTS
 * @param data - Update data
 */
function updateUI(data: TTSMessage): void {
    // Implement UI update logic based on your needs
    console.log("Updating UI with:", data);
}

/**
 * Handle animation requests from TTS
 * @param data - Animation request data
 */
function handleAnimationRequest(data: TTSMessage): void {
    const targetId = data.targetId as string | undefined;
    const animationType = data.animationType as string | undefined;

    if (!targetId || !animationType) {
        return;
    }

    const target = document.getElementById(targetId);
    if (!target) {
        console.warn(`Animation target not found: ${targetId}`);
        return;
    }

    switch (animationType) {
        case "fadeIn":
            gsap.fromTo(target, { opacity: 0 }, { opacity: 1, duration: 0.5 });
            break;
        case "fadeOut":
            gsap.to(target, { opacity: 0, duration: 0.5 });
            break;
        case "slideIn":
            gsap.fromTo(target, { x: -100, opacity: 0 }, { x: 0, opacity: 1, duration: 0.5 });
            break;
        case "slideOut":
            gsap.to(target, { x: 100, opacity: 0, duration: 0.5 });
            break;
        case "bounce":
            gsap.to(target, {
                y: -20,
                duration: 0.3,
                yoyo: true,
                repeat: 1,
                ease: "power2.out"
            });
            break;
        case "shake":
            gsap.to(target, {
                x: -10,
                duration: 0.1,
                yoyo: true,
                repeat: 5,
                ease: "power1.inOut"
            });
            break;
        default:
            console.warn(`Unknown animation type: ${animationType}`);
    }
}

/**
 * Animate panel entrance
 * @param panelId - ID of the panel to animate
 */
function animatePanelEntrance(panelId: string): void {
    const panel = document.getElementById(panelId);
    if (panel) {
        gsap.from(panel, {
            duration: 0.5,
            scale: 0.8,
            opacity: 0,
            rotation: -5,
            ease: "back.out(1.7)"
        });
    }
}

/**
 * Animate panel exit
 * @param panelId - ID of the panel to animate
 */
function animatePanelExit(panelId: string): void {
    const panel = document.getElementById(panelId);
    if (panel) {
        gsap.to(panel, {
            duration: 0.3,
            scale: 0.8,
            opacity: 0,
            rotation: 5,
            ease: "power2.in",
            onComplete: () => {
                if (panel.parentNode) {
                    panel.parentNode.removeChild(panel);
                }
            }
        });
    }
}

/**
 * Show the full-screen login overlay with animated message
 * This is triggered when a user logs in
 */
function showLoginOverlay(): void {
    const overlay = document.getElementById("login-overlay");
    const message = document.getElementById("login-message");

    if (!overlay || !message) {
        console.warn("Login overlay elements not found");
        return;
    }

    // Clear any inline styles left by previous GSAP animations
    // This ensures the CSS classes can properly control visibility
    gsap.set(overlay, { clearProps: "opacity" });
    gsap.set(message, { clearProps: "all" });

    // Activate the overlay
    overlay.classList.add("active");

    // Create a cool GSAP animation sequence
    const tl = gsap.timeline();

    // Step 1: Rotate and scale in with 3D effect
    tl.fromTo(
        message,
        {
            opacity: 0,
            scale: 0.3,
            rotationY: 180,
            z: -500
        },
        {
            opacity: 1,
            scale: 1,
            rotationY: 0,
            z: 0,
            duration: 1.2,
            ease: "back.out(1.7)"
        }
    )
    // Step 2: Add a glow pulse effect
    .to(message, {
        textShadow: "0 0 30px rgba(52, 152, 219, 0.8), 0 0 60px rgba(52, 152, 219, 0.5), 2px 2px 4px rgba(0, 0, 0, 0.8)",
        duration: 0.3,
        ease: "power2.out"
    })
    .to(message, {
        textShadow: "0 0 20px rgba(52, 152, 219, 0.5), 0 0 40px rgba(52, 152, 219, 0.3), 2px 2px 4px rgba(0, 0, 0, 0.8)",
        duration: 0.3,
        ease: "power2.in"
    })
    // Step 3: Slight bounce for emphasis
    .to(message, {
        scale: 1.1,
        duration: 0.2,
        ease: "power2.out"
    })
    .to(message, {
        scale: 1,
        duration: 0.2,
        ease: "power2.in"
    })
    // Step 4: Character-by-character reveal effect (simulated with letter spacing)
    .to(message, {
        letterSpacing: "0.2em",
        duration: 0.5,
        ease: "power2.out"
    })
    .to(message, {
        letterSpacing: "0.1em",
        duration: 0.3,
        ease: "power2.in"
    });

    // Auto-hide after 4 seconds
    setTimeout(() => {
        hideLoginOverlay();
    }, 4000);
}

/**
 * Hide the login overlay with fade out animation
 */
function hideLoginOverlay(): void {
    const overlay = document.getElementById("login-overlay");
    const message = document.getElementById("login-message");

    if (!overlay || !message) {
        return;
    }

    // Animate out
    const tl = gsap.timeline({
        onComplete: () => {
            // Clear inline styles that GSAP set during animation
            // This prevents inline styles from overriding CSS classes on subsequent shows
            gsap.set(overlay, { clearProps: "opacity" });
            gsap.set(message, { clearProps: "all" });
            overlay.classList.remove("active");
        }
    });

    tl.to(message, {
        opacity: 0,
        scale: 0.8,
        rotationY: -90,
        z: -300,
        duration: 0.8,
        ease: "power2.in"
    })
    .to(overlay, {
        opacity: 0,
        duration: 0.3,
        ease: "power2.out"
    }, "-=0.5");
}

/**
 * Show dice results with a beautiful GSAP animation
 * @param data - Dice results data from TTS
 */
function showDiceResults(data: TTSMessage): void {
    const overlay = document.getElementById("dice-results-overlay");
    const container = document.getElementById("dice-results-container");
    const header = document.getElementById("dice-results-header");
    const values = document.getElementById("dice-values");
    const results = document.getElementById("dice-results");

    if (!overlay || !container || !header || !values || !results) {
        console.warn("Dice results elements not found");
        return;
    }

    // Extract data
    const playerName = (data.playerName as string) || "";
    const diceValues = (data.diceValues as string) || "";
    const resultMessage = (data.resultMessage as string) || "";
    const totalSuccesses = (data.totalSuccesses as number) || 0;
    const hasMessyCritical = (data.hasMessyCritical as boolean) || false;
    const isTotalFailure = (data.isTotalFailure as boolean) || false;
    const hasBestialFailure = (data.hasBestialFailure as boolean) || false;

    // Set content
    header.textContent = playerName ? `${playerName}'s Roll` : "Dice Roll";
    values.textContent = diceValues || "";

    // Format results with appropriate styling
    let resultClass = "success";
    if (hasMessyCritical) {
        resultClass = "messy-critical";
    } else if (isTotalFailure) {
        resultClass = "failure";
    } else if (totalSuccesses > 1) {
        resultClass = "critical";
    }

    results.className = `dice-results ${resultClass}`;
    results.textContent = resultMessage;

    // Clear any previous inline styles
    gsap.set(overlay, { clearProps: "opacity" });
    gsap.set(container, { clearProps: "all" });
    gsap.set(header, { clearProps: "all" });
    gsap.set(values, { clearProps: "all" });
    gsap.set(results, { clearProps: "all" });

    // Activate overlay
    overlay.classList.add("active");

    // Create stunning GSAP animation timeline
    const tl = gsap.timeline({
        onComplete: () => {
            // Auto-hide after 5 seconds
            setTimeout(() => {
                hideDiceResults();
            }, 5000);
        }
    });

    // Step 1: Fade in overlay background
    tl.fromTo(
        overlay,
        { opacity: 0 },
        { opacity: 1, duration: 0.4, ease: "power2.out" }
    );

    // Step 2: Container entrance - dramatic 3D flip and scale
    tl.fromTo(
        container,
        {
            opacity: 0,
            scale: 0.3,
            rotationY: 180,
            rotationX: -30,
            z: -500,
            y: 100
        },
        {
            opacity: 1,
            scale: 1,
            rotationY: 0,
            rotationX: 0,
            z: 0,
            y: 0,
            duration: 1.0,
            ease: "back.out(1.7)"
        },
        "-=0.2"
    );

    // Step 3: Header slide in from top with glow
    tl.fromTo(
        header,
        {
            opacity: 0,
            y: -50,
            scale: 0.8
        },
        {
            opacity: 1,
            y: 0,
            scale: 1,
            duration: 0.6,
            ease: "power3.out"
        },
        "-=0.5"
    );

    // Step 4: Dice values fade in
    if (diceValues) {
        tl.fromTo(
            values,
            {
                opacity: 0,
                x: -30
            },
            {
                opacity: 0.9,
                x: 0,
                duration: 0.5,
                ease: "power2.out"
            },
            "-=0.3"
        );
    }

    // Step 5: Results text - dramatic entrance with glow pulse
    tl.fromTo(
        results,
        {
            opacity: 0,
            scale: 0.5,
            y: 50,
            rotationZ: -5
        },
        {
            opacity: 1,
            scale: 1,
            y: 0,
            rotationZ: 0,
            duration: 0.8,
            ease: "elastic.out(1, 0.5)"
        },
        "-=0.2"
    );

    // Step 6: Add glow pulse effect based on result type
    if (hasMessyCritical || totalSuccesses > 1) {
        tl.to(results, {
            scale: 1.1,
            duration: 0.3,
            ease: "power2.out"
        })
        .to(results, {
            scale: 1,
            duration: 0.3,
            ease: "power2.in"
        });
    }

    // Step 7: Subtle continuous glow animation
    tl.to(results, {
        textShadow: "0 0 30px currentColor, 0 0 60px currentColor, 2px 2px 4px rgba(0, 0, 0, 0.8)",
        duration: 0.5,
        ease: "power2.inOut",
        yoyo: true,
        repeat: 2
    });
}

/**
 * Hide dice results with fade out animation
 */
function hideDiceResults(): void {
    const overlay = document.getElementById("dice-results-overlay");
    const container = document.getElementById("dice-results-container");

    if (!overlay || !container) {
        return;
    }

    // Animate out
    const tl = gsap.timeline({
        onComplete: () => {
            // Clear inline styles
            gsap.set(overlay, { clearProps: "opacity" });
            gsap.set(container, { clearProps: "all" });
            overlay.classList.remove("active");
        }
    });

    tl.to(container, {
        opacity: 0,
        scale: 0.8,
        rotationY: -90,
        rotationX: 30,
        z: -300,
        y: -50,
        duration: 0.6,
        ease: "power2.in"
    })
    .to(overlay, {
        opacity: 0,
        duration: 0.3,
        ease: "power2.out"
    }, "-=0.4");
}

/**
 * Set up a watcher for notification data from TTS
 * @param inputId - ID of the hidden input element
 */
function setupNotificationWatcher(): void {
    const notificationDataInput = document.getElementById("notification-data") as HTMLInputElement;
    if (!notificationDataInput) {
        console.warn("Notification data input not found");
        return;
    }

    const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
            if (mutation.type === "attributes" && mutation.attributeName === "value") {
                const newValue = notificationDataInput.value;
                if (newValue && newValue.trim() !== "") {
                    try {
                        const data = JSON.parse(newValue) as TTSMessage;
                        if (data.type === "notification") {
                            showNotification(data);
                            notificationDataInput.value = "";
                        }
                    } catch (e) {
                        console.error("Error parsing notification data:", e);
                    }
                }
            }
        });
    });

    observer.observe(notificationDataInput, {
        attributes: true,
        attributeFilter: ["value"]
    });

    // Polling fallback
    let lastValue = notificationDataInput.value;
    setInterval(() => {
        const currentValue = notificationDataInput.value;
        if (currentValue !== lastValue && currentValue && currentValue.trim() !== "") {
            lastValue = currentValue;
            try {
                const data = JSON.parse(currentValue) as TTSMessage;
                if (data.type === "notification") {
                    showNotification(data);
                    notificationDataInput.value = "";
                    lastValue = "";
                }
            } catch (e) {
                console.error("Error parsing notification data:", e);
            }
        }
    }, 100);
}

/**
 * Show notification with GSAP animation
 * @param data - Notification data from TTS
 */
function showNotification(data: TTSMessage): void {
    const overlay = document.getElementById("notification-overlay");
    const container = document.getElementById("notification-container");
    const icon = document.getElementById("notification-icon");
    const title = document.getElementById("notification-title");
    const message = document.getElementById("notification-message");

    if (!overlay || !container || !title || !message) {
        console.warn("Notification elements not found");
        return;
    }

    const notificationTitle = (data.notificationTitle as string) || "Notification";
    const notificationMessage = (data.notificationMessage as string) || "";
    const notificationType = (data.notificationType as "info" | "success" | "warning" | "error") || "info";

    title.textContent = notificationTitle;
    message.textContent = notificationMessage;

    // Set type-based styling
    container.className = `notification-container notification-${notificationType}`;
    if (icon) {
        icon.className = `notification-icon notification-icon-${notificationType}`;
        icon.textContent = notificationType === "success" ? "✓" : notificationType === "error" ? "✕" : notificationType === "warning" ? "⚠" : "ℹ";
    }

    gsap.set(overlay, { clearProps: "opacity" });
    gsap.set(container, { clearProps: "all" });

    overlay.classList.add("active");

    const tl = gsap.timeline({
        onComplete: () => {
            setTimeout(() => {
                hideNotification();
            }, 4000);
        }
    });

    tl.fromTo(overlay, { opacity: 0 }, { opacity: 1, duration: 0.3 })
        .fromTo(
            container,
            { opacity: 0, scale: 0.5, y: -50 },
            { opacity: 1, scale: 1, y: 0, duration: 0.6, ease: "back.out(1.7)" },
            "-=0.1"
        );
}

/**
 * Hide notification with fade out
 */
function hideNotification(): void {
    const overlay = document.getElementById("notification-overlay");
    const container = document.getElementById("notification-container");

    if (!overlay || !container) {
        return;
    }

    const tl = gsap.timeline({
        onComplete: () => {
            gsap.set(overlay, { clearProps: "opacity" });
            gsap.set(container, { clearProps: "all" });
            overlay.classList.remove("active");
        }
    });

    tl.to(container, { opacity: 0, scale: 0.8, y: -30, duration: 0.3 })
        .to(overlay, { opacity: 0, duration: 0.2 }, "-=0.2");
}

/**
 * Set up a watcher for message data from TTS
 */
function setupMessageWatcher(): void {
    const messageDataInput = document.getElementById("message-data") as HTMLInputElement;
    if (!messageDataInput) {
        console.warn("Message data input not found");
        return;
    }

    const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
            if (mutation.type === "attributes" && mutation.attributeName === "value") {
                const newValue = messageDataInput.value;
                if (newValue && newValue.trim() !== "") {
                    try {
                        const data = JSON.parse(newValue) as TTSMessage;
                        if (data.type === "message") {
                            showMessage(data);
                            messageDataInput.value = "";
                        }
                    } catch (e) {
                        console.error("Error parsing message data:", e);
                    }
                }
            }
        });
    });

    observer.observe(messageDataInput, {
        attributes: true,
        attributeFilter: ["value"]
    });

    // Polling fallback
    let lastValue = messageDataInput.value;
    setInterval(() => {
        const currentValue = messageDataInput.value;
        if (currentValue !== lastValue && currentValue && currentValue.trim() !== "") {
            lastValue = currentValue;
            try {
                const data = JSON.parse(currentValue) as TTSMessage;
                if (data.type === "message") {
                    showMessage(data);
                    messageDataInput.value = "";
                    lastValue = "";
                }
            } catch (e) {
                console.error("Error parsing message data:", e);
            }
        }
    }, 100);
}

/**
 * Show message with GSAP animation
 * @param data - Message data from TTS
 */
function showMessage(data: TTSMessage): void {
    const overlay = document.getElementById("message-overlay");
    const container = document.getElementById("message-container");
    const header = document.getElementById("message-header");
    const body = document.getElementById("message-body");
    const footer = document.getElementById("message-footer");

    if (!overlay || !container || !header || !body) {
        console.warn("Message elements not found");
        return;
    }

    const messageHeader = (data.messageHeader as string) || "";
    const messageBody = (data.messageBody as string) || "";
    const messageFooter = (data.messageFooter as string) || "";
    const messageStyle = (data.messageStyle as "default" | "alert" | "confirm" | "prompt") || "default";

    header.textContent = messageHeader;
    body.textContent = messageBody;
    if (footer) {
        footer.textContent = messageFooter;
    }

    container.className = `message-container message-${messageStyle}`;

    gsap.set(overlay, { clearProps: "opacity" });
    gsap.set(container, { clearProps: "all" });

    overlay.classList.add("active");

    const tl = gsap.timeline({
        onComplete: () => {
            setTimeout(() => {
                hideMessage();
            }, 6000);
        }
    });

    tl.fromTo(overlay, { opacity: 0 }, { opacity: 1, duration: 0.4 })
        .fromTo(
            container,
            { opacity: 0, scale: 0.3, rotationY: 180, z: -500 },
            { opacity: 1, scale: 1, rotationY: 0, z: 0, duration: 0.8, ease: "back.out(1.7)" },
            "-=0.2"
        );
}

/**
 * Hide message with fade out
 */
function hideMessage(): void {
    const overlay = document.getElementById("message-overlay");
    const container = document.getElementById("message-container");

    if (!overlay || !container) {
        return;
    }

    const tl = gsap.timeline({
        onComplete: () => {
            gsap.set(overlay, { clearProps: "opacity" });
            gsap.set(container, { clearProps: "all" });
            overlay.classList.remove("active");
        }
    });

    tl.to(container, { opacity: 0, scale: 0.8, rotationY: -90, z: -300, duration: 0.5 })
        .to(overlay, { opacity: 0, duration: 0.3 }, "-=0.3");
}

// Make functions available globally for TTS to call
const windowWithTTS = window as WindowWithTTS & {
    showLoginOverlay?: () => void;
    hideLoginOverlay?: () => void;
    showDiceResults?: (data: TTSMessage) => void;
    hideDiceResults?: () => void;
    showNotification?: (data: TTSMessage) => void;
    hideNotification?: () => void;
    showMessage?: (data: TTSMessage) => void;
    hideMessage?: () => void;
    setupDiceResultsWatcher?: () => void;
    setupNotificationWatcher?: () => void;
    setupMessageWatcher?: () => void;
};

if (typeof window !== "undefined") {
    windowWithTTS.receiveMessage = receiveMessage;
    windowWithTTS.updatePlayerInfo = updatePlayerInfo;
    windowWithTTS.animatePanelEntrance = animatePanelEntrance;
    windowWithTTS.animatePanelExit = animatePanelExit;
    windowWithTTS.showLoginOverlay = showLoginOverlay;
    windowWithTTS.hideLoginOverlay = hideLoginOverlay;
    windowWithTTS.showDiceResults = showDiceResults;
    windowWithTTS.hideDiceResults = hideDiceResults;
    windowWithTTS.showNotification = showNotification;
    windowWithTTS.hideNotification = hideNotification;
    windowWithTTS.showMessage = showMessage;
    windowWithTTS.hideMessage = hideMessage;
    windowWithTTS.setupDiceResultsWatcher = setupDiceResultsWatcher;
    windowWithTTS.setupNotificationWatcher = setupNotificationWatcher;
    windowWithTTS.setupMessageWatcher = setupMessageWatcher;
}
