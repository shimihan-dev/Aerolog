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
    addFlightForm: document.getElementById("add-flight-form"),
    lookupBtn: document.getElementById("btn-lookup-flight"),
    lookupStatus: document.getElementById("lookup-status")
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
        ? `<a href="../Aerotype/index.html?id=${flight.aircraftTypeId}" target="_blank" class="aerotype-badge linked" title="클릭하여 AeroType 사전에서 상세 정보 보기 (ID: ${flight.aircraftTypeId})">
            <svg class="aerotype-badge-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
            AeroType 연동 기종
           </a>`
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

    // 편명 조회 상태 초기화
    elements.lookupStatus.className = "lookup-status-msg hidden";
    elements.lookupStatus.innerHTML = "";
}

function closeModal() {
    elements.formModal.classList.remove("active");
    // 편명 조회 상태 초기화
    elements.lookupStatus.className = "lookup-status-msg hidden";
    elements.lookupStatus.innerHTML = "";
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

    // 4. 편명 자동 조회 이벤트
    elements.lookupBtn.addEventListener("click", handleFlightLookup);
}

// Aviationstack IATA 기종 코드 <=> AeroType 기종 정보 매핑 사전
const AIRCRAFT_IATA_MAP = {
    "A223": { name: "Airbus A220-300", id: "A220-300" },
    "A221": { name: "Airbus A220-100", id: "A220-100" },
    "A318": { name: "Airbus A318", id: "A318" },
    "A319": { name: "Airbus A319", id: "A319" },
    "A320": { name: "Airbus A320", id: "A320" },
    "A321": { name: "Airbus A321", id: "A321" },
    "A19N": { name: "Airbus A319neo", id: "A319neo" },
    "A20N": { name: "Airbus A320neo", id: "A320neo" },
    "A21N": { name: "Airbus A321neo", id: "A321neo" },
    "A332": { name: "Airbus A330-200", id: "A330-200" },
    "A333": { name: "Airbus A330-300", id: "A330-300" },
    "A339": { name: "Airbus A330-900neo", id: "A330-900neo" },
    "A343": { name: "Airbus A340-300", id: "A340-300" },
    "A346": { name: "Airbus A340-600", id: "A340-600" },
    "A359": { name: "Airbus A350-900", id: "A350-900" },
    "A35K": { name: "Airbus A350-1000", id: "A350-1000" },
    "A388": { name: "Airbus A380-800", id: "A380-800" },
    "B737": { name: "Boeing 737", id: "B737" },
    "B738": { name: "Boeing 737-800", id: "B737-800" },
    "B739": { name: "Boeing 737-900", id: "B737-900" },
    "B37M": { name: "Boeing 737 MAX 8", id: "B737 MAX 8" },
    "B38M": { name: "Boeing 737 MAX 8", id: "B737 MAX 8" },
    "B39M": { name: "Boeing 737 MAX 9", id: "B737 MAX 9" },
    "B744": { name: "Boeing 747-400", id: "B747-400" },
    "B748": { name: "Boeing 747-8", id: "B747-8" },
    "B752": { name: "Boeing 757-200", id: "B757-200" },
    "B763": { name: "Boeing 767-300", id: "B767-300" },
    "B772": { name: "Boeing 777-200", id: "B777-200" },
    "B77W": { name: "Boeing 777-300ER", id: "B777-300ER" },
    "B788": { name: "Boeing 787-8", id: "B787-8" },
    "B789": { name: "Boeing 787-9", id: "B787-9" },
    "B78X": { name: "Boeing 787-10", id: "B787-10" },
    "E170": { name: "Embraer 170", id: "E170" },
    "E175": { name: "Embraer 175", id: "E175" },
    "E190": { name: "Embraer 190", id: "E190" },
    "E195": { name: "Embraer 195", id: "E195" }
};

/**
 * 편명을 실시간 API(Aviationstack)에서 조회하여 정보를 채워넣는 함수
 */
