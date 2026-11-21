# 더몰입 로컬 좌석 관리 프로그램 (초기 구성)

## 실행
1. Windows에 Python 3가 설치되어 있어야 합니다.
2. `local-app/run_local.bat`를 더블클릭합니다.
3. 브라우저에서 `http://127.0.0.1:8765/seat-map.html`이 열립니다.
4. ClassUp 연동 확장 프로그램을 Whale/Chrome에 설치합니다.

## 확장 프로그램 설치
1. 브라우저 주소창에 `whale://extensions` 또는 `chrome://extensions` 입력
2. 개발자 모드를 켭니다.
3. '압축해제된 확장 프로그램을 로드'를 선택합니다.
4. 이 폴더의 `local-app/extension` 폴더를 선택합니다.
5. ClassUp에 로그인된 탭을 새로고침합니다.

## 저장 위치
자동 수집 데이터: `local-app/data/classup.json`
좌석 배치: `local-app/data/layout.json`

데이터는 이 컴퓨터의 디스크에만 저장됩니다. `local-app/data` 폴더를 정기적으로 백업하세요.

## 주의
- ClassUp 로그인 브라우저와 로컬 프로그램을 실행한 컴퓨터가 켜져 있어야 자동 수집됩니다.
- 자동 출결 갱신은 30초, 학생 명단 갱신은 5분 간격입니다.
- 로그인 정보, 쿠키, Authorization 헤더를 파일에 저장하지 않습니다.
- ClassUp API의 응답 구조나 접근 정책이 변경되면 수집기가 수정되어야 할 수 있습니다.
- 현재 구성은 로컬 수집/저장 연결의 초기 버전이며, 좌석표의 자동 반영 및 기존 좌석 배치 이전은 다음 단계에서 마무리합니다.
