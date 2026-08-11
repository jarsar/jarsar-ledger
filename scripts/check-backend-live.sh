#!/usr/bin/env bash
# Regression check against the deployed back office.
#
# Run this after pasting the new Code.gs and deploying a NEW VERSION. It is
# self-cleaning: it files one test entry, amends it, then strikes it out, so
# nothing is left behind in the book.
#
#   ./scripts/check-backend-live.sh <WEB_APP_URL> <TOKEN>

set -euo pipefail

URL="${1:-}"
TOKEN="${2:-}"

if [[ -z "$URL" || -z "$TOKEN" ]]; then
  echo "usage: $0 <WEB_APP_URL> <TOKEN>" >&2
  exit 2
fi

post() {
  # A simple request: POST, text/plain, no custom headers — Apps Script never
  # answers a preflight, so this is the only shape that works from a browser
  # too.
  #
  # The answer comes back as a 302 to script.googleusercontent.com, and the
  # second hop must be a GET. A browser's fetch() does that conversion on its
  # own; curl -L does not — it re-sends the POST and collects a 405 and a
  # Drive error page. So the two hops are done by hand here.
  local headers location
  headers=$(curl -s -o /dev/null -D - -X POST \
    -H 'Content-Type: text/plain;charset=utf-8' -d "$1" "$URL")
  location=$(awk 'tolower($1) == "location:" { print $2 }' <<<"$headers" | tr -d '\r')

  if [[ -z "$location" ]]; then
    # No redirect: either an error, or a deployment answering inline.
    curl -s -X POST -H 'Content-Type: text/plain;charset=utf-8' -d "$1" "$URL"
    return
  fi
  curl -s "$location"
}

pass() { printf '  ok   %s\n' "$1"; }
fail() { printf '  FAIL %s\n       %s\n' "$1" "$2"; FAILED=1; }
FAILED=0

echo
echo "JarSar back office — live checks"
echo

# 1 · the Shortcut's payload shape: no action field at all.
# The text has to read as a real completed purchase — the parser is right to
# refuse anything that doesn't, so "self-test" would never get past it.
OUT=$(post "{\"token\":\"$TOKEN\",\"text\":\"Gatsby wax sachet 7 pesos at Uncle John, paid cash\",\"source\":\"test\"}")
if grep -q '"ok":true' <<<"$OUT"; then
  ID=$(sed -n 's/.*"id":"\([^"]*\)".*/\1/p' <<<"$OUT")
  pass "a body with no action still logs (Shortcut compatibility) — id $ID"
else
  fail "a body with no action still logs" "$OUT"
  echo; echo "Stopping: nothing else can be checked without a filed entry."; exit 1
fi

# 2 · list
OUT=$(post "{\"token\":\"$TOKEN\",\"action\":\"list\"}")
grep -q '"ok":true' <<<"$OUT" && grep -q "$ID" <<<"$OUT" \
  && pass "list returns the recent entries, including the new one" \
  || fail "list" "$OUT"

# 3 · budgets
OUT=$(post "{\"token\":\"$TOKEN\",\"action\":\"budgets\"}")
grep -q '"budgets"' <<<"$OUT" \
  && pass "budgets returns the caps and groups" \
  || fail "budgets" "$OUT"

# 4 · update: moves the entry to another month and certifies it
OUT=$(post "{\"token\":\"$TOKEN\",\"action\":\"update\",\"id\":\"$ID\",\"fields\":{\"amount\":11,\"date\":\"2026-07-31\"}}")
grep -q '"month":"2026-07"' <<<"$OUT" \
  && pass "update recomputes Month when the date moves" \
  || fail "update recomputes Month" "$OUT"
grep -q '"review":""' <<<"$OUT" \
  && pass "update clears the review flag — an edit is certification" \
  || fail "update clears the review flag" "$OUT"

# 5 · the month filter finds it where it now lives
OUT=$(post "{\"token\":\"$TOKEN\",\"action\":\"list\",\"month\":\"2026-07\"}")
grep -q "$ID" <<<"$OUT" \
  && pass "the month filter finds the amended entry" \
  || fail "month filter" "$OUT"

# 6 · delete — leaves the book as it was found
OUT=$(post "{\"token\":\"$TOKEN\",\"action\":\"delete\",\"id\":\"$ID\"}")
grep -q '"ok":true' <<<"$OUT" \
  && pass "delete strikes the test entry out" \
  || fail "delete" "$OUT"

OUT=$(post "{\"token\":\"$TOKEN\",\"action\":\"list\"}")
grep -q "$ID" <<<"$OUT" \
  && fail "the test entry is gone" "it is still listed" \
  || pass "the test entry is gone — the book is as it was"

# 7 · the credential is required
OUT=$(post "{\"token\":\"definitely-wrong\",\"action\":\"budgets\"}")
grep -q '"ok":false' <<<"$OUT" \
  && pass "a wrong credential is refused" \
  || fail "wrong credential" "$OUT"

echo
if [[ $FAILED -eq 0 ]]; then
  echo "All live checks passed. The book is unchanged."
else
  echo "Some checks failed — do not point the app at this deployment yet."
fi
echo
exit $FAILED
