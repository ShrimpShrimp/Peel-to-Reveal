# Peel to Reveal

React, TypeScript, SVG and CSS paper-sculpture experiment.

Hold the top sheet, fling horizontally left or right, and release to peel.
Success requires a brief hold, sufficient horizontal travel, and a quick
release. Clicks, short/slow drags, vertical pulls, and cancelled gestures return
the sheet to the stack without advancing. The paper tracks the pointer while
held, then curls and exits in the fling direction. For keyboard control, hold
Space or Enter and press the left or right arrow; Escape cancels.

Choose Shrimp, Courtyard, or Tree with the sculpture switcher. Each scene remembers
completed peels while the page is open; switching cancels an unfinished hold
or flight. Reset affects the selected sculpture.

Fifteen surrounding sheets peel away while their registered sculptural cutouts
stay in place. Reset cancels holds, returns, and peels. Reduced motion is
supported. Run `npm test` for the gesture acceptance checks.

Run `npm install`, then `npm run dev`. Build with `npm run build`.

All fifteen editable SVG paths and their solid colors are in
`src/geometry/shrimpSlices.ts`, ordered bottom to top. Every interaction state
uses the same sheet coordinates, slice heights, and perspective. An SVG mask
removes the retained shape from the surrounding paper; only the surrounding
paper animates. The eye is a permanent inlay rather than a full brown sheet.
Peeling locks immediately to prevent repeated clicks from skipping levels;
animation completion and a guarded timeout advance exactly one sheet.

The form follows the supplied shrimp reference: broad head, slender antennae,
three small legs, a curved segmented shell, and a two-lobed tail fan. The head
and shoulder share a continuous contour. The lower three contours tuck under
the broad middle cross-sections to form a rounded underside. Above that belly,
outside outlines stay registered while inside boundaries retreat upward,
placing the pale terraces toward the curl. The body sections retain distinct
heights and shallow grooves. The head cap extends over the shoulder, and the
tail connector has a broad cap. Two slim, curved antennae attach at the nose
without crossing the eye or creating triangular seams across the head.

The palette runs from salmon on the top/outside through peach to light warm
yellow on the lower/inside sheets. Every sheet has one flat solid color.
A dark coral brown inlay forms the eye. The closed stack includes one extra
cream cover sheet with no retained shrimp contour.

For coordinated geometry edits, `scripts/generate-shrimp-slices.py` contains
the anatomical control contours, underside profile, inward slope, and palette.
Run it manually from the project root to regenerate the literal paths; the
application itself renders only the editable paths in `shrimpSlices.ts`.

The courtyard is a second source-defined sculpture: a terracotta roof over
three arched openings, a stone terrace and stairs, planting beds with four
clipped trees, and a round fountain. Sixteen retained slices include olive
foliage and water inlays; each uses one solid color. Architectural slices
have explicit elevations, so thin inlays do not create empty wall courses.
Editable paths are in `src/geometry/courtyardSlices.ts`; the coordinated
generator is `scripts/generate-courtyard-slices.py`. The interactive courtyard
is available directly at `/courtyard-study.html`; it starts with Courtyard
selected and includes the same sculpture switcher as the main page. The generator can emit a source-derived SVG form reference locally. Scene configuration is in
`src/geometry/scenes.ts`; masks, gestures, and motion are shared by both scenes.

Tree is available directly at `/tree.html`. This more detailed version has
34 structural sheets plus a blank cover (35 peels), and thirteen retained wood
inlays at explicit elevations. Thirty wood courses carry a continuous
core from rounded root buttresses into the branching fork. Adjacent wood
courses overlap slightly to avoid seams at the roots. Seventeen canopy
courses use actual unions of broad leaf silhouettes and connecting veins.
Each course has one continuous outer contour with counter-wound leaf
apertures, rather than separate dots or stacked leaf caps. The upper wood
bends into a shared protected seat inside the crown; adjacent courses
overlap both in plan and height. The generator checks that every foliage
sheet is connected before emitting the editable vector contours.

The shelter has a raised porch, open doorway, framed window and mullion,
sill and lintel, porch posts and balustrades, stairs, five pitched roof
contours with tile cuts, capped ridge, and small stepping stones. Cast
shadows sit within the actual door and window openings. Each paper slice
still uses exactly one flat color.

Editable literal paths are in `src/geometry/treeSlices.ts`; the coordinated
generator is `scripts/generate-tree-slices.py`. The generator emits a fully assembled SVG reference for local review. Fling, Reset, and scene progress use the same
interaction as Shrimp and Courtyard.

## Public website

Published site: https://shrimpshrimp.github.io/Peel-to-Reveal/

This checkout contains the publishable site, editable slice geometry, and
geometry generators. Review screenshots and standalone form studies are
kept in the original local prototype folder and are not published.

GitHub Pages deploys automatically when changes are pushed to `main`.
The workflow installs dependencies, runs the tests, builds with the
`/Peel-to-Reveal/` asset prefix, and publishes `dist`. The normal local
preview keeps its root URL: run `npm run dev`. Use `npm run build:pages`
to reproduce the hosted build.
