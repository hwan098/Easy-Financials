// ── 상태 관리 ──────────────────────────────────────
const state = {
    selectedCompany: null,
    currentPage: 1,
    totalPages: 1,
    charts: {},          // revenueChart, structureChart, marginChart
    lastFinancialData: null
};

// ── DOM 요소 ──────────────────────────────────────
const elements = {
    searchInput: document.getElementById('searchInput'),
    searchResults: document.getElementById('searchResults'),
    searchBtn: document.getElementById('searchBtn'),
    companyInfo: document.getElementById('companyInfo'),
    mainContent: document.getElementById('mainContent'),
    companyName: document.getElementById('companyName'),
    companyEngName: document.getElementById('companyEngName'),
    corpCode: document.getElementById('corpCode'),
    stockCode: document.getElementById('stockCode'),
    disclosureBody: document.getElementById('disclosureBody'),
    financialBody: document.getElementById('financialBody'),
    loadDisclosureBtn: document.getElementById('loadDisclosureBtn'),
    loadFinancialBtn: document.getElementById('loadFinancialBtn'),
    startDate: document.getElementById('startDate'),
    endDate: document.getElementById('endDate'),
    disclosureType: document.getElementById('disclosureType'),
    reportType: document.getElementById('reportType'),
    disclosurePagination: document.getElementById('disclosurePagination'),
    financialSummaryCards: document.getElementById('financialSummaryCards'),
    financialCharts: document.getElementById('financialCharts'),
    aiAnalysisSection: document.getElementById('aiAnalysisSection'),
    aiAnalyzeBtn: document.getElementById('aiAnalyzeBtn')
};

// ── 초기화 ──────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
    initializeDates();
    setupEventListeners();
});

function initializeDates() {
    const today = new Date();
    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(today.getFullYear() - 1);
    elements.endDate.value = formatDate(today);
    elements.startDate.value = formatDate(oneYearAgo);
}

function formatDate(date) {
    return date.toISOString().split('T')[0];
}

// ── 이벤트 리스너 ────────────────────────────────
function setupEventListeners() {
    let searchTimeout;
    elements.searchInput.addEventListener('input', (e) => {
        clearTimeout(searchTimeout);
        const query = e.target.value.trim();
        if (query.length < 1) { hideSearchResults(); return; }
        searchTimeout = setTimeout(() => searchCompanies(query), 300);
    });

    elements.searchBtn.addEventListener('click', () => {
        const q = elements.searchInput.value.trim();
        if (q) searchCompanies(q);
    });

    elements.searchInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            const q = elements.searchInput.value.trim();
            if (q) searchCompanies(q);
        }
    });

    document.addEventListener('click', (e) => {
        if (!elements.searchInput.contains(e.target) && !elements.searchResults.contains(e.target)) {
            hideSearchResults();
        }
    });

    elements.loadDisclosureBtn.addEventListener('click', () => {
        if (state.selectedCompany) { state.currentPage = 1; loadDisclosures(); }
    });

    elements.loadFinancialBtn.addEventListener('click', () => {
        if (state.selectedCompany) loadFinancials();
    });

    elements.aiAnalyzeBtn.addEventListener('click', () => {
        if (state.lastFinancialData) showFinancialAIAnalysis();
    });
}

// ── 검색 ──────────────────────────────────────────
async function searchCompanies(query) {
    try {
        const res = await fetch(`/api/company/search?q=${encodeURIComponent(query)}&limit=10`);
        displaySearchResults(await res.json());
    } catch (e) { console.error('검색 오류:', e); }
}

function displaySearchResults(companies) {
    if (!companies.length) {
        elements.searchResults.innerHTML = '<div class="search-result-item text-muted">검색 결과가 없습니다</div>';
        elements.searchResults.classList.add('show');
        return;
    }
    elements.searchResults.innerHTML = companies.map(c => `
        <div class="search-result-item" onclick="selectCompany('${c.corp_code}')">
            <div class="d-flex justify-content-between align-items-center">
                <div>
                    <span class="company-name">${c.corp_name}</span>
                    ${c.stock_code ? `<span class="badge bg-primary stock-badge ms-2">${c.stock_code}</span>` : ''}
                </div>
                <span class="company-code">${c.corp_code}</span>
            </div>
            ${c.corp_eng_name ? `<div class="company-code">${c.corp_eng_name}</div>` : ''}
        </div>
    `).join('');
    elements.searchResults.classList.add('show');
}

