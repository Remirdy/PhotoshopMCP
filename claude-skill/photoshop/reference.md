# Photoshop UXP reference for /photoshop

All snippets are script bodies for `ps.mjs run` (they assume `doc`, `app`, `batchPlay`,
`constants`, `args`, `fileEntry` are in scope; `doc` is the pinned target document). Photoshop's API shifts between versions; if a
recipe errors, get the exact descriptor with **Discovering descriptors** below instead of guessing.

## Helpers to paste at the top of a script

```js
const findLayer = (layers, pred) => {
  for (const l of layers) {
    if (pred(l)) return l;
    if (l.layers) { const hit = findLayer(l.layers, pred); if (hit) return hit; }
  }
  return null;
};
const byId = (id) => findLayer(doc.layers, (l) => l.id === id);
const byName = (name) => findLayer(doc.layers, (l) => l.name === name);
const select = (id) => batchPlay([{ _obj: "select", _target: [{ _ref: "layer", _id: id }], makeVisible: false }], {});
const rgb = (hex) => {
  const h = hex.replace("#", "");
  return { _obj: "RGBColor", red: parseInt(h.slice(0, 2), 16), grain: parseInt(h.slice(2, 4), 16), blue: parseInt(h.slice(4, 6), 16) };
};
const solid = (hex) => { const c = new app.SolidColor(); c.rgb.hexValue = hex.replace("#", ""); return c; };
const px = (v) => ({ _unit: "pixelsUnit", _value: v });
const pct = (v) => ({ _unit: "percentUnit", _value: v });
const TARGET = { _ref: "layer", _enum: "ordinal", _value: "targetEnum" };
```

## Documents

```js
await app.documents.add({ width: 1080, height: 1350, resolution: 72, mode: "RGBColorMode", fill: "white", name: "Post" });
await app.open(await fileEntry("/abs/in.psd"));
await doc.resizeImage(2160, 2700);                    // image size (px)
await doc.resizeCanvas(1200, 1500, constants.AnchorPosition.MIDDLECENTER);
await doc.crop({ left: 0, top: 0, right: 1000, bottom: 1000 });
await doc.trim(constants.TrimType.TRANSPARENT);
await doc.flatten();  await doc.mergeVisibleLayers();
await doc.saveAs.psd(await fileEntry("/abs/out.psd", { create: true }), { maximizeCompatibility: true });
await doc.saveAs.png(await fileEntry("/abs/out.png", { create: true }), { compression: 6 }, true);   // true = as copy
await doc.saveAs.jpg(await fileEntry("/abs/out.jpg", { create: true }), { quality: 10 }, true);
await doc.closeWithoutSaving();
// To work on another document, pin it with `ps.mjs target "Other.psd"` instead of switching
// app.activeDocument inside a script (the next run would refuse: target no longer in front).
```

## Layers (DOM)

```js
const layer = await doc.createLayer({ name: "Paint", opacity: 100, blendMode: constants.BlendMode.NORMAL });
const group = await doc.createLayerGroup({ name: "UI", fromLayers: [byId(12), byId(13)] });
layer.name = "New name";  layer.visible = false;  layer.opacity = 50;  layer.fillOpacity = 80;
layer.blendMode = constants.BlendMode.SCREEN;   // MULTIPLY, OVERLAY, SOFTLIGHT, COLORDODGE, LUMINOSITY, ...
layer.allLocked = false;
await layer.translate(dx, dy);                     // move by px
await layer.scale(150, 150, constants.AnchorPosition.MIDDLECENTER);   // percent
await layer.rotate(15, constants.AnchorPosition.MIDDLECENTER);
await layer.flip("horizontal");
const copy = await layer.duplicate();              // optional (relativeObject, ElementPlacement, name)
layer.move(byId(7), constants.ElementPlacement.PLACEBEFORE);   // PLACEAFTER, PLACEINSIDE (into group)
layer.bringToFront();  layer.sendToBack();
await layer.rasterize(constants.RasterizeType.ENTIRELAYER);
await layer.merge();                               // merge down
layer.delete();
```

