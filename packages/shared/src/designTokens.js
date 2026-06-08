/**
 * @remirdy/shared — designTokens.ts
 * Reusable design token themes for Remirdy Photoshop MCP.
 * All themes are public-safe and fictional.
 */
// ─── Premium Game UI ──────────────────────────────────────────────────────────
export const premiumGameUI = {
    name: "premium_game_ui",
    colors: {
        bgBase: "#140B2E",
        bgSecondary: "#070B22",
        panel: "#2A164C",
        panelLight: "#4B2A7A",
        panelStroke: "#6B45A0",
        accent: "#F7B833",
        accentLight: "#FFE08A",
        textPrimary: "#FFF2C8",
        textSecondary: "#C8B8E8",
        danger: "#E8424A",
        success: "#1FB65C",
        info: "#237BFF",
        warning: "#FF8A1F",
        // game-specific extras
        bgDeepPurple: "#140B2E",
        bgNavy: "#070B22",
        panelPurple: "#2A164C",
        panelPurpleLight: "#4B2A7A",
        gold: "#F7B833",
        creamText: "#FFF2C8",
        white: "#FFFFFF",
        red: "#E8424A",
        blue: "#237BFF",
        green: "#1FB65C",
        pink: "#FF5AAE",
        orange: "#FF8A1F",
        darkGreen: "#006B3E",
    },
    radii: {
        small: 12,
        medium: 24,
        large: 42,
        capsule: 999,
    },
    shadows: {
        soft: { opacity: 25, blur: 16, distance: 6, angle: 90, color: "#000000" },
        deep: { opacity: 45, blur: 28, distance: 12, angle: 90, color: "#000000" },
        inner: { opacity: 20, blur: 10, distance: 4, angle: 90, color: "#000000" },
    },
    typography: {
        hudFont: "Arial Rounded MT Bold",
        bodyFont: "Arial",
        fallback: "Arial",
    },
};
// ─── Soft Game ────────────────────────────────────────────────────────────────
export const softGame = {
    name: "soft_game",
    colors: {
        bgBase: "#F0EBF8",
        bgSecondary: "#E2D8F2",
        panel: "#FFFFFF",
        panelLight: "#F8F4FF",
        panelStroke: "#C8A8F0",
        accent: "#A855F7",
        accentLight: "#D8B4FE",
        textPrimary: "#3B2060",
        textSecondary: "#7C5AA8",
        danger: "#EF4444",
        success: "#22C55E",
        info: "#3B82F6",
        warning: "#F59E0B",
    },
    radii: { small: 16, medium: 28, large: 48, capsule: 999 },
    shadows: {
        soft: { opacity: 15, blur: 20, distance: 8, color: "#8B5CF6" },
        deep: { opacity: 30, blur: 32, distance: 16, color: "#7C3AED" },
        inner: { opacity: 10, blur: 8, distance: 3, color: "#8B5CF6" },
    },
    typography: {
        hudFont: "Nunito",
        bodyFont: "Nunito",
        fallback: "Arial Rounded MT Bold",
    },
};
// ─── iOS Glass ────────────────────────────────────────────────────────────────
export const iosGlass = {
    name: "ios_glass",
    colors: {
        bgBase: "#1C1C1E",
        bgSecondary: "#2C2C2E",
        panel: "rgba(44,44,46,0.85)",
        panelLight: "rgba(58,58,60,0.90)",
        panelStroke: "rgba(255,255,255,0.18)",
        accent: "#0A84FF",
        accentLight: "#409CFF",
        textPrimary: "#FFFFFF",
        textSecondary: "rgba(235,235,245,0.60)",
        danger: "#FF453A",
        success: "#30D158",
        info: "#0A84FF",
        warning: "#FFD60A",
    },
    radii: { small: 10, medium: 20, large: 32, capsule: 999 },
    shadows: {
        soft: { opacity: 20, blur: 12, distance: 4, color: "#000000" },
        deep: { opacity: 40, blur: 24, distance: 10, color: "#000000" },
        inner: { opacity: 10, blur: 6, distance: 2, color: "#000000" },
    },
    typography: {
        hudFont: "SF Pro Display",
        bodyFont: "SF Pro Text",
        fallback: "Helvetica Neue",
    },
};
// ─── Dark Luxury ──────────────────────────────────────────────────────────────
export const darkLuxury = {
    name: "dark_luxury",
    colors: {
        bgBase: "#0D0D0D",
        bgSecondary: "#1A1A1A",
        panel: "#1E1E1E",
        panelLight: "#2A2A2A",
        panelStroke: "#B8966A",
        accent: "#C9A84C",
        accentLight: "#F0D78C",
        textPrimary: "#F5EDD8",
        textSecondary: "#A89878",
        danger: "#C0392B",
        success: "#27AE60",
        info: "#2980B9",
        warning: "#F39C12",
    },
    radii: { small: 4, medium: 8, large: 16, capsule: 999 },
    shadows: {
        soft: { opacity: 30, blur: 14, distance: 5, color: "#000000" },
        deep: { opacity: 60, blur: 30, distance: 14, color: "#000000" },
        inner: { opacity: 15, blur: 8, distance: 3, color: "#000000" },
    },
    typography: {
        hudFont: "Playfair Display",
        bodyFont: "Montserrat",
        fallback: "Georgia",
    },
};
// ─── Clean SaaS ───────────────────────────────────────────────────────────────
export const cleanSaas = {
    name: "clean_saas",
    colors: {
        bgBase: "#FFFFFF",
        bgSecondary: "#F8FAFC",
        panel: "#FFFFFF",
        panelLight: "#F1F5F9",
        panelStroke: "#E2E8F0",
        accent: "#6366F1",
        accentLight: "#A5B4FC",
        textPrimary: "#0F172A",
        textSecondary: "#64748B",
        danger: "#EF4444",
        success: "#22C55E",
        info: "#3B82F6",
        warning: "#F59E0B",
    },
    radii: { small: 6, medium: 12, large: 20, capsule: 999 },
    shadows: {
        soft: { opacity: 8, blur: 8, distance: 2, color: "#94A3B8" },
        deep: { opacity: 15, blur: 20, distance: 8, color: "#64748B" },
        inner: { opacity: 5, blur: 4, distance: 1, color: "#CBD5E1" },
    },
    typography: {
        hudFont: "Inter",
        bodyFont: "Inter",
        fallback: "system-ui",
    },
};
// ─── Arcade Bold ──────────────────────────────────────────────────────────────
export const arcadeBold = {
    name: "arcade_bold",
    colors: {
        bgBase: "#000033",
        bgSecondary: "#00001A",
        panel: "#000066",
        panelLight: "#0000AA",
        panelStroke: "#FFFF00",
        accent: "#FF0066",
        accentLight: "#FF66AA",
        textPrimary: "#FFFFFF",
        textSecondary: "#AAAAFF",
        danger: "#FF0000",
        success: "#00FF00",
        info: "#0088FF",
        warning: "#FFFF00",
    },
    radii: { small: 0, medium: 4, large: 8, capsule: 4 },
    shadows: {
        soft: { opacity: 80, blur: 0, distance: 4, color: "#FFFF00" },
        deep: { opacity: 100, blur: 0, distance: 6, color: "#FF0066" },
        inner: { opacity: 50, blur: 2, distance: 2, color: "#0000FF" },
    },
    typography: {
        hudFont: "Press Start 2P",
        bodyFont: "Courier New",
        fallback: "monospace",
    },
};
// ─── Theme Registry ───────────────────────────────────────────────────────────
export const THEMES = {
    premium_game_ui: premiumGameUI,
    premium_purple: premiumGameUI,
    soft_game: softGame,
    ios_glass: iosGlass,
    dark_luxury: darkLuxury,
    clean_saas: cleanSaas,
    arcade_bold: arcadeBold,
    glass_dark: iosGlass,
    luxury_dark: darkLuxury,
};
export function getTheme(name) {
    return THEMES[name] ?? premiumGameUI;
}