function hideSearchResults() { elements.searchResults.classList.remove('show'); }

// ── 회사 선택 ─────────────────────────────────────
async function selectCompany(corpCode) {
    try {
        const res = await fetch(`/api/company/${corpCode}`);
        const company = await res.json();
        state.selectedCompany = company;

        elements.companyName.textContent = company.corp_name;
        elements.companyEngName.textContent = company.corp_eng_name || '-';
        elements.corpCode.textContent = company.corp_code;
        elements.stockCode.textContent = company.stock_code || '비상장';

        elements.companyInfo.style.display = 'block';
        elements.mainContent.style.display = 'block';
        elements.companyInfo.classList.add('fade-in');

        hideSearchResults();
        elements.searchInput.value = company.corp_name;
        loadDisclosures();
    } catch (e) {
        console.error('회사 정보 로드 오류:', e);
        alert('회사 정보를 불러오는데 실패했습니다.');
    }
}

// ══════════════════════════════════════════════════
//   공시 목록
// ══════════════════════════════════════════════════
async function loadDisclosures() {
    if (!state.selectedCompany) return;
    const corpCode = state.selectedCompany.corp_code;
    const sd = elements.startDate.value.replace(/-/g, '');
    const ed = elements.endDate.value.replace(/-/g, '');
    const dt = elements.disclosureType.value;

    elements.disclosureBody.innerHTML = `<tr><td colspan="6" class="text-center">
        <div class="spinner-border spinner-border-sm text-primary"></div>
        <span class="ms-2">공시 목록을 불러오는 중...</span></td></tr>`;

    try {
        let url = `/api/disclosure/list/${corpCode}?bgn_de=${sd}&end_de=${ed}&page_no=${state.currentPage}&page_count=20`;
        if (dt) url += `&pblntf_ty=${dt}`;
        const res = await fetch(url);
        displayDisclosures(await res.json());
    } catch (e) {
        console.error('공시 목록 로드 오류:', e);
        elements.disclosureBody.innerHTML = `<tr><td colspan="6" class="text-center text-danger">공시 목록을 불러오는데 실패했습니다.</td></tr>`;
    }
}

function displayDisclosures(data) {
    if (!data.list || !data.list.length) {
        elements.disclosureBody.innerHTML = `<tr><td colspan="6" class="text-center text-muted">해당 기간에 공시가 없습니다.</td></tr>`;
        elements.disclosurePagination.style.display = 'none';
        return;
    }
    state.totalPages = data.total_page || 1;

    elements.disclosureBody.innerHTML = data.list.map(item => `
        <tr>
            <td>${formatDisplayDate(item.rcept_dt)}</td>
            <td class="report-name">
                <a href="https://dart.fss.or.kr/dsaf001/main.do?rcpNo=${item.rcept_no}" target="_blank">${item.report_nm}</a>
            </td>
            <td>${item.flr_nm || '-'}</td>
            <td><span class="badge bg-secondary">${getDisclosureTypeName(item.pblntf_ty)}</span></td>
            <td>
                <a href="https://dart.fss.or.kr/dsaf001/main.do?rcpNo=${item.rcept_no}" target="_blank" class="btn btn-sm btn-outline-primary">
                    <i class="bi bi-box-arrow-up-right"></i>
                </a>
            </td>
            <td>
                <button class="btn btn-sm btn-outline-info" onclick="showAISummary('${item.rcept_no}', '${escapeHtml(item.report_nm)}')">
                    <i class="bi bi-robot"></i>
                </button>
            </td>
        </tr>
    `).join('');

    updatePagination();
}

