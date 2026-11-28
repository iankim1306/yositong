# -*- coding: utf-8 -*-
"""
cp_api.py — 쿠팡 파트너스 Open API 클라이언트 (상품검색 + 딥링크)

키 출처: ThreadsAuto 의 config.json (base64 저장). 여기서 읽어 쓰고,
         값은 절대 출력하지 않는다(로그·stdout 금지).

인증: HMAC-SHA256
  signed-date = GMT yymmddTHHMMSSZ (쿠팡은 2분 이내만 허용)
  message     = signed_date + METHOD + path + query
  signature   = HMAC-SHA256(secret, message).hexdigest()
"""
import base64, hashlib, hmac, json, io, os, sys, urllib.parse, urllib.request
from time import gmtime, strftime

DOMAIN = "https://api-gateway.coupang.com"
SEARCH = "/v2/providers/affiliate_open_api/apis/openapi/v1/products/search"
DEEPLINK = "/v2/providers/affiliate_open_api/apis/openapi/v1/deeplink"

CONFIG_CANDIDATES = [
    r"C:/Users/hadam/Desktop/thread auto/threads_auto/config.json",
    r"C:/Users/hadam/Desktop/coupas-link-converter/config.json",
    r"C:/Users/hadam/Desktop/coupas-link-converter/dist/config.json",
]

def load_keys():
    for p in CONFIG_CANDIDATES:
        if not os.path.exists(p):
            continue
        try:
            cfg = json.load(io.open(p, encoding="utf-8"))
        except Exception:
            continue
        ak, sk = cfg.get("coupang_access_key", ""), cfg.get("coupang_secret_key", "")
        if not ak or not sk:
            continue
        def dec(t):
            try:
                return base64.b64decode(t.encode()).decode()
            except Exception:
                return t
        ak, sk = dec(ak), dec(sk)
        if ak and sk:
            return ak, sk, p
    raise SystemExit("쿠팡 파트너스 키를 찾지 못했습니다.")

def _auth(ak, sk, method, path_with_query):
    parts = path_with_query.split("?", 1)
    path = parts[0]
    query = parts[1] if len(parts) > 1 else ""
    signed = strftime("%y%m%d", gmtime()) + "T" + strftime("%H%M%S", gmtime()) + "Z"
    msg = signed + method.upper() + path + query
    sig = hmac.new(sk.encode(), msg.encode(), hashlib.sha256).hexdigest()
    return ("CEA algorithm=HmacSHA256, access-key=%s, signed-date=%s, signature=%s"
            % (ak, signed, sig))

def call(method, path_with_query, payload=None, timeout=20):
    ak, sk, _ = load_keys()
    auth = _auth(ak, sk, method, path_with_query)
    url = DOMAIN + path_with_query
    data = json.dumps(payload).encode() if payload is not None else None
    req = urllib.request.Request(url, data=data, method=method.upper())
    req.add_header("Authorization", auth)
    req.add_header("Content-Type", "application/json;charset=UTF-8")
    try:
        with urllib.request.urlopen(req, timeout=timeout) as r:
            return json.loads(r.read().decode("utf-8"))
    except urllib.error.HTTPError as e:
        body = e.read().decode("utf-8", "replace")[:600]
        raise RuntimeError("HTTP %s — %s" % (e.code, body))

def search(keyword, limit=20):
    q = urllib.parse.urlencode({"keyword": keyword, "limit": limit})
    return call("GET", SEARCH + "?" + q)

def deeplink(urls, sub_id=None):
    """딥링크 생성.

    sub_id 를 꼭 넣을 것(2026-11-28). 안 넣으면 파트너스 리포트에서 사이트별로
    갈리지 않는다 — 실측에서 커미션의 57%가 "미상"으로 남았다.
    채널 값은 사이트 이름으로 통일한다: infohow / yositong / threads.

    넣으면 landingUrl 이 이렇게 나온다:
      .../re/AFFSDP?lptag=AF0480009&subid=infohow&pageKey=...

    주의: 단축링크(link.coupang.com/a/XXXX)는 subId 가 코드에 구워진다.
    이미 만든 단축링크 뒤에 &subid= 를 붙여도 안 먹으니 반드시 재발급할 것.
    (AFFSDP 형식의 긴 링크는 lptag 뒤에 끼워 넣으면 된다.)
    """
    body = {"coupangUrls": urls}
    if sub_id:
        body["subId"] = sub_id
    return call("POST", DEEPLINK, body)
