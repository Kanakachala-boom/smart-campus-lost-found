import re
from datetime import date
from typing import List, Tuple, Set, Optional
from sqlalchemy.orm import Session
from sqlalchemy import or_
from app.models.item import LostItem, FoundItem
from app.models.match import Match
from app.models.notification import Notification

STOPWORDS = {
    "a", "an", "the", "and", "or", "in", "on", "at", "to", "for", "with",
    "by", "of", "from", "is", "was", "it", "this", "that", "my", "near",
    "has", "had", "have", "color", "colour", "small", "large", "new", "old",
    "found", "lost", "item", "please", "help", "left", "behind"
}

SYNONYM_GROUPS = [
    {"mobile", "phone", "smartphone", "cellphone", "android", "iphone"},
    {"laptop", "notebook", "macbook", "computer", "thinkpad", "dell", "hp", "lenovo"},
    {"earphone", "earphones", "earbud", "earbuds", "headphone", "headphones", "airpods", "neckband", "boat"},
    {"charger", "chargers", "adapter", "cable", "cord", "wire", "typec", "usbc", "powerbank"},
    {"id", "identity", "usn", "lanyard", "badge", "smartcard"},
    {"calculator", "calc", "scientific", "casio"},
    {"bottle", "flask", "sipper", "thermos", "milton"},
    {"cycle", "bicycle", "bike"},
    {"wallet", "purse", "pouch", "billfold", "wildhorn"},
    {"spectacles", "specs", "glasses", "sunglasses", "shades", "fastrack"},
    {"key", "keys", "keychain", "ring", "keyset"},
    {"coat", "apron", "labcoat"},
    {"umbrella", "parasol"},
    {"watch", "smartwatch", "band", "fitbit"},
    {"bag", "backpack", "sack", "rucksack", "skybags"},
]

SYNONYM_MAP = {}
for group in SYNONYM_GROUPS:
    canonical = sorted(list(group))[0]
    for word in group:
        SYNONYM_MAP[word] = canonical

def stem_word(w: str) -> str:
    """Basic plural and suffix normalization for item tokens."""
    if len(w) <= 3:
        return w
    if w.endswith("ies") and len(w) > 4:
        return w[:-3] + "y"
    if w.endswith("es") and len(w) > 4:
        if w.endswith(("sses", "shes", "ches", "xes", "zes")):
            return w[:-2]
        return w[:-1]
    if w.endswith("s") and not w.endswith("ss") and len(w) > 3:
        return w[:-1]
    return w

def clean_tokens(text: str) -> Set[str]:
    """Normalizes text into clean lowercase stemmed & synonym-mapped tokens."""
    if not text:
        return set()
    cleaned = re.sub(r"[^\w\s]", " ", text.lower())
    raw_tokens = [t.strip() for t in cleaned.split() if len(t.strip()) > 1]
    res = set()
    for t in raw_tokens:
        if t in STOPWORDS:
            continue
        stemmed = stem_word(t)
        canonical = SYNONYM_MAP.get(stemmed, SYNONYM_MAP.get(t, stemmed))
        res.add(canonical)
    return res

def jaccard_similarity(set1: Set[str], set2: Set[str]) -> float:
    """Calculates Jaccard token overlap between two sets of words."""
    if not set1 or not set2:
        return 0.0
    intersection = set1.intersection(set2)
    union = set1.union(set2)
    if not union:
        return 0.0
    return len(intersection) / len(union)

