import sqlite3

def migrate():
    conn = sqlite3.connect('niyarra.db')
    cursor = conn.cursor()
    columns = [
        "driver_name TEXT",
        "transport_mode TEXT",
        "transport_no TEXT",
        "transport_time TEXT",
        "transport_location TEXT"
    ]
    for col in columns:
        try:
            cursor.execute(f"ALTER TABLE guests ADD COLUMN {col}")
        except Exception as e:
            print(e)
    conn.commit()
    print("Migration 2 successful")
    conn.close()

if __name__ == "__main__":
    migrate()
