# Maatje

Een oranje pixel-poppetje dat over je bureaublad loopt, en dat Claude kan besturen.

![Maatje loopt, praat, steekt vuurwerk af en typt op zijn laptopje](docs/maatje.gif)

**English:** Maatje ("little buddy") is a pixel desktop pet for Windows. It walks on top of your taskbar,
across all your screens, and an AI coding assistant such as Claude Code can control it with plain-text
commands (walk, talk, fireworks, laser eyes and about 50 more). It can also follow along with Claude Code:
it types on a tiny laptop while Claude works, waves when Claude needs you and cheers when Claude is done.
Commands and documentation are in Dutch. This is an unofficial fan project, not affiliated with Anthropic.

## Wat kan hij

- **Over je bureaublad lopen.** Hij staat boven op de taakbalk en loopt over al je schermen.
  Je klikt gewoon door hem heen, behalve als je de muis óp hem zet.
- **Doen wat Claude zegt.** Zo'n 50 opdrachten in gewone woorden: lopen, rennen, springen, salto, vliegen,
  tegen de muur klimmen, een rondje over het plafond, praten, vuurwerk, laser uit zijn ogen, bliksem,
  zwaardslag, sneeuw, voetballen, hoeden, kleuren, en vriendjes die hem nadoen.
- **Meeleven met Claude Code.** Hij typt zolang Claude bezig is, zwaait als Claude je iets vraagt,
  en roept "Klaar!" als Claude klaar is.
- **Met jou spelen.** Klik hem aan voor een hartje, pak hem op en gooi hem weg, of aai hem met de muis.
- **Vanzelf wat rondscharrelen** als niemand hem iets vraagt. Blijf je lang weg, dan valt hij in slaap.

## Wat heb je nodig

