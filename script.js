/**
 * FlightLog MVP - 메인 로직 스크립트 (단일 사용자 버전)
 * 초보자 가이드: 이 파일은 웹 애플리케이션의 동작(이벤트 처리, 데이터 로드 및 저장, 화면 갱신 등)을 관리합니다.
 * LocalStorage를 활용하여 브라우저가 새로고침되어도 데이터가 유지되도록 합니다.
 */

// 애플리케이션 상태 (State) 관리 객체
const state = {
    flights: [],         // 현재 비행 기록 배열
    searchQuery: "",     // 현재 실시간 검색어
    editingFlightId: null // 현재 수정 중인 비행 기록 ID
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
    lookupStatus: document.getElementById("lookup-status"),
    statsModal: document.getElementById("stats-modal"),
    openStatsBtn: document.getElementById("open-stats-btn"),
    closeStatsBtn: document.getElementById("close-stats-btn"),
    closeStatsBtnX: document.getElementById("close-stats-btn-x"),
    dateInput: document.getElementById("flight-date"),
    datePickerBtn: document.getElementById("btn-date-picker"),
    datePickerHidden: document.getElementById("flight-date-picker"),
    seatInput: document.getElementById("flight-seat"),
    seatPositionSelect: document.getElementById("flight-seat-position"),
    seatClassSelect: document.getElementById("flight-seat-class"),
    
    // 요약 카드 상세 리스트 모달용 추가
    summaryDetailModal: document.getElementById("summary-detail-modal"),
    summaryDetailTitle: document.getElementById("summary-detail-title"),
    summaryDetailBody: document.getElementById("summary-detail-body-content"),
    closeSummaryDetailBtn: document.getElementById("close-summary-detail-btn"),
    closeSummaryDetailBtnX: document.getElementById("close-summary-detail-btn-x"),
    statAirlinesCard: document.getElementById("stat-total-airlines"),
    statTypesCard: document.getElementById("stat-total-types")
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

    // 2. 비행 날짜 기준 내림차순 정렬 (최신 탑승일 순으로 맨 위에 정렬)
    filteredFlights.sort((a, b) => {
        return (b.date || "").localeCompare(a.date || "");
    });

    // 3. 카드 그리드 초기화
    elements.grid.innerHTML = "";

    // 4. 필터링된 결과가 없을 경우 빈 화면(Empty State) 표시 처리
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

    // 5. 상단 통계 대시보드 갱신
    updateStatistics();

    // 6. 검색 결과 카운트 배지 갱신
    elements.filteredCount.textContent = filteredFlights.length;
}

/**
 * 좌석 위치(window, aisle, middle)를 한글로 변환하는 헬퍼 함수
 */
function getPositionKo(pos) {
    if (pos === "window") return "창가";
    if (pos === "aisle") return "복도";
    if (pos === "middle") return "중간";
    return "";
}

/**
 * 좌석 등급(economy, premium, business, first)을 한글로 변환하는 헬퍼 함수
 */
function getClassKo(cls) {
    if (cls === "economy") return "이코노미";
    if (cls === "premium") return "프리미엄 이코노미";
    if (cls === "business") return "비즈니스";
    if (cls === "first") return "퍼스트";
    return "";
}

/**
 * 좌석 번호 끝 알파벳을 분석하여 좌석 위치를 추정하는 함수 (구버전 호환성용)
 */
function guessSeatPosition(seat) {
    if (!seat) return "";
    const last = seat.trim().toUpperCase().slice(-1);
    if (["A", "F", "K"].includes(last)) return "window";
    if (["C", "D", "G", "H"].includes(last)) return "aisle";
    if (["B", "E", "J"].includes(last)) return "middle";
    return "";
}

/**
 * 단일 비행 기록 객체를 바탕으로 보딩패스 형태의 HTML 문자열을 만드는 함수
 */
