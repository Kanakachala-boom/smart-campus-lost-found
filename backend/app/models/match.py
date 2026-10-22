from datetime import datetime, timezone
from sqlalchemy import Column, Integer, String, DateTime, Text, Numeric, ForeignKey, UniqueConstraint
from sqlalchemy.orm import relationship, synonym
from app.database import Base

class Match(Base):
    __tablename__ = "matches"

    match_id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    lost_id = Column(Integer, ForeignKey("lost_items.lost_id"), nullable=False)
    found_id = Column(Integer, ForeignKey("found_items.found_id"), nullable=False)
    matching_score = Column(Numeric(5, 2), nullable=False)
    match_reason = Column(Text, nullable=True)
    status = Column(String(50), nullable=False, default="PENDING", index=True)  # PENDING, ACCEPTED, REJECTED
    created_at = Column(DateTime, nullable=False, default=lambda: datetime.now(timezone.utc))

    __table_args__ = (
        UniqueConstraint("lost_id", "found_id", name="uq_matches_pair"),
    )

    lost_item_id = synonym("lost_id")
    found_item_id = synonym("found_id")
    score = synonym("matching_score")

    @property
    def confidence_level(self):
        if self.matching_score is None:
            return "Low"
        val = float(self.matching_score)
        if val >= 80:
            return "High"
        if val >= 50:
            return "Medium"
        return "Low"

    @confidence_level.setter
    def confidence_level(self, val):
        pass

    # Relationships
    lost_item = relationship("LostItem", back_populates="matches")
    found_item = relationship("FoundItem", back_populates="matches")
    claims = relationship("Claim", back_populates="match")
