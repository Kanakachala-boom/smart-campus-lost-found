"""
Administrative User Provisioning Script for Smart Campus Lost & Found System
Institution: The National Institute of Engineering (NIE), Mysuru

This utility allows authorized campus system administrators to provision an
initial or replacement administrative account in MySQL with salted bcrypt
hashing and institutional domain verification.

Usage:
    python create_admin.py
    (prompts interactively for Name, Staff ID, Institutional Email, and hidden Password)

Or with arguments for non-interactive automation (password supplied via environment variable):
    $env:ADMIN_PASSWORD="SecurePassword123"
    python create_admin.py --name "System Admin" --staff-id "NIE-STAFF-ADMIN" --email "admin@nie.ac.in"
"""

import os
import sys
import argparse
import getpass
from pathlib import Path

# Add backend directory to path
BASE_DIR = Path(__file__).resolve().parent
sys.path.insert(0, str(BASE_DIR))

from app.database import SessionLocal
from app.models.user import User
from app.services.auth_service import hash_password

def provision_admin(name: str, staff_id: str, email: str, password: str) -> None:
    email_clean = email.strip().lower()
    if not email_clean.endswith("@nie.ac.in"):
        print(f"Error: Email '{email_clean}' must belong to the official campus domain '@nie.ac.in'.")
        sys.exit(1)

    if len(password) < 8:
        print("Error: Password must be at least 8 characters long.")
        sys.exit(1)

    db = SessionLocal()
    try:
        existing = db.query(User).filter(User.email == email_clean).first()
        if existing:
            if existing.role == "ADMIN":
                print(f"User '{email_clean}' already exists and is already an ADMINISTRATOR.")
                return
            else:
                existing.role = "ADMIN"
                existing.password_hash = hash_password(password)
                if staff_id:
                    existing.student_staff_id = staff_id
                db.commit()
                print(f"Success: Existing account '{email_clean}' upgraded to ADMINISTRATOR.")
                return

        new_admin = User(
            name=name.strip(),
            student_staff_id=staff_id.strip() if staff_id else None,
            email=email_clean,
            password_hash=hash_password(password),
            role="ADMIN",
            is_active=True,
        )
        db.add(new_admin)
        db.commit()
        db.refresh(new_admin)
        print(f"Success: Created new Administrator account for '{new_admin.name}' ({new_admin.email}, Staff ID: {new_admin.student_staff_id}).")
    except Exception as e:
        db.rollback()
        print(f"Error provisioning administrator account: {e}")
        sys.exit(1)
    finally:
        db.close()

def main():
    parser = argparse.ArgumentParser(description="Provision an Administrator Account for Smart Campus Lost & Found System")
    parser.add_argument("--name", type=str, help="Full Name of the Administrator")
    parser.add_argument("--staff-id", type=str, help="Official Staff / Employee ID")
    parser.add_argument("--email", type=str, help="Official Campus Email (must end with @nie.ac.in)")
    parser.add_argument("--password", type=str, default=None, help=argparse.SUPPRESS)  # Deprecated for security

    args = parser.parse_args()

    # Reject plaintext command-line passwords to prevent exposure in shell history and process tables
    if args.password:
        print("Security Warning: Supplying passwords via command-line arguments exposes credentials in process listings and shell history.")
        print("Please enter the password via the secure interactive prompt, or set the ADMIN_PASSWORD environment variable for automation.")
        sys.exit(1)

    name = args.name
    staff_id = args.staff_id
    email = args.email

    # Check environment variable for automated non-interactive deployment
    password = os.environ.get("ADMIN_PASSWORD")

    # Interactive prompt if parameters are missing
    if not email or not password:
        print("=" * 65)
        print(" Smart Campus Lost & Found — Administrator Provisioning Utility")
        print("=" * 65)
        if not name:
            name = input("Enter Administrator Full Name: ").strip()
        if not staff_id:
            staff_id = input("Enter Staff / Employee ID: ").strip()
        if not email:
            email = input("Enter Official Campus Email (@nie.ac.in): ").strip()
        if not password:
            password = getpass.getpass("Enter Secure Admin Password (min 8 chars): ")
            confirm = getpass.getpass("Confirm Admin Password: ")
            if password != confirm:
                print("Error: Passwords do not match.")
                sys.exit(1)

    provision_admin(name=name, staff_id=staff_id, email=email, password=password)

if __name__ == "__main__":
    main()
