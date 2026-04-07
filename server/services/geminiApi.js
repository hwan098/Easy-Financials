const { GoogleGenerativeAI } = require('@google/generative-ai');

const DEFAULT_MODEL = 'gemini-1.5-flash';

function getGenerativeModel() {
    const apiKey = (process.env.GEMINI_API_KEY || '').trim();
    if (!apiKey) {
        throw new Error('GEMINI_API_KEY가 설정되지 않았습니다.');
    }
    const modelName = (process.env.GEMINI_MODEL || DEFAULT_MODEL).trim();
    const genAI = new GoogleGenerativeAI(apiKey);
    return genAI.getGenerativeModel({ model: modelName });
}

async function summarizeDisclosure(content, title = '') {
    const model = getGenerativeModel();

    const prompt = `당신은 금융 전문가이자 쉬운 설명 전문가입니다.
다음은 "${title}" 공시의 실제 본문입니다.

아래 형식에 맞춰 핵심 내용을 누구나 이해할 수 있도록 쉽게 요약해주세요.

## 한줄 요약
(가장 중요한 핵심을 한 문장으로)

## 주요 내용
- 포인트 1
- 포인트 2
- 포인트 3
(최대 5개)

## 투자자 관점
(이 공시가 투자자에게 어떤 의미인지 1-2문장)

---
공시 본문:
${content}`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    return response.text();
}

async function analyzeDisclosure(content, title = '') {
    const model = getGenerativeModel();

    const prompt = `당신은 금융 전문가입니다.
다음 "${title}" 공시 내용을 투자자 관점에서 분석해주세요.

공시 내용:
${content}

분석 항목:
1. 핵심 내용 요약
2. 기업에 미치는 영향 (긍정적/부정적)
3. 투자자가 주의해야 할 점
4. 관련 리스크 요인`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    return response.text();
}

async function analyzeFinancials(financialData, companyName) {
    const model = getGenerativeModel();

    const prompt = `당신은 재무 분석 전문가입니다. "${companyName}"의 재무 데이터를 분석해주세요.

[작성 규칙]
- 비유나 예시는 쓰지 마세요. 데이터와 수치 중심으로 간결하게 작성하세요.
- 각 항목은 2~3개 핵심 포인트로 제한하세요.
- 수치를 인용할 때는 반드시 전기 대비 변동(%)을 함께 표시하세요.
- "~입니다", "~습니다" 체로 간결하게 작성하세요.

[재무 데이터]
${financialData}

아래 형식 그대로 작성해주세요:

## 핵심 요약
- (이 회사의 현재 재무 상태를 가장 중요한 포인트 3개로 요약. 각각 한 줄.)

## 수익성 분석
- 매출액 규모와 전기 대비 증감률
- 영업이익률·순이익률 수준과 변화

## 안정성 분석
- 부채비율 수준과 의미
- 자본 대비 부채 규모 평가

## 성장성 분석
- 매출·이익의 연도별 추이와 방향성

## 종합 의견
- (투자 관점에서 긍정적 요인과 주의할 점을 각 1~2개씩 정리)`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    return response.text();
}

module.exports = {
    summarizeDisclosure,
    analyzeDisclosure,
    analyzeFinancials
};
