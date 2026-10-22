"""
Database Backup Utility for Smart Campus Lost & Found System
Institution: The National Institute of Engineering (NIE), Mysuru

Generates a timestamped, consistent logical SQL backup of the campus_lost_found
MySQL database without exposing credentials in command-line arguments.
"""

import os
import sys
import datetime
from pathlib import Path

# Add backend directory to path
BASE_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BASE_DIR / "backend"))

from app.config import DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASSWORD
from app.database import engine
from sqlalchemy import inspect, text

BACKUP_DIR = BASE_DIR / "database" / "backups"

def create_backup() -> Path:
    """Creates a timestamped logical backup of all application tables and data."""
    BACKUP_DIR.mkdir(parents=True, exist_ok=True)
    timestamp = datetime.datetime.now().strftime("%Y%m%d_%H%M%S")
    backup_file = BACKUP_DIR / f"backup_{DB_NAME}_{timestamp}.sql"

    print(f"[*] Initiating backup of database '{DB_NAME}' from {DB_HOST}:{DB_PORT}...")
    
    insp = inspect(engine)
    tables = insp.get_table_names()
    
    with open(backup_file, "w", encoding="utf-8") as f:
        f.write(f"-- ============================================================\n")
        f.write(f"-- Smart Campus Lost & Found System — Database Backup\n")
        f.write(f"-- Database: {DB_NAME}\n")
        f.write(f"-- Host: {DB_HOST}:{DB_PORT}\n")
        f.write(f"-- Created At: {datetime.datetime.now().isoformat()}\n")
        f.write(f"-- Tables: {', '.join(tables)}\n")
        f.write(f"-- ============================================================\n\n")
        f.write(f"SET FOREIGN_KEY_CHECKS = 0;\n\n")

        with engine.connect() as conn:
            for table_name in tables:
                print(f"  - Exporting table structure and data: `{table_name}`")
                f.write(f"-- ------------------------------------------------------------\n")
                f.write(f"-- Table: `{table_name}`\n")
                f.write(f"-- ------------------------------------------------------------\n")
                
                # Fetch CREATE TABLE statement
                try:
                    create_stmt_res = conn.execute(text(f"SHOW CREATE TABLE `{table_name}`")).fetchone()
                    if create_stmt_res:
                        create_sql = create_stmt_res[1]
                        f.write(f"DROP TABLE IF EXISTS `{table_name}`;\n")
                        f.write(f"{create_sql};\n\n")
                except Exception as ct_err:
                    print(f"    [!] Warning getting create table for `{table_name}`: {ct_err}")

                # Fetch rows
                rows = conn.execute(text(f"SELECT * FROM `{table_name}`")).fetchall()
                if rows:
                    columns = [col["name"] for col in insp.get_columns(table_name)]
                    cols_str = ", ".join(f"`{c}`" for c in columns)
                    f.write(f"INSERT INTO `{table_name}` ({cols_str}) VALUES\n")
                    value_lines = []
                    for row in rows:
                        vals = []
                        for val in row:
                            if val is None:
                                vals.append("NULL")
                            elif isinstance(val, (int, float)):
                                vals.append(str(val))
                            elif isinstance(val, bool):
                                vals.append("1" if val else "0")
                            elif isinstance(val, (datetime.datetime, datetime.date)):
                                vals.append(f"'{val.isoformat()}'")
                            else:
                                escaped_val = str(val).replace("\\", "\\\\").replace("'", "''")
                                vals.append(f"'{escaped_val}'")
                        value_lines.append(f"({', '.join(vals)})")
                    f.write(",\n".join(value_lines) + ";\n\n")
                else:
                    f.write(f"-- (No rows in `{table_name}`)\n\n")

        f.write(f"SET FOREIGN_KEY_CHECKS = 1;\n")

    size_kb = backup_file.stat().st_size / 1024
    print(f"[SUCCESS] Backup completed successfully: {backup_file.name} ({size_kb:.2f} KB)")
    return backup_file

if __name__ == "__main__":
    create_backup()