def calculate_match_score(lost: LostItem, found: FoundItem) -> Tuple[int, str, str]:
    """
    Computes a composite multi-factor similarity score (0 to 100) per Section 7.1:
      1. Category compatibility (20%)
      2. Text and keyword similarity (25%)
      3. Brand, model, and distinguishing attributes (20%)
      4. Location proximity (15%)
      5. Time proximity (10%)
      6. Additional structured features / image presence (up to 10%)
    """
    reasons = []

    # 1. Category Matching (20 points max)
    category_score = 0
    lost_cat = (lost.category or "").strip().lower()
    found_cat = (found.category or "").strip().lower()

    if lost_cat and found_cat:
        if lost_cat == found_cat:
            category_score = 20
            reasons.append(f"Identical category ({lost.category})")
        elif (
            ("electronic" in lost_cat and "electronic" in found_cat) or
            ("id" in lost_cat and "id" in found_cat) or
            ("bag" in lost_cat and "bag" in found_cat) or
            ("key" in lost_cat and "key" in found_cat) or
            ("accessor" in lost_cat and "accessor" in found_cat) or
            ("wallet" in lost_cat and "purse" in found_cat) or
            ("purse" in lost_cat and "wallet" in found_cat) or
            ("wallet" in lost_cat and "bag" in found_cat) or
            ("book" in lost_cat and "stationery" in found_cat) or
            ("cloth" in lost_cat and "coat" in found_cat)
        ):
            category_score = 15
            reasons.append("Related category classification")
        elif lost_cat == "other" or found_cat == "other":
            category_score = 10
            reasons.append("Compatible category (listed under Other)")

    # 2. Text Similarity (25 points max)
    lost_name_tokens = clean_tokens(lost.item_name)
    found_name_tokens = clean_tokens(found.item_name)
    name_sim = jaccard_similarity(lost_name_tokens, found_name_tokens)
    name_inter = lost_name_tokens.intersection(found_name_tokens)

    lost_desc_tokens = clean_tokens(f"{lost.description or ''} {lost.specific_location or ''}")
    found_desc_tokens = clean_tokens(f"{found.description or ''} {found.specific_location or ''}")
    desc_sim = jaccard_similarity(lost_desc_tokens, found_desc_tokens)

    # Combined text similarity with 70% weight on title/name and 30% on description
    text_sim = (name_sim * 0.70) + (desc_sim * 0.30)
    text_score = min(25, int(text_sim * 25 * 1.5))
    if name_inter and text_score < 15:
        # Guarantee minimum 15 pts if key name nouns match (e.g. both say "charger")
        text_score = 15

    if text_score >= 18:
        reasons.append(f"Strong keyword & name overlap ({text_score}/25)")
    elif text_score >= 10:
        reasons.append("Moderate keyword similarities")

    # 3. Brand, Model, and Distinguishing Attributes (20 points max)
    brand_attr_score = 0
    lost_brand = (lost.brand or "").strip().lower()
    found_brand = (found.brand or "").strip().lower()

    # Check brand attribute or presence in name/description
    all_lost_text = f"{lost.item_name} {lost.description or ''} {lost_brand}".lower()
    all_found_text = f"{found.item_name} {found.description or ''} {found_brand}".lower()

    known_brands = ["apple", "dell", "hp", "lenovo", "samsung", "boat", "noise", "oneplus", "fastrack", "casio", "titan", "sony", "realme", "xiaomi", "asus", "acer"]
    detected_lost_brands = {b for b in known_brands if b in all_lost_text}
    detected_found_brands = {b for b in known_brands if b in all_found_text}

    if lost_brand and found_brand and lost_brand == found_brand:
        brand_attr_score += 10
        reasons.append(f"Matching brand ({lost.brand})")
    elif detected_lost_brands and detected_found_brands and detected_lost_brands.intersection(detected_found_brands):
        brand_attr_score += 10
        matched_b = list(detected_lost_brands.intersection(detected_found_brands))[0].capitalize()
        reasons.append(f"Matching brand keyword ({matched_b})")

    # Check color attribute or presence in text
    lost_color = (lost.color or "").strip().lower()
    found_color = (found.color or "").strip().lower()
    common_colors = ["black", "blue", "white", "silver", "grey", "gray", "red", "green", "brown", "gold", "yellow", "pink"]
    detected_lost_colors = {c for c in common_colors if c in all_lost_text}
    detected_found_colors = {c for c in common_colors if c in all_found_text}

    if lost_color and found_color and lost_color == found_color:
        brand_attr_score += 7
        reasons.append(f"Matching color attribute ({lost.color})")
    elif detected_lost_colors and detected_found_colors and detected_lost_colors.intersection(detected_found_colors):
        brand_attr_score += 7
        matched_c = list(detected_lost_colors.intersection(detected_found_colors))[0].capitalize()
        reasons.append(f"Matching color specification ({matched_c})")

    # Distinguishing physical features / model details (up to 3 pts)
    feature_keywords = ["sticker", "case", "cover", "engraving", "scratch", "broken", "wired", "wireless", "type-c", "usb", "pro", "plus", "max", "mini"]
    lost_feats = {f for f in feature_keywords if f in all_lost_text}
    found_feats = {f for f in feature_keywords if f in all_found_text}
    if lost_feats.intersection(found_feats):
        brand_attr_score += 3
        reasons.append("Shared distinguishing model or physical attributes")

    brand_attr_score = min(20, brand_attr_score)

    # 4. Location Proximity (15 points max)
    location_score = 0
    lost_loc = (lost.location_lost or "").strip().lower()
    found_loc = (found.location_found or "").strip().lower()
    lost_spec = (lost.specific_location or "").strip().lower()
    found_spec = (found.specific_location or "").strip().lower()

    if lost_loc and found_loc:
        if lost_loc == found_loc and "other" not in lost_loc:
            location_score = 15
            reasons.append(f"Exact location match ({lost.location_lost})")
        else:
            lost_loc_tokens = clean_tokens(f"{lost_loc} {lost_spec}")
            found_loc_tokens = clean_tokens(f"{found_loc} {found_spec}")
            loc_inter = lost_loc_tokens.intersection(found_loc_tokens)
            if loc_inter:
                location_score = 11
                reasons.append("Matching campus location zone")
            elif (
                ("canteen" in lost_loc_tokens and "canteen" in found_loc_tokens) or
                ("library" in lost_loc_tokens and "library" in found_loc_tokens) or
                ("sports" in lost_loc_tokens and "sports" in found_loc_tokens) or
                ("hostel" in lost_loc_tokens and "hostel" in found_loc_tokens) or
                ("gate" in lost_loc_tokens and "gate" in found_loc_tokens) or
                ("parking" in lost_loc_tokens and "parking" in found_loc_tokens) or
                ("block" in lost_loc_tokens and "block" in found_loc_tokens)
            ):
                location_score = 8
                reasons.append("Adjacent or related campus zone")

    # 5. Temporal Proximity (10 points max)
    temporal_score = 0
    if lost.date_lost and found.date_found:
        date_diff = (found.date_found - lost.date_lost).days
        if date_diff >= 0:
            if date_diff <= 2:
                temporal_score = 10
                reasons.append("Found within 48 hours of reported loss")
            elif date_diff <= 5:
                temporal_score = 8
                reasons.append("Found within 5 days of reported loss")
            elif date_diff <= 14:
                temporal_score = 5
                reasons.append("Found within two weeks of reported loss")
            elif date_diff <= 30:
                temporal_score = 3
                reasons.append("Found within 30 days of reported loss")
        else:
            abs_diff = abs(date_diff)
            if abs_diff <= 2:
                temporal_score = 6
                reasons.append("Reported dates within close approximate margin")
            elif abs_diff <= 5:
                temporal_score = 4
                reasons.append("Reported dates within reasonable margin")

    # 6. Additional Structured Features / Media (10 points max)
    feature_score = 0
    if (lost.image_url and lost.image_url.strip()) and (found.image_url and found.image_url.strip()):
        feature_score += 5
        reasons.append("Both reports provide photographic evidence")

    # Time of day compatibility
    lost_t = getattr(lost, "time_lost", getattr(lost, "lost_time", None))
    found_t = getattr(found, "time_found", getattr(found, "time_lost", getattr(found, "found_time", None)))
    if lost_t and found_t:
        try:
            lost_hour = int(str(lost_t).split(":")[0])
            found_hour = int(str(found_t).split(":")[0])
            hour_diff = abs(found_hour - lost_hour)
            if hour_diff <= 3:
                feature_score += 5
                reasons.append("Reported times of day align closely")
            elif (lost_hour < 12 and found_hour < 12) or (12 <= lost_hour < 17 and 12 <= found_hour < 17) or (lost_hour >= 17 and found_hour >= 17):
                feature_score += 3
                reasons.append("Reported during the same period of day")
        except Exception:
            pass

    feature_score = min(10, feature_score)

    total_score = min(100, category_score + text_score + brand_attr_score + location_score + temporal_score + feature_score)

    # Section 7.2 Confidence thresholds:
    # 90%+ : High confidence potential match
    # 75% to below 90%: Medium confidence (potential match, request further verification)
    # 50% to below 75%: Low confidence candidate (clearly labelled as unverified)
    # Below 50%: Filtered out
    if total_score >= 90:
        confidence = "High"
    elif total_score >= 75:
        confidence = "Medium"
    else:
        confidence = "Low"

    match_reason = "; ".join(reasons) if reasons else "General potential match based on reported metadata."
    return total_score, confidence, match_reason

