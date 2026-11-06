CREATE TABLE IF NOT EXISTS members (
 id INTEGER PRIMARY KEY AUTOINCREMENT,
 name TEXT NOT NULL,
 seat TEXT NOT NULL,
 salt TEXT NOT NULL,
 pin_hash TEXT NOT NULL,
 created_at TEXT NOT NULL,
 UNIQUE(name,seat)
);
CREATE TABLE IF NOT EXISTS bookings (
 id TEXT PRIMARY KEY,
 date TEXT NOT NULL,
 start_at TEXT NOT NULL,
 end_at TEXT NOT NULL,
 member_id INTEGER NOT NULL REFERENCES members(id),
 status TEXT NOT NULL DEFAULT 'active',
 created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_bookings_date_status ON bookings(date,status,start_at);
CREATE INDEX IF NOT EXISTS idx_bookings_member_date ON bookings(member_id,date,status);
CREATE TRIGGER IF NOT EXISTS prevent_booking_overlap
BEFORE INSERT ON bookings
WHEN NEW.status='active' AND EXISTS (
 SELECT 1 FROM bookings b
 WHERE b.date=NEW.date AND b.status='active'
 AND NEW.start_at < b.end_at AND NEW.end_at > b.start_at
)
BEGIN SELECT RAISE(ABORT,'BOOKING_OVERLAP'); END;
CREATE TRIGGER IF NOT EXISTS prevent_booking_overlap_update
BEFORE UPDATE OF date,start_at,end_at,status ON bookings
WHEN NEW.status='active' AND EXISTS (
 SELECT 1 FROM bookings b WHERE b.id<>NEW.id AND b.date=NEW.date AND b.status='active'
 AND NEW.start_at < b.end_at AND NEW.end_at > b.start_at
)
BEGIN SELECT RAISE(ABORT,'BOOKING_OVERLAP'); END;
