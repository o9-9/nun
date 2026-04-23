/*
 * Vencord, a modification for Discord's desktop app
 * Copyright (c) 2023 Vendicated and contributors
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
*/

import { addHeaderBarButton, HeaderBarButton, removeHeaderBarButton } from "@api/HeaderBar";
import { Devs, EquicordDevs } from "@utils/constants";
import definePlugin from "@utils/types";
import { findComponentByCodeLazy } from "@webpack";

// Track all audio elements
const trackedAudioElements = new Set<HTMLAudioElement>();
// Store original volumes for restoration
const originalVolumes = new WeakMap<HTMLAudioElement, number>();
let isMuted = false;

// Icon for the button - using deafened icon pattern
const DeafenIcon = findComponentByCodeLazy("M22.7 2.7a1", "1.4l20-20ZM17");

// Specific URLs to mute
const TARGET_URLS = [
    "https://pub-e77fd37d275f481896833bda931f1d70.r2.dev/moyai.WAV",
    "https://github.com/Equicord/Equibored/raw/main/sounds/moyai/moyai.mp3",
    "https://pub-e77fd37d275f481896833bda931f1d70.r2.dev/moyai2.wav",
    // Also check for statue and libcord patterns
    "moyai",
    "bread",
    "statue",
    "libcord"
];

function isTargetAudio(audio: HTMLAudioElement): boolean {
    const src = audio.src || audio.currentSrc || "";
    // Check if it matches any of the target URLs or contains target keywords
    return TARGET_URLS.some(url => {
        if (url.startsWith("http")) {
            return src.includes(url) || src === url.trim();
        }
        // For keywords, check if URL contains them
        return src.includes(url);
    });
}

function shouldSkipAudio(audio: HTMLAudioElement): boolean {
    const src = audio.src || audio.currentSrc || "";

    // If it's a target URL (moyai, statue, libcord), don't skip it (we want to stop it)
    if (isTargetAudio(audio)) {
        return false;
    }

    // Skip everything else (Discord sounds, voice calls, other sounds)
    return (
        src.startsWith("blob:") || // Voice messages use blob URLs
        src.includes("voice") ||
        src.includes("call") ||
        src.includes("discord.com") || // All Discord sounds
        // Check if audio element has voice-related attributes or is in a voice-related container
        (audio.parentElement?.closest?.("[class*='voice'], [class*='call'], [class*='audioPlayer']") !== null)
    );
}

function clearMoyaiQueue() {
    try {
        // Access moyai plugin's queue variables via patching
        // We'll patch the moyai plugin to expose a clear function
        const moyaiPlugin = (window as any).__moyaiPlugin;
        if (moyaiPlugin?.clearQueue) {
            moyaiPlugin.clearQueue();
            console.log(`[SoundStopper] Cleared moyai queue`);
        }
    } catch (e) {
        console.error("[SoundStopper] Error clearing moyai queue:", e);
    }
}

