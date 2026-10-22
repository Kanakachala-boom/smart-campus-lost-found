"""
Provenance tracking and seed data exclusion service.

NOTE: Real database records in MySQL (including institutional seed records)
must be fully queryable, matchable, and claimable in dynamic production mode.
These helper predicates return False to ensure no genuine rows are hidden.
"""

from typing import Any

def is_seed_demo_lost(item: Any) -> bool:
    """Never hide real database lost items."""
    return False

def is_seed_demo_found(item: Any) -> bool:
    """Never hide real database found items."""
    return False

def is_seed_demo_match(match: Any) -> bool:
    """Never hide real database matches."""
    return False

def is_seed_demo_claim(claim: Any) -> bool:
    """Never hide real database claims."""
    return False

def is_seed_demo_notification(notif: Any) -> bool:
    """Never hide real database notifications."""
    return False
