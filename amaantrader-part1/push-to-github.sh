#!/usr/bin/env bash
set -euo pipefail
git rev-parse --is-inside-work-tree >/dev/null 2>&1 || { echo "Run inside your Git repository." >&2; exit 1; }
BRANCH="$(git branch --show-current)"
[[ -n "$BRANCH" ]] || { echo "Detached HEAD; checkout your branch first." >&2; exit 1; }
REMOTE="$(git config --get "branch.${BRANCH}.remote" || true)"
REMOTE="${REMOTE:-origin}"
echo "Branch: $BRANCH | Remote: $REMOTE"
git status --short
git add -A
git diff --cached --stat
read -r -p "Commit and push ALL staged changes to $REMOTE/$BRANCH? [y/N] " ANSWER
case "$ANSWER" in y|Y|yes|YES) ;; *) echo "Cancelled; staged changes remain staged."; exit 0;; esac
git diff --cached --quiet && { echo "No staged changes."; exit 0; }
read -r -p "Commit message [AmaanTrader Part 1 updates]: " MESSAGE
MESSAGE="${MESSAGE:-AmaanTrader Part 1 updates}"
git commit -m "$MESSAGE"
git push "$REMOTE" "HEAD:refs/heads/$BRANCH"
echo "Push complete. GitHub Pages updates only if its deployment workflow publishes this branch."
