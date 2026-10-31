#!/usr/bin/env bash
# Put each built live page (dist/<branch>/) on its live branch and push it.
#
#   node deploy/build.mjs && deploy/push-live-branches.sh [live-mam-en …]
#
# A live branch (live-mam-en, live-mam-th, live-mam-au) holds exactly the
# files of that page's folder on the server: one commit per deploy, naming
# the commit it was built from. Never edit a live branch by hand — change the
# source, build, and push again. LIVE_COMMIT_TRAILER, if set, is appended to
# each commit message.
set -euo pipefail
cd "$(dirname "$0")/.."

if [ "$#" -gt 0 ]; then branches=("$@"); else branches=(live-mam-en live-mam-th live-mam-au); fi
source_rev="$(git rev-parse --short HEAD)"
source_ref="$(git rev-parse --abbrev-ref HEAD)"
[ -z "$(git status --porcelain)" ] || { echo "commit your changes first: live branches must name a real source commit" >&2; exit 1; }

for branch in "${branches[@]}"; do
  dir="dist/$branch"
  [ -d "$dir" ] || { echo "no $dir: run node deploy/build.mjs first" >&2; exit 1; }
  build="$(node -p "require('./dist/$branch.json').build")"
  url="$(node -p "require('./dist/$branch.json').url")"
  case "$build" in "$source_rev "*) ;; *) echo "$dir was built from another commit ($build); build again" >&2; exit 1 ;; esac

  work="$(mktemp -d)"
  if git ls-remote --exit-code --heads origin "$branch" >/dev/null 2>&1; then
    git fetch -q origin "$branch"
    git worktree add -q --detach "$work" FETCH_HEAD
  else
    git worktree add -q --detach "$work"
    git -C "$work" checkout -q --orphan "$branch"
  fi
  find "$work" -mindepth 1 -maxdepth 1 ! -name .git -exec rm -rf {} +
  cp -a "$dir"/. "$work"/
  git -C "$work" add -A
  if git -C "$work" diff --cached --quiet; then
    echo "$branch: unchanged"
  else
    message="Live: $url — mam-th-quiz $build"$'\n\n'"Built by deploy/build.mjs from $source_rev ($source_ref)."
    [ -z "${LIVE_COMMIT_TRAILER:-}" ] || message+=$'\n\n'"$LIVE_COMMIT_TRAILER"
    git -C "$work" commit -q -m "$message"
    git -C "$work" push -q origin "HEAD:refs/heads/$branch"
    echo "$branch: pushed $(git -C "$work" rev-parse --short HEAD)"
  fi
  git worktree remove --force "$work"
done
