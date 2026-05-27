import asyncio
from app.db.database import SessionLocal
from app.db.models.User import User
from app.core import auth

async def seed_admin():
    db = SessionLocal()
    try:
        admin_username = "admin"
        admin_password = "password123"  # Change this in production
        
        user = db.query(User).filter(User.username == admin_username).first()
        if user:
            print(f"Admin user '{admin_username}' already exists.")
            return

        hashed_password = auth.get_password_hash(admin_password)
        new_admin = User(
            username=admin_username,
            hashed_password=hashed_password,
            role="admin",
            is_active=True
        )
        db.add(new_admin)
        db.commit()
        print(f"Successfully created admin user: {admin_username} / {admin_password}")
    finally:
        db.close()

if __name__ == "__main__":
    asyncio.run(seed_admin())
