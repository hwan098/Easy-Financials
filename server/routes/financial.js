const express = require('express');
const router = express.Router();
const dartApi = require('../services/dartApi');

// 재무제표 조회
router.get('/:corpCode', async (req, res) => {
    try {
        const { corpCode } = req.params;
        const { 
            bsns_year,   // 사업연도 (YYYY)
            reprt_code   // 보고서 코드 (11013:1분기, 11012:반기, 11014:3분기, 11011:사업보고서)
        } = req.query;
        
        // 기본값: 최근 3년 사업보고서
        const currentYear = new Date().getFullYear();
        const years = bsns_year ? [bsns_year] : [currentYear - 1, currentYear - 2, currentYear - 3];
        const reportCode = reprt_code || '11011'; // 기본: 사업보고서
        
        const results = [];
        
        for (const year of years) {
            try {
                const data = await dartApi.getFinancialStatement({
                    corp_code: corpCode,
                    bsns_year: year.toString(),
                    reprt_code: reportCode
                });
                
                if (data && data.list) {
                    results.push({
                        year: year,
                        data: data.list
                    });
                }
            } catch (err) {
                console.log(`${year}년 재무제표 조회 실패:`, err.message);
            }
        }
        
        res.json({
            corp_code: corpCode,
            financial_data: results
        });
    } catch (error) {
        console.error('재무제표 조회 오류:', error);
        res.status(500).json({ error: '재무제표 조회 중 오류가 발생했습니다.' });
    }
});

module.exports = router;
