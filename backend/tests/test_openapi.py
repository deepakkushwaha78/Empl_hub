from app.main import app


def test_admin_report_and_attendance_responses_have_openapi_schemas() -> None:
    schema = app.openapi()
    report = schema["paths"]["/api/v1/admin/reports"]["get"]["responses"]["200"]
    attendance = schema["paths"]["/api/v1/attendance/me"]["get"]["responses"]["200"]
    assert report["content"]["application/json"]["schema"]["$ref"].endswith("/ReportOut")
    assert "$ref" in attendance["content"]["application/json"]["schema"]
