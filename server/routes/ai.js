const express = require('express');
const router = express.Router();
const geminiApi = require('../services/geminiApi');
const dartApi = require('../services/dartApi');

function handleAIError(error, res, context = 'AI') {
    console.error(`${context} 오류:`, error?.message || error);
    const msg = String(error?.message || '');

    if (msg.includes('GEMINI_API_KEY')) {
        return res.status(500).json({ error: msg });
    }
    if (/429|quota|rate.?limit/i.test(msg)) {
        return res.status(429).json({
            error: 'API 호출 한도를 초과했습니다. 약 30초~1분 후 다시 시도해주세요.'
        });
    }
    if (/API key not valid|API_KEY_INVALID/i.test(msg)) {
        return res.status(401).json({
            error: 'Gemini API 키가 유효하지 않습니다. .env 파일의 GEMINI_API_KEY를 확인하세요.'
        });
    }
    if (/404|not found|not supported/i.test(msg)) {
        return res.status(500).json({
            error: 'Gemini 모델을 호출할 수 없습니다. .env의 GEMINI_MODEL을 확인하세요.'
        });
    }
    res.status(500).json({ error: `${context} 중 오류가 발생했습니다: ${msg}` });
}

// 공시 본문 기반 AI 요약
router.post('/summarize', async (req, res) => {
    try {
        const { rceptNo, title, content } = req.body;
        let docContent = content || '';

        if (rceptNo && !content) {
            try {
                docContent = await dartApi.getDocumentContent(rceptNo);
            } catch (err) {
                console.error('공시 원문 가져오기 실패:', err.message);
                docContent = `[공시 원문을 직접 가져오지 못했습니다] 공시번호: ${rceptNo}, 제목: ${title}`;
            }
        }

        if (!docContent) {
            return res.status(400).json({ error: '요약할 내용이 필요합니다.' });
        }

        const summary = await geminiApi.summarizeDisclosure(docContent, title);
        res.json({ summary });
    } catch (error) {
        handleAIError(error, res, 'AI 요약');
    }
});

// 공시 분석
router.post('/analyze', async (req, res) => {
    try {
        const { content, title } = req.body;
        if (!content) {
            return res.status(400).json({ error: '분석할 내용이 필요합니다.' });
        }
        const analysis = await geminiApi.analyzeDisclosure(content, title);
        res.json({ analysis });
    } catch (error) {
        handleAIError(error, res, 'AI 분석');
    }
});

// 재무제표 AI 분석
router.post('/analyze-financial', async (req, res) => {
    try {
        const { financialData, companyName } = req.body;
        if (!financialData) {
            return res.status(400).json({ error: '재무 데이터가 필요합니다.' });
        }
        const analysis = await geminiApi.analyzeFinancials(financialData, companyName);
        res.json({ analysis });
    } catch (error) {
        handleAIError(error, res, 'AI 재무 분석');
    }
});

module.exports = router;