function updatePagination() {
    if (state.totalPages <= 1) { elements.disclosurePagination.style.display = 'none'; return; }
    elements.disclosurePagination.style.display = 'block';
    const pagination = elements.disclosurePagination.querySelector('.pagination');
    const sp = Math.max(1, state.currentPage - 2);
    const ep = Math.min(state.totalPages, sp + 4);
    let html = `<li class="page-item ${state.currentPage === 1 ? 'disabled' : ''}"><a class="page-link" onclick="changePage(${state.currentPage - 1})">이전</a></li>`;
    for (let i = sp; i <= ep; i++) {
        html += `<li class="page-item ${i === state.currentPage ? 'active' : ''}"><a class="page-link" onclick="changePage(${i})">${i}</a></li>`;
    }
    html += `<li class="page-item ${state.currentPage === state.totalPages ? 'disabled' : ''}"><a class="page-link" onclick="changePage(${state.currentPage + 1})">다음</a></li>`;
    pagination.innerHTML = html;
}

function changePage(page) {
    if (page < 1 || page > state.totalPages) return;
    state.currentPage = page;
    loadDisclosures();
}

// ══════════════════════════════════════════════════
//   AI 공시 요약 (본문 기반)
// ══════════════════════════════════════════════════
async function showAISummary(rceptNo, reportName) {
    const modal = new bootstrap.Modal(document.getElementById('aiSummaryModal'));
    document.getElementById('summaryTitle').textContent = reportName;
    document.getElementById('summaryContent').innerHTML = `
        <div class="text-center py-4">
            <div class="spinner-border text-primary" role="status"></div>
            <p class="mt-3 fw-semibold">DART에서 공시 원문을 가져와 AI가 분석 중입니다...</p>
            <p class="text-muted small">공시 본문 다운로드 + AI 요약에 10~30초 정도 걸릴 수 있습니다.</p>
        </div>`;
    modal.show();

    try {
        const res = await fetch('/api/ai/summarize', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ rceptNo, title: reportName })
        });

        if (!res.ok) {
            let errMsg = `서버 오류 (${res.status})`;
            try { const d = await res.json(); errMsg = d.error || errMsg; } catch {}
            throw new Error(errMsg);
        }

        const data = await res.json();

        if (data.error) {
            document.getElementById('summaryContent').innerHTML = `
                <div class="alert alert-warning">
                    <i class="bi bi-exclamation-triangle me-2"></i>${data.error}
                </div>`;
        } else {
            document.getElementById('summaryContent').innerHTML = `<div class="summary-text">${formatMarkdown(data.summary)}</div>`;
        }
    } catch (e) {
        document.getElementById('summaryContent').innerHTML = `
            <div class="alert alert-danger">
                <i class="bi bi-x-circle me-2"></i>요약 생성 실패: ${e.message}
            </div>`;
    }
}

// ══════════════════════════════════════════════════
//   재무제표 로드 & 시각화
// ══════════════════════════════════════════════════
async function loadFinancials() {
    if (!state.selectedCompany) return;
    const corpCode = state.selectedCompany.corp_code;
    const reportType = elements.reportType.value;

    elements.financialBody.innerHTML = `<tr><td colspan="5" class="text-center">
        <div class="spinner-border spinner-border-sm text-primary"></div>
        <span class="ms-2">재무제표를 불러오는 중...</span></td></tr>`;

    elements.financialSummaryCards.style.display = 'none';
    elements.financialCharts.style.display = 'none';
    elements.aiAnalysisSection.style.display = 'none';

    try {
        const res = await fetch(`/api/financial/${corpCode}?reprt_code=${reportType}`);
        const data = await res.json();
        state.lastFinancialData = data;
        displayFinancials(data);
    } catch (e) {
        console.error('재무제표 로드 오류:', e);
        elements.financialBody.innerHTML = `<tr><td colspan="5" class="text-center text-danger">재무제표를 불러오는데 실패했습니다.</td></tr>`;
    }
}

