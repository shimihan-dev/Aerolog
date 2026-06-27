/**
 * FlightLog MVP - 메인 로직 스크립트 (단일 사용자 버전)
 * 초보자 가이드: 이 파일은 웹 애플리케이션의 동작(이벤트 처리, 데이터 로드 및 저장, 화면 갱신 등)을 관리합니다.
 * LocalStorage를 활용하여 브라우저가 새로고침되어도 데이터가 유지되도록 합니다.
 */

// 애플리케이션 상태 (State) 관리 객체
const state = {
    flights: [],         // 현재 비행 기록 배열
    searchQuery: ""      // 현재 실시간 검색어
};

// DOM 요소 참조 (HTML 요소를 자바스크립트로 조작하기 위함)
const elements = {
    grid: document.getElementById("flight-cards-grid"),
    emptyState: document.getElementById("empty-state"),
    totalFlightsVal: document.getElementById("total-flights-val"),
    totalAirlinesVal: document.getElementById("total-airlines-val"),
    totalTypesVal: document.getElementById("total-types-val"),
    searchInput: document.getElementById("search-input"),
    filteredCount: document.getElementById("filtered-count"),
    openFormBtn: document.getElementById("open-form-btn"),
    closeModalBtn: document.getElementById("close-modal-btn"),
    cancelFormBtn: document.getElementById("cancel-form-btn"),
    formModal: document.getElementById("form-modal"),
    addFlightForm: document.getElementById("add-flight-form")
};

// ==========================================================================
// 1. 초기 데이터 로드 및 로컬스토리지 (LocalStorage) 연동
// ==========================================================================

/**
 * 앱이 처음 켜질 때 데이터를 불러오는 함수
 */
function initApp() {
    // 로컬스토리지에서 'flightLog_flights' 키에 저장된 데이터를 읽어옵니다.
    const storedFlights = localStorage.getItem("flightLog_flights");

    if (storedFlights) {
        // 데이터가 존재하면 JSON 문자열을 원래의 자바스크립트 배열 객체로 변환합니다.
        state.flights = JSON.parse(storedFlights);
    } else {
        // 데이터가 없으면, data/sampleFlights.js에서 정의한 기본 샘플 데이터를 사용합니다.
        state.flights = [...window.sampleFlights];
        saveFlightsToStorage(); // 샘플 데이터를 로컬스토리지에 저장합니다.
    }

    // 화면 그리기 (렌더링) 및 통계 업데이트
    renderApp();
    setupEventListeners();
}

/**
 * 현재 상태(state.flights)를 로컬스토리지에 저장하는 함수
 */
function saveFlightsToStorage() {
    localStorage.setItem("flightLog_flights", JSON.stringify(state.flights));
}

// ==========================================================================
// 2. 화면 렌더링 및 통계 계산
// ==========================================================================

/**
 * 화면의 카드 목록과 통계 대시보드를 최신 데이터 기준으로 다시 그리는 함수
 */
function renderApp() {
    // 1. 실시간 검색어를 기반으로 비행 기록 필터링
    const filteredFlights = state.flights.filter(flight => {
        const query = state.searchQuery.toLowerCase().trim();
        if (!query) return true; // 검색어가 없으면 전부 노출

        // 검색 대상 필드들: 항공사, 편명, 기종명, 등록부호, 출발공항, 도착공항
        return (
            (flight.airline && flight.airline.toLowerCase().includes(query)) ||
            (flight.flightNumber && flight.flightNumber.toLowerCase().includes(query)) ||
            (flight.aircraftTypeName && flight.aircraftTypeName.toLowerCase().includes(query)) ||
            (flight.registration && flight.registration.toLowerCase().includes(query)) ||
            (flight.departureAirport && flight.departureAirport.toLowerCase().includes(query)) ||
            (flight.arrivalAirport && flight.arrivalAirport.toLowerCase().includes(query))
        );
    });

    // 2. 카드 그리드 초기화
    elements.grid.innerHTML = "";

    // 3. 필터링된 결과가 없을 경우 빈 화면(Empty State) 표시 처리
    if (filteredFlights.length === 0) {
        elements.emptyState.classList.remove("hidden");
        elements.grid.style.display = "none";
    } else {
        elements.emptyState.classList.add("hidden");
        elements.grid.style.display = "grid";

        // 필터링된 비행 로그를 하나씩 돌면서 보딩패스 카드를 동적으로 렌더링합니다.
        filteredFlights.forEach(flight => {
            const cardHTML = createFlightCardHTML(flight);
            elements.grid.insertAdjacentHTML("beforeend", cardHTML);
        });
    }

    // 4. 상단 통계 대시보드 갱신
    updateStatistics();

    // 5. 검색 결과 카운트 배지 갱신
    elements.filteredCount.textContent = filteredFlights.length;
}

