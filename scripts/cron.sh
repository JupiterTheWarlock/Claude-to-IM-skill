#!/usr/bin/env bash
# Cron task management CLI

set -e

SKILL_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
CTI_HOME="${CTI_HOME:-$HOME/.claude-to-im}"
CRON_FILE="$CTI_HOME/cron.json"
LOG_FILE="$CTI_HOME/logs/cron.log"

# Ensure directory exists
mkdir -p "$CTI_HOME/logs"

cmd="${1:-list}"
shift || true

case "$cmd" in
  list|ls)
    if [[ -f "$CRON_FILE" ]]; then
      cat "$CRON_FILE" | jq -r '.tasks[] | "\(.id)\t\(.schedule)\t\(.enabled)\t\(.message[:50])..."'
    else
      echo "No cron tasks configured"
    fi
    ;;

  add)
    echo "Adding cron task..."
    echo "Usage: cron.sh add <schedule> <message> [channels]"
    echo "  schedule: crontab expression (e.g. '0 9 * * *' for daily at 9am)"
    echo "  message: prompt to send to agent"
    echo "  channels: comma-separated list (e.g. 'discord:123,telegram:456')"
    ;;

  remove|rm)
    if [[ -z "$1" ]]; then
      echo "Usage: cron.sh remove <task-id>"
      exit 1
    fi
    if [[ -f "$CRON_FILE" ]]; then
      tmp=$(mktemp)
      jq ".tasks = [.tasks[] | select(.id != \"$1\")]" "$CRON_FILE" > "$tmp"
      mv "$tmp" "$CRON_FILE"
      echo "Removed task $1"
    else
      echo "No cron tasks configured"
    fi
    ;;

  enable)
    if [[ -z "$1" ]]; then
      echo "Usage: cron.sh enable <task-id>"
      exit 1
    fi
    if [[ -f "$CRON_FILE" ]]; then
      tmp=$(mktemp)
      jq "(.tasks[] | select(.id == \"$1\") | .enabled) = true" "$CRON_FILE" > "$tmp"
      mv "$tmp" "$CRON_FILE"
      echo "Enabled task $1"
    else
      echo "No cron tasks configured"
    fi
    ;;

  disable)
    if [[ -z "$1" ]]; then
      echo "Usage: cron.sh disable <task-id>"
      exit 1
    fi
    if [[ -f "$CRON_FILE" ]]; then
      tmp=$(mktemp)
      jq "(.tasks[] | select(.id == \"$1\") | .enabled) = false" "$CRON_FILE" > "$tmp"
      mv "$tmp" "$CRON_FILE"
      echo "Disabled task $1"
    else
      echo "No cron tasks configured"
    fi
    ;;

  logs)
    lines="${1:-50}"
    if [[ -f "$LOG_FILE" ]]; then
      tail -n "$lines" "$LOG_FILE"
    else
      echo "No cron logs yet"
    fi
    ;;

  status)
    if [[ -f "$CRON_FILE" ]]; then
      echo "Cron tasks:"
      jq '.tasks | length' "$CRON_FILE"
      echo ""
      jq -r '.tasks[] | "\(.id)\n  Schedule: \(.schedule)\n  Enabled: \(.enabled)\n  Last run: \(.lastRunAt // "never")\n  Last result: \(.lastResult // "N/A")"' "$CRON_FILE"
    else
      echo "No cron tasks configured"
    fi
    ;;

  edit)
    if [[ -z "$EDITOR" ]]; then
      EDITOR="nano"
    fi
    if [[ ! -f "$CRON_FILE" ]]; then
      echo '{"tasks": []}' > "$CRON_FILE"
    fi
    $EDITOR "$CRON_FILE"
    ;;

  *)
    echo "Usage: cron.sh <command> [args]"
    echo ""
    echo "Commands:"
    echo "  list              List all cron tasks"
    echo "  remove <id>       Remove a task"
    echo "  enable <id>       Enable a task"
    echo "  disable <id>      Disable a task"
    echo "  logs [n]          Show last n log lines (default 50)"
    echo "  status            Show task status"
    echo "  edit              Open cron.json in editor"
    ;;
esac
