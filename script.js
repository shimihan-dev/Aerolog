/**
 * FlightLog MVP - 메인 로직 스크립트 (단일 사용자 버전)
 * 초보자 가이드: 이 파일은 웹 애플리케이션의 동작(이벤트 처리, 데이터 로드 및 저장, 화면 갱신 등)을 관리합니다.
 * LocalStorage를 활용하여 브라우저가 새로고침되어도 데이터가 유지되도록 합니다.
 */

// Supabase 클라우드 데이터베이스 설정
const SUPABASE_URL = "https://pqalomvcugjlcxkqcxtj.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_rtWopuZ1r0dfLqKqIn7l6w_WqYAlAXv";
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const state = {
    flights: [],         // 현재 비행 기록 배열
    searchQuery: "",     // 현재 실시간 검색어
    editingFlightId: null, // 현재 수정 중인 비행 기록 ID
    user: null,          // 현재 로그인한 사용자 정보
    lastLookupTypename: "" // 가장 최근에 실시간 편명 조회로 가져온 기종명
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
    statTypesCard: document.getElementById("stat-total-types"),

    // Supabase Auth 관련 DOM 요소 추가
    authContainer: document.getElementById("auth-container"),
    appContainer: document.getElementById("app-main-container"),
    authForm: document.getElementById("auth-form"),
    authEmail: document.getElementById("auth-email"),
    authPassword: document.getElementById("auth-password"),
    authSubmitBtn: document.getElementById("btn-auth-submit"),
    authSwitchBtn: document.getElementById("btn-auth-switch"),
    authTitle: document.getElementById("auth-title"),
    authErrorMsg: document.getElementById("auth-error-msg"),
    headerUserInfo: document.getElementById("header-user-info"),
    userEmailDisplay: document.getElementById("user-email-display"),
    logoutBtn: document.getElementById("btn-logout"),

    // 기체 세부 정보용 입력창 추가
    aircraftAgeInput: document.getElementById("flight-aircraft-age"),
    modesHexInput: document.getElementById("flight-modes-hex"),

    // 공항명 실시간 표시 참조 추가
    flightDepInput: document.getElementById("flight-dep"),
    flightArrInput: document.getElementById("flight-arr"),
    flightDepMatch: document.getElementById("flight-dep-match"),
    flightArrMatch: document.getElementById("flight-arr-match")
};

// ==========================================================================
// 1. 초기 데이터 로드 및 로컬스토리지 (LocalStorage) 연동
// ==========================================================================

/**
 * 앱이 처음 켜질 때 데이터를 불러오는 함수
 */
/**
 * 앱이 처음 켜질 때 데이터를 불러오고 Supabase Auth 세션을 감지하는 함수
 */
function initApp() {
    // 1단계: Auth 상태 감지 리스너 등록
    supabaseClient.auth.onAuthStateChange(async (event, session) => {
        if (session) {
            console.log("로그인 상태 감지됨:", session.user.email);
            state.user = session.user;
            
            // UI 전환: 로그인 카드 숨김, 메인 대시보드 표시
            elements.authContainer.style.display = "none";
            elements.appContainer.style.display = "block";
            
            // 네비게이션 사용자 이메일 표시 및 로그아웃 단추 표시
            elements.headerUserInfo.style.display = "flex";
            elements.userEmailDisplay.textContent = session.user.email;
            
            // 로컬스토리지가 남아있다면 로그인한 유저의 ID로 마이그레이션 진행
            await migrateLocalData(session.user.id);
            
            // 유저의 비행 데이터 로딩
            await loadUserFlights();
        } else {
            console.log("로그아웃 상태 또는 미인증 유저");
            state.user = null;
            state.flights = [];
            
            // UI 전환: 메인 대시보드 숨김, 로그인 카드 표시
            elements.appContainer.style.display = "none";
            elements.authContainer.style.display = "flex";
            elements.headerUserInfo.style.display = "none";
            
            // 화면 갱신
            renderApp();
        }
    });

    // 2단계: 이벤트 리스너 바인딩
    setupEventListeners();
}

/**
 * 로컬 데이터를 특정 사용자 ID로 Supabase 테이블에 마이그레이션하는 함수
 */
async function migrateLocalData(userId) {
    const storedFlights = localStorage.getItem("flightLog_flights");
    if (storedFlights) {
        try {
            const localFlights = JSON.parse(storedFlights);
            if (Array.isArray(localFlights) && localFlights.length > 0) {
                console.log(`로컬 기록(${localFlights.length}개)을 로그인 계정(${userId})으로 이전(마이그레이션)합니다...`);
                // Supabase 컬럼 규격에 맞춰 데이터를 정제합니다 (오류 예방)
                const sanitized = localFlights.map(f => ({
                    id: f.id || ("flight-" + Date.now() + Math.random().toString(36).substr(2, 4)),
                    user_id: userId, // 로그인한 사용자의 UID 매핑
                    date: f.date || "",
                    airline: f.airline || "",
                    flightNumber: f.flightNumber || "",
                    registration: f.registration || "",
                    departureAirport: f.departureAirport || "",
                    arrivalAirport: f.arrivalAirport || "",
                    aircraftTypeName: f.aircraftTypeName || "",
                    aircraftTypeId: f.aircraftTypeId || "",
                    seat: f.seat || "",
                    seatPosition: f.seatPosition || "",
                    seatClass: f.seatClass || "",
                    aircraftAge: f.aircraftAge || "",
                    modeSHex: f.modeSHex || "",
                    memo: f.memo || ""
                }));

                // Supabase에 데이터를 Upsert(추가 혹은 업데이트)합니다.
                const { error } = await supabaseClient.from('flights').upsert(sanitized);
                if (error) {
                    console.error("데이터 동기화 실패:", error.message);
                } else {
                    console.log("Supabase 마이그레이션 동기화 성공! 로컬 저장소를 비웁니다.");
                    localStorage.removeItem("flightLog_flights");
                }
            }
        } catch (e) {
            console.error("로컬스토리지 마이그레이션 파싱 에러:", e);
        }
    }
}

