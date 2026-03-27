import sqlite3
import os

DB_PATH = os.path.join(os.path.dirname(__file__), 'niyarra.db')

def migrate():
    print(f"Connecting to database at: {DB_PATH}")
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    try:
        cursor.execute("ALTER TABLE guests ADD COLUMN description TEXT;")
        print("Successfully added 'description' column to guests table.")
    except sqlite3.OperationalError as e:
        print(f"Skipping description addition: {e}")

    try:
        cursor.execute("ALTER TABLE guests ADD COLUMN extra_bedding BOOLEAN DEFAULT 0;")
        print("Successfully added 'extra_bedding' column to guests table.")
    except sqlite3.OperationalError as e:
        print(f"Skipping extra_bedding addition: {e}")
        
    conn.commit()
    conn.close()

if __name__ == "__main__":
    migrate()