- Windows 10 of 11 (op een Mac of op Linux werkt hij niet)
- [Node.js](https://nodejs.org) 18 of nieuwer
- Voor het meeleven: [Claude Code](https://claude.com/claude-code)

## Installeren

```
git clone https://github.com/thomheijdemann/maatje.git
cd maatje
npm install
node maatje.js start
```

`npm install` haalt Electron op (het programma waar Maatje in draait, ongeveer 110 MB). Daarna kun je
ook dubbelklikken op `maatje-start.cmd`. Maatje valt uit de lucht, rechts op je eerste scherm.

Zegt Maatje bij het starten dat Electron nog niet is uitgepakt? Sommige versies van npm slaan dat stapje
over. Typ dan `node node_modules/electron/install.js` en start opnieuw.

| Wat | Hoe |
|---|---|
| Starten | `node maatje.js start` of dubbelklik `maatje-start.cmd` |
| Afsluiten | `node maatje.js sluit`, `maatje-stop.cmd`, of rechtsklik op het icoontje bij de klok |
| Even weg (bij een spel of een opname) | rechtsklik op het icoontje bij de klok en kies Verbergen |
| De show | `node maatje.js show` of dubbelklik `maatje-show.cmd` |

Hij start niet vanzelf als je de pc aanzet. Het icoontje bij de klok kan onder het pijltje `^` zitten.

## Opdrachten geven

```
node maatje.js zeg Hoi!
node maatje.js "loop midden; spring hoog; juich"
node maatje.js hulp
```

`node maatje.js hulp` laat alle opdrachten zien, met bij elke opdracht een voorbeeld. In deze map kun je
ook kort `maatje zeg Hoi!` typen.

| Soort | Opdrachten |
|---|---|
| Bewegen | `loop`, `ren`, `sluip`, `spring`, `salto`, `draai`, `teleport`, `vlieg`, `land`, `klim`, `rondje` |
| Praten | `zeg`, `denk`, `roep`, `fluister`, `stil` |
| Gevoel | `emotie`, `ogen`, `kijk`, `zwaai`, `juich`, `knik`, `schud`, `buig`, `schrik`, `dans`, `zit`, `sta`, `slaap`, `wakker`, `typ` |
| Effecten | `vuurwerk`, `laser`, `bliksem`, `regenboog`, `sneeuw`, `titel`, `zwaard`, `bal`, `trap`, `voetbal` |
| Uiterlijk | `kleur`, `maat`, `hoed` |
| Vriendjes | `kloon`, `opruimen` |
| Overig | `wacht`, `stop`, `vrij`, `geluid`, `meeleven`, `weg`, `kom` |

Een plek kan zijn: `links`, `midden`, `rechts`, `ergens`, `muis`, `50%`, `s2:50%` (tweede scherm),
`+200` of `-200` (pixels verder) of een pixel.

## Claude hem laten besturen

Zeg tegen Claude Code waar Maatje staat, bijvoorbeeld in je `CLAUDE.md`:

```
Op deze pc loopt Maatje, een poppetje op het bureaublad dat jij kunt besturen.
Alle opdrachten: node C:/pad/naar/maatje/maatje.js hulp
Voorbeeld:       node C:/pad/naar/maatje/maatje.js "loop midden; roep Klaar!; juich"
```

Handig voor Claude:

- `--wacht` achter een opdracht: pas terugkomen als Maatje klaar is.
- `node maatje.js status`: waar hij is en wat hij doet.
- `node maatje.js foto plaatje.png --rond`: een plaatje van wat Maatje op dit moment tekent
  (alleen Maatje zelf, niet je scherm).
- Elke opdracht start Maatje vanzelf als hij nog niet loopt.

## Meeleven met Claude Code

```
node maatje.js koppel
```

Dat zet een paar regels ("hooks") in `~/.claude/settings.json`. Wat daar al stond blijft staan, en er
wordt eerst een reservekopie gemaakt. Vanaf dan:

| Wat Claude doet | Wat Maatje doet |
|---|---|
| Claude is bezig | hij zit op zijn laptopje te typen, met af en toe een denkpauze |
| Claude zet een hulpje in (een subagent) | er komt een vriendje bij dat meetypt |
| Claude vraagt je iets of wil toestemming | hij stopt, zwaait en zegt "Kom je even kijken?" |
| Claude is klaar met zijn beurt | hij juicht en roept "Klaar!" |

- Het scriptje `haak.js` vertelt Maatje alleen wát er gebeurt (werkt, klaar, heeft je nodig) en bij
  welke sessie. Het geeft niet door wat je typt of wat Claude doet.
- Loopt Maatje niet, dan gebeurt er niets.
- Even uit: rechtsklik op het icoontje bij de klok en haal het vinkje bij "Meeleven met Claude" weg.
- Helemaal weg: `node maatje.js ontkoppel`. Doe dat ook voordat je deze map verplaatst of weggooit,
  anders meldt Claude Code bij elke stap dat hij het script niet kan vinden.

## Je eigen show maken

Een show is een tekstbestand in de map `shows`, met één opdracht per regel. Kijk naar `shows/hallo.txt`
voor een klein voorbeeld. Afspelen: `node maatje.js speel hallo`.

```
# een regel met # is uitleg
loop midden
zwaai
zeg Hoi {naam}!
+zeg Ik praat terwijl ik loop
loop +200
herhaal 3
spring
einde
```

- `+` voor een opdracht: niet wachten tot hij klaar is.
- `herhaal 3` ... `einde`: dat stuk drie keer.
- `{naam}` wordt de naam waarmee je op je pc bent aangemeld.
- Staat er een tikfout in, dan zegt hij welke regel het is en doet hij niets.

## Hoe het in elkaar zit

- `app/main.js`: één doorzichtig venster over alle schermen (altijd bovenop, pakt geen focus, klikken
  gaan erdoorheen), het icoontje bij de klok, en een "named pipe" waarover opdrachten binnenkomen.
  Er staat geen netwerkpoort open.
- `app/js/figuur.js`: hoe het poppetje getekend wordt en beweegt (14 bij 10 pixels, helemaal in code).
- `app/js/acties.js`: alle opdrachten. Een nieuwe opdracht is één blokje `opdracht('naam', {...})`;
  de hulp, de taal en de proef nemen hem dan vanzelf mee.
- `app/js/fx.js`: vuurwerk, laser, bliksem, sneeuw, de bal. `app/js/letters.js`: eigen pixelletters.
- `app/js/brein.js`: wat hij vanzelf doet, de muis, en het meeleven.
- `maatje.js`: de bediening. `haak.js`: het scriptje dat Claude Code aanroept.
- Geluid is in code gemaakt (zachte piepjes). Uitzetten: `node maatje.js geluid uit`.

Testen zonder venster: `npm test`. Dat start het echte programma onzichtbaar, zet de tijd met de hand
vooruit en loopt alles na: elke opdracht, de muis, het meeleven, en of er niets op het scherm blijft
staan. Het filmpje hierboven maak je opnieuw met `node tools/maak-film.js` (ffmpeg nodig).

## Goed om te weten

- Gemaakt en getest op één pc: Windows 10, twee schermen van 1920 bij 1080.
- Schermen met een andere vergroting dan je hoofdscherm doen niet mee.
- Bij een spel op volledig scherm kun je hem beter verbergen (icoontje bij de klok).
- Het geluid is gemaakt door een AI die niet kan horen. Is het lelijk, zet het dan uit.

## Onofficieel

Maatje is een fanproject. Het poppetje is nagetekend naar het mannetje van Claude Code, en dat mannetje
is van [Anthropic](https://www.anthropic.com). Dit project hoort niet bij Anthropic en is niet door
Anthropic gemaakt of goedgekeurd. "Claude" is een merk van Anthropic.

De code heeft de MIT-licentie (zie `LICENSE`): je mag hem gebruiken, veranderen en doorgeven.
Bijna alle code is geschreven door Claude, op verzoek van de maker.
