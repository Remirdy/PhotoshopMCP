/**
 * @remirdy/shared — layerNaming.ts
 * Professional layer naming conventions and transformation helpers.
 */

export type NamingMode = "game_ui" | "social" | "app_store" | "unity_ui" | "generic";

/**
 * Default ugly-to-professional name mappings by mode.
 */
const GAME_UI_MAPPINGS: Record<string, string> = {
  "Layer 1": "BG_Base_Gradient",
  "Layer 2": "GameBoard_Base",
  "Layer 3": "TilePlaceholder_Blue_01",
  "Layer 4": "TopHUD_CoinCounter_BG",
  "Layer 5": "TopHUD_CoinCounter_Text",
  "Layer 6": "TopHUD_LevelIndicator_BG",
  "Layer 7": "BottomHUD_BoosterRow_Base",
  "Layer 8": "Popup_Modal_Panel",
  "Layer 9": "Popup_Scrim",
  "Layer 10": "Lighting_FX_TopGlow",
  "Untitled": "BG_Unnamed_Layer",
  "Rectangle 1": "Shape_Panel_01",
  "Ellipse 1": "Shape_Circle_01",
  "Type Layer": "Text_Label_01",
};

const SOCIAL_MAPPINGS: Record<string, string> = {
  "Layer 1": "Background_Base",
  "Layer 2": "Hero_Image",
  "Layer 3": "Headline_Text",
  "Layer 4": "Subheadline_Text",
  "Layer 5": "CTA_Button",
  "Layer 6": "Logo",
  "Untitled": "Social_Unnamed_Layer",
};

const UNITY_UI_MAPPINGS: Record<string, string> = {
  "Layer 1": "UI_Background",
  "Layer 2": "UI_Panel_01",
  "Layer 3": "UI_Button_01",
  "Layer 4": "UI_Text_01",
  "Layer 5": "UI_Icon_01",
  "Untitled": "UI_Unnamed_Element",
};

const GENERIC_MAPPINGS: Record<string, string> = {
  "Layer 1": "Base_Layer",
  "Layer 2": "Content_Layer",
  "Layer 3": "Overlay_Layer",
  "Untitled": "Unnamed_Layer",
};

const MODE_MAPPINGS: Record<NamingMode, Record<string, string>> = {
  game_ui: GAME_UI_MAPPINGS,
  social: SOCIAL_MAPPINGS,
  app_store: SOCIAL_MAPPINGS,
  unity_ui: UNITY_UI_MAPPINGS,
  generic: GENERIC_MAPPINGS,
};

/**
 * Suggest a professional name for a given ugly name.
 * Returns the original name if no mapping found.
 */
export function suggestLayerName(ugly: string, mode: NamingMode = "game_ui"): string {
  const mappings = MODE_MAPPINGS[mode];
  return mappings[ugly] ?? sanitizeLayerName(ugly);
}

/**
 * Sanitize a layer name: trim, replace spaces with underscores, remove special chars.
 */
export function sanitizeLayerName(name: string): string {
  return name
    .trim()
    .replace(/\s+/g, "_")
    .replace(/[^A-Za-z0-9_\-./]/g, "")
    .substring(0, 100);
}

/**
 * Check if a layer name is considered "ugly" / generic.
 */
export function isUglyName(name: string): boolean {
  const ugly = [
    /^Layer \d+$/i,
    /^Untitled$/i,
    /^Group \d+$/i,
    /^Rectangle \d+$/i,
    /^Ellipse \d+$/i,
    /^Type Layer$/i,
    /^Shape \d+$/i,
  ];
  return ugly.some((re) => re.test(name.trim()));
}

/**
 * Generate a numbered variant name to avoid duplicates.
 * e.g. "Booster_01" → "Booster_02", "Booster_03"
 */
export function incrementLayerName(name: string): string {
  const match = name.match(/^(.*?)(\d+)$/);
  if (match) {
    const base = match[1];
    const num = parseInt(match[2], 10) + 1;
    return `${base}${String(num).padStart(match[2].length, "0")}`;
  }
  return `${name}_02`;
}

/**
 * The canonical public-safe generic mobile game layer structure.
 */
export const MOBILE_GAME_LAYER_STRUCTURE = {
  "01_BG": {
    children: ["BG_Base", "BG_Gradient", "BG_Vignette", "BG_Noise_Texture"],
  },
  "02_GAMEPLAY_SCENE": {
    children: {
      Game_Board: {
        children: ["GameBoard_Base", "GameBoard_Inner_Depth", "GameBoard_Outline"],
      },
      Puzzle_Area: {
        children: ["PuzzleArea_Base", "PuzzleArea_Glow", "PuzzleArea_Slots"],
      },
      Tile_Placeholders: {
        children: [
          "TilePlaceholder_Red_01",
          "TilePlaceholder_Blue_01",
          "TilePlaceholder_Green_01",
          "TilePlaceholder_Yellow_01",
          "TilePlaceholder_Pink_01",
        ],
      },
      Crate_Row: {
        children: [
          "Crate_Red_01",
          "Crate_Blue_01",
          "Crate_Green_01",
          "Crate_Yellow_01",
          "Crate_Pink_01",
        ],
      },
      Lighting_FX: {
        children: ["Soft_Top_Glow", "Board_Shadow", "Ambient_Highlight"],
      },
    },
  },
  "03_UI": {
    children: {
      Top_HUD: {
        children: {
          Coin_Counter: {
            children: ["CoinCounter_BG", "CoinCounter_Icon", "CoinCounter_Text"],
          },
          Level_Indicator: {
            children: ["LevelIndicator_BG", "LevelIndicator_Text", "LevelIndicator_Dots"],
          },
          Settings_Button: {
            children: ["SettingsButton_BG", "SettingsButton_Icon"],
          },
        },
      },
      Bottom_HUD: {
        children: {
          Booster_Row: {
            children: {
              BoosterRow_Base: [],
              Booster_01: {
                children: ["Booster01_BG", "Booster01_Icon", "Booster01_Badge"],
              },
              Booster_02: {
                children: ["Booster02_BG", "Booster02_Icon", "Booster02_Badge"],
              },
              Booster_03: {
                children: ["Booster03_BG", "Booster03_Icon", "Booster03_Badge"],
              },
            },
          },
        },
      },
    },
  },
  "04_POPUP": {
    children: {
      Scrim: { children: ["Popup_Dim_Scrim"] },
      Modal: {
        children: [
          "Modal_Panel",
          "Modal_Title",
          "Modal_Close_Button",
          "Modal_Icon",
          "Modal_Message",
          "Confirm_Button",
        ],
      },
    },
  },
  "05_EXPORT_NOTES": {
    children: ["README_Text_Layer", "Safe_Area_Guides"],
  },
} as const;
