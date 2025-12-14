/**
 * Type definitions for Tabletop Simulator Custom UI communication
 * Based on TTS API documentation: https://api.tabletopsimulator.com/
 */

/**
 * Message structure for communication between TTS and custom UI
 */
export interface TTSMessage {
    /** Action type identifier */
    action?: string;
    /** Button ID that triggered the action */
    buttonId?: string;
    /** Message type for routing */
    type?: "playerUpdate" | "uiUpdate" | "animate" | "gameState" | "error";
    /** Player name */
    name?: string;
    /** Player status */
    status?: string;
    /** Target element ID for animations */
    targetId?: string;
    /** Animation type to perform */
    animationType?: "fadeIn" | "fadeOut" | "slideIn" | "slideOut" | "bounce" | "shake";
    /** Additional data */
    [key: string]: unknown;
}

/**
 * Player information structure
 */
export interface TTSPlayer {
    /** Player color */
    color: string;
    /** Player name */
    name: string;
    /** Player status */
    status: string;
    /** Player seat number */
    seat?: number;
}

/**
 * Game state information
 */
export interface TTSGameState {
    /** Current turn number */
    turn?: number;
    /** Current phase */
    phase?: string;
    /** Game status */
    status?: "waiting" | "playing" | "paused" | "finished";
    /** Players in the game */
    players?: TTSPlayer[];
}

/**
 * Animation request structure
 */
export interface TTSAnimationRequest {
    /** Target element ID */
    targetId: string;
    /** Animation type */
    animationType: "fadeIn" | "fadeOut" | "slideIn" | "slideOut" | "bounce" | "shake";
    /** Animation duration in seconds */
    duration?: number;
    /** Animation delay in seconds */
    delay?: number;
    /** Additional animation parameters */
    params?: Record<string, unknown>;
}

/**
 * Extended Window interface with TTS-specific functions
 */
export interface WindowWithTTS extends Window {
    /** Receive messages from TTS */
    receiveMessage?: (data: TTSMessage) => void;
    /** Update player information display */
    updatePlayerInfo?: (name: string, status: string) => void;
    /** Animate panel entrance */
    animatePanelEntrance?: (panelId: string) => void;
    /** Animate panel exit */
    animatePanelExit?: (panelId: string) => void;
}

/**
 * UI update data structure
 */
export interface TTSUIUpdate {
    /** Element ID to update */
    elementId: string;
    /** Property to update */
    property: "text" | "html" | "style" | "class" | "attribute";
    /** New value */
    value: string | Record<string, string>;
}

