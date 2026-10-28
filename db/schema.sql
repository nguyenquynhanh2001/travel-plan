-- API tự tạo các bảng này ở lần gọi đầu; file này để tham khảo hoặc chạy tay trong Neon SQL Editor.
create table if not exists trips (
  id text primary key,
  data jsonb not null,
  version integer not null default 1,
  updated_at timestamptz not null default now()
);

create table if not exists images (
  hash text primary key,
  mime text not null,
  data bytea not null,
  created_at timestamptz not null default now()
);
