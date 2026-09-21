#!/usr/bin/env bash
# Build package/dist and publish it as an npm-shaped tree on the orphan `dist` branch.
#   v<version>         -> dist commit (served by jsDelivr: cdn.jsdelivr.net/gh/<repo>@v<version>/index.mjs)
#   source/v<version>  -> source commit it was built from
# Usage: scripts/release-dist.sh          prepare locally, print the push command
#        scripts/release-dist.sh --push   also push (IRREVERSIBLE: CDNs cache tags forever)
set -euo pipefail

REMOTE=origin
REPO=jaras-org/vanilla-calendar-pro
SRC_BRANCH=hijri
MODE=${1:-}
TRAILER='Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>'

die() {
  echo "release-dist: $*" >&2
  exit 1
}

cd "$(git rev-parse --show-toplevel)"

VERSION=$(node -p "require('./package/public/package.json').version")
TAG="v$VERSION"
SRC_TAG="source/$TAG"

[[ $VERSION =~ ^[0-9]+\.[0-9]+\.[0-9]+-hijri\.[0-9]+$ ]] || die "version '$VERSION' is not X.Y.Z-hijri.N"
[[ $(git branch --show-current) == "$SRC_BRANCH" ]] || die "check out $SRC_BRANCH"
[[ -z $(git status --porcelain) ]] || die "working tree not clean"
git fetch --no-tags "$REMOTE" "+refs/heads/$SRC_BRANCH:refs/remotes/$REMOTE/$SRC_BRANCH"
[[ $(git rev-parse HEAD) == $(git rev-parse "$REMOTE/$SRC_BRANCH") ]] || die "HEAD != $REMOTE/$SRC_BRANCH (merge/push first)"
if git ls-remote --exit-code --tags "$REMOTE" "refs/tags/$TAG" >/dev/null; then die "$TAG already exists on $REMOTE: bump the version"; fi
if git rev-parse -q --verify "refs/tags/$TAG" >/dev/null; then die "local tag $TAG exists (git tag -d it if it was never pushed)"; fi

SRC_SHA=$(git rev-parse HEAD)
CI=$(gh run list -R "$REPO" -w ci.yml -c "$SRC_SHA" --json conclusion -q '[.[] | select(.conclusion == "success")] | length')
[[ ${CI:-0} -ge 1 ]] || die "no successful ci.yml run for $SRC_SHA"

yarn install --frozen-lockfile
yarn package:build

D=package/dist
for f in package.json README.md LICENSE index.mjs index.js index.d.ts types.d.ts styles/index.css styles/layout.css utils/index.mjs utils/index.js; do
  [[ -s $D/$f ]] || die "missing $D/$f"
done
[[ $(node -p "require('./$D/package.json').version") == "$VERSION" ]] || die "dist package.json version mismatch"
head -c 300 "$D/index.mjs" | grep -qF "v$VERSION" || die "banner lacks v$VERSION"
[[ $(wc -l <"$D/index.mjs") -le 3 ]] || die "index.mjs is not minified (helpers.js swallows terser errors)"
node -e "const s=require('fs').readFileSync('$D/index.mjs','utf8');process.exit(/\bimport\s*[\"'{*(]|\bfrom\s*[\"']/.test(s)?1:0)" ||
  die "index.mjs is not self-contained (it has imports)"
grep -q islamic-umalqura "$D/index.mjs" && grep -q getDateFromCalendar "$D/utils/index.mjs" && grep -q CalendarSystem "$D/types.d.ts" ||
  die "dist lacks the Hijri feature"
grep -qF "@$TAG/" "$D/README.md" || die "README.md does not point at $TAG"

WT="$(mktemp -d)/dist"
trap 'git worktree remove --force "$WT" 2>/dev/null || true' EXIT
if git ls-remote --exit-code --heads "$REMOTE" dist >/dev/null; then
  git fetch --no-tags "$REMOTE" "+refs/heads/dist:refs/remotes/$REMOTE/dist"
  git worktree add -B dist "$WT" "$REMOTE/dist"
else
  git worktree add --orphan -b dist "$WT" # first release only (git >= 2.42)
fi
find "$WT" -mindepth 1 -maxdepth 1 ! -name .git -exec rm -rf {} +
cp -R "$D/." "$WT/"
rm -f "$WT/package.zip"
git -C "$WT" add -A
git -C "$WT" commit -q -m "dist: $TAG" -m "Built from https://github.com/$REPO/commit/$SRC_SHA ($SRC_BRANCH) with node $(node -v), yarn $(yarn -v)." -m "$TRAILER"
DIST_SHA=$(git -C "$WT" rev-parse HEAD)
git worktree remove "$WT"
trap - EXIT

git tag -a "$TAG" "$DIST_SHA" -m "vanilla-calendar-pro $VERSION (jaras-org Hijri fork)" -m "Source: https://github.com/$REPO/commit/$SRC_SHA"
git tag -a "$SRC_TAG" "$SRC_SHA" -m "Source of $TAG (dist commit $DIST_SHA)"

echo "Prepared $TAG -> $DIST_SHA (source $SRC_SHA):"
git ls-tree -r --name-only "$TAG"
PUSH=(git push --atomic "$REMOTE" refs/heads/dist:refs/heads/dist "refs/tags/$TAG" "refs/tags/$SRC_TAG")
if [[ $MODE == --push ]]; then
  "${PUSH[@]}"
else
  printf 'Review, then run:\n  %s\n' "${PUSH[*]}"
fi
