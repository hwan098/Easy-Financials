const axios = require('axios');
const AdmZip = require('adm-zip');

const DART_API_BASE = 'https://opendart.fss.or.kr/api';
const API_KEY = process.env.DART_API_KEY;

// 공시 목록 조회
async function getDisclosureList(params) {
    const { corp_code, bgn_de, end_de, pblntf_ty, page_no = 1, page_count = 20 } = params;
    
    const queryParams = {
        crtfc_key: API_KEY,
        corp_code,
        page_no,
        page_count
    };
    
    if (bgn_de) queryParams.bgn_de = bgn_de;
    if (end_de) queryParams.end_de = end_de;
    if (pblntf_ty) queryParams.pblntf_ty = pblntf_ty;
    
    const response = await axios.get(`${DART_API_BASE}/list.json`, {
        params: queryParams
    });
    
    if (response.data.status !== '000') {
        if (response.data.status === '013') {
            return { list: [], total_count: 0, page_no, page_count };
        }
        throw new Error(response.data.message || 'DART API 오류');
    }
    
    return {
        list: response.data.list || [],
        total_count: response.data.total_count,
        total_page: response.data.total_page,
        page_no: response.data.page_no,
        page_count: response.data.page_count
    };
}

// 재무제표 조회 (단일회사)
async function getFinancialStatement(params) {
    const { corp_code, bsns_year, reprt_code } = params;
    
    const response = await axios.get(`${DART_API_BASE}/fnlttSinglAcnt.json`, {
        params: {
            crtfc_key: API_KEY,
            corp_code,
            bsns_year,
            reprt_code
        }
    });
    
    if (response.data.status !== '000') {
        if (response.data.status === '013') {
            return { list: [] };
        }
        throw new Error(response.data.message || 'DART API 오류');
    }
    
    return {
        list: response.data.list || []
    };
}

// 기업 개황 조회
async function getCompanyInfo(corpCode) {
    const response = await axios.get(`${DART_API_BASE}/company.json`, {
        params: {
            crtfc_key: API_KEY,
            corp_code: corpCode
        }
    });
    
    if (response.data.status !== '000') {
        throw new Error(response.data.message || 'DART API 오류');
    }
    
    return response.data;
}

// 공시 본문 텍스트 추출 (document.xml ZIP → text)
async function getDocumentContent(rceptNo) {
    const response = await axios.get(`${DART_API_BASE}/document.xml`, {
        params: { crtfc_key: API_KEY, rcept_no: rceptNo },
        responseType: 'arraybuffer',
        timeout: 30000
    });

    const contentType = response.headers['content-type'] || '';
    if (contentType.includes('json') || contentType.includes('xml')) {
        const text = Buffer.from(response.data).toString('utf-8');
        if (text.includes('"status"') && !text.includes('"000"')) {
            throw new Error('공시 원문을 가져올 수 없습니다.');
        }
    }

    const zip = new AdmZip(Buffer.from(response.data));
    const entries = zip.getEntries();
    let allText = '';

    for (const entry of entries) {
        if (entry.isDirectory) continue;
        const name = entry.entryName.toLowerCase();
        if (!name.endsWith('.xml') && !name.endsWith('.html') && !name.endsWith('.htm')) continue;

        const raw = entry.getData().toString('utf-8');
        const stripped = raw
            .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
            .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
            .replace(/<[^>]+>/g, ' ')
            .replace(/&[a-z]+;/gi, ' ')
            .replace(/\s+/g, ' ')
            .trim();
        if (stripped.length > 50) allText += stripped + '\n';
    }

    const MAX_CHARS = 60000;
    return allText.length > MAX_CHARS ? allText.slice(0, MAX_CHARS) + '\n...(이하 생략)' : allText;
}

module.exports = {
    getDisclosureList,
    getFinancialStatement,
    getCompanyInfo,
    getDocumentContent
};
