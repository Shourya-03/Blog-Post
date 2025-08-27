#!/usr/bin/env bash
# Fast test version: weekly auto-commit

BRANCH="main"
LOGFILE="auto_commit_weekly_test.log"
HEARTBEAT_FILE="heartbeat.log"
GENERIC_MESSAGES=(
  "Update code" "Fix minor bug" "Improve performance"
  "Refactor functions" "Update documentation" "Fix typo"
  "Code cleanup" "Small changes" "Update README" "Minor adjustments"
)
PREFIXES=( "chore:" "fix:" "docs:" "refactor:" "perf:" "style:" "wip:" )

touch "$LOGFILE"

pick_random_file() {
  mapfile -t _files < <(git ls-files 2>/dev/null)
  if (( ${#_files[@]} == 0 )); then
    echo ""
  else
    echo "${_files[RANDOM % ${#_files[@]}]}"
  fi
}

# -------- Weekly Plan for Test --------
TOTAL_COMMITS=10      # Pick any number 5–15
DAILY_COMMITS=(2 2 1 2 1 1 1)  # Example: sum = 10, 1 quiet day
echo "Test weekly plan: ${DAILY_COMMITS[@]}" >> "$LOGFILE"

# -------- Test Loop: Generate all commits immediately --------
for DAY_INDEX in {0..6}; do
    ALLOWED=${DAILY_COMMITS[$DAY_INDEX]}
    DONE=0
    TODAY=$(date -d "+$DAY_INDEX days" +%Y-%m-%d 2>/dev/null || date -v+${DAY_INDEX}d +%Y-%m-%d)
    echo "=== $TODAY: allowed commits = $ALLOWED ===" >> "$LOGFILE"

    while (( DONE < ALLOWED )); do
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
        FINAL_MSG="$MSG ($TODAY IST)"

        if git diff --cached --quiet; then
            echo "[$TODAY] Nothing staged — skipping commit." >> "$LOGFILE"
        else
            echo "[$TODAY] COMMIT: $FINAL_MSG" >> "$LOGFILE"
            git commit -m "$FINAL_MSG" >> "$LOGFILE" 2>&1 || echo "[$TODAY] commit failed" >> "$LOGFILE"
            git push origin "$BRANCH" >> "$LOGFILE" 2>&1 || echo "[$TODAY] push failed" >> "$LOGFILE"
            DONE=$((DONE + 1))
            echo "[$TODAY] Done $DONE / $ALLOWED" >> "$LOGFILE"
        fi

        sleep 1  # fast test
    done
done

echo "=== TEST RUN COMPLETE ===" >> "$LOGFILE"
