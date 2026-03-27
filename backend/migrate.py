import sqlite3

def migrate():
    conn = sqlite3.connect('niyarra.db')
    cursor = conn.cursor()
    try:
        cursor.execute("ALTER TABLE guests ADD COLUMN day1 BOOLEAN DEFAULT 0")
        cursor.execute("ALTER TABLE guests ADD COLUMN day2 BOOLEAN DEFAULT 0")
        cursor.execute("ALTER TABLE guests ADD COLUMN day3 BOOLEAN DEFAULT 0")
        conn.commit()
        print("Migration successful")
    except Exception as e:
        print(f"Migration error (already migrated?): {e}")
    finally:
        conn.close()

if __name__ == "__main__":
    migrate()
