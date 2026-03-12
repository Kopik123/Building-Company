#!/usr/bin/env bash
set -euo pipefail

if ! command -v curl >/dev/null 2>&1; then
  echo "curl is required." >&2
  exit 1
fi

if ! command -v jq >/dev/null 2>&1; then
  echo "jq is required. Install it first, for example: sudo apt install -y jq" >&2
  exit 1
fi

SONAR_URL="${SONAR_URL:-}"
SONAR_TOKEN="${SONAR_TOKEN:-}"
PROJECT_KEY="${PROJECT_KEY:-Kopik123_Building-Company}"
BRANCH="${BRANCH:-vscode}"
PAGE_SIZE="${PAGE_SIZE:-500}"
OUTPUT_DIR="${OUTPUT_DIR:-sonar-export}"

if [[ -z "$SONAR_URL" ]]; then
  echo "SONAR_URL is required, for example: export SONAR_URL=\"https://sonar.example.com\"" >&2
  exit 1
fi

if [[ -z "$SONAR_TOKEN" ]]; then
  echo "SONAR_TOKEN is required, for example: export SONAR_TOKEN=\"your-token\"" >&2
  exit 1
fi

mkdir -p "$OUTPUT_DIR"

fetch_json() {
  local url="$1"
  local output="$2"
  curl -sS \
    -H "Authorization: Bearer $SONAR_TOKEN" \
    "$url" \
    -o "$output"
}

ISSUES_URL="$SONAR_URL/api/issues/search?componentKeys=$PROJECT_KEY&branch=$BRANCH&ps=$PAGE_SIZE&p=1"
FIRST_PAGE="$OUTPUT_DIR/sonar-issues-page-1.json"

echo "Downloading issues page 1..."
fetch_json "$ISSUES_URL" "$FIRST_PAGE"

TOTAL="$(jq '.total' "$FIRST_PAGE")"
PAGES="$(( (TOTAL + PAGE_SIZE - 1) / PAGE_SIZE ))"

echo "Total issues: $TOTAL"
echo "Pages: $PAGES"

if [[ "$PAGES" -gt 1 ]]; then
  for page in $(seq 2 "$PAGES"); do
    echo "Downloading issues page $page of $PAGES..."
    fetch_json \
      "$SONAR_URL/api/issues/search?componentKeys=$PROJECT_KEY&branch=$BRANCH&ps=$PAGE_SIZE&p=$page" \
      "$OUTPUT_DIR/sonar-issues-page-$page.json"
  done
fi

echo "Merging issue pages..."
jq -s \
  --arg projectKey "$PROJECT_KEY" \
  --arg branch "$BRANCH" \
  --arg exportedAt "$(date '+%Y-%m-%d %H:%M:%S %z')" \
  '{
    projectKey: $projectKey,
    branch: $branch,
    exportedAt: $exportedAt,
    total: (.[0].total),
    issues: (map(.issues) | add)
  }' "$OUTPUT_DIR"/sonar-issues-page-*.json > "$OUTPUT_DIR/sonar-issues-full.json"

echo "Downloading quality gate..."
fetch_json \
  "$SONAR_URL/api/qualitygates/project_status?projectKey=$PROJECT_KEY&branch=$BRANCH" \
  "$OUTPUT_DIR/sonar-quality-gate.json"

echo "Downloading measures..."
fetch_json \
  "$SONAR_URL/api/measures/component?component=$PROJECT_KEY&branch=$BRANCH&metricKeys=bugs,vulnerabilities,code_smells,security_hotspots,reliability_rating,security_rating,sqale_rating,duplicated_lines_density,ncloc,coverage" \
  "$OUTPUT_DIR/sonar-measures.json"

echo "Export complete:"
echo "  $OUTPUT_DIR/sonar-issues-full.json"
echo "  $OUTPUT_DIR/sonar-quality-gate.json"
echo "  $OUTPUT_DIR/sonar-measures.json"
