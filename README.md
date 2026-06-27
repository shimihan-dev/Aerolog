# FlightLog ✈️

FlightLog은 개인의 비행기 탑승 기록을 저장하고 관리하는 개인용 여정 관리자(Flight Record Manager) 웹 애플리케이션입니다.  
본 프로젝트는 항공 IT 포트폴리오의 두 번째 단계로 개발되었으며, 첫 번째 프로젝트인 항공기 기종 사전 웹 앱 **AeroType**과 추후 유기적으로 연동될 수 있도록 기획되었습니다.

또한, MVP 단계를 고도화하여 정적 페이지 환경에서 동작할 수 있는 **Mock 로그인 및 계정별 데이터 격리 기능**이 추가되었습니다.

## 📌 프로젝트 개요

항공 여행을 다녀온 사용자가 탑승 날짜, 항공사, 편명, 출발/도착 공항, 좌석 번호, 기종 정보 및 메모를 남겨 자신만의 비행 일지를 작성할 수 있습니다.
AeroType 프로젝트에서 정의한 기종 고유 ID(`aircraftTypeId`) 필드를 설계 단계부터 포함하여, 향후 두 서비스가 통합되었을 때 비행 기록 카드에서 기종을 클릭하면 AeroType의 상세 스펙 정보를 조회할 수 있는 구조적 기반을 마련했습니다.

## 🌟 주요 기능

1. **Mock 로그인 및 회원가입 (Authentication)**
   - 서버 없이 브라우저의 LocalStorage를 활용하여 계정 생성(회원가입) 및 세션 유지(로그인)를 시뮬레이션합니다.
   - 처음 가입하는 사용자의 테스트 편의를 위해, 가입 완료 시 **샘플 탑승 기록 3개**가 계정에 자동으로 세팅됩니다.
2. **계정별 데이터 격리 (Data Scoping)**
   - 사용자 이메일을 기준으로 저장공간(Key)을 격리하여, 각 가입 계정마다 자신만의 독자적인 탑승 데이터를 안전하게 관리합니다.
3. **보딩패스 스타일 UI (Card-based Layout)**
   - 항공권 보딩패스(탑승권) 디자인을 본뜬 직관적이고 미려한 레이아웃을 통해 비행 정보를 한눈에 파악할 수 있습니다.
4. **실시간 비행 통계 (Summary Dashboard)**
   - 로그인된 계정의 전체 비행 횟수, 고유 항공사 수, 고유 기종 수 등의 통계 지표를 실시간으로 계산해 화면에 반영합니다.
5. **실시간 검색 기능 (Search)**
   - 항공사, 편명, 기종명, 등록부호, 출발/도착 공항 코드(IATA) 등 다양한 키워드로 비행 기록을 즉시 필터링합니다.
6. **기록 추가 및 삭제 (CRUD)**
   - 전용 모달 폼을 통해 간편하게 기록을 추가하고, 확인 컨펌창을 통해 불필요한 비행을 쉽게 삭제할 수 있습니다.
7. **모바일 반응형 디자인 (Responsive UI)**
   - 모바일 세로 화면부터 넓은 데스크톱 모니터까지 완벽한 화면 맞춤형 그리드 레이아웃을 제공합니다.

---

## 🛠️ 기술 스택

- **마크업**: HTML5 (시맨틱 태그 준수)
- **스타일링**: Vanilla CSS (CSS Variables 기반 모던 레이아웃)
- **로직**: Vanilla JavaScript (ES6+, LocalStorage, Event Binding)
- **배포 예고**: GitHub Pages 혹은 Vercel을 통한 정적 배포 지원

---

## 📊 데이터 구조 (Data Schema)

### 1. 사용자 정보 (Users)
가입된 사용자들의 목록은 LocalStorage의 `flightLog_users` 키에 저장됩니다.
```javascript
{
  name: "홍길동",
  email: "example@email.com",
  password: "password123"
}
```

### 2. 비행 기록 (Flights)
각 사용자별 비행 기록은 `flightLog_flights_${email}` 형태로 격리 저장됩니다.
```javascript
{
  id: "flight-1719460293000",       // 고유 ID (타임스탬프 기반 PK)
  date: "2026-05-15",               // 탑승일 (YYYY-MM-DD)
  airline: "대한항공",               // 항공사명
  flightNumber: "KE1101",           // 편명 (자동 대문자 변환)
  aircraftTypeId: "a220-300",       // AeroType 연동용 고유 기종 ID
  aircraftTypeName: "Airbus A220-300", // 사용자 화면 표시용 기종명
  registration: "HL8314",           // 항공기 등록 기호
  departureAirport: "GMP",          // 출발 공항 IATA 코드
  arrivalAirport: "CJU",            // 도착 공항 IATA 코드
  seat: "42A",                      // 좌석 번호
  memo: "첫 국내선 A220 탑승! 날씨가 매우 맑았음." // 사용자 커스텀 메모
}
```

---

## 🔗 AeroType 프로젝트와의 연동 계획

FlightLog은 **AeroType**과 다음과 같은 방식으로 관계를 맺습니다:

1. **식별 키 공유 (`aircraftTypeId`)**
   - AeroType에서 사용되는 고유 기종 코드(예: `a350-family`, `b787-family`, `a220-100`)를 FlightLog 기록 생성 시 `aircraftTypeId` 필드에 입력받습니다.
2. **연동 링크 구현 (Future Phase)**
   - 정적 파일 형태에서 데이터베이스(Supabase 등) 체제로 통합할 시, FlightLog 카드의 기종 배지를 클릭하면 해당 `aircraftTypeId` 파라미터를 들고 AeroType 상세 보기 화면으로 라우팅되도록 구현할 예정입니다.
   - 예시 링크: `https://shimihan-dev.github.io/aerotype/?id=a350-family`

---

## 🚀 향후 발전 계획

- **Supabase 데이터베이스 마이그레이션**: 로컬스토리지를 백엔드 데이터베이스로 전환하여 회원가입 및 기기 간 동기화 지원
- **AeroType과 Single-Page Application(SPA) 수준의 통합**: 한 화면에서 기종 탐색과 비행 일지 작성을 오갈 수 있는 대시보드 구축
- **공항 정보 자동 완성 API 연동**: IATA 코드 입력 시 공항명(예: 김포국제공항)을 실시간으로 가져와 보여주는 UX 고도화
- **통계 시각화**: 월별/연도별 비행 빈도 및 노선 맵(Flight Route Map) 시각화 기능 추가
