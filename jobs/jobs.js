document.addEventListener('DOMContentLoaded', () => {
  const els = {
    d: {
      region: document.getElementById('region-select'),
      sigungu: document.getElementById('sigungu-select'),
      keyword: document.getElementById('keyword-input'),
      searchBtn: document.getElementById('search-btn')
    },
    m: {
      region: document.getElementById('m-region-select'),
      sigungu: document.getElementById('m-sigungu-select'),
      keyword: document.getElementById('m-keyword-input'),
      searchBtn: document.getElementById('m-search-btn')
    },
    filterChips: document.getElementById('filter-chips'),
    sortSelect: document.getElementById('sort-select'),
    grid: document.getElementById('job-grid'),
    resultCount: document.getElementById('result-count'),
    emptyState: document.getElementById('empty-state'),
    pagination: document.getElementById('pagination'),
    prevPageBtn: document.getElementById('prev-page'),
    nextPageBtn: document.getElementById('next-page'),
    pageNumbers: document.getElementById('page-numbers'),
    pageInfo: document.getElementById('page-info'),
    modal: document.getElementById('job-modal'),
    closeBtn: document.querySelector('.close-btn'),
    statTotal: document.getElementById('stat-total'),
    statToday: document.getElementById('stat-today'),
    statWage: document.getElementById('stat-wage')
  };

  let state = {
    region: '',
    sigungu: '',
    keyword: '',
    page: 1,
    pageSize: 20,
    filters: new Set(),
    sort: 'latest',
    regionsData: { sido: [], sigunguBySido: {} }
  };

  let jobsData = []; // Full 1000 items (Static or API)
  let currentTotal = 0;

  // Initialize
  init();

  async function init() {
    parseURLParams();
    syncUI();
    
    // 1. Instantly load static regions
    fetchStaticRegions();
    
    // 2. Instantly load static jobs & render SWR
    renderSkeletons();
    loadJobsSWR();

    setupEventListeners();
  }

  function parseURLParams() {
    const params = new URLSearchParams(window.location.search);
    state.region = params.get('region') || '';
    state.sigungu = params.get('sigungu') || '';
    state.keyword = params.get('keyword') || '';
    state.page = parseInt(params.get('page')) || 1;
    state.sort = params.get('sort') || 'latest';
    
    const f = params.get('filters');
    if (f) f.split(',').forEach(x => state.filters.add(x));
  }

  function updateURL() {
    const params = new URLSearchParams();
    if (state.region) params.set('region', state.region);
    if (state.sigungu) params.set('sigungu', state.sigungu);
    if (state.keyword) params.set('keyword', state.keyword);
    if (state.page > 1) params.set('page', state.page);
    if (state.sort && state.sort !== 'latest') params.set('sort', state.sort);
    if (state.filters.size > 0) params.set('filters', Array.from(state.filters).join(','));
    
    window.history.replaceState({}, '', `${window.location.pathname}?${params.toString()}`);
  }

  function syncUI() {
    els.d.region.value = state.region;
    els.m.region.value = state.region;
    els.d.keyword.value = state.keyword;
    els.m.keyword.value = state.keyword;
    els.sortSelect.value = state.sort;
    
    document.querySelectorAll('.chip').forEach(chip => {
      chip.classList.toggle('active', state.filters.has(chip.dataset.filter));
    });
  }

  function updateTitleSEO() {
    const title = `요양보호사 일자리 ${state.region ? state.region : '전국'} - yositong`;
    document.title = title;
  }

  async function fetchStaticRegions() {
    try {
      const res = await fetch('/data/welfare-regions.json');
      if (res.ok) {
        state.regionsData = await res.json();
        populateRegions();
        if (state.region) {
          populateSigungu(state.region);
          els.d.sigungu.value = state.sigungu;
          els.m.sigungu.value = state.sigungu;
        }
      }
    } catch(e) { console.error('Static regions failed:', e); }
    
    // Background refresh
    fetch('/api/welfare/regions').then(res => res.json()).then(data => {
      if (data && data.sido) {
        state.regionsData = data;
        populateRegions();
        if (state.region) {
          populateSigungu(state.region);
          els.d.sigungu.value = state.sigungu;
          els.m.sigungu.value = state.sigungu;
        }
      }
    }).catch(console.error);
  }

  function populateRegions() {
    const opts = '<option value="">시/도 전체</option>' + 
      (state.regionsData.sido || []).map(s => `<option value="${s.name}">${s.name} (${s.count})</option>`).join('');
    els.d.region.innerHTML = opts;
    els.m.region.innerHTML = opts;
    els.d.region.value = state.region;
    els.m.region.value = state.region;
  }

  function populateSigungu(sido) {
    if (!sido || !state.regionsData.sigunguBySido[sido]) {
      els.d.sigungu.innerHTML = '<option value="">시/군/구</option>';
      els.m.sigungu.innerHTML = '<option value="">시/군/구</option>';
      els.d.sigungu.disabled = true;
      els.m.sigungu.disabled = true;
      return;
    }
    const opts = '<option value="">시/군/구 전체</option>' + 
      state.regionsData.sigunguBySido[sido].map(s => `<option value="${s.name}">${s.name} (${s.count})</option>`).join('');
    
    els.d.sigungu.innerHTML = opts;
    els.m.sigungu.innerHTML = opts;
    els.d.sigungu.disabled = false;
    els.m.sigungu.disabled = false;
  }

  // SWR Pattern Logic
  async function loadJobsSWR() {
    // 1. Instantly fetch static build data
    try {
      const res = await fetch('/data/welfare.json');
      if (res.ok) {
        jobsData = await res.json();
        applyClientFiltersAndRender();
      }
    } catch (e) {
      console.error('Static JSON fallback failed', e);
    }

    // 2. Background fetch fresh data from KV/API
    try {
      const res = await fetch('/api/welfare?page=1&pageSize=1000');
      if (res.ok) {
        const fresh = await res.json();
        if (fresh.items && fresh.items.length > 0) {
          jobsData = fresh.items;
          applyClientFiltersAndRender(true); // true means animate fade-in
        }
      }
    } catch (e) {
      console.error('API Background fetch failed', e);
    }
  }

  function executeSearch() {
    syncUI();
    updateURL();
    updateTitleSEO();
    applyClientFiltersAndRender(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function setupEventListeners() {
    const handleRegionChange = (e) => {
      state.region = e.target.value;
      state.sigungu = '';
      populateSigungu(state.region);
    };
    const handleSearchClick = (keywordInput) => () => {
      state.keyword = keywordInput.value;
      state.page = 1;
      executeSearch();
    };

    els.d.region.addEventListener('change', handleRegionChange);
    els.m.region.addEventListener('change', handleRegionChange);
    
    els.d.sigungu.addEventListener('change', (e) => state.sigungu = e.target.value);
    els.m.sigungu.addEventListener('change', (e) => state.sigungu = e.target.value);

    els.d.searchBtn.addEventListener('click', handleSearchClick(els.d.keyword));
    els.m.searchBtn.addEventListener('click', handleSearchClick(els.m.keyword));
    
    const handleKeyEnter = (keywordInput) => (e) => {
      if (e.key === 'Enter') {
        state.keyword = keywordInput.value;
        state.page = 1;
        executeSearch();
      }
    };
    els.d.keyword.addEventListener('keypress', handleKeyEnter(els.d.keyword));
    els.m.keyword.addEventListener('keypress', handleKeyEnter(els.m.keyword));

    els.filterChips.addEventListener('click', (e) => {
      if (e.target.classList.contains('chip')) {
        const filter = e.target.dataset.filter;
        if (state.filters.has(filter)) state.filters.delete(filter);
        else state.filters.add(filter);
        state.page = 1;
        executeSearch();
      }
    });

    els.sortSelect.addEventListener('change', (e) => {
      state.sort = e.target.value;
      state.page = 1;
      executeSearch();
    });

    els.prevPageBtn.addEventListener('click', () => {
      if (state.page > 1) { state.page--; executeSearch(); }
    });
    els.nextPageBtn.addEventListener('click', () => {
      const maxPage = Math.ceil(currentTotal / state.pageSize);
      if (state.page < maxPage) { state.page++; executeSearch(); }
    });

    els.closeBtn.addEventListener('click', () => els.modal.classList.remove('open'));
    window.addEventListener('click', (e) => {
      if (e.target === els.modal) els.modal.classList.remove('open');
    });
  }

  function applyClientFiltersAndRender(animate = false) {
    if (!jobsData || jobsData.length === 0) return;

    let filtered = jobsData;

    if (state.region) filtered = filtered.filter(item => item.sido === state.region);
    if (state.sigungu) filtered = filtered.filter(item => item.sigungu === state.sigungu);
    
    if (state.keyword) {
      const kw = state.keyword.toLowerCase();
      filtered = filtered.filter(item => {
        return (item.title && item.title.toLowerCase().includes(kw)) ||
               (item.companyName && item.companyName.toLowerCase().includes(kw)) ||
               (item.dtyCntn && item.dtyCntn.toLowerCase().includes(kw)) ||
               (item.address && item.address.toLowerCase().includes(kw));
      });
    }

    if (state.filters.size > 0) {
      filtered = filtered.filter(item => {
        const emp = item.employType || '';
        const work = item.workType || '';
        const ins = item.insurance || {};
        let pass = true;
        if (state.filters.has('정규직') && !emp.includes('정규') && !emp.includes('상용')) pass = false;
        if (state.filters.has('계약직') && !emp.includes('계약') && !emp.includes('일용')) pass = false;
        if (state.filters.has('시간제') && !work.includes('시간') && !work.includes('단시간')) pass = false;
        if (state.filters.has('3교대') && !work.includes('교대')) pass = false;
        if (state.filters.has('주간') && !work.includes('주간') && work.includes('야간')) pass = false;
        if (state.filters.has('야간') && !work.includes('야간')) pass = false;
        if (state.filters.has('4대보험')) {
          if (ins.health !== 'Y' || ins.pension !== 'Y' || ins.employ !== 'Y' || ins.industry !== 'Y') pass = false;
        }
        return pass;
      });
    }

    if (state.sort === 'deadline') {
      filtered.sort((a, b) => {
        const ad = a.deadline && a.deadline !== '99999999' ? a.deadline : '99999999';
        const bd = b.deadline && b.deadline !== '99999999' ? b.deadline : '99999999';
        return ad.localeCompare(bd);
      });
    } else if (state.sort === 'wage') {
      filtered.sort((a, b) => {
        const aw = parseInt((a.wageCond || '').replace(/[^0-9]/g, '')) || 0;
        const bw = parseInt((b.wageCond || '').replace(/[^0-9]/g, '')) || 0;
        return bw - aw;
      });
    } else {
      filtered.sort((a, b) => {
        const ap = a.postedAt || '00000000';
        const bp = b.postedAt || '00000000';
        return bp.localeCompare(ap);
      });
    }

    currentTotal = filtered.length;
    animateCountUp(els.resultCount, parseInt(els.resultCount.textContent) || 0, currentTotal);

    if (!state.region && !state.keyword && state.filters.size === 0) {
      animateCountUp(els.statTotal, parseInt(els.statTotal.textContent.replace(/,/g,'')) || 0, jobsData.length);
      
      const todayCount = jobsData.filter(i => isTodayOrYesterday(i.postedAt)).length;
      animateCountUp(els.statToday, parseInt(els.statToday.textContent.replace(/,/g,'')) || 0, todayCount);

      let totalWage = 0, wageCount = 0;
      jobsData.forEach(i => {
        if (i.wageCond && i.wageCond.includes('시급')) {
           const num = parseInt(i.wageCond.replace(/[^0-9]/g, ''));
           if (num > 5000 && num < 50000) { totalWage += num; wageCount++; }
        }
      });
      const avgWage = wageCount > 0 ? Math.round(totalWage/wageCount) : 12500;
      
      const prevWage = parseInt(els.statWage.textContent.replace(/[^0-9]/g, '')) || 0;
      animateCountUp(els.statWage, prevWage, avgWage, '원');
    }

    const start = (state.page - 1) * state.pageSize;
    const paginated = filtered.slice(start, start + state.pageSize);

    renderJobs(paginated, animate);
    updatePagination(currentTotal);
    updateJSONLD(paginated);
  }

  function animateCountUp(el, start, end, suffix = '') {
    if (start === end) {
      el.textContent = end.toLocaleString() + suffix;
      return;
    }
    const duration = 800;
    const startTime = performance.now();
    const step = (now) => {
      const progress = Math.min((now - startTime) / duration, 1);
      const current = Math.floor(start + (end - start) * progress);
      el.textContent = current.toLocaleString() + suffix;
      if (progress < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }

  function renderSkeletons() {
    const html = Array.from({ length: 6 }).map(() => `
      <div class="sk-card">
        <div class="sk-header">
          <div class="skeleton-box sk-badge"></div>
          <div class="skeleton-box sk-badge2"></div>
        </div>
        <div class="skeleton-box sk-title"></div>
        <div class="skeleton-box sk-title2"></div>
        <div style="margin-top: auto">
          <div class="skeleton-box sk-meta"></div>
          <div class="skeleton-box sk-meta-short"></div>
        </div>
      </div>
    `).join('');
    els.grid.innerHTML = html;
  }

  function isTodayOrYesterday(postedAt) {
    if (!postedAt) return false;
    const today = new Date();
    const yStr = `${today.getFullYear()}${String(today.getMonth()+1).padStart(2,'0')}${String(today.getDate()).padStart(2,'0')}`;
    today.setDate(today.getDate() - 1);
    const ydyStr = `${today.getFullYear()}${String(today.getMonth()+1).padStart(2,'0')}${String(today.getDate()).padStart(2,'0')}`;
    return postedAt === yStr || postedAt === ydyStr;
  }

  function getFacilityBadge(type) {
    if (type === 'care') return `<div class="fclt-badge care"><img src="/jobs/assets/icons/icon-care.svg" alt="">요양원</div>`;
    if (type === 'home') return `<div class="fclt-badge home"><img src="/jobs/assets/icons/icon-home.svg" alt="">방문요양</div>`;
    if (type === 'day') return `<div class="fclt-badge day"><img src="/jobs/assets/icons/icon-day.svg" alt="">주간보호</div>`;
    return `<div class="fclt-badge other"><img src="/jobs/assets/icons/icon-other.svg" alt="">복지시설</div>`;
  }

  function getStatusBadge(postedAt, deadline) {
    if (isTodayOrYesterday(postedAt)) return '<span class="badge today">오늘등록</span>';
    const dday = calculateDDayValue(deadline);
    if (dday >= 0 && dday <= 3) return '<span class="badge urgent">마감임박</span>';
    return '';
  }

  function calculateDDayValue(deadline) {
    if (!deadline || deadline === '99999999' || deadline.length !== 8) return -1;
    const dDateObj = new Date(deadline.slice(0,4), parseInt(deadline.slice(4,6))-1, deadline.slice(6,8));
    const today = new Date(); today.setHours(0,0,0,0);
    return Math.ceil((dDateObj - today) / 86400000);
  }

  function calculateDDayStr(deadline) {
    const val = calculateDDayValue(deadline);
    if (val === -1) return '상시채용';
    if (val === 0) return 'D-Day';
    if (val > 0) return `D-${val}`;
    return '마감';
  }

  function renderJobs(items, animate = false) {
    if (items.length === 0) {
      els.grid.innerHTML = '';
      els.emptyState.style.display = 'block';
      return;
    }
    els.emptyState.style.display = 'none';

    els.grid.innerHTML = items.map((item, index) => {
      const badge = getStatusBadge(item.postedAt, item.deadline);
      const fcltBadge = getFacilityBadge(item.facilityType);
      
      const ins = item.insurance || {};
      const [h, p, e, i] = [ins.health, ins.pension, ins.employ, ins.industry].map(x => x === 'Y' ? 'active' : 'inactive');

      return `
        <div class="post-card ${animate ? 'fade-in' : ''}" data-index="${index}" style="animation-delay: ${index * 0.03}s">
          <div class="card-header">${fcltBadge}${badge}</div>
          <div class="company">${item.companyName}</div>
          <h3>${item.title}</h3>
          
          <div class="meta-row"><img src="/jobs/assets/icons/pin.svg"> <span>${item.sido} ${item.sigungu || ''}</span></div>
          <div class="meta-row"><img src="/jobs/assets/icons/won.svg"> <span>${item.salary || '회사내규'}</span></div>
          <div class="meta-row"><img src="/jobs/assets/icons/clock.svg"> <span>${item.workType || '상세조회'}</span></div>
          
          <div class="card-footer">
            <div class="insurances">
              <div class="ins-badge ${h}"><img src="/jobs/assets/icons/shield-check.svg"></div>
            </div>
            <div class="card-more">상세보기 &rarr;</div>
          </div>
        </div>
      `;
    }).join('');

    document.querySelectorAll('.post-card').forEach(card => {
      card.addEventListener('click', () => openModal(items[card.dataset.index]));
    });
  }

  function createSection(icon, title, content) {
    if (!content) return '';
    return `<div class="section-item">
      <div class="section-icon-box"><img src="/jobs/assets/icons/${icon}.svg"></div>
      <div class="section-content"><h4>${title}</h4><p>${content}</p></div>
    </div>`;
  }

  function openModal(item) {
    document.getElementById('modal-badge-container').innerHTML = getFacilityBadge(item.facilityType);
    document.getElementById('modal-company').textContent = item.companyName;
    document.getElementById('modal-title').textContent = item.title;
    document.getElementById('modal-wage').textContent = item.salary || '회사내규';
    document.getElementById('modal-dday').textContent = calculateDDayStr(item.deadline);
    // 지원하기 버튼: 담당자 전화 > 시설 전화 > 외부 링크 순
    const applyBtn = document.getElementById('modal-apply-btn');
    const applyLabel = document.getElementById('modal-apply-label');
    const phoneRaw = (item.crgrTelNo || item.tel || '').replace(/[^0-9]/g, '');
    if (phoneRaw && phoneRaw.length >= 8) {
      const phoneDisplay = item.crgrTelNo || item.tel;
      applyBtn.href = 'tel:' + phoneRaw;
      applyBtn.removeAttribute('target');
      applyLabel.textContent = '전화로 지원하기 ' + phoneDisplay;
    } else {
      applyBtn.href = item.sourceUrl || 'http://ceu.ssis.go.kr';
      applyBtn.setAttribute('target', '_blank');
      applyBtn.setAttribute('rel', 'noopener');
      applyLabel.textContent = '공고 출처 사이트로 이동';
    }

    const insArr = [];
    if (item.insurance?.health === 'Y') insArr.push('건강보험');
    if (item.insurance?.pension === 'Y') insArr.push('국민연금');
    if (item.insurance?.employ === 'Y') insArr.push('고용보험');
    if (item.insurance?.industry === 'Y') insArr.push('산재보험');

    const addressLink = `<a href="https://map.naver.com/v5/search/${encodeURIComponent(item.address || item.region)}" target="_blank">${item.address || item.region}</a>`;
    const telLink = item.tel ? `<a href="tel:${item.tel.replace(/-/g, '')}">${item.tel}</a>` : '';
    
    let crgrText = item.crgrNm || '담당자';
    if (item.crgrTelNo) crgrText += ` / <a href="tel:${item.crgrTelNo.replace(/-/g, '')}">${item.crgrTelNo}</a>`;
    if (item.crgrMailAddr) crgrText += ` / <a href="mailto:${item.crgrMailAddr}">${item.crgrMailAddr}</a>`;

    const workTime = (item.wrkBgnTm && item.wrkEndTm) ? `${item.wrkBgnTm.slice(0,2)}:${item.wrkBgnTm.slice(2,4)} ~ ${item.wrkEndTm.slice(0,2)}:${item.wrkEndTm.slice(2,4)}` : '';
    const workCond = `${item.workType || ''} ${item.employType ? '('+item.employType+')' : ''} ${workTime ? '\n'+workTime : ''}`.trim();

    let sHtml = '';
    sHtml += createSection('briefcase', '직무 내용', item.dtyCntn || '요양보호사 업무');
    sHtml += createSection('check-circle', '응시 자격', item.applyQlfc || '요양보호사 자격증 1급 필수');
    sHtml += createSection('coin', '임금 조건', item.wageCond || '회사내규에 따름');
    sHtml += createSection('clock-outline', '근무 조건', workCond);
    sHtml += createSection('building', '시설 정보', `${addressLink}${telLink ? '\nTel: ' + telLink : ''}`);
    sHtml += createSection('shield', '4대보험', insArr.length > 0 ? insArr.join(', ') : '해당없음');
    sHtml += createSection('document', '제출 서류', item.sbmtPaper || '이력서, 자격증 사본');
    sHtml += createSection('phone', '담당자', crgrText);

    document.getElementById('modal-sections').innerHTML = sHtml;
    els.modal.classList.add('open');
  }

  function updatePagination(total) {
    const maxPage = Math.ceil(total / state.pageSize) || 1;
    els.pageInfo.textContent = `${state.page} / ${maxPage}`;
    els.prevPageBtn.disabled = state.page === 1;
    els.nextPageBtn.disabled = state.page === maxPage;

    let pHtml = '';
    let start = Math.max(1, state.page - 2);
    let end = Math.min(maxPage, start + 4);
    if (end - start < 4) start = Math.max(1, end - 4);

    for (let i = start; i <= end; i++) {
      pHtml += `<button class="page-btn ${i === state.page ? 'active' : ''}" data-p="${i}">${i}</button>`;
    }
    els.pageNumbers.innerHTML = pHtml;

    els.pageNumbers.querySelectorAll('.page-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        state.page = parseInt(e.target.dataset.p);
        executeSearch();
      });
    });
  }

  function updateJSONLD(items) {
    const schema = {
      "@context": "https://schema.org",
      "@type": "ItemList",
      "itemListElement": items.map((item, i) => ({
        "@type": "ListItem", "position": i + 1,
        "item": {
          "@type": "JobPosting", "title": item.title,
          "hiringOrganization": { "@type": "Organization", "name": item.companyName },
          "jobLocation": { "@type": "Place", "address": item.address || item.region },
          "datePosted": item.postedAt, "validThrough": item.deadline, "employmentType": item.employType
        }
      }))
    };
    const script = document.getElementById('json-ld-placeholder');
    if (script) script.textContent = JSON.stringify(schema);
  }
});
