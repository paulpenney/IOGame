# Lesson 2 — Add a Power

**Goal:** give your character a second ability.

You already have **Punch** on the space bar. Now let's add more.

## The four keys

Your character can have up to **4 powers**, one for each key:

- `space`
- `e`
- `q`
- `f`
- `mouse1` (left click)
- `mouse2` (right click)

Pick whichever you like — each power needs its own key, no duplicates.

## How to add one

In your `"powers"` list, **add a comma** after the last power, then paste
a new power dict. Like this:

```python
"powers": [
    {  ... your punch ... },         # ← add a comma here
    {  ... new power goes here ... },
],
```

## Pick from the menu

Pick **one** of these and paste it as your second power. Try them all
over time — each one changes how you play.

### Heal — recover HP

```python
{
    "name": "Heal",
    "key": "e",
    "cooldownMs": 8000,
    "cast": {"kind": "heal", "color": "lime", "amount": 35},
},
```

Press **E** when you're low on health.

---

### Shield — block damage

```python
{
    "name": "Shield",
    "key": "e",
    "cooldownMs": 7000,
    "cast": {"kind": "shield", "color": "cyan", "amount": 40, "durationMs": 3000},
},
```

Press **E** and you get 40 extra HP for 3 seconds.

---

### Blink — teleport forward

```python
{
    "name": "Blink",
    "key": "f",
    "cooldownMs": 4000,
    "cast": {
        "kind": "dash", "color": "white",
        "distance": 180, "durationMs": 200, "invulnerable": True,
    },
},
```

Press **F** to dash. While dashing you take **no damage**.

---

### Fireball — long-range hit

```python
{
    "name": "Fireball",
    "key": "q",
    "cooldownMs": 1000,
    "cast": {
        "kind": "projectile", "color": "orange",
        "speed": 420, "radius": 6, "lifetimeMs": 1500,
        "count": 1, "spreadDeg": 0, "pierce": False,
        "onHit": [{"effect": "damage", "amount": 18}],
    },
},
```

Press **Q** to shoot a fireball.

---

### Poison Cloud — drop a cloud that hurts everyone inside

```python
{
    "name": "Poison Cloud",
    "key": "q",
    "cooldownMs": 8000,
    "cast": {
        "kind": "area", "color": "green",
        "radius": 70, "durationMs": 3000, "tickIntervalMs": 400,
        "onTick": [{"effect": "dot", "dps": 5, "durationMs": 600}],
    },
},
```

Press **Q** to drop a poison cloud where you're standing.

---

### Stun Punch — bigger punch that freezes the enemy

```python
{
    "name": "Stun Punch",
    "key": "e",
    "cooldownMs": 3000,
    "cast": {
        "kind": "melee", "color": "yellow",
        "range": 45, "arcDeg": 80,
        "onHit": [
            {"effect": "damage", "amount": 10},
            {"effect": "stun", "durationMs": 400},
        ],
    },
},
```

Press **E** to hit and stun.

## Try it!

1. Pick a power above.
2. Paste it after your first power (don't forget the comma!).
3. **Run & Validate**.
4. **Join match** and try the new key.

## When it doesn't work

- **"Validation failed: ..."** → read the error. Usually a missing comma, a
  missing `True`/`False`, or two powers on the same key.
- **Over budget?** That's next: [Lesson 3 — Stay under 100 points →](03-budget.md)
