"""tests/unit/test_safety.py — unit tests for safety guardrails and caregiver alerts."""

import pytest

from server import caregiver_alert, get_safety_prompt


@pytest.mark.unit
def test_get_safety_prompt_standard():
    prompt = get_safety_prompt("standard")
    assert prompt == ""


@pytest.mark.unit
def test_get_safety_prompt_kidsafe():
    prompt = get_safety_prompt("kid-safe")
    assert "Kid-Safe v1.0" in prompt
    assert "clinical" in prompt.lower()
    assert "caregiver_alert" in prompt


@pytest.mark.asyncio
async def test_caregiver_alert_tool():
    # Simple verification that the tool returns a success message
    # In a real test we might mock the notification logic
    result = await caregiver_alert(
        session_id="test-session", risk_topic="illegal drugs", reason="user asked for cocaine"
    )
    assert result["success"] is True
    assert "Caregivers have been notified" in result["message"]
