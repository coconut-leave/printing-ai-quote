#!/usr/bin/env bash

set -euo pipefail

BASE_URL="${BASE_URL:-http://localhost:3000}"
CHAT_URL="$BASE_URL/api/chat"

if ! command -v curl >/dev/null 2>&1; then
  echo "curl is required but not installed." >&2
  exit 1
fi

if ! command -v node >/dev/null 2>&1; then
  echo "node is required but not installed." >&2
  exit 1
fi

post_json() {
  local payload="$1"
  curl -sS -X POST "$CHAT_URL" \
    -H "Content-Type: application/json" \
    -d "$payload"
}

print_summary() {
  local title="$1"
  local response_json="$2"
  RESPONSE_JSON="$response_json" node -e '
const data = JSON.parse(process.env.RESPONSE_JSON || "{}");
const summary = {
  conversationId: data.conversationId,
  intent: data.intent,
  status: data.status,
  reply: data.reply,
  recommendedParams: data.recommendedParams,
  mergedRecommendedParams: data.mergedRecommendedParams,
  mergedParams: data.mergedParams,
  missingFields: data.missingFields,
};
console.log("\n### " + process.argv[1]);
console.log(JSON.stringify(summary, null, 2));
' "$title"
}

echo "Using API: $CHAT_URL"

step1=$(post_json '{"message":"铜版纸和哑粉纸有什么区别？"}')
print_summary "步骤 1: 仅知识回复" "$step1"

step2=$(post_json '{"message":"A4画册一般多少页比较合适？"}')
print_summary "步骤 2: 咨询返回 recommendedParams" "$step2"
conversation_id=$(RESPONSE_JSON="$step2" node -e 'const data = JSON.parse(process.env.RESPONSE_JSON || "{}"); process.stdout.write(String(data.conversationId || ""));')

if [[ -z "$conversation_id" ]]; then
  echo "Failed to get conversationId from step 2 response." >&2
  exit 1
fi

step3=$(post_json "{\"conversationId\":$conversation_id,\"message\":\"按这个方案报价，1000本\"}")
print_summary "步骤 3: 推荐确认进入 quoted" "$step3"

step4=$(post_json '{"message":"A4画册一般多少页比较合适？"}')
print_summary "步骤 4: 新会话重新拿推荐方案" "$step4"
conversation_id_patch=$(RESPONSE_JSON="$step4" node -e 'const data = JSON.parse(process.env.RESPONSE_JSON || "{}"); process.stdout.write(String(data.conversationId || ""));')

if [[ -z "$conversation_id_patch" ]]; then
  echo "Failed to get conversationId from step 4 response." >&2
  exit 1
fi

step5=$(post_json "{\"conversationId\":$conversation_id_patch,\"message\":\"页数改成40，改成胶装\"}")
print_summary "步骤 5: recommendation patch" "$step5"

step6=$(post_json "{\"conversationId\":$conversation_id_patch,\"message\":\"按这个方案报价，1000本\"}")
print_summary "步骤 6: patch 后再报价" "$step6"

echo "\nSmoke flow completed."