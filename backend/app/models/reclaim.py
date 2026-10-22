from datetime import datetime, timezone
from sqlalchemy import Column, Integer, String, DateTime, Text, ForeignKey
from sqlalchemy.orm import relationship
from app.database import Base

class ReclaimRecord(Base):
    __tablename__ = "reclaim_records"

    reclaim_id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    claim_id = Column(Integer, ForeignKey("claims.claim_id"), nullable=False)
    lost_id = Column(Integer, ForeignKey("lost_items.lost_id"), nullable=True)
    found_id = Column(Integer, ForeignKey("found_items.found_id"), nullable=False)
    owner_id = Column(Integer, ForeignKey("users.user_id"), nullable=False)
    finder_id = Column(Integer, ForeignKey("users.user_id"), nullable=False)
    verification_id = Column(Integer, ForeignKey("ownership_verifications.verification_id"), nullable=True)
    reclaim_date = Column(DateTime, nullable=False, default=lambda: datetime.now(timezone.utc))
    handover_location = Column(String(150), nullable=True)
    status = Column(String(50), nullable=False, default="COMPLETED")  # COMPLETED, CANCELLED
    remarks = Column(Text, nullable=True)

    # Relationships
    claim = relationship("Claim", back_populates="reclaim_records")
    lost_item = relationship("LostItem", back_populates="reclaims")
    found_item = relationship("FoundItem", back_populates="reclaims")
    owner = relationship("User", foreign_keys=[owner_id])
    finder = relationship("User", foreign_keys=[finder_id])
    verification = relationship("OwnershipVerification", back_populates="reclaims")