function stopAllSounds() {
    let stoppedCount = 0;

    console.log(`[SoundStopper] Tracked audio elements: ${trackedAudioElements.size}`);

    // Clear moyai queue first
    clearMoyaiQueue();

    // Stop all tracked audio elements that are currently playing (don't reset, just pause)
    for (const audio of trackedAudioElements) {
        try {
            // Skip non-target sounds (Discord sounds, etc.)
            if (shouldSkipAudio(audio)) {
                const src = audio.src || audio.currentSrc || "";
                console.log(`[SoundStopper] Skipping audio: ${src.substring(0, 80) || 'no src'}`);
                continue;
            }

            // This is target audio (moyai, statue, libcord) - we want to stop it

            // Check audio state more carefully
            const src = audio.src || audio.currentSrc || "";
            const isPaused = audio.paused;
            const isEnded = audio.ended;
            const readyState = audio.readyState;
            const hasSource = src.length > 0;

            // More lenient check: if it has a source and is not paused/ended, try to stop it
            // Also check if readyState indicates it has data (even if not playing yet)
            const isPlaying = !isPaused && !isEnded && readyState >= 2;
            const mightBePlaying = hasSource && readyState >= 1; // HAVE_METADATA or higher

            console.log(`[SoundStopper] Audio state - src: ${src.substring(0, 80) || 'no src'}, paused: ${isPaused}, ended: ${isEnded}, readyState: ${readyState}, isPlaying: ${isPlaying}, mightBePlaying: ${mightBePlaying}`);

            // Pause any audio that has a source and is not already paused
            // This catches audio that's playing, about to play, or in any active state
            if (hasSource && !isPaused) {
                audio.pause();
                // Don't reset currentTime - just pause so it can resume if needed
                stoppedCount++;
                console.log(`[SoundStopper] ✓ Stopped tracked audio: ${src.substring(0, 80) || 'no src'}`);
            } else if (hasSource && isPaused) {
                console.log(`[SoundStopper] Audio already paused: ${src.substring(0, 80)}`);
            } else {
                console.log(`[SoundStopper] Audio has no source, skipping`);
            }
        } catch (e) {
            console.error("[SoundStopper] Error stopping tracked audio:", e, audio);
        }
    }

    // Also stop any other audio elements in the DOM that are currently playing
    const allAudioElements = document.querySelectorAll("audio");
    console.log(`[SoundStopper] Found ${allAudioElements.length} audio elements in DOM`);

    for (const audio of allAudioElements) {
        try {
            // Skip target plugin sounds and Discord sounds
            if (shouldSkipAudio(audio)) {
                continue;
            }

            if (!trackedAudioElements.has(audio)) {
                const isPlaying = !audio.paused && !audio.ended && audio.readyState >= 2;
                if (isPlaying) {
                    audio.pause();
                    // Don't reset currentTime - just pause
                    stoppedCount++;
                    console.log(`[SoundStopper] Stopped DOM audio: ${audio.src || 'no src'}`);
                }
            }
        } catch (e) {
            console.error("[SoundStopper] Error stopping DOM audio:", e);
        }
    }

    return stoppedCount;
}

function StopSoundsButton() {
    return (
        <HeaderBarButton
            onClick={() => {
                const count = stopAllSounds();
                console.log(`[SoundStopper] Stopped ${count} sounds`);
            }}
            tooltip="Stop 🗿 🍞 🗽 temporarily"
            icon={DeafenIcon}
        />
    );
}

