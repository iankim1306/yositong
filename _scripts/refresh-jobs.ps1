# refresh-jobs.ps1 — 구인공고 자동 갱신 (Windows 작업 스케줄러용)
#
# 하는 일: 공공데이터 API 수집 → 지역 페이지 재생성 → 사이트맵 → 커밋·푸시
#          푸시하면 Vercel git 연동이 자동 배포한다(실측 27초).
#
# 왜 로컬인가
#   - API 키가 이미 .env.local 에 있어 별도 시크릿 등록이 필요 없다.
#   - 한국 IP 로 호출한다. GitHub Actions 는 미국 리전이라 한국 공공 API 가
#     막을 수 있다(배당금캘린더에서 미래에셋이 Actions 에서 403 을 낸 전례).
#   - 단점은 PC 가 켜져 있어야 한다는 것. 놓친 날은 다음 실행이 그대로 따라잡는다
#     (공고를 매번 전체 수집하므로 누적 누락이 없다).
#
# ⚠️ 이 파일은 반드시 UTF-8 BOM 으로 저장할 것.
#    PS 5.1 은 BOM 없는 .ps1 을 CP949 로 읽어 한글이 깨지고 "Unexpected token" 이 난다.
#
# 로그: _scripts/refresh-jobs.log (최근 400줄만 유지)

$ErrorActionPreference = 'Stop'
$ROOT = Split-Path -Parent $PSScriptRoot
$LOG  = Join-Path $PSScriptRoot 'refresh-jobs.log'

function Log($msg) {
    $line = "{0}  {1}" -f (Get-Date -Format 'yyyy-MM-dd HH:mm:ss'), $msg
    Write-Host $line
    Add-Content -Path $LOG -Value $line -Encoding utf8
}

# git 전용 래퍼. PS 5.1 은 네이티브 exe 의 stderr 를 ErrorRecord 로 감싸서
# git 이 정상(exit 0)인데도 $ErrorActionPreference='Stop' 에서 throw 한다.
# git 은 진행 상황을 stderr 로 내보내므로 push 성공이 실패로 둔갑한다(실제로 당했다).
# 종료코드로만 판정한다.
function Invoke-Git {
    param([Parameter(ValueFromRemainingArguments = $true)][string[]]$GitArgs)
    $old = $ErrorActionPreference
    $ErrorActionPreference = 'Continue'
    try {
        $out = & git @GitArgs 2>&1 | ForEach-Object { "$_" }
        $code = $LASTEXITCODE
    } finally {
        $ErrorActionPreference = $old
    }
    foreach ($l in $out) { if ($l) { Log "  git: $l" } }
    return $code
}

try {
    Set-Location $ROOT
    Log "━━━ 시작 ━━━"

    # 시작할 때 pull 하지 않는다. 작업 중인 파일이 하나라도 있으면
    # "cannot pull with rebase: You have unstaged changes" 로 매번 죽는다.
    # 대신 push 가 거절될 때만 rebase 하고 다시 민다(아래).

    Log "공고 수집…"
    $out = node _scripts/fetch-welfare.cjs 2>&1
    $out | ForEach-Object { Log "  $_" }
    if ($LASTEXITCODE -ne 0) { throw "fetch-welfare 실패 (exit $LASTEXITCODE)" }

    Log "지역 페이지 재생성…"
    node _scripts/build-region-directories.js 2>&1 | Select-Object -Last 4 | ForEach-Object { Log "  $_" }
    if ($LASTEXITCODE -ne 0) { throw "build-region-directories 실패" }

    Log "사이트맵 재생성…"
    node _scripts/build-sitemaps.js 2>&1 | Select-Object -Last 3 | ForEach-Object { Log "  $_" }
    if ($LASTEXITCODE -ne 0) { throw "build-sitemaps 실패" }

    # 변경이 없으면 커밋하지 않는다. 빈 커밋이 쌓이면 배포만 헛돈다.
    $null = Invoke-Git diff --quiet -- data/welfare.json regions sitemap-regions.xml
    if ($LASTEXITCODE -eq 0) {
        Log "변경 없음 — 커밋 생략"
    } else {
        $jobs = node -e "console.log(require('./data/welfare.json').length)"
        $care = node -e "console.log(require('./data/welfare.json').filter(j=>j.isCare).length)"
        Log "변경 있음 — 공고 $jobs 건 (요양보호 $care 건)"
        # 데이터·생성물만 담는다. 작업 중인 다른 파일을 쓸어 담지 않는다.
        $null = Invoke-Git add data/welfare.json data/welfare-regions.json regions sitemap-pages.xml sitemap-regions.xml sitemap.xml
        $null = Invoke-Git diff --cached --quiet
        if ($LASTEXITCODE -eq 0) {
            Log "스테이징할 변경이 없음 — 커밋 생략"
        } else {
            $c = Invoke-Git commit -q -m "구인공고 자동 갱신 - $jobs 건 (요양보호 $care 건)"
            if ($c -ne 0) { throw "commit 실패 (exit $c)" }
            $p = Invoke-Git push origin main
            if ($p -ne 0) {
                Log "push 거절 — rebase 후 재시도"
                $null = Invoke-Git pull --rebase origin main
                $p = Invoke-Git push origin main
                if ($p -ne 0) { throw "push 재시도 실패 (exit $p)" }
            }
            Log "푸시 완료 → Vercel 자동 배포"
        }
    }

    Log "━━━ 정상 종료 ━━━"
    $exit = 0
}
catch {
    Log "❌ 실패: $_"
    Log "━━━ 비정상 종료 ━━━"
    $exit = 1
}
finally {
    # 로그가 무한정 커지지 않게 자른다
    if (Test-Path $LOG) {
        $lines = Get-Content $LOG -Encoding utf8
        if ($lines.Count -gt 400) {
            $lines | Select-Object -Last 400 | Set-Content $LOG -Encoding utf8
        }
    }
}
exit $exit
