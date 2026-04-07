const initSqlJs = require('sql.js');
const fs = require('fs');
const path = require('path');

const dbPath = path.join(__dirname, '../../data/companies.db');
let db = null;
let SQL = null;

async function initDb() {
    if (db) return db;
    
    SQL = await initSqlJs();
    
    if (fs.existsSync(dbPath)) {
        const buffer = fs.readFileSync(dbPath);
        db = new SQL.Database(buffer);
    } else {
        db = new SQL.Database();
    }
    
    return db;
}

function getDb() {
    return db;
}

// 데이터베이스 저장
function saveDb() {
    if (db) {
        const data = db.export();
        const buffer = Buffer.from(data);
        fs.writeFileSync(dbPath, buffer);
    }
}

// 회사 검색 (회사명 또는 종목코드로)
function searchCompanies(query, limit = 20) {
    if (!db) return [];
    
    const searchQuery = `%${query}%`;
    
    const stmt = db.prepare(`
        SELECT corp_code, corp_name, corp_eng_name, stock_code, modify_date
        FROM companies
        WHERE corp_name LIKE ? OR stock_code LIKE ? OR corp_code LIKE ?
        ORDER BY 
            CASE WHEN stock_code IS NOT NULL AND stock_code != '' THEN 0 ELSE 1 END,
            corp_name
        LIMIT ?
    `);
    
    stmt.bind([searchQuery, searchQuery, searchQuery, limit]);
    
    const results = [];
    while (stmt.step()) {
        const row = stmt.getAsObject();
        results.push(row);
    }
    stmt.free();
    
    return results;
}

// 고유번호로 회사 조회
function getCompanyByCorpCode(corpCode) {
    if (!db) return null;
    
    const stmt = db.prepare(`
        SELECT corp_code, corp_name, corp_eng_name, stock_code, modify_date
        FROM companies
        WHERE corp_code = ?
    `);
    
    stmt.bind([corpCode]);
    
    let result = null;
    if (stmt.step()) {
        result = stmt.getAsObject();
    }
    stmt.free();
    
    return result;
}

// 종목코드로 회사 조회
function getCompanyByStockCode(stockCode) {
    if (!db) return null;
    
    const stmt = db.prepare(`
        SELECT corp_code, corp_name, corp_eng_name, stock_code, modify_date
        FROM companies
        WHERE stock_code = ?
    `);
    
    stmt.bind([stockCode]);
    
    let result = null;
    if (stmt.step()) {
        result = stmt.getAsObject();
    }
    stmt.free();
    
    return result;
}

// 상장회사만 조회
function getListedCompanies(limit = 100) {
    if (!db) return [];
    
    const stmt = db.prepare(`
        SELECT corp_code, corp_name, corp_eng_name, stock_code, modify_date
        FROM companies
        WHERE stock_code IS NOT NULL AND stock_code != ''
        ORDER BY corp_name
        LIMIT ?
    `);
    
    stmt.bind([limit]);
    
    const results = [];
    while (stmt.step()) {
        const row = stmt.getAsObject();
        results.push(row);
    }
    stmt.free();
    
    return results;
}

module.exports = {
    initDb,
    getDb,
    saveDb,
    searchCompanies,
    getCompanyByCorpCode,
    getCompanyByStockCode,
    getListedCompanies
};
