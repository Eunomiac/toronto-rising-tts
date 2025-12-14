/**
 * Toronto Rising - Custom HUD TypeScript
 * Handles interaction between the HTML UI and Tabletop Simulator
 * Uses GSAP for animations
 */

import { gsap } from "gsap";

// Type definitions for TTS communication
interface TTSMessage {
    action?: string;
    buttonId?: string;
    type?: string;
    name?: string;
    status?: string;
    [key: string]: unknown;
}

interface WindowWithTTS extends Window {
    receiveMessage?: (data: TTSMessage) => void;
    updatePlayerInfo?: (name: string, status: string) => void;
}

// Global reference to TTS API (will be injected by TTS)
let ttsAPI: unknown = null;

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
export function animatePanelEntrance(panelId: string): void {
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
export function animatePanelExit(panelId: string): void {
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

// Export functions for TTS to call
const windowWithTTS = window as WindowWithTTS;
if (typeof window !== "undefined") {
    windowWithTTS.receiveMessage = receiveMessage;
    windowWithTTS.updatePlayerInfo = updatePlayerInfo;
}