function displayFinancials(data) {
    if (!data.financial_data || !data.financial_data.length) {
        elements.financialBody.innerHTML = `<tr><td colspan="5" class="text-center text-muted">재무제표 데이터가 없습니다.</td></tr>`;
        return;
    }

    const years = data.financial_data.map(d => d.year).sort((a, b) => b - a);
    document.getElementById('year1Col').textContent = years[0] ? `${years[0]}년` : '-';
    document.getElementById('year2Col').textContent = years[1] ? `${years[1]}년` : '-';
    document.getElementById('year3Col').textContent = years[2] ? `${years[2]}년` : '-';

    // 연결재무제표(CFS) 우선으로 데이터 맵 구성
    const financialMap = {};
    const fsSource = {};
    // DART 계정명 → 통일 계정명 매핑
    const nameMap = {
        '당기순이익(손실)': '당기순이익',
        '법인세차감전 순이익': '법인세차감전순이익',
        '이익잉여금(결손금)': '이익잉여금'
    };
    data.financial_data.forEach(yd => {
        yd.data.forEach(item => {
            const acctName = nameMap[item.account_nm] || item.account_nm;
            const key = `${acctName}_${yd.year}`;
            const existing = fsSource[key];
            if (!existing || item.fs_div === 'CFS') {
                if (!financialMap[acctName]) financialMap[acctName] = {};
                financialMap[acctName][yd.year] = item.thstrm_amount;
                fsSource[key] = item.fs_div;
            }
        });
    });

    // 1) 핵심 지표 카드
    buildSummaryCards(financialMap, years);

    // 2) AI 분석 버튼 (카드 바로 아래, 눈에 잘 띄게)
    elements.aiAnalysisSection.style.display = 'block';
    elements.aiAnalysisSection.classList.add('slide-up');

    // 3) 차트
    buildRevenueChart(financialMap, years);
    buildStructureChart(financialMap, years);
    buildMarginChart(financialMap, years);
    elements.financialCharts.style.display = 'block';
    elements.financialCharts.classList.add('slide-up');

    // 4) 상세 테이블 (변동률 포함)
    buildFinancialTable(financialMap, years);
}

// ── 핵심 지표 카드 ────────────────────────────────
function buildSummaryCards(fMap, years) {
    const items = [
        { key: '매출액',     cls: 'revenue',   icon: 'bi-cash-stack',    bg: '#3498db' },
        { key: '영업이익',   cls: 'operating',  icon: 'bi-graph-up-arrow', bg: '#e74c3c' },
        { key: '당기순이익', cls: 'net-income', icon: 'bi-wallet2',       bg: '#2ecc71' },
        { key: '자산총계',   cls: 'assets',     icon: 'bi-bank',          bg: '#9b59b6' }
    ];

    let html = '';
    items.forEach(item => {
        const cur = parseAmount(fMap[item.key]?.[years[0]]);
        const prev = parseAmount(fMap[item.key]?.[years[1]]);
        const change = calcChange(cur, prev);

        html += `
        <div class="col-lg-3 col-md-6">
            <div class="metric-card ${item.cls} slide-up">
                <div class="metric-icon" style="background:${item.bg}">
                    <i class="bi ${item.icon}"></i>
                </div>
                <div class="metric-label">${item.key}</div>
                <div class="metric-value">${formatBigNumber(cur)}</div>
                ${change !== null ? `
                <span class="metric-change ${change >= 0 ? 'up' : 'down'}">
                    <i class="bi ${change >= 0 ? 'bi-caret-up-fill' : 'bi-caret-down-fill'}"></i>
                    ${change >= 0 ? '+' : ''}${change.toFixed(1)}%
                </span>` : '<span class="metric-change flat">- 전기 데이터 없음</span>'}
                <div class="metric-sub">${years[0]}년 기준 (전기 대비)</div>
            </div>
        </div>`;
    });

    elements.financialSummaryCards.innerHTML = html;
    elements.financialSummaryCards.style.display = 'flex';
}

