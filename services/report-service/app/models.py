from datetime import date, datetime

from sqlalchemy import (
    Boolean,
    Column,
    Date,
    DateTime,
    Float,
    ForeignKey,
    Integer,
    String,
    Table,
    Text,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base

# Association tables
system_info_executors = Table(
    "system_info_executors",
    Base.metadata,
    Column("system_info_id", Integer, ForeignKey("system_info.id"), primary_key=True),
    Column("executor_id", Integer, ForeignKey("executor.id"), primary_key=True),
)

system_info_software = Table(
    "system_info_software",
    Base.metadata,
    Column("system_info_id", Integer, ForeignKey("system_info.id"), primary_key=True),
    Column("software_id", Integer, ForeignKey("software.id"), primary_key=True),
)


class Report(Base):
    __tablename__ = "report"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(255))
    report_type: Mapped[str] = mapped_column(String(50))
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), onupdate=func.now())

    system_info: Mapped["SystemInfo | None"] = relationship(
        "SystemInfo", uselist=False, back_populates="report", cascade="all, delete-orphan"
    )
    vulnerabilities: Mapped[list["Vulnerability"]] = relationship(
        "Vulnerability", back_populates="report", cascade="all, delete-orphan"
    )
    security_checks: Mapped[list["SecurityCheck"]] = relationship(
        "SecurityCheck", back_populates="report", cascade="all, delete-orphan"
    )
    test_runs: Mapped[list["TestRun"]] = relationship(
        "TestRun", back_populates="report", cascade="all, delete-orphan"
    )


class SystemInfo(Base):
    __tablename__ = "system_info"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    report_id: Mapped[int] = mapped_column(Integer, ForeignKey("report.id"), unique=True)
    asName: Mapped[str | None] = mapped_column(String(255), nullable=True)
    keId: Mapped[str | None] = mapped_column(String(255), nullable=True)
    url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    dateStart: Mapped[date | None] = mapped_column(Date, nullable=True)
    dateEnd: Mapped[date | None] = mapped_column(Date, nullable=True)
    segment: Mapped[str | None] = mapped_column(String(255), nullable=True)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    goal: Mapped[str | None] = mapped_column(String(500), nullable=True)
    qualificationLevel: Mapped[str | None] = mapped_column(String(255), nullable=True)
    accessLevel: Mapped[str | None] = mapped_column(String(255), nullable=True)
    knowledgeLevel: Mapped[str | None] = mapped_column(String(255), nullable=True)
    testConditions: Mapped[str | None] = mapped_column(Text, nullable=True)

    report: Mapped["Report"] = relationship("Report", back_populates="system_info")
    executors: Mapped[list["Executor"]] = relationship(
        "Executor", secondary=system_info_executors, back_populates="system_infos"
    )
    software: Mapped[list["Software"]] = relationship(
        "Software", secondary=system_info_software, back_populates="system_infos"
    )


class Executor(Base):
    __tablename__ = "executor"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(255))

    system_infos: Mapped[list["SystemInfo"]] = relationship(
        "SystemInfo", secondary=system_info_executors, back_populates="executors"
    )


class Software(Base):
    __tablename__ = "software"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(255))
    description: Mapped[str | None] = mapped_column(String(500), nullable=True)
    is_preset: Mapped[bool] = mapped_column(Boolean, default=False, server_default="0")

    system_infos: Mapped[list["SystemInfo"]] = relationship(
        "SystemInfo", secondary=system_info_software, back_populates="software"
    )


class Vulnerability(Base):
    __tablename__ = "vulnerability"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    report_id: Mapped[int] = mapped_column(Integer, ForeignKey("report.id"))
    bug_name: Mapped[str] = mapped_column(String(255))
    bug_criticality: Mapped[str] = mapped_column(String(50), default="info")
    bug_description: Mapped[str | None] = mapped_column(Text, nullable=True)
    cvss_score: Mapped[float | None] = mapped_column(Float, nullable=True)
    cvss_vector: Mapped[str | None] = mapped_column(String(255), nullable=True)
    reproduction_steps: Mapped[str | None] = mapped_column(Text, nullable=True)
    remediation: Mapped[str | None] = mapped_column(Text, nullable=True)
    automation_level: Mapped[str] = mapped_column(String(50), default="no")
    sort_order: Mapped[int] = mapped_column(Integer, default=0)

    report: Mapped["Report"] = relationship("Report", back_populates="vulnerabilities")
    auto_tests: Mapped[list["AutoTest"]] = relationship(
        "AutoTest", back_populates="vulnerability", cascade="all, delete-orphan"
    )
    retest_results: Mapped[list["RetestResult"]] = relationship(
        "RetestResult", back_populates="vulnerability", cascade="all, delete-orphan"
    )


class SecurityCheck(Base):
    __tablename__ = "security_check"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    report_id: Mapped[int] = mapped_column(Integer, ForeignKey("report.id"))
    checklist_type: Mapped[str] = mapped_column(String(100))
    check_id: Mapped[str] = mapped_column(String(100))
    category: Mapped[str] = mapped_column(String(255))
    name: Mapped[str] = mapped_column(String(500))
    short_description: Mapped[str | None] = mapped_column(Text, nullable=True)
    goal: Mapped[str | None] = mapped_column(Text, nullable=True)
    status: Mapped[str] = mapped_column(String(50), default="not_tested")
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)

    report: Mapped["Report"] = relationship("Report", back_populates="security_checks")


class AutoTest(Base):
    __tablename__ = "auto_test"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    vulnerability_id: Mapped[int] = mapped_column(Integer, ForeignKey("vulnerability.id"))
    name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    script_type: Mapped[str | None] = mapped_column(String(50), nullable=True)
    script_content: Mapped[str | None] = mapped_column(Text, nullable=True)

    vulnerability: Mapped["Vulnerability"] = relationship("Vulnerability", back_populates="auto_tests")


class TestRun(Base):
    __tablename__ = "test_run"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    report_id: Mapped[int] = mapped_column(Integer, ForeignKey("report.id"))
    status: Mapped[str] = mapped_column(String(50), default="pending")
    started_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    finished_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)

    report: Mapped["Report"] = relationship("Report", back_populates="test_runs")
    results: Mapped[list["TestRunResult"]] = relationship(
        "TestRunResult", back_populates="test_run", cascade="all, delete-orphan"
    )
    retest_results: Mapped[list["RetestResult"]] = relationship(
        "RetestResult", back_populates="test_run", cascade="all, delete-orphan"
    )


class TestRunResult(Base):
    __tablename__ = "test_run_result"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    test_run_id: Mapped[int] = mapped_column(Integer, ForeignKey("test_run.id"))
    auto_test_id: Mapped[int] = mapped_column(Integer, ForeignKey("auto_test.id"))
    passed: Mapped[bool] = mapped_column(Boolean, default=False)
    output: Mapped[str | None] = mapped_column(Text, nullable=True)

    test_run: Mapped["TestRun"] = relationship("TestRun", back_populates="results")


class RetestResult(Base):
    __tablename__ = "retest_result"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    test_run_id: Mapped[int] = mapped_column(Integer, ForeignKey("test_run.id"))
    vulnerability_id: Mapped[int] = mapped_column(Integer, ForeignKey("vulnerability.id"))
    status: Mapped[str] = mapped_column(String(50), default="not_tested")
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)

    test_run: Mapped["TestRun"] = relationship("TestRun", back_populates="retest_results")
    vulnerability: Mapped["Vulnerability"] = relationship("Vulnerability", back_populates="retest_results")
