from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from fastapi.staticfiles import StaticFiles
from datetime import timedelta
from contextlib import asynccontextmanager
from typing import List
import os

import models, schemas, auth, database
from database import engine, get_db

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Ensure tables are created
    models.Base.metadata.create_all(bind=engine)
    
    # Create default admin user if not exists
    db = database.SessionLocal()
    try:
        admin_user = db.query(models.User).filter(models.User.username == "admin").first()
        if not admin_user:
            hashed_pw = auth.get_password_hash("admin")
            admin_user = models.User(username="admin", hashed_password=hashed_pw)
            db.add(admin_user)
            db.commit()
    except Exception as e:
        print(f"Error initializing DB: {e}")
    finally:
        db.close()
    yield

app = FastAPI(lifespan=lifespan)

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="api/token")

async def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = auth.jwt.decode(token, auth.SECRET_KEY, algorithms=[auth.ALGORITHM])
        username: str = payload.get("sub")
        if username is None:
            raise credentials_exception
    except auth.jwt.JWTError:
        raise credentials_exception
    
    user = db.query(models.User).filter(models.User.username == username).first()
    if user is None:
        raise credentials_exception
    return user

@app.post("/api/token", response_model=schemas.Token)
def login_for_access_token(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.username == form_data.username).first()
    if not user or not auth.verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    access_token_expires = timedelta(minutes=auth.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = auth.create_access_token(
        data={"sub": user.username}, expires_delta=access_token_expires
    )
    return {"access_token": access_token, "token_type": "bearer"}

@app.get("/api/guests", response_model=List[schemas.GuestRead])
def get_guests(db: Session = Depends(get_db)):
    return db.query(models.Guest).order_by(models.Guest.id).all()

@app.post("/api/guests", response_model=schemas.GuestRead)
def create_guest(guest: schemas.GuestCreate, db: Session = Depends(get_db)):
    db_guest = models.Guest(**guest.model_dump())
    db.add(db_guest)
    db.commit()
    db.refresh(db_guest)
    return db_guest

@app.put("/api/guests/{guest_id}/checkin", response_model=schemas.GuestRead)
def toggle_checkin(guest_id: int, db: Session = Depends(get_db)):
    db_guest = db.query(models.Guest).filter(models.Guest.id == guest_id).first()
    if not db_guest:
        raise HTTPException(status_code=404, detail="Guest not found")
    
    db_guest.checked_in = not db_guest.checked_in
    db.commit()
    db.refresh(db_guest)
    return db_guest

@app.put("/api/guests/{guest_id}", response_model=schemas.GuestRead)
def edit_guest(guest_id: int, guest_update: schemas.GuestUpdate, db: Session = Depends(get_db)):
    db_guest = db.query(models.Guest).filter(models.Guest.id == guest_id).first()
    if not db_guest:
        raise HTTPException(status_code=404, detail="Guest not found")
    
    for var, value in guest_update.model_dump(exclude_unset=True).items():
        setattr(db_guest, var, value) if value is not None else None

    db.commit()
    db.refresh(db_guest)
    return db_guest

# Optional: Ensure frontend directory exists to avoid crash
frontend_path = os.path.join(os.path.dirname(__file__), "..", "frontend")
os.makedirs(frontend_path, exist_ok=True)
app.mount("/", StaticFiles(directory=frontend_path, html=True), name="frontend")