**Verified on Photoshop 27:** `layer.translate()` moves the **selected** layer, not the one you call
it on, and translating a group moves only its selected child. Always select first, or use batchPlay:

```js
const moveBy = async (id, dx, dy) => {
  await select(id);
  await batchPlay([{ _obj: "move", _target: [TARGET],
    to: { _obj: "offset", horizontal: px(dx), vertical: px(dy) } }], {});
};
```

Move a layer so its top-left lands at (x, y): `const b = byId(id).bounds; await moveBy(id, x - b.left, y - b.top);`
Bounds include layer effects (glow, stroke), so they can be larger than the shape itself.

Also verified: the `name` passed to `make contentLayer` is ignored, and the layer comes out as
"Rectangle 1". Set `doc.activeLayers[0].name = "..."` right after creating it.

## Text

```js
const t = await doc.createTextLayer({
  name: "Title", contents: "Hello", fontSize: 64, fontName: "Arial-BoldMT",
  position: { x: 100, y: 200 }, textColor: solid("#FFFFFF"),
});
const ti = byId(args.id).textItem;
ti.contents = "New copy";
ti.characterStyle.size = 48;            // behaves as pixels: points = 48 × 72 / doc.resolution
ti.characterStyle.font = "Inter-Bold";  // PostScript name
ti.characterStyle.color = solid("#FF3366");
ti.characterStyle.tracking = 50;
ti.paragraphStyle.justification = constants.Justification.CENTER;
```

Find a font's PostScript name: `return app.fonts.filter(f => /inter/i.test(f.name)).map(f => [f.name, f.postScriptName]);`

Mixed styles inside one text layer need batchPlay `textStyleRange`; record it (see below).

## Shapes and fill layers (batchPlay)

```js
// Rounded rectangle shape layer
await batchPlay([{ _obj: "make", _target: [{ _ref: "contentLayer" }], using: {
  _obj: "contentLayer", name: "Card",
  type: { _obj: "solidColorLayer", color: rgb("#1E1E2E") },
  shape: { _obj: "rectangle", unitValueQuadVersion: 1, left: px(100), top: px(100), right: px(500), bottom: px(400),
    topLeft: px(24), topRight: px(24), bottomLeft: px(24), bottomRight: px(24) },
}}], {});

// Ellipse
await batchPlay([{ _obj: "make", _target: [{ _ref: "contentLayer" }], using: {
  _obj: "contentLayer", type: { _obj: "solidColorLayer", color: rgb("#FFCC00") },
  shape: { _obj: "ellipse", left: px(0), top: px(0), right: px(200), bottom: px(200) },
}}], {});

// Full-canvas solid colour fill layer
await batchPlay([{ _obj: "make", _target: [{ _ref: "contentLayer" }], using: {
  _obj: "contentLayer", type: { _obj: "solidColorLayer", color: rgb("#000000") } } }], {});

// Linear gradient fill layer
await batchPlay([{ _obj: "make", _target: [{ _ref: "contentLayer" }], using: {
  _obj: "contentLayer", type: { _obj: "gradientLayer", angle: { _unit: "angleUnit", _value: 90 },
    type: { _enum: "gradientType", _value: "linear" },
    gradient: { _obj: "gradientClassEvent", name: "Custom", gradientForm: { _enum: "gradientForm", _value: "customStops" },
      interfaceIconFrameDimmed: 4096,
      colors: [
        { _obj: "colorStop", color: rgb("#6A11CB"), type: { _enum: "colorStopType", _value: "userStop" }, location: 0, midpoint: 50 },
        { _obj: "colorStop", color: rgb("#2575FC"), type: { _enum: "colorStopType", _value: "userStop" }, location: 4096, midpoint: 50 },
      ],
      transparency: [
        { _obj: "transferSpec", opacity: pct(100), location: 0, midpoint: 50 },
        { _obj: "transferSpec", opacity: pct(100), location: 4096, midpoint: 50 },
      ] } } } }], {});

// Change a shape/fill layer's colour (select it first)
await select(args.id);
await batchPlay([{ _obj: "set", _target: [{ _ref: "contentLayer", _enum: "ordinal", _value: "targetEnum" }],
  to: { _obj: "solidColorLayer", color: rgb("#00AAFF") } }], {});
```

