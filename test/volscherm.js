'use strict';
/* MAATJE - test of "full screen": which screens belong to a video or a game, and may his world be what is left?
   Plain arithmetic (app/volscherm.js), so no window and no Electron: node test/volscherm.js */
const { volSchermen, past } = require('../app/volscherm.js');

let fout = 0, n = 0;
function test(naam, goed, extra) { n++; if (!goed) fout++; console.log((goed ? '  ok    ' : '  FAIL  ') + naam + (extra !== undefined && !goed ? '   -> ' + JSON.stringify(extra) : '')); }
const gelijk = (a, b) => JSON.stringify(a) === JSON.stringify(b);

// two screens next to each other, as on many pcs: a full screen window is as high as the whole screen (taskbar included)
const S1 = { x: 0, y: 0, w: 1920, h: 1080 }, S2 = { x: 1920, y: 0, w: 1920, h: 1080 }, S3 = { x: 3840, y: 0, w: 1920, h: 1080 };
const W = (x, y, w, h, f) => ({ x, y, w, h, f: f ? 1 : 0 });
const maximaal1 = W(0, 0, 1920, 1040), video2 = W(1920, 0, 1920, 1080, true), video1 = W(0, 0, 1920, 1080, true);

test('no windows: no screen is full', gelijk(volSchermen([S1, S2], []), [false, false]));
test('a maximized window (it has a title bar) is not full screen', gelijk(volSchermen([S1, S2], [maximaal1]), [false, false]));
test('a video in full screen on screen 2, a window on screen 1: only screen 2 is full', gelijk(volSchermen([S1, S2], [maximaal1, video2]), [false, true]));
test('the same video on screen 1: only screen 1 is full', gelijk(volSchermen([S1, S2], [video1, W(1920, 0, 1920, 1040)]), [true, false]));
test('a video on both screens: both are full', gelijk(volSchermen([S1, S2], [video1, video2]), [true, true]));
test('a small notice on top of the video changes nothing', gelijk(volSchermen([S1, S2], [W(1500, 900, 300, 100), video1]), [true, false]));
test('a big normal window on top of the video: you look at that window now, so the screen is not full', gelijk(volSchermen([S1, S2], [W(0, 0, 1920, 1040), video1]), [false, false]));
test('a normal window UNDER the video does not matter', gelijk(volSchermen([S1, S2], [video1, maximaal1]), [true, false]));
test('a window of half the screen on top of the video: that is big enough to count (50% of the screen)', gelijk(volSchermen([S1, S2], [W(0, 0, 1920, 540), video1]), [false, false]));
test('a window of a third of the screen on top of the video: too small to count', gelijk(volSchermen([S1, S2], [W(100, 100, 900, 700), video1]), [true, false]));
test('a window with its middle on screen 2 belongs to screen 2 (the video on screen 1 stays full)', gelijk(volSchermen([S1, S2], [W(1800, 100, 1400, 900), video1]), [true, false]));
test('three screens, the video in the middle', gelijk(volSchermen([S1, S2, S3], [W(1920, 0, 1920, 1080, true)]), [false, true, false]));
test('full screen without any window on that screen: false (nothing known)', gelijk(volSchermen([S1, S2], [W(0, 0, 1920, 1040)]), [false, false]));

// Electron gives a box as { x, y, width, height }: that must work the same (this was a real bug: the width of a screen was "undefined", so the topmost window decided for ALL screens)
const E = r => ({ x: r.x, y: r.y, width: r.w, height: r.h });
test('screens in the way Electron writes them (width, height): a video on screen 2 and a window on screen 1 -> only screen 2 is full', gelijk(volSchermen([E(S1), E(S2)], [video2, W(0, 0, 1920, 1040)]), [false, true]));
test('... also when the window list is written that way', gelijk(volSchermen([E(S1), E(S2)], [E(video2), E(maximaal1)].map((r, i) => Object.assign(r, { f: i === 0 ? 1 : 0 }))), [false, true]));
test('... and "past" too', past([E(A0())], [E(S2)]) && !past([E(A0()), E({ x: 3840, y: 0, w: 1920, h: 1040 })], [E(S2)]));
function A0() { return { x: 0, y: 0, w: 1920, h: 1040 }; }

// his world = the screens that stay, as ONE box: it must not lie over a screen that is full
const A = { x: 0, y: 0, w: 1920, h: 1040 }, B = { x: 1920, y: 0, w: 1920, h: 1040 }, C = { x: 3840, y: 0, w: 1920, h: 1040 };
test('two screens, the right one is full: the left one is enough', past([A], [S2]));
test('two screens, the left one is full: the right one is enough', past([B], [S1]));
test('three screens, the right one is full: the two left ones make a box', past([A, B], [S3]));
test('three screens, the middle one is full: the box of the other two would lie over it -> he has to hide', !past([A, C], [S2]));
test('nothing left: hide', !past([], [S1]));
test('screens above each other: the lower one is full, the upper stays', past([{ x: 0, y: 0, w: 1920, h: 1040 }], [{ x: 0, y: 1080, w: 1920, h: 1080 }]));

console.log('\n' + n + ' checks, ' + fout + ' failed.');
process.exit(fout ? 1 : 0);
