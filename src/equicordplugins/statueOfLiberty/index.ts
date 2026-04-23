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
import type { Message, ReactionEmoji } from "@vencord/discord-types";
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

const STATUE = "🗽";
const STATUE_VARIANTS = [":statue_of_liberty:", "🗽", ":🗽:", "statue_of_liberty", "statue of liberty"] as const;

// Updated URLs for statue sounds
const STATUE_SOUNDS = {
    normal: {
        regular: "https://github.com/Equicord/Equibored/raw/main/sounds/moyai/moyai.mp3",
        hd: "https://github.com/Equicord/Equibored/raw/main/sounds/moyai/moyai.mp3"
    },
    ultra: {
        regular: "https://github.com/Equicord/Equibored/raw/main/sounds/moyai/moyai.mp3",
        hd: "https://github.com/Equicord/Equibored/raw/main/sounds/moyai/moyai.mp3"
    }
};

const settings = definePluginSettings({
    volume: {
        description: "Volume of the 🗽🗽🗽",
        type: OptionType.SLIDER,
        markers: makeRange(0, 1, 0.1),
        default: 0.5,
        stickToMarkers: false
    },
    quality: {
        description: "Quality of the 🗽🗽🗽",
        type: OptionType.SELECT,
        options: [
            { label: "Normal", value: "Normal", default: true },
            { label: "HD", value: "HD" }
        ],
    },
    triggerWhenUnfocused: {
        description: "Trigger the 🗽 even when the window is unfocused",
        type: OptionType.BOOLEAN,
        default: true
    },
    ultraMode: {
        description: "nun's special 🗽 feature!!",
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
    name: "StatueOfLiberty",
    authors: [Devs.rayanzay],
    description: "🗽🗽🗽🗽🗽",
    settings,

    flux: {
        async MESSAGE_CREATE({ optimistic, type, message, channelId }: IMessageCreate) {
            if (optimistic || type !== "MESSAGE_CREATE") return;
            if (message.state === "SENDING") return;
            if (settings.store.ignoreBots && message.author?.bot) return;
            if (settings.store.ignoreBlocked && RelationshipStore.isBlocked(message.author?.id)) return;
            if (!message.content) return;
            if (channelId !== SelectedChannelStore.getChannelId()) return;

            const statueCount = countStatues(message.content);

            for (let i = 0; i < statueCount; i++) {
                boom();
                await sleep(300);
            }
        },

        MESSAGE_REACTION_ADD({ optimistic, type, channelId, userId, messageAuthorId, emoji }: IReactionAdd) {
            if (optimistic || type !== "MESSAGE_REACTION_ADD") return;
            if (settings.store.ignoreBots && UserStore.getUser(userId)?.bot) return;
            if (settings.store.ignoreBlocked && RelationshipStore.isBlocked(messageAuthorId)) return;
            if (channelId !== SelectedChannelStore.getChannelId()) return;

            const name = emoji.name.toLowerCase();
            if (!isStatueEmoji(name)) return;

            boom();
        },

        VOICE_CHANNEL_EFFECT_SEND({ emoji }: IVoiceChannelEffectSendEvent) {
            if (!emoji?.name) return;
            if (!isStatueEmoji(emoji.name.toLowerCase())) return;

            boom();
        }
    }
});

function countOccurrences(sourceString: string, subString: string) {
    let count = 0;
    let position = sourceString.toLowerCase().indexOf(subString.toLowerCase());
    while (position !== -1) {
        count++;
        position = sourceString.toLowerCase().indexOf(subString.toLowerCase(), position + 1);
    }
    return count;
}

const customStatueRe = /<a?:[\w_]*?(statue|liberty)[\w_]*?:\d{17,20}>/gi;

function countStatues(message: string) {
    // Count regular statue emojis
    const regularCount = countOccurrences(message, STATUE);

    // Count custom server emojis
    let customCount = 0;
    const customMatches = message.match(customStatueRe);
    if (customMatches) {
        customCount = customMatches.length;
    }

    // Count text variants
    const textCount = STATUE_VARIANTS.reduce((acc, variant) =>
        acc + countOccurrences(message, variant), 0);

    return Math.min(regularCount + customCount + textCount, 10);
}

function isStatueEmoji(name: string) {
    const normalizedName = name.toLowerCase();
    return normalizedName.includes("statue") ||
        normalizedName.includes("liberty") ||
        normalizedName === STATUE.toLowerCase() ||
        STATUE_VARIANTS.some(v => normalizedName.includes(v.toLowerCase()));
}

function boom() {
    if (!settings.store.triggerWhenUnfocused && !document.hasFocus()) return;

    const audioElement = document.createElement("audio");
    const soundSet = settings.store.ultraMode ? STATUE_SOUNDS.ultra : STATUE_SOUNDS.normal;
    audioElement.src = settings.store.quality === "HD" ? soundSet.hd : soundSet.regular;
    audioElement.volume = settings.store.volume;

    const playPromise = audioElement.play();
    if (playPromise) {
        playPromise.catch(console.error);
    }
}
