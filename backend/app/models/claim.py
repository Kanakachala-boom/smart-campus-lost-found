from datetime import datetime, timezone
from sqlalchemy import Column, Integer, String, DateTime, Text, ForeignKey
from sqlalchemy.orm import relationship, synonym
from app.database import Base

class Claim(Base):
    __tablename__ = "claims"

    claim_id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    found_id = Column(Integer, ForeignKey("found_items.found_id"), nullable=False)
    claimant_id = Column(Integer, ForeignKey("users.user_id"), nullable=False)
    match_id = Column(Integer, ForeignKey("matches.match_id"), nullable=True)
    claim_description = Column(Text, nullable=True)
    status = Column(String(50), nullable=False, default="PENDING", index=True)  # PENDING, VERIFIED, REJECTED
    created_at = Column(DateTime, nullable=False, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, nullable=False, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    # SQLAlchemy synonyms
    found_item_id = synonym("found_id")
    claimant_user_id = synonym("claimant_id")
    verification_details = synonym("claim_description")
    verification_status = synonym("status")

    @property
    def lost_date(self):
        return None

    @lost_date.setter
    def lost_date(self, val):
        pass

    @property
    def lost_location(self):
        return None

    @lost_location.setter
    def lost_location(self, val):
        pass

    @property
    def claimant_answer(self):
        return None

    @claimant_answer.setter
    def claimant_answer(self, val):
        pass

    @property
    def proof_image_url(self):
        return None

    @proof_image_url.setter
    def proof_image_url(self, val):
        pass

    @property
    def handover_instructions(self):
        if self.claim_description and "\n[Handover: " in self.claim_description:
            try:
                return self.claim_description.split("\n[Handover: ", 1)[1].split("]", 1)[0]
            except Exception:
                pass
        return getattr(self, "_handover_instructions", None)

    @handover_instructions.setter
    def handover_instructions(self, val):
        self._handover_instructions = val
        if val:
            desc = self.claim_description or ""
            if "\n[Handover: " not in desc:
                self.claim_description = desc + f"\n[Handover: {val}]"

    @property
    def rejection_reason(self):
        if self.claim_description and "\n[Rejection: " in self.claim_description:
            try:
                return self.claim_description.split("\n[Rejection: ", 1)[1].split("]", 1)[0]
            except Exception:
                pass
        return getattr(self, "_rejection_reason", None)

    @rejection_reason.setter
    def rejection_reason(self, val):
        self._rejection_reason = val
        if val:
            desc = self.claim_description or ""
            if "\n[Rejection: " not in desc:
                self.claim_description = desc + f"\n[Rejection: {val}]"

    @property
    def reviewed_at(self):
        return self.updated_at

    @reviewed_at.setter
    def reviewed_at(self, val):
        self.updated_at = val

    # Relationships
    found_item = relationship("FoundItem", back_populates="claims")
    claimant = relationship("User", back_populates="claims", foreign_keys=[claimant_id])
    match = relationship("Match", back_populates="claims")
    messages = relationship("Message", back_populates="claim", cascade="all, delete-orphan")
    verifications = relationship("OwnershipVerification", back_populates="claim", cascade="all, delete-orphan")
    reclaim_records = relationship("ReclaimRecord", back_populates="claim")