/**
 * 로그인한 사용자의 비행 데이터를 로딩하는 함수
 */
async function loadUserFlights() {
    // 데이터베이스 로딩 상태 UI 표시
    elements.grid.innerHTML = '<div class="loading-spinner-wrapper"><span class="spinner"></span> 데이터베이스에서 비행 기록을 불러오는 중입니다...</div>';
    elements.emptyState.classList.add("hidden");
    elements.grid.style.display = "grid";

    try {
        const { data: dbFlights, error } = await supabaseClient
            .from('flights')
            .select('*')
            .eq('user_id', state.user.id)
            .order('date', { ascending: false });

        if (error) throw error;

        if (!dbFlights || dbFlights.length === 0) {
            // 테이블이 비어있다면, 샘플 데이터를 현재 사용자 아이디로 Supabase에 밀어넣습니다.
            console.log("DB에 저장된 비행 기록이 없습니다. 샘플 데이터를 계정에 귀속시킵니다...");
            const sanitizedSamples = window.sampleFlights.map((f, idx) => ({
                id: `sample-${state.user.id}-${idx}`, // 고유 사용자별 고유 샘플 ID 부여
                user_id: state.user.id, // 사용자 UID 매핑
                date: f.date || "",
                airline: f.airline || "",
                flightNumber: f.flightNumber || "",
                registration: f.registration || "",
                departureAirport: f.departureAirport || "",
                arrivalAirport: f.arrivalAirport || "",
                aircraftTypeName: f.aircraftTypeName || "",
                aircraftTypeId: f.aircraftTypeId || "",
                seat: f.seat || "",
                seatPosition: f.seatPosition || "",
                seatClass: f.seatClass || "",
                aircraftAge: f.aircraftAge || "",
                modeSHex: f.modeSHex || "",
                memo: f.memo || ""
            }));

            const { error: insertError } = await supabaseClient.from('flights').upsert(sanitizedSamples);
            if (insertError) {
                console.error("샘플 데이터 DB 업로드 실패:", insertError.message);
                state.flights = [];
            } else {
                state.flights = sanitizedSamples;
            }
        } else {
            state.flights = dbFlights;
        }
    } catch (dbError) {
        console.error("Supabase 데이터 로드 실패:", dbError.message);
        state.flights = [];
    }

    // 화면 그리기 (렌더링) 및 통계 업데이트
    renderApp();
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
    // 1. 기종명(aircraftTypeName)을 우선적으로 분석하여 최신 식별 ID를 유도하며, DB에 저장된 ID가 있다면 폴백으로 씁니다.
    const targetTypeId = (deriveAircraftTypeId(flight.aircraftTypeName) || flight.aircraftTypeId || "").trim();
    
    // AeroType 프로젝트와의 연동 여부를 판단합니다.
    const isLinked = targetTypeId !== "";
    
    // 실행 환경(로컬 vs Vercel 배포서버)에 따른 AeroType 경로 분기 처리
    const isLocal = window.location.protocol === 'file:' ||
        window.location.hostname === 'localhost' ||
        window.location.hostname === '127.0.0.1';

    const aeroTypeBaseUrl = isLocal
        ? '../Aerotype/index.html'
        : 'https://aerotype-iota.vercel.app/';

    const badgeHTML = isLinked
        ? `<a href="${aeroTypeBaseUrl}?id=${targetTypeId}" target="_blank" class="aerotype-badge linked" title="클릭하여 AeroType 사전에서 상세 정보 보기 (ID: ${targetTypeId})">
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
                <div class="airport-block" title="${getAirportName(flight.departureAirport)}">
                    <span class="airport-code">${flight.departureAirport}</span>
                    <span class="airport-name">${getAirportName(flight.departureAirport) || '&nbsp;'}</span>
                    <span class="airport-label">DEPARTURE</span>
                </div>
                <div class="flight-path">
                    <div class="path-line"></div>
                    <!-- 비행기 아이콘 -->
                    <svg class="path-plane-icon" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M21 16V14L13 9V3.5C13 2.67 12.33 2 11.5 2C10.67 2 10 2.67 10 3.5V9L2 14V16L10 13.5V19L8 20.5V22L11.5 21L15 22V20.5L13 19V13.5L21 16Z"/>
                    </svg>
                </div>
                <div class="airport-block arr" title="${getAirportName(flight.arrivalAirport)}">
                    <span class="airport-code">${flight.arrivalAirport}</span>
                    <span class="airport-name">${getAirportName(flight.arrivalAirport) || '&nbsp;'}</span>
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
                    <span class="detail-value number-font" style="line-height: 1.25;">
                        ${flight.registration ? flight.registration : '-'}
                        ${(flight.aircraftAge || flight.modeSHex) ? `
                            <span style="font-size: 0.72rem; color: var(--text-medium); display: block; font-weight: 500; margin-top: 3px; font-family: var(--font-sans);">
                                ${[
                flight.aircraftAge ? `기령: ${flight.aircraftAge}년` : '',
                flight.modeSHex ? `Hex: ${flight.modeSHex}` : ''
            ].filter(Boolean).join(' | ')}
                            </span>
                        ` : ''}
                    </span>
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

    if (name.includes("CONCORDE") || name.includes("CONC")) return "concorde";
    if (name.includes("L1011") || name.includes("TRISTAR") || name.includes("L101")) return "l1011-tristar";
    
    if (name.includes("DC10") || name.includes("DC-10")) {
        if (name.includes("10-30") || name.includes("DC103")) return "DC-10-30";
        if (name.includes("10-10") || name.includes("DC101")) return "DC-10-10";
        return "dc-10-family";
    }
    
    if (name.includes("DC8") || name.includes("DC-8")) {
        if (name.includes("8-73") || name.includes("DC873")) return "DC-8-73";
        if (name.includes("8-72") || name.includes("DC872")) return "DC-8-72";
        if (name.includes("8-71") || name.includes("DC871")) return "DC-8-71";
        if (name.includes("8-63") || name.includes("DC863")) return "DC-8-63";
        if (name.includes("8-62") || name.includes("DC862")) return "DC-8-62";
        if (name.includes("8-61") || name.includes("DC861")) return "DC-8-61";
        if (name.includes("8-51") || name.includes("DC851")) return "DC-8-51";
        if (name.includes("8-41") || name.includes("DC841")) return "DC-8-41";
        if (name.includes("8-31") || name.includes("DC831")) return "DC-8-31";
        if (name.includes("8-21") || name.includes("DC821")) return "DC-8-21";
        if (name.includes("8-11") || name.includes("DC811")) return "DC-8-11";
        return "dc-8-family";
    }

    if (name.includes("DC9") || name.includes("DC-9")) {
        if (name.includes("9-51") || name.includes("DC95")) return "DC-9-51";
        if (name.includes("9-41") || name.includes("DC94")) return "DC-9-41";
        if (name.includes("9-32") || name.includes("DC932")) return "DC-9-32";
        if (name.includes("9-31") || name.includes("DC931")) return "DC-9-31";
        if (name.includes("9-21") || name.includes("DC92")) return "DC-9-21";
        if (name.includes("9-15") || name.includes("DC915")) return "DC-9-15";
        if (name.includes("9-11") || name.includes("DC911")) return "DC-9-11";
        return "dc-9-family";
    }

    if (name.includes("MD90") || name.includes("MD-90")) return "md-90";
    if (name.includes("MD8") || name.includes("MD-8")) {
        if (name.includes("81") || name.includes("MD81")) return "MD-81";
        if (name.includes("82") || name.includes("MD82")) return "MD-82";
        if (name.includes("83") || name.includes("MD83")) return "MD-83";
        if (name.includes("88") || name.includes("MD88")) return "MD-88";
        return "md-80-family";
    }

    if (name.includes("C909") || name.includes("ARJ21") || name.includes("ARJ2")) return "c909-family";
    if (name.includes("C919") || name.includes("COMACC919")) return "c919";

    if (name.includes("FOKKER70") || name.includes("F70")) return "Fokker-70";
    if (name.includes("FOKKER100") || name.includes("F100")) return "Fokker-100";

    // 일치하는 대안이 없으면, 입력한 원래 텍스트를 그대로 식별자로 써봅니다.
    return typeName.trim();
}

/**
 * 새로운 비행 로그를 등록하는 이벤트 핸들러
 */
async function handleAddFlightSubmit(event) {
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
    
    // 사용자가 입력 기종명을 직접 수동으로 수정한 경우 (조회한 상태 또는 수정 모드의 원본명과 비교)
    let needsReDerive = false;
    if (state.editingFlightId) {
        const originalFlight = state.flights.find(f => f.id === state.editingFlightId);
        if (originalFlight && originalFlight.aircraftTypeName !== aircraftTypeName) {
            needsReDerive = true;
        }
    } else {
        if (state.lastLookupTypename && state.lastLookupTypename !== aircraftTypeName) {
            needsReDerive = true;
        }
    }

    if (needsReDerive || !aircraftTypeId) {
        aircraftTypeId = deriveAircraftTypeId(aircraftTypeName);
    }

    const seat = document.getElementById("flight-seat").value.trim().toUpperCase();
    const seatPosition = document.getElementById("flight-seat-position").value;
    const seatClass = document.getElementById("flight-seat-class").value;
    const aircraftAge = document.getElementById("flight-aircraft-age").value.trim();
    const modeSHex = document.getElementById("flight-modes-hex").value.trim().toUpperCase();
    const memo = document.getElementById("flight-memo").value;

    const flightData = {
        user_id: state.user ? state.user.id : null,
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
        aircraftAge,
        modeSHex,
        memo
    };

    try {
        if (state.editingFlightId) {
            // [수정 모드] 기존 비행 정보 업데이트
            const { error } = await supabaseClient
                .from('flights')
                .update(flightData)
                .eq('id', state.editingFlightId)
                .eq('user_id', state.user.id); // 타 사용자의 데이터 수정을 원천 차단

            if (error) throw error;

            const flightIndex = state.flights.findIndex(f => f.id === state.editingFlightId);
            if (flightIndex > -1) {
                state.flights[flightIndex] = {
                    ...state.flights[flightIndex],
                    ...flightData
                };
            }
            state.editingFlightId = null; // 수정 모드 해제
        } else {
            // [신규 모드] 새로운 비행 기록 추가
            const newFlight = {
                id: "flight-" + state.user.id + "-" + Date.now(), // 고유한 ID 생성을 위해 타임스탬프와 유저 UID 조합 사용
                ...flightData
            };

            const { error } = await supabaseClient
                .from('flights')
                .insert(newFlight);

            if (error) throw error;

            state.flights.unshift(newFlight);
        }

        // 화면 재렌더링
        renderApp();

        // 입력 폼 초기화 및 모달 닫기
        elements.addFlightForm.reset();
        closeModal();
    } catch (err) {
        console.error("비행 기록 저장 중 에러 발생:", err);
        alert("비행 기록 저장 실패: " + err.message);
    }
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
    document.getElementById("flight-aircraft-age").value = flight.aircraftAge || "";
    document.getElementById("flight-memo").value = flight.memo || "";

    // 공항명 매치 표시 업데이트
    const depName = getAirportName(flight.departureAirport);
    const arrName = getAirportName(flight.arrivalAirport);
    elements.flightDepMatch.textContent = depName ? `출발지: ${depName}` : "";
    elements.flightArrMatch.textContent = arrName ? `도착지: ${arrName}` : "";

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
 * 비행 로그를 삭제하는 함수 (Supabase 비동기 처리 적용)
 * HTML 내 inline onclick 속성에서 호출합니다.
 */
async function deleteFlight(id) {
    // 삭제 전 사용자에게 확인을 요청합니다.
    if (confirm("이 비행 기록을 정말로 삭제하시겠습니까?")) {
        try {
            const { error } = await supabaseClient
                .from('flights')
                .delete()
                .eq('id', id)
                .eq('user_id', state.user.id); // 타 사용자의 데이터 삭제 원천 차단

            if (error) throw error;

            // 일치하지 않는 아이디만 걸러내어 새로운 배열을 만듭니다.
            state.flights = state.flights.filter(flight => flight.id !== id);

            // 화면 재렌더링
            renderApp();
        } catch (err) {
            console.error("비행 기록 삭제 중 에러 발생:", err);
            alert("비행 기록 삭제 실패: " + err.message);
        }
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
    state.lastLookupTypename = ""; // 조회 상태 리셋

    // 모달을 열었을 때 자동으로 탑승일에 현재 날짜가 기본값으로 선택되도록 센스있는 편의 기능 추가
    const today = new Date().toISOString().split('T')[0];
    document.getElementById("flight-date").value = today;

    // 편명 조회 상태 초기화
    elements.lookupStatus.className = "lookup-status-msg hidden";
    elements.lookupStatus.innerHTML = "";

    // 공항명 매치 표시 초기화
    elements.flightDepMatch.textContent = "";
    elements.flightArrMatch.textContent = "";
}

function closeModal() {
    elements.formModal.classList.remove("active");

    // 수정 모드 상태 초기화
    state.editingFlightId = null;
    state.lastLookupTypename = ""; // 조회 상태 리셋
    elements.addFlightForm.reset();

    // 편명 조회 상태 초기화
    elements.lookupStatus.className = "lookup-status-msg hidden";
    elements.lookupStatus.innerHTML = "";

    // 공항명 매치 표시 초기화
    elements.flightDepMatch.textContent = "";
    elements.flightArrMatch.textContent = "";
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

    // 기종명 수동 변경 시 hidden 기종 ID 초기화 (Aerotype 페이지 연결 불일치 오류 해결)
    document.getElementById("flight-typename").addEventListener("input", () => {
        document.getElementById("flight-typeid").value = "";
    });

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

    // 7.1 출발/도착 공항 입력 시 공항명 실시간 노출 리스너
    elements.flightDepInput.addEventListener("input", (e) => {
        const val = e.target.value.trim().toUpperCase();
        const matchedName = getAirportName(val);
        elements.flightDepMatch.textContent = matchedName ? `출발지: ${matchedName}` : "";
    });

    elements.flightArrInput.addEventListener("input", (e) => {
        const val = e.target.value.trim().toUpperCase();
        const matchedName = getAirportName(val);
        elements.flightArrMatch.textContent = matchedName ? `도착지: ${matchedName}` : "";
    });

    // 8. 요약 대시보드 카드 클릭 이벤트 및 팝업 모달 제어
    elements.statAirlinesCard.addEventListener("click", openAirlinesDetailModal);
    elements.statTypesCard.addEventListener("click", openTypesDetailModal);
    elements.closeSummaryDetailBtn.addEventListener("click", closeSummaryDetailModal);
    elements.closeSummaryDetailBtnX.addEventListener("click", closeSummaryDetailModal);

    // 9. Supabase Auth 로그인/회원가입/로그아웃 이벤트 리스너 추가
    let isSignUpMode = false; // 로그인 모드가 기본값

    elements.authSwitchBtn.addEventListener("click", () => {
        isSignUpMode = !isSignUpMode;
        if (isSignUpMode) {
            elements.authTitle.textContent = "FlightLog 회원가입";
            elements.authSubmitBtn.textContent = "회원가입";
            elements.authSwitchBtn.textContent = "로그인하러 가기";
        } else {
            elements.authTitle.textContent = "FlightLog 로그인";
            elements.authSubmitBtn.textContent = "로그인";
            elements.authSwitchBtn.textContent = "회원가입하기";
        }
        elements.authErrorMsg.classList.add("hidden");
        elements.authErrorMsg.textContent = "";
    });

    elements.authForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        const email = elements.authEmail.value.trim();
        const password = elements.authPassword.value;

        elements.authSubmitBtn.disabled = true;
        elements.authSubmitBtn.textContent = isSignUpMode ? "가입 중..." : "로그인 중...";
        elements.authErrorMsg.classList.add("hidden");
        elements.authErrorMsg.textContent = "";

        try {
            if (isSignUpMode) {
                // 회원가입
                const { data, error } = await supabaseClient.auth.signUp({
                    email,
                    password
                });
                if (error) throw error;
                alert("회원가입이 완료되었습니다! 이메일 인증이 활성화되어 있는 경우 메일을 확인해 주세요. 바로 로그인됩니다.");
            } else {
                // 로그인
                const { data, error } = await supabaseClient.auth.signInWithPassword({
                    email,
                    password
                });
                if (error) throw error;
            }
        } catch (err) {
            console.error("Auth Error:", err);
            elements.authErrorMsg.textContent = err.message || "인증 처리 중 오류가 발생했습니다.";
            elements.authErrorMsg.classList.remove("hidden");
        } finally {
            elements.authSubmitBtn.disabled = false;
            elements.authSubmitBtn.textContent = isSignUpMode ? "회원가입" : "로그인";
        }
    });

    elements.logoutBtn.addEventListener("click", async () => {
        if (confirm("로그아웃 하시겠습니까?")) {
            const { error } = await supabaseClient.auth.signOut();
            if (error) {
                alert("로그아웃 실패: " + error.message);
            }
        }
    });
}
// IATA 공항 코드 => 한글 공항명 매핑 사전
const AIRPORT_KOREAN_MAP = {
    // 국내 공항
    "GMP": "김포국제공항",
    "ICN": "인천국제공항",
    "CJU": "제주국제공항",
    "PUS": "김해국제공항",
    "TAE": "대구국제공항",
    "CJJ": "청주국제공항",
    "KWJ": "광주공항",
    "MWX": "무안국제공항",
    "USN": "울산공항",
    "YNY": "양양국제공항",
    "HIN": "사천공항",
    "RSU": "여수공항",
    "KUV": "군산공항",
    "WJU": "원주공항",
    
    // 일본 공항
    "HND": "도쿄 하네다공항",
    "NRT": "도쿄 나리타공항",
    "KIX": "오사카 간사이공항",
    "ITM": "오사카 이타미공항",
    "FUK": "후쿠오카공항",
    "CTS": "삿포로 신치토세공항",
    "NGO": "나고야 주부공항",
    "OKA": "오키나와 나하공항",
    "KOJ": "가고시마공항",
    "KMJ": "구마모토공항",
    "OIT": "오이타공항",
    "MYJ": "마쓰야마공항",
    "HIJ": "히로시마공항",
    "KIJ": "니가타공항",
    "SDJ": "센다이공항",
    "OKJ": "오카야마공항",
    "TAK": "다카마쓰공항",
    "KMI": "미야자키공항",
    
    // 중국 및 대만, 홍콩, 마카오 공항
    "PEK": "베이징 서우두공항",
    "PKX": "베이징 다싱공항",
    "PVG": "상하이 푸동공항",
    "SHA": "상하이 훙차오공항",
    "CAN": "광저우 바이윈공항",
    "SZX": "선전 바오안공항",
    "TAO": "칭다오 자오둥공항",
    "TNA": "진안 야오창공항",
    "DLC": "다롄 저우수이쯔공항",
    "SHE": "선양 타오셴공항",
    "HRB": "하얼빈 타이핑공항",
    "CGQ": "창춘 룽자공항",
    "YNZ": "옌청 난양공항",
    "YNJ": "옌지 차오양촨공항",
    "HKG": "홍콩국제공항",
    "MFM": "마카오국제공항",
    "TPE": "타이베이 타오원공항",
    "TSA": "타이베이 송산공항",
    "KHH": "카오슝국제공항",
    
    // 동남아시아 공항
    "SIN": "싱가포르 창이공항",
    "BKK": "방콕 수완나품공항",
    "DMK": "방콕 돈므앙공항",
    "KUL": "쿠알라룸푸르국제공항",
    "CGK": "자카르타 수카르노하타공항",
    "DPS": "발리 응우라라이공항",
    "MNL": "마닐라 니노이아키노공항",
    "SGN": "호치민 탄손누트공항",
    "HAN": "하노이 노이바이공항",
    "DAD": "다낭국제공항",
    "CXR": "냐짱 깜라인공항",
    "PQC": "푸꾸옥국제공항",
    "REP": "씨엠립 앙코르공항",
    "PNH": "프놈펜국제공항",
    "VTE": "비엔티안 왓타이공항",
    "CEB": "세부 막탄공항",
    "BOR": "보라카이 칼리보공항",
    "MPH": "보라카이 까띡란공항",
    
    // 미주 및 유럽, 대양주 공항
    "JFK": "뉴욕 존 F. 케네디공항",
    "EWR": "뉴욕 뉴어크공항",
    "LGA": "뉴욕 라구아디아공항",
    "LAX": "로스앤젤레스국제공항",
    "SFO": "샌프란시스코국제공항",
    "SEA": "시애틀 타코마공항",
    "ORD": "시카고 오헤어공항",
    "DFW": "댈러스 포트워스공항",
    "ATL": "애틀랜타 하츠필드잭슨공항",
    "MIA": "마이애미국제공항",
    "LAS": "라스베이거스 해리리드공항",
    "HNL": "호놀룰루 다니엘 K. 이노우에공항",
    "GUM": "괌 안토니오 B. 원팻공항",
    "SPN": "사이판국제공항",
    "LHR": "런던 히드로공항",
    "CDG": "파리 샤를드골공항",
    "FRA": "프랑크푸르트공항",
    "AMS": "암스테르담 스키폴공항",
    "FCO": "로마 피우미치노공항",
    "MAD": "마드리드 바라하스공항",
    "SYD": "시드니 킹스포드스미스공항",
    "MEL": "멜버른국제공항",
    "BNE": "브리스번공항",
    "AKL": "오클랜드국제공항",
    "YVR": "밴쿠버국제공항",
    "YYZ": "토론토 피어슨공항"
};

/**
 * IATA 공항 코드로부터 한글 공항명을 가져오는 헬퍼 함수
 */
function getAirportName(code) {
    if (!code) return "";
    const cleanCode = code.trim().toUpperCase();
    return AIRPORT_KOREAN_MAP[cleanCode] || "";
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
    "T'Way Air": "티웨이항공",
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
    "Shanghai Airlines": "상하이항공",
    "Hong Kong Airlines": "홍콩항공",
    "China Airlines": "중화항공",
    "Eva Air": "에바항공",
    "Starlux Airlines": "스타룩스항공",
    "Tigerair Taiwan": "타이거항공타이완",
    "VietJet Air": "비엣젯항공",
    "Vietnam Airlines": "베트남항공",
    "Thai Airways": "타이항공",
    "Lufthansa": "루프트한자",
    "Air France": "에어프랑스",
    "KLM": "KLM 네덜란드 항공",
    "British Airways": "영국항공",
    "Peach Aviation": "피치항공",
    "Hong Kong Express": "홍콩익스프레스",
    "JAL": "일본항공",
    "ANA": "전일본공수",
    "KAL": "대한항공",
    "AAR": "아시아나항공"
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
    "A338": { name: "Airbus A330-800neo", id: "A330-800neo" },
    "A339": { name: "Airbus A330-900neo", id: "A330-900neo" },
    "A343": { name: "Airbus A340-300", id: "A340-300" },
    "A346": { name: "Airbus A340-600", id: "A340-600" },
    "A359": { name: "Airbus A350-900", id: "A350-900" },
    "A35K": { name: "Airbus A350-1000", id: "A350-1000" },
    "A388": { name: "Airbus A380-800", id: "A380-800" },
    "B733": { name: "Boeing 737-300", id: "B737-300" },
    "B734": { name: "Boeing 737-400", id: "B737-400" },
    "B735": { name: "Boeing 737-500", id: "B737-500" },
    "B736": { name: "Boeing 737-600", id: "B737-600" },
    "B737": { name: "Boeing 737-700", id: "B737-700" },
    "B738": { name: "Boeing 737-800", id: "B737-800" },
    "B739": { name: "Boeing 737-900", id: "B737-900" },
    "B741": { name: "Boeing 747-100", id: "B747-100" },
    "B742": { name: "Boeing 747-200", id: "B747-200" },
    "B743": { name: "Boeing 747-300", id: "B747-300" },
    "B744": { name: "Boeing 747-400", id: "B747-400" },
    "B748": { name: "Boeing 747-8", id: "B747-8" },
    "B37M": { name: "Boeing 737 MAX 7", id: "B737 MAX 7" },
    "B38M": { name: "Boeing 737 MAX 8", id: "B737 MAX 8" },
    "B39M": { name: "Boeing 737 MAX 9", id: "B737 MAX 9" },
    "B752": { name: "Boeing 757-200", id: "B757-200" },
    "B763": { name: "Boeing 767-300", id: "B767-300" },
    "B772": { name: "Boeing 777-200", id: "B777-200" },
    "B77W": { name: "Boeing 777-300ER", id: "B777-300ER" },
    "B788": { name: "Boeing 787-8", id: "B787-8" },
    "B789": { name: "Boeing 787-9", id: "B787-9" },
    "B78X": { name: "Boeing 787-10", id: "B787-10" },
    "AT42": { name: "ATR 42", id: "ATR 42" },
    "AT43": { name: "ATR 42-300", id: "ATR 42-300" },
    "AT45": { name: "ATR 42-500", id: "ATR 42-500" },
    "AT46": { name: "ATR 42-600", id: "ATR 42-600" },
    "AT72": { name: "ATR 72", id: "ATR 72" },
    "AT73": { name: "ATR 72-300", id: "ATR 72-300" },
    "AT75": { name: "ATR 72-500", id: "ATR 72-500" },
    "AT76": { name: "ATR 72-600", id: "ATR 72-600" },
    "E135": { name: "Embraer 135", id: "E135" },
    "E145": { name: "Embraer 145", id: "E145" },
    "E170": { name: "Embraer 170", id: "E170" },
    "E175": { name: "Embraer 175", id: "E175" },
    "E190": { name: "Embraer 190", id: "E190" },
    "E195": { name: "Embraer 195", id: "E195" },
    "E295": { name: "Embraer 195-E2", id: "E195-E2" },
    "E290": { name: "Embraer 190-E2", id: "E190-E2" },
    "CRJ2": { name: "Bombardier CRJ-200", id: "CRJ-200" },
    "CRJ7": { name: "Bombardier CRJ-700", id: "CRJ-700" },
    "CRJ9": { name: "Bombardier CRJ-900", id: "CRJ-900" },
    "CRJX": { name: "Bombardier CRJ-1000", id: "CRJ-1000" },
    "DH1": { name: "Bombardier Dash 8-100", id: "Dash8-100" },
    "DH2": { name: "Bombardier Dash 8-200", id: "Dash8-200" },
    "DH3": { name: "Bombardier Dash 8-300", id: "Dash8-300" },
    "DH4": { name: "Bombardier Dash 8 Q400", id: "Dash8-400" },
    "CONC": { name: "Airbus Concorde", id: "concorde" },
    "L101": { name: "Lockheed L-1011 TriStar", id: "l1011-tristar" },
    "DC10": { name: "Douglas DC-10", id: "dc-10-family" },
    "DC81": { name: "Douglas DC-8-11", id: "DC-8-11" },
    "DC82": { name: "Douglas DC-8-21", id: "DC-8-21" },
    "DC83": { name: "Douglas DC-8-31", id: "DC-8-31" },
    "DC84": { name: "Douglas DC-8-41", id: "DC-8-41" },
    "DC85": { name: "Douglas DC-8-51", id: "DC-8-51" },
    "DC86": { name: "Douglas DC-8-61", id: "DC-8-61" },
    "DC87": { name: "Douglas DC-8-71", id: "DC-8-71" },
    "DC8": { name: "Douglas DC-8 Family", id: "dc-8-family" },
    "DC91": { name: "Douglas DC-9-11", id: "DC-9-11" },
    "DC92": { name: "Douglas DC-9-21", id: "DC-9-21" },
    "DC93": { name: "Douglas DC-9-31", id: "DC-9-31" },
    "DC94": { name: "Douglas DC-9-41", id: "DC-9-41" },
    "DC95": { name: "Douglas DC-9-51", id: "DC-9-51" },
    "DC9": { name: "Douglas DC-9 Family", id: "dc-9-family" },
    "MD81": { name: "McDonnell Douglas MD-81", id: "MD-81" },
    "MD82": { name: "McDonnell Douglas MD-82", id: "MD-82" },
    "MD83": { name: "McDonnell Douglas MD-83", id: "MD-83" },
    "MD88": { name: "McDonnell Douglas MD-88", id: "MD-88" },
    "MD80": { name: "McDonnell Douglas MD-80 Family", id: "md-80-family" },
    "MD90": { name: "McDonnell Douglas MD-90", id: "md-90" },
    "ARJ2": { name: "COMAC C909", id: "c909-family" },
    "C919": { name: "COMAC C919", id: "c919" },
    "F70": { name: "Fokker 70", id: "Fokker-70" },
    "F100": { name: "Fokker 100", id: "Fokker-100" }
};

/**
 * 편명을 실시간 API(Aviationstack)에서 조회하여 정보를 채워넣는 함수
 */
/**
 * 편명을 실시간 API(AeroDataBox)에서 조회하여 정보를 채워넣는 함수
 */
async function handleFlightLookup() {
    const flightNumInput = document.getElementById("flight-number");
    const flightNum = flightNumInput.value.trim().toUpperCase().replace(/\s+/g, ''); // 공백 제거
    const flightDate = document.getElementById("flight-date").value;

    // 1. 공백 및 규격 검증
    if (!flightNum) {
        elements.lookupStatus.className = "lookup-status-msg error";
        elements.lookupStatus.textContent = "⚠ 편명을 입력한 후 조회를 눌러주세요.";
        flightNumInput.focus();
        return;
    }

    // 편명 포맷 검증 (예: JL91, KE1101 등 항공사 코드 2-3자 + 숫자 1-4자)
    const flightNumRegex = /^[A-Z0-9]{2,3}\d{1,4}$/;
    if (!flightNumRegex.test(flightNum)) {
        elements.lookupStatus.className = "lookup-status-msg error";
        elements.lookupStatus.textContent = "⚠ 올바른 편명 형식을 입력해 주세요. (예: JL91, KE1101)";
        flightNumInput.focus();
        return;
    }

    if (!flightDate) {
        elements.lookupStatus.className = "lookup-status-msg error";
        elements.lookupStatus.textContent = "⚠ 편명 조회를 위해 먼저 탑승일을 입력해 주세요.";
        document.getElementById("flight-date").focus();
        return;
    }

    // 탑승일 날짜 형식 검증 (YYYY-MM-DD)
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(flightDate)) {
        elements.lookupStatus.className = "lookup-status-msg error";
        elements.lookupStatus.textContent = "⚠ 탑승일 날짜 형식이 올바르지 않습니다. YYYY-MM-DD 형식으로 적어주세요. (예: 2026-06-30)";
        document.getElementById("flight-date").focus();
        return;
    }

    // AeroDataBox API의 조회 날짜 범위 제약 조건 검증 (과거 365일 ~ 미래 10일)
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const targetDate = new Date(flightDate);
    targetDate.setHours(0, 0, 0, 0);
    const timeDiff = today - targetDate;
    const diffDays = timeDiff / (1000 * 60 * 60 * 24);

    let useFallbackApi = false;
    if (diffDays > 365 || diffDays < -10) {
        useFallbackApi = true;
    }

    // 2. 조회 중 상태 UI 변경 (버튼 비활성화, 스피너 렌더링)
    elements.lookupBtn.disabled = true;
    elements.lookupStatus.className = "lookup-status-msg loading";

    if (useFallbackApi) {
        elements.lookupStatus.innerHTML = `<span class="spinner"></span> 1년 이전(또는 먼 미래) 비행편이므로 기본 노선 정보(Aviationstack)를 조회 중입니다...`;
    } else {
        elements.lookupStatus.innerHTML = `<span class="spinner"></span> 실시간 정보를 조회 중입니다...`;
    }

    // 3. API 설정
    const rapidApiKey = '1f363a64a1msha4534ae9ed74452p1e7450jsnc9e9ad7f8641';
    const rapidApiHost = 'aerodatabox.p.rapidapi.com';
    const headers = {
        'X-RapidAPI-Key': rapidApiKey,
        'X-RapidAPI-Host': rapidApiHost
    };

    try {
        // 1단계: 편명 + 날짜 기반 항공편 실시간 상태 조회
        const flightUrl = `https://aerodatabox.p.rapidapi.com/flights/number/${flightNum}/${flightDate}`;
        if (useFallbackApi) {
            // [Aviationstack 기본 정보 조회 Fallback]
            const apiKey = "8c61bbc923c688a8a943e84b55284d1d";
            const apiUrl = `http://api.aviationstack.com/v1/flights?access_key=${apiKey}&flight_iata=${flightNum}`;
            const response = await fetch(apiUrl);

            if (!response.ok) {
                throw new Error(`HTTP 에러! 상태코드: ${response.status}`);
            }

            const result = await response.json();
            if (result.error) {
                throw new Error(result.error.message || result.error.info || "API 에러");
            }

            const flightsData = result.data;
            if (flightsData && flightsData.length > 0) {
                // 가능하면 기종이나 등록정보가 채워진 데이터를 우선 탐색
                const flightInfo = flightsData.find(f => f.aircraft && (f.aircraft.registration || f.aircraft.iata)) || flightsData[0];

                let airlineName = flightInfo.airline ? flightInfo.airline.name : "";
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

                // 폼 필드 입력
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
                        aircraftName = aircraftIata;
                    }
                }

                document.getElementById("flight-typename").value = aircraftName || "";
                document.getElementById("flight-typeid").value = aircraftId || "";

                // 기령, Mode-S 초기화 (Aviationstack 미지원)
                document.getElementById("flight-aircraft-age").value = "";
                document.getElementById("flight-modes-hex").value = "";

                // 성공 피드백
                elements.lookupStatus.className = "lookup-status-msg success";
                elements.lookupStatus.textContent = "✓ 1년 이전 비행편이므로 기본 노선 정보(항공사, 공항, 기종)를 가져왔습니다 (기령/Mode-S 미지원).";
            } else {
                throw new Error("일치하는 실시간 노선 정보가 없습니다. 수동으로 입력해 주세요.");
            }
        } else {
            // [AeroDataBox 정밀 정보 조회 및 Planespotters 이미지 조회]
            // 1단계: 편명 + 날짜 기반 항공편 실시간 상태 조회
            const flightUrl = `https://aerodatabox.p.rapidapi.com/flights/number/${flightNum}/${flightDate}`;
            const flightResponse = await fetch(flightUrl, { headers });

            if (!flightResponse.ok) {
                if (flightResponse.status === 404) {
                    throw new Error("일치하는 실시간 노선 정보가 없습니다. 수동으로 입력해 주세요.");
                }
                let errMsg = `항공편 조회 실패 (상태코드: ${flightResponse.status})`;
                try {
                    const errText = await flightResponse.text();
                    const errJson = JSON.parse(errText);
                    if (errJson && errJson.message) {
                        errMsg += ` - ${errJson.message}`;
                    }
                } catch (e) { }
                throw new Error(errMsg);
            }

            const flightsData = await flightResponse.json();

            if (flightsData && flightsData.length > 0) {
                const flightInfo = flightsData.find(f => f.codeshareStatus === "IsOperator" || f.codeshareStatus === "IsCommercialOperator") || flightsData[0];

                let airlineName = flightInfo.airline ? flightInfo.airline.name : "";
                if (airlineName) {
                    const mappedName = AIRLINE_KOREAN_MAP[airlineName.trim()];
                    if (mappedName) {
                        airlineName = mappedName;
                    }
                }

                const depIata = flightInfo.departure && flightInfo.departure.airport ? flightInfo.departure.airport.iata : "";
                const arrIata = flightInfo.arrival && flightInfo.arrival.airport ? flightInfo.arrival.airport.iata : "";
                const registration = flightInfo.aircraft ? flightInfo.aircraft.reg : "";
                const aircraftModel = flightInfo.aircraft ? flightInfo.aircraft.model : "";

                document.getElementById("flight-airline").value = airlineName || "";
                document.getElementById("flight-dep").value = depIata || "";
                document.getElementById("flight-arr").value = arrIata || "";
                document.getElementById("flight-registration").value = registration || "";

                let finalAircraftName = aircraftModel;
                let finalAircraftId = deriveAircraftTypeId(aircraftModel);
                let ageYears = "";
                let hexIcao = "";

                if (flightInfo.aircraft && flightInfo.aircraft.model) {
                    const cleanModel = flightInfo.aircraft.model.replace(/\s+/g, '').toUpperCase();
                    const mapped = AIRCRAFT_IATA_MAP[cleanModel];
                    if (mapped) {
                        finalAircraftName = mapped.name;
                        finalAircraftId = mapped.id;
                    }
                }

                // 2단계: 기체 정밀 조회
                if (registration) {
                    elements.lookupStatus.innerHTML = `<span class="spinner"></span> 항공기 기체 상세 정보를 분석하고 있습니다 (1초 대기)...`;
                    await new Promise(resolve => setTimeout(resolve, 1050));

                    try {
                        const aircraftUrl = `https://aerodatabox.p.rapidapi.com/aircrafts/reg/${registration}`;
                        const aircraftResponse = await fetch(aircraftUrl, { headers });
                        if (aircraftResponse.ok) {
                            const aircraftData = await aircraftResponse.json();
                            ageYears = aircraftData.ageYears !== undefined ? aircraftData.ageYears : "";
                            hexIcao = aircraftData.hexIcao || "";

                            if (aircraftData.typeName) {
                                finalAircraftName = aircraftData.typeName;
                            }
                            if (aircraftData.modelCode) {
                                finalAircraftId = deriveAircraftTypeId(aircraftData.modelCode);
                            } else if (aircraftData.typeName) {
                                finalAircraftId = deriveAircraftTypeId(aircraftData.typeName);
                            }
                        }
                    } catch (aircraftError) {
                        console.error("Aircraft detail fetch error:", aircraftError);
                    }
                }

                document.getElementById("flight-typename").value = finalAircraftName || "";
                document.getElementById("flight-typeid").value = finalAircraftId || "";
                state.lastLookupTypename = finalAircraftName || ""; // 가장 마지막으로 자동 조회된 이름 저장
                document.getElementById("flight-aircraft-age").value = ageYears;
                document.getElementById("flight-modes-hex").value = hexIcao;

                elements.lookupStatus.className = "lookup-status-msg success";
                elements.lookupStatus.textContent = "✓ 실시간 비행 정보 및 기체 세부 사양을 성공적으로 조회했습니다.";
            } else {
                throw new Error("일치하는 실시간 노선 정보가 없습니다. 수동으로 입력해 주세요.");
            }
        }
    } catch (error) {
        console.error("Flight Lookup General Error:", error);
        elements.lookupStatus.className = "lookup-status-msg error";

        if (error.message && error.message.includes("Failed to fetch")) {
            elements.lookupStatus.innerHTML = `⚠ <strong>보안 차단:</strong> HTTPS 배포 환경에서는 1년 이전 비행편의 기본 정보 조회(Aviationstack)가 차단됩니다. 로컬 환경에서 실행하시거나 수동 기입을 이용해 주세요.`;
        } else {
            elements.lookupStatus.textContent = `⚠ ${error.message}`;
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

        // 월별 빈도 초기화
        document.getElementById("monthly-chart-container").innerHTML = '<p style="font-size:0.8rem;color:var(--text-muted);text-align:center;padding:12px 0;width:100%;">등록된 비행이 없습니다.</p>';
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

    // 8. 월별 탑승 횟수 계산 및 렌더링
    let targetYear = new Date().getFullYear();
    if (flights.length > 0) {
        const years = flights
            .map(f => f.date ? parseInt(f.date.substring(0, 4)) : null)
            .filter(y => y !== null && !isNaN(y));
        if (years.length > 0) {
            targetYear = Math.max(...years);
        }
    }

    const monthlyCounts = Array(12).fill(0);
    flights.forEach(f => {
        if (f.date && f.date.startsWith(targetYear.toString())) {
            const month = parseInt(f.date.substring(5, 7));
            if (month >= 1 && month <= 12) {
                monthlyCounts[month - 1]++;
            }
        }
    });

    const maxMonthCount = Math.max(...monthlyCounts, 1);
    const monthlyContainer = document.getElementById("monthly-chart-container");
    monthlyContainer.innerHTML = "";

    const chartTitle = document.getElementById("monthly-chart-container").previousElementSibling;
    if (chartTitle && chartTitle.tagName === "H3") {
        chartTitle.textContent = `📅 월별 탑승 횟수 분석 (${targetYear}년)`;
    }

    for (let m = 0; m < 12; m++) {
        const count = monthlyCounts[m];
        const pct = Math.round((count / maxMonthCount) * 100);
        const barHeight = count > 0 ? `${pct}%` : "4px"; 
        
        const monthHTML = `
            <div class="monthly-bar-item">
                <div class="monthly-bar-fill" style="height: ${barHeight}" title="${targetYear}년 ${m + 1}월: ${count}회 탑승">
                    ${count > 0 ? `<span class="monthly-bar-value">${count}</span>` : ''}
                </div>
                <div class="monthly-bar-label">${m + 1}월</div>
            </div>
        `;
        monthlyContainer.insertAdjacentHTML("beforeend", monthHTML);
    }
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
