# GeekCalendar

![GeekCalendar](geekcalendar.gif)

A TUI (Text User Interface) calendar application built with Node.js and [Ink](https://github.com/vadimdemedes/ink). Supports importing events from Calcure and Calcurse.

## Features
- Interactive calendar in your terminal
- Add, edit, and delete events
- Import events from Calcure and Calcurse
- Save/load events (stored in `~/.config/geekcalendar/calendar.json`)
- Sync events with a GitHub repository

## Getting Started

### Prerequisites
- Node.js (v16+ recommended)

### Install dependencies
```sh
npm install
```

### Run the app (local)
```sh
npm start
```

### Install globally as a CLI
To use `geekcalendar` from anywhere:
```sh
npm install -g
```

Then run:
```sh
geekcalendar
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
  token: YOUR_PERSONAL_ACCESS_TOKEN
```

Replace the placeholder values with your GitHub username, the name of the repository you want to sync to, and a GitHub Personal Access Token with `repo` scope.

Once you have configured the `config.yml` file, you can use the `y` key in the application to sync your calendar data.

---

## Keybindings

- `←/h` and `→/l`: Change month
- `SHIFT+J`: Next year
- `SHIFT+K`: Previous year
- `g`: Jump to today
- `a`: Add event
- `e`: Edit selected event
- `d`: Delete selected event (with confirmation)
- `s`: Save events to file
- `S`: Load events from file
- `c`: Import from Calcure (`~/.config/calcure/events.csv`)
- `u`: Import from Calcurse (`~/.local/share/calcurse/apts`)
- `y`: Sync with GitHub
- `q`: Quit

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

---

## License
MIT
