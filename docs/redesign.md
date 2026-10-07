# Website redesign

Design brief, updated October 2, 2026. Implementation remains local on the
redesign branch; the public site has not been changed.

## Direction

The website is part of the practice: a structure through which images, texts,
memory, desire, uncertainty, and ritual can be encountered. Connections between
writing and visual work should become available through browsing, without every
work needing to explain its place in a thesis.

DESIRE PATH supplies conceptual and aesthetic inspiration: understanding that
accumulates through movement, partial encounters, and unexpected adjacency.
Develop a navigation structure specific to this website. Its mapping interface,
geographic coordinates, distance calculations, dimension toggles, and neighborhood
limits are not requirements for this redesign.

Keep a largely black background, white monospace text, and an esoteric atmosphere.
Use a pared-down web 1.0 vocabulary: system monospace, underlined links, native
disclosures, small type, dotted boundaries, and ASCII punctuation. Avoid large
hero typography, polished cards, and decorative animation. All rendered text
must be lowercase or uppercase except authored preformatted poetry.
The atmosphere should suggest a privately maintained fringe or occult website
from the late 1990s. Build that feeling through symbolic margins, personal
inscriptions, spare directories, and diagrams whose associations emerge through
use. A recurring original sigil and faint circular constructions give the site
its own language. Draw inscriptions from the actual writings. Keep the navigation
direct and the works particular; avoid simulated age, fake counters, novelty
badges, and stock occult slogans.
Push the composition beyond a tidy archive: abrupt changes of scale, colliding
image fragments, tilted text, torn repetitions, and uneven directory spacing.
Glitch is composed from the actual media and writing. Keep these choices in the
presentation data and shared CSS. The visible disorder must remain editable,
repeatable, and reversible. Links retain their identity and keyboard access;
the full poems and source artworks remain available at their existing URLs.
Preserve the particular texture of existing media. Evaluate compression, scale,
cropping, and repetition in relation to each work instead of applying a uniform
degradation effect.

The visitor's experience may be associative and nonlinear. The content structure,
editing workflow, and build must remain explicit, predictable, and organized.

## Symbols and typographic language

ASCII symbols and alchemical/astrological symbols are additional visual
references. Explore a vocabulary of marks alongside the white monospace text:

- ASCII punctuation, brackets, slashes, dots, and repeated characters can shape
  connections, boundaries, pauses, and small text-based diagrams. Audition forms
  such as `[ ]`, `::`, `*`, `/\\`, and `--->` within actual compositions.
- Alchemical and astrological glyphs can serve as recurring marks beside works,
  fragments, or passages between them. Audition a small set rather than assigning
  a symbol to every item immediately. Their use need not turn the site into a
  literal chart or impose an explanatory category on each artwork.
- Give both views a related typographic vocabulary. Network can use the marks
  spatially; Index can place them in margins, cross-links, and separators.

Treat any meanings or associations assigned by the website as authored design
decisions. Verify historical meanings before referring to them in copy. Avoid
automatically equating an artwork with a fixed occult interpretation.

Store the chosen symbol vocabulary and its use centrally, independently of work
identifiers and relationships. Symbols must not become the sole indication of a
control's purpose: provide clear accessible names and readable navigation cues.
Keep decorative marks out of screen-reader output. Alchemical/astrological
glyphs require Unicode beyond ASCII; verify font coverage, alignment, and mobile
rendering, and provide an appropriate fallback where needed.

## Two views of the same material

Working names: Network and Index.

- Network: a visible, authored map of all 31 works, using small image fragments,
  titles, and symbolic marks. Lines show actual curated connections. Selecting a
  mark highlights its immediate passages, updates the direct work link, and
  reveals a modest encounter below the diagram. Browser scrolling and a locate
  button support narrow screens. Keep a clear way to retrace, switch views, and
  reach the complete index.
- Index: a considered text-centric composition containing the same works and
  connections. Use typography, spacing, and cross-links to make it interesting
  on its own. Images remain available when opening a work.

