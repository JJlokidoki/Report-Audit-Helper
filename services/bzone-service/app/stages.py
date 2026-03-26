STAGES: dict[int, tuple[str, str]] = {
    1: ("New", "new"),
    2: ("Informative", "informative"),
    3: ("Not a vulnerability", "not_applicable"),
    4: ("Duplicate", "duplicate"),
    5: ("Request more information", "need_info"),
    6: ("Information provided", "new_info"),
    7: ("Spam", "spam"),
    8: ("Closed by researcher", "self_closed"),
    9: ("Completed initial triage", "need_company_approve"),
    10: ("Vulnerability confirmed", "triaged"),
    11: ("Rechecking the vulnerability", "need_retest"),
    12: ("The vulnerability has been eliminated", "resolved"),
    13: ("The full disclosure of the report was requested", "request_disclosed"),
    14: ("Fully open report", "disclosed"),
    15: ("Partial disclosure of the report was requested", "request_partial_disclosed"),
    16: ("Partially open report", "partial_disclosed"),
    17: ("On verification by the administrator", "need_admin_approve"),
    18: ("Archive", "archive"),
}


def get_stage_tag(stage_id: int) -> str | None:
    entry = STAGES.get(stage_id)
    return entry[1] if entry else None


def get_stage_name(stage_id: int) -> str | None:
    entry = STAGES.get(stage_id)
    return entry[0] if entry else None
