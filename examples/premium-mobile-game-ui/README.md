# Premium Mobile Game UI — Example

**Public-safe fictional demo.** No real client or studio data.

## Fictional Project: Color Crate Sort

A generic premium casual mobile puzzle game UI demonstrating:

- 1290×2796px canvas (iPhone 15 Pro Max)
- Dark purple/navy premium background
- Abstract puzzle board with tile placeholders
- Top HUD: coin counter, level indicator, settings button
- Bottom HUD: 3 booster buttons with count badges
- Confirmation popup modal with scrim
- Full editable layer group structure
- PSD + PNG + layer ZIP export

## Running This Example

```bash
# Start the bridge
pnpm dev:bridge

# Load the UXP plugin in Photoshop
# (see docs/PHOTOSHOP_SETUP.md)

# Tell Claude:
# "Run the design JSON at examples/premium-mobile-game-ui/design.json
#  and save exports to /tmp/exports/ColorCrateSort"
```

## Output Files

```
exports/
  ColorCrateSort_GameplayUI_Demo.psd
  ColorCrateSort_GameplayUI_Demo.png
  layers/
    01_BG.png
    02_GAMEPLAY_SCENE.png
    03_UI.png
    04_POPUP.png
  README_LAYER_STRUCTURE.txt
  layer-manifest.json
  ColorCrateSort_Delivery_Package.zip
```

## Layer Structure

```
01_BG
  BG_Base, BG_Gradient, BG_Vignette, BG_Noise_Texture

02_GAMEPLAY_SCENE
  Game_Board / GameBoard_Base, GameBoard_Inner_Depth, GameBoard_Outline
  Puzzle_Area / PuzzleArea_Base, PuzzleArea_Glow, PuzzleArea_Slots
  Tile_Placeholders / TilePlaceholder_Red_01 ... _Pink_01
  Crate_Row / Crate_Red_01 ... Crate_Pink_01
  Lighting_FX / Soft_Top_Glow, Board_Shadow, Ambient_Highlight

03_UI
  Top_HUD
    Coin_Counter / CoinCounter_BG, CoinCounter_Icon, CoinCounter_Text
    Level_Indicator / LevelIndicator_BG, LevelIndicator_Text, LevelIndicator_Dots
    Settings_Button / SettingsButton_BG, SettingsButton_Icon
  Bottom_HUD
    Booster_Row / Booster_01..03 (each: BG + Icon + Badge)

04_POPUP
  Scrim / Popup_Dim_Scrim
  Modal / Modal_Panel, Modal_Title, Modal_Close_Button, Modal_Icon, Modal_Message, Confirm_Button

05_EXPORT_NOTES
  README_Text_Layer, Safe_Area_Guides
```
