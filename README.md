# Easy Financials - 쉽게 보는 재무제표

> 누구나 쉽게 기업의 재무제표를 조회하고, AI가 분석해주는 웹 서비스

**[사이트 바로가기 →](https://easy-financials.onrender.com/)**

---

## 주요 기능

### 기업 검색 & 재무제표 조회
- 회사명 또는 종목코드로 상장/비상장 기업 검색
- DART(전자공시시스템) 기반의 사업보고서·분기보고서 재무 데이터 조회
- 매출액, 영업이익, 당기순이익, 자산총계 등 핵심 지표를 한눈에 확인

### 시각화 차트
- **매출 & 이익 추이** - 연도별 매출·영업이익·당기순이익 막대 차트
- **재무 구조** - 부채 vs 자본 비율 도넛 차트
- **수익성 지표** - 영업이익률·순이익률 비교 차트

### AI 재무 분석
- Google Gemini API를 활용한 재무제표 자동 분석
- 핵심 요약 → 수익성 → 안정성 → 성장성 → 종합 의견 구조로 정리
- 수치 중심의 간결한 리포트 제공

### AI 공시 요약
- DART 공시 원문을 자동으로 가져와 AI가 핵심 내용 요약
- 한줄 요약, 주요 내용, 투자자 관점으로 구조화

---

## 기술 스택

| 구분 | 기술 |
|------|------|
| Backend | Node.js, Express |
| Database | SQLite (sql.js) |
| Frontend | HTML, CSS, JavaScript, Bootstrap 5, Chart.js |
| AI | Google Gemini API |
| 데이터 | 금융감독원 DART Open API |
| 배포 | Render |

---

