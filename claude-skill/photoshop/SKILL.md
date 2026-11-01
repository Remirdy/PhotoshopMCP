---
name: photoshop
description: Inspect and fully edit Photoshop documents live (layers, text, shapes, masks, effects, adjustments, smart objects, transforms, export) through the local Remirdy bridge. Use whenever the user wants to look at, change, or export something in Photoshop or a PSD/PSDC file, or types /photoshop.
allowed-tools: Bash(node ${CLAUDE_SKILL_DIR}/scripts/ps.mjs *)
---

# Photoshop editing

You drive a live Photoshop instance. Every edit is JavaScript that runs inside
Photoshop's UXP runtime via the Remirdy panel, with full access to the Photoshop
DOM and `batchPlay`. You can do anything a Photoshop plugin can do.

CLI. Every call must start with the literal text
`node ${CLAUDE_SKILL_DIR}/scripts/ps.mjs` (no shell
variables, no `cd … &&`, no pipes in front of it). That exact prefix is pre-approved, so the
user gets no permission prompts. Below, `ps.mjs` is shorthand for that full command:

```
ps.mjs launch                 # start Photoshop + bridge if needed, wait for the panel
ps.mjs quit                   # quit Photoshop (refuses if anything is unsaved) + stop bridge
ps.mjs status                 # bridge + panel connection
ps.mjs bridge | stop          # start / stop just the bridge
ps.mjs target [<title|id>]    # pin all later jobs to this document; no arg = show target + open docs
ps.mjs target --active | --clear
ps.mjs state [--depth N] [--full-text]   # open docs + layer tree of the target (ids, kinds, bounds, text)
ps.mjs preview [out.jpg] [--max 2048]    # flattened image of the target (on white) -> Read the printed path
ps.mjs run /abs/edit.js [--args '{"k":1}'] [--name "History step name"]
ps.mjs eval 'return doc.title'
ps.mjs batchplay /abs/descriptors.json [--name "..."]
ps.mjs open /abs/file.psd     # also pins it as the target
ps.mjs new --width 2480 --height 3508 --res 300 --name test3 [--fill white]   # new unsaved doc, pinned
ps.mjs save [/abs/out.psd]    # saves the target; no path = save in place
ps.mjs session begin --label "cover 2" [--idle 60]   # lock the user out for a long build
ps.mjs session end
```

**Targets.** `run`, `eval`, `batchplay`, `preview`, `save` and `session begin` refuse until a
target is set. Every job acts on the target by id, never on whichever document the user has
in front, so the user clicking around can't redirect an edit or its undo step.

Write script files with the Write tool (into your scratchpad), then `run` them by absolute path.

## Workflow

1. **Connect.** Run `launch`. It starts Photoshop and the bridge only if they aren't running,
   and waits until the panel connects. Remember whether it reported `"launched": true`.
   If it fails, tell the user: open *Plugins → Remirdy MCP* in Photoshop and leave the panel
   docked (it then reopens with Photoshop), and check the token if the panel log says
   Unauthorized. Don't continue until it's connected.
2. **Pick the document.** Run `target` to list open documents and pin the one the user means
   (`target test2.psd`, or by id). If it's unclear which one, ask. `open` and `new` pin
   automatically. The pin follows the document id, so it survives Save As under a new name.
3. **Look before editing.** Run `state` to get the layer tree, then `preview` and Read the
   PNG. Target layers by **id** from `state`, not by name (names repeat).
4. **Edit.** Write the script to a file in your scratchpad and `run` it with a descriptive
   `--name`. Each run is **one undo step** in the target's History, and a script that throws
   is rolled back automatically, so a failed run leaves the document untouched.
   Keep each run to one logical change so the user can undo granularly.
   - If a run fails with **"Active document changed (you're in X, I expected Y)"**, the user
     has another document in front. Nothing was changed. Tell the user and wait; don't retry
     in a loop and don't switch documents on them.
   - **Long builds** (many runs in a row, or anything over a minute or two): run
     `session begin --label "<what you're building>"` first and `session end` when done.
     Photoshop then shows a progress dialog and the user can't touch it for the whole build,
     not just during each run. The lock releases itself after `--idle` seconds (default 60)
     without a job, so pass a bigger `--idle` if you'll think for a while between runs. The user
     can press Cancel in the dialog; the current run finishes and the lock ends (you'll see a
     warning on the next call). Tell the user before starting a session. End it before `quit`;
     the old MCP tools (placeAsset etc.) refuse while a session is open.
