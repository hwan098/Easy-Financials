const initSqlJs = require('sql.js');
const fs = require('fs');
const path = require('path');
const xml2js = require('xml2js');

const dataDir = path.join(__dirname, '../../data');
const dbPath = path.join(dataDir, 'companies.db');
const xmlPath = path.join(dataDir, 'CORPCODE.xml');

async function initDatabase() {
    console.log('데이터베이스 초기화 시작...');
    
    // XML 파일 확인
    if (!fs.existsSync(xmlPath)) {
        console.error('CORPCODE.xml 파일이 없습니다. 먼저 download_corp_code.py를 실행해주세요.');
        process.exit(1);
    }
    
    // SQL.js 초기화
    const SQL = await initSqlJs();
    const db = new SQL.Database();
    
    // 테이블 생성
    db.run(`
        CREATE TABLE IF NOT EXISTS companies (
            corp_code TEXT PRIMARY KEY,
            corp_name TEXT NOT NULL,
            corp_eng_name TEXT,
            stock_code TEXT,
            modify_date TEXT
        )
    `);
    
    db.run(`CREATE INDEX IF NOT EXISTS idx_corp_name ON companies(corp_name)`);
    db.run(`CREATE INDEX IF NOT EXISTS idx_stock_code ON companies(stock_code)`);
    
    console.log('테이블 생성 완료');
    
    // XML 파일 읽기
    console.log('XML 파일 파싱 중...');
    const xmlContent = fs.readFileSync(xmlPath, 'utf-8');
    
    const parser = new xml2js.Parser();
    const result = await parser.parseStringPromise(xmlContent);
    
    const companies = result.result.list;
    console.log(`총 ${companies.length}개 회사 데이터 발견`);
    
    // 데이터 삽입
    const insertStmt = db.prepare(`
        INSERT INTO companies (corp_code, corp_name, corp_eng_name, stock_code, modify_date)
        VALUES (?, ?, ?, ?, ?)
    `);
    
    let count = 0;
    for (const company of companies) {
        const corpCode = company.corp_code?.[0] || '';
        const corpName = company.corp_name?.[0] || '';
        const corpEngName = company.corp_eng_name?.[0] || '';
        const stockCode = company.stock_code?.[0]?.trim() || null;
        const modifyDate = company.modify_date?.[0] || '';
        
        insertStmt.bind([corpCode, corpName, corpEngName, stockCode, modifyDate]);
        insertStmt.step();
        insertStmt.reset();
        
        count++;
        
        if (count % 10000 === 0) {
            console.log(`${count}개 회사 데이터 삽입됨...`);
        }
    }
    insertStmt.free();
    
    console.log(`총 ${count}개 회사 데이터 삽입 완료`);
    
    // 상장회사 수 확인
    const listedResult = db.exec(`
        SELECT COUNT(*) as count FROM companies 
        WHERE stock_code IS NOT NULL AND stock_code != ''
    `);
    const listedCount = listedResult[0]?.values[0]?.[0] || 0;
    console.log(`상장회사: ${listedCount}개`);
    
    // 데이터베이스 파일 저장
    const data = db.export();
    const buffer = Buffer.from(data);
    fs.writeFileSync(dbPath, buffer);
    
    db.close();
    console.log('데이터베이스 초기화 완료!');
    console.log(`저장 위치: ${dbPath}`);
}

initDatabase().catch(console.error);
