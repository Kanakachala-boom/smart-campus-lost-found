from app.database import engine
from sqlalchemy import text

def run_migration():
    print("Running migration on live MySQL database...")
    with engine.connect() as conn:
        conn.execute(text("""
            ALTER TABLE lost_items 
            MODIFY COLUMN status VARCHAR(50) 
            NOT NULL DEFAULT 'ACTIVE'
        """))
        conn.execute(text("""
            ALTER TABLE found_items 
            MODIFY COLUMN status VARCHAR(50) 
            NOT NULL DEFAULT 'AVAILABLE'
        """))
        conn.execute(text("""
            ALTER TABLE matches 
            MODIFY COLUMN status VARCHAR(50) 
            NOT NULL DEFAULT 'PENDING'
        """))
        conn.execute(text("""
            ALTER TABLE claims 
            MODIFY COLUMN status VARCHAR(50) 
            NOT NULL DEFAULT 'PENDING'
        """))
        conn.commit()
        print("Migration SUCCESS: Updated status columns to VARCHAR(50) for lost_items, found_items, matches, and claims.")

if __name__ == "__main__":
    run_migration()