def evaluate_and_store_match(db: Session, lost: LostItem, found: FoundItem) -> Optional[Match]:
    """Calculates score, saves/updates match in database if >= 50%, and notifies owner if high match."""
    score, confidence, reason = calculate_match_score(lost, found)
    if score < 50:
        return None

    # Check if a match pair already exists
    existing = db.query(Match).filter(
        Match.lost_item_id == lost.lost_item_id,
        Match.found_item_id == found.found_item_id
    ).first()

    if existing:
        existing.score = score
        existing.confidence_level = confidence
        existing.match_reason = reason
        db.commit()
        db.refresh(existing)
        return existing

    new_match = Match(
        lost_item_id=lost.lost_item_id,
        found_item_id=found.found_item_id,
        score=score,
        confidence_level=confidence,
        match_reason=reason,
        status="PENDING",
    )
    db.add(new_match)

    # Update item statuses to POTENTIAL_MATCH if currently ACTIVE / AVAILABLE
    if lost.status == "ACTIVE":
        lost.status = "POTENTIAL_MATCH"
    if found.status == "AVAILABLE":
        found.status = "POTENTIAL_MATCH"

    # Send user-specific notification to the lost item reporter (avoid duplicate)
    # Send user-specific notification to the lost item reporter (avoid duplicate)
    if lost.notify_on_match:
        existing_notif = db.query(Notification).filter(
            Notification.user_id == lost.user_id,
            Notification.type == "POTENTIAL_MATCH",
            Notification.reference_id == found.found_item_id,
        ).first()
        if not existing_notif:
            notif = Notification(
                user_id=lost.user_id,
                type="POTENTIAL_MATCH",
                title="Potential Match Found",
                message=f"A reported found item '{found.item_name}' matches your lost '{lost.item_name}' with {confidence} confidence ({score}% match).",
                item_id=found.found_item_id,
                item_type="found",
                target_url=f"/items/found/{found.found_item_id}",
                is_read=False,
            )
            db.add(notif)

            # Multi-channel notification: Email & SMS
            if lost.user:
                try:
                    from app.services.email_service import send_match_alert_email
                    from app.services.sms_service import send_sms_notification
                    send_match_alert_email(
                        to_email=lost.user.email,
                        recipient_name=lost.user.name,
                        lost_item_name=lost.item_name,
                        found_item_name=found.item_name,
                        match_score=score,
                        confidence=confidence,
                        target_url=f"/items/found/{found.found_item_id}"
                    )
                    if score >= 90 and lost.user.phone:
                        send_sms_notification(
                            phone_number=lost.user.phone,
                            message=f"[NIE L&F] High-confidence match ({score}%) for your lost '{lost.item_name}'. Check your portal."
                        )
                except Exception:
                    pass

    # Also notify found reporter if configured
    if found.notify_on_match and found.user_id != lost.user_id:
        existing_notif_found = db.query(Notification).filter(
            Notification.user_id == found.user_id,
            Notification.type == "POTENTIAL_MATCH",
            Notification.reference_id == lost.lost_item_id,
        ).first()
        if not existing_notif_found:
            notif_found = Notification(
                user_id=found.user_id,
                type="POTENTIAL_MATCH",
                title="Match Alert for Found Report",
                message=f"A report for '{lost.item_name}' matches your found item '{found.item_name}'.",
                item_id=lost.lost_item_id,
                item_type="lost",
                target_url=f"/items/lost/{lost.lost_item_id}",
                is_read=False,
            )
            db.add(notif_found)

    db.commit()
    db.refresh(new_match)
    return new_match

