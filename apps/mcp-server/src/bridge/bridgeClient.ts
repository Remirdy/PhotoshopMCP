/**
 * mcp-server — bridgeClient.ts
 * HTTP client that talks to the local bridge.
 * Supports mock mode when Photoshop is not connected.
 */
import fs from "fs";
import path from "path";
import type { JobResult, JobType } from "@remirdy/shared";
import { makeOk, makeError } from "@remirdy/shared";
import { logger } from "../utils/logger.js";
import { nanoid } from "nanoid";

const BRIDGE_URL = process.env.BRIDGE_URL ?? "http://localhost:47831";
const TOKEN = process.env.REMIRDY_BRIDGE_TOKEN ?? "dev_insecure_token";
const MOCK_MODE = process.env.MOCK_MODE === "true";
const WORKSPACE = process.env.REMIRDY_WORKSPACE ?? "/tmp/remirdy-workspace";
const REQUEST_TIMEOUT_MS = 65_000;
const MAX_RETRIES = 2;

export interface BridgeClientOptions {
  bridgeUrl?: string;
  token?: string;
  mockMode?: boolean;
  workspace?: string;
}

export class BridgeClient {
  private bridgeUrl: string;
  private token: string;
  private mockMode: boolean;
  private workspace: string;

  constructor(opts: BridgeClientOptions = {}) {
    this.bridgeUrl = opts.bridgeUrl ?? BRIDGE_URL;
    this.token = opts.token ?? TOKEN;
    this.mockMode = opts.mockMode ?? MOCK_MODE;
    this.workspace = opts.workspace ?? WORKSPACE;
  }

  /**
   * Send a job to the bridge and wait for the result.
   * Falls back to mock mode if bridge is unreachable or Photoshop is not connected.
   */
  async sendJob<T = unknown>(
    type: JobType,
    payload: unknown = {}
  ): Promise<JobResult<T>> {
    const jobId = `job_${nanoid(10)}`;

    if (this.mockMode) {
      return this.mockResponse<T>(type, payload, jobId);
    }

    try {
      const response = await this.fetchWithRetry(`${this.bridgeUrl}/jobs`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Bridge-Token": this.token,
        },
        body: JSON.stringify({ type, payload }),
      });

      if (!response.ok) {
        const text = await response.text();
        logger.warn("Bridge returned non-OK status", { status: response.status, text });
        if (response.status === 202) {
          // Plugin not connected — switch to mock
          return this.mockResponse<T>(type, payload, jobId);
        }
        return makeError(`Bridge error ${response.status}: ${text}`, jobId) as JobResult<T>;
      }