// ── 매출·이익 추이 차트 ──────────────────────────
function buildRevenueChart(fMap, years) {
    destroyChart('revenueChart');
    const sorted = [...years].sort((a, b) => a - b);
    const ctx = document.getElementById('revenueChart').getContext('2d');

    const datasets = [
        { label: '매출액',     key: '매출액',     bg: 'rgba(52,152,219,0.7)',  border: '#3498db' },
        { label: '영업이익',   key: '영업이익',   bg: 'rgba(231,76,60,0.7)',   border: '#e74c3c' },
        { label: '당기순이익', key: '당기순이익', bg: 'rgba(46,204,113,0.7)',  border: '#2ecc71' }
    ].filter(d => fMap[d.key]).map(d => ({
        label: d.label,
        data: sorted.map(y => toEok(fMap[d.key][y])),
        backgroundColor: d.bg,
        borderColor: d.border,
        borderWidth: 2,
        borderRadius: 6
    }));

    state.charts.revenueChart = new Chart(ctx, {
        type: 'bar',
        data: { labels: sorted.map(y => `${y}년`), datasets },
        options: {
            responsive: true,
            interaction: { mode: 'index', intersect: false },
            plugins: {
                title: { display: true, text: '매출 & 이익 추이 (단위: 억원)', font: { size: 14, weight: 'bold' } },
                legend: { position: 'top' },
                tooltip: {
                    callbacks: {
                        label: ctx => `${ctx.dataset.label}: ${ctx.parsed.y?.toLocaleString() || 0}억원`
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: { callback: v => v.toLocaleString() + '억' },
                    grid: { color: 'rgba(0,0,0,0.05)' }
                },
                x: { grid: { display: false } }
            }
        }
    });
}

// ── 재무 구조 도넛 차트 ──────────────────────────
function buildStructureChart(fMap, years) {
    destroyChart('structureChart');
    const latestYear = years[0];
    const debt = Math.abs(toEok(fMap['부채총계']?.[latestYear]));
    const equity = Math.abs(toEok(fMap['자본총계']?.[latestYear]));

    if (!debt && !equity) return;

    const ctx = document.getElementById('structureChart').getContext('2d');
    state.charts.structureChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: ['부채', '자본'],
            datasets: [{
                data: [debt, equity],
                backgroundColor: ['rgba(231,76,60,0.75)', 'rgba(46,204,113,0.75)'],
                borderWidth: 2,
                borderColor: '#fff'
            }]
        },
        options: {
            responsive: true,
            cutout: '55%',
            plugins: {
                title: { display: true, text: `${latestYear}년 재무 구조`, font: { size: 14, weight: 'bold' } },
                legend: { position: 'bottom' },
                tooltip: {
                    callbacks: {
                        label: ctx => {
                            const total = debt + equity;
                            const pct = total ? ((ctx.parsed / total) * 100).toFixed(1) : 0;
                            return `${ctx.label}: ${ctx.parsed.toLocaleString()}억원 (${pct}%)`;
                        }
                    }
                }
            }
        }
    });
}

// ── 수익성 지표 라인 차트 ────────────────────────
function buildMarginChart(fMap, years) {
    destroyChart('marginChart');
    const sorted = [...years].sort((a, b) => a - b);
    const ctx = document.getElementById('marginChart').getContext('2d');

    const revenue = sorted.map(y => parseAmount(fMap['매출액']?.[y]));
    const opIncome = sorted.map(y => parseAmount(fMap['영업이익']?.[y]));
    const netIncome = sorted.map(y => parseAmount(fMap['당기순이익']?.[y]));

    const opMargin = sorted.map((_, i) => revenue[i] ? (opIncome[i] / revenue[i] * 100) : null);
    const netMargin = sorted.map((_, i) => revenue[i] ? (netIncome[i] / revenue[i] * 100) : null);

    state.charts.marginChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: sorted.map(y => `${y}년`),
            datasets: [
                {
                    label: '영업이익률',
                    data: opMargin,
                    backgroundColor: 'rgba(231,76,60,0.7)',
                    borderColor: '#e74c3c',
                    borderWidth: 2,
                    borderRadius: 6,
                    barPercentage: 0.5,
                    categoryPercentage: 0.6
                },
                {
                    label: '순이익률',
                    data: netMargin,
                    backgroundColor: 'rgba(46,204,113,0.7)',
                    borderColor: '#2ecc71',
                    borderWidth: 2,
                    borderRadius: 6,
                    barPercentage: 0.5,
                    categoryPercentage: 0.6
                }
            ]
        },
        options: {
            responsive: true,
            interaction: { mode: 'index', intersect: false },
            plugins: {
                title: { display: true, text: '수익성 지표 비교 (매출 대비 %)', font: { size: 14, weight: 'bold' } },
                legend: { position: 'top' },
                tooltip: {
                    callbacks: {
                        label: ctx => `${ctx.dataset.label}: ${ctx.parsed.y?.toFixed(1)}%`
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: { callback: v => v.toFixed(0) + '%' },
                    grid: { color: 'rgba(0,0,0,0.05)' }
                },
                x: { grid: { display: false } }
            }
        }
    });
}

