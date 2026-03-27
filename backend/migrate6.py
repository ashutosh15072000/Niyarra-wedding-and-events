import sqlite3
import os

db_path = os.path.join(os.path.dirname(__file__), 'niyarra.db')

def upgrade():
    print(f"Connecting to database at: {db_path}")
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    try:
        cursor.execute("ALTER TABLE guests ADD COLUMN day0 BOOLEAN DEFAULT 0")
        print("Successfully added 'day0' column to guests table.")
    except sqlite3.OperationalError as e:
        if "duplicate column name" in str(e).lower():
            print("'day0' column already exists. Skipping.")
        else:
            print(f"Error adding 'day0' column: {e}")

    conn.commit()
    conn.close()

if __name__ == "__main__":
    upgrade()
