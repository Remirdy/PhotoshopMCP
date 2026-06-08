/**
 * @remirdy/shared — jobTypes.ts
 * Canonical type definitions for MCP → Bridge → UXP job protocol.
 */
export function makeResult(ok, message, data, jobId, photoshopStatus = "connected", warnings = []) {
    return { ok, message, data, warnings, jobId, photoshopStatus };
}
export function makeOk(data, jobId, message = "Operation completed successfully.", warnings = []) {
    return makeResult(true, message, data, jobId, "connected", warnings);
}
export function makeError(message, jobId) {
    return makeResult(false, message, null, jobId, "error");
}
// ─── App Icon Sizes ───────────────────────────────────────────────────────────
export const IOS_ICON_SIZES = [20, 29, 40, 58, 60, 76, 80, 87, 120, 152, 167, 180, 1024];
export const ANDROID_ICON_SIZES = [36, 48, 72, 96, 144, 192, 512];
export const WEB_ICON_SIZES = [16, 32, 48, 64, 128, 256, 512];
export const AD_BANNER_SIZES = [
    { name: "leaderboard", width: 728, height: 90 },
    { name: "medium_rect", width: 300, height: 250 },
    { name: "wide_skyscraper", width: 160, height: 600 },
    { name: "mobile_banner", width: 320, height: 50 },
    { name: "half_page", width: 300, height: 600 },
    { name: "large_rect", width: 336, height: 280 },
    { name: "billboard", width: 970, height: 250 },
];
export const STEAM_ASSET_SIZES = [
    { name: "capsule_sm", width: 231, height: 87 },
    { name: "capsule_main", width: 616, height: 353 },
    { name: "header", width: 460, height: 215 },
    { name: "library_hero", width: 3840, height: 1240 },
    { name: "library_logo", width: 1280, height: 720 },
];
