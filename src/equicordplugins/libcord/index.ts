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

import { Devs } from "@utils/constants";
import { sleep } from "@utils/misc";
import definePlugin from "@utils/types";
import { RelationshipStore, SelectedChannelStore, UserStore } from "@webpack/common";
import type { Message, ReactionEmoji } from "@vencord/discord-types";

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
    emoji?: ReactionEmoji;
    channelId: string;
    userId: string;
    animationType: number;
    animationId: number;
}

const BREAD = "🍞";
const BREAD_VARIANTS = [":bread:", "🍞", ":🍞:", "bread"] as const;
const BREAD_URL = "https://pub-e77fd37d275f481896833bda931f1d70.r2.dev/moyai.WAV";

export default definePlugin({
    name: "Libcord",
    authors: [Devs.rayanzay],
    description: "nun libs 👀",
    required: true,

    flux: {
        async MESSAGE_CREATE({ optimistic, type, message, channelId }: IMessageCreate) {
            if (optimistic || type !== "MESSAGE_CREATE") return;
            if (message.state === "SENDING") return;
            if (message.author?.bot) return;
            if (RelationshipStore.isBlocked(message.author?.id)) return;
            if (!message.content) return;
            if (channelId !== SelectedChannelStore.getChannelId()) return;

            const breadCount = getBreadCount(message.content);

            for (let i = 0; i < breadCount; i++) {
                toast();
                await sleep(300);
            }
        },

        MESSAGE_REACTION_ADD({ optimistic, type, channelId, userId, messageAuthorId, emoji }: IReactionAdd) {
            if (optimistic || type !== "MESSAGE_REACTION_ADD") return;
            if (UserStore.getUser(userId)?.bot) return;
            if (RelationshipStore.isBlocked(messageAuthorId)) return;
            if (channelId !== SelectedChannelStore.getChannelId()) return;

            const name = emoji.name.toLowerCase();
            const isBreadEmoji = name.includes("bread") || name === BREAD.toLowerCase();
            if (!isBreadEmoji) return;

            toast();
        },

        VOICE_CHANNEL_EFFECT_SEND({ emoji }: IVoiceChannelEffectSendEvent) {
            if (!emoji?.name) return;
            const name = emoji.name.toLowerCase();
            const isBreadEmoji = name.includes("bread") || name === BREAD.toLowerCase();
            if (!isBreadEmoji) return;

            toast();
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

const customBreadRe = /<a?:.*?bread.*?:\d{17,20}>/gi;

function getBreadCount(message: string) {
    const count = countOccurrences(message, BREAD)
        + countMatches(message, customBreadRe);

    return Math.min(count, 10);
}

function toast() {
    const audioElement = document.createElement("audio");
    audioElement.src = BREAD_URL;
    audioElement.volume = 1.0; // Fixed volume at 50%
    audioElement.play();
}
