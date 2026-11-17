# Maatje

A little orange pixel pet that walks across your desktop, and that Claude can control.

![Maatje runs, talks, sets off fireworks and types on his laptop](docs/maatje.gif)

*Maatje* is Dutch for "little buddy". He stands on top of your taskbar, walks across all your screens,
and does what Claude tells him: walk, talk, fly, set off fireworks. He can also follow along with
Claude Code: he types on a tiny laptop while Claude is working and cheers when Claude is done.

This is an unofficial fan project, made by a kid and Claude. It is not affiliated with Anthropic.

## What he can do

- **Walk across your desktop.** He stands on the taskbar and walks over every screen.
  You simply click through him, unless you put the mouse *on* him.
- **Do what Claude says.** About 50 commands in plain words: walk, run, jump, flip, fly, climb the side
  of the screen, run a lap across the ceiling, talk, fireworks, laser eyes, lightning, a sword strike,
  snow, soccer, hats, colors, and friends who copy him.
- **Follow along with Claude Code.** He types while Claude is busy, waves when Claude asks you
  something, and shouts "Done!" when Claude has finished.
- **Play with you.** Click him for a heart, pick him up and throw him, or pet him with the mouse.
- **Potter about by himself** when nobody asks him anything. Stay away long enough and he falls asleep.

## What you need

