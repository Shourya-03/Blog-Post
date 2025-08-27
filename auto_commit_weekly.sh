#!/usr/bin/env bash
# Auto-Commit Script with Weekly Distribution

BRANCH="main"
START_HOUR=8
END_HOUR=23
LOGFILE="auto_commit_weekly.log"
HEARTBEAT_FILE="heartbeat.log"
GENERIC_MESSAGES=(
  "Update code" "Fix minor bug" "Improve performance"
  "Refactor functions" "Update documentation" "Fix typo"
  "Code cleanup" "Small changes" "Update README" "Minor adjustments"
)
PREFIXES=( "chore:" "fix:" "docs:" "refactor:" "perf:" "style:" "wip:" )

# Active hours for commits
ACTIVE_HOURS=($(seq $START_HOUR $END_HOUR))

# -------- TEST MODE --------
if [ "$1" = "test" ] || [ "$TEST_MODE" = "1" ]; then
  MIN_SLEEP=5
  EXTRA_SLEEP=10
  echo "RUNNING IN TEST MODE" >> "$LOGFILE"
else
  MIN_SLEEP=1200    # 20 min
  EXTRA_SLEEP=2400  # + 40 min
fi

pick_random_file() {
  mapfile -t _files < <(git ls-files 2>/dev/null)
  if (( ${#_files[@]} == 0 )); then
    echo ""
  else
    echo "${_files[RANDOM % ${#_files[@]}]}"
  fi
}

touch "$LOGFILE"

# -------- Weekly Commit Plan --------
# Each week we generate a commit plan: how many commits each day
WEEK_START=$(date -d "monday" +%Y-%m-%d 2>/dev/null || date +%Y-%m-%d)
PLAN_FILE="/tmp/git_weekly_plan_${USER}_$WEEK_START"

if [ ! -f "$PLAN_FILE" ]; then
    # Total weekly commits between 5–15
    TOTAL_COMMITS=$((5 + RANDOM % 11))   # 5–15
    # At least 1 quiet day in 2 weeks (we can randomize this later)
    QUIET_DAY=$((RANDOM % 14))           # day index 0–13
    # Generate daily commit counts
    declare -a DAILY_COMMITS
    REMAIN=$TOTAL_COMMITS
    for i in {0..6}; do
        if (( i == QUIET_DAY )); then
            DAILY_COMMITS[$i]=0
        else
            # distribute remaining commits evenly
            if (( REMAIN > 0 )); then
                # min 1, max remaining
                MAX_PER_DAY=$(( (REMAIN>3)?3:REMAIN ))
                DAILY_COMMITS[$i]=$((1 + RANDOM % MAX_PER_DAY))
                REMAIN=$((REMAIN - DAILY_COMMITS[$i]))
            else
                DAILY_COMMITS[$i]=0
            fi
        fi
    done
    # Save plan to file
    printf "%s\n" "${DAILY_COMMITS[@]}" > "$PLAN_FILE"
    echo "Weekly plan created: $(cat $PLAN_FILE)" >> "$LOGFILE"
fi

# Load weekly plan
mapfile -t DAILY_COMMITS < "$PLAN_FILE"

# Track daily progress
TODAY_INDEX=$(date +%u)   # 1=Mon
ALLOWED=${DAILY_COMMITS[$((TODAY_INDEX-1))]}
DONE_FILE="/tmp/git_daily_done_${USER}_$(date +%Y-%m-%d)"
if [ ! -f "$DONE_FILE" ]; then echo 0 > "$DONE_FILE"; fi
DONE=$(cat "$DONE_FILE")

# -------- Main Loop --------
while true; do
    HOUR=$((10#$(TZ="Asia/Kolkata" date +%H)))
    TIME_NOW=$(TZ="Asia/Kolkata" date +"%Y-%m-%d %H:%M:%S")
    TODAY=$(date +%Y-%m-%d)

    if (( HOUR < START_HOUR || HOUR > END_HOUR )); then
        echo "[$TIME_NOW] Outside active hours. Sleeping 30 min." >> "$LOGFILE"
        sleep 1800
        continue
    fi

    if (( DONE >= ALLOWED )); then
        echo "[$TIME_NOW] Reached today's allowed commits ($DONE/$ALLOWED)." >> "$LOGFILE"
    else
        # pick a file or heartbeat
        CHANGES=$(git status --porcelain 2>/dev/null)
        if [ -n "$CHANGES" ]; then
            git add -A .
            FILE=$(pick_random_file)
        else
            echo "heartbeat: $TIME_NOW $RANDOM" > "$HEARTBEAT_FILE"
            git add "$HEARTBEAT_FILE"
            FILE="$HEARTBEAT_FILE"
        fi

        # Compose commit message
        MSG="${GENERIC_MESSAGES[$RANDOM % ${#GENERIC_MESSAGES[@]}]}"
        if [ -n "$FILE" ] && (( RANDOM % 2 == 0 )); then
            MSG="$MSG in $FILE"
        fi
        if (( RANDOM % 3 == 0 )); then
            PREF=${PREFIXES[$RANDOM % ${#PREFIXES[@]}]}
            MSG="$PREF $MSG"
        fi
        FINAL_MSG="$MSG ($TIME_NOW IST)"

        # Commit & push
        if git diff --cached --quiet; then
            echo "[$TIME_NOW] Nothing staged — skipping commit." >> "$LOGFILE"
        else
            echo "[$TIME_NOW] COMMIT: $FINAL_MSG" >> "$LOGFILE"
            git commit -m "$FINAL_MSG" >> "$LOGFILE" 2>&1 || echo "[$TIME_NOW] commit failed" >> "$LOGFILE"
            git push origin "$BRANCH" >> "$LOGFILE" 2>&1 || echo "[$TIME_NOW] push failed" >> "$LOGFILE"
            DONE=$((DONE + 1))
            echo "$DONE" > "$DONE_FILE"
            echo "[$TIME_NOW] Done $DONE / $ALLOWED for $TODAY" >> "$LOGFILE"
        fi
    fi

    # Sleep randomized interval (evenly spread across day)
    REMAIN_HOURS=$((END_HOUR - START_HOUR + 1))
    if (( ALLOWED > 0 )); then
        SLEEP_TIME=$(( (REMAIN_HOURS*3600 / ALLOWED) + RANDOM % 600 ))  # ~even spread + randomness
    else
        SLEEP_TIME=$((MIN_SLEEP + RANDOM % EXTRA_SLEEP))
    fi
    echo "[$TIME_NOW] Sleeping $SLEEP_TIME sec" >> "$LOGFILE"
    sleep "$SLEEP_TIME"
done
