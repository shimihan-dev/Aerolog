/**
 * FlightLog MVP - 샘플 비행 기록 데이터
 * 초보자 가이드: 이 파일은 애플리케이션 처음 로드 시 로컬스토리지에 저장될 초기 데이터를 담고 있습니다.
 * 각 객체는 하나의 비행 기록을 나타냅니다.
 */
const sampleFlights = [
    {
        id: "sample-1",
        date: "2026-05-15",
        airline: "대한항공",
        flightNumber: "KE1101",
        aircraftTypeId: "a220-300", // AeroType의 A220-300 카드 ID와 매핑
        aircraftTypeName: "Airbus A220-300",
        registration: "HL8314",
        departureAirport: "GMP",
        arrivalAirport: "CJU",
        seat: "42A",
        memo: "첫 국내선 A220 탑승! 날씨가 매우 맑았고 날개 바로 옆자리라 엔진 소리가 매력적이었음."
    },
    {
        id: "sample-2",
        date: "2026-05-20",
        airline: "아시아나항공",
        flightNumber: "OZ8902",
        aircraftTypeId: "a350-family", // AeroType의 A350 Family 카드 ID와 매핑
        aircraftTypeName: "Airbus A350-900",
        registration: "HL8078",
        departureAirport: "CJU",
        arrivalAirport: "GMP",
        seat: "12C",
        memo: "비즈니스 스마티움 좌석 바로 뒤 이코노미석. 넓고 조용한 비행이었음."
    },
    {
        id: "sample-3",
        date: "2026-06-01",
        airline: "대한항공",
        flightNumber: "KE081",
        aircraftTypeId: "b787-family", // AeroType의 B787 Dreamliner 카드 ID와 매핑
        aircraftTypeName: "Boeing 787-9",
        registration: "HL8082",
        departureAirport: "ICN",
        arrivalAirport: "JFK",
        seat: "35H",
        memo: "뉴욕행 장거리 비행. 창문 조절 기능이 신기했고 기내 엔터테인먼트가 다양했음."
    }
];

// 전역 스코프(window)에 노출하여 다른 스크립트 파일에서 쉽게 가져다 쓸 수 있도록 합니다.
if (typeof window !== 'undefined') {
    window.sampleFlights = sampleFlights;
}
