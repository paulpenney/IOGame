def build_character():
    # Fire Wizard — ranged caster.
    # Demonstrates: PROJECTILE (3-shot fan) + AREA (burning ground / DoT).

    fireball = {
        "name": "Fireball",
        "key": "space",
        "cooldownMs": 1100,
        "cast": {
            "kind": "projectile",
            "color": "orange",
            "speed": 480,
            "radius": 7,
            "lifetimeMs": 1100,
            "count": 2,
            "spreadDeg": 18,
            "onHit": [
                {"effect": "damage", "amount": 9},
                {"effect": "dot", "dps": 6, "durationMs": 1500},
            ],
        },
    }

    firewall = {
        "name": "Firewall",
        "key": "q",
        "cooldownMs": 9000,
        "cast": {
            "kind": "area",
            "color": "red",
            "radius": 75,
            "durationMs": 3500,
            "tickIntervalMs": 400,
            "followOwner": False,
            "onTick": [{"effect": "damage", "amount": 4}],
        },
    }

    blink = {
        "name": "Phase Step",
        "key": "e",
        "cooldownMs": 4000,
        "cast": {
            "kind": "dash",
            "color": "magenta",
            "distance": 180,
            "durationMs": 200,
            "invulnerable": True,
        },
    }

    return {
        "characterName": "Fire Wizard",
        "color": "#ff6a3d",
        "size": 22,
        "speed": 230,
        "maxHealth": 90,
        "powers": [fireball, firewall, blink],
    }