5. **Verify.** `state` and/or `preview` again, look at the result, fix what's off.
   Don't report an edit as done until you have checked it.
6. **Save** only when the user asked to. Prefer `save /new/path.psd` over overwriting the
   original; confirm before overwriting a file the user didn't say to overwrite.
7. **Close.** When the task is finished: if `launch` started Photoshop (`"launched": true`) and
   everything is saved, run `quit` to free the resources. If Photoshop was already open, leave it
   running and don't quit unless the user asks. The bridge stops itself after 15 minutes
   without jobs either way.

For destructive operations on the user's real work (flatten, merge, rasterize, delete many
layers, crop), say what you're about to do first.

## Script environment

A script is the body of an `async` function. These are in scope:

| name | what it is |
|---|---|
| `doc` | the target document. Use it instead of `app.activeDocument` |
| `app` | `require("photoshop").app` — `app.documents`, `app.open()` |
| `batchPlay` | `require("photoshop").action.batchPlay` |
| `constants` | `require("photoshop").constants` (BlendMode, ElementPlacement, AnchorPosition, ...) |
| `core`, `ps`, `uxp` | the raw modules |
| `args` | the parsed `--args` JSON |
| `fileEntry(path, {create})` | UXP file entry for an absolute path (for open/save/place) |
| `log(...)` | collected and returned in `logs` |
| `executionContext` | the executeAsModal context (`hostControl`, `isCancelled`) |

`return` a JSON-able value; it comes back as `result`. DOM objects are reduced to
`{typeName, id, name}`. The script already runs inside `executeAsModal`: **never call
`core.executeAsModal` yourself** (nesting fails). Use `--no-modal` only for read-only scripts.

A run only starts when the target is in front, so batchPlay `targetEnum` descriptors hit the
target too. Don't switch `app.activeDocument` inside a script.

Minimal example:

```js
const find = (layers, id) => {
  for (const l of layers) {
    if (l.id === id) return l;
    if (l.layers) { const hit = find(l.layers, id); if (hit) return hit; }
  }
  return null;
};
const layer = find(doc.layers, args.id);
if (!layer) throw new Error(`layer ${args.id} not found`);
layer.opacity = 60;
layer.blendMode = constants.BlendMode.MULTIPLY;
await layer.translate(40, 0);
return { id: layer.id, bounds: layer.bounds };
```

## Recipes and batchPlay

For anything beyond basic layer properties (text styling, shapes, fills, gradients, layer
effects, masks, clipping, adjustment layers, smart objects, filters, selections, canvas/
image size, export), read [reference.md](reference.md) first. It has DOM calls and batchPlay
descriptors for common operations, and explains how to get the exact descriptor for anything
not listed (or for any recipe that errors on this Photoshop version).

`ps.mjs batchplay` is atomic like `run`: if any descriptor fails, the whole batch is rolled back.
With `--no-history` there is no history step, so neither `run` nor `batchplay` can roll back and
any commands that succeeded before the failure stay in the document.

## Gotchas

- Many DOM setters and methods only act on the **selected** layer when done via batchPlay
  `_enum: "ordinal", _value: "targetEnum"`. Select first (see reference), or target by `_id`.
- Units: DOM bounds/translate are pixels. DOM text size (`characterStyle.size`) also behaves
  as **pixels** here, not points (verified: 79 at 300 ppi showed as 18.96 pt in the Character
  panel). For a size in points, set `pt × resolution / 72`. Read the size back after setting
  it; batchPlay text descriptors can state the unit explicitly (`pixelsUnit` / `pointsUnit`).
- RGB colour descriptors in batchPlay use `grain` (not `green`) for the green channel.
- Text layer fonts use **PostScript names** (`"Arial-BoldMT"`, `"Inter-Bold"`), not display names.
- Errors like `"The command “Set” is not currently available"` usually mean nothing is
  selected, the wrong layer kind is targeted (e.g. pixel op on a group), or a dialog is open in
  Photoshop.
- If a run reports "Script compilation is blocked", the plugin needs a reload in UXP
  Developer Tool (the manifest enables `allowCodeGenerationFromStrings`).
- Long jobs: pass `--timeout 300000` (max).
