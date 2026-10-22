from datetime import datetime, timezone
from sqlalchemy import Column, Integer, String, DateTime, Date, Time, Text, ForeignKey
from sqlalchemy.orm import relationship, synonym
from app.database import Base

class LostItem(Base):
    __tablename__ = "lost_items"

    lost_id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.user_id"), nullable=False)
    title = Column(String(150), nullable=False, index=True)
    description = Column(Text, nullable=True)
    category = Column(String(50), nullable=True, index=True)
    color = Column(String(50), nullable=True)
    brand = Column(String(100), nullable=True)
    lost_location = Column(String(150), nullable=True, index=True)
    lost_date = Column(Date, nullable=True, index=True)
    lost_time = Column(Time, nullable=True)
    image_path = Column(String(255), nullable=True)
    status = Column(String(50), nullable=False, default="ACTIVE", index=True)  # ACTIVE, MATCHED, RECLAIMED, CLOSED
    created_at = Column(DateTime, nullable=False, default=lambda: datetime.now(timezone.utc))

    # SQLAlchemy column synonyms for 100% transparent backwards compatibility
    lost_item_id = synonym("lost_id")
    item_name = synonym("title")
    location_lost = synonym("lost_location")
    date_lost = synonym("lost_date")
    image_url = synonym("image_path")

    # Non-column attributes with setters
    @property
    def time_lost(self):
        return str(self.lost_time) if self.lost_time else None

    @time_lost.setter
    def time_lost(self, val):
        if not val:
            self.lost_time = None
            return
        if isinstance(val, str) and val.strip():
            parts = val.strip().split(":")
            try:
                from datetime import time as dt_time
                self.lost_time = dt_time(int(parts[0]), int(parts[1]))
            except Exception:
                self.lost_time = None
        elif hasattr(val, "hour"):
            self.lost_time = val
        else:
            self.lost_time = None

    @property
    def specific_location(self):
        return None

    @specific_location.setter
    def specific_location(self, val):
        pass

    @property
    def identifying_marks(self):
        if self.description and "\n[Private Marks: " in self.description:
            return self.description.split("\n[Private Marks: ", 1)[1].rstrip("]")
        return getattr(self, "_identifying_marks", None)

    @identifying_marks.setter
    def identifying_marks(self, val):
        self._identifying_marks = val

    @property
    def notify_on_match(self):
        return True

    @notify_on_match.setter
    def notify_on_match(self, val):
        pass

    # Relationships
    user = relationship("User", back_populates="lost_items")
    matches = relationship("Match", back_populates="lost_item", cascade="all, delete-orphan")
    reclaims = relationship("ReclaimRecord", back_populates="lost_item")


class FoundItem(Base):
    __tablename__ = "found_items"

    found_id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.user_id"), nullable=False)
    title = Column(String(150), nullable=False, index=True)
    description = Column(Text, nullable=True)
    category = Column(String(50), nullable=True, index=True)
    color = Column(String(50), nullable=True)
    brand = Column(String(100), nullable=True)
    found_location = Column(String(150), nullable=True, index=True)
    found_date = Column(Date, nullable=True, index=True)
    found_time = Column(Time, nullable=True)
    image_path = Column(String(255), nullable=True)
    status = Column(String(50), nullable=False, default="AVAILABLE", index=True)  # AVAILABLE, CLAIMED, RETURNED, CLOSED
    created_at = Column(DateTime, nullable=False, default=lambda: datetime.now(timezone.utc))

    # SQLAlchemy column synonyms
    found_item_id = synonym("found_id")
    item_name = synonym("title")
    location_found = synonym("found_location")
    date_found = synonym("found_date")
    image_url = synonym("image_path")

    @property
    def time_found(self):
        return str(self.found_time) if self.found_time else None

    @property
    def time_lost(self):
        return self.time_found

    @time_lost.setter
    def time_lost(self, val):
        self.time_found = val

    @time_found.setter
    def time_found(self, val):
        if not val:
            self.found_time = None
            return
        if isinstance(val, str) and val.strip():
            parts = val.strip().split(":")
            try:
                from datetime import time as dt_time
                self.found_time = dt_time(int(parts[0]), int(parts[1]))
            except Exception:
                self.found_time = None
        elif hasattr(val, "hour"):
            self.found_time = val
        else:
            self.found_time = None

    @property
    def specific_location(self):
        return None

    @specific_location.setter
    def specific_location(self, val):
        pass

    @property
    def custody_location(self):
        return "Campus Security"

    @custody_location.setter
    def custody_location(self, val):
        pass

    @property
    def contact_preference(self):
        return "Coordinate Handover via Campus Security / Admin"

    @contact_preference.setter
    def contact_preference(self, val):
        pass

    @property
    def notify_on_match(self):
        return True

    @notify_on_match.setter
    def notify_on_match(self, val):
        pass

    # Relationships
    user = relationship("User", back_populates="found_items")
    matches = relationship("Match", back_populates="found_item", cascade="all, delete-orphan")
    claims = relationship("Claim", back_populates="found_item", cascade="all, delete-orphan")
    reclaims = relationship("ReclaimRecord", back_populates="found_item")
