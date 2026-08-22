# CitiNET-Terminal
An offline Foundry VTT 12 module for Cyberpunk RED v0.92.1+ that turns scene Tiles into editable computer terminals.

Module creation assisted by AI.

## Included in this beta

- Terminal Home with Inbox, Local Files, CitiNet, and Autofixer sections.
- GM-authored email, file, image-gallery, and global CitiNet content in a uniform dark interface.
- Focused, single-page CitiNet entries for quick roleplay information.
- Clear image pickers and gallery previews.
- External web navigation is disabled; displayed addresses remain inside the fictional network and cannot open a browser tab.
- Optional RollTable-backed Local Files with session-stable randomized text and result images.
- Per-terminal **Cached / Offline** and fictional **Online** CitiNet modes.
- Terminal date/time display and stored module timestamps use the active Simple Calendar in-world clock. Open terminals refresh when Simple Calendar advances or rewinds; real-world system time is never shown.
- Individual email/file locks that launch a scene-local Hexcode Breach Lite v1.0.0 puzzle.
- Per-user unlocks. One player cracking a file does not unlock it for everyone.
- Browser-style Home, Back, and Forward navigation.
- Configurable, persistent per-player trace progress for every role, with Netrunner-only awareness, GM warning/full-trace alerts, and reliable GM reset controls.
- Per-user email READ/UNREAD state, with a Netrunner-only **Mark Unread** action.
- Optional public **Export to Shard (Memory Chip)** actions with no check or GM-configured Basic Tech / Electronics/Security Tech DVs. Every Actor, including a Netrunner, must have a usable Memory Chip; Netrunners bypass only the DV.
- Drag-and-drop Cyberpunk RED Vehicle Items, automatic vehicle cards, immediate eurobuck payment, and delivery to the selected Actor.
- Scene-only terminal availability, selected-Tile binding, a helper macro creator, and Monk's Active Tiles-friendly arguments.

## Setup

1. Install the `citinet-terminal` folder in Foundry's `Data/modules` directory and enable it.
2. As GM, select Token Controls and press the terminal icon to open **CitiNet Terminal Manager**.
3. Create a Computer or Autofixer terminal.
4. Edit its content, select a Tile, and press **Bind Selected Tile**.
5. In Monk's Active Tiles, run this script action:

```js
return game.citinet({
  args: typeof args === "undefined" ? null : args,
  tile: typeof tile === "undefined" ? null : tile,
  token: typeof token === "undefined" ? null : token,
  actor: typeof actor === "undefined" ? null : actor
});
```

Keep the Monk's Active Tiles **Argument** field blank. After updating from v0.7.0, press **Create Helper Macro** once so the existing launcher is regenerated with the complete Tile context.

You may also open a known terminal directly:

```js
return game.citinet({ terminalId: "YOUR_TERMINAL_ID" });
```

## Simple Calendar time

CitiNet Terminal uses Simple Calendar's active calendar and configured date/time formats for the footer display. Advancing or rewinding Simple Calendar refreshes every open CitiNet player window automatically. Content authoring fields such as an email's fictional **Date / timestamp** remain GM-authored text so recovered messages can be older than the current calendar date.

If Simple Calendar is disabled or not ready, CitiNet displays `CALENDAR OFFLINE` and never falls back to the computer's real-world clock. Enable `foundryvtt-simple-calendar` and reopen or advance the calendar to restore the display.

## Vehicle purchases

The buyer is the first controlled Token's Actor, falling back to the user's assigned character. The module validates ownership and funds, deducts `system.wealth.value`, adds the full Vehicle Item to the Actor, and records the transaction in the Cyberpunk RED wealth ledger. The player-facing receipt stays in-world by confirming that El Capitán from Autofixer will arrange delivery of the purchased ride. If Item creation fails after payment, the module attempts an automatic refund.

## Hexcode locks

Hexcode Breach Lite v1.0.0 is optional. With it active, the GM can choose any puzzle from the active scene while editing an email or file. A live player must satisfy Hexcode Breach Lite's Netrunner/Interface-role gate and complete a successful breach. CitiNet's GM Preview now simulates the player lock instead of bypassing it: select a Netrunner Token to launch the assigned puzzle. A successful preview breach reveals the protected content only for that preview window and does not grant a permanent GM-user unlock.

Puzzles are scene-local. Open the terminal editor on the same scene that owns the intended puzzle before assigning the lock.

## Trace behavior

Trace progress is stored per user and per terminal, survives closing/reopening the terminal, and advances for every role. Each terminal sets a base navigation cost; individual emails, files, and CitiNet pages can add an extra cost. Actors with the Netrunner Role or Interface Role Ability see the trace meter and receive trace warnings. Other Roles accumulate the same trace silently and receive only a generic connection termination when it fills, preventing role-swapping from bypassing a traced terminal. At the warning threshold and at full trace, active GMs receive a private chat alert. Reset advances a GM-owned terminal revision, immediately invalidating every current and offline player's earlier trace without editing Player User documents.

The terminal editor also chooses a CitiNet connection mode:

- **Cached / Offline:** CitiNet directory and netpage navigation add no trace. Other configured sections may still add trace for any role.
- **Online (Roleplay):** the UI presents a fictional live CitiNet uplink and CitiNet navigation uses the configured trace costs for every role. The module never accesses the real internet.

## Content editor fields

- **Card excerpt:** short preview text shown beneath a CitiNet page title in the CitiNet directory.
- **Primary image:** image above an email, file, or netpage body. Wide banners scale down to the content width; small icon art retains its natural dimensions instead of stretching. A CitiNet page also uses this image as its directory thumbnail; without one, the globe remains.
- **Gallery images:** extra clickable thumbnails displayed after the body. Use **Add Image** to select each Foundry-hosted image, or enter one path per line.
- **Body:** HTML and Foundry document references are supported. Ordinary web addresses are rendered as inert simulated-network text and cannot open an external browser.
- **Randomized File Data:** drag a world or compendium RollTable into a Local File. The module snapshots its results so players do not need RollTable permissions. Text results appear in a generated-data panel and result images join the gallery. The draw remains stable until that terminal window closes.
- **Export to Shard:** optionally expose an export action. Before any export, the module checks the selected Token's Actor, falling back to the user's assigned character. A `Memory Chip` Gear Item qualifies only when `system.equipped` is `carried` or `equipped`; a `Memory Chip` Cyberware Item qualifies only when its Item ID appears in an installed cyberware list. Merely owned or uninstalled chips produce a private warning telling the player to ready the chip and retry. The GM can require no check or a manual Basic Tech / Electronics/Security Tech check at DV 6–29. The attempt and DV appear in the public chat using the CitiNet interface style. A Netrunner still needs the Memory Chip and bypasses the DV only when a check is configured. Hexcode-locked content must first be breached by a Netrunner before its Shard export is available.

## Public API

```js
game.citinet(args)
game.citinetTerminal.openManager()
game.citinetTerminal.openTerminal(terminalId)
game.citinetTerminal.bindSelectedTiles(terminalId)
game.citinetTerminal.createHelperMacro()
game.citinetTerminal.loadDB()
```