async function handleFlightLookup() {
    const flightNumInput = document.getElementById("flight-number");
    const flightNum = flightNumInput.value.trim().toUpperCase().replace(/\s+/g, ''); // 공백 제거

    // 1. 공백 검증
    if (!flightNum) {
        elements.lookupStatus.className = "lookup-status-msg error";
        elements.lookupStatus.textContent = "⚠ 편명을 입력한 후 조회를 눌러주세요.";
        flightNumInput.focus();
        return;
    }

    // 2. 조회 중 상태 UI 변경 (버튼 비활성화, 스피너 렌더링)
    elements.lookupBtn.disabled = true;
    elements.lookupStatus.className = "lookup-status-msg loading";
    elements.lookupStatus.innerHTML = `<span class="spinner"></span> 실시간 정보를 조회 중입니다...`;

    // 3. API 호출 설정
    const apiKey = "8c61bbc923c688a8a943e84b55284d1d";
    const apiUrl = `http://api.aviationstack.com/v1/flights?access_key=${apiKey}&flight_iata=${flightNum}`;

    try {
        const response = await fetch(apiUrl);
        if (!response.ok) {
            throw new Error(`HTTP 에러! 상태코드: ${response.status}`);
        }

        const result = await response.json();

        // API 내부 에러 핸들링 (예: API 키 유효성 에러 등)
        if (result.error) {
            throw new Error(result.error.message || result.error.info || "API 에러");
        }

        const flightsData = result.data;

        // 4. 응답 데이터 검증 및 폼 바인딩
        if (flightsData && flightsData.length > 0) {
            // 가장 최근 비행 정보 선택
            const flightInfo = flightsData[0];

            const airlineName = flightInfo.airline ? flightInfo.airline.name : "";
            const depIata = flightInfo.departure ? flightInfo.departure.iata : "";
            const arrIata = flightInfo.arrival ? flightInfo.arrival.iata : "";
            const registration = flightInfo.aircraft ? flightInfo.aircraft.registration : "";
            const aircraftIata = flightInfo.aircraft ? flightInfo.aircraft.iata : "";

            // 폼 필드 자동 입력
            document.getElementById("flight-airline").value = airlineName || "";
            document.getElementById("flight-dep").value = depIata || "";
            document.getElementById("flight-arr").value = arrIata || "";
            document.getElementById("flight-registration").value = registration || "";

            // 기종 매핑 처리
            let aircraftName = "";
            let aircraftId = "";

            if (aircraftIata) {
                const mapped = AIRCRAFT_IATA_MAP[aircraftIata.toUpperCase()];
                if (mapped) {
                    aircraftName = mapped.name;
                    aircraftId = mapped.id;
                } else {
                    aircraftName = aircraftIata; // 매핑 테이블에 없는 경우 코드명 그대로 노출
                }
            }

            document.getElementById("flight-typename").value = aircraftName;
            document.getElementById("flight-typeid").value = aircraftId;

            // 성공 피드백 메시지
            elements.lookupStatus.className = "lookup-status-msg success";
            elements.lookupStatus.textContent = "✓ 실시간 비행 정보를 성공적으로 가져왔습니다.";
        } else {
            // 데이터 없음
            elements.lookupStatus.className = "lookup-status-msg error";
            elements.lookupStatus.textContent = "⚠ 일치하는 실시간 노선 정보가 없습니다. 수동으로 입력해 주세요.";
        }
    } catch (error) {
        console.error("Flight Lookup Fetch Error:", error);
        
        elements.lookupStatus.className = "lookup-status-msg error";
        // 브라우저의 혼합 콘텐츠 차단(HTTPS에서 HTTP 호출 차단)으로 인한 에러인지 감별
        if (error.message && error.message.includes("Failed to fetch")) {
            elements.lookupStatus.innerHTML = `⚠ <strong>보안 차단:</strong> HTTPS 환경에서는 무료 HTTP API 통신이 차단됩니다. 로컬 파일(file://)로 접속하여 확인해 주세요.`;
        } else {
            elements.lookupStatus.textContent = `⚠ 조회 중 에러 발생: ${error.message}`;
        }
    } finally {
        // 버튼 상태 원복
        elements.lookupBtn.disabled = false;
    }
}

// 브라우저 로딩 완료 시 앱 실행
document.addEventListener("DOMContentLoaded", initApp);
