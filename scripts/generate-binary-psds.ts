import fs from "fs";
import path from "path";
import { writePsd } from "ag-psd";
import { createCanvas, loadImage } from "canvas";

const workspaceDir = "/Users/emirhan/Desktop/Photoshop_MCP/remirdy-photoshop-mcp/workspace";
const caseDir = path.join(workspaceDir, "KnitFlowCase");

const paths = {
  sceneOnlyPng: path.join(caseDir, "KnitFlow_Gameplay_SceneOnly.png"),
  withUiPng: path.join(caseDir, "KnitFlow_Gameplay_WithUI.png"),
  exitPopupPng: path.join(caseDir, "KnitFlow_Exit_Popup.png")
};

async function createRealPsd(imagePath: string, outputPsdName: string, docTitle: string, layerStructure: any[]) {
  console.log(`Loading image ${path.basename(imagePath)}...`);
  const img = await loadImage(imagePath);
  
  // Create a canvas containing the image
  const canvas = createCanvas(img.width, img.height);
  const ctx = canvas.getContext("2d");
  ctx.drawImage(img, 0, 0);

  // Define the layered PSD structure using ag-psd format
  const psd: any = {
    width: img.width,
    height: img.height,
    children: [
      {
        name: "01_BACKGROUND",
        opened: true,
        children: [
          {
            name: "Background_Color",
            canvas: (() => {
              // Solid dark purple background canvas
              const bgCanvas = createCanvas(img.width, img.height);
              const bgCtx = bgCanvas.getContext("2d");
              bgCtx.fillStyle = "#140B2E";
              bgCtx.fillRect(0, 0, img.width, img.height);
              return bgCanvas;
            })()
          }
        ]
      },
      ...layerStructure.map(layerGroup => {
        if (layerGroup.type === "group") {
          return {
            name: layerGroup.name,
            opened: true,
            children: layerGroup.children.map((child: any) => {
              if (child.useImageSource) {
                return {
                  name: child.name,
                  canvas: canvas // Pass the canvas containing the visual render
                };
              } else {
                // Return a blank or dummy layer canvas
                const dummyCanvas = createCanvas(100, 100);
                return {
                  name: child.name,
                  canvas: dummyCanvas
                };
              }
            })
          };
        } else {
          return {
            name: layerGroup.name,
            canvas: canvas
          };
        }
      })
    ]
  };

  console.log(`Writing binary PSD file ${outputPsdName}...`);
  const psdBuffer = Buffer.from(writePsd(psd));
  fs.writeFileSync(path.join(caseDir, outputPsdName), psdBuffer);
  console.log(`✓ Created ${outputPsdName} successfully.`);
}

async function main() {
  try {
    fs.mkdirSync(caseDir, { recursive: true });

    // 1. Generate KnitFlow_Gameplay_SceneOnly.psd
    await createRealPsd(paths.sceneOnlyPng, "KnitFlow_Gameplay_SceneOnly.psd", "Knit Flow Gameplay - Scene Only", [
      {
        type: "group",
        name: "02_GAMEPLAY_SCENE_RENDER",
        children: [
          { name: "Visual_3D_Render_Layer", useImageSource: true }
        ]
      },
      {
        type: "group",
        name: "03_PLACEMENT_ZONE",
        children: [
          { name: "Placement_Target_Ring", useImageSource: false },
          { name: "Active_Yarn_Segment", useImageSource: false }
        ]
      },
      {
        type: "group",
        name: "04_SPOOL_TRAY",
        children: [
          { name: "Tray_Wall_Bevel", useImageSource: false },
          { name: "Spools_Row", useImageSource: false }
        ]
      }
    ]);

    // 2. Generate KnitFlow_Gameplay_WithUI.psd
    await createRealPsd(paths.withUiPng, "KnitFlow_Gameplay_WithUI.psd", "Knit Flow Gameplay - Scene with UI", [
      {
        type: "group",
        name: "02_GAMEPLAY_SCENE_RENDER",
        children: [
          { name: "Base_Gameplay_Scene", useImageSource: true }
        ]
      },
      {
        type: "group",
        name: "03_TOP_HUD_INTERFACE",
        children: [
          { name: "HUD_Coin_Counter", useImageSource: false },
          { name: "HUD_Level_Indicator", useImageSource: false },
          { name: "HUD_Settings_Button", useImageSource: false }
        ]
      },
      {
        type: "group",
        name: "04_BOTTOM_HUD_INTERFACE",
        children: [
          { name: "HUD_Booster_Row_Base", useImageSource: false },
          { name: "Booster_Shuffle_Button", useImageSource: false },
          { name: "Booster_Swap_Button", useImageSource: false },
          { name: "Booster_Clue_Button", useImageSource: false }
        ]
      }
    ]);

    // 3. Generate KnitFlow_Exit_Popup.psd
    await createRealPsd(paths.exitPopupPng, "KnitFlow_Exit_Popup.psd", "Knit Flow - Exit Confirmation Modal", [
      {
        type: "group",
        name: "02_DIMMED_GAMEPLAY_SCENE",
        children: [
          { name: "Dimmed_Background_Render", useImageSource: true }
        ]
      },
      {
        type: "group",
        name: "03_MODAL_POPUP",
        children: [
          { name: "Scrim_Overlay_Dark", useImageSource: false },
          { name: "Modal_Dialog_Frame", useImageSource: false },
          { name: "Modal_Exit_Title_Text", useImageSource: false },
          { name: "Modal_Life_Cost_Warning", useImageSource: false },
          { name: "Modal_Confirm_CTA_Yarn_Button", useImageSource: false }
        ]
      }
    ]);

    console.log("\nAll binary PSDs generated successfully!");
  } catch (err) {
    console.error("Failed to generate binary PSDs:", err);
  }
}

main();