// ── 상세 재무 테이블 (변동률 포함) ──────────────
function buildFinancialTable(fMap, years) {
    const keyItems = ['매출액', '영업이익', '당기순이익', '자산총계', '부채총계', '자본총계'];
    let html = '';

    keyItems.forEach(name => {
        const itemData = fMap[name];
        if (!itemData) return;

        const curVal = parseAmount(itemData[years[0]]);
        const prevVal = parseAmount(itemData[years[1]]);
        const change = calcChange(curVal, prevVal);

        let changeHtml = '<span class="change-badge flat">-</span>';
        if (change !== null) {
            const cls = change >= 0 ? 'up' : 'down';
            const icon = change >= 0 ? 'bi-caret-up-fill' : 'bi-caret-down-fill';
            changeHtml = `<span class="change-badge ${cls}"><i class="bi ${icon}"></i> ${change >= 0 ? '+' : ''}${change.toFixed(1)}%</span>`;
        }

        html += `<tr>
            <td><strong>${name}</strong></td>
            <td>${formatTableNumber(itemData[years[0]])}</td>
            <td>${formatTableNumber(itemData[years[1]])}</td>
            <td>${formatTableNumber(itemData[years[2]])}</td>
            <td class="text-center">${changeHtml}</td>
        </tr>`;
    });

    if (!html) {
        elements.financialBody.innerHTML = `<tr><td colspan="5" class="text-center text-muted">주요 재무 항목을 찾을 수 없습니다.</td></tr>`;
        return;
    }
    elements.financialBody.innerHTML = html;
}

// ══════════════════════════════════════════════════
//   AI 재무 분석
// ══════════════════════════════════════════════════
async function showFinancialAIAnalysis() {
    const data = state.lastFinancialData;
    if (!data || !data.financial_data?.length) return;

    const modal = new bootstrap.Modal(document.getElementById('aiFinancialModal'));
    const contentEl = document.getElementById('financialAnalysisContent');

    contentEl.innerHTML = `
        <div class="text-center py-5">
            <div class="spinner-border text-primary" style="width:3rem;height:3rem;"></div>
            <p class="mt-3 fw-semibold fs-5">AI가 재무제표를 분석하고 있습니다...</p>
            <p class="text-muted">누구나 이해할 수 있게 쉽게 풀어서 설명해드립니다.</p>
        </div>`;
    modal.show();

    elements.aiAnalyzeBtn.disabled = true;
    elements.aiAnalyzeBtn.innerHTML = '<div class="spinner-border spinner-border-sm me-2"></div>분석 중...';

    // 재무 데이터를 텍스트로 정리
    const financialText = buildFinancialText(data);

    try {
        const res = await fetch('/api/ai/analyze-financial', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                financialData: financialText,
                companyName: state.selectedCompany.corp_name
            })
        });

        if (!res.ok) {
            let errMsg = `서버 오류 (${res.status})`;
            try { const d = await res.json(); errMsg = d.error || errMsg; } catch {}
            throw new Error(errMsg);
        }

        const result = await res.json();

        if (result.error) {
            contentEl.innerHTML = `<div class="alert alert-warning"><i class="bi bi-exclamation-triangle me-2"></i>${result.error}</div>`;
        } else {
            contentEl.innerHTML = `<div class="ai-report">${formatMarkdown(result.analysis)}</div>`;
        }
    } catch (e) {
        contentEl.innerHTML = `<div class="alert alert-danger"><i class="bi bi-x-circle me-2"></i>분석 실패: ${e.message}</div>`;
    } finally {
        elements.aiAnalyzeBtn.disabled = false;
        elements.aiAnalyzeBtn.innerHTML = '<i class="bi bi-robot me-2"></i>AI 재무 분석 받기<small class="d-block mt-1 opacity-75">Gemini가 누구나 이해할 수 있게 분석해드립니다</small>';
    }
}

