#!/usr/bin/env bash
set -e

echo "── Typecheck ──"
pnpm run typecheck

echo "── Lint ──"
pnpm run lint

echo "── Format check ──"
pnpm run format:check

echo "── Test ──"
pnpm run test

echo "✅ All tooling checks passed"