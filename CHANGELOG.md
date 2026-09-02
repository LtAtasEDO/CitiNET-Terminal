# Changelog

## 0.7.6-beta.3 — 2026-09-01
- Added explicit attribution and licensing acknowledgement for the updated `citinet-terminal.svg` asset as it uses the human-authored **[Square Terminal](https://lucide.dev/icons/square-terminal)** geometry from Lucide Icons v1.8.0.
- Added `THIRD_PARTY_NOTICES.md` and a matching README section.
- No interface or other behaviors changed.

## 0.7.6-beta.2 — 2026-08-29

- Fixed a live Foundry hook-order collision that caused a verified full Hexcode success to remain encrypted.
- Foundry's automatic `closeHBLPlayerApp` event is now ignored without deleting CitiNet's pending breach handshake.
- CitiNet waits for Hexcode Breach Lite v1.0.5's second, explicit outcome-bearing hook before validating the puzzle, Actor, and solved-sequence totals.
- Preserved the full-success-only unlock rule: `partial`, `failure`, and `aborted` outcomes still remain encrypted.
- No terminal-data, Tile-binding, Hexcode-puzzle, or helper-Macro migration is required.

## 0.7.6-beta.1 — 2026-08-29

- Updated the optional Hexcode Breach Lite requirement and runtime integration to the live-validated v1.0.5 outcome contract.
- Replaced inspection of Hexcode's internal player-app state with the explicit `closeHBLPlayerApp` result metadata.
- CitiNet now unlocks an email or file only for an exact `success` result where every configured sequence was solved.
- `partial`, `failure`, and `aborted` results leave CitiNet content encrypted; partial runs display a concise reminder that full success is required.
- Validates the returned puzzle and Actor identifiers against the pending CitiNet lock before granting access.
- Ignores native Hexcode GM Preview outcomes. CitiNet's own GM Preview still grants only a session-local preview unlock after full success.
- Preserved the v0.7.5-beta.2 FilePicker and CPR Vehicle speed-field fixes; no terminal-data, Tile-binding, or helper-Macro migration is required.

## 0.7.5-beta.3 — 2026-08-29

- Verified and preserved the v0.7.5-beta.2 Foundry VTT 12 FilePicker repair for primary images, gallery images, and generic image-picker fields.
- Verified the Autofixer vehicle display against Cyberpunk RED Vehicle Items and retained `system.speedCombat` and `system.speedNarrative` as the first-choice Combat Move and Narrative Speed fields.
- Updated the optional Hexcode Breach Lite integration, manifest recommendation, runtime guidance, and documentation from v1.0.0 to the current stable v1.0.4.
- Confirmed that CitiNet's `listScenePuzzles`, `isNetrunner`, `openPuzzle(id, { actor })`, and successful-close integration remain compatible with Hexcode Breach Lite v1.0.4; no bridge rewrite or database migration is required.

## 0.7.5-beta.2 — 2026-08-25

- Fixed the Terminal Editor image pickers (primary image, gallery images, and the generic `data-picker-target` pickers) not opening on Foundry VTT 12: the pickers now open with `render(true)`.
- Added the Cyberpunk RED vehicle fields `system.speedCombat` and `system.speedNarrative` as first-choice fallbacks for the Autofixer vehicle Combat Move and Narrative Speed displays, so real CPR Vehicle Items populate those rows instead of showing blank.
- No database migration is required; existing terminal data is unchanged.

## 0.7.5-beta.1 — 2026-08-14

- Replaced the mechanical Autofixer receipt text `Vehicle Item delivered` with an in-world delivery message from El Capitán.
- Updated the player notification to confirm that El Capitán will arrange delivery of the purchased vehicle.
- Kept immediate payment, wealth-ledger recording, Vehicle Item creation, and automatic refund behavior unchanged.

## 0.7.4-beta.1 — 2026-08-14

- Restored trace accumulation and full-trace lockout for every role so switching to a non-Netrunner cannot bypass a traced terminal.
- Kept trace awareness Netrunner-only: Netrunners see the meter and warnings, while other Roles are traced silently and receive a generic connection termination.
- Preserved the v0.7.3 GM-owned trace revision reset, including reliable resets for active and offline players.
- Updated Manager and Terminal Editor wording to distinguish universal trace enforcement from Netrunner-only awareness.

## 0.7.3-beta.1 — 2026-08-14

- Replaced unreliable cross-user flag deletion in **Reset Trace Records** with a GM-owned per-terminal trace revision.
- Made one reset invalidate trace records for every active or offline player without attempting to update Player User documents.
- Added the terminal revision to newly stored trace states so repeated resets remain deterministic.
- Treats legacy trace states without a matching revision as expired, immediately releasing stale v0.7.2 lockouts after upgrading.
- Preserved Netrunner-only trace accumulation and lockout behavior from v0.7.2.

## 0.7.2-beta.1 — 2026-08-13

- Corrected trace scope so only an active Actor with the Netrunner Role or Interface Role Ability accumulates trace or can be locked out by a completed trace.
- Allowed every other Role to use Home, Inbox, Files, CitiNet, Autofixer, and ordinary Shard exports even when that user's older terminal trace record is full.
- Kept Hexcode-locked emails and files Netrunner-only and added an explicit local role check before CitiNet launches Hexcode Breach Lite.
- Prevented direct Shard-export actions from bypassing an unresolved Hexcode lock.
- Clarified Shard output so the Netrunner bypass badge appears only when the GM actually configured a DV check; all Roles still require a usable Memory Chip.
- Updated GM trace labels and documentation to state that the trace profile is Netrunner-only.

## 0.7.1-beta.1 — 2026-08-10

- Fixed player activations reporting `CitiNet Terminal could not identify a bound Tile` even though the GM successfully bound and opened the same Tile.
- Updated the generated Monk's Active Tiles helper to forward `args`, `tile`, `token`, and `actor` without throwing when any helper variable is unavailable.
- Added bounded recursive Tile resolution across nested Monk's payload, action, data, context, and value shapes.
- Preserved direct terminal IDs and older one-argument launcher payloads; no Tile rebinding or terminal-data migration is required.
- Replaced the missing core `icons/svg/circuit.svg` macro artwork with a module-owned terminal icon to remove its unrelated 404 error.

## 0.7.0-beta.1 — 2026-08-09

- Rebuilt Email, Local File, and CitiNet Page editors around a viewport-aware window with a dedicated internal scroll region and a fixed Save/Cancel bar.
- Fixed the editor's lower Shard options becoming unreachable unless the Foundry window was manually moved and enlarged.
- Changed CitiNet GM Preview to display assigned Hexcode locks instead of silently bypassing them.
- Added session-only GM Preview unlocks after a selected Netrunner completes the assigned Hexcode puzzle; closing the preview relocks the content and does not alter persistent user unlocks.
- Removed the Terminal Header Banner field, saved data, and player rendering.

## 0.6.1-beta.1 — 2026-08-09

- Fixed Email and Local File editor overflow caused by the Export to Shard help text.
- Reflowed Shard settings and help copy within the editor at narrow and standard window sizes.
- Rebuilt the player-facing Shard export panel so its requirement text and button no longer compress each other.
- Made configured terminal header artwork clearly visible behind the terminal name and clarified that wide banner images work best.

## 0.6.0-beta.1 — 2026-08-08

- Replaced the real-world browser clock with Simple Calendar's active in-world date and time.
- Used Simple Calendar's configured display formats so custom calendars remain authoritative.
- Refreshed every open player terminal when Simple Calendar advances or rewinds.
- Moved CitiNet's internal created, updated, read, unlock, binding, and trace timestamps to the Simple Calendar timestamp source.
- Added `foundryvtt-simple-calendar` as a recommended module for Foundry VTT 12.
- Added a `CALENDAR OFFLINE` state instead of exposing or falling back to real-world time when Simple Calendar is unavailable.

## 0.5.0-beta.1 — 2026-08-08

- Required every Shard export to verify that the selected Actor has a usable `Memory Chip`, including Netrunners.
- Recognized carried or equipped Memory Chip Gear Items and installed Memory Chip Cyberware Items using Cyberpunk RED v0.92.x Actor fields.
- Blocked export for merely owned Gear or uninstalled Cyberware and added a private warning telling the player how to ready the chip before retrying.
- Clarified that Netrunner Interface bypass applies only to the configured transfer DV, not the Memory Chip requirement.
- Added the verified chip state (carried, equipped, or installed) to successful CitiNet-styled Shard chat cards.

## 0.4.0-beta.1 — 2026-08-08

- Removed Page Sublinks and Related Links from all content editors and player-facing views to keep CitiNet pages focused and fast to use during play.
- Added automatic database migration that discards legacy Sublink and Related Link records while preserving page, email, file, gallery, lock, trace, RollTable, and Shard settings.
- Disabled external web navigation in enriched terminal content. Web addresses remain inert simulated-network text; Foundry document references and inline rolls continue to work inside Foundry.
- Added a defensive terminal click guard so raw HTML cannot launch an external browser tab even if an unsafe anchor survives enrichment.

## 0.3.0-beta.1 — 2026-08-08

- Restricted player-facing trace awareness to Actors with the Netrunner Role or Interface Role Ability; other Actors receive no trace meter or warning details.
- Added ordered CitiNet Page Sublinks between the primary image and body.
- Preserved wide banner presentation while preventing smaller icon art from being stretched to full content width.
- Moved email, file, CitiNet page, and RollTable-result galleries below their body content.
- Added explicit per-player email READ/UNREAD indicators and a Netrunner-only Mark Unread action.
- Added optional Export to Shard (Memory Chip) actions with no check or a GM-configured Basic Tech / Electronics/Security Tech DV.
- Added automatic Netrunner DV bypass and public CitiNet-styled Shard export chat cards.
- Added automatic database migration for existing beta terminal, email, file, page, link, lock, gallery, and RollTable data.

## 0.2.0-beta.1 — 2026-08-08

- Replaced leaked light Foundry surfaces with a uniform dark manager, editor, player, dialog, and purchase interface.
- Added explanatory text, image pickers, and live thumbnails for galleries.
- Replaced raw Related Link syntax with add/remove rows and selectable module destinations, including Home and section links.
- Added optional drag-and-drop RollTables for randomized Local File text and gallery imagery, stable for one terminal session.
- Added per-terminal Cached / Offline and fictional Online CitiNet modes; cached CitiNet browsing adds no trace.
- Added CitiNet directory thumbnails sourced from each page's Primary Image, with the globe retained as the fallback.
- Reduced Autofixer catalog card dimensions without changing the full vehicle detail view.

## 0.1.0-beta.1 — 2026-08-07

- First Foundry VTT 12 beta.
- Added world-persistent terminal profiles and global CitiNet pages.
- Added Home, Inbox, Local Files, CitiNet, and Autofixer views.
- Added browser-style Back, Forward, and Home navigation.
- Added GM email/file/netpage authoring with HTML, images, galleries, related internal links, publishing, and ordering.
- Added selected-Tile binding and `game.citinet(args)` helper support.
- Added persistent per-player trace progress, configurable thresholds, private GM alerts, full-trace locking, and GM resets.
- Added optional per-email/per-file Hexcode Breach Lite v1.0.0 locks with per-user unlocks.
- Added drag-and-drop Vehicle Item catalogs, Cyberpunk RED wealth-ledger purchases, Item delivery, duplicate-click protection, and automatic refund attempts.
