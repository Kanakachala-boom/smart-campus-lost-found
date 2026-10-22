from datetime import datetime, timezone
from sqlalchemy import Column, Integer, String, DateTime, Text, ForeignKey
from sqlalchemy.orm import relationship
from app.database import Base

class OwnershipVerification(Base):
    __tablename__ = "ownership_verifications"

    verification_id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    claim_id = Column(Integer, ForeignKey("claims.claim_id"), nullable=False)
    question = Column(Text, nullable=False)
    expected_answer = Column(Text, nullable=True)
    provided_answer = Column(Text, nullable=True)
    result = Column(String(50), nullable=False, default="PENDING")  # PENDING, PASSED, FAILED
    verified_by = Column(Integer, ForeignKey("users.user_id"), nullable=True)
    verified_at = Column(DateTime, nullable=True)

    # Relationships
    claim = relationship("Claim", back_populates="verifications")
    verifier = relationship("User", foreign_keys=[verified_by])
    reclaims = relationship("ReclaimRecord", back_populates="verification")
