from datetime import datetime, timezone
from sqlalchemy import Column, Integer, String, Boolean, DateTime, Text, ForeignKey
from sqlalchemy.orm import relationship, synonym
from app.database import Base

class Notification(Base):
    __tablename__ = "notifications"

    notification_id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.user_id"), nullable=False, index=True)
    type = Column(String(50), nullable=False)  # 'POTENTIAL_MATCH', 'CLAIM_SUBMITTED', 'CLAIM_VERIFIED', etc.
    title = Column(String(150), nullable=False)
    message = Column(Text, nullable=False)
    reference_id = Column(Integer, nullable=True)
    is_read = Column(Boolean, nullable=False, default=False, index=True)
    created_at = Column(DateTime, nullable=False, default=lambda: datetime.now(timezone.utc))

    # SQLAlchemy synonym
    item_id = synonym("reference_id")

    @property
    def item_type(self):
        return getattr(self, "_item_type", None)

    @item_type.setter
    def item_type(self, val):
        self._item_type = val

    @property
    def target_url(self):
        explicit = getattr(self, "_target_url", None)
        if explicit:
            return explicit
        if self.type == "POTENTIAL_MATCH":
            if self.reference_id:
                return f"/items/found/{self.reference_id}"
            return "/matches"
        if self.type in ("CLAIM_SUBMITTED", "CLAIM_VERIFIED", "CLAIM_REJECTED"):
            if self.reference_id:
                return f"/claims/{self.reference_id}"
            return "/my-claims"
        if self.type == "CLAIM_MESSAGE":
            if self.reference_id:
                return f"/items/found/{self.reference_id}"
            return "/my-claims"
        if self.type == "REPORT_CONFIRMED":
            return "/my-reports"
        return "/dashboard"

    @target_url.setter
    def target_url(self, val):
        self._target_url = val

    # Relationships
    user = relationship("User", back_populates="notifications")
