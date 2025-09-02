#!/usr/bin/env bash
# Auto-Commit Script for 2 Weeks (Full Mode) — System-Time-Aligned

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
PLAN_START_FILE="/tmp/git_2week_start_${USER}.txt"

# Record the first day of plan
if [ ! -f "$PLAN_START_FILE" ]; then
    date +%j > "$PLAN_START_FILE"  # store day-of-year of first run
fi
PLAN_START=$(cat "$PLAN_START_FILE")

if [ ! -f "$PLAN_FILE" ]; then
    TOTAL_COMMITS=$((15 + RANDOM % 16))   # 15–30 total commits
    declare -a PLAN
    QUIET_DAYS=()

    # pick 3 non-consecutive quiet days
    while (( ${#QUIET_DAYS[@]} < 3 )); do
        DAY=$((RANDOM % 14))
        if [[ ! " ${QUIET_DAYS[@]} " =~ " $DAY " ]]; then
            SKIP=false
            for q in "${QUIET_DAYS[@]}"; do
                if (( DAY == q || DAY == q-1 || DAY == q+1 )); then
                    SKIP=true
                    break
                fi
            done
            if [ "$SKIP" = false ]; then
                QUIET_DAYS+=($DAY)
            fi
        fi
    done

    REMAIN=$TOTAL_COMMITS
    ACTIVE_DAYS=$((14 - ${#QUIET_DAYS[@]}))
    MIN_REQUIRED=$ACTIVE_DAYS
    REMAIN=$((REMAIN - MIN_REQUIRED))

    # Assign at least 1 commit per non-quiet day
    for i in {0..13}; do
        if [[ " ${QUIET_DAYS[@]} " =~ " $i " ]]; then
            PLAN[$i]=0
        else
            PLAN[$i]=1
        fi
    done

    # Distribute remaining commits randomly
    while (( REMAIN > 0 )); do
        DAY=$((RANDOM % 14))
        if [[ ! " ${QUIET_DAYS[@]} " =~ " $DAY " ]]; then
            if (( PLAN[$DAY] < 4 )); then
                PLAN[$DAY]=$((PLAN[$DAY] + 1))
                REMAIN=$((REMAIN - 1))
            fi
        fi
    done

    printf "%s\n" "${PLAN[@]}" > "$PLAN_FILE"
    echo "2-Week plan created: $(cat $PLAN_FILE)" >> "$LOGFILE"
    echo "Quiet days: ${QUIET_DAYS[*]}" >> "$LOGFILE"
fi

# Load plan
mapfile -t PLAN < "$PLAN_FILE"

# -------- Main Loop --------
while true; do
    # ----- System local time -----
    TODAY=$(date +%Y-%m-%d)
    TODAY_DOY=$(date +%j)
    TODAY_INDEX=$(( ( (TODAY_DOY - PLAN_START + 14) % 14 ) ))
    ALLOWED=${PLAN[$TODAY_INDEX]}
    DONE_FILE="/tmp/git_done_${USER}_${TODAY}"
    if [ ! -f "$DONE_FILE" ]; then echo 0 > "$DONE_FILE"; fi
    DONE=$(cat "$DONE_FILE")

    HOUR=$(date +%H)
    TIME_NOW=$(date +"%Y-%m-%d %H:%M:%S")

    # ----- Outside active hours -----
    if (( HOUR < START_HOUR || HOUR > END_HOUR )); then
        echo "[$TIME_NOW] Outside active hours. Sleeping 30 min." >> "$LOGFILE"
        sleep 1800
        continue
    fi

    # ----- Quiet day or all commits done -----
    if (( ALLOWED == 0 )); then
        echo "[$TIME_NOW] Quiet day — sleeping 1 hour." >> "$LOGFILE"
        SLEEP_TIME=3600
    elif (( DONE >= ALLOWED )); then
        # sleep until 8 AM next day
        HOUR_NOW=$(date +%H)
        MIN_NOW=$(date +%M)
        SEC_NOW=$(date +%S)
        SECONDS_NOW=$(( HOUR_NOW*3600 + MIN_NOW*60 + SEC_NOW ))
        SLEEP_TIME=$(( (24*3600 - SECONDS_NOW) + 8*3600 ))
        echo "[$TIME_NOW] Reached today's allowed commits ($DONE/$ALLOWED). Sleeping until 8 AM tomorrow (~$SLEEP_TIME sec)." >> "$LOGFILE"
    else
        # ----- Do commit -----
        CHANGES=$(git status --porcelain 2>/dev/null)
        if [ -n "$CHANGES" ]; then
            git add -A .
            FILE=$(pick_random_file)
        else
            echo "heartbeat: $TIME_NOW $RANDOM" > "$HEARTBEAT_FILE"
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
        FINAL_MSG="$MSG ($TIME_NOW)"

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

        # ----- Spread remaining commits evenly -----
        REMAIN_HOURS=$((END_HOUR - HOUR + 1))
        REMAIN_COMMITS=$(( ALLOWED - DONE ))
        if (( REMAIN_COMMITS > 0 )); then
            SLEEP_TIME=$(( (REMAIN_HOURS*3600 / REMAIN_COMMITS) + RANDOM % 600 ))
        else
            HOUR_NOW=$(date +%H)
            MIN_NOW=$(date +%M)
            SEC_NOW=$(date +%S)
            SECONDS_NOW=$(( HOUR_NOW*3600 + MIN_NOW*60 + SEC_NOW ))
            SLEEP_TIME=$(( (24*3600 - SECONDS_NOW) + 8*3600 ))
            echo "[$TIME_NOW] All commits done. Sleeping until 8 AM tomorrow (~$SLEEP_TIME sec)." >> "$LOGFILE"
        fi
    fi

    echo "[$TIME_NOW] Sleeping $SLEEP_TIME sec" >> "$LOGFILE"
    sleep "$SLEEP_TIME"
done
