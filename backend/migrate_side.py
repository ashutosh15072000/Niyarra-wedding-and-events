import sqlite3
import os

DB_PATH = os.path.join(os.path.dirname(__file__), 'niyarra.db')

def migrate(db_path):
    print(f"Connecting to database at: {db_path}")
    if not os.path.exists(db_path):
        print(f"Database not found at {db_path}, skipping.")
        return
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    try:
        cursor.execute("ALTER TABLE guests ADD COLUMN side TEXT DEFAULT 'Bride';")
        print(f"Successfully added 'side' column to guests table at {db_path}.")
    except sqlite3.OperationalError as e:
        print(f"Skipping side addition at {db_path}: {e}")
        
    conn.commit()
    conn.close()

if __name__ == "__main__":
    # Migrate both to be sure
    root_db = os.path.join(os.path.dirname(__file__), '..', 'niyarra.db')
    backend_db = os.path.join(os.path.dirname(__file__), 'niyarra.db')
    migrate(root_db)
    migrate(backend_db)