export default definePlugin({
    name: "SoundStopper",
    authors: [Devs.rayanzay],
    description: "Button to stop all sounds and automatically mute plugin sounds when playing an activity",
    required: true,

    patches: [
        {
            find: 'document.createElement("audio")',
            replacement: {
                match: /document\.createElement\(["']audio["']\)/,
                replace: (match) => {
                    return `(() => {
                        const audio = ${match};
                        $self.trackAudio(audio);
                        return audio;
                    })()`;
                }
            }
        }
    ],

    flux: {
        LOCAL_ACTIVITY_UPDATE({ activity }: { activity: any; }) {
            // When user starts playing an activity, mute sounds from target plugins
            if (activity && !isMuted) {
                isMuted = true;
                for (const audio of trackedAudioElements) {
                    try {
                        const src = audio.src || "";
                        const isTargetPlugin =
                            src.includes("moyai") ||
                            src.includes("bread") ||
                            src.includes("statue") ||
                            src.includes("libcord");

                        if (isTargetPlugin) {
                            // Store original volume before muting
                            if (!originalVolumes.has(audio)) {
                                originalVolumes.set(audio, audio.volume);
                            }
                            audio.volume = 0;
                        }
                    } catch (e) {
                        console.error("[SoundStopper] Error muting audio:", e);
                    }
                }
            } else if (!activity && isMuted) {
                // When activity stops, restore original volumes for target plugins
                isMuted = false;
                for (const audio of trackedAudioElements) {
                    try {
                        const src = audio.src || "";
                        const isTargetPlugin =
                            src.includes("moyai") ||
                            src.includes("bread") ||
                            src.includes("statue") ||
                            src.includes("libcord");

                        if (isTargetPlugin) {
                            const originalVolume = originalVolumes.get(audio);
                            if (originalVolume !== undefined) {
                                audio.volume = originalVolume;
                                originalVolumes.delete(audio);
                            }
                        }
                    } catch (e) {
                        console.error("[SoundStopper] Error restoring audio volume:", e);
                    }
                }
            }
        }
    },

    trackAudio(audio: HTMLAudioElement) {
        // Track all audio elements, we'll filter by URL when muting
        trackedAudioElements.add(audio);
        console.log(`[SoundStopper] Tracking new audio element, total: ${trackedAudioElements.size}`);

        // Store original volume if not already stored
        if (!originalVolumes.has(audio)) {
            originalVolumes.set(audio, audio.volume);
        }

        // If currently muted, check if this is from a target plugin and mute it
        if (isMuted) {
            const src = audio.src || "";
            const isTargetPlugin =
                src.includes("moyai") ||
                src.includes("bread") ||
                src.includes("statue") ||
                src.includes("libcord");

            if (isTargetPlugin) {
                audio.volume = 0;
            }
        }

        // Also check when src changes
        const checkSrc = () => {
            const src = audio.src || "";
            const isTargetPlugin =
                src.includes("moyai") ||
                src.includes("bread") ||
                src.includes("statue") ||
                src.includes("libcord");

            if (isTargetPlugin) {
                if (!originalVolumes.has(audio)) {
                    originalVolumes.set(audio, audio.volume);
                }
                if (isMuted) {
                    audio.volume = 0;
                }
            }
        };

        // Check src when play is called
        const originalPlay = audio.play.bind(audio);
        audio.play = function () {
            checkSrc();
            return originalPlay();
        };

        // Set up a periodic check for src changes (in case src is set before play)
        const checkInterval = setInterval(() => {
            if (!trackedAudioElements.has(audio)) {
                clearInterval(checkInterval);
                return;
            }
            checkSrc();
        }, 100);

        // Clean up when audio ends or errors
        const cleanup = () => {
            clearInterval(checkInterval);
            trackedAudioElements.delete(audio);
            originalVolumes.delete(audio);
        };

        audio.addEventListener("ended", cleanup, { once: true });
        audio.addEventListener("error", cleanup, { once: true });
    },

    start() {
        addHeaderBarButton("sound-stopper", () => <StopSoundsButton />);

        // Also patch HTMLAudioElement.prototype.play to catch all audio playback
        const originalPlay = HTMLAudioElement.prototype.play;
        HTMLAudioElement.prototype.play = function () {
            // Track this audio element
            if (!trackedAudioElements.has(this)) {
                (this as any).__soundStopperTracked = true;
                trackedAudioElements.add(this);
                if (!originalVolumes.has(this)) {
                    originalVolumes.set(this, this.volume);
                }

                // Check if we should mute it
                if (isMuted) {
                    const src = this.src || "";
                    const isTargetPlugin =
                        src.includes("moyai") ||
                        src.includes("bread") ||
                        src.includes("statue") ||
                        src.includes("libcord");

                    if (isTargetPlugin) {
                        this.volume = 0;
                    }
                }

                // Set up cleanup
                const cleanup = () => {
                    trackedAudioElements.delete(this);
                    originalVolumes.delete(this);
                };
                this.addEventListener("ended", cleanup, { once: true });
                this.addEventListener("error", cleanup, { once: true });
            }

            return originalPlay.call(this);
        };

        // Store original for cleanup
        (this as any).__originalPlay = originalPlay;
    },

    stop() {
        removeHeaderBarButton("sound-stopper");

        // Restore original play method
        if ((this as any).__originalPlay) {
            HTMLAudioElement.prototype.play = (this as any).__originalPlay;
        }

        // Stop all sounds when plugin stops
        stopAllSounds();
        trackedAudioElements.clear();
        originalVolumes.delete = () => { }; // Clear weakmap
    }
});
