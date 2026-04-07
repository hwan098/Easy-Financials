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

    const prompt = `당신은 친절한 금융 전문가입니다. 금융 지식이 전혀 없는 일반인도 이해할 수 있도록 쉽게 설명해주세요.
비유와 예시를 적극 활용하고, 전문 용어는 반드시 쉬운 말로 풀어서 설명해주세요.

아래는 "${companyName}"의 재무제표 데이터입니다.

${financialData}

다음 형식으로 분석해주세요:

## 📊 한눈에 보는 재무 상태
(이 회사의 전반적인 상태를 비유를 들어 2-3문장으로)

## 💰 돈을 잘 벌고 있나요? (수익성)
- 매출과 이익 추이를 분석하고, 전기 대비 얼마나 변했는지
- 영업이익률과 순이익률의 의미를 쉽게 설명
- "월급이 100만원인데 실제로 손에 쥐는 돈은 X만원" 같은 비유 활용

## 🏦 빚은 많지 않나요? (안정성)
- 자산 대비 부채 비율 분석
- "집 값이 5억인데 대출이 3억이면..." 같은 비유 활용
- 재무 건전성 평가

## 📈 성장하고 있나요? (성장성)
- 매출과 이익의 증감 추이
- 연도별 변화율과 그 의미

## ⚠️ 투자 시 참고사항
- 긍정적 신호와 주의할 점
- 총평 (투자 관점에서 1-2문장 정리)`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    return response.text();
}

module.exports = {
    summarizeDisclosure,
    analyzeDisclosure,
    analyzeFinancials
};
