# GeekCalendar

![GeekCalendar](geekcalendar.gif)

A TUI (Text User Interface) calendar application built with Node.js and [Ink](https://github.com/vadimdemedes/ink). Supports importing events from Calcure and Calcurse.

## Features
- Interactive calendar in your terminal
- Add, edit, and delete events
- Recurring events (weekly, monthly, yearly)
- Import events from Calcure and Calcurse
- Save/load events (stored in `~/.config/geekcalendar/calendar.json`)
- Restore from local backups or GitHub history (last 5)
- Sync events with a GitHub repository

## Getting Started

### Prerequisites
- Node.js (v16+ recommended)

### Installation

This project uses Node.js and has the following dependencies:

- @octokit/rest
- ink
- js-yaml
- react

To install these dependencies, run the following command in the project directory:

```sh
npm install @octokit/rest ink js-yaml react
```

### Run the app (local)
```sh
npm start
```

### Install globally as a CLI
To use `geekcalendar` from anywhere, run the following command from the project directory:
```sh
npm install -g .
```

Then run:
```sh
geekcalendar
```

## Nix and NixOS

### Nix (flakes)
- Run without installing:
```sh
nix run github:fearlessgeekmedia/geekcalendar
```

- Install to your user profile:
```sh
nix profile install github:fearlessgeekmedia/geekcalendar
```

- From a local clone (this repo):
```sh
cd geekcalendar
nix develop      # optional dev shell (Node.js 20)
nix run .#geekcalendar
# or install
nix profile install .#geekcalendar
```

### NixOS (system-wide)
Add the package to your NixOS flake and rebuild:

```nix
# flake.nix (top-level)
inputs.geekcalendar.url = "github:fearlessgeekmedia/geekcalendar";

# flake.nix (in your host's configuration)
outputs = { self, nixpkgs, ... }@inputs: {
  nixosConfigurations.myhost = nixpkgs.lib.nixosSystem {
    # ...
    modules = [
      ({ pkgs, ... }: {
        environment.systemPackages = [
          inputs.geekcalendar.packages.${pkgs.system}.geekcalendar
        ];
      })
    ];
  };
};
```

Then:

```sh
sudo nixos-rebuild switch --flake /etc/nixos#$(hostname -s)
```

### Home Manager
Add to your Home Manager configuration:

```nix
{ pkgs, inputs, ... }:
{
  home.packages = [
    inputs.geekcalendar.packages.${pkgs.system}.geekcalendar
  ];
}
```

## Project Structure
- `src/components/` – Ink React components
- `src/importers/` – Parsers for Calcure and Calcurse
- `src/calendarData.js` – Calendar data model
- `src/index.js` – Entry point

---

## GitHub Sync

To sync your calendar with a GitHub repository, you need to create a `config.yml` file at `~/.config/geekcalendar/config.yml` with the following content:

```yaml
github:
  owner: YOUR_GITHUB_USERNAME
  repo: YOUR_GITHUB_REPOSITORY_NAME
  path: calendar.json # You can change the filename if you want
  token: YOUR_PERSONAL_ACCESS_TOKEN # Or set env var instead
```

Replace the placeholder values with your GitHub username, the name of the repository you want to sync to, and a GitHub Personal Access Token with `repo` scope.

Tokens can be provided via environment variables (recommended): `GEEKCAL_GITHUB_TOKEN`, `GITHUB_TOKEN`, or `GH_TOKEN`.

Once you have configured the `config.yml` file, you can use the `y` key in the application to sync your calendar data.

Notes:
- The app automatically saves your in-memory events before syncing to avoid losing changes.
- Local backups are created at `~/.config/geekcalendar/backups/` prior to sync or overwrites.
- GeekCalendar stores the last 5 synced commit SHAs in `~/.config/geekcalendar/sync_meta.json`.
- Sync favors newer content by timestamp and handles basic update conflicts by retrying with the latest remote.

### Restore from GitHub history
- Press `r`, then `g` to view the last 5 commits for the configured repo/path and choose one to restore.

---

## Keybindings

- `←/h` and `→/l`: Change month
- `SHIFT+J`: Next year
- `SHIFT+K`: Previous year
- `g`: Jump to today
- `a`: Add event
- After adding, you can choose to make it recurring (weekly/monthly/yearly) and provide how many additional occurrences.
- `e`: Edit selected event
- `d`: Delete selected event (with confirmation)
- `s`: Save events to file
- `S`: Load events from file
- `c`: Import from Calcure (`~/.config/calcure/events.csv`)
- `u`: Import from Calcurse (`~/.local/share/calcurse/apts`)
- `y`: Sync with GitHub
- `r`: Restore from backup/history (choose local backups or GitHub history)
- `q`: Quit

## Recurring Events
After adding an event, GeekCalendar asks if you want to make it recurring.

- Recurrence types: weekly, monthly, yearly
- You specify how many additional occurrences to create
- Dates are clamped for shorter months and leap years (e.g., Jan 31 → Feb 28/29)

Recurring events are stored as individual events (no special recurrence metadata), so they are compatible with import/export and syncing as simple JSON.

## Restore from Backups or History
- Local backups are saved automatically to `~/.config/geekcalendar/backups/` with timestamps. Press `r` then `l` to pick one.
- GitHub history: press `r` then `g` to list the last 5 commits for your calendar file and restore the content from any of them.

## Importing from Calcure and Calcurse
- Calcure events: `~/.config/calcure/events.csv`
- Calcurse events: `~/.local/share/calcurse/apts`

Use the in-app keybindings to import from these files.

---

## Data Location

By default, all your calendar events are saved to:
```
~/.config/geekcalendar/calendar.json
```


## 💖 Support GeekCalendar

If GeekCalendar is useful to you, please consider supporting its development!

- [Buy me a coffee on Ko-fi](https://ko-fi.com/fearlessgeekmedia)

Your support helps keep this project alive and growing. Thank you!

---

## License
MIT
