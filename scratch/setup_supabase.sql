-- 1. 비행 기록 저장을 위한 flights 테이블 생성 및 로그인 계정 외래키 연동 (이미 테이블이 있으면 생성하지 않음)
create table if not exists flights (
  id text primary key,
  user_id uuid references auth.users(id) on delete cascade,
  date text not null,
  airline text not null,
  "flightNumber" text not null,
  registration text,
  "departureAirport" text not null,
  "arrivalAirport" text not null,
  "aircraftTypeName" text,
  "aircraftTypeId" text,
  seat text,
  "seatPosition" text,
  "seatClass" text,
  "aircraftAge" text,
  "modeSHex" text,
  memo text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 2. Row Level Security(RLS) 보안 정책 활성화 (개인정보 보호)
alter table flights enable row level security;

-- 3. RLS 보안 규칙 정의 (기존 정책이 존재하면 에러 방지를 위해 삭제 후 재생성)
drop policy if exists "Users can view their own flights" on flights;
create policy "Users can view their own flights" 
  on flights for select using (auth.uid() = user_id);

drop policy if exists "Users can insert their own flights" on flights;
create policy "Users can insert their own flights" 
  on flights for insert with check (auth.uid() = user_id);

drop policy if exists "Users can update their own flights" on flights;
create policy "Users can update their own flights" 
  on flights for update using (auth.uid() = user_id);

drop policy if exists "Users can delete their own flights" on flights;
create policy "Users can delete their own flights" 
  on flights for delete using (auth.uid() = user_id);
