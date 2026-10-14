#!/usr/bin/env bash
# Copy the full, tracked Aldine fork into the website repository, without its .git history.
set -euo pipefail
cd "$(dirname "$0")/.."
tmp="$(mktemp -d)"
trap 'rm -rf "$tmp"' EXIT
git clone --depth 1 --single-branch --branch main https://github.com/EverflowCN/aldine.git "$tmp/aldine"
mkdir -p latex/aldine
rsync -a --delete --exclude='.git' "$tmp/aldine/" latex/aldine/
git -C "$tmp/aldine" rev-parse HEAD > latex/.aldine-source-rev
echo "Synced Aldine fork $(cat latex/.aldine-source-rev)"