Switching views should preserve the selected work. Navigation must work with
keyboard and touch, and the complete content must remain reachable without
JavaScript. Ambiguity in interpretation should coexist with legible controls.

## Content and relationships

Current sources contain 12 projects and 19 writings. Retain their existing keys,
URLs, assets, and external destinations. The writing titled DESIRE PATH (Vol. 1)
and the separate DESIRE PATH mapping project are distinct works.

Keep `json/projects.json` and `json/writings.json` as the existing work catalogs.
Keep relationships and presentation choices in `json/field.json`.
Relationships should reference stable identifiers, such as
`project:compiler-buddha` and `writing:flex-space`, rather than array positions,
display titles, or coordinates. Use type prefixes so future project and writing
keys can overlap safely.

Each connection should have an explicit source, destination, direction, and an
optional short visitor-facing phrase. Connections can arise from a formal echo,
material, process, concrete detail, or tension; they need not assign every work
to a thematic category. Store editorial reasoning separately from visible copy.
The build should reject duplicate identifiers and references to missing works.

Both views should be generated from the same catalogs and relationships. Store
presentation choices separately from content identity. Spatial placement should
not determine whether a work exists or which URL it owns. Fragment nodes can be
introduced later if they serve the experience; each should reference its source
work and a stable section identifier.

## Editorial approach

Review existing artwork copy individually. A work may need a short factual note,
an optional longer account, a fragment, or no visible explanatory copy. Long
statements should not automatically accompany the initial encounter.

Distinguish work text from explanatory text: poems, source code, quoted material,
and text constituting the artwork require different editorial treatment from
portfolio descriptions. Keep attribution, credits, practical viewing information,
image alt descriptions, and useful metadata independently of visible captions.
Decisions about captions must not remove access to the artwork itself.

For example, this is a possible short factual note for Compiler Buddha, to review
alongside the work rather than substitute automatically:

> A self-modifying script rebuilds its source code around an image of a Buddha.
> Alongside it, the reference image passes repeatedly through Stable Diffusion.

This leaves the experience of repetition and dissolution open. Further process
details and the relationship to Nam June Paik can remain available as an optional
account. An image work may need no equivalent caption.

Revise the About statement and generic project descriptions alongside the visual
design. Use the critique as a set of questions, not a replacement statement or a
fixed taxonomy for the practice.

## Incremental implementation

1. Audit work content and propose a small set of actual cross-work connections.
2. Build a local trial using a handful of works and both views, retaining the
   existing content pages as destinations. Assess navigation and reading before
   expanding the graph or revising copy across the catalog.
3. Review copy changes as explicit drafts, preserving originals through Git.
4. Extend the selected design to the full catalog and integrate existing URLs.

Continue using the static build and committed HTML. Extend existing validation
to cover relationship integrity, catalog coverage in both views, optional copy,
and generated-file consistency. Verify navigation, view switching, browser
history, keyboard use, and narrow screens in a browser.

## Baseline

- Preserved commit: `878e3e1aebfdef090c2990d98413d00c69b8f49a`.
- Rollback tag: `rollback/pre-redesign-2026-10-02`.
- Redesign branch: `redesign/site-2026-10-02`.
- The earlier `pre-network-redesign-2026-10-02` tag and
  `redesign/node-traversal` branch are retained.
- Keep work local until publishing is requested. Use small commits so design and
  editorial changes remain easy to review and revert.

## Sparse popup revision — 2026-10-07

The latest direction replaces tilts and large colliding fragments with sparse,
level elements. Keep the field irregular through placement, uneven scale, blank
space, and a few displaced image strips. All marks remain reachable; reveal only
the selected work and its immediate neighborhood. Relationships use horizontal
and vertical routes.

Both Network and Index open work previews in one plain native dialog, with notes
and passages folded until requested. Show one work at a time. Keep direct work
URLs and the static Index available, with native keyboard dismissal and focus
behavior. Preserve the preceding collage at `rollback/pre-popups-2026-10-07`.
