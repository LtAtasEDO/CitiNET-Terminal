# CitiNET Terminal

A fictional network, email, file, and vehicle-shop terminal system for **Foundry VTT v12** and the **Cyberpunk RED Core** system.

CitiNET Terminal lets a GM build fixed computers or portable laptops, author player-facing content, bind terminals to Scene Tiles, protect emails and files with Hexcode Breach Lite, export data to Memory Chips, and run Autofixer vehicle listings without sending players outside Foundry.

> **Stable release v1.0.1.** Existing v0.7.x, v0.8.0 beta, and v1.0.0 terminal data is normalized automatically; no manual content migration is required.

## Requirements

- Foundry Virtual Tabletop **v12.343**
- Cyberpunk RED Core **v0.92.1+** (verified through **v0.92.4**)
- **Recommended:** Simple Calendar **v2.4.17+** for the in-world terminal clock
- **Recommended:** Monk's Active Tile Triggers for click-to-open terminal Tiles
- **Optional:** [Hexcode Breach Lite](https://github.com/LtAtasEDO/Hexcode-Breach-Lite) **v1.2.0+** for encrypted emails and files

No compendium packs, hosted services, or external web access are required.

## Quick Start

1. Enable **CitiNET Terminal** in a Cyberpunk RED world.
2. As GM, open **Token Controls → CitiNET Terminal Manager** using the terminal icon.
3. Create one of the following:
   - **New Computer** for a fixed Scene-local terminal.
   - **New Portable / Laptop** for a terminal that can move between Scenes.
   - **New Autofixer** for a vehicle-sales terminal.
4. Press the terminal's **Edit** button and configure its sections, trace settings, emails, files, and vehicles.
5. Select the Scene Tile or Tiles that should open the terminal and press **Bind Selected Tile**.
6. In CitiNET Terminal Manager, press **Create/Update Helper Macro** once.
7. Add the generated `CitiNet Terminal — Open Bound Tile` Macro to a Monk's **Run Macro** action. Leave Monk's **Arguments** blank.
8. Trigger the Tile as a player.

The helper Macro is universal. The Tile binding decides which terminal opens, so you do not hard-code a terminal ID into each Macro action.

## Terminal Types and Storage Scopes

| Type or scope | Best for | Behavior |
|---|---|---|
| **Computer / Scene-local** | Kiosks, office computers, wall terminals | Opens only on its assigned Scene. Moving it removes incompatible off-scene bindings after confirmation. |
| **Portable / Laptop (World)** | Carried laptops, stolen devices, recurring props | Opens from any Scene. Copy the bound Tile with its flags intact, or bind another Tile to the same profile. |
| **Autofixer** | Vehicle listings and roleplay dealerships | Includes vehicle browsing, payment, Actor Item delivery, and El Capitán's delivery message. |

Change **Storage Scope** in the Terminal Editor to convert an existing profile. Scene-local → Portable upgrades its matching Tile flags. Portable → Scene-local keeps bindings on the active Scene and removes off-scene bindings.

Use **Unbind Selected Tile** to remove only the current terminal's binding from one or more selected Tiles. Tiles bound to another terminal are left untouched.

## Monk's Active Tile Triggers

Press **Create/Update Helper Macro** in CitiNET Terminal Manager. CitiNET creates or repairs:

`CitiNet Terminal — Open Bound Tile`

Use that Macro in a Monk's **Run Macro** action and leave the Monk's **Arguments** field blank. The helper forwards Monk's Tile, Token, Actor, and action context to CitiNET.

The equivalent script is:

```js
return game.citinet({
  args: typeof args === "undefined" ? null : args,
  tile: typeof tile === "undefined" ? null : tile,
  token: typeof token === "undefined" ? null : token,
  actor: typeof actor === "undefined" ? null : actor
});
```

## Authoring Content

### Emails

Open a terminal's Editor, enable **Inbox**, and add an Email. Configure its sender, recipient, fictional timestamp, image, body, gallery, publication state, trace cost, optional Hexcode lock, and optional Shard export.

Email READ/UNREAD state is stored per player. Opening an email marks it read. A Netrunner may deliberately mark it unread again. GM Preview never changes player read state.

### Local Files

Enable **Local Files** and add a File. Files support the same body, image, gallery, trace, lock, and Shard controls as Emails.

A File may also contain **Shared Randomized File Data**:

1. Drag a world or compendium RollTable into the File Editor.
2. Choose how many results the shared reveal should contain.
3. Save the File.
4. The first authorized live open rolls once through the active GM and stores that reveal for everyone.

Every player then sees the same result across windows, Scenes, and restarts. **Roll New Shared Result** stages a replacement. **Clear Reveal** makes the next authorized live open roll again. GM Preview draws temporarily and never locks the live result.

### CitiNET Pages

Use **New Netpage** in CitiNET Terminal Manager. Netpages are global and may appear on every terminal whose CitiNET section is enabled. Each page has a title, category, directory-card excerpt, primary image, body, gallery, publication state, trace cost, and optional Shard export.

Choose a terminal's connection mode:

- **Cached / Offline:** netpage navigation does not add trace.
- **Online (Roleplay):** netpage navigation uses the configured trace costs.

Both are simulated in Foundry. CitiNET never contacts the real internet.

### Visual and HTML Editors

Email, Local File, and CitiNET Page bodies open in Foundry's visual ProseMirror editor. CitiNET uses Foundry's complete native `.editor.prosemirror` host, so the compact toolbar and its Format, Font, Table, and icon dropdown behavior match native character-sheet and Journal editors. CitiNET's normal button palette still supplies the yellow controls and cyan hover.

Choose **HTML Source** for direct markup and **Visual** to return without losing the source edits. Enter and Shift+Enter retain their normal editor behavior and do not submit the surrounding window. If Foundry's visual editor cannot start, HTML Source remains available as the safe fallback.

**Ordinary web links are rendered as inert fictional-network text and cannot open an external browser**. Foundry document links and inline rolls remain functional inside Foundry.

## Hexcode Breach Lite Locks

Hexcode Breach Lite **v1.2.0+** is optional. With it active, an Email or Local File can use a puzzle from either:

- the active Scene's puzzle library, or
- Hexcode's Portable (World) puzzle library.

A live lock requires the current Actor to have the **Netrunner** Role or **Interface** Role Ability. GM status does not bypass a live terminal lock. CitiNET launches the assigned scoped puzzle and validates Hexcode's explicit close result.

Only a verified `success` where every sequence was cracked unlocks the content. CitiNET also verifies that the solved-sequence count and unique sequence-ID list are complete, including v1.2.0 runs where multiple sequences share overlapping hexes. `partial`, `failure`, `aborted`, native Hexcode GM Preview results, mismatched puzzles, mismatched scopes/Scenes, mismatched Actors, and inconsistent result metadata remain locked.

Unlocks are per Foundry user and exact lock revision. Changing the assigned puzzle invalidates older unlocks. A Scene-local lock remains tied to its Scene; a Portable lock can launch from any Scene.

For safe testing, open CitiNET's **GM Preview**, select a Netrunner Token, and run the breach there. A full success unlocks only that preview window and never creates a permanent player unlock or modifies Hexcode rewards.

Hexcode v1.2.0 preserves the companion-module result contract used by CitiNET while adding overlapping-sequence resolution, buffer-aware solvable attempt matrices, and serialized one-time reward settlement inside Hexcode itself.

## Export to Shard

The GM may enable **Export to Shard (Memory Chip)** on an Email, File, or CitiNET Page. The selected Token's Actor is used first, falling back to the user's assigned Character.

Every export—including a Netrunner export—requires a usable `Memory Chip`:

- Gear marked **carried** or **equipped** qualifies.
- Cyberware installed through an Actor's installed-item list qualifies.
- Owned-only Gear, uninstalled Cyberware, missing chips, and zero-quantity chips are rejected with a private warning.

The GM may require no check or a manual **Basic Tech** / **Electronics/Security Tech** check at DV 6–29. A Netrunner bypasses a configured DV but never bypasses the physical Memory Chip or an unresolved Hexcode lock.

The attempt and any required DV are posted publicly in a CitiNET-styled chat card. CitiNET does not automate the skill roll.

## Trace Behavior

Trace progress is stored per user and terminal and survives closing or reopening the window. Every role accumulates trace, preventing a player from switching Actors to evade a terminal lockout.

- Netrunners see the trace meter and warnings.
- Other roles are traced silently and receive a generic connection termination at full trace.
- Active GMs receive private alerts at the warning threshold and full trace.
- **Reset Trace Records** advances one GM-owned terminal revision, releasing active and offline players without editing their User documents.

Individual content may add trace on top of the terminal's base navigation cost.

## Simple Calendar Time

CitiNET uses Simple Calendar's active in-world date, time, and configured display format. Open terminal windows refresh when the GM advances or rewinds the calendar.

If Simple Calendar is disabled or still loading, CitiNET displays `CALENDAR OFFLINE`. It never reveals or falls back to the computer's real-world clock. Fictional Email/File timestamp fields remain GM-authored text for historical messages.

## Autofixer Vehicles

Drag Cyberpunk RED Vehicle Items into an Autofixer terminal. CitiNET snapshots their data and displays vehicle cards using CPR fields including `system.speedCombat` and `system.speedNarrative`.

The buyer is the first controlled Token's Actor, falling back to the user's assigned Character. CitiNET verifies Actor ownership and funds, deducts `system.wealth.value`, records the transaction in the CPR wealth ledger, and creates a fresh embedded Vehicle Item. If Item creation fails after payment, CitiNET attempts an automatic refund.

The player-facing receipt confirms that El Capitán from Autofixer will arrange delivery of the new ride.

## Installing from GitHub

Repository: [LtAtasEDO/CitiNET-Terminal](https://github.com/LtAtasEDO/CitiNET-Terminal)

### Foundry manifest install

When the GitHub release includes both `module.json` and `module.zip`, paste this URL into Foundry's **Install Module → Manifest URL** field:

```text
https://github.com/LtAtasEDO/CitiNET-Terminal/releases/latest/download/module.json
```

The latest manifest always follows the repository's current stable GitHub release.

### Manual install

1. Download `module.zip` from the desired GitHub Release.
2. Shut Foundry down completely.
3. Remove the old `Data/modules/citinet-terminal/` folder when upgrading from an older or suspicious install.
4. Extract the release so the final path is:

```text
FoundryVTT/Data/modules/citinet-terminal/module.json
```

5. Start Foundry and enable **CitiNET Terminal** in the world.

Do not install it one folder too deep. This is wrong:

```text
Data/modules/citinet-terminal/citinet-terminal/module.json
```

Because CitiNET declares a package socket for shared RollTable reveals, fully restart Foundry after installing or updating it.

## Upgrade Troubleshooting

If Foundry reports the wrong version, an old editor layout remains, a helper Macro behaves differently on the player client, or runtime behavior does not match the release:

1. Fully shut down Foundry.
2. Confirm no Foundry or Node process remains running.
3. Delete the entire `Data/modules/citinet-terminal/` folder.
4. Install a fresh complete release.
5. Restart Foundry and confirm:

```js
game.modules.get("citinet-terminal")?.version
```

Overlaying new files can leave stale JavaScript, CSS, or templates behind. Terminal data is stored in the world and is not deleted with the module folder.

For Hexcode lock problems, also confirm:

```js
game.modules.get("hexcode-breach-lite")?.version
```

It must report `1.2.0` or newer for this build.

## Public API

```js
// Monk's / bound-Tile entry point.
await game.citinet(context);

// Open the GM Manager.
game.citinetTerminal.openManager();

// Open a known terminal directly.
game.citinetTerminal.openTerminal("TERMINAL_ID");

// Bind or unbind selected Tiles.
await game.citinetTerminal.bindSelectedTiles("TERMINAL_ID");
await game.citinetTerminal.unbindSelectedTiles("TERMINAL_ID");

// Create or repair the universal helper Macro.
await game.citinetTerminal.createHelperMacro();

// Read a normalized clone of the world database.
await game.citinetTerminal.loadDB();
```

## Storage Model

- Terminal profiles, local content, vehicle snapshots, Netpages, trace revisions, and shared randomized reveals: hidden Foundry world setting managed by CitiNET Terminal.
- Tile bindings: `flags.citinet-terminal.binding`
- Per-user trace, READ/UNREAD, and Hexcode unlock state: Foundry User flags managed by CitiNET Terminal.

Deleting and reinstalling the module folder does not erase world data. Back up the Foundry world before any major upgrade as normal.

## Credits and Asset Notice

Created by **Lt Atlas** for Cyberpunk RED on Foundry VTT, with development assistance from AI.

The bundled terminal icon uses the human-authored Lucide **Square Terminal** geometry under the ISC License with CitiNET presentation styling (The icon was originally contributed by GitHub user `@mittalyashu` through Lucide pull request #181). Full attribution and the license text are included in `THIRD_PARTY_NOTICES.md`.

This project is unofficial fan tooling and is not affiliated with R. Talsorian Games, Foundry Gaming LLC, or CD PROJEKT RED.
