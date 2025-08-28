#!/usr/bin/env bash
# Auto-Commit Script for 2 Weeks (Full Mode)

BRANCH="main"
START_HOUR=8
END_HOUR=23
LOGFILE="auto_commit_2weeks.log"
HEARTBEAT_FILE="heartbeat.log"
GENERIC_MESSAGES=(
  "Update code" "Fix minor bug" "Improve performance"
  "Refactor functions" "Update documentation" "Fix typo"
  "Code cleanup" "Small changes" "Update README" "Minor adjustments"
)
PREFIXES=( "chore:" "fix:" "docs:" "refactor:" "perf:" "style:" "wip:" )

MIN_SLEEP=1200    # 20 minutes
EXTRA_SLEEP=2400  # + 40 minutes random offset

pick_random_file() {
  mapfile -t _files < <(git ls-files 2>/dev/null)
  if (( ${#_files[@]} == 0 )); then
    echo ""
  else
    echo "${_files[RANDOM % ${#_files[@]}]}"
  fi
}

touch "$LOGFILE"

# -------- 2-Week Commit Plan --------
PLAN_FILE="/tmp/git_2week_plan_${USER}.txt"

if [ ! -f "$PLAN_FILE" ]; then
    TOTAL_COMMITS=$((5 + RANDOM % 16))   # 5–20 total commits
    declare -a PLAN
    QUIET_DAYS=()
    while (( ${#QUIET_DAYS[@]} < 3 )); do
        DAY=$((RANDOM % 14))
        if [[ ! " ${QUIET_DAYS[@]} " =~ " $DAY " ]]; then
            QUIET_DAYS+=($DAY)
        fi
    done
    REMAIN=$TOTAL_COMMITS
    for i in {0..13}; do
        if [[ " ${QUIET_DAYS[@]} " =~ " $i " ]]; then
            PLAN[$i]=0
        else
            if (( REMAIN > 0 )); then
                MAX_PER_DAY=$(( (REMAIN>3)?3:REMAIN ))
                PLAN[$i]=$((1 + RANDOM % MAX_PER_DAY))
                REMAIN=$((REMAIN - PLAN[$i]))
            else
                PLAN[$i]=0
            fi
        fi
    done
    printf "%s\n" "${PLAN[@]}" > "$PLAN_FILE"
    echo "2-Week plan created: $(cat $PLAN_FILE)" >> "$LOGFILE"
fi

# Load plan
mapfile -t PLAN < "$PLAN_FILE"

# -------- Main Loop --------
while true; do
    TODAY_INDEX=$(( $(date +%j) % 14 )) # index 0–13
    ALLOWED=${PLAN[$TODAY_INDEX]}
    DONE_FILE="/tmp/git_done_${USER}_$(date +%Y-%m-%d)"
    if [ ! -f "$DONE_FILE" ]; then echo 0 > "$DONE_FILE"; fi
    DONE=$(cat "$DONE_FILE")

    HOUR=$((10#$(TZ="Asia/Kolkata" date +%H)))
    TIME_NOW=$(TZ="Asia/Kolkata" date +"%Y-%m-%d %H:%M:%S")
    TODAY=$(date +%Y-%m-%d)

    if (( HOUR < START_HOUR || HOUR > END_HOUR )); then
        echo "[$TIME_NOW] Outside active hours. Sleeping 30 min." >> "$LOGFILE"
        sleep 1800
        continue
    fi

    if (( DONE >= ALLOWED )); then
        # All commits done today — sleep until 8 AM next day
        NOW=$(date +%s)
        TOMORROW=$(date -d "tomorrow 08:00" +%s)
        SLEEP_TIME=$(( TOMORROW - NOW ))
        echo "[$TIME_NOW] Reached today's allowed commits ($DONE/$ALLOWED). Sleeping until 8 AM tomorrow (~$SLEEP_TIME sec)." >> "$LOGFILE"
    else
        CHANGES=$(git status --porcelain 2>/dev/null)
        if [ -n "$CHANGES" ]; then
            git add -A .
            FILE=$(pick_random_file)
        else
            echo "heartbeat: $TODAY $RANDOM" > "$HEARTBEAT_FILE"
            git add "$HEARTBEAT_FILE"
            FILE="$HEARTBEAT_FILE"
        fi

        MSG="${GENERIC_MESSAGES[$RANDOM % ${#GENERIC_MESSAGES[@]}]}"
        if [ -n "$FILE" ] && (( RANDOM % 2 == 0 )); then
            MSG="$MSG in $FILE"
        fi
        if (( RANDOM % 3 == 0 )); then
            PREF=${PREFIXES[$RANDOM % ${#PREFIXES[@]}]}
            MSG="$PREF $MSG"
        fi
        FINAL_MSG="$MSG ($TIME_NOW IST)"

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

        # Spread remaining commits evenly across active hours
        REMAIN_HOURS=$((END_HOUR - HOUR + 1))
        REMAIN_COMMITS=$(( ALLOWED - DONE ))
        if (( REMAIN_COMMITS > 0 )); then
            SLEEP_TIME=$(( (REMAIN_HOURS*3600 / REMAIN_COMMITS) + RANDOM % 600 ))
        else
            NOW=$(date +%s)
            TOMORROW=$(date -d "tomorrow 08:00" +%s)
            SLEEP_TIME=$(( TOMORROW - NOW ))
            echo "[$TIME_NOW] All commits done. Sleeping until 8 AM tomorrow (~$SLEEP_TIME sec)." >> "$LOGFILE"
        fi
    fi

    echo "[$TIME_NOW] Sleeping $SLEEP_TIME sec" >> "$LOGFILE"
    sleep "$SLEEP_TIME"
done
