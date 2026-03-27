import sqlite3

def run_migration():
    conn = sqlite3.connect('niyarra.db')
    cursor = conn.cursor()

    columns_to_add = [
        ("transport_needed", "BOOLEAN DEFAULT 0"),
        ("transport_type", "VARCHAR"),
        ("arrival_location", "VARCHAR"),
        ("arrival_time", "VARCHAR"),
        ("flight_train_number", "VARCHAR"),
        ("pickup_arranged", "BOOLEAN DEFAULT 0"),
        ("dropoff_arranged", "BOOLEAN DEFAULT 0")
    ]

    for col_name, col_type in columns_to_add:
        try:
            cursor.execute(f"ALTER TABLE guests ADD COLUMN {col_name} {col_type}")
            print(f"Added column {col_name}")
        except sqlite3.OperationalError as e:
            if "duplicate column name" in str(e):
                print(f"Column {col_name} already exists")
            else:
                print(f"Error adding {col_name}: {e}")

    conn.commit()
    conn.close()
    print("Migration 5 completed successfully.")

if __name__ == "__main__":
    run_migration()