function buildFinancialText(data) {
    const years = data.financial_data.map(d => d.year).sort((a, b) => b - a);
    const fMap = {};
    data.financial_data.forEach(yd => {
        yd.data.forEach(item => {
            if (item.fs_div === 'CFS' || !fMap[item.account_nm]) {
                if (!fMap[item.account_nm]) fMap[item.account_nm] = {};
                fMap[item.account_nm][yd.year] = item.thstrm_amount;
            }
        });
    });

    const keyItems = ['매출액', '영업이익', '당기순이익', '자산총계', '부채총계', '자본총계'];
    let text = `[연도: ${years.join(', ')}]\n\n`;

    keyItems.forEach(name => {
        if (!fMap[name]) return;
        text += `${name}:\n`;
        years.forEach(y => {
            const raw = fMap[name][y];
            const val = parseAmount(raw);
            text += `  ${y}년: ${raw || '데이터 없음'} (약 ${formatBigNumber(val)})\n`;
        });

        const cur = parseAmount(fMap[name][years[0]]);
        const prev = parseAmount(fMap[name][years[1]]);
        const change = calcChange(cur, prev);
        if (change !== null) text += `  → 전기 대비 변동: ${change >= 0 ? '+' : ''}${change.toFixed(1)}%\n`;
        text += '\n';
    });

    // 수익성 지표 추가
    const rev = parseAmount(fMap['매출액']?.[years[0]]);
    const op = parseAmount(fMap['영업이익']?.[years[0]]);
    const net = parseAmount(fMap['당기순이익']?.[years[0]]);
    if (rev) {
        text += `\n[${years[0]}년 수익성 지표]\n`;
        if (op) text += `  영업이익률: ${(op / rev * 100).toFixed(1)}%\n`;
        if (net) text += `  순이익률: ${(net / rev * 100).toFixed(1)}%\n`;
    }

    const debt = parseAmount(fMap['부채총계']?.[years[0]]);
    const equity = parseAmount(fMap['자본총계']?.[years[0]]);
    if (debt && equity) {
        text += `  부채비율: ${(debt / equity * 100).toFixed(1)}%\n`;
    }

    return text;
}

// ══════════════════════════════════════════════════
//   유틸리티 함수
// ══════════════════════════════════════════════════
function parseAmount(str) {
    if (!str) return 0;
    return parseInt(str.replace(/,/g, '')) || 0;
}

function toEok(str) {
    return parseAmount(str) / 100000000;
}

function calcChange(cur, prev) {
    if (!prev || !cur) return null;
    return ((cur - prev) / Math.abs(prev)) * 100;
}

function formatBigNumber(num) {
    if (!num) return '-';
    const abs = Math.abs(num);
    const sign = num < 0 ? '-' : '';
    if (abs >= 1000000000000) return sign + (abs / 1000000000000).toFixed(1) + '조';
    if (abs >= 100000000) return sign + (abs / 100000000).toFixed(0).toLocaleString() + '억';
    if (abs >= 10000) return sign + (abs / 10000).toFixed(0).toLocaleString() + '만';
    return sign + abs.toLocaleString() + '원';
}

function formatNumber(numStr) {
    if (!numStr) return '-';
    const num = parseInt(numStr.replace(/,/g, ''));
    if (isNaN(num)) return numStr;
    return num.toLocaleString() + '원';
}

