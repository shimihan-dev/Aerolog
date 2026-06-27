/**
 * FlightLog MVP - 메인 로직 스크립트 (로그인 기능 추가 버전)
 * 초보자 가이드: 이 파일은 웹 애플리케이션의 동작 및 LocalStorage를 활용한 회원가입/로그인 세션을 관리합니다.
 * 각 사용자마다 고유한 비행 데이터를 저장하도록 데이터 격리 처리를 추가했습니다.
 */

// 애플리케이션 전역 상태 (State) 관리 객체
const state = {
    currentUser: null,   // 현재 로그인한 사용자 정보 { email, name }
    flights: [],         // 현재 로그인한 사용자의 비행 기록 배열
    searchQuery: ""      // 현재 실시간 검색어
};

// DOM 요소 참조 객체
const elements = {
    // 앱 컨테이너 및 헤더 관련
    authContainer: document.getElementById("auth-container"),
    mainAppContainer: document.getElementById("main-app-container"),
    userDisplayName: document.getElementById("user-display-name"),
    logoutBtn: document.getElementById("logout-btn"),

    // 로그인 / 회원가입 폼 관련
    loginForm: document.getElementById("login-form"),
    registerForm: document.getElementById("register-form"),
    toRegisterBtn: document.getElementById("to-register-btn"),
    toLoginBtn: document.getElementById("to-login-btn"),

    // 메인 앱 기능 관련
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
// 1. 초기화 및 세션 관리 (Authentication & Session)
// ==========================================================================

/**
 * 앱 시작 시 로그인 세션을 체크하고 초기화하는 함수
 */
function initApp() {
    // 1. 로컬스토리지에서 현재 로그인 세션 확인
    const session = localStorage.getItem("flightLog_current_user");

    if (session) {
        // 세션 정보가 존재하면 자동 로그인 처리
        state.currentUser = JSON.parse(session);
        showMainApp();
    } else {
        // 세션 정보가 없으면 로그인 화면 노출
        showAuthScreen();
    }

    // 공통 이벤트 리스너 등록
    setupEventListeners();
}

/**
 * 메인 앱 화면을 노출하고 데이터를 로드하는 함수
 */
function showMainApp() {
    elements.authContainer.classList.add("hidden");
    elements.mainAppContainer.classList.remove("hidden");
    elements.userDisplayName.textContent = `${state.currentUser.name} 님`;

    // 해당 사용자 고유의 비행기 기록 로드
    loadUserFlights();
    renderApp();
}

/**
 * 로그인/회원가입 화면을 노출하는 함수
 */
function showAuthScreen() {
    elements.mainAppContainer.classList.add("hidden");
    elements.authContainer.classList.remove("hidden");
    state.currentUser = null;
    state.flights = [];
}

/**
 * 로그인한 사용자 고유의 비행 데이터를 불러오는 함수
 */
function loadUserFlights() {
    // 사용자 이메일별로 고유 키를 정의하여 데이터를 격리합니다. (예: flightLog_flights_abc@email.com)
    const userStorageKey = `flightLog_flights_${state.currentUser.email}`;
    const storedFlights = localStorage.getItem(userStorageKey);

    if (storedFlights) {
        state.flights = JSON.parse(storedFlights);
    } else {
        // 신규 유저의 편의를 위해 초기 3개의 샘플 데이터를 자동으로 세팅해줍니다. (이행 계획 합의사항)
        state.flights = [...window.sampleFlights];
        saveFlightsToStorage(); 
    }
}

/**
 * 현재 사용자의 비행 데이터를 로컬스토리지에 저장하는 함수
 */
function saveFlightsToStorage() {
    if (state.currentUser) {
        const userStorageKey = `flightLog_flights_${state.currentUser.email}`;
        localStorage.setItem(userStorageKey, JSON.stringify(state.flights));
    }
}

// ==========================================================================
// 2. 회원가입 및 로그인 처리 로직
// ==========================================================================

/**
 * 회원가입 폼 제출 처리 함수
 */
function handleRegisterSubmit(e) {
    e.preventDefault();

    const name = document.getElementById("register-name").value.trim();
    const email = document.getElementById("register-email").value.trim().toLowerCase();
    const password = document.getElementById("register-password").value;

    // 가입된 전체 회원 목록 가져오기
    const usersJson = localStorage.getItem("flightLog_users") || "[]";
    const users = JSON.parse(usersJson);

    // 이메일 중복 검사
    const isDuplicate = users.some(user => user.email === email);
    if (isDuplicate) {
        alert("이미 가입된 이메일 주소입니다.");
        return;
    }

    // 신규 회원 등록
    users.push({ name, email, password });
    localStorage.setItem("flightLog_users", JSON.stringify(users));

    // 이메일 전용 비행 기록 저장 공간에 기본 샘플 데이터 자동 세팅
    const userStorageKey = `flightLog_flights_${email}`;
    localStorage.setItem(userStorageKey, JSON.stringify(window.sampleFlights));

    alert("회원가입이 완료되었습니다! 로그인해 주세요.");
    
    // 로그인 폼으로 전환 및 이메일 입력값 세팅
    toggleAuthForm("login");
    document.getElementById("login-email").value = email;
    document.getElementById("login-password").focus();
}

/**
 * 로그인 폼 제출 처리 함수
 */
function handleLoginSubmit(e) {
    e.preventDefault();

    const email = document.getElementById("login-email").value.trim().toLowerCase();
    const password = document.getElementById("login-password").value;

    // 가입된 전체 회원 목록 가져오기
    const usersJson = localStorage.getItem("flightLog_users") || "[]";
    const users = JSON.parse(usersJson);

    // 회원 일치 검증
    const matchedUser = users.find(user => user.email === email && user.password === password);

    if (matchedUser) {
        // 세션 정보 로컬스토리지에 임시 저장
        const sessionData = { email: matchedUser.email, name: matchedUser.name };
        localStorage.setItem("flightLog_current_user", JSON.stringify(sessionData));
        state.currentUser = sessionData;

        // 메인 화면 로딩
        showMainApp();
        
        // 입력 폼 리셋
        elements.loginForm.reset();
    } else {
        alert("이메일 또는 비밀번호가 올바르지 않습니다.");
    }
}

/**
 * 로그아웃 처리 함수
 */
function handleLogout() {
    if (confirm("로그아웃 하시겠습니까?")) {
        localStorage.removeItem("flightLog_current_user");
        showAuthScreen();
    }
}

/**
 * 로그인 폼 <=> 회원가입 폼 화면 전환 함수
 */
function toggleAuthForm(type) {
    if (type === "register") {
        elements.loginForm.classList.add("hidden");
        elements.registerForm.classList.remove("hidden");
        document.getElementById("auth-subtitle").textContent = "간단한 정보만으로 나만의 비행 로그북을 만들어보세요.";
    } else {
        elements.registerForm.classList.add("hidden");
        elements.loginForm.classList.remove("hidden");
        document.getElementById("auth-subtitle").textContent = "비행을 기록하고 나의 여정을 시작하세요";
    }
}

// ==========================================================================
// 3. 비행기 기록 화면 렌더링 및 통계 계산
// ==========================================================================

function renderApp() {
    // 1. 실시간 검색어를 기반으로 비행 기록 필터링
    const filteredFlights = state.flights.filter(flight => {
        const query = state.searchQuery.toLowerCase().trim();
        if (!query) return true;

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

    // 3. 필터링 결과 처리
    if (filteredFlights.length === 0) {
        elements.emptyState.classList.remove("hidden");
        elements.grid.style.display = "none";
    } else {
        elements.emptyState.classList.add("hidden");
        elements.grid.style.display = "grid";

        filteredFlights.forEach(flight => {
            const cardHTML = createFlightCardHTML(flight);
            elements.grid.insertAdjacentHTML("beforeend", cardHTML);
        });
    }

    // 4. 통계 및 카운트 배지 갱신
    updateStatistics();
    elements.filteredCount.textContent = filteredFlights.length;
}

function createFlightCardHTML(flight) {
    const isLinked = flight.aircraftTypeId && flight.aircraftTypeId.trim() !== "";
    const badgeHTML = isLinked
        ? `<div class="aerotype-badge" title="AeroType 앱에서 검색 가능한 고유 ID: ${flight.aircraftTypeId}">
            <svg class="aerotype-badge-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
            AeroType 연동 기종
           </div>`
        : `<div class="aerotype-badge not-linked">비연동 기종</div>`;

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

function updateStatistics() {
    const totalFlights = state.flights.length;
    elements.totalFlightsVal.textContent = totalFlights;

    const uniqueAirlines = new Set(
        state.flights
            .map(f => f.airline ? f.airline.trim() : "")
            .filter(name => name !== "")
    );
    elements.totalAirlinesVal.textContent = uniqueAirlines.size;

    const uniqueTypes = new Set(
        state.flights
            .map(f => f.aircraftTypeName ? f.aircraftTypeName.trim() : "")
            .filter(name => name !== "")
    );
    elements.totalTypesVal.textContent = uniqueTypes.size;
}

// ==========================================================================
// 4. 비행 기록 추가 및 삭제 (CRUD)
// ==========================================================================

function handleAddFlightSubmit(event) {
    event.preventDefault();

    const date = document.getElementById("flight-date").value;
    const airline = document.getElementById("flight-airline").value.trim();
    const flightNumber = document.getElementById("flight-number").value.trim().toUpperCase();
    const registration = document.getElementById("flight-registration").value.trim().toUpperCase();
    const departureAirport = document.getElementById("flight-dep").value.trim().toUpperCase();
    const arrivalAirport = document.getElementById("flight-arr").value.trim().toUpperCase();
    const aircraftTypeName = document.getElementById("flight-typename").value.trim();
    const aircraftTypeId = document.getElementById("flight-typeid").value.trim().toLowerCase();
    const seat = document.getElementById("flight-seat").value.trim().toUpperCase();
    const memo = document.getElementById("flight-memo").value;

    const newFlight = {
        id: "flight-" + Date.now(),
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

    state.flights.unshift(newFlight);

    saveFlightsToStorage();
    renderApp();

    elements.addFlightForm.reset();
    closeModal();
}

function deleteFlight(id) {
    if (confirm("이 비행 기록을 정말로 삭제하시겠습니까?")) {
        state.flights = state.flights.filter(flight => flight.id !== id);
        saveFlightsToStorage();
        renderApp();
    }
}

// inline onclick 연동
window.deleteFlight = deleteFlight;

// ==========================================================================
// 5. 모달 제어 및 이벤트 바인딩
// ==========================================================================

function openModal() {
    elements.formModal.classList.add("active");
    const today = new Date().toISOString().split('T')[0];
    document.getElementById("flight-date").value = today;
}

function closeModal() {
    elements.formModal.classList.remove("active");
}

function setupEventListeners() {
    // 1. 실시간 검색창 이벤트
    elements.searchInput.addEventListener("input", (e) => {
        state.searchQuery = e.target.value;
        renderApp();
    });

    // 2. 모달 제어 이벤트
    elements.openFormBtn.addEventListener("click", openModal);
    elements.closeModalBtn.addEventListener("click", closeModal);
    elements.cancelFormBtn.addEventListener("click", closeModal);

    elements.formModal.addEventListener("click", (e) => {
        if (e.target === elements.formModal) {
            closeModal();
        }
    });

    // 3. 비행 정보 등록 이벤트
    elements.addFlightForm.addEventListener("submit", handleAddFlightSubmit);

    // 4. 로그인 및 회원가입 전환 토글 버튼 이벤트
    elements.toRegisterBtn.addEventListener("click", (e) => {
        e.preventDefault();
        toggleAuthForm("register");
    });

    elements.toLoginBtn.addEventListener("click", (e) => {
        e.preventDefault();
        toggleAuthForm("login");
    });

    // 5. 회원가입 및 로그인 폼 제출 이벤트
    elements.registerForm.addEventListener("submit", handleRegisterSubmit);
    elements.loginForm.addEventListener("submit", handleLoginSubmit);

    // 6. 로그아웃 버튼 이벤트
    elements.logoutBtn.addEventListener("click", handleLogout);
}

// 브라우저 로드 완료 시 초기화 실행
document.addEventListener("DOMContentLoaded", initApp);
