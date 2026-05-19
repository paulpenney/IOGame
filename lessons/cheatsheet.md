# Cheatsheet — Everything in One Place

## The whole shape

```python
def build_character():
    # 1. Define each power as a variable.
    punch = {
        "name": "Punch",
        "key": "space",
        "cooldownMs": 600,
        "cast": { ... },        # one of the six kinds below
    }
    # heal = { ... }            # add as many as you want (max 4)

    # 2. Return the character dict and list your powers.
    return {
        "characterName": "...",  # 1 to 24 letters
        "color": "...",          # see colors below
        "size": 24,              # 12 to 60 (smaller = costs more)
        "speed": 220,            # 80 to 400
        "maxHealth": 100,        # 40 to 300
        "powers": [punch],       # 1 to 4 powers, e.g. [punch, heal]
    }
```

## A power

```python
{
    "name": "...",          # whatever you want
    "key": "space",         # "space" | "e" | "q" | "f" | "mouse1" | "mouse2"
    "cooldownMs": 1000,     # 200 to 20000 (shorter = costs more!)
    "cast": { ... },        # one of the six kinds below
}
```

## The six kinds of cast

### projectile (fireball, knife, bullet)
```python
{
    "kind": "projectile", "color": "orange",
    "speed": 420,          # 50 to 700
    "radius": 6,           # 2 to 30
    "lifetimeMs": 1500,    # 100 to 5000
    "count": 1,            # 1 to 6 (shotgun!)
    "spreadDeg": 0,        # 0 to 90
    "pierce": False,       # True = goes through enemies
    "onHit": [ ... effects ... ],
}
```

### melee (sword swing, punch)
```python
{
    "kind": "melee", "color": "blue",
    "range": 40,           # 20 to 200
    "arcDeg": 70,          # 20 to 360
    "onHit": [ ... effects ... ],
}
```

### area (fire field, poison cloud)
```python
{
    "kind": "area", "color": "green",
    "radius": 70,          # 20 to 200 (BIG = expensive!)
    "durationMs": 3000,    # 500 to 10000
    "tickIntervalMs": 400, # 100 to 2000
    "onTick": [ ... effects ... ],
}
```

### shield (temporary extra HP)
```python
{"kind": "shield", "color": "cyan", "amount": 40, "durationMs": 3000}
```

### heal (restore HP)
```python
{"kind": "heal", "color": "lime", "amount": 35}
```

### dash (move fast, maybe invincible)
```python
{
    "kind": "dash", "color": "white",
    "distance": 180,       # 80 to 400
    "durationMs": 200,     # 80 to 500
    "invulnerable": True,  # True = no damage during dash
}
```

## Effects (go inside `"onHit"` or `"onTick"`)

```python
{"effect": "damage", "amount": 15}                              # 1 to 60
{"effect": "dot", "dps": 5, "durationMs": 1200}                 # damage over time
{"effect": "slow", "factor": 0.5, "durationMs": 1000}           # half speed
{"effect": "stun", "durationMs": 400}                           # can't move
{"effect": "knockback", "strength": 200}                        # push away
{"effect": "heal", "amount": 20}                                # restore HP
```

## Colors that work

Any of these names:

> red, orange, yellow, green, blue, purple, pink, cyan, lime,
> gold, silver, white, black, gray, brown, navy, teal, magenta,
> crimson, indigo, violet, plum, hotpink, skyblue, deepskyblue,
> turquoise, olive, salmon, tomato, coral, khaki

Or a hex code like `"#ff8800"`.

## Controls (when playing)

- **WASD** or arrows — move
- **Mouse** — aim
- **Space / E / Q / F** — your powers (whichever keys you chose)
- **Left/Right mouse click** — your powers if you bound them to `"mouse1"` / `"mouse2"`
- **Shift** — sprint (drains stamina)
- **C** — dodge roll (uses your FULL stamina bar — takes ~7s to refill)

## Python rules

- Use `True` and `False` (capitals!), not `true` / `false`.
- Keys are in quotes: `"name"`, not `name`.
- Don't forget commas between items in a list or dict.
- All your code goes **inside** `def build_character():`.

## When stuff doesn't work

- **"size: value error, size must be between 12 and 60"** → fix the number to be in range.
- **"value error, color must be a basic name..."** → pick a color from the list above, or use `"#rrggbb"`.
- **"over budget"** → make a cooldown longer, or cut some damage.
- **"two powers on the same key"** → each of space/e/q/f can only have one power.
