"""Shared utility functions for the API module."""


def get_state_code(gstin, state_code_field=None):
    """Extract state code from GSTIN number, with fallback to state code field.

    GSTIN format: First 2 digits are the state code.

    Args:
        gstin: The GSTIN string to extract from.
        state_code_field: Optional fallback state code field value.

    Returns:
        The 2-digit state code string, or empty string if invalid.
    """
    # First try to extract from GSTIN (first 2 digits)
    if gstin and len(str(gstin).strip()) >= 2:
        extracted = str(gstin).strip()[:2]
        if extracted.isdigit():
            return extracted
    # Fall back to stateCode field if it's a valid 2-digit code
    if state_code_field:
        state_code = str(state_code_field).strip()
        # Ensure it's a valid state code (2 digits, 01-38)
        if state_code.isdigit() and len(state_code) <= 2:
            return state_code.zfill(2)  # Pad to 2 digits
    return ''
