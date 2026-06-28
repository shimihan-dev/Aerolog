/**
 * FlightLog MVP - 비행 노선 및 기종 사전 데이터베이스 (Mock API용)
 * 초보자 가이드: 이 파일은 특정 편명(Flight Number)을 입력했을 때
 * 자동으로 출발공항, 도착공항, 항공사, 기종 정보를 채워주기 위한 사전형 데이터입니다.
 */
const mockFlightsDb = {
    "KE1101": {
        airline: "대한항공",
        departureAirport: "GMP",
        arrivalAirport: "CJU",
        aircraftTypeName: "Airbus A220-300",
        aircraftTypeId: "a220-300"
    },
    "OZ8902": {
        airline: "아시아나항공",
        departureAirport: "CJU",
        arrivalAirport: "GMP",
        aircraftTypeName: "Airbus A350-900",
        aircraftTypeId: "a350-family"
    },
    "KE081": {
        airline: "대한항공",
        departureAirport: "ICN",
        arrivalAirport: "JFK",
        aircraftTypeName: "Boeing 787-9",
        aircraftTypeId: "b787-family"
    },
    "KE082": {
        airline: "대한항공",
        departureAirport: "JFK",
        arrivalAirport: "ICN",
        aircraftTypeName: "Boeing 787-9",
        aircraftTypeId: "b787-family"
    },
    "OZ222": {
        airline: "아시아나항공",
        departureAirport: "ICN",
        arrivalAirport: "JFK",
        aircraftTypeName: "Airbus A350-900",
        aircraftTypeId: "a350-family"
    },
    "LJ301": {
        airline: "진에어",
        departureAirport: "GMP",
        arrivalAirport: "CJU",
        aircraftTypeName: "Boeing 737-800",
        aircraftTypeId: "b737-family"
    },
    "TW701": {
        airline: "티웨이항공",
        departureAirport: "GMP",
        arrivalAirport: "CJU",
        aircraftTypeName: "Boeing 737-800",
        aircraftTypeId: "b737-family"
    },
    "KE703": {
        airline: "대한항공",
        departureAirport: "ICN",
        arrivalAirport: "NRT",
        aircraftTypeName: "Boeing 777-300ER",
        aircraftTypeId: "b777-family"
    },
    "OZ361": {
        airline: "아시아나항공",
        departureAirport: "ICN",
        arrivalAirport: "PVG",
        aircraftTypeName: "Airbus A330-300",
        aircraftTypeId: "a330-family"
    }
};

// 전역 스코프(window)에 노출하여 script.js에서 자유롭게 조회할 수 있도록 합니다.
if (typeof window !== 'undefined') {
    window.mockFlightsDb = mockFlightsDb;
}
