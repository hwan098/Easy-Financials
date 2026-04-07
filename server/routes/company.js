const express = require('express');
const router = express.Router();
const db = require('../db/database');

// 회사 검색 API
router.get('/search', (req, res) => {
    try {
        const { q, limit = 20 } = req.query;
        
        if (!q || q.length < 1) {
            return res.json([]);
        }
        
        const companies = db.searchCompanies(q, parseInt(limit));
        res.json(companies);
    } catch (error) {
        console.error('회사 검색 오류:', error);
        res.status(500).json({ error: '검색 중 오류가 발생했습니다.' });
    }
});

// 회사 상세 정보 조회
router.get('/:corpCode', (req, res) => {
    try {
        const { corpCode } = req.params;
        const company = db.getCompanyByCorpCode(corpCode);
        
        if (!company) {
            return res.status(404).json({ error: '회사를 찾을 수 없습니다.' });
        }
        
        res.json(company);
    } catch (error) {
        console.error('회사 조회 오류:', error);
        res.status(500).json({ error: '조회 중 오류가 발생했습니다.' });
    }
});

module.exports = router;
