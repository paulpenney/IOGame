def build_character():
    # Rogue — high-mobility skirmisher.
    # Demonstrates: DASH + MELEE backstab + thrown PROJECTILE.

    blink = {
        "name": "Blink",
        "key": "shift",
        "cooldownMs": 2200,
        "cast": {
            "kind": "dash",
            "color": "#a070ff",
            "distance": 240,
            "durationMs": 180,
            "invulnerable": True,
        },
    }

    backstab = {
        "name": "Backstab",
        "key": "space",
        "cooldownMs": 700,
        "cast": {
            "kind": "melee",
            "color": "yellow",
            "range": 90,
            "arcDeg": 80,
            "onHit": [
                {"effect": "damage", "amount": 22},
                {"effect": "stun", "durationMs": 200},
            ],
        },
    }

    throwing_knife = {
        "name": "Throwing Knife",
        "key": "e",
        "cooldownMs": 500,
        "cast": {
            "kind": "projectile",
            "color": "silver",
            "speed": 700,
            "radius": 4,
            "lifetimeMs": 800,
            "count": 1,
            "spreadDeg": 0,
            "pierce": True,
            "onHit": [{"effect": "damage", "amount": 12}],
        },
    }

    return {
        "characterName": "Rogue",
        "color": "#a070ff",
        "size": 20,
        "speed": 320,
        "maxHealth": 80,
        "powers": [backstab, blink, throwing_knife],
    }
