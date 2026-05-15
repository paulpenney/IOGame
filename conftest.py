"""Pytest config: disable the password gate for the test suite."""

import os

os.environ.setdefault("SITE_PASSWORD_DISABLED", "1")
