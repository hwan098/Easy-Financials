const initSqlJs = require('sql.js');
const fs = require('fs');
const path = require('path');
const xml2js = require('xml2js');
const axios = require('axios');
const AdmZip = require('adm-zip');

const dataDir = path.join(__dirname, '../../data');
const dbPath = path.join(dataDir, 'companies.db');
const xmlPath = path.join(dataDir, 'CORPCODE.xml');

async function downloadCorpCode() {
    const apiKey = process.env.DART_API_KEY;
    if (!apiKey) {
        throw new Error('DART_API_KEY가 설정되지 않았습니다.');
    }

    console.log('DART API에서 고유번호 파일 다운로드 중...');
    const response = await axios.get('https://opendart.fss.or.kr/api/corpCode.xml', {
        params: { crtfc_key: apiKey },
        responseType: 'arraybuffer',
        timeout: 60000
    });

    if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
    }

    const zip = new AdmZip(Buffer.from(response.data));
    zip.extractAllTo(dataDir, true);
    console.log('CORPCODE.xml 다운로드 및 압축 해제 완료');
}

async function buildDatabase() {
    if (!fs.existsSync(xmlPath)) {
        throw new Error('CORPCODE.xml 파일이 없습니다.');
    }

    const SQL = await initSqlJs();
    const db = new SQL.Database();

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

    console.log('XML 파일 파싱 중...');
    const xmlContent = fs.readFileSync(xmlPath, 'utf-8');
    const parser = new xml2js.Parser();
    const result = await parser.parseStringPromise(xmlContent);

    const companies = result.result.list;
    console.log(`총 ${companies.length}개 회사 데이터 발견`);

    const insertStmt = db.prepare(`
        INSERT INTO companies (corp_code, corp_name, corp_eng_name, stock_code, modify_date)
        VALUES (?, ?, ?, ?, ?)
    `);

    let count = 0;
    for (const company of companies) {
        insertStmt.bind([
            company.corp_code?.[0] || '',
            company.corp_name?.[0] || '',
            company.corp_eng_name?.[0] || '',
            company.stock_code?.[0]?.trim() || null,
            company.modify_date?.[0] || ''
        ]);
        insertStmt.step();
        insertStmt.reset();
        count++;
        if (count % 20000 === 0) console.log(`${count}개 삽입됨...`);
    }
    insertStmt.free();

    if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
    }
    const data = db.export();
    fs.writeFileSync(dbPath, Buffer.from(data));
    db.close();

    console.log(`DB 초기화 완료: ${count}개 회사`);
}

async function ensureDatabase() {
    if (fs.existsSync(dbPath)) {
        console.log('기존 DB 파일 사용');
        return;
    }

    console.log('DB 파일이 없습니다. 자동 초기화를 시작합니다...');

    if (!fs.existsSync(xmlPath)) {
        await downloadCorpCode();
    }

    await buildDatabase();
}

// 스크립트 직접 실행 시
if (require.main === module) {
    require('dotenv').config({ override: true, path: path.join(__dirname, '../../.env') });
    ensureDatabase()
        .then(() => console.log('완료!'))
        .catch(err => { console.error('실패:', err.message); process.exit(1); });
}

module.exports = { ensureDatabase, downloadCorpCode, buildDatabase };
