# GeekCalendar

![GeekCalendar](geekcalendar.gif)

A TUI (Text User Interface) calendar application built with Node.js and [Ink](https://github.com/vadimdemedes/ink). Supports importing events from Calcure and Calcurse.

## Features
- Interactive calendar in your terminal
- Add, edit, and delete events
- Import events from Calcure and Calcurse
- Save/load events (stored in `~/.config/geekcalendar/calendar.json`)

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
