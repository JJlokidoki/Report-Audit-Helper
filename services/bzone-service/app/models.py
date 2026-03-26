from datetime import datetime

from sqlalchemy import Column, Integer, String, Text, Boolean, DateTime, func

from app.database import Base


class BZoneReport(Base):
    __tablename__ = "bzone_reports"

    id = Column(Integer, primary_key=True)  # ID from BI.ZONE platform
    name = Column(String, nullable=False)
    assignee = Column(String, nullable=True)
    current_stage_id = Column(Integer, nullable=False)
    current_stage_tag = Column(String, nullable=True)
    company = Column(String, nullable=False)
    company_name = Column(String, nullable=True)
    # Fields from API
    critical_type = Column(String, nullable=True)  # cr/hg/md/lw/in
    cvss = Column(String, nullable=True)
    description = Column(Text, nullable=True)
    researcher = Column(String, nullable=True)
    bounty = Column(Integer, default=0)
    creation_date = Column(DateTime, nullable=True)
    modification_date = Column(DateTime, nullable=True)
    # AI fields
    cwe_id = Column(String, nullable=True)
    cwe_name = Column(String, nullable=True)
    is_duplicate = Column(Boolean, default=False)
    duplicate_of = Column(Integer, nullable=True)
    ai_notes = Column(Text, nullable=True)
    # Meta
    synced_at = Column(DateTime, default=func.now())
    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())


class SyncLog(Base):
    __tablename__ = "sync_log"

    id = Column(Integer, primary_key=True, autoincrement=True)
    started_at = Column(DateTime, default=func.now())
    finished_at = Column(DateTime, nullable=True)
    status = Column(String, nullable=False)  # running, success, failed
    total_fetched = Column(Integer, default=0)
    new_reports = Column(Integer, default=0)
    updated_reports = Column(Integer, default=0)
    error = Column(Text, nullable=True)
