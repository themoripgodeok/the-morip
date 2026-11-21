(function () {
  if (window.__THEMORIP_CLASSUP_COLLECTOR__) return;
  window.__THEMORIP_CLASSUP_COLLECTOR__ = true;

  const API = "https://api-academy.classup.io";
  const ROSTER_PATH = "/v1/backoffice/user/info/list";
  const attendancePath = (date) =>
    "/v1/backoffice/user/schedule/merchantUser/v2/" + date +
    "/asc?status=0&attendedStatus=all&userName=&phoneNum=&scheduleId=all&scheduleBlock=0&pageNum=1&assignedOnly=1";

  const safeRoster = (row) => ({
    merchantUserId: row.merchantUserId ?? null,
    name: row.name ?? "",
    seatNumber: row.seatNumber ?? null,
  });

  const safeAttendance = (row) => ({
    merchantUserId: row.merchantUserId ?? null,
    userStatus: row.userStatus ?? null,
    isAttendanceInProgress: row.isAttendanceInProgress ?? null,
    isAbsence: row.isAbsence ?? null,
    isLate: row.isLate ?? null,
    startTime: row.startTime ?? null,
    endTime: row.endTime ?? null,
  });

  async function getJson(url) {
    const response = await fetch(url, { method: "GET", credentials: "include", cache: "no-store" });
    if (!response.ok) throw new Error("ClassUp API 응답 " + response.status);
    return response.json();
  }

  async function collectRoster() {
    const params = "userName=&phoneNum=&parentPhoneNum=&pageNum=1&pageLimit=100&orderItem=&school=&block=0&grade=&groupId=&pauseStatus=notPaused";
    const first = await getJson(API + ROSTER_PATH + "?" + params);
    const all = Array.isArray(first.merchantUserData) ? first.merchantUserData.slice() : [];
    const total = Number(first.merchantUserDataCount || all.length);
    const pages = Math.ceil(total / 100);
    for (let page = 2; page <= pages; page++) {
      const next = await getJson(API + ROSTER_PATH + "?" + params.replace("pageNum=1", "pageNum=" + page));
      if (Array.isArray(next.merchantUserData)) all.push(...next.merchantUserData);
    }
    return all.map(safeRoster);
  }

  async function collectAttendance() {
    const now = new Date();
    const date = [now.getFullYear(), String(now.getMonth() + 1).padStart(2, "0"), String(now.getDate()).padStart(2, "0")].join("-");
    const result = await getJson(API + attendancePath(date));
    const rows = Array.isArray(result.data) ? result.data : [];
    return { date, rows: rows.map(safeAttendance), totalCount: result.totalCount ?? rows.length };
  }

  async function run() {
    try {
      const [students, attendance] = await Promise.all([collectRoster(), collectAttendance()]);
      window.postMessage({
        source: "THEMORIP_CLASSUP_BRIDGE",
        type: "DATA",
        payload: {
          collectedAt: new Date().toISOString(),
          date: attendance.date,
          students,
          attendance: attendance.rows,
          attendanceTotalCount: attendance.totalCount
        }
      }, "https://academy.classup.io");
      console.info("[더몰입] ClassUp 데이터 수집 완료:", students.length, "명 / 출결", attendance.rows.length, "건");
    } catch (error) {
      console.warn("[더몰입] ClassUp 데이터 수집 실패:", error.message);
    }
  }

  run();
  // 학생 명단은 5분마다, 당일 출결은 30초마다 갱신합니다.
  setInterval(async () => {
    try {
      const attendance = await collectAttendance();
      window.postMessage({
        source: "THEMORIP_CLASSUP_BRIDGE",
        type: "DATA",
        payload: {
          collectedAt: new Date().toISOString(),
          date: attendance.date,
          attendance: attendance.rows,
          attendanceTotalCount: attendance.totalCount
        }
      }, "https://academy.classup.io");
    } catch (error) {
      console.warn("[더몰입] 출결 갱신 실패:", error.message);
    }
  }, 30000);

  setInterval(async () => {
    try {
      const students = await collectRoster();
      window.postMessage({
        source: "THEMORIP_CLASSUP_BRIDGE",
        type: "DATA",
        payload: { collectedAt: new Date().toISOString(), students }
      }, "https://academy.classup.io");
    } catch (error) {
      console.warn("[더몰입] 학생 명단 갱신 실패:", error.message);
    }
  }, 300000);
})();