function createFlightCardHTML(flight) {
    // AeroType 프로젝트와의 연동 여부를 판단합니다.
    // aircraftTypeId가 존재하면 'AeroType 연동 기종' 배지를 렌더링합니다.
    const isLinked = flight.aircraftTypeId && flight.aircraftTypeId.trim() !== "";
    // 실행 환경(로컬 vs Vercel 배포서버)에 따른 AeroType 경로 분기 처리
    const isLocal = window.location.protocol === 'file:' || 
                    window.location.hostname === 'localhost' || 
                    window.location.hostname === '127.0.0.1';
    
    const aeroTypeBaseUrl = isLocal 
        ? '../Aerotype/index.html' 
        : 'https://aerotype-iota.vercel.app/';

    const badgeHTML = isLinked
        ? `<a href="${aeroTypeBaseUrl}?id=${flight.aircraftTypeId}" target="_blank" class="aerotype-badge linked" title="클릭하여 AeroType 사전에서 상세 정보 보기 (ID: ${flight.aircraftTypeId})">
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
                    <span class="detail-label">좌석 정보</span>
                    <span class="detail-value number-font" style="line-height: 1.25;">
                        ${flight.seat ? flight.seat : '-'}
                        ${(flight.seatPosition || flight.seatClass || (flight.seat && guessSeatPosition(flight.seat))) ? `
                            <span style="font-size: 0.72rem; color: var(--text-medium); display: block; font-weight: 500; margin-top: 3px; font-family: var(--font-sans);">
                                ${[
                                    getPositionKo(flight.seatPosition || guessSeatPosition(flight.seat)),
                                    getClassKo(flight.seatClass)
                                ].filter(Boolean).join(', ')}
                            </span>
                        ` : ''}
                    </span>
                </div>
            </div>

            <!-- 4. 메모 및 액션 영역 -->
            <div class="ticket-memo">
                <p class="memo-text">${memoContent}</p>
                <div class="ticket-actions">
                    <button class="btn-edit" onclick="editFlight('${flight.id}')" title="비행 기록 수정">
                        <svg class="edit-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
                        수정
                    </button>
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
 * 사용자 입력 기종명을 바탕으로 AeroType 연동 기종 ID를 자동으로 유추/매핑하는 함수
 */
function deriveAircraftTypeId(typeName) {
    if (!typeName) return "";
    const name = typeName.trim().toUpperCase().replace(/\s+/g, ''); // 공백 제거 후 대문자화

    // 표준 기종명 키워드 매칭
    if (name.includes("787-9") || name.includes("789")) return "B787-9";
    if (name.includes("787-8") || name.includes("788")) return "B787-8";
    if (name.includes("787-10") || name.includes("78X")) return "B787-10";
    if (name.includes("787")) return "B787-9"; // 기본값 지정
    
    if (name.includes("777-300ER") || name.includes("77W")) return "B777-300ER";
    if (name.includes("777-200") || name.includes("772")) return "B777-200";
    if (name.includes("777")) return "B777-300ER";
    
    if (name.includes("737-800") || name.includes("738")) return "B737-800";
    if (name.includes("737MAX8") || name.includes("37M") || name.includes("38M")) return "B737 MAX 8";
    if (name.includes("737MAX9") || name.includes("39M")) return "B737 MAX 9";
    if (name.includes("737")) return "B737-800";
    
    if (name.includes("747-400") || name.includes("744")) return "B747-400";
    if (name.includes("747-8") || name.includes("748")) return "B747-8";
    
    if (name.includes("350-900") || name.includes("359")) return "A350-900";
    if (name.includes("350-1000") || name.includes("35K")) return "A350-1000";
    if (name.includes("350")) return "A350-900";
    
    if (name.includes("380-800") || name.includes("388") || name.includes("380")) return "A380-800";
    
    if (name.includes("330-300") || name.includes("333")) return "A330-300";
    if (name.includes("330-200") || name.includes("332")) return "A330-200";
    if (name.includes("330-900") || name.includes("339")) return "A330-900neo";
    
    if (name.includes("220-300") || name.includes("223")) return "A220-300";
    if (name.includes("220-100") || name.includes("221")) return "A220-100";
    
    if (name.includes("321NEO") || name.includes("321N") || name.includes("21N")) return "A321neo";
    if (name.includes("320NEO") || name.includes("320N") || name.includes("20N")) return "A320neo";
    if (name.includes("321")) return "A321";
    if (name.includes("320")) return "A320";
    if (name.includes("319")) return "A319";
    if (name.includes("318")) return "A318";
    
    if (name.includes("DASH-8") || name.includes("DASH8") || name.includes("Q400") || name.includes("DH4")) return "Dash8-400";
    if (name.includes("DH1") || name.includes("DASH8-100")) return "Dash8-100";
    if (name.includes("DH2") || name.includes("DASH8-200")) return "Dash8-200";
    if (name.includes("DH3") || name.includes("DASH8-300")) return "Dash8-300";

    if (name.includes("E170") || name.includes("170")) return "E170";
    if (name.includes("E175") || name.includes("175")) return "E175";
    if (name.includes("E190") || name.includes("190")) return "E190";
    if (name.includes("E195") || name.includes("195")) return "E195";

    // 일치하는 대안이 없으면, 입력한 원래 텍스트를 그대로 식별자로 써봅니다.
    return typeName.trim();
}

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
    
    let aircraftTypeId = document.getElementById("flight-typeid").value.trim();
    if (!aircraftTypeId) {
        aircraftTypeId = deriveAircraftTypeId(aircraftTypeName);
    }

    const seat = document.getElementById("flight-seat").value.trim().toUpperCase();
    const seatPosition = document.getElementById("flight-seat-position").value;
    const seatClass = document.getElementById("flight-seat-class").value;
    const memo = document.getElementById("flight-memo").value;

    if (state.editingFlightId) {
        // [수정 모드] 기존 비행 정보 업데이트
        const flightIndex = state.flights.findIndex(f => f.id === state.editingFlightId);
        if (flightIndex > -1) {
            state.flights[flightIndex] = {
                ...state.flights[flightIndex],
                date,
                airline,
                flightNumber,
                registration,
                departureAirport,
                arrivalAirport,
                aircraftTypeName,
                aircraftTypeId,
                seat,
                seatPosition,
                seatClass,
                memo
            };
        }
        state.editingFlightId = null; // 수정 모드 해제
    } else {
        // [신규 모드] 새로운 비행 기록 추가
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
            seatPosition,
            seatClass,
            memo
        };
        state.flights.unshift(newFlight);
    }

    // 로컬스토리지에 저장 및 화면 재렌더링
    saveFlightsToStorage();
    renderApp();

    // 입력 폼 초기화 및 모달 닫기
    elements.addFlightForm.reset();
    closeModal();
}

/**
 * 비행 로그 수정을 위해 기존 데이터를 폼에 로드하는 함수
 */
function editFlight(id) {
    const flight = state.flights.find(f => f.id === id);
    if (!flight) return;

    // 폼 필드 채우기
    document.getElementById("flight-date").value = flight.date;
    document.getElementById("flight-airline").value = flight.airline;
    document.getElementById("flight-number").value = flight.flightNumber;
    document.getElementById("flight-registration").value = flight.registration || "";
    document.getElementById("flight-dep").value = flight.departureAirport;
    document.getElementById("flight-arr").value = flight.arrivalAirport;
    document.getElementById("flight-typename").value = flight.aircraftTypeName;
    document.getElementById("flight-typeid").value = flight.aircraftTypeId || "";
    document.getElementById("flight-seat").value = flight.seat || "";
    document.getElementById("flight-seat-position").value = flight.seatPosition || "";
    document.getElementById("flight-seat-class").value = flight.seatClass || "";
    document.getElementById("flight-memo").value = flight.memo || "";

    // 모달 타이틀 및 등록 버튼 텍스트 수정 모드로 변경
    document.getElementById("modal-title").textContent = "비행 기록 수정";
    document.getElementById("submit-form-btn").textContent = "수정완료";

    // 에디팅 타겟 세팅 및 모달 오픈
    state.editingFlightId = id;
    
    // 모달 강제 오픈
    elements.formModal.classList.add("active");
    elements.lookupStatus.className = "lookup-status-msg hidden";
    elements.lookupStatus.innerHTML = "";
}

window.editFlight = editFlight;

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
    
    // 모달 타이틀 및 등록 버튼 텍스트 초기 상태로 복구
    document.getElementById("modal-title").textContent = "새로운 비행 기록 등록";
    document.getElementById("submit-form-btn").textContent = "등록하기";
    state.editingFlightId = null;

    // 모달을 열었을 때 자동으로 탑승일에 현재 날짜가 기본값으로 선택되도록 센스있는 편의 기능 추가
    const today = new Date().toISOString().split('T')[0];
    document.getElementById("flight-date").value = today;

    // 편명 조회 상태 초기화
    elements.lookupStatus.className = "lookup-status-msg hidden";
    elements.lookupStatus.innerHTML = "";
}

function closeModal() {
    elements.formModal.classList.remove("active");
    
    // 수정 모드 상태 초기화
    state.editingFlightId = null;
    elements.addFlightForm.reset();

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

    // 5. 상세 통계 모달 열기/닫기 이벤트
    elements.openStatsBtn.addEventListener("click", openStatsModal);
    elements.closeStatsBtn.addEventListener("click", closeStatsModal);
    elements.closeStatsBtnX.addEventListener("click", closeStatsModal);

    elements.statsModal.addEventListener("click", (e) => {
        if (e.target === elements.statsModal) {
            closeStatsModal();
        }
    });

    // 6. 탑승일 직접 타이핑 및 달력 선택 동시 지원
    elements.datePickerBtn.addEventListener("click", () => {
        try {
            elements.datePickerHidden.showPicker();
        } catch (error) {
            console.error("showPicker error, falling back to click:", error);
            elements.datePickerHidden.click();
        }
    });

    elements.datePickerHidden.addEventListener("change", (e) => {
        if (e.target.value) {
            elements.dateInput.value = e.target.value;
        }
    });

    // 탑승일 입력 시 Hyphen(-) 자동 완성 및 형식 제어
    elements.dateInput.addEventListener("input", (e) => {
        let val = e.target.value.replace(/\D/g, ""); // 숫자만 남김
        if (val.length > 8) val = val.slice(0, 8);

        // YYYY-MM-DD 포맷팅
        if (val.length >= 6) {
            e.target.value = `${val.slice(0, 4)}-${val.slice(4, 6)}-${val.slice(6)}`;
        } else if (val.length >= 4) {
            e.target.value = `${val.slice(0, 4)}-${val.slice(4)}`;
        } else {
            e.target.value = val;
        }
    });

    // 7. 좌석 번호 타이핑 시 좌석 위치 자동완성 예측 리스너
    elements.seatInput.addEventListener("input", (e) => {
        const val = e.target.value.trim().toUpperCase();
        if (val) {
            const guessed = guessSeatPosition(val);
            if (guessed) {
                elements.seatPositionSelect.value = guessed;
            }
        }
    });

    // 8. 요약 대시보드 카드 클릭 이벤트 및 팝업 모달 제어
    elements.statAirlinesCard.addEventListener("click", openAirlinesDetailModal);
    elements.statTypesCard.addEventListener("click", openTypesDetailModal);
    elements.closeSummaryDetailBtn.addEventListener("click", closeSummaryDetailModal);
    elements.closeSummaryDetailBtnX.addEventListener("click", closeSummaryDetailModal);

    elements.summaryDetailModal.addEventListener("click", (e) => {
        if (e.target === elements.summaryDetailModal) {
            closeSummaryDetailModal();
        }
    });
}

// Aviationstack 영문 항공사명 => 한글 항공사명 매핑 사전
const AIRLINE_KOREAN_MAP = {
    "Korean Air": "대한항공",
    "Asiana Airlines": "아시아나항공",
    "Jeju Air": "제주항공",
    "Jin Air": "진에어",
    "Air Busan": "에어부산",
    "Air Seoul": "에어서울",
    "T'way Air": "티웨이항공",
    "Tway Air": "티웨이항공",
    "Eastar Jet": "이스타항공",
    "Air Premia": "에어프레미아",
    "Aero K": "에어로케이",
    "Japan Airlines": "일본항공",
    "All Nippon Airways": "전일본공수",
    "Delta Air Lines": "델타항공",
    "United Airlines": "유나이티드항공",
    "American Airlines": "아메리칸항공",
    "Singapore Airlines": "싱가포르항공",
    "Cathay Pacific": "캐세이퍼시픽항공",
    "Emirates": "에미레이트항공",
    "Qatar Airways": "카타르항공",
    "China Southern Airlines": "중국남방항공",
    "China Eastern Airlines": "중국동방항공",
    "Air China": "중국국제항공",
    "VietJet Air": "비엣젯항공",
    "Vietnam Airlines": "베트남항공",
    "Thai Airways": "타이항공",
    "Lufthansa": "루프트한자",
    "Air France": "에어프랑스",
    "KLM": "KLM 네덜란드 항공",
    "British Airways": "영국항공",
    "Peach Aviation": "피치항공",
    "Hong Kong Express": "홍콩익스프레스"
};

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
    "E195": { name: "Embraer 195", id: "E195" },
    "DH1": { name: "Bombardier Dash 8-100", id: "Dash8-100" },
    "DH2": { name: "Bombardier Dash 8-200", id: "Dash8-200" },
    "DH3": { name: "Bombardier Dash 8-300", id: "Dash8-300" },
    "DH4": { name: "Bombardier Dash 8 Q400", id: "Dash8-400" }
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
            // 가능하면 항공기 정보(등록부호 혹은 IATA 기종 코드)가 누락되지 않고 온전히 채워진 데이터를 우선적으로 찾아 바인딩합니다.
            const flightInfo = flightsData.find(f => f.aircraft && (f.aircraft.registration || f.aircraft.iata)) || flightsData[0];

            let airlineName = flightInfo.airline ? flightInfo.airline.name : "";
            
            // 영어 항공사명을 사전 매핑을 통해 한글명으로 치환
            if (airlineName) {
                const mappedName = AIRLINE_KOREAN_MAP[airlineName.trim()];
                if (mappedName) {
                    airlineName = mappedName;
                }
            }

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

/**
 * 상세 통계 모달을 여는 함수
 */
function openStatsModal() {
    elements.statsModal.classList.add("active");
    calculateFlightStats();
}

/**
 * 상세 통계 모달을 닫는 함수
 */
function closeStatsModal() {
    elements.statsModal.classList.remove("active");
}

/**
 * 현재 저장된 비행 기록을 집계하여 통계 대시보드를 렌더링하는 함수
 */
function calculateFlightStats() {
    const flights = state.flights;
    const totalFlights = flights.length;

    // 1. 총 비행 횟수 바인딩
    document.getElementById("stats-total-flights").textContent = totalFlights;

    if (totalFlights === 0) {
        document.getElementById("stats-total-routes").textContent = "0";
        document.getElementById("stats-link-ratio").textContent = "0%";
        document.getElementById("airlines-chart-container").innerHTML = '<p style="font-size:0.8rem;color:var(--text-muted);text-align:center;padding:12px 0;">등록된 비행이 없습니다.</p>';
        document.getElementById("airports-chart-container").innerHTML = '<p style="font-size:0.8rem;color:var(--text-muted);text-align:center;padding:12px 0;">등록된 비행이 없습니다.</p>';
        
        // 제조사 초기화
        document.getElementById("airbus-percentage").textContent = "0%";
        document.getElementById("boeing-percentage").textContent = "0%";
        document.getElementById("ratio-bar-airbus").style.width = "0%";
        document.getElementById("ratio-bar-boeing").style.width = "0%";
        document.getElementById("airbus-count-label").textContent = "0회 탑승";
        document.getElementById("boeing-count-label").textContent = "0회 탑승";

        // 좌석 초기화
        document.getElementById("seat-window-percent").textContent = "0%";
        document.getElementById("seat-window-bar").style.width = "0%";
        document.getElementById("seat-aisle-percent").textContent = "0%";
        document.getElementById("seat-aisle-bar").style.width = "0%";
        document.getElementById("seat-other-percent").textContent = "0%";
        document.getElementById("seat-other-bar").style.width = "0%";
        return;
    }

    // 2. 고유 노선 계산 (GMP-CJU 와 CJU-GMP는 양방향 왕복 노선으로 간주하여 동일 노선으로 집계)
    const routesSet = new Set();
    flights.forEach(f => {
        const dep = (f.departureAirport || "").trim().toUpperCase();
        const arr = (f.arrivalAirport || "").trim().toUpperCase();
        if (dep && arr) {
            const routeKey = dep < arr ? `${dep}-${arr}` : `${arr}-${dep}`;
            routesSet.add(routeKey);
        }
    });
    document.getElementById("stats-total-routes").textContent = routesSet.size;

    // 3. AeroType 연동률 계산
    const linkedFlightsCount = flights.filter(f => f.aircraftTypeId && f.aircraftTypeId.trim() !== "").length;
    const linkRatio = Math.round((linkedFlightsCount / totalFlights) * 100);
    document.getElementById("stats-link-ratio").textContent = `${linkRatio}%`;

    // 4. 항공사 TOP 3 계산 및 렌더링
    const airlineCounts = {};
    flights.forEach(f => {
        const name = (f.airline || "기타").trim();
        airlineCounts[name] = (airlineCounts[name] || 0) + 1;
    });

    const sortedAirlines = Object.entries(airlineCounts)
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count);

    const topAirlines = sortedAirlines.slice(0, 3);
    const airlinesContainer = document.getElementById("airlines-chart-container");
    airlinesContainer.innerHTML = "";

    const airlineColors = ["accent", "success", "warning"];

    topAirlines.forEach((item, index) => {
        const pct = Math.round((item.count / totalFlights) * 100);
        const colorClass = airlineColors[index] || "accent";
        const barHTML = `
            <div class="chart-bar-item">
                <div class="bar-label-row">
                    <span>${index + 1}. ${item.name} (${item.count}회)</span>
                    <span>${pct}%</span>
                </div>
                <div class="bar-wrapper">
                    <div class="bar-fill ${colorClass}" style="width: ${pct}%"></div>
                </div>
            </div>
        `;
        airlinesContainer.insertAdjacentHTML("beforeend", barHTML);
    });

    // 5. 제조사 비율 계산 (Airbus vs Boeing)
    let airbusCount = 0;
    let boeingCount = 0;
    let classifiedCount = 0;

    flights.forEach(f => {
        const typeName = (f.aircraftTypeName || "").trim().toLowerCase();
        if (typeName.includes("airbus") || typeName.startsWith("a3") || typeName.startsWith("a2")) {
            airbusCount++;
            classifiedCount++;
        } else if (typeName.includes("boeing") || typeName.startsWith("b7") || typeName.startsWith("b3")) {
            boeingCount++;
            classifiedCount++;
        }
    });

    const airbusPercentage = classifiedCount > 0 ? Math.round((airbusCount / classifiedCount) * 100) : 50;
    const boeingPercentage = classifiedCount > 0 ? Math.round((boeingCount / classifiedCount) * 100) : 50;

    document.getElementById("airbus-percentage").textContent = `${classifiedCount > 0 ? airbusPercentage : 0}%`;
    document.getElementById("boeing-percentage").textContent = `${classifiedCount > 0 ? boeingPercentage : 0}%`;
    
    // 차트 애니메이션 딜레이 렌더링
    setTimeout(() => {
        document.getElementById("ratio-bar-airbus").style.width = `${classifiedCount > 0 ? airbusPercentage : 0}%`;
        document.getElementById("ratio-bar-boeing").style.width = `${classifiedCount > 0 ? boeingPercentage : 0}%`;
    }, 100);
    
    document.getElementById("airbus-count-label").textContent = `${airbusCount}회 탑승`;
    document.getElementById("boeing-count-label").textContent = `${boeingCount}회 탑승`;

    // 6. 좌석 선호도 비율 계산 (입력받은 seatPosition 기준, 구버전은 guessSeatPosition 폴백 적용)
    let windowSeats = 0;
    let aisleSeats = 0;
    let middleSeats = 0;
    let totalSeatsWithInfo = 0;

    flights.forEach(f => {
        // 1순위: 명시적으로 선택된 좌석 위치 정보 사용
        let pos = f.seatPosition;
        
        // 2순위: 정보가 없는 경우 좌석 번호 문자열을 분석하여 유추 (폴백)
        if (!pos && f.seat) {
            pos = guessSeatPosition(f.seat);
        }
        
        if (pos === "window") {
            windowSeats++;
            totalSeatsWithInfo++;
        } else if (pos === "aisle") {
            aisleSeats++;
            totalSeatsWithInfo++;
        } else if (pos === "middle") {
            middleSeats++;
            totalSeatsWithInfo++;
        }
    });

    if (totalSeatsWithInfo > 0) {
        const winPct = Math.round((windowSeats / totalSeatsWithInfo) * 100);
        const aislePct = Math.round((aisleSeats / totalSeatsWithInfo) * 100);
        const otherPct = 100 - winPct - aislePct;

        document.getElementById("seat-window-percent").textContent = `${winPct}%`;
        document.getElementById("seat-aisle-percent").textContent = `${aislePct}%`;
        document.getElementById("seat-other-percent").textContent = `${otherPct}%`;
        
        setTimeout(() => {
            document.getElementById("seat-window-bar").style.width = `${winPct}%`;
            document.getElementById("seat-aisle-bar").style.width = `${aislePct}%`;
            document.getElementById("seat-other-bar").style.width = `${otherPct}%`;
        }, 100);
    } else {
        document.getElementById("seat-window-percent").textContent = "0%";
        document.getElementById("seat-window-bar").style.width = "0%";
        document.getElementById("seat-aisle-percent").textContent = "0%";
        document.getElementById("seat-aisle-bar").style.width = "0%";
        document.getElementById("seat-other-percent").textContent = "0%";
        document.getElementById("seat-other-bar").style.width = "0%";
    }

    // 7. 공항 방문 TOP 5 계산 (출발/도착 통합 집계)
    const airportCounts = {};
    flights.forEach(f => {
        const dep = (f.departureAirport || "").trim().toUpperCase();
        const arr = (f.arrivalAirport || "").trim().toUpperCase();
        if (dep) airportCounts[dep] = (airportCounts[dep] || 0) + 1;
        if (arr) airportCounts[arr] = (airportCounts[arr] || 0) + 1;
    });

    const sortedAirports = Object.entries(airportCounts)
        .map(([code, count]) => ({ code, count }))
        .sort((a, b) => b.count - a.count);

    const topAirports = sortedAirports.slice(0, 5);
    const airportsContainer = document.getElementById("airports-chart-container");
    airportsContainer.innerHTML = "";

    topAirports.forEach(item => {
        const chipHTML = `
            <div class="airport-chip" title="총 ${item.count}회 이용">
                <span>${item.code}</span>
                <span class="airport-count">${item.count}회</span>
            </div>
        `;
        airportsContainer.insertAdjacentHTML("beforeend", chipHTML);
    });
}

/**
 * 탑승 항공사 상세 목록 모달을 여는 함수
 */
function openAirlinesDetailModal() {
    const flights = state.flights;
    elements.summaryDetailTitle.textContent = "✈️ 탑승 항공사 및 노선 정보";
    
    if (flights.length === 0) {
        elements.summaryDetailBody.innerHTML = '<p style="text-align:center; color:var(--text-muted); padding:20px 0; font-size:0.9rem;">기록된 비행 로그가 없습니다.</p>';
        elements.summaryDetailModal.classList.add("active");
        return;
    }

    // 항공사별 데이터 집계
    const airlineGroups = {};
    flights.forEach(f => {
        const airline = (f.airline || "기타 항공사").trim();
        if (!airlineGroups[airline]) {
            airlineGroups[airline] = {
                count: 0,
                routes: {}
            };
        }
        airlineGroups[airline].count++;
        
        const dep = (f.departureAirport || "").trim().toUpperCase();
        const arr = (f.arrivalAirport || "").trim().toUpperCase();
        if (dep && arr) {
            const routeKey = `${dep} ➔ ${arr}`;
            airlineGroups[airline].routes[routeKey] = (airlineGroups[airline].routes[routeKey] || 0) + 1;
        }
    });

    // 탑승 횟수 순으로 정렬
    const sortedAirlines = Object.entries(airlineGroups)
        .map(([name, data]) => ({ name, ...data }))
        .sort((a, b) => b.count - a.count);

    let html = '<div class="summary-detail-list">';
    sortedAirlines.forEach(item => {
        const sortedRoutes = Object.entries(item.routes)
            .sort((a, b) => b[1] - a[1]); // 해당 항공사에서 많이 탄 노선 순

        let routesHTML = '';
        if (sortedRoutes.length > 0) {
            sortedRoutes.forEach(([route, count]) => {
                const parts = route.split(" ➔ ");
                routesHTML += `
                    <div class="summary-detail-route-item">
                        <span class="route-text-block">${parts[0]}<span class="route-arrow">➔</span>${parts[1]}</span>
                        <span class="route-count-badge">${count}회</span>
                    </div>
                `;
            });
        } else {
            routesHTML = '<p style="font-size:0.75rem; color:var(--text-muted); margin:0;">기록된 노선 정보가 없습니다.</p>';
        }

        html += `
            <div class="summary-detail-group-card">
                <div class="summary-detail-group-header">
                    <span class="summary-detail-group-title">${item.name}</span>
                    <span class="summary-detail-group-badge">총 ${item.count}회 탑승</span>
                </div>
                <div class="summary-detail-routes-list">
                    ${routesHTML}
                </div>
            </div>
        `;
    });
    html += '</div>';

    elements.summaryDetailBody.innerHTML = html;
    elements.summaryDetailModal.classList.add("active");
}

/**
 * 탑승 기종 상세 목록 모달을 여는 함수
 */
function openTypesDetailModal() {
    const flights = state.flights;
    elements.summaryDetailTitle.textContent = "🏢 탑승 기종 상세 정보";

    if (flights.length === 0) {
        elements.summaryDetailBody.innerHTML = '<p style="text-align:center; color:var(--text-muted); padding:20px 0; font-size:0.9rem;">기록된 비행 로그가 없습니다.</p>';
        elements.summaryDetailModal.classList.add("active");
        return;
    }

    // 기종별 데이터 집계
    const typeGroups = {};
    flights.forEach(f => {
        const typeName = (f.aircraftTypeName || "기타 기종").trim();
        const typeId = (f.aircraftTypeId || "").trim();
        
        if (!typeGroups[typeName]) {
            typeGroups[typeName] = {
                count: 0,
                typeId: typeId
            };
        }
        typeGroups[typeName].count++;
        if (typeId && !typeGroups[typeName].typeId) {
            typeGroups[typeName].typeId = typeId;
        }
    });

    // 탑승 횟수 순으로 정렬
    const sortedTypes = Object.entries(typeGroups)
        .map(([name, data]) => ({ name, ...data }))
        .sort((a, b) => b.count - a.count);

    // 실행 환경 분기 처리
    const isLocal = window.location.protocol === 'file:' || 
                    window.location.hostname === 'localhost' || 
                    window.location.hostname === '127.0.0.1';
    const aeroTypeBaseUrl = isLocal 
        ? '../Aerotype/index.html' 
        : 'https://aerotype-iota.vercel.app/';

    let html = '<div class="summary-detail-list">';
    sortedTypes.forEach(item => {
        let badgeHTML = '';
        if (item.typeId) {
            badgeHTML = `
                <a href="${aeroTypeBaseUrl}?id=${item.typeId}" target="_blank" class="aerotype-badge linked" style="margin: 0; padding: 6px 12px;" title="클릭하여 AeroType 사전에서 상세 스펙 보기">
                    AeroType 도감 연동
                </a>
            `;
        } else {
            badgeHTML = `<span style="font-size: 0.72rem; color: var(--text-muted);">도감 연동 불가</span>`;
        }

        html += `
            <div class="summary-detail-group-card">
                <div class="summary-detail-type-row">
                    <div>
                        <span class="summary-detail-group-title" style="display:block;">${item.name}</span>
                        <span class="summary-detail-group-badge" style="margin-top: 6px; display:inline-block;">총 ${item.count}회 탑승</span>
                    </div>
                    ${badgeHTML}
                </div>
            </div>
        `;
    });
    html += '</div>';

    elements.summaryDetailBody.innerHTML = html;
    elements.summaryDetailModal.classList.add("active");
}

/**
 * 요약 상세 모달을 닫는 함수
 */
function closeSummaryDetailModal() {
    elements.summaryDetailModal.classList.remove("active");
}

// 브라우저 로딩 완료 시 앱 실행
document.addEventListener("DOMContentLoaded", initApp);
