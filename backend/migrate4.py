import sqlite3

def migrate():
    conn = sqlite3.connect('niyarra.db')
    cursor = conn.cursor()
    try:
        cursor.execute("ALTER TABLE guests ADD COLUMN driver_name TEXT")
    except Exception as e:
        print(e)
    conn.commit()
    print("Migration 4 successful")
    conn.close()

if __name__ == "__main__":
    migrate()
