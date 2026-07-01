"""
One-shot script:
1. Inject Article + BreadcrumbList JSON-LD into 21 post index.html files (extracted from h1, canonical, .meta date)
2. Update footer on ALL 26 files to include /about/ /contact/ /privacy/ links
Idempotent: re-runs skip already-modified files.
"""
import os
import re
import json
from pathlib import Path

ROOT = Path(r"C:\Users\hadam\Desktop\yositong")

OLD_FOOTER_RE = re.compile(
    r'<a href="/blog/">정보글</a> · <a href="/jobs/">취업정보</a> · <a href="/quiz/">문제풀이</a>(?!\s*·\s*<a href="/about/")'
)
NEW_FOOTER_INNER = (
    '<a href="/blog/">정보글</a> · <a href="/jobs/">취업정보</a> · '
    '<a href="/quiz/">문제풀이</a> · <a href="/about/">소개</a> · '
    '<a href="/contact/">문의</a> · <a href="/privacy/">개인정보처리방침</a>'
)

POST_SLUGS = [
    "2025-요양보호사-자격증-취득-신청-시험정보-급여-전망",
    "2025년-요양보호사-시험-기출문제-완벽-분석",
    "2025년-요양보호사-시험일정-완벽-정리",
    "요양보호사-cbt-시험-사전-테스트-방법-및-꿀팁",
    "요양보호사-관련-자격증-어떤-걸-따면-좋을까",
    "요양보호사-교육비-국비지원-받는-방법과-혜택-총정",
    "요양보호사-교육시간-늘어난-이유-기존-취득자들은",
    "요양보호사-구인구직-어디서-찾을까-구직사이트-정",
    "요양보호사-국비지원-난-얼마나-낼까",
    "요양보호사-급여-실수령액은-이정도",
    "요양보호사-문제집-꼭-필요할까-합격수기-포함",
    "요양보호사-시험-난이도-어렵나요",
    "요양보호사-시험-준비물-체크하고-가세요",
    "요양보호사-시험문제-풀이-어디서",
    "요양보호사-실습-준비부터-후기까지-총정리",
    "요양보호사-업무강도-실제로-어떨까-현장-목소리로",
    "요양보호사-업무범위-제대로-알기",
    "요양보호사-월급-실수령액-근무처별-정리",
    "요양보호사-전망-분석-20년-뒤엔-99만명이-부족하다고",
    "요양보호사-필기시험-2025년-최신-출제경향-및-합격",
    "요양보호사-학원-선택-필수-고려사항",
]

REFRESHED = {
    "요양보호사-월급-실수령액-근무처별-정리",
    "요양보호사-구인구직-어디서-찾을까-구직사이트-정",
    "요양보호사-교육비-국비지원-받는-방법과-혜택-총정",
}

ALL_FILES = [ROOT / "index.html"]
for sub in ["jobs", "academy", "quiz", "blog", "about", "contact", "privacy"]:
    p = ROOT / sub / "index.html"
    if p.exists():
        ALL_FILES.append(p)
for slug in POST_SLUGS:
    ALL_FILES.append(ROOT / slug / "index.html")


def update_footer(text: str) -> tuple[str, bool]:
    if "<a href=\"/about/\">소개</a>" in text:
        return text, False
    new = OLD_FOOTER_RE.sub(NEW_FOOTER_INNER, text, count=1)
    return new, new != text


def inject_post_schema(text: str, slug: str) -> tuple[str, bool]:
    if '"@type": "Article"' in text:
        return text, False  # already injected

    # Extract h1
    m_h1 = re.search(r'<h1[^>]*>(.*?)</h1>', text, re.DOTALL)
    headline = re.sub(r'<[^>]+>', '', m_h1.group(1)).strip() if m_h1 else slug

    # Extract published date from .meta
    m_date = re.search(r'<div class="meta">([0-9]{4}-[0-9]{2}-[0-9]{2})', text)
    date_pub = m_date.group(1) if m_date else "2025-01-01"

    date_mod = "2026-04-19" if slug in REFRESHED else date_pub

    # Extract canonical
    m_can = re.search(r'<link rel="canonical" href="([^"]+)"', text)
    canonical = m_can.group(1) if m_can else f"https://yositong.com/{slug}/"

    # Extract description
    m_desc = re.search(r'<meta name="description" content="([^"]*)"', text)
    description = m_desc.group(1) if m_desc else headline

    article_ld = {
        "@context": "https://schema.org",
        "@type": "Article",
        "headline": headline,
        "description": description,
        "datePublished": date_pub,
        "dateModified": date_mod,
        "inLanguage": "ko-KR",
        "author": {
            "@type": "Organization",
            "name": "요양보호사 정보",
            "url": "https://yositong.com/"
        },
        "publisher": {
            "@type": "Organization",
            "name": "요양보호사 정보",
            "url": "https://yositong.com/"
        },
        "mainEntityOfPage": {
            "@type": "WebPage",
            "@id": canonical
        }
    }

    breadcrumb_ld = {
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        "itemListElement": [
            {"@type": "ListItem", "position": 1, "name": "홈",
             "item": "https://yositong.com/"},
            {"@type": "ListItem", "position": 2, "name": "정보글",
             "item": "https://yositong.com/blog/"},
            {"@type": "ListItem", "position": 3, "name": headline,
             "item": canonical},
        ]
    }

    block = (
        '<script type="application/ld+json">\n'
        + json.dumps(article_ld, ensure_ascii=False, indent=2)
        + '\n</script>\n'
        + '<script type="application/ld+json">\n'
        + json.dumps(breadcrumb_ld, ensure_ascii=False, indent=2)
        + '\n</script>\n'
    )

    new = text.replace('</head>', block + '</head>', 1)
    return new, True


def main():
    footer_updated = 0
    schema_injected = 0
    for fp in ALL_FILES:
        if not fp.exists():
            print(f"SKIP (missing): {fp}")
            continue
        text = fp.read_text(encoding='utf-8')
        orig = text

        # Update footer on all files
        text, fchanged = update_footer(text)
        if fchanged:
            footer_updated += 1

        # Schema injection only for posts
        slug = fp.parent.name
        if slug in POST_SLUGS:
            text, schanged = inject_post_schema(text, slug)
            if schanged:
                schema_injected += 1

        if text != orig:
            fp.write_text(text, encoding='utf-8')
            print(f"UPDATED: {fp.relative_to(ROOT)}")

    print(f"\nFooter updated in {footer_updated} files")
    print(f"Schema injected in {schema_injected} posts")


if __name__ == "__main__":
    main()
