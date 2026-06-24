const logList = document.getElementById("log-table");
const totalCount = document.getElementById("total-count");

const password = prompt("관리자 비밀번호를 입력하세요:");

if (!password) {
  alert("비밀번호를 입력해야 합니다.");
  document.body.innerHTML = "<h2>접근 권한이 없습니다.</h2>";
} else {
  fetch("/admin-data", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ password: password })
  })
    .then(res => {
      if (!res.ok) throw new Error("비밀번호가 틀렸거나 서버 오류입니다.");
      return res.json();
    })
    .then(data => {
      if (totalCount) totalCount.innerText = `총 기록: ${data.length}건`;

      if (!data || data.length === 0) {
        logList.innerHTML = `<tr><td colspan="6" style="text-align:center; padding:20px; color:#999;">저장된 기록이 없습니다.</td></tr>`;
        return;
      }

      // 최신순 정렬
      data.reverse();

      data.forEach(user => {
        const tr = document.createElement("tr");

        // 1. IP 및 시간
        const timeIp = `${user.time || "-"}<br><span class="highlight">${user.ip || "-"}</span>`;

        // 2. 위치 정보
        const gpsText = user.latitude && user.longitude
          ? `[${Number(user.latitude).toFixed(5)}, ${Number(user.longitude).toFixed(5)}]`
          : "<span class='alert-text'>위치 권한 거부됨</span>";
        const locationInfo = `${gpsText}<br><b>${user.address || "-"}</b>`;

        // 3. 속도/방향/고도
        let speedText = user.speed ? `속도: ${(user.speed * 3.6).toFixed(1)} km/h` : "속도: -";
        let headingText = user.heading ? `방향: ${user.heading.toFixed(1)}°` : "방향: -";
        let altText = user.altitude ? `고도: ${user.altitude.toFixed(1)} m` : "고도: -";
        const moveInfo = `${speedText}<br>${headingText}<br>${altText}`;

        // 4. 기기 환경 (해상도 등)
        const hwInfo = `
          해상도: ${user.screenResolution || "-"}<br>
          창크기: ${user.windowSize || "-"}<br>
          통신망: ${user.networkType || "-"}<br>
          언어: ${user.language || "-"}
        `;

        // 5. 유입 경로
        const referInfo = `
          이전: ${user.referrer || "-"}<br>
          <a href="${user.currentUrl}" target="_blank" style="color:#3498db; text-decoration:none;">접속된 현재 URL 보기</a>
        `;

        tr.innerHTML = `
          <td>${timeIp}</td>
          <td>${locationInfo}</td>
          <td class="small-text">${moveInfo}</td>
          <td class="small-text"><b>${user.platform || "OS 불명"}</b><br><br>${user.userAgent || "-"}</td>
          <td class="small-text">${hwInfo}</td>
          <td class="small-text">${referInfo}</td>
        `;

        logList.appendChild(tr);
      });
    })
    .catch(err => {
      console.error("로그 로드 실패:", err);
      alert(err.message);
      document.body.innerHTML = `<h2>접근 실패: ${err.message}</h2>`;
    });
}