## Selections and painting

```js
await doc.selection.selectAll();
await doc.selection.selectRectangle({ left: 0, top: 0, right: 500, bottom: 300 }, constants.SelectionType.REPLACE);
await doc.selection.selectEllipse({ left: 0, top: 0, right: 300, bottom: 300 }, constants.SelectionType.REPLACE);
await doc.selection.inverse();  await doc.selection.feather(10);  await doc.selection.deselect();
// Load a layer's transparency as selection
await batchPlay([{ _obj: "set", _target: [{ _ref: "channel", _property: "selection" }],
  to: { _ref: [{ _ref: "channel", _enum: "channel", _value: "transparencyEnum" }, { _ref: "layer", _id: args.id }] } }], {});
// Fill the selection on the selected pixel layer
await batchPlay([{ _obj: "fill", using: { _enum: "fillContents", _value: "color" }, color: rgb("#FF0000"),
  opacity: pct(100), mode: { _enum: "blendMode", _value: "normal" } }], {});
// Delete selected pixels
await batchPlay([{ _obj: "delete" }], {});
```

## Masks and clipping

```js
await select(args.id);
// Layer mask: "revealAll" | "hideAll" | "revealSelection" | "hideSelection"
await batchPlay([{ _obj: "make", new: { _class: "channel" }, at: { _ref: "channel", _enum: "channel", _value: "mask" },
  using: { _enum: "userMaskEnabled", _value: "revealSelection" } }], {});
// Apply / delete mask
await batchPlay([{ _obj: "delete", _target: [{ _ref: "channel", _enum: "channel", _value: "mask" }], apply: true }], {});
// Clip to layer below (toggle)
byId(args.id).isClippingMask = true;
// or: await batchPlay([{ _obj: "groupEvent", _target: [TARGET] }], {});
```

## Layer effects (batchPlay)

Setting `layerEffects` **replaces** all effects on the layer. Read the current ones first
(`get`, below) and merge if the layer already has effects.

```js
await select(args.id);
await batchPlay([{ _obj: "set", _target: [{ _ref: "property", _property: "layerEffects" }, TARGET], to: {
  _obj: "layerEffects", scale: pct(100),
  dropShadow: { _obj: "dropShadow", enabled: true, present: true, showInDialog: true,
    mode: { _enum: "blendMode", _value: "multiply" }, color: rgb("#000000"), opacity: pct(35),
    useGlobalAngle: false, localLightingAngle: { _unit: "angleUnit", _value: 90 },
    distance: px(8), chokeMatte: px(0), blur: px(18), noise: pct(0), antiAlias: false },
  frameFX: { _obj: "frameFX", enabled: true, present: true, showInDialog: true,
    style: { _enum: "frameStyle", _value: "outsetFrame" }, paintType: { _enum: "frameFill", _value: "solidColor" },
    mode: { _enum: "blendMode", _value: "normal" }, opacity: pct(100), size: px(4), color: rgb("#FFFFFF") },
  // also: innerShadow, outerGlow, innerGlow, bevelEmboss, solidFill, gradientFill, chromeFX (satin)
}}], {});
// Remove all effects
await batchPlay([{ _obj: "disableLayerStyle", _target: [TARGET] }], {});
```

## Adjustment layers (batchPlay)

Created above the selected layer. Add `clip` by setting `isClippingMask` on the new layer.