def run_matching_for_lost_item(db: Session, lost_item: LostItem) -> List[Match]:
    """Executes matching against all active found items when a lost report is created or updated."""
    candidate_found_items = db.query(FoundItem).filter(
        FoundItem.status.in_(["AVAILABLE", "POTENTIAL_MATCH"])
    ).all()

    matches = []
    for found in candidate_found_items:
        match = evaluate_and_store_match(db, lost_item, found)
        if match:
            matches.append(match)
    return matches

def run_matching_for_found_item(db: Session, found_item: FoundItem) -> List[Match]:
    """Executes matching against all active lost items when a found report is created or updated."""
    candidate_lost_items = db.query(LostItem).filter(
        LostItem.status.in_(["ACTIVE", "POTENTIAL_MATCH"])
    ).all()

    matches = []
    for lost in candidate_lost_items:
        match = evaluate_and_store_match(db, lost, found_item)
        if match:
            matches.append(match)
    return matches

def resolve_matches_for_item(db: Session, item_type: str, item_id: int) -> int:
    """Marks pending matches as RESOLVED when an item is recovered, returned, or closed."""
    if item_type == "lost":
        q = db.query(Match).filter(Match.lost_item_id == item_id, Match.status == "PENDING")
    else:
        q = db.query(Match).filter(Match.found_item_id == item_id, Match.status == "PENDING")
    
    count = q.update({"status": "RESOLVED"}, synchronize_session=False)
    db.commit()
    return count

