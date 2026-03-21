# Google Sheet Schema

## Settings

Columns:

- `key`
- `value`
- `description`

Suggested rows:

- `season_year`
- `timezone`
- `default_lock_mode`
- `admin_passcode_salt`
- `admin_passcode_hash`
- `sync_enabled`
- `ncaa_provider`
- `ncaa_scoreboard_base_url`
- `last_sync_status`
- `last_sync_message`
- `last_sync_at`

## Users

Columns:

- `user_id`
- `display_name`
- `active`
- `eliminated`
- `buyback_count`
- `notes`
- `created_at`
- `updated_at`

## Picks

Columns:

- `pick_id`
- `date`
- `user_id`
- `team_id`
- `team_name`
- `submitted_at`
- `updated_at`
- `submitted_by`
- `lock_snapshot`
- `result`
- `overridden`

## Teams

Columns:

- `team_id`
- `team_name`
- `seed`
- `region`
- `alive`
- `source_updated_at`
- `manual_override`

## Games

Columns:

- `game_id`
- `date`
- `tipoff_time`
- `team1`
- `team2`
- `winner`
- `round`
- `status`

## Buybacks

Columns:

- `user_id`
- `date`
- `count_change`
- `reason`
- `entered_by`

## AdminMeta

Columns:

- `key`
- `value`
- `updated_at`

Suggested rows:

- `last_public_snapshot_at`
- `last_manual_lock_override`
- `last_csv_export_at`
