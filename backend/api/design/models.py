from __future__ import annotations

import uuid
from datetime import datetime
from enum import Enum
from typing import Any

from sqlalchemy import UUID, DateTime, Integer, String
from sqlalchemy import Enum as SQLEnum
from sqlalchemy.orm import Mapped, mapped_column

import uuid
from datetime import datetime
from typing import Any

from sqlalchemy import UUID, DateTime
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column

def get_utc_now() -> datetime.datetime:
    return datetime.datetime.now(datetime.UTC).replace(tzinfo=None)



class DesignJobStatus(Enum):
    PENDING = "pending"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"


class Base(DeclarativeBase):
    __abstract__ = True

    id: Mapped[uuid.UUID] = mapped_column(UUID, default=uuid.uuid4, primary_key=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=get_utc_now)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=get_utc_now, onupdate=get_utc_now)

    def to_dict(self) -> dict[str, Any]:
        return {column.name: getattr(self, column.name) for column in self.__table__.columns}
    
    
    
class DesignJob(Base):
    __tablename__ = "design_job"

    input_yaml_filename: Mapped[str] = mapped_column(String(255), nullable=False)
    budget: Mapped[int] = mapped_column(Integer, nullable=False)
    protocol_name: Mapped[str] = mapped_column(String(255), nullable=False)
    num_designs: Mapped[int] = mapped_column(Integer, nullable=False)
    status: Mapped[DesignJobStatus] = mapped_column(SQLEnum(DesignJobStatus), default=DesignJobStatus.PENDING)