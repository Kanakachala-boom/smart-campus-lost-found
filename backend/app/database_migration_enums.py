from app.database import engine
from sqlalchemy import text

def run_migration():
    print("Running migration on live MySQL database...")
    with engine.connect() as conn:
        conn.execute(text("""
            ALTER TABLE lost_items 
            MODIFY COLUMN status ENUM('ACTIVE','POTENTIAL_MATCH','MATCHED','RECLAIMED','CLOSED','RESOLVED','RETURNED') 
            NOT NULL DEFAULT 'ACTIVE'
        """))
        conn.execute(text("""
            ALTER TABLE found_items 
            MODIFY COLUMN status ENUM('AVAILABLE','POTENTIAL_MATCH','CLAIMED','RETURNED','CLOSED','RESOLVED','RECLAIMED') 
            NOT NULL DEFAULT 'AVAILABLE'
        """))
        conn.execute(text("""
            ALTER TABLE matches 
            MODIFY COLUMN status ENUM('PENDING','ACCEPTED','REJECTED','RESOLVED') 
            NOT NULL DEFAULT 'PENDING'
        """))
        conn.commit()
        print("Migration SUCCESS: Updated ENUMs for lost_items, found_items, and matches.")

if __name__ == "__main__":
    run_migration()