/**
 * 단일 비행 기록 객체를 바탕으로 보딩패스 형태의 HTML 문자열을 만드는 함수
 */
function createFlightCardHTML(flight) {
    // AeroType 프로젝트와의 연동 여부를 판단합니다.
    // aircraftTypeId가 존재하면 'AeroType 연동 기종' 배지를 렌더링합니다.
    const isLinked = flight.aircraftTypeId && flight.aircraftTypeId.trim() !== "";
    const badgeHTML = isLinked
        ? `<div class="aerotype-badge" title="AeroType 앱에서 검색 가능한 고유 ID: ${flight.aircraftTypeId}">
            <svg class="aerotype-badge-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
            AeroType 연동 기종
           </div>`
        : `<div class="aerotype-badge not-linked">비연동 기종</div>`;

    // 메모 줄바꿈 및 유효성 처리
    const memoContent = flight.memo ? flight.memo : "등록된 메모가 없습니다.";

    return `
        <article class="ticket-card" data-id="${flight.id}">
            <!-- 1. 티켓 상단 헤더 -->
            <div class="ticket-header">
                <div class="airline-info">
                    <span class="airline-name">${flight.airline}</span>
                    <span class="flight-number">${flight.flightNumber}</span>
                </div>
                <div class="flight-date">${flight.date}</div>
            </div>

            <!-- 2. 출발-도착 공항 (노선) -->
            <div class="ticket-route">
                <div class="airport-block">
                    <span class="airport-code">${flight.departureAirport}</span>
                    <span class="airport-label">DEPARTURE</span>
                </div>
                <div class="flight-path">
                    <div class="path-line"></div>
                    <!-- 비행기 아이콘 -->
                    <svg class="path-plane-icon" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M21 16V14L13 9V3.5C13 2.67 12.33 2 11.5 2C10.67 2 10 2.67 10 3.5V9L2 14V16L10 13.5V19L8 20.5V22L11.5 21L15 22V20.5L13 19V13.5L21 16Z"/>
                    </svg>
                </div>
                <div class="airport-block arr">
                    <span class="airport-code">${flight.arrivalAirport}</span>
                    <span class="airport-label">ARRIVAL</span>
                </div>
            </div>

            <!-- 3. 상세 정보 (기종, 등록부호, 좌석) -->
            <div class="ticket-details">
                <div class="detail-item">
                    <span class="detail-label">항공기 기종</span>
                    <span class="detail-value" style="font-size: 0.8rem;">${flight.aircraftTypeName}</span>
                    ${badgeHTML}
                </div>
                <div class="detail-item">
                    <span class="detail-label">등록부호</span>
                    <span class="detail-value number-font">${flight.registration ? flight.registration : '-'}</span>
                </div>
                <div class="detail-item">
                    <span class="detail-label">좌석 번호</span>
                    <span class="detail-value number-font">${flight.seat ? flight.seat : '-'}</span>
                </div>
            </div>

            <!-- 4. 메모 및 액션 영역 -->
            <div class="ticket-memo">
                <p class="memo-text">${memoContent}</p>
                <div class="ticket-actions">
                    <button class="btn-delete" onclick="deleteFlight('${flight.id}')" title="비행 기록 삭제">
                        <svg class="delete-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>
                        삭제
                    </button>
                </div>
            </div>
        </article>
    `;
}

/**
 * 전체 비행 기록 데이터를 기반으로 요약 수치(통계)를 계산하고 표시하는 함수
 */
function updateStatistics() {
    // 1. 총 비행 횟수
    const totalFlights = state.flights.length;
    elements.totalFlightsVal.textContent = totalFlights;

    // Set 객체를 활용해 고유한(중복 없는) 값들만 추출합니다.
    // 2. 탑승 항공사 수
    const uniqueAirlines = new Set(
        state.flights
            .map(f => f.airline ? f.airline.trim() : "")
            .filter(name => name !== "")
    );
    elements.totalAirlinesVal.textContent = uniqueAirlines.size;

    // 3. 탑승 기종 수 (기종 이름 기준)
    const uniqueTypes = new Set(
        state.flights
            .map(f => f.aircraftTypeName ? f.aircraftTypeName.trim() : "")
            .filter(name => name !== "")
    );
    elements.totalTypesVal.textContent = uniqueTypes.size;
}

