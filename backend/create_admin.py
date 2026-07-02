import asyncio
from app.db.database import SessionLocal
from app.db.models.User import User
from app.core import auth

async def seed_admin():
    db = SessionLocal()
    try:
        admin_username = "admin"
        admin_password = "dccm2026"  
        
        user = db.query(User).filter(User.username == admin_username).first()
        hashed_password = auth.get_password_hash(admin_password)
        
        if user:
            print(f"Admin user '{admin_username}' already exists. Updating password...")
            user.hashed_password = hashed_password
            db.commit()
            print(f"Successfully updated admin user: {admin_username} / {admin_password}")
            return

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
