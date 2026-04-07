const express = require('express');
const cors = require('cors');
const path = require('path');
// 이미 설정된 OS/터미널 환경변수보다 .env를 우선 (잘못된 GEMINI_*가 남아 있으면 API가 실패함)
require('dotenv').config({ override: true });

const db = require('./db/database');
const { ensureDatabase } = require('./db/initDb');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.static(path.join(__dirname, '../public')));

// 서버 시작 함수
async function startServer() {
    // DB 없으면 DART에서 자동 다운로드 & 초기화
    await ensureDatabase();
    await db.initDb();
    console.log('데이터베이스 연결 완료');
    
    // Routes
    const companyRoutes = require('./routes/company');
    const disclosureRoutes = require('./routes/disclosure');
    const financialRoutes = require('./routes/financial');
    const aiRoutes = require('./routes/ai');

    app.use('/api/company', companyRoutes);
    app.use('/api/disclosure', disclosureRoutes);
    app.use('/api/financial', financialRoutes);
    app.use('/api/ai', aiRoutes);

    // Serve index.html for root
    app.get('/', (req, res) => {
        res.sendFile(path.join(__dirname, '../public/index.html'));
    });

    // Error handling middleware
    app.use((err, req, res, next) => {
        console.error(err.stack);
        res.status(500).json({ error: '서버 오류가 발생했습니다.' });
    });

    app.listen(PORT, () => {
        console.log(`서버가 http://localhost:${PORT} 에서 실행 중입니다.`);
    });
}

startServer().catch(console.error);