// ==========================================================================
// 3. 비행 로그 추가 / 삭제 기능 (CRUD)
// ==========================================================================

/**
 * 새로운 비행 로그를 등록하는 이벤트 핸들러
 */
function handleAddFlightSubmit(event) {
    event.preventDefault(); // 폼 제출 시 페이지가 새로고침되는 기본 동작을 막습니다.

    // 폼 입력 필드 값 가져오기 및 양끝 공백 제거
    const date = document.getElementById("flight-date").value;
    const airline = document.getElementById("flight-airline").value.trim();
    const flightNumber = document.getElementById("flight-number").value.trim().toUpperCase(); // 편명은 대문자로
    const registration = document.getElementById("flight-registration").value.trim().toUpperCase(); // 등록기호도 대문자로
    const departureAirport = document.getElementById("flight-dep").value.trim().toUpperCase(); // 공항 코드 대문자
    const arrivalAirport = document.getElementById("flight-arr").value.trim().toUpperCase(); // 공항 코드 대문자
    const aircraftTypeName = document.getElementById("flight-typename").value.trim();
    const aircraftTypeId = document.getElementById("flight-typeid").value.trim().toLowerCase(); // 매핑 ID는 소문자로 정규화
    const seat = document.getElementById("flight-seat").value.trim().toUpperCase();
    const memo = document.getElementById("flight-memo").value;

    // 간단한 객체 빌더 패턴 적용
    const newFlight = {
        id: "flight-" + Date.now(), // 고유한 ID 생성을 위해 타임스탬프 사용
        date,
        airline,
        flightNumber,
        registration,
        departureAirport,
        arrivalAirport,
        aircraftTypeName,
        aircraftTypeId,
        seat,
        memo
    };

    // 최신 비행 로그가 목록 맨 위에 가도록 배열 맨 앞에 추가합니다.
    state.flights.unshift(newFlight);

    // 로컬스토리지에 저장 및 화면 재렌더링
    saveFlightsToStorage();
    renderApp();

    // 입력 폼 초기화 및 모달 닫기
    elements.addFlightForm.reset();
    closeModal();
}

/**
 * 비행 로그를 삭제하는 함수
 * HTML 내 inline onclick 속성에서 호출합니다.
 */
function deleteFlight(id) {
    // 삭제 전 사용자에게 확인을 요청합니다.
    if (confirm("이 비행 기록을 정말로 삭제하시겠습니까?")) {
        // 일치하지 않는 아이디만 걸러내어 새로운 배열을 만듭니다.
        state.flights = state.flights.filter(flight => flight.id !== id);

        // 로컬스토리지에 저장 및 화면 재렌더링
        saveFlightsToStorage();
        renderApp();
    }
}

// 전역 스코프에 노출시켜 HTML inline onclick이 동작할 수 있도록 조치합니다.
window.deleteFlight = deleteFlight;

// ==========================================================================
// 4. 모달 창 제어 & 이벤트 바인딩
// ==========================================================================

function openModal() {
    elements.formModal.classList.add("active");
    // 모달을 열었을 때 자동으로 탑승일에 현재 날짜가 기본값으로 선택되도록 센스있는 편의 기능 추가
    const today = new Date().toISOString().split('T')[0];
    document.getElementById("flight-date").value = today;
}

function closeModal() {
    elements.formModal.classList.remove("active");
}

function setupEventListeners() {
    // 1. 실시간 검색창 입력 이벤트
    elements.searchInput.addEventListener("input", (e) => {
        state.searchQuery = e.target.value;
        renderApp();
    });

    // 2. 모달 열기/닫기 이벤트
    elements.openFormBtn.addEventListener("click", openModal);
    elements.closeModalBtn.addEventListener("click", closeModal);
    elements.cancelFormBtn.addEventListener("click", closeModal);

    // 모달 바깥 어두운 배경(Overlay)을 클릭했을 때 모달을 닫아주는 사용자 경험(UX) 개선 기능
    elements.formModal.addEventListener("click", (e) => {
        if (e.target === elements.formModal) {
            closeModal();
        }
    });

    // 3. 비행 등록 폼 제출 이벤트
    elements.addFlightForm.addEventListener("submit", handleAddFlightSubmit);
}

// 브라우저 로딩 완료 시 앱 실행
document.addEventListener("DOMContentLoaded", initApp);
