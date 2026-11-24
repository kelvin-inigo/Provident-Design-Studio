---
name: photo-to-video-prompt
description: Look at a photo, describe it in words, and write a Higgsfield image-to-video prompt from those words in the fixed 14-section format (Scene context, Active references, Location map, First frame, Format, Optics, Camera, Action, Performance, Physics, Lighting, Audio, Style, Positive locks). Use when the user runs /photo-to-video-prompt, or shares a photo and asks to "animate this", "turn this into a video", or "write a Higgsfield prompt" for it.
---

# Photo → words → Higgsfield prompt

The user gives a photo (and maybe a few words about what they want). You turn it into a
Higgsfield prompt that brings **this exact photo** to life: the photo is the start frame, and
the video is small, believable motion starting from it. You do not invent a new scene.

Work in three passes and show all three to the user, in this order:

1. **Read the photo**: a filled-in analysis sheet.
2. **Word bank**: short descriptive words pulled from the sheet.
3. **The prompt**: built only from the word bank, in the fixed format, in one code block so it
   can be copied.

The same text works outside Claude Code: paste everything below this line into any chat that
can see images, then attach the photo. CASV (the Video Studio) uses it too: its Animate panel
fills the 14 sections without seeing the photo, and `/animate-photos` rewrites them from the
photo with this framework (see that skill for CASV's extra rules).

---

## Inputs

| input | default if the user doesn't say |
|---|---|
| the photo | required |
| length | 5 s (Higgsfield's usual clip; 10 s only if asked) |
| aspect | the photo's own shape (9:16 portrait, 1:1, 16:9) |
| intent | none: you pick from the photo (a mood, a move or an action the user names wins) |

## Pass 1: read the photo

Fill in every line. Describe only what you can see. Write "unclear" rather than guess. Use
**camera-left / camera-right** (the viewer's side), never "her left".

```
SUBJECTS        how many people / animals / hero objects
  for each:     where in frame (camera-left, centre, camera-right; foreground, midground, background)
                pose (sitting, standing, leaning on what), where the hands are (exactly)
                gaze (into the lens, off to camera-right, down at …)
                expression
                hair (length, texture, colour, style)
                clothing (colour + fabric + cut), jewellery, watch
SETTING         type of place, time of day
                materials (marble, travertine, oak, brass, linen …)
                key objects and where they sit
LAYERS          foreground / midground / background, one line each
CAMERA AS SEEN  height (floor, seated eye level, standing eye level, high), shot size (wide, full,
                medium, close-up), lens feel (see lens table), depth of field (what is sharp, what is soft)
LIGHT           main light: where from, warm/cool (Kelvin), soft/hard; fill; rim or backlight;
                visible sources (lamps, shelf LEDs, windows, sun)
PALETTE & MOOD  3–5 colours, 3 mood words
CAN MOVE        things that move on their own naturally: hair, loose fabric, leaves, flowers,
                curtains, water, steam, candle flames, reflections, sun patches, people in the distance
MUST NOT MOVE   furniture, architecture, anything with text or a logo, art on walls
RISKS           hands half hidden, small or distant faces, readable text (book spines, signs),
                glass and mirrors, crowds, fingers touching objects
```

Lens table (horizontal angle of view on full frame; write the angle in the prompt):

| looks like | lens | angle |
|---|---|---|
| very wide, strong perspective, interiors | 24 mm | 74° |
| wide, natural room | 35 mm | 54° |
| normal eye | 50 mm | 40° |
| portrait, a little flattened | 70 mm | 29° |
| tight portrait, background melted | 85 mm | 24° |
| long, strongly flattened | 135 mm | 15° |

## Pass 2: word bank

Boil the sheet down to short words and phrases. The prompt may use **only** these (plus the fixed
format wording), so anything the prompt needs must appear here.

```
SUBJECT WORDS   e.g. long dark curly hair · dark brown trouser suit · gold bracelet
SETTING WORDS   e.g. private lounge · lit travertine shelving · marble coffee table · red-berry branches
LIGHT WORDS     e.g. warm 3000K shelf light behind · soft window fill camera-left · hair rim
MOOD WORDS      e.g. quiet · confident · editorial luxury
MOTION VERBS    3–6, small and slow: lifts chin · turns head · rests hand · settles · blinks · sways
CAMERA CHOICE   one move + speed (from the table in Pass 3)
LOCK LIST       faces · hair · outfits · room · objects · any text
```

## Pass 3: write the prompt

### Choosing the camera move (pick one, keep it slow)

| photo | move | speed words |
|---|---|---|
| people, portrait or couple | slow dolly in | 1 km/h, steady |
| one person, close-up | very slow push in, or a slight arc to the lit side | barely perceptible |
| interior, no people | slow lateral slide (parallax on foreground objects) | 1 km/h, gimbal-smooth |
| interior wide, hero furniture | slow dolly in toward the hero piece | 1 km/h |
| exterior / building / tower | slow crane up or slow push in | steady, no shake |
| view, skyline, terrace | slow pan toward the view, or slow push to the railing | steady |
| product / object | slow orbit, 10–20° in total | smooth |

Put the camera on the **shadow side** for people (it keeps faces modelled). A user's named move
always wins over the table.

### Writing the action beats

- Split the length into three beats: about 30 % · 40 % · 30 % (5 s → 0.0–1.5 · 1.5–3.5 · 3.5–5.0;
  10 s → 0–3 · 3–7 · 7–10).
- Beat 1 starts from the **exact pose in the photo**. Every movement must be possible from where
  the body already is: a hand in a pocket comes out before it rests anywhere; a head resting on a
  hand lifts off it before turning.
- At most one action per subject per beat. Small: chin, head, eyes, one hand, a shift of weight.
- The last beat always settles: both hold, a steady look into the lens, or the scene comes to rest.
- No people: the beats are camera progress and natural motion (curtain drifts, light slides
  across the floor, water ripples, the camera reveals the next object).
- Never add a person, object or prop that isn't in the photo.

### The prompt format (fill every section, keep the headings exactly)

```
SCENE CONTEXT
<2 sentences: the place from SETTING WORDS, who is where, the mood from MOOD WORDS.>

ACTIVE REFERENCES
@Image 1 = start frame: <each subject: hair, clothing, pose, position; then 2–3 key objects>. 100% matches the reference.

LOCATION MAP
Camera at <height> <where it stands>. Foreground: <…>. Midground: <…, with camera-left / camera-right>. Background: <…>.

FIRST FRAME / BLOCKING
Opens on the exact framing of @Image 1; <each subject's gaze and pose as in the photo>.

FORMAT MODE
One continuous shot, the camera does not cut on its own.

OPTICS
<angle from the lens table>° <portrait compression | natural perspective | wide perspective>, <depth of field: what is sharp, what is soft>.

CAMERA
<move> at <speed>, steady<, camera on the shadow side>. Soft highlight roll-off, <colour words, e.g. rich warm skin tones>.

ACTION
<t0>s to <t1>s: <beat 1>.
<t1>s to <t2>s: <beat 2>.
<t2>s to <end>s: <beat 3, settles>.

PERFORMANCE
Restraint: small movements, relaxed shoulders, a single slow blink<from whom>, living eyes with catch-lights, pore-level skin realism.
(No people: "No people in frame; none appear.")

PHYSICS
<1–2 natural motions from CAN MOVE>; fabric creases follow every move.

LIGHTING
<main light: Kelvin, direction>, <fill: direction>, <rim>. Light stays as in @Image 1.

AUDIO
Ambience only: <room tone matched to the place, e.g. quiet room tone · distant city hum · soft waves · birdsong>.

STYLE
Photoreal editorial luxury film, fine natural grain.

POSITIVE LOCKS
<Faces, hair and outfits> stay 100% as in @Image 1. <Room and objects> stay as in @Image 1.<Any text or logo stays sharp and unchanged.>
```

### Check before you hand it over

- Every subject, object and light in the prompt is in the photo; nothing new was added.
- Beat 1 matches the photo's pose and gaze exactly (re-look at the photo for hands and eyes).
- Every side is written camera-left / camera-right.
- One camera move, slow, no cuts.
- The locks name everything that must not change, including readable text.
- Times add up to the length.
- The whole prompt is 2,500 characters or fewer (Kling's cap; Higgsfield's other models take the
  same text). Cut adjectives before cutting sections; never drop a heading.

Then, under the code block, give the Higgsfield settings in one line: start frame = the photo,
length, aspect. **Do not generate the video** unless the user asks; if they do, check the cost
with the Higgsfield tools first and wait for a clear yes before spending credits.

---

## Worked example

Photo: the first frame of a 5 s, 9:16 Higgsfield clip of a couple in a lounge.

**Pass 1 (abridged)**: two subjects. Woman camera-left, midground, seated in a cream bouclé and
tan leather lounge chair, legs crossed, left elbow on the chair back and her head resting on her
hand, gaze into the lens, calm; long dark curly hair; dark brown trouser suit with a dark top;
gold bracelet and watch. Man camera-right, standing, leaning back against the shelving, both
hands in his trouser pockets, gaze into the lens with his chin slightly raised; swept-back dark
hair with grey, stubble; dark brown knit polo, charcoal trousers, gold watch. Setting: private
lounge, late afternoon; lit travertine shelving with books and a stone sculpture; marble coffee
table with brass legs, cream ceramic vase with red-berry branches. Camera at seated eye level
behind the table, 70 mm feel, couple sharp, table soft. Light: warm 3000K shelf LEDs from
behind, soft window light from camera-left, gold rim on both heads. Can move: berry branches,
hair, suit fabric. Risks: book spine text ("PROJECTS"), his hands hidden in pockets.

**Pass 2**: dark curly hair · dark brown trouser suit · gold bracelet · swept-back hair ·
stubble · dark brown knit polo · lounge chair · travertine shelving · marble table ·
red-berry branches · warm 3000K behind · window fill camera-left · hair rim · quiet ·
confident · lifts head · half smile · takes hand from pocket · rests hand on chair · glances
down · settles · blink · sway · slow dolly in 1 km/h.

**Pass 3**:

```
SCENE CONTEXT
A warm private lounge with lit travertine shelving. A woman in a dark brown suit sits in a lounge chair; a man in a dark knit polo stands behind her, leaning on the shelving. Quiet, confident moment.

ACTIVE REFERENCES
@Image 1 = start frame: woman with long dark curly hair, dark brown trouser suit, gold bracelet, seated in a cream and tan leather lounge chair, head resting on her hand; man with swept-back dark hair and stubble, dark brown knit polo, charcoal trousers, standing behind her, hands in pockets; marble coffee table, cream vase with red-berry branches. 100% matches the reference.

LOCATION MAP
Camera at seated eye level behind the coffee table. Foreground: marble table edge, vase with red-berry branches. Midground: the woman in the chair (camera-left of centre), the man standing (camera-right). Background: lit travertine shelving with books and a stone sculpture.

FIRST FRAME / BLOCKING
Opens on the exact framing of @Image 1; she looks into the lens with her head resting on her hand, he looks into the lens with his chin slightly raised.

FORMAT MODE
One continuous shot, the camera does not cut on its own.

OPTICS
29° portrait compression, shallow depth of field on the couple, foreground table soft.

CAMERA
Slow dolly in at 1 km/h, steady, camera on the shadow side. Soft highlight roll-off, rich warm skin tones.

ACTION
0.0s to 1.5s: she lifts her head slightly off her hand, a calm half smile forming.
1.5s to 3.5s: he takes his right hand out of his pocket, rests it on the back of her chair and glances down at her.
3.5s to 5.0s: both settle; she holds a steady look into the lens.

PERFORMANCE
Restraint: small movements, relaxed shoulders, a single slow blink from her, living eyes with catch-lights, pore-level skin realism.

PHYSICS
The red-berry branches sway gently from air movement; fabric creases follow every move.

LIGHTING
Warm 3000K shelf lighting from behind, soft window fill from camera-left, gentle rim on their hair. Light stays as in @Image 1.

AUDIO
Ambience only: quiet room tone.

STYLE
Photoreal editorial luxury film, fine natural grain.

POSITIVE LOCKS
Both faces, hair and outfits stay 100% as in @Image 1. Room and objects stay as in @Image 1. Book spine text stays sharp and unchanged.
```

Higgsfield: start frame = the photo · 5 s · 9:16.
