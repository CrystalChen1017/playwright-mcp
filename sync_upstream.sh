#!/usr/bin/env bash
set -euo pipefail

BRANCH="aiter"
UPSTREAM="upstream"
UPSTREAM_BRANCH="main"
REMOTE="origin"

echo "==> 切换到 $BRANCH 分支"
git checkout "$BRANCH"

echo "==> 从 $UPSTREAM 拉取最新代码"
git fetch "$UPSTREAM"

echo "==> 合并 $UPSTREAM/$UPSTREAM_BRANCH 到 $BRANCH"
git merge "$UPSTREAM/$UPSTREAM_BRANCH"

echo "==> 推送更新到 $REMOTE/$BRANCH"
git push "$REMOTE" "$BRANCH"

echo "✅ 同步完成"