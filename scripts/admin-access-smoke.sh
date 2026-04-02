#!/usr/bin/env bash

set -euo pipefail

BASE_URL="${BASE_URL:-http://localhost:3000}"
ADMIN_SECRET_VALUE="${ADMIN_SECRET:-}"
COOKIE_JAR="$(mktemp)"

cleanup() {
  rm -f "$COOKIE_JAR"
}

trap cleanup EXIT

echo "Using BASE_URL=$BASE_URL"

expect_status() {
  local actual="$1"
  local expected="$2"
  local label="$3"

  if [[ "$actual" != "$expected" ]]; then
    echo "[FAIL] $label: expected $expected, got $actual"
    exit 1
  fi

  echo "[OK] $label: $actual"
}

expect_redirect_to_admin_access() {
  local headers="$1"
  local label="$2"
  local status
  local location

  status="$(printf '%s\n' "$headers" | awk 'NR==1 { print $2 }')"
  location="$(printf '%s\n' "$headers" | awk 'BEGIN { IGNORECASE = 1 } /^location:/ { print $2 }')"

  case "$status" in
    301|302|303|307|308) ;;
    *)
      echo "[FAIL] $label: expected 3xx redirect, got $status"
      exit 1
      ;;
  esac

  if [[ "$location" != /admin-access* ]]; then
    echo "[FAIL] $label: expected redirect to /admin-access, got ${location:-<empty>}"
    exit 1
  fi

  echo "[OK] $label: $status -> $location"
}

echo "\n[1/4] 未授权访问后台页面，应返回 3xx 跳转到 /admin-access"
dashboard_headers="$(curl -s -D - -o /dev/null "$BASE_URL/dashboard" | tr -d '\r')"
expect_redirect_to_admin_access "$dashboard_headers" "unauthorized dashboard page"

echo "\n[2/4] 未授权访问管理 API，应返回 401"
dashboard_api_status="$(curl -s -o /dev/null -w '%{http_code}' "$BASE_URL/api/dashboard")"
expect_status "$dashboard_api_status" "401" "unauthorized dashboard api"

echo "\n[2.5/4] 未授权访问报价导出 API，应返回 401 或未授权响应"
export_api_status="$(curl -s -o /dev/null -w '%{http_code}' "$BASE_URL/api/quotes/1/export")"
expect_status "$export_api_status" "401" "unauthorized quote export api"

if [[ -n "$ADMIN_SECRET_VALUE" ]]; then
  echo "\n[3/4] 使用 x-admin-secret 访问管理 API，应返回 200"
  authorized_dashboard_status="$(curl -s -o /dev/null -w '%{http_code}' "$BASE_URL/api/dashboard" -H "x-admin-secret: $ADMIN_SECRET_VALUE")"
  expect_status "$authorized_dashboard_status" "200" "authorized dashboard api"

  echo "\n[4/4] 建立后台会话后访问后台页面，应返回 200"
  admin_session_status="$(curl -s -o /dev/null -w '%{http_code}' -c "$COOKIE_JAR" -b "$COOKIE_JAR" \
    -X POST "$BASE_URL/api/admin/session" \
    -H "Content-Type: application/json" \
    -d "{\"secret\":\"$ADMIN_SECRET_VALUE\",\"next\":\"/dashboard\"}")"
  expect_status "$admin_session_status" "200" "admin session creation"

  authorized_dashboard_page_status="$(curl -s -o /dev/null -w '%{http_code}' -c "$COOKIE_JAR" -b "$COOKIE_JAR" "$BASE_URL/dashboard")"
  expect_status "$authorized_dashboard_page_status" "200" "authorized dashboard page"
else
  echo "\n[3/4] 跳过已授权校验：未提供 ADMIN_SECRET 环境变量。"
  echo "      可执行：ADMIN_SECRET=your-secret BASE_URL=$BASE_URL bash scripts/admin-access-smoke.sh"
fi

echo "\n补充检查：公开 chat API 不应被保护"
chat_api_status="$(curl -s -o /dev/null -w '%{http_code}' -X POST "$BASE_URL/api/chat" \
  -H "Content-Type: application/json" \
  -d '{"message":"我想印1000本A4画册"}')"
expect_status "$chat_api_status" "200" "public chat api"