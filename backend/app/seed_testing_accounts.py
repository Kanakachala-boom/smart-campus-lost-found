import sys
from app.database import SessionLocal
from app.models.user import User
from app.services.auth_service import hash_password

ACCOUNTS = [
    {
        "name": "Lost & Found Admin",
        "email": "admin.lostfound@nie.ac.in",
        "role": "ADMIN",
        "password": "anything",
        "phone": "9876543210"
    },
    {
        "name": "Akash A",
        "email": "2024is_akasha_a@nie.ac.in",
        "role": "STUDENT",
        "password": "anything",
        "phone": "9876543211"
    },
    {
        "name": "Kanakachala A",
        "email": "2024is_kanakachala_a@nie.ac.in",
        "role": "STUDENT",
        "password": "anything",
        "phone": "9876543212"
    },
    {
        "name": "Rahul Kumar",
        "email": "2024is_rahul_k@nie.ac.in",
        "role": "STUDENT",
        "password": "anything",
        "phone": "9876543213"
    },
    {
        "name": "Priya Sharma",
        "email": "2024is_priya_s@nie.ac.in",
        "role": "STUDENT",
        "password": "anything",
        "phone": "9876543214"
    }
]

def seed_accounts():
    db = SessionLocal()
    try:
        print("Checking test accounts...")
        for acc in ACCOUNTS:
            existing = db.query(User).filter(User.email == acc["email"]).first()
            if existing:
                print(f"[EXISTING] {existing.name} ({existing.email}) - Role: {existing.role} (Preserved, password unchanged)")
                # If Kanakachala has "Kanakachala", update display name to "Kanakachala A" if desired
                if acc["name"] == "Kanakachala A" and existing.name == "Kanakachala":
                    existing.name = "Kanakachala A"
                    db.commit()
            else:
                new_user = User(
                    name=acc["name"],
                    email=acc["email"],
                    password_hash=hash_password(acc["password"]),
                    role=acc["role"],
                    phone=acc.get("phone"),
                    is_active=True
                )
                db.add(new_user)
                db.commit()
                db.refresh(new_user)
                print(f"[CREATED] {new_user.name} ({new_user.email}) - ID: {new_user.user_id}, Role: {new_user.role}")
    finally:
        db.close()

if __name__ == "__main__":
    seed_accounts()