function formatTableNumber(numStr) {
    if (!numStr) return '-';
    const num = parseInt(numStr.replace(/,/g, ''));
    if (isNaN(num)) return numStr;
    const abs = Math.abs(num);
    const sign = num < 0 ? '-' : '';
    if (abs >= 1000000000000) {
        const jo = Math.floor(abs / 1000000000000);
        const eok = Math.round((abs % 1000000000000) / 100000000);
        return `${sign}${jo}조 ${eok.toLocaleString()}억`;
    }
    if (abs >= 100000000) {
        return `${sign}${Math.round(abs / 100000000).toLocaleString()}억`;
    }
    if (abs >= 10000) {
        return `${sign}${Math.round(abs / 10000).toLocaleString()}만`;
    }
    return `${sign}${abs.toLocaleString()}원`;
}

function formatDisplayDate(dateStr) {
    if (!dateStr || dateStr.length !== 8) return dateStr;
    return `${dateStr.slice(0, 4)}-${dateStr.slice(4, 6)}-${dateStr.slice(6, 8)}`;
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML.replace(/'/g, "\\'").replace(/"/g, '\\"');
}

function formatMarkdown(text) {
    let html = text
        // 헤더
        .replace(/^### (.*$)/gm, '<h3 class="ai-h3">$1</h3>')
        .replace(/^## (.*$)/gm, '<h2 class="ai-h2">$1</h2>')
        // 볼드
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        // 리스트 (연속 - 항목을 <ul>로 묶기)
        .replace(/(?:^|\n)- (.*?)(?=\n(?!- )|\n*$)/gs, (match) => {
            const items = match.trim().split('\n').map(line => {
                const content = line.replace(/^- /, '');
                return `<li>${content}</li>`;
            }).join('');
            return `<ul class="ai-list">${items}</ul>`;
        })
        // 숫자 리스트
        .replace(/(?:^|\n)\d+\. (.*?)(?=\n(?!\d+\. )|\n*$)/gs, (match) => {
            const items = match.trim().split('\n').map(line => {
                const content = line.replace(/^\d+\. /, '');
                return `<li>${content}</li>`;
            }).join('');
            return `<ol class="ai-list">${items}</ol>`;
        })
        // 수평선
        .replace(/^---+$/gm, '<hr class="ai-divider">')
        // 줄바꿈
        .replace(/\n{2,}/g, '<br><br>')
        .replace(/\n/g, '<br>');

    // 금액/퍼센트 하이라이트
    html = html.replace(/([\d,]+(?:\.\d+)?)\s*(조|억|만|원|%)/g,
        '<span class="ai-num">$1$2</span>');

    // 긍정 키워드 하이라이트
    html = html.replace(/(긍정적|성장|증가|상승|개선|흑자|호실적|양호|건전|안정적|튼튼|좋[은다])/g,
        '<span class="ai-positive">$1</span>');

    // 부정/주의 키워드 하이라이트
    html = html.replace(/(부정적|감소|하락|악화|적자|위험|리스크|주의|우려|부담|취약)/g,
        '<span class="ai-negative">$1</span>');

    // 핵심 금융 용어 태그
    html = html.replace(/(매출액|영업이익|당기순이익|순이익|영업이익률|순이익률|부채비율|자산총계|부채총계|자본총계|ROE|ROA|PER|PBR|EPS|BPS)/g,
        '<span class="ai-term">$1</span>');

    return html;
}

function destroyChart(name) {
    if (state.charts[name]) {
        state.charts[name].destroy();
        state.charts[name] = null;
    }
}

function getDisclosureTypeName(type) {
    const types = {
        'A': '정기공시', 'B': '주요사항', 'C': '발행공시',
        'D': '지분공시', 'E': '기타공시', 'F': '외부감사',
        'G': '펀드공시', 'H': '자산유동화', 'I': '거래소공시',
        'J': '공정위공시', 'K': '수시공시'
    };
    return types[type] || type || '-';
}
