from datetime import datetime, timezone
from sqlalchemy import Column, Integer, Boolean, DateTime, Text, ForeignKey
from sqlalchemy.orm import relationship, synonym
from app.database import Base

class Message(Base):
    __tablename__ = "messages"

    message_id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    sender_id = Column(Integer, ForeignKey("users.user_id"), nullable=False)
    receiver_id = Column(Integer, ForeignKey("users.user_id"), nullable=False, default=1)
    claim_id = Column(Integer, ForeignKey("claims.claim_id"), nullable=False, index=True)
    message = Column(Text, nullable=False)
    sent_at = Column(DateTime, nullable=False, default=lambda: datetime.now(timezone.utc))
    is_read = Column(Boolean, nullable=False, default=False)

    # SQLAlchemy synonyms
    text = synonym("message")
    message_text = synonym("message")
    created_at = synonym("sent_at")

    # Relationships
    claim = relationship("Claim", back_populates="messages")
    sender = relationship("User", back_populates="sent_messages", foreign_keys=[sender_id])
    receiver = relationship("User", back_populates="received_messages", foreign_keys=[receiver_id])

ClaimMessage = Message