- Windows 10 or 11 (he does not work on a Mac or on Linux)
- [Node.js](https://nodejs.org) 18 or newer
- For following along: [Claude Code](https://claude.com/claude-code)

## Install

```
git clone https://github.com/thomheijdemann/maatje.git
cd maatje
npm install
node maatje.js start
```

`npm install` fetches Electron (the program Maatje runs in, about 110 MB). After that you can also
double-click `maatje-start.cmd`. Maatje drops out of the sky, on the right of your main screen.

Does Maatje say that Electron has not been unpacked yet? Some versions of npm skip that step.
Type `node node_modules/electron/install.js` and start again.

| What | How |
|---|---|
| Start | `node maatje.js start` or double-click `maatje-start.cmd` |
| Quit | `node maatje.js quit`, `maatje-stop.cmd`, or right-click the icon next to the clock |
| Hide for a while (a game, a recording) | right-click the icon next to the clock and choose Hide |
| The show | `node maatje.js show` or double-click `maatje-show.cmd` |

He does not start by himself when you turn on your pc. The icon next to the clock may be tucked away
under the little `^` arrow.

## Giving commands

```
node maatje.js say Hi!
node maatje.js "walk middle; jump high; cheer"
node maatje.js help
```

`node maatje.js help` lists every command with an example. Inside this folder you can also type the
short form: `maatje say Hi!`

| Kind | Commands |
|---|---|
| Movement | `walk`, `run`, `sneak`, `jump`, `flip`, `spin`, `teleport`, `fly`, `land`, `climb`, `lap` |
| Talking | `say`, `think`, `shout`, `whisper`, `quiet` |
| Feelings | `emote`, `eyes`, `look`, `wave`, `cheer`, `nod`, `shake`, `bow`, `startle`, `dance`, `sit`, `stand`, `sleep`, `wake`, `type` |
| Effects | `fireworks`, `laser`, `lightning`, `rainbow`, `snow`, `title`, `sword`, `ball`, `kick`, `soccer` |
| Looks | `color`, `size`, `hat` |
| Friends | `clone`, `cleanup` |
| Claude | `work`, `follow` |
| Other | `wait`, `stop`, `roam`, `sound`, `hide`, `come` |

A place can be: `left`, `middle`, `right`, `anywhere`, `mouse`, `50%`, `s2:50%` (second screen),
`+200` or `-200` (pixels further) or a pixel.

Maatje was born in the Netherlands, so the Dutch words work as well: `loop midden` is the same as
`walk middle`, and `zeg Hoi!` is the same as `say Hi!`. The help shows them in brackets.

## Letting Claude control him

Tell Claude Code where Maatje lives, for example in your `CLAUDE.md`:

```
Maatje, a little pet on the desktop, is running on this pc, and you can control him.
All commands: node C:/path/to/maatje/maatje.js help
Example:      node C:/path/to/maatje/maatje.js "walk middle; shout Done!; cheer"
```

Handy for Claude:

- `--wait` after a command: only come back when Maatje has finished.
- `node maatje.js status`: where he is and what he is doing.
- `node maatje.js photo picture.png --around`: a picture of what Maatje is drawing right now
  (only Maatje himself, never your screen).
- Every command starts Maatje by itself if he is not running yet.

## Following along with Claude Code

```
node maatje.js connect
```

This adds a few lines ("hooks") to `~/.claude/settings.json`. Whatever was already there stays, and a
backup is made first. From then on:

| What Claude does | What Maatje does |
|---|---|
| Claude is busy | he sits typing on his little laptop, with a thinking break now and then |
| Claude starts a helper (a subagent) | a friend joins him and types along |
| Claude asks you something or wants permission | he stops, waves and says "Can you take a look?" |
| Claude has finished his turn | he cheers and shouts "Done!" |

- The little script `hook.js` only tells Maatje *what* is happening (working, done, needs you) and for
  which session. It does not pass on what you type or what Claude is doing.
- If Maatje is not running, nothing happens.
- Off for a while: right-click the icon next to the clock and untick "Follow along with Claude".
- Gone completely: `node maatje.js disconnect`. Do that before you move or delete this folder too,
  otherwise Claude Code reports at every step that it cannot find the script.

## Making your own show

A show is a text file in the `shows` folder, with one command per line. Look at `shows/hello.txt` for a
small example. Play it with `node maatje.js play hello`.

```
# a line with # is an explanation
walk middle
wave
say Hi {name}!
+say I talk while I walk
walk +200
repeat 3
jump
end
```

- `+` in front of a command: do not wait until it is done.
- `repeat 3` ... `end`: that part three times.
- `{name}` becomes the name you are signed in with on your pc.
- If there is a typo in it, he tells you which line it is and does nothing.

## How it is put together

- `app/main.js`: one transparent window over all your screens (always on top, never takes focus, clicks
  go through it), the icon next to the clock, and a named pipe over which commands come in.
  No network port is opened.
- `app/js/figuur.js`: how the little guy is drawn and how he moves (14 by 10 pixels, all in code).
- `app/js/acties.js`: all commands. A new command is one small block `opdracht('name', {...})`;
  the help, the language and the test pick it up by themselves.
- `app/js/fx.js`: fireworks, laser, lightning, snow, the ball. `app/js/letters.js`: his own pixel letters.
- `app/js/brein.js`: what he does by himself, the mouse, and following along.
- `maatje.js`: the remote control. `hook.js`: the script Claude Code calls.
- The sound is made in code (soft beeps). Turn it off with `node maatje.js sound off`.

The code itself is written in Dutch: the names of the functions and the comments. Each file starts with
a short explanation in English. Everything you see as a user is English.

Test without a window: `npm test`. It starts the real program invisibly, moves time forward by hand and
checks everything: every command, the mouse, following along, and that nothing is left behind on the
screen. Make the clip at the top again with `node tools/make-gif.js` (needs ffmpeg).

## Good to know

- Made and tested on one pc: Windows 10, two screens of 1920 by 1080.
- Screens with a different scaling than your main screen do not take part.
- With a full-screen game it is better to hide him (the icon next to the clock).
- The sound was made by an AI that cannot hear. If it sounds ugly, turn it off.

## Unofficial

Maatje is a fan project. The little guy is drawn after the Claude Code mascot, and that mascot belongs
to [Anthropic](https://www.anthropic.com). This project is not part of Anthropic and was not made or
approved by Anthropic. "Claude" is a trademark of Anthropic.

The code has the MIT license (see `LICENSE` and `NOTICE.md`): you may use it, change it and pass it on.
Almost all of the code was written by Claude, at the request of the maker.
