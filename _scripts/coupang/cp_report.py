# -*- coding: utf-8 -*-
"""
cp_report.py — 쿠팡 파트너스 실적 조회 (클릭·주문·수수료)

왜 만들었나 (2026-11-28)
  수익이 찍혔는데 어느 사이트/어느 글에서 났는지 몰라서. 파트너스 리포트 API 는
  클릭·주문·커미션을 날짜별로 돌려준다. subId 를 심어 뒀다면 채널별로도 갈린다.

인증·키 로딩은 cp_api.py 를 그대로 쓴다(키 값은 절대 출력하지 않는다).

쿠팡 제약
  - 조회 기간은 한 번에 최대 31일. 더 길면 쪼개서 부른다.
  - 날짜는 YYYYMMDD.

사용:
  python cp_report.py                 # 최근 35일
  python cp_report.py 20261001 20261128
"""
import io
import json
import os
import sys
from datetime import date, timedelta

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import cp_api  # noqa: E402

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")

BASE = "/v2/providers/affiliate_open_api/apis/openapi"
ENDPOINTS = {
    "clicks": BASE + "/v1/reports/clicks",
    "orders": BASE + "/v1/reports/orders",
    "commission": BASE + "/v1/reports/commission",
}


def chunks(start, end, days=31):
    """쿠팡은 한 번에 31일까지만 준다."""
    cur = start
    while cur <= end:
        last = min(cur + timedelta(days=days - 1), end)
        yield cur, last
        cur = last + timedelta(days=1)


def fetch(kind, start, end):
    rows = []
    for a, b in chunks(start, end):
        q = "?startDate=%s&endDate=%s" % (a.strftime("%Y%m%d"), b.strftime("%Y%m%d"))
        try:
            res = cp_api.call("GET", ENDPOINTS[kind] + q)
        except Exception as e:
            print("  [%s] %s~%s 실패: %s" % (kind, a, b, str(e)[:200]))
            continue
        data = res.get("data")
        if isinstance(data, list):
            rows.extend(data)
        elif isinstance(data, dict):
            rows.append(data)
    return rows


def main():
    if len(sys.argv) >= 3:
        start = date(int(sys.argv[1][:4]), int(sys.argv[1][4:6]), int(sys.argv[1][6:8]))
        end = date(int(sys.argv[2][:4]), int(sys.argv[2][4:6]), int(sys.argv[2][6:8]))
    else:
        end = date.today()
        start = end - timedelta(days=34)

    print("조회 기간: %s ~ %s" % (start, end))
    out = {}
    for kind in ("clicks", "orders", "commission"):
        rows = fetch(kind, start, end)
        out[kind] = rows
        print("\n── %s : %d행" % (kind, len(rows)))
        if rows:
            print("   필드: " + ", ".join(sorted(rows[0].keys())))
            for r in rows[:3]:
                print("   " + json.dumps(r, ensure_ascii=False)[:400])

    dst = os.path.join(os.path.dirname(os.path.abspath(__file__)), "_report.json")
    io.open(dst, "w", encoding="utf-8").write(json.dumps(out, ensure_ascii=False, indent=1))
    print("\n저장: " + dst)


if __name__ == "__main__":
    main()
