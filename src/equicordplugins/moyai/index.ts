/*
 * Vencord, a modification for Discord's desktop app
 * Copyright (c) 2022 Vendicated and contributors
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

import { definePluginSettings } from "@api/Settings";
import { Devs } from "@utils/constants";
import { sleep } from "@utils/misc";
import definePlugin, { makeRange, OptionType } from "@utils/types";
import { Message, ReactionEmoji } from "@vencord/discord-types";
import { RelationshipStore, SelectedChannelStore, UserStore } from "@webpack/common";

interface IMessageCreate {
    type: "MESSAGE_CREATE";
    optimistic: boolean;
    isPushNotification: boolean;
    channelId: string;
    message: Message;
}

interface IReactionAdd {
    type: "MESSAGE_REACTION_ADD";
    optimistic: boolean;
    channelId: string;
    messageId: string;
    messageAuthorId: string;
    userId: string;
    emoji: ReactionEmoji;
}

interface IVoiceChannelEffectSendEvent {
    type: string;
    emoji?: ReactionEmoji; // Just in case...
    channelId: string;
    userId: string;
    animationType: number;
    animationId: number;
}

const MOYAI = "🗿";
const DUCK = "🦆";
const DUCK_VARIANTS = [":duck:", "🦆", ":🦆:", "duck"] as const;
const MOYAI_URL = "https://github.com/Equicord/Equibored/raw/main/sounds/moyai/moyai.mp3";
const MOYAI_URL_HD = "https://github.com/Equicord/Equibored/raw/main/sounds/moyai/moyai.wav";
const MOYAI_URL_ULTRA = "https://pub-e77fd37d275f481896833bda931f1d70.r2.dev/moyai2.wav";
const MOYAI_URL_ULTRA_HD = "https://pub-e77fd37d275f481896833bda931f1d70.r2.dev/moyai2.wav";

const settings = definePluginSettings({
    volume: {
        description: "Volume of the 🗿🗿🗿",
        type: OptionType.SLIDER,
        markers: makeRange(0, 1, 0.1),
        default: 0.5,
        stickToMarkers: false
    },
    quality: {
        description: "Quality of the 🗿🗿🗿",
        type: OptionType.SELECT,
        options: [
            { label: "Normal", value: "Normal", default: true },
            { label: "HD", value: "HD" }
        ],
    },
    triggerWhenUnfocused: {
        description: "Trigger the 🗿 even when the window is unfocused",
        type: OptionType.BOOLEAN,
        default: true
    },
    ultraMode: {
        description: "nun's special 🗿 feature!!",
        type: OptionType.BOOLEAN,
        default: true
    },
    ignoreBots: {
        description: "Ignore bots",
        type: OptionType.BOOLEAN,
        default: true
    },
    ignoreBlocked: {
        description: "Ignore blocked users",
        type: OptionType.BOOLEAN,
        default: true
    }
});

export default definePlugin({
    name: "Moyai",
    authors: [Devs.Megu, Devs.Nuckyz, Devs.rayanzay],
    description: "🗿 but with something else inside the settings...",
    tags: ["Fun"],
    settings,

    flux: {
        async MESSAGE_CREATE({ optimistic, type, message, channelId }: IMessageCreate) {
            if (optimistic || type !== "MESSAGE_CREATE") return;
            if (message.state === "SENDING") return;
            if (settings.store.ignoreBots && message.author?.bot) return;
            if (settings.store.ignoreBlocked && RelationshipStore.isBlocked(message.author?.id)) return;
            if (!message.content) return;
            if (channelId !== SelectedChannelStore.getChannelId()) return;

            const moyaiCount = getMoyaiCount(message.content);
            const hasDuck = hasDuckEmoji(message.content);

            for (let i = 0; i < moyaiCount; i++) {
                boom(hasDuck);
                await sleep(300);
            }
        },

        MESSAGE_REACTION_ADD({ optimistic, type, channelId, userId, messageAuthorId, emoji }: IReactionAdd) {
            if (optimistic || type !== "MESSAGE_REACTION_ADD") return;
            if (settings.store.ignoreBots && UserStore.getUser(userId)?.bot) return;
            if (settings.store.ignoreBlocked && RelationshipStore.isBlocked(messageAuthorId)) return;
            if (channelId !== SelectedChannelStore.getChannelId()) return;

            const name = emoji.name.toLowerCase();
            const isDuckEmoji = name.includes("duck") || name === DUCK.toLowerCase();
            if (name !== MOYAI && !name.includes("moyai") && !name.includes("moai") && !isDuckEmoji) return;

            boom(isDuckEmoji);
        },

        VOICE_CHANNEL_EFFECT_SEND({ emoji }: IVoiceChannelEffectSendEvent) {
            if (!emoji?.name) return;
            const name = emoji.name.toLowerCase();
            const isDuckEmoji = name.includes("duck") || name === DUCK.toLowerCase();
            if (name !== MOYAI && !name.includes("moyai") && !name.includes("moai") && !isDuckEmoji) return;

            boom(isDuckEmoji);
        }
    }
});

function countOccurrences(sourceString: string, subString: string) {
    let i = 0;
    let lastIdx = 0;
    while ((lastIdx = sourceString.indexOf(subString, lastIdx) + 1) !== 0)
        i++;

    return i;
}

function countMatches(sourceString: string, pattern: RegExp) {
    if (!pattern.global)
        throw new Error("pattern must be global");

    let i = 0;
    while (pattern.test(sourceString))
        i++;

    return i;
}

const customMoyaiRe = /<a?:\w*moy?ai\w*:\d{17,20}>/gi;
const customDuckRe = /<a?:.*?duck.*?:\d{17,20}>/gi;

function getMoyaiCount(message: string) {
    const count = countOccurrences(message, MOYAI)
        + countMatches(message, customMoyaiRe);

    return Math.min(count, 10);
}

function hasDuckEmoji(message: string) {
    // Reset regex state since it's global
    customDuckRe.lastIndex = 0;

    // Check for regular duck emoji and :duck: text
    const hasBasicDuck = DUCK_VARIANTS.some(variant => message.includes(variant));

    // Check for custom server emoji
    const hasCustomDuck = customDuckRe.test(message);

    return hasBasicDuck || hasCustomDuck;
}

let ultraQueue: (() => void)[] = [];
let ultraPlaying = false;

// Expose clearQueue function for SoundStopper plugin
(window as any).__moyaiPlugin = {
    clearQueue: () => {
        ultraQueue = [];
        ultraPlaying = false;
    }
};

async function playUltraBoom(audioElement: HTMLAudioElement) {
    ultraPlaying = true;
    await new Promise<void>((resolve) => {
        audioElement.onended = () => resolve();
        audioElement.onerror = () => resolve();
        audioElement.play();
    });
    ultraPlaying = false;
    if (ultraQueue.length > 0) {
        const next = ultraQueue.shift();
        if (next) next();
    }
}

function boom(isDuck = false) {
    if (!settings.store.triggerWhenUnfocused && !document.hasFocus()) return;
    const audioElement = document.createElement("audio");

    audioElement.src = settings.store.ultraMode
        ? (settings.store.quality === "HD" ? MOYAI_URL_ULTRA_HD : MOYAI_URL_ULTRA)
        : (settings.store.quality === "HD" ? MOYAI_URL_HD : MOYAI_URL);

    audioElement.volume = settings.store.volume;

    if (settings.store.ultraMode) {
        const playFn = () => playUltraBoom(audioElement);
        if (ultraPlaying) {
            ultraQueue.push(playFn);
        } else {
            playFn();
        }
    } else {
        audioElement.play();
    }
}
