/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { definePluginSettings } from "@api/Settings";
import { Devs } from "@utils/constants";
import definePlugin, { OptionType } from "@utils/types";

// Minimal settings used by the menu component.
export const settings = definePluginSettings({
    showPluginMenu: {
        description: "Show a Plugins entry in the context menu.",
        type: OptionType.BOOLEAN,
        default: true,
    },
});

export default definePlugin({
    name: "nunToolbox",
    description: "Provides a plugin list entry in the context menu.",
    authors: [Devs.Ven],
    settings,
});