def reconcile_all_matches(db: Session) -> dict:
    """
    Controlled reconciliation mechanism that scans all active lost items and available
    found items in MySQL, creates missing matches, updates scores, and handles
    status changes without deleting any user data or duplicating notifications.
    """
    eligible_lost = db.query(LostItem).filter(
        LostItem.status.in_(["ACTIVE", "POTENTIAL_MATCH"])
    ).all()

    eligible_found = db.query(FoundItem).filter(
        FoundItem.status.in_(["AVAILABLE", "POTENTIAL_MATCH"])
    ).all()

    created_count = 0
    updated_count = 0

    for lost in eligible_lost:
        for found in eligible_found:
            score, confidence, reason = calculate_match_score(lost, found)
            if score >= 50:
                existing = db.query(Match).filter(
                    Match.lost_item_id == lost.lost_item_id,
                    Match.found_item_id == found.found_item_id,
                ).first()

                if existing:
                    if int(existing.score) != int(score) or existing.confidence_level != confidence:
                        existing.score = score
                        existing.confidence_level = confidence
                        existing.match_reason = reason
                        updated_count += 1
                else:
                    new_match = Match(
                        lost_item_id=lost.lost_item_id,
                        found_item_id=found.found_item_id,
                        score=score,
                        confidence_level=confidence,
                        match_reason=reason,
                        status="PENDING",
                    )
                    db.add(new_match)
                    created_count += 1

    # Resolve pending matches whose items are no longer active
    resolved_lost_sub = db.query(LostItem.lost_item_id).filter(
        LostItem.status.in_(["RECLAIMED", "CLOSED"])
    )
    resolved_found_sub = db.query(FoundItem.found_item_id).filter(
        FoundItem.status.in_(["RETURNED", "CLOSED"])
    )

    db.query(Match).filter(
        or_(
            Match.lost_item_id.in_(resolved_lost_sub),
            Match.found_item_id.in_(resolved_found_sub)
        ),
        Match.status == "PENDING"
    ).update({"status": "RESOLVED"}, synchronize_session=False)

    db.commit()

    return {
        "processed_lost": len(eligible_lost),
        "processed_found": len(eligible_found),
        "matches_created": created_count,
        "matches_updated": updated_count,
    }
