const express = require('express');
const router = express.Router();
const dartApi = require('../services/dartApi');

// 공시 목록 조회
router.get('/list/:corpCode', async (req, res) => {
    try {
        const { corpCode } = req.params;
        const { 
            bgn_de,      // 시작일 (YYYYMMDD)
            end_de,      // 종료일 (YYYYMMDD)
            pblntf_ty,   // 공시유형 (A:정기공시, B:주요사항, C:발행공시, D:지분공시, E:기타공시, F:외부감사, G:펀드, H:자산유동화, I:거래소, J:공정위, K:수시공시)
            page_no = 1,
            page_count = 20
        } = req.query;
        
        const result = await dartApi.getDisclosureList({
            corp_code: corpCode,
            bgn_de,
            end_de,
            pblntf_ty,
            page_no,
            page_count
        });
        
        res.json(result);
    } catch (error) {
        console.error('공시 목록 조회 오류:', error);
        res.status(500).json({ error: '공시 목록 조회 중 오류가 발생했습니다.' });
    }
});

// 공시 상세 정보 (원문 링크 포함)
router.get('/detail/:rceptNo', async (req, res) => {
    try {
        const { rceptNo } = req.params;
        
        // 공시 원문 URL 생성
        const documentUrl = `https://dart.fss.or.kr/dsaf001/main.do?rcpNo=${rceptNo}`;
        
        res.json({
            rcept_no: rceptNo,
            document_url: documentUrl
        });
    } catch (error) {
        console.error('공시 상세 조회 오류:', error);
        res.status(500).json({ error: '공시 상세 조회 중 오류가 발생했습니다.' });
    }
});

module.exports = router;
