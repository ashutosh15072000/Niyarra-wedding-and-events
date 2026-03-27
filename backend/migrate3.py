import sqlite3

def migrate():
    conn = sqlite3.connect('niyarra.db')
    cursor = conn.cursor()
    columns = [
        "guest_mobile TEXT",
        "members_names TEXT"
    ]
    for col in columns:
        try:
            cursor.execute(f"ALTER TABLE guests ADD COLUMN {col}")
        except Exception as e:
            print(e)
    conn.commit()
    print("Migration 3 successful")
    conn.close()

if __name__ == "__main__":
    migrate()