```js
const adj = (type) => batchPlay([{ _obj: "make", _target: [{ _ref: "adjustmentLayer" }],
  using: { _obj: "adjustmentLayer", type } }], {});
await adj({ _obj: "hueSaturation", presetKind: { _enum: "presetKindType", _value: "presetKindCustom" }, colorize: false,
  adjustment: [{ _obj: "hueSatAdjustmentV2", hue: 0, saturation: 20, lightness: 0 }] });
await adj({ _obj: "brightnessEvent", brightness: 10, center: 15, useLegacy: false });
await adj({ _obj: "vibrance", vibrance: 25, saturation: 0 });
await adj({ _obj: "levels", presetKind: { _enum: "presetKindType", _value: "presetKindCustom" },
  adjustment: [{ _obj: "levelsAdjustment", channel: { _ref: "channel", _enum: "channel", _value: "composite" },
    input: [10, 245], gamma: 1.1 }] });
await adj({ _obj: "curves", presetKind: { _enum: "presetKindType", _value: "presetKindCustom" },
  adjustment: [{ _obj: "curvesAdjustment", channel: { _ref: "channel", _enum: "channel", _value: "composite" },
    curve: [{ _obj: "paint", horizontal: 0, vertical: 0 }, { _obj: "paint", horizontal: 64, vertical: 54 },
            { _obj: "paint", horizontal: 192, vertical: 202 }, { _obj: "paint", horizontal: 255, vertical: 255 }] }] });
await adj({ _obj: "colorBalance", shadowLevels: [0, 0, 0], midtoneLevels: [10, 0, -10], highlightLevels: [0, 0, 0], preserveLuminosity: true });
await adj({ _obj: "photoFilter", color: rgb("#EC8A00"), density: 25, preserveLuminosity: true });
await adj({ _obj: "blackAndWhite", red: 40, yellow: 60, grain: 40, cyan: 60, blue: 20, magenta: 80 });
```

## Filters (on a pixel layer; rasterize or convert to smart object first)

```js
const l = byId(args.id);
await l.applyGaussianBlur(4);
await l.applyUnSharpMask(80, 1.2, 2);
await l.applyAddNoise(3, constants.NoiseDistribution.GAUSSIAN, true);
await l.applyMotionBlur(0, 20);
await l.applyHighPass(3);
```

Applied to a smart object, these become editable smart filters.

## Smart objects (batchPlay)

```js
await select(args.id);
await batchPlay([{ _obj: "newPlacedLayer" }], {});                    // convert selection to smart object
await batchPlay([{ _obj: "placedLayerReplaceContents", null: { _path: args.path, _kind: "local" } }], {});
await batchPlay([{ _obj: "rasterizeLayer", _target: [TARGET] }], {});
// Place an image file as a new smart object layer (centred), then move/scale with DOM
await batchPlay([{ _obj: "placeEvent", null: { _path: args.path, _kind: "local" },
  freeTransformCenterState: { _enum: "quadCenterState", _value: "QCSAverage" } }], {});
```

If `_path` with a raw string fails on this version, use a session token:
`const token = await require("uxp").storage.localFileSystem.createSessionToken(await fileEntry(args.path));`
and pass `null: { _path: token, _kind: "local" }`.

## Reading everything about a layer

`state` covers the basics. For effects, smart object info, mask presence, fill colour, etc.:

```js
const [desc] = await batchPlay([{ _obj: "get", _target: [{ _ref: "layer", _id: args.id }] }], {});
return desc;   // includes layerEffects, smartObject, hasUserMask, adjustment, textKey, ...
```

`--no-modal` is fine for `get`.

## Discovering descriptors

For anything not here, or a recipe that errors:

1. Ask the user to do the operation once by hand with **Plugins → Development → Record Action
   Commands…** running (Photoshop 23+), or record it in the **Actions** panel, then right-click the
   step → **Copy As JavaScript**.
2. Have them paste the result (or the path of the recorded file) into the chat.
3. Replace the hard-coded values with yours and run it with `ps.mjs batchplay` or inside a `run`
   script. Drop `_options` / `dialogOptions` keys if present.
