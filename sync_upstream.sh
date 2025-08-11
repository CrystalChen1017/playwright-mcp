x#!/usr/bin/env bash
# 同步 upstream/main 到你的 aiter 分支，并推送到 origin
# 用法：
#   ./scripts/sync_upstream.sh                 # 默认：分支 aiter，上游 upstream/main，远端 origin，完成后自动 push
#   BRANCH=my-branch ./scripts/sync_upstream.sh         # 改目标分支
#   UPSTREAM_REF=upstream/main ./scripts/sync_upstream.sh # 改上游引用
#   REMOTE=origin ./scripts/sync_upstream.sh            # 改推送远端
#   NO_PUSH=1 ./scripts/sync_upstream.sh                # 只合并不推送
#
# 变量（可用环境变量覆写）：
BRANCH="${BRANCH:-aiter}"
UPSTREAM_REF="${UPSTREAM_REF:-upstream/main}"
REMOTE="${REMOTE:-origin}"
# 如果你用 SSH，更适合自动化： git remote set-url origin git@github.com:<you>/playwright-mcp.git

set -euo pipefail

# 定位到仓库根目录（脚本位于 repo 的 scripts/ 下时适用）
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$REPO_DIR"

echo "==> Repo: $REPO_DIR"
echo "==> Target branch: $BRANCH"
echo "==> Upstream ref:  $UPSTREAM_REF"
echo "==> Push remote:   $REMOTE"
echo

# 0) 防止未提交改动被带入合并
if ! git diff --quiet || ! git diff --cached --quiet; then
  echo "工作区不干净：请先提交或暂存（stash）你的改动后再执行。"
  exit 1
fi

# 1) 更新远端引用
git fetch --prune "${UPSTREAM_REF%%/*}" || { echo "fetch upstream 失败"; exit 1; }
git fetch --prune "$REMOTE" || true

# 2) 确保本地存在目标分支
if ! git rev-parse --verify "$BRANCH" >/dev/null 2>&1; then
  if git rev-parse --verify "$REMOTE/$BRANCH" >/dev/null 2>&1; then
    echo "本地不存在分支 $BRANCH，基于 $REMOTE/$BRANCH 创建..."
    git checkout -b "$BRANCH" "$REMOTE/$BRANCH"
  else
    echo "本地和远端都没有 $BRANCH，基于 upstream 同步创建..."
    git checkout -b "$BRANCH" "$UPSTREAM_REF"
  fi
else
  git checkout "$BRANCH"
fi

# 3) 将远端同名分支的快进更新拉到本地（若存在）
if git rev-parse --verify "$REMOTE/$BRANCH" >/dev/null 2>&1; then
  git merge --ff-only "$REMOTE/$BRANCH" || true
fi

# 4) 合并上游
echo
echo "==> 合并 $UPSTREAM_REF 到 $BRANCH ..."
if git merge --ff-only "$UPSTREAM_REF"; then
  echo "Fast-forward 成功。"
else
  echo "无法 fast-forward，尝试普通合并（--no-edit）..."
  set +e
  git merge --no-edit "$UPSTREAM_REF"
  MERGE_STATUS=$?
  set -e
  if [ $MERGE_STATUS -ne 0 ]; then
    echo
    echo "⚠️ 发生合并冲突，已保留现场。请手动解决后提交："
    echo "   1) 解决冲突并 git add 相关文件"
    echo "   2) git commit"
    echo "   3) git push $REMOTE $BRANCH"
    exit 2
  fi
fi

# 5) 推送（可通过 NO_PUSH=1 跳过）
if [ "${NO_PUSH:-0}" = "1" ]; then
  echo
  echo "==> 已完成本地合并（NO_PUSH=1），未推送。"
else
  echo
  echo "==> 推送到 $REMOTE/$BRANCH ..."
  # 仅在有变化时推送
  if ! git diff --quiet "$REMOTE/$BRANCH"...HEAD 2>/dev/null; then
    git push "$REMOTE" "$BRANCH"
    echo "推送完成。"
  else
    echo "无变化，无需推送。"
  fi
fi

echo
echo "✅ 同步完成：$BRANCH 已包含 $UPSTREAM_REF 的最新提交。"