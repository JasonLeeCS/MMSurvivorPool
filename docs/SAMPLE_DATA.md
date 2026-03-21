# Sample Seed Data

## Settings

```csv
key,value,description
season_year,2026,Current tournament year
timezone,America/Chicago,Primary pool timezone
default_lock_mode,first_tip,Locks at first game tip each day
sync_enabled,true,Whether NCAA sync is enabled
ncaa_provider,ncaa,Sync provider key
ncaa_scoreboard_base_url,https://data.ncaa.com/casablanca/scoreboard/basketball-men/d1,Official NCAA scoreboard feed base
last_sync_status,idle,Current sync status
last_sync_message,Waiting for first run,Current sync note
last_sync_at,,Last sync timestamp ISO
admin_passcode_salt,REPLACE_ME,Generated in Apps Script
admin_passcode_hash,REPLACE_ME,Generated in Apps Script
```

## Users

```csv
user_id,display_name,active,eliminated,buyback_count,notes,created_at,updated_at
u_jason,Jason,true,false,0,Commissioner sample,2026-03-17T10:00:00Z,2026-03-17T10:00:00Z
u_amy,Amy,true,false,1,Used one buy-back,2026-03-17T10:00:00Z,2026-03-19T13:10:00Z
u_marcus,Marcus,true,true,0,Eliminated day 2,2026-03-17T10:00:00Z,2026-03-20T02:05:00Z
```

## Teams

```csv
team_id,team_name,seed,region,alive,source_updated_at,manual_override
duke,Duke,1,East,true,2026-03-21T15:00:00Z,false
kansas,Kansas,4,Midwest,false,2026-03-21T15:00:00Z,false
houston,Houston,1,South,true,2026-03-21T15:00:00Z,false
ucla,UCLA,3,West,true,2026-03-21T15:00:00Z,true
```

## Games

```csv
game_id,date,tipoff_time,team1,team2,winner,round,status
g_20260321_1,2026-03-21,2026-03-21T16:15:00Z,Duke,UCLA,,Round of 32,scheduled
g_20260321_2,2026-03-21,2026-03-21T18:40:00Z,Houston,Kansas,Houston,Round of 32,final
```

## Picks

```csv
pick_id,date,user_id,team_id,team_name,submitted_at,updated_at,submitted_by,lock_snapshot,result,overridden
p_1,2026-03-20,u_jason,duke,Duke,2026-03-20T14:00:00Z,2026-03-20T14:00:00Z,user,2026-03-20T16:15:00Z,won,false
p_2,2026-03-20,u_amy,houston,Houston,2026-03-20T14:02:00Z,2026-03-20T14:10:00Z,user,2026-03-20T16:15:00Z,won,false
p_3,2026-03-20,u_marcus,kansas,Kansas,2026-03-20T14:20:00Z,2026-03-20T14:20:00Z,user,2026-03-20T16:15:00Z,lost,false
```

## Buybacks

```csv
user_id,date,count_change,reason,entered_by
u_amy,2026-03-21,1,Second life purchase,admin
```
