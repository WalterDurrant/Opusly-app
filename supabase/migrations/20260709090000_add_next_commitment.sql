/*
  # Add next-commitment fields to user_profile

  The Smart Session Planner needs somewhere to store the user's next
  calendar-style commitment (title + time) so "leave by" calculations
  are based on real, user-entered data instead of a hardcoded mock.

  This is a lightweight, no-cost alternative to a full calendar OAuth
  integration (Google/Outlook) — the user sets it manually from the
  planner screen, and it persists across sessions.
*/

ALTER TABLE user_profile
  ADD COLUMN IF NOT EXISTS next_commitment_title text,
  ADD COLUMN IF NOT EXISTS next_commitment_time text;