      const result = (await response.json()) as JobResult<T>;
      return result;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      logger.warn("Bridge unreachable, falling back to mock mode", { error: msg });
      return this.mockResponse<T>(type, payload, jobId, [
        `Bridge unreachable (${msg}). Running in mock mode.`,
      ]);
    }
  }

  /**
   * Check bridge health.
   */
  async healthCheck(): Promise<{ ok: boolean; message: string }> {
    try {
      const response = await this.fetchWithRetry(`${this.bridgeUrl}/health`, {
        headers: { "X-Bridge-Token": this.token },
      }, 3000, 1);
      if (response.ok) return { ok: true, message: "Bridge is running" };
      return { ok: false, message: `Bridge returned ${response.status}` };
    } catch (err) {
      return { ok: false, message: `Bridge unreachable: ${err instanceof Error ? err.message : err}` };
    }
  }

  /**
   * Get Photoshop status from bridge.
   */
  async photoshopStatus(): Promise<{
    connected: boolean;
    pluginVersion: string | null;
    photoshopVersion: string | null;
    activeDocument: string | null;
  }> {
    try {
      const response = await this.fetchWithRetry(`${this.bridgeUrl}/photoshop/status`, {
        headers: { "X-Bridge-Token": this.token },
      }, 3000, 1);
      if (!response.ok) {
        return { connected: false, pluginVersion: null, photoshopVersion: null, activeDocument: null };
      }
      return (await response.json()) as {
        connected: boolean;
        pluginVersion: string | null;
        photoshopVersion: string | null;
        activeDocument: string | null;
      };
    } catch {
      return { connected: false, pluginVersion: null, photoshopVersion: null, activeDocument: null };
    }
  }

  /**
   * Generate mock output for development / CI when Photoshop is not connected.
   */
  private mockResponse<T>(
    type: JobType,
    payload: unknown,
    jobId: string,
    extraWarnings: string[] = []
  ): JobResult<T> {
    const warnings = [
      "Photoshop plugin not connected; mock output created.",
      ...extraWarnings,
    ];

    // Write mock files for workflow operations
    const mockData = this.generateMockData(type, payload);
    this.writeMockOutput(type, payload, jobId, mockData);

    return {
      ok: true,
      message: `[MOCK] ${type} acknowledged. No Photoshop connection — mock output written.`,
      data: mockData as T,
      warnings,
      jobId,
      photoshopStatus: "disconnected",
    };
  }

  private generateMockData(type: JobType, payload: unknown): unknown {
    const p = payload as Record<string, unknown>;
    switch (type) {
      case "createDocument":
        return {
          documentId: "mock_doc_001",
          name: p.name ?? "MockDocument",
          width: p.width ?? 1290,
          height: p.height ?? 2796,
        };
      case "inspectDocument":
        return {
          name: "MockDocument",
          width: 1290,
          height: 2796,
          resolution: 72,
          colorMode: "RGB",
          layerCount: 0,
          groupCount: 0,
        };
      case "inspectLayerTree":
        return { layers: [], message: "No document open in mock mode" };
      case "ping":
        return { responseTimeMs: 0, mock: true };

      case "imageToPsdLayered": {
        const outPath = String(p.outputPsdPath || "mock.psd");
        try {
          fs.mkdirSync(path.dirname(outPath), { recursive: true });
          fs.writeFileSync(outPath, "MOCK PSD FILE CONTENT", "utf-8");
        } catch {}
        return { created: true, layers: ["Subject", "Background"], psdPath: outPath };
      }

      case "sliceSpriteSheet": {
        const folder = String(p.outputFolder || "mock_frames");
        try {
          fs.mkdirSync(folder, { recursive: true });
          fs.writeFileSync(path.join(folder, "frame_01.png"), "MOCK PNG", "utf-8");
          fs.writeFileSync(path.join(folder, "frame_02.png"), "MOCK PNG", "utf-8");
        } catch {}
        return { sliced: true, framesCount: 2, outputFolder: folder };
      }

      case "packSpriteSheetAtlas": {
        const atlasPath = String(p.outputAtlasPath || "atlas.png");
        const manifestPath = String(p.outputManifestPath || "manifest.json");
        try {
          fs.mkdirSync(path.dirname(atlasPath), { recursive: true });
          fs.mkdirSync(path.dirname(manifestPath), { recursive: true });
          fs.writeFileSync(atlasPath, "MOCK ATLAS PNG", "utf-8");
          fs.writeFileSync(manifestPath, JSON.stringify({ frames: [] }, null, 2), "utf-8");
        } catch {}
        return { packed: true, atlasPath, manifestPath };
      }

      case "exportAppIconPack": {
        const folder = String(p.outputFolder || "mock_icons");
        try {
          fs.mkdirSync(folder, { recursive: true });
          fs.writeFileSync(path.join(folder, "icon_1024.png"), "MOCK ICON", "utf-8");
          fs.writeFileSync(path.join(folder, "icon_512.png"), "MOCK ICON", "utf-8");
        } catch {}
        return { exported: true, count: 2, outputFolder: folder };
      }

      case "colorGradePreset": {
        return { applied: true, preset: p.preset, layerName: p.layerName };
      }

      case "generateHandoffSpec": {
        const outPath = String(p.outputPath || "handoff.md");
        try {
          fs.mkdirSync(path.dirname(outPath), { recursive: true });
          const content = `# Developer Handoff Spec (MOCK)\n\nGenerated for MockDocument.\n\n## Layers\n- **Background** (Type: solidColorLayer, Bounds: 0,0 to 1290,2796)\n- **Subject** (Type: rasterLayer, Bounds: 100,200 to 800,1200)\n\n## SwiftUI Code\n\`\`\`swift\nstruct MockView: View {\n    var body: some View {\n        ZStack {\n            Color(red: 0.196, green: 0.106, blue: 0.345)\n        }\n    }\n}\n\`\`\`\n`;
          fs.writeFileSync(outPath, content, "utf-8");
        } catch (e) {
          logger.warn("Mock handoff write failed: " + (e instanceof Error ? e.message : String(e)));
        }
        return { generated: true, specPath: outPath, format: p.format || "markdown" };
      }

      // ─── Creative Mocks ──────────────────────────────────────────────────────

      case "createCharacterConceptSheet": {
        return {
          created: true,
          projectName: p.projectName,
          views: p.views ?? ["front", "side", "back"],
          artboardSize: p.artboardSize ?? 1024,
          artboardsCount: (p.views as string[] ?? ["front", "side", "back"]).length,
        };
      }

      case "createTilesetTemplate": {
        return {
          created: true,
          columns: p.columns,
          rows: p.rows,
          tileSize: p.tileSize,
          padding: p.padding ?? 0,
          totalGridWidth: (p.columns as number) * (p.tileSize as number),
          totalGridHeight: (p.rows as number) * (p.tileSize as number),
        };
      }

      case "createVfxFlipbook": {
        return {
          created: true,
          frameCount: p.frameCount,
          frameWidth: p.frameWidth,
          frameHeight: p.frameHeight,
          atlasWidth: (p.frameCount as number) * (p.frameWidth as number),
          atlasHeight: p.frameHeight,
        };
      }

      case "createParallaxScene": {
        return {
          created: true,
          theme: p.theme,
          layersCount: p.layersCount ?? 5,
          layers: Array.from({ length: (p.layersCount as number ?? 5) }, (_, i) => `Layer_Depth_${i}`),
        };
      }

      case "createLoadingScreenTemplate": {
        return {
          created: true,
          title: p.title,
          progress: p.progress ?? 0,
          style: p.style ?? "premium_purple",
        };
      }

      case "createSplashScreenTemplate": {
        return {
          created: true,
          title: p.title,
          subtitle: p.subtitle,
          style: p.style ?? "premium_purple",
        };
      }

      case "createIconSet": {
        const sizes = p.sizes as number[] ?? [16, 32, 48, 64, 128, 256, 512, 1024];
        return {
          created: true,
          name: p.name,
          sizesGeneratedCount: sizes.length,
          sizes,
        };
      }

      // ─── Game Dev Mocks ──────────────────────────────────────────────────────

      case "createColorVariants": {
        const count = p.variantsCount as number ?? 3;
        const variants = Array.from({ length: count }, (_, i) => `${p.layerName}_variant_${i + 1}`);
        return {
          created: true,
          sourceLayer: p.layerName,
          variantsCount: count,
          hueStep: p.hueStep ?? 45,
          variants,
        };
      }

      case "createRigReadyCharacter": {
        const parts = p.parts as string[] ?? ["head", "torso", "arm_left", "arm_right", "leg_left", "leg_right"];
        return {
          created: true,
          characterName: p.characterName,
          partsSegmented: parts,
          foldersCreated: parts.map(part => `Rig_${p.characterName}_${part}`),
        };
      }

      case "createUiSkinFromTokens": {
        const tokenKeys = Object.keys(p.tokens as Record<string, string> ?? {});
        return {
          applied: true,
          tokensCount: tokenKeys.length,
          affectedLayersCount: tokenKeys.length * 2,
        };
      }

      case "createNineSliceTemplate": {
        return {
          created: true,
          width: p.width,
          height: p.height,
          borderSize: p.borderSize,
          guides: {
            horizontal: [p.borderSize, (p.height as number) - (p.borderSize as number)],
            vertical: [p.borderSize, (p.width as number) - (p.borderSize as number)],
          },
        };
      }

      // ─── Visual Editing Mocks ────────────────────────────────────────────────

      case "removeBackground": {
        return {
          removed: true,
          mode: p.mode ?? "ai",
          targetLayer: p.layerName ?? "Active Layer",
          maskCreated: true,
        };
      }

      case "swapBackground": {
        return {
          swapped: true,
          subjectLayerName: p.subjectLayerName,
          backgroundAssetPath: p.backgroundAssetPath,
          newBackgroundLayerName: "Background_Swapped",
        };
      }

      case "frequencySeparation": {
        const radius = p.radius ?? 6;
        return {
          separated: true,
          targetLayer: p.layerName ?? "Active Layer",
          radius,
          layersCreated: ["High Frequency Detail", "Low Frequency Color"],
        };
      }

      case "dodgeBurnSetup": {
        return {
          setup: true,
          targetLayer: p.layerName ?? "Active Layer",
          strength: p.strength ?? 50,
          layersCreated: ["Dodge_SoftLight", "Burn_SoftLight"],
        };
      }

      case "smartFilterStack": {
        const filters = p.filters as string[] ?? ["blur", "sharpen"];
        return {
          applied: true,
          targetLayer: p.layerName ?? "Active Layer",
          filtersApplied: filters,
          convertedToSmartObject: true,
        };
      }

      // ─── Platform Export Mocks ────────────────────────────────────────────────

      case "exportReactNativeAssets": {
        const outDir = String(p.outputPath || "mock_rn_assets");
        const scaleFactors = p.scaleFactors as number[] ?? [1, 2, 3];
        try {
          fs.mkdirSync(outDir, { recursive: true });
          fs.writeFileSync(
            path.join(outDir, "assets.ts"),
            `export const assets = {\n  logo: {\n    uri: require('./logo.png')\n  }\n};\n`,
            "utf-8"
          );
          for (const factor of scaleFactors) {
            const factorStr = factor === 1 ? "" : `@${factor}x`;
            fs.writeFileSync(path.join(outDir, `logo${factorStr}.png`), "MOCK PNG", "utf-8");
          }
        } catch {}
        return {
          exported: true,
          outputPath: outDir,
          scaleFactors,
          filesGenerated: ["assets.ts", ...scaleFactors.map(f => `logo${f === 1 ? "" : `@${f}x`}.png`)],
        };
      }

      case "exportFlutterAssets": {
        const outDir = String(p.outputPath || "mock_flutter_assets");
        const scaleFactors = p.scaleFactors as number[] ?? [1, 1.5, 2, 3, 4];
        try {
          fs.mkdirSync(outDir, { recursive: true });
          for (const factor of scaleFactors) {
            const suffix = factor === 1 ? "" : `/${factor}.0x`;
            const suffixDir = path.join(outDir, suffix);
            fs.mkdirSync(suffixDir, { recursive: true });
            fs.writeFileSync(path.join(suffixDir, "logo.png"), "MOCK PNG", "utf-8");
          }
        } catch {}
        return {
          exported: true,
          outputPath: outDir,
          scaleFactors,
          pubspecSnippet: `flutter:\n  assets:\n    - assets/logo.png\n`,
        };
      }

      case "exportUnityPackage": {
        const outDir = String(p.outputPath || "mock_unity_assets");
        const atlasPath = String(p.atlasPath || "atlas.png");
        const metaPath = `${path.join(outDir, path.basename(atlasPath))}.meta`;
        try {
          fs.mkdirSync(outDir, { recursive: true });
          fs.writeFileSync(
            metaPath,
            `fileFormatVersion: 2\nguid: d3b07384d113edec49eaa6238ad5ff00\nTextureImporter:\n  spriteMode: 2\n`,
            "utf-8"
          );
        } catch {}
        return {
          exported: true,
          outputPath: outDir,
          atlasPath,
          metaFileCreated: metaPath,
        };
      }

      case "exportGodotSpritesheet": {
        const outDir = String(p.outputPath || "mock_godot_assets");
        const sheetPath = String(p.spritesheetPath || "spritesheet.png");
        const tresPath = path.join(outDir, "spritesheet.tres");
        try {
          fs.mkdirSync(outDir, { recursive: true });
          fs.writeFileSync(
            tresPath,
            `[gd_resource type="SpriteFrames" format=2]\n[resource]\nanimations = [ {\n"frames": [  ],\n"loop": true,\n"name": "default",\n"speed": 5.0\n} ]\n`,
            "utf-8"
          );
        } catch {}
        return {
          exported: true,
          outputPath: outDir,
          spritesheetPath: sheetPath,
          tresFileCreated: tresPath,
        };
      }

      case "exportOpenGraphPack": {
        const outDir = String(p.outputPath || "mock_og_assets");
        try {
          fs.mkdirSync(outDir, { recursive: true });
          fs.writeFileSync(path.join(outDir, "og_1200x630.png"), "MOCK PNG", "utf-8");
          fs.writeFileSync(path.join(outDir, "twitter_800x418.png"), "MOCK PNG", "utf-8");
        } catch {}
        return {
          exported: true,
          outputPath: outDir,
          title: p.title,
          filesGenerated: ["og_1200x630.png", "twitter_800x418.png"],
        };
      }

      case "exportAdBannerPack": {
        const outDir = String(p.outputPath || "mock_banners");
        const sizes = [
          { name: "leaderboard", width: 728, height: 90 },
          { name: "medium_rect", width: 300, height: 250 },
          { name: "wide_skyscraper", width: 160, height: 600 },
          { name: "mobile_banner", width: 320, height: 50 },
        ];
        try {
          fs.mkdirSync(outDir, { recursive: true });
          for (const size of sizes) {
            fs.writeFileSync(path.join(outDir, `${p.campaignName}_${size.name}.png`), "MOCK BANNER PNG", "utf-8");
          }
        } catch {}
        return {
          exported: true,
          outputPath: outDir,
          campaignName: p.campaignName,
          bannersGenerated: sizes.map(s => `${p.campaignName}_${s.name}.png`),
        };
      }

      // ─── QA & Inspect Mocks ──────────────────────────────────────────────────

      case "analyzeLayerUsage": {
        return {
          analyzed: true,
          unusedLayers: ["Layer 14 copy", "temp_asset_placeholder"],
          emptyLayers: ["Layer 21", "Group 2"],
          duplicateLayerNames: ["Background", "Layer 1"],
          readinessScore: 78,
        };
      }

      case "analyzeColorPalette": {
        return {
          analyzed: true,
          maxColors: p.maxColors ?? 16,
          dominantColors: [
            { hex: "#140b2e", percentage: 45 },
            { hex: "#ff2a6d", percentage: 25 },
            { hex: "#05d9e8", percentage: 15 },
            { hex: "#ffffff", percentage: 10 },
          ],
        };
      }

      case "checkAccessibilityContrast": {
        return {
          contrastRatio: 4.85,
          compliant: true,
          wcagLevel: "AA",
          textLayer: p.textLayerName,
          backgroundLayer: p.backgroundLayerName,
        };
      }

      case "auditFonts": {
        return {
          audited: true,
          fontsFound: ["Arial", "Inter-Bold", "Outfit-Medium"],
          missingFonts: [],
          compliant: true,
        };
      }

      case "batchReplaceText": {
        return {
          replaced: true,
          findString: p.find,
          replaceString: p.replace,
          occurrencesFoundCount: 4,
          layersModified: ["Modal_Title", "Modal_Message", "Confirm_Button_Text"],
        };
      }

      case "generatePsdDiff": {
        return {
          diffGenerated: true,
          addedLayers: ["Popup_Dim_Scrim", "Modal_Icon"],
          deletedLayers: ["temp_placeholder"],
          renamedLayers: [
            { from: "Confirm_Btn", to: "Confirm_Button" },
          ],
          modifiedLayers: ["Modal_Panel"],
        };
      }

      case "checkBrandCompliance": {
        return {
          compliant: true,
          violations: [],
          score: 100,
        };
      }

      case "checkResolutions": {
        return {
          audited: true,
          minDpi: p.minDpi ?? 72,
          lowResolutionLayers: [],
          documentDpi: 72,
        };
      }

      // ─── Extra QA Mocks ──────────────────────────────────────────────────────

      case "checkBrandColors": {
        return {
          audited: true,
          violations: ["Layer_4_Warning_Fill", "Button_Accent_Border"],
          compliant: false,
          brandColorsChecked: p.brandColors,
        };
      }

      case "findMissingPlaceholders": {
        return {
          audited: true,
          placeholdersFound: ["temp_bg_asset", "placeholder_avatar"],
          count: 2,
        };
      }

      case "checkTextEditability": {
        return {
          audited: true,
          rasterizedTextLayers: ["HeaderTitle_rasterized"],
          editableTextLayers: ["SubtitleText", "BodyCopyText"],
          score: 66,
        };
      }

      case "checkSmartObjects": {
        return {
          audited: true,
          smartObjectsCount: 4,
          embeddedCount: 3,
          linkedCount: 1,
          linkedSmartObjects: ["/Users/designer/shared/icons.psd"],
        };
      }

      case "validateExportReadiness": {
        return {
          ready: true,
          checklist: p.checklistName ?? "general",
          score: 95,
          warnings: ["Layer naming violations found in Bottom_HUD"],
        };
      }

      case "generateQaReport": {
        const outPath = String(p.outputPath || "qa_report.json");
        try {
          fs.mkdirSync(path.dirname(outPath), { recursive: true });
          const content = JSON.stringify(
            {
              score: 95,
              passed: true,
              issues: [
                { severity: "warning", category: "naming", message: "Layer naming casing mismatch" }
              ],
              generatedAt: new Date().toISOString()
            },
            null,
            2
          );
          fs.writeFileSync(outPath, content, "utf-8");
        } catch {}
        return {
          generated: true,
          reportPath: outPath,
          score: 95,
        };
      }

      case "checkLayerNamingConventions": {
        return {
          compliant: false,
          expectedStyle: p.namingStyle ?? "snake",
          violatingLayers: ["BG Layer", "buttonText"],
        };
      }

      case "detectOverlappingLayers": {
        return {
          audited: true,
          overlapsCount: 1,
          overlaps: [
            { layers: ["Popup_Dim_Scrim", "Modal_Panel"], areaPx: 250000 }
          ],
        };
      }

      case "checkDocumentColorProfile": {
        return {
          profile: "sRGB IEC61966-2.1",
          expectedProfile: p.expectedProfile ?? "sRGB IEC61966-2.1",
          matches: true,
        };
      }

      case "validateBlendModes": {
        return {
          audited: true,
          violations: ["dissolve"],
          compliant: false,
        };
      }

      case "snapshotDocumentState": {
        return {
          saved: true,
          snapshotName: p.snapshotName,
          timestamp: new Date().toISOString(),
        };
      }

      // ─── Extra AI Mocks ──────────────────────────────────────────────────────

      case "batchApplyStyle": {
        return {
          applied: true,
          preset: p.stylePreset,
          matchingLayersFound: 4,
          layersModified: ["Confirm_Button", "Cancel_Button", "Buy_Button", "Close_Button"],
        };
      }

      case "detectDuplicateLayers": {
        return {
          audited: true,
          duplicatesCount: 2,
          duplicates: [
            { name: "Layer 1", count: 2 },
            { name: "Background", count: 2 }
          ],
        };
      }

      case "analyzePsdComplexity": {
        return {
          score: 65,
          layersCount: 32,
          groupsCount: 8,
          effectsCount: 4,
          smartObjectsCount: 2,
          detailed: p.detailed ?? false,
        };
      }

      case "suggestLayerGrouping": {
        return {
          suggestionsCount: 2,
          suggestions: [
            { layers: ["Asset_Red", "Asset_Blue", "Asset_Green"], suggestedGroupName: "Tile_Assets" },
            { layers: ["Title_Text", "Subtitle_Text"], suggestedGroupName: "Text_Headers" }
          ],
        };
      }

      case "detectMissingAssets": {
        return {
          audited: true,
          missingAssetsCount: 1,
          missingAssets: ["icon_placeholder_flat"],
        };
      }

      case "autoAlignLayers": {
        return {
          aligned: true,
          alignType: p.alignType,
          alignedLayersCount: 3,
        };
      }

      case "autoSpaceLayers": {
        return {
          spaced: true,
          spacingType: p.spacingType,
          spacingPx: p.spacingPx ?? 10,
          spacedLayersCount: 4,
        };
      }

      case "smartCropToSubject": {
        return {
          cropped: true,
          padding: p.padding ?? 0,
          originalDimensions: { w: 1290, h: 2796 },
          newDimensions: { w: 700, h: 1000 },
        };
      }

      case "extractDominantColors": {
        return {
          extracted: true,
          layerName: p.layerName,
          dominantColors: ["#140b2e", "#ff2a6d", "#05d9e8"],
        };
      }

      // ─── Integration Mocks ───────────────────────────────────────────────────

      case "importFigmaFrame": {
        return {
          imported: true,
          layersReconstructedCount: 12,
          rootLayerName: "Figma_Imported_Frame",
        };
      }

      case "downloadGoogleFont": {
        return {
          downloaded: true,
          fontFamily: p.fontFamily,
          active: true,
          path: `/Library/Fonts/${p.fontFamily}-Regular.ttf`,
        };
      }

      case "sendSlackNotification": {
        return {
          sent: true,
          channel: p.channel ?? "#dev-alerts",
          status: "ok",
          code: 200,
        };
      }

  case "importCanvaDesign": {
    return {
      imported: true,
      elementsParsedCount: 15,
      canvasWidth: 800,
      canvasHeight: 600,
      rootLayerName: "Canva_Imported_Layout",
    };
  }

  // ─── Extra Premium & AI Mocks ───────────────────────────────────────────────

  case "createAdvancedGridLayout": {
    return {
      created: true,
      columnsCount: p.columns,
      rowsCount: p.rows,
      margins: p.margins ?? { top: 0, bottom: 0, left: 0, right: 0 },
      gutters: p.gutters ?? { horizontal: 0, vertical: 0 },
      guidesDrawnCount: (p.columns as number + 1) + (p.rows as number + 1),
    };
  }

  case "setupBeautyRetouchSuite": {
    return {
      setup: true,
      dodgeBurnStrength: p.dodgeBurnStrength ?? 50,
      frequencySeparationRadius: p.frequencySeparationRadius ?? 6,
      layersCreated: [
        "Retouch_FS_High_Detail",
        "Retouch_FS_Low_Color",
        "Retouch_Dodge_Overlay",
        "Retouch_Burn_Overlay",
        "Eye_Brightening_Mask",
        "Skin_Tone_Correction"
      ],
    };
  }

  case "batchRenameLayersRegex": {
    return {
      renamed: true,
      searchPattern: p.searchPattern,
      replacePattern: p.replacePattern,
      affectedLayersCount: 8,
      layersRenamed: ["Icon_01", "Icon_02", "Icon_03", "Icon_04"],
    };
  }

  case "aiSegmentAndInpaintPsd": {
    const outPath = String(p.outputPsdPath || "ai_output.psd");
    try {
      fs.mkdirSync(path.dirname(outPath), { recursive: true });
      fs.writeFileSync(outPath, "MOCK LAYERED PSD FROM AI SEGMENTATION", "utf-8");
    } catch {}
    return {
      created: true,
      imagePath: p.imagePath,
      psdPath: outPath,
      detectObjectsCount: p.detectObjectsCount ?? 5,
      layersGenerated: ["Background_Inpainted", "Subject_Segment_01", "Subject_Segment_02", "Foreground_Detail_03"],
    };
  }

  case "generativeExtendCanvas": {
    return {
      extended: true,
      direction: p.direction,
      extendPx: p.extendPx,
      inpaintApplied: true,
      newDimensions: { w: 1500, h: 2000 },
    };
  }

  case "generateCharacterLimbAnimation": {
    return {
      animated: true,
      characterGroup: p.characterGroup,
      cycleType: p.cycleType,
      frameCount: p.frameCount ?? 16,
      spritesheetPath: `/tmp/${p.characterGroup}_spritesheet.png`,
    };
  }

      default:
        return { type, payload, mock: true };
    }
  }

  private async fetchWithRetry(
    url: string,
    init: RequestInit,
    timeoutMs = REQUEST_TIMEOUT_MS,
    retries = MAX_RETRIES
  ): Promise<Response> {
    let lastError: unknown;
    for (let attempt = 0; attempt <= retries; attempt += 1) {
      try {
        const response = await fetch(url, {
          ...init,
          signal: AbortSignal.timeout(timeoutMs),
        });
        if (response.status < 500 || attempt === retries) return response;
        lastError = new Error(`Bridge returned ${response.status}`);
      } catch (err) {
        lastError = err;
        if (attempt === retries) break;
      }
      await this.sleep(150 * Math.pow(2, attempt));
    }
    throw lastError instanceof Error ? lastError : new Error(String(lastError));
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  private writeMockOutput(
    type: JobType,
    payload: unknown,
    jobId: string,
    data: unknown
  ): void {
    try {
      const mockDir = path.join(this.workspace, ".remirdy", "mock");
      fs.mkdirSync(mockDir, { recursive: true });
      const file = path.join(mockDir, `${jobId}_${type}.json`);
      fs.writeFileSync(
        file,
        JSON.stringify({ jobId, type, payload, result: data, timestamp: new Date().toISOString() }, null, 2)
      );
    } catch {
      // non-fatal
    }
  }
}

// Singleton for convenience
export const bridgeClient = new BridgeClient();
