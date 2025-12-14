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

    // Show login overlay on initial load (simulating user login)
    // In production, this would be triggered by TTS when a user actually logs in
    showLoginOverlay();
});

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

// Make functions available globally for TTS to call
const windowWithTTS = window as WindowWithTTS & {
    showLoginOverlay?: () => void;
    hideLoginOverlay?: () => void;
};

if (typeof window !== "undefined") {
    windowWithTTS.receiveMessage = receiveMessage;
    windowWithTTS.updatePlayerInfo = updatePlayerInfo;
    windowWithTTS.animatePanelEntrance = animatePanelEntrance;
    windowWithTTS.animatePanelExit = animatePanelExit;
    windowWithTTS.showLoginOverlay = showLoginOverlay;
    windowWithTTS.hideLoginOverlay = hideLoginOverlay;
}
