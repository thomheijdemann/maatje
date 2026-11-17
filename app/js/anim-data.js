'use strict';
/* MAATJE - the built-in animations. One per line:  name: moves
   A line with # starts a new kind. How the moves work is explained at the top of anim.js. */
const ANIMDATA = `
# greet
wave-hello: eyes:happy wave w/0.3
big-wave: eyes:happy rise&wave rise&wave
double-wave: eyes:happy wavel&waver*2
shy-wave: eyes:closed tl/0.4 wave/0.5 !heart
hello-hop: hop wave !text:HI! hop
bow: eyes:closed lean:1.4/1
deep-bow: eyes:closed lean:2/1.4 w/0.2
curtsy: eyes:happy dip tl:0.5 dip tr:0.5
salute: ar:-3 w/0.9 ar:0 nod
tip-hat: hat:tophat reach/0.5 nod w/0.3
high-five: lunge&pump !sparks !snd:pop hop
fist-bump: lunge/0.25 !sparks recoil/0.25 nod
handshake: lunge/0.3 pump*3 recoil/0.3
hug: au lunge/0.5 !hearts ad squash w/0.3
blow-kiss: eyes:closed lean/0.4 eyes:happy !hearts wave/0.5
peace-out: wave/0.5 spin !star go:120
thumbs-up: eyes:wink pump !star w/0.4
nod-yes: eyes:happy nod*3
shake-no: eyes:closed shake:1.2*2
shrug: eyes:big reach/0.6 tl:0.4 tr:0.4
beckon: pump*3 hop
point-left: face:l lunge/0.5 pump w/0.3
point-right: face:r lunge/0.5 pump w/0.3
point-up: look:u au w/0.8 ad
clap-hands: eyes:happy clap*5
slow-clap: clap/0.7*3
applause: eyes:happy clap*4 hop clap*4 !stars
welcome: reach/0.8 !text:WELCOME bob*2
goodbye: wave*2 !text:BYE! go:-90
see-you-later: eyes:wink wave spin wave
good-morning: eyes:happy stretch:1.2/0.8 reach/0.7 !text:MORNING
good-night: eyes:sleepy reach/0.8 !zzz dip*2
thank-you: eyes:closed lean/0.8 !heart hop
sorry: eyes:sad lean:1.2/1 !sweat
cheers: prop:cup raise*2 !sparks hop
excuse-me: !ex peek*2
nice-to-meet-you: eyes:happy lunge/0.3 pump*2 recoil/0.3 nod
after-you: face:r lean/0.6 swr*2
come-here: face:l pump*2 hop pump*2
over-here: jump wave*2 !text:HERE!

# feel
happy: eyes:happy hop*3
very-happy: eyes:happy jump !stars hop*2 spin
joy-jump: eyes:happy leap !text:YAY jump
laugh: eyes:happy !text:HAHA bob/0.2*8
giggle: eyes:closed shiver bob/0.2*4
rolling-laugh: eyes:happy roll !text:HAHA roll bob/0.2*4
smile: eyes:happy rise w/0.5
love: eyes:heart !hearts rise*2
in-love: eyes:heart !hearts float:0.6 !hearts w/0.4
shy: eyes:closed tl/0.6 tr/0.6 !sweat
blush: color:pink eyes:closed shrink:0.4/0.9 !heart
proud: eyes:closed stretch:0.8/0.9 rise/0.6 !star
cool: hat:glasses lean/0.7 nod !text:COOL
confident: hat:glasses march*2 pump !star
surprised: eyes:big hop/0.25 !ex stretch/0.4
shocked: eyes:big recoil !ex shiver*2
scared: eyes:big shiver*3 recoil shrink:0.6
terrified: eyes:big color:white shiver:1.5*4 !sweat faint
nervous: eyes:big look:l w/0.3 look:r w/0.3 look:c !sweat shiver*2
worried: eyes:sad tl w/0.2 tr !sweat dip
sad: eyes:sad dip/0.8 w/0.5 dip/0.8
crying: eyes:closed !tears dip/0.4 !tears dip/0.4 !tears shiver
sobbing: eyes:closed sit !tears shiver !tears shiver !tears shiver
sulking: eyes:angry face:flip sit w/1.5 !smoke
angry: eyes:angry color:red stomp*3 !angry
furious: eyes:angry color:red stomp*2 !smoke shake:1.5*2 jump !angry
tantrum: eyes:angry [ stomp flap/0.25 ]*4 !smoke
annoyed: eyes:angry tap*3 !angry
bored: eyes:sleepy tl/0.8 tap*2 tr/0.8 !zzz
sleepy: eyes:sleepy dip/0.9*2 !zzz
yawn: eyes:closed stretch/0.9 reach/0.8 !zzz
tired: eyes:sleepy lean/1 dip/0.8 !sweat
exhausted: eyes:sleepy dip !drops lie/2
relieved: eyes:closed stretch/0.6 squash/0.8 !cloud
confused: eyes:big !q tl tr tl tr
thinking: look:u tap*3 !q w/0.4
idea: look:u w/0.4 look:c eyes:big !idea hop pump
curious: !q peek look:r peek
suspicious: eyes:angry look:l w/0.5 look:r w/0.5 peek
embarrassed: color:pink eyes:closed shrink:0.5/1 !sweat
disgusted: eyes:cross recoil shake !text:EW
jealous: color:green eyes:angry look:r tap*2 !smoke
hopeful: eyes:star look:u rise*2 !star
determined: eyes:angry dip pump*2 !text:GO!
focused: eyes:angry lean:0.5/1.5
zen: eyes:closed sit float:0.5/3
grateful: eyes:happy lean/0.6 !hearts hop
excited: eyes:star hop*4 flap*2
impatient: eyes:angry tap*4 look:l w/0.2 look:r w/0.2 tap*2
lonely: eyes:sad sit look:l w/0.8 look:r w/0.8 !tears
mischievous: eyes:wink peek !text:HEHE shiver
dizzy-spell: eyes:dizzy wobble:1.5*2 swl swr
butterflies: eyes:heart shiver !hearts hop:0.6*3
calm: eyes:closed bob:0.6/1.5*2

# dance
two-step: [ swl swr ]*4 !note
side-step: [ swl:1.5 swl:1.5 swr:1.5 swr:1.5 ]*2
shuffle: [ jog/0.3 swl/0.2 jog/0.3 swr/0.2 ]*3 !notes
moonwalk: hat:tophat moon:-160 spin moon:160 !star
robot-dance: [ tl/0.3 w/0.15 tr/0.3 w/0.15 al:-3 w/0.2 al:0 ar:-3 w/0.2 ar:0 ]*2
disco: [ ar:-3 tr w/0.1 ar:0 al:1 tl w/0.1 al:0 ]*4 !notes
the-twist: wobble:1.3/0.5*5 !notes
arm-wave: [ al:-3 w/0.15 al:0 rise/0.2 ar:-3 w/0.15 ar:0 ]*3
the-worm: [ squash:1.2/0.25&lunge/0.25 stretch/0.25 ]*5
floss: [ swl/0.2&alt/0.2 swr/0.2&alt/0.2 ]*6
dab: face:r lunge/0.4&pump/0.4 w/0.3 !text:DAB
macarena: [ ar:-1 w/0.2 al:-1 w/0.2 ar:-3 w/0.2 al:-3 w/0.2 ad hop&spin/0.4 ]*2
chicken-dance: [ flap/0.2*4 dip*2 wobble/0.5 clap*2 ]*2
can-can: au [ kick hop ]*5 ad
conga: [ go:40 go:40 go:40 kick ]*3 !notes
salsa: [ swl/0.2 swr/0.2 spin/0.4 ]*4 !notes
tango: dash:120 lean:1.5/0.6 dash:-120 lean:1.5/0.6 !heart
waltz: tempo:0.8 [ swl rise swr rise spin ]*2
breakdance: roll spin roll hstand/1 spin*2 !stars
headspin: hstand/1.8&wobble/1.8 !stars
windmill: cart*3 !stars
pogo: hop:1.5*8
rave: color:rainbow [ pump/0.2 hop/0.2 ]*8 nocolor
headbang: lean:1.3/0.25*8 !notes
shimmy: shiver:2/1.2 swl shiver:2/1.2 swr
wiggle: wobble:1.5*3
hip-sway: [ swl:0.7/0.45 swr:0.7/0.45 ]*4
running-man: jog*6 pump
cabbage-patch: [ tl&alt tr&alt ]*3
sprinkler: ar:-3 [ tr/0.15 w/0.1 ]*4 spin ar:0
lawnmower: pump/0.3*2 go:80 go:-80
vogue: eyes:closed [ al:-3 w/0.3 ar:-3 w/0.3 al:0 w/0.3 ar:0 w/0.3 ]*2
charleston: [ kick/0.3 recoil/0.3 ]*4 flap
hula: hoop*6 !note
limbo: back:2.2/1.2&dip/1.2 hop !star
line-dance: [ swl swl kick swr swr kick spin ]*2
stomp-dance: [ stomp stomp clap ]*4
tap-dance: tap*4 spin tap*4 reach
ballet-twirl: au rise/0.3 spin*3 ad dip
pirouette: au spin/0.3*4 ad !star
arabesque: lean:1.4/1.2&kick/1.2
plie: [ dip:1.5/0.6 rise/0.4 ]*3
jazz-hands: au shiver:1.5/1 ad !stars
victory-dance: eyes:happy hop*2 [ swl swr ]*2 spin au hop*2 ad !stars
happy-feet: eyes:happy jog/0.25*8
bounce-groove: [ dip/0.25 bob/0.25 ]*6 !notes
slow-groove: eyes:closed tempo:0.6 [ swl swr ]*3
swing-dance: [ recoil lunge spin ]*3 !notes
polka: [ hop swl hop swr ]*3
samba: tempo:1.4 [ swl swr dip ]*5 !notes
cha-cha: [ swl/0.3 swr/0.3 jog/0.3 ]*4
hip-hop: hat:cap [ dip pump/0.3 tl/0.2 tr/0.2 ]*3
pop-and-lock: [ tl/0.1 w/0.3 tr/0.1 w/0.3 dip/0.1 w/0.3 ]*2
flamenco: au [ stomp stomp spin/0.3 ]*3 ad !text:OLE
irish-jig: al:1 ar:1 [ kick/0.25 hop/0.2 ]*6
cossack: [ duck/0.3 kick/0.3 ]*5 !text:HEY
conga-line: [ go:50 hop ]*3 [ go:-50 hop ]*3
disco-fever: hat:glasses color:rainbow [ ar:-3 tr/0.3 ar:0 dip/0.2 ]*4
last-dance: eyes:closed tempo:0.7 swl swr spin lean/1 !heart
twist-and-shout: wobble:1.4*2 jump !text:WOO wobble:1.4*2
robot-arms: [ al:-3 w/0.25 al:-1.5 w/0.25 al:0 ar:-3 w/0.25 ar:-1.5 w/0.25 ar:0 ]*2
dance-off: spin hop*2 roll !stars cart pump

# sport
jumping-jacks: jump/0.45*6
push-ups: [ lean:2.3/0.7&dip:2/0.7 ]*5 !drops
sit-ups: sit back:1.5/0.6*5 stand !drops
squats: dip:2/0.6*6 !drops
lunges: [ lunge:1.5/0.6&dip/0.6 recoil:1.5/0.6&dip/0.6 ]*3
stretches: reach/0.9 tl:1.5/0.8 tr:1.5/0.8 lean:1.5/0.9
toe-touch: [ lean:2.2/0.7 reach/0.5 ]*3
star-jumps: leap/0.6*4 !stars
burpee: [ dip:2/0.3 lean:2.3/0.4 dip:2/0.3 jump ]*3 !drops
plank: lean:2.3/3&shiver:0.6/3 !drops
run-in-place: jog*8 !drops
high-knees: tempo:1.5 march*8
skipping-rope: rope*10
double-unders: tempo:1.6 rope*12 !stars
hula-hoop: hoop*8 !star
weightlifting: prop:barbell dip:1.5/0.5 raise/1.2&rise/1.2 !drops dip
bicep-curls: prop:dumbbell raise/0.6*5 !drops
shadow-boxing: eyes:angry [ lunge/0.2 recoil/0.15 ]*6 hop
uppercut: eyes:angry dip jump/0.4&pump/0.4 !sparks
karate-kick: eyes:angry dip kick/0.3 !text:HIYA kick/0.3
karate-chop: eyes:angry reach/0.3 lean/0.2 !sparks !snd:swish lean/0.2
sword-kata: prop:sword swing/0.3*3 spin swing/0.3 lunge&swing !sparks
fencing: prop:sword [ lunge/0.25 recoil/0.25 ]*4 !text:TOUCHE
goalkeeper: eyes:angry swl:2 swr:2 leap&tr !text:SAVED
header: prop:ball [ hop&raise/0.36 ]*4 jump !star
keepy-uppy: prop:ball [ raise/0.4&hop/0.4 ]*6
dribble: [ dash:60 dash:-60 ]*3 kick !dust
basketball-shot: prop:ball dip jump&raise/0.6 noprop !text:SWISH
tennis-swing: recoil/0.3 lunge/0.3 !snd:swish hop
golf-swing: back/0.6 wobble/0.3 !snd:swish look:u w/0.6 !text:FORE
baseball: back/0.5 spin/0.3 !snd:bonk look:u w/0.5 dash:100
bowling: recoil lunge:1.5/0.6 w/0.5 !text:STRIKE jump
archery: back/0.8 !snd:swish lunge/0.2 look:r w/0.4 !star
swimming: [ lean:2/0.6&flap/0.6 ]*5 !bubbles
surfing: back/0.4 slide:140 wobble slide:-140
skateboard: dash:120 jump&spin !star slide:-100
skiing: dip:1.5/0.4 slide:160 [ tl/0.2 tr/0.2 ]*2 slide:-160
snowboard: back/0.3 slide:150 jump&spin/0.6 slide:-150 !cloud
rock-climb: [ alt rise ]*4 !drops
yoga-tree: eyes:closed au rise/3
yoga-warrior: eyes:closed lunge:1.5/2&reach/2
meditation: eyes:closed sit float:0.7/4
handstand: hstand/2 !star
cartwheel: cart*2
backflip: dip bflip !star
front-flip: dip flip !star
double-flip: dip flip/0.5 flip/0.5 !stars
somersault: roll*2
long-jump: dash:120 leap dip:1.5 !dust
hurdles: [ dash:70 jump/0.4 ]*3
sprint: dip dash:260 !dust dash:-260
victory-lap: eyes:happy au dash:200 dash:-200 !stars
warm-up: jog*4 reach tl tr jump/0.45*2
cool-down: eyes:closed tempo:0.6 reach lean stretch squash
tug-of-war: [ back:1.5/0.4 recoil/0.3 ]*4 faint/1.2
gymnast: cart flip hstand/1 au w/0.4 ad !stars

# trick
spin: spin
double-spin: spin*2
triple-spin: tempo:1.5 spin*3 eyes:dizzy wobble
wobble: wobble*2
bounce: hop*4
super-bounce: hop jump leap !stars
squash-and-stretch: squash stretch squash stretch
inflate: !snd:grow puff:1.5/1.2 !cloud
shrink-pop: shrink:1.6/0.8 !snd:pop puff/0.3
glitch: [ shake:2/0.1 ghost:0.4 w/0.05 solid color:teal w/0.05 nocolor ]*4
pixel-melt: squash:2/1.2 stretch/0.4
blink-teleport: !cloud ghost:0.1 slide:160 solid !cloud !snd:warp w/0.2
ghost-fade: ghost:0.3 float:0.5 solid
rainbow-pulse: color:rainbow puff*3
color-flash: color:red w/0.15 color:yellow w/0.15 color:green w/0.15 color:blue w/0.15 color:purple w/0.15
shake-off: shake:1.5*2 !drops
levitate: eyes:closed float:1.2/3
magic-wand: prop:wand twirl swing !stars !snd:ding w/0.2
rabbit-trick: hat:tophat prop:wand swing*2 !cloud !text:TADA hop
disappearing-act: prop:wand swing !cloud ghost:0.1 w/1 solid !cloud !text:TADA w/0.3
juggling: prop:ball raise/0.3*8 !star
fire-breath: back/0.4 !fire lean/0.6 !smoke
bubble-blow: [ !bubbles lean/0.6 ]*3
balloon-float: prop:balloon float:1.5/3
confetti-pop: dip jump !confetti !snd:pop
super-size: scale:1.6 stomp*2 !dust w/0.3 scale:1 !snd:pop hop
tiny-mode: scale:0.5 hop*4 scale:1 !snd:grow puff/0.3
earthquake: !dust shake:2/1.5 !dust
rocket-hop: dip:1.5 !fire leap:1.3 !smoke
statue: color:gray w/2 nocolor shake
invisible: ghost:0.1 w/1.2 solid !ex w/0.3
upside-down: hstand/2.5
barrel-roll: roll*3
dizzy: eyes:dizzy wobble:1.6*3
jelly: [ squash/0.2 stretch/0.2 ]*5
spring-up: squash:1.5/0.5 !snd:jump leap
flip-flop: flip bflip
tornado: tempo:2.2 spin*6 !cloud eyes:dizzy wobble
flash: color:white w/0.1 nocolor w/0.1 color:white w/0.1 nocolor !zap w/0.2
static-shock: eyes:big !zap shiver:2 !smoke
hover-spin: float/1.6&spin/0.5
moon-jump: tempo:0.5 leap:1.2
slow-motion: tempo:0.35 hop wave
fast-forward: tempo:3 hop*3 wave spin*2 jog*4
echo: ghost:0.5 swl swr solid swl swr
shadow: color:black lunge recoil nocolor !cloud w/0.2
gold-rush: color:gold puff !stars spin
frozen: color:teal shiver:0.6/2 !cloud
heat-wave: color:red !drops wobble !drops wobble
pop-up: shrink:1.6/0.3 !snd:pop leap
ripple: [ tl/0.15 tr/0.15 ]*6
big-reveal: spin/0.3*3 reach !text:TADA !stars

# life
eat-apple: prop:apple raise/0.5*3 noprop eyes:happy !text:YUM w/0.4
drink: prop:cup raise/0.9 back/0.5 noprop !text:AHH w/0.3
sip-tea: eyes:closed prop:cup [ raise/0.7 w/0.4 ]*2
ice-cream: prop:icecream eyes:happy raise/0.5*3 !heart
cooking: prop:cup swing/0.3*6 !smoke !text:YUM w/0.3
read-book: sit prop:book look:d w/1.2 nod w/1
write: sit prop:pencil swing/0.3*5
typing: sit prop:laptop alt/0.25*8
phone-call: prop:phone !text:HELLO? raise/2.6&bob/0.4
texting: prop:phone look:d tap/0.3*4 eyes:happy !heart w/0.3
selfie: prop:phone raise/1.2&tl/1.2 !zap eyes:wink w/0.4
take-photo: prop:camera raise/0.8 !zap !snd:pop w/0.3
listen-music: hat:headphones eyes:closed nod*6 !notes
sing: prop:mic eyes:closed !notes raise/1&rise/1 !notes raise/1&rise/1
play-guitar: prop:guitar swing/0.25*8 !notes
drumming: alt/0.2*10 !snd:bonk !notes w/0.2
piano: sit [ alt/0.3 tl/0.2 alt/0.3 tr/0.2 ]*2 !notes
painting: prop:brush [ swing/0.5 raise/0.4 ]*3 !star
sweeping: [ lunge/0.3 recoil/0.3 ]*4 !dust
mopping: [ swl/0.4 swr/0.4 ]*4 !drops
water-plant: prop:cup lean:1.3/1 !drops prop:flower eyes:happy rise
smell-flower: prop:flower eyes:closed raise/1 !heart w/0.4
pick-flower: lean:2/0.8 prop:flower eyes:happy raise/0.6
fishing: prop:rod sit w/1.5 !ex stand raise/0.3*3 !drops !text:GOT_IT w/0.3
digging: [ lean:1.6/0.4 back/0.3 ]*4 !dust
hammering: prop:hammer [ swing/0.3 !snd:bonk ]*5
sawing: [ lunge/0.25 recoil/0.25 ]*6 !dust
carry-box: au march*4 ad dip
open-gift: prop:gift look:d dip !q w/0.4 !confetti eyes:star noprop jump
blow-candle: prop:cake lean/0.6 !cloud !smoke eyes:happy hop
eat-cake: prop:cake lean/0.4*3 noprop !text:YUM w/0.3
brush-teeth: prop:pencil swing/0.2*8 !bubbles
shower: eyes:closed !drops shiver !drops shiver !drops shake:1.5
comb-hair: eyes:wink pump/0.4*4 !star
dress-up: spin hat:tophat spin hat:crown spin hat:wizard spin
mirror-check: face:flip tl tr eyes:wink !star face:flip w/0.2
check-watch: look:d pump/0.6 !ex dash:100
waiting: tap*4 look:l w/0.4 look:r w/0.4 tap*4
whistling: look:u bob/0.4*4 !notes
sneeze: back/0.5 back:1.4/0.4 lean:2/0.2 !cloud !text:ACHOO shake
cough: lean/0.2*3 !cloud
hiccup: [ w/0.5 !text:HIC hop/0.15 ]*3
burp: puff/0.4 !text:BURP eyes:big !sweat w/0.4
shiver-cold: color:teal eyes:closed shiver:1.4*4 !cloud
sweating-hot: color:red !drops wobble !drops flap/0.3*3
fan-self: pump/0.2*8 !drops
in-the-rain: prop:umbrella look:u w/0.5 !drops w/0.5 !drops w/0.5 noprop shake
sunbathing: hat:glasses lie/3
nap: eyes:sleepy sit !zzz w/1.2 !zzz w/1.2 stand stretch
wake-up: eyes:sleepy sit w/0.5 eyes:big !ex stand stretch/0.8 reach
morning-stretch: eyes:closed reach/1 tl:1.4/0.7 tr:1.4/0.7 eyes:happy hop
coffee: eyes:sleepy prop:cup raise/0.9 eyes:big !zap shiver hop*2
carry-balloon: prop:balloon go:120 go:-120
lantern-walk: prop:lantern look:l go:-100 look:r go:100
torch-bearer: prop:torch raise/0.6 march*4 !fire
flag-wave: prop:flag swing/0.5*4 !star
looking-for-something: prop:magnifier look:d go:60 peek go:-120 !ex w/0.3
trophy-lift: prop:trophy eyes:happy raise/1.2&rise/1.2 !stars
homework: sit prop:pencil look:d swing/0.3*3 !q swing/0.3*3 !idea w/0.3

# idle
look-around: look:l w/0.6 look:r w/0.6
look-up: look:u w/1
look-down: look:d w/1
blink-twice: blink w/0.15 blink
slow-blink: eyes:closed w/0.6
tap-foot: tap*3
shift-weight: tl:0.5/0.8 tr:0.5/0.8
arm-stretch: reach/0.9
scratch-head: pump/0.25*4 !q
small-yawn: eyes:closed stretch:0.6/0.7
tiptoe: rise:1.2/0.8
peek-left: face:l peek
peek-right: face:r peek
lean-back: back/1
bob-along: bob*3
deep-breath: puff:0.5/1.2 squash:0.3/0.6
hum: look:u bob*2 !note
twiddle: alt/0.25*4
kick-pebble: kick !dust look:r w/0.4
one-hop: hop
shake-legs: jog/0.3*3
wiggle-arms: flap/0.3*3
eye-roll: look:u w/0.2 look:r w/0.2 look:d w/0.2 look:l w/0.2
sleepy-nod: eyes:sleepy dip/0.7 eyes:big hop/0.2
double-take: look:r w/0.3 look:c w/0.2 look:r eyes:big !ex w/0.5
sigh: eyes:closed puff:0.4/0.6 squash:0.5/0.8
fidget: tl/0.2 tr/0.2 tap pump/0.2
roll-shoulders: [ al:-1 w/0.2 al:0 ar:-1 w/0.2 ar:0 ]*2
crack-knuckles: clap/0.5 !snd:bonk shake/0.2
check-feet: look:d dip/0.6
stand-tall: stretch:0.6/1
rock-back-and-forth: [ lean:0.5/0.5 back:0.5/0.5 ]*2
sway-gently: [ tl:0.4/0.7 tr:0.4/0.7 ]*2
wink: eyes:wink w/0.5
whistle: look:u !note bob !note bob
dust-off: pump/0.2*3 !dust
hop-in-place: hop:0.6*2
turn-around: face:flip w/0.5 face:flip w/0.1
glance-back: face:flip w/0.4 face:flip w/0.1
stretch-legs: kick/0.6 w/0.2 face:flip kick/0.6 face:flip
curious-tilt: tl:0.7/0.6 !q
happy-wiggle: eyes:happy wobble/0.5
shy-feet: eyes:closed look:d tap
nose-twitch: shiver:0.4/0.3 w/0.3 shiver:0.4/0.3
daydream: look:u eyes:closed !heart w/1.2

# play
sneak: eyes:angry look:l dip:1.2/0.3 go:-70 look:r go:70
tiptoe-walk: eyes:big [ rise/0.25 go:25 ]*4
parade: march*6 prop:flag march*2
strut: hat:glasses [ swl/0.3 swr/0.3 ]*2 go:90
dizzy-walk: eyes:dizzy go:50 wobble go:-70 wobble go:20
zombie-walk: color:green au eyes:cross tempo:0.5 go:60 go:-60
robot-walk: tempo:0.6 [ tl/0.2 go:30 tr/0.2 go:30 ]*2 !snd:bonk
penguin-waddle: al:1 ar:1 [ tl/0.25 go:20 tr/0.25 go:20 ]*3
crab-walk: swl:1.5/0.25*4 swr:1.5/0.25*4 clap*2
bunny-hops: [ go:45&hop:1.3 ]*4
frog-jumps: [ dip:1.5/0.25 go:70&jump/0.58 ]*3 !text:RIBBIT
kangaroo: [ go:90&leap/0.75 ]*3
gallop: [ go:60&hop ]*2 [ go:-60&hop ]*2 !dust
airplane: al:-1.5 ar:-1.5 dash:200 tl dash:-200 tr
superhero-pose: jump dip au w/0.2 ad stretch/0.8 !stars
superhero-fly: dip leap&lean:2/0.85 !cloud
ninja-dash: hat:ninja dip dash:220 !cloud dash:-220
ninja-vanish: hat:ninja !cloud ghost:0.1 w/0.8 solid !cloud w/0.2
sword-combo: prop:sword swing/0.25 swing/0.25 spin&swing lunge&swing !sparks !snd:swish
shield-block: prop:shield dip&raise/0.5 !sparks !snd:bonk recoil
power-up: eyes:angry dip:1.5/0.8 !sparks color:gold puff shiver:2 !zap !sparks
energy-blast: eyes:angry back/0.6 !zap lunge/0.3 !fire !snd:zap recoil
laser-charge: eyes:angry color:red shiver/1 !zap w/0.2
victory-pose: jump au eyes:happy w/0.8 ad !stars
defeat: eyes:cross wobble faint/2.2
play-dead: eyes:cross faint/3 !text:...
faint: eyes:dizzy wobble faint
revive: eyes:cross faint/1.5 eyes:big !zap jump eyes:happy w/0.2
hide: duck/1.5&shrink:1.4/1.5
peekaboo: duck/0.8&shrink/0.8 jump !text:BOO eyes:happy w/0.3
tag: !ex dash:150 face:flip w/0.2 dash:-150 !text:TAG
hopscotch: [ hop go:20 hop go:20 jump ]*2
leapfrog: dash:60 go:100&leap dip
hide-and-seek: eyes:closed !text:1_2_3 w/0.8 eyes:big look:l w/0.4 look:r w/0.4 !ex dash:120
treasure-hunt: prop:magnifier go:60 look:d !ex [ lean:1.6/0.3 back/0.3 ]*3 !stars prop:trophy raise
snowball-fight: lean:1.6/0.4 back/0.4 lunge/0.2 !cloud duck/0.5 !text:HA
pillow-fight: [ pump/0.25 swl/0.2 pump/0.25 swr/0.2 ]*2 !cloud
tickle: eyes:happy shiver:2 !text:HIHI bob/0.2*4
piggyback: dip:1.5/0.5 march*3 hop
balance-beam: al:-1.5 ar:-1.5 [ tl:0.5/0.3 go:20 tr:0.5/0.3 go:20 ]*3
tightrope: prop:umbrella [ tl:0.4/0.4 go:15 tr:0.4/0.4 go:15 ]*3
trampoline: hop jump leap leap:1.3 flip !stars
see-saw: [ lean/0.4 back/0.4 ]*4
swing-set: [ back:1.4/0.6 lean:1.4/0.6 ]*3 jump
slide-down: back/0.3 slide:180 !dust hop
spin-around: au spin*4 ad eyes:dizzy wobble
freeze-game: jog*3 color:gray w/1.5 nocolor jog*3
simon-says: reach hop spin dip clap*2
follow-the-leader: go:60 hop go:60 spin go:-120
dance-battle: spin dip roll !stars pump*2
knight-charge: prop:sword hat:crown dash:200 swing !sparks dash:-200
dragon-fight: prop:shield recoil !fire duck/0.5 prop:sword lunge&swing !sparks !stars
space-walk: tempo:0.4 leap:1.2 float:0.8
moon-bounce: tempo:0.5 [ go:60&leap ]*2
cannonball: dash:80 leap&roll squash:1.5 !drops !text:SPLASH

# party
party: [ hop pump ]*3 !confetti spin !notes
birthday: prop:cake !notes [ swl swr ]*2 lean/0.5 !cloud !confetti !text:HAPPY_BDAY w/0.4
fireworks-cheer: look:u au hop*3 ad !stars !confetti
new-year: !text:3 w/0.6 !text:2 w/0.6 !text:1 w/0.6 !confetti !stars !snd:boom leap
trophy: prop:trophy raise/1.5&hop:0.6/0.4 !stars
medal: eyes:closed lean/0.6 !star eyes:happy pump*2
flag-parade: prop:flag march*4 swing*2
toast: prop:cup raise/0.8 !sparks !text:CHEERS raise/0.6
snow-angel: lie/2.5&shiver:0.5/2.5 !cloud
snowball: lean:1.6/0.5 puff/0.3 lunge/0.2 !cloud
christmas: hat:cap color:red prop:gift bob*3 !stars !text:HO_HO_HO w/0.3
halloween: color:white ghost:0.5 !text:BOO float:0.6
pumpkin: eyes:angry puff shiver !fire w/0.2
easter: [ go:35&hop:1.2 ]*3 prop:gift look:d !stars w/0.4
valentine: prop:heart eyes:heart raise/1.2 !hearts hop
kings-day: hat:crown [ hop pump ]*3 !confetti
graduation: hat:tophat jump !confetti !text:CONGRATS w/0.4
champion: prop:trophy au hop*3 ad !confetti !stars
countdown: !text:3 dip !text:2 dip !text:1 dip !text:GO! leap
drum-roll: alt/0.12*12 !snd:bonk reach !text:TADA
standing-ovation: [ clap*4 hop ]*3 !stars
confetti-shower: au !confetti w/0.4 !confetti w/0.4 !confetti spin
balloon-party: prop:balloon hop*4 float:0.8 !confetti
magic-show: hat:tophat prop:wand swing*2 !cloud prop:flower raise !stars
surprise-party: duck/1&shrink/1 jump !confetti !text:SURPRISE w/0.4
gift-giving: prop:gift lean/0.6 eyes:happy !heart hop
wedding: hat:tophat prop:flower tempo:0.6 go:60 go:60 !hearts !confetti w/0.4
good-luck: prop:star raise/1 !stars eyes:wink w/0.3
well-done: clap*3 pump !text:WELL_DONE !star w/0.3
high-score: !text:NEW_RECORD leap spin !stars !confetti
level-up: color:gold puff !snd:ding !text:LEVEL_UP leap !stars
victory-roar: eyes:angry dip stretch/0.6&reach/0.6 !text:RAAH shiver:2
fanfare: prop:flag raise/0.6 rise/0.25*4 !notes !confetti
lantern-festival: prop:lantern raise/1.2 look:u !stars w/0.6
cheer-squad: [ au w/0.2 ad w/0.2 ]*3 jump&spin !text:GO_TEAM
parade-wave: [ go:40 wave/0.5 ]*3
finish-line: dash:200 reach/0.6 !confetti eyes:happy hop*2
encore: clap*4 !text:ENCORE jump

# work
typing-fast: sit prop:laptop tempo:2 alt*10 !sparks
typing-slow: sit prop:laptop look:d alt/0.6*4
thinking-hard: look:u tap*2 !q shiver !sweat !idea w/0.4
debugging: prop:magnifier look:d go:40 !q go:-80 !ex stomp !text:GOT_IT
bug-squash: look:d !ex jump stomp !dust !text:SQUASH eyes:happy w/0.3
eureka: !idea leap !text:EUREKA spin
coffee-break: prop:cup eyes:closed raise/1 !smoke w/0.5 raise/1
compiling: tap*3 look:u w/0.5 tap*3 !text:...
deploy: dip:1.5 !fire leap:1.4 !smoke !text:SHIPPED
reading-docs: prop:book look:d w/1 nod w/0.8 !idea w/0.3
searching: prop:magnifier look:l go:-60 look:r go:120 !q
facepalm: eyes:closed ar:-2 al:-2 dip/0.8 w/0.4 !sweat
fix-it: prop:hammer [ swing/0.25 !snd:bonk ]*4 !sparks pump
tests-pass: color:green !text:PASS hop*2 pump
tests-fail: color:red !text:FAIL eyes:cross shake:1.5 !sweat w/0.3
commit: lean/0.4 !snd:pop !text:COMMIT nod
push-it: back/0.3 lunge:2/0.5 !cloud !text:PUSH
pull-it: lunge/0.3 back:1.5/0.6 !text:PULL
merge: swl:2 swr:2 clap !sparks !text:MERGED
code-review: hat:glasses prop:book look:d nod w/0.5 tl !q nod*2
meeting: sit nod w/0.6 nod eyes:sleepy w/0.8 eyes:big !ex nod*2
presentation: prop:wand face:r raise/0.6 swing w/0.3 raise/0.6 !star
pair-programming: sit prop:laptop alt/0.3*4 look:r nod alt/0.3*4
ship-it: !text:SHIP_IT dash:160 leap !stars
loading: spin/0.8*3
sleep-mode: eyes:sleepy sit color:gray !zzz w/2
reboot: color:black w/0.6 nocolor !zap eyes:big shiver hop
overheating: color:red !smoke shiver:1.5 !smoke flap/0.25*4
brainstorm: look:u !q w/0.3 !idea w/0.3 !q w/0.3 !idea hop
deadline: eyes:big !sweat jog/0.2*10 !drops
inbox-zero: [ lunge/0.2 recoil/0.2 ]*4 reach !text:INBOX_ZERO !stars
refactor: spin swl swr spin !sparks !text:CLEAN
saving: lean/0.3 !snd:ding !text:SAVED nod
404: look:l w/0.4 look:r w/0.4 !q !text:404 eyes:big tl tr
undo: tempo:1.5 !text:UNDO bflip
copy-paste: lunge/0.3 !snd:pop recoil/0.3 lunge/0.3 !snd:pop !text:PASTE w/0.2
stack-overflow: prop:book raise/0.25*4 !q !smoke w/0.2
hello-world: wave !text:HELLO_WORLD hop
rubber-duck: color:yellow lean/0.6 !q nod*2 !idea w/0.3
standup: stretch/0.6 reach nod !text:NO_BLOCKERS w/0.3
long-task: sit prop:laptop alt/0.3*6 !sweat alt/0.3*6 !drops stand stretch
done-and-dusted: pump/0.2*2 !dust reach !text:DONE !stars

# animal
cat: lean:1.6/0.8 stretch/0.6 !text:MEOW tap
cat-stretch: eyes:closed lean:2/1 back:1.5/0.8
dog: wobble:1.5/0.3*4 !text:WOOF hop*2
dog-shake: shake:2/0.8 !drops
bird: flap/0.25*4 leap&flap !text:TWEET
chicken: lean/0.2*3 flap/0.2*3 !text:BAWK
duck-waddle: al:1 ar:1 [ tl/0.2 go:18 tr/0.2 go:18 ]*3 !text:QUACK
fish: [ lean:2/0.5&shiver/0.5 ]*3 !bubbles
snake: [ swl/0.2 swr/0.2 ]*5 !text:SSSS
elephant: scale:1.4 stomp*3 !dust reach !text:TOOT
monkey: [ alt/0.25 hop ]*3 !text:OOH_OOH
frog: dip:1.6/0.3 leap dip:1.6/0.3 !text:RIBBIT
rabbit: au hop:1.2*4 ad tap*2
kangaroo-hop: al:-1 ar:-1 jump*3
horse: jog/0.3*4 back/0.4 !text:NEIGH
lion: eyes:angry puff/0.6 !text:ROAR shiver:1.5
bear: scale:1.3 au tempo:0.6 stomp*2 !text:GRR
mouse: scale:0.5 [ dash:40 w/0.2 dash:-40 w/0.2 ]*2 !text:SQUEAK
owl: eyes:big look:l w/0.4 look:r w/0.4 look:c blink !text:HOO w/0.3
penguin: al:1 ar:1 [ tl/0.2 tr/0.2 ]*5 slide:80
crab: swl:1.6/0.2*3 clap*2 swr:1.6/0.2*3 clap*2
spider: scale:0.7 [ go:30 w/0.15 ]*3 leap
bee: [ float:0.4/0.4&shiver/0.4 ]*4 !text:BZZZ
butterfly: [ flap/0.3&hop/0.3 ]*5
turtle: tempo:0.3 go:40 duck/1.5&shrink:0.6/1.5
snail: tempo:0.25 go:30 !text:...
bull: eyes:angry tap*3 !smoke dash:200 !dust
peacock: au eyes:closed color:teal puff/1 wobble
parrot: color:green !text:HELLO nod*2 !text:HELLO flap*2
dinosaur: scale:1.5 eyes:angry al:-1 ar:-1 tempo:0.6 stomp*3 !text:RAWR !dust
robot: color:gray tempo:0.6 [ tl/0.15 w/0.2 tr/0.15 w/0.2 ]*2 !text:BEEP_BOOP
zombie: color:green eyes:cross au tempo:0.5 [ tl/0.3 go:25 tr/0.3 ]*2 !text:BRAINS
ghost: color:white ghost:0.5 !text:BOO float:0.8/2.5
vampire: color:black eyes:angry al:-3 lunge/0.5 !text:BLEH w/0.4
pirate: prop:sword hat:tophat swing/0.3*2 !text:ARRR tl tr
cowboy: hat:cap dip pump*2 !text:YEEHAW jog/0.3*4
wizard: hat:wizard prop:wand twirl swing !zap !stars !text:ABRACADABRA w/0.4
knight: prop:shield dip prop:sword swing*2 lunge&swing !sparks
ninja: hat:ninja dash:150 flip !cloud dash:-150 kick !text:HIYA
astronaut: tempo:0.35 leap float:0.8/2 !stars
superhero: au leap:1.3&lean:1.5/0.85 ad !cloud stretch/0.6 !stars
baby: scale:0.6 sit eyes:big !tears w/0.4 eyes:happy bob/0.3*3
grandpa: prop:rod tempo:0.4 lean:0.8/2&go:50 !sweat w/0.3
giant: scale:2 stomp !dust stomp !dust eyes:angry !text:FEE_FI_FO w/0.4
tiny: scale:0.4 hop*4 !text:HI wave
statue-pose: color:gray au w/2.5
king: hat:crown stretch/0.8 prop:trophy raise wave/0.8
queen: hat:crown eyes:closed wave/1.2 tl:0.4 tr:0.4
clown: color:red hat:tophat [ hop spin ]*2 squash !confetti !text:HONK w/0.3
mime: color:white [ al:-2 w/0.3 ar:-2 w/0.3 ad lunge/0.3 !q recoil/0.3 ]*2
detective: hat:tophat prop:magnifier look:d go:50 !q go:-50 !idea w/0.3
chef: hat:tophat prop:cup swing/0.25*5 raise !smoke !text:BON_APPETIT w/0.3
rockstar: hat:glasses prop:guitar swing/0.2*6 jump !notes !stars
dj: hat:headphones [ alt/0.2 dip/0.2 ]*5 pump*2 !notes
magician: hat:tophat prop:wand swing !cloud ghost:0.1 w/0.6 solid !cloud !text:TADA w/0.3
explorer: hat:cap prop:lantern look:l go:-60 look:r go:120 !ex w/0.2
angel: hat:halo color:white eyes:closed float:0.8/2.5 !stars
little-devil: color:red eyes:angry !fire tap*2 !text:HEHE peek
sleepwalker: eyes:closed au tempo:0.5 go:70 !zzz go:-70
scarecrow: au eyes:cross w/1.5 wobble !text:CAW w/0.3
`;
