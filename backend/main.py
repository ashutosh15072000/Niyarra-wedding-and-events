from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from sqlalchemy.orm import Session
from contextlib import asynccontextmanager
from datetime import timedelta
from typing import List
import logging
import os

from backend import auth
from backend import database
from backend import models
from backend import schemas
from backend.database import engine, get_db

import logging
import os
import asyncio
from datetime import datetime

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

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
    
    # Start background worker for scheduled messages
    stop_event = asyncio.Event()
    worker_task = asyncio.create_task(message_worker(stop_event))
    
    yield
    
    # Shutdown worker
    stop_event.set()
    await worker_task

async def message_worker(stop_event: asyncio.Event):
    logger.info("Message worker started")
    while not stop_event.is_set():
        try:
            db = database.SessionLocal()
            now = datetime.now()
            current_date = now.strftime("%Y-%m-%d")
            current_time = now.strftime("%H:%M")
            
            # Find pending messages that are due
            due_messages = db.query(models.ScheduledMessage).filter(
                models.ScheduledMessage.status == "Pending",
                models.ScheduledMessage.schedule_date <= current_date
            ).all()
            
            for msg in due_messages:
                # Check if time is also due (simple string comparison for now)
                if msg.schedule_date < current_date or msg.schedule_time <= current_time:
                    logger.info(f"Message due for {msg.guest_name}: {msg.message}")
                    # In a real app, we would call the WhatsApp API here.
                    # For now, we'll mark as 'Sent' to simulate (or 'Due' if we want the user to action it)
                    # msg.status = "Sent" 
                    # db.commit()
            
            db.close()
        except Exception as e:
            logger.error(f"Error in message worker: {e}")
            
        await asyncio.sleep(60) # Check every minute

app = FastAPI(lifespan=lifespan)

# Allow requests from all origins (needed for Vercel deployment)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

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
    try:
        db_guest = models.Guest(**guest.model_dump())
        db.add(db_guest)
        db.commit()
        db.refresh(db_guest)
        logger.info(f"Created guest: {db_guest.name}")
        return db_guest
    except Exception as e:
        logger.error(f"Error creating guest: {e}")
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))

@app.put("/api/guests/{guest_id}/checkin", response_model=schemas.GuestRead)
def toggle_checkin(guest_id: int, db: Session = Depends(get_db)):
    db_guest = db.query(models.Guest).filter(models.Guest.id == guest_id).first()
    if not db_guest:
        raise HTTPException(status_code=404, detail="Guest not found")
    
    db_guest.checked_in = not db_guest.checked_in
    db.commit()
    db.refresh(db_guest)
    return db_guest

@app.delete("/api/guests/{guest_id}")
def delete_guest(guest_id: int, db: Session = Depends(get_db)):
    db_guest = db.query(models.Guest).filter(models.Guest.id == guest_id).first()
    if not db_guest:
        raise HTTPException(status_code=404, detail="Guest not found")
    db.delete(db_guest)
    db.commit()
    return {"status": "success"}

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

@app.get("/api/messages", response_model=List[schemas.ScheduledMessageRead])
def get_messages(db: Session = Depends(get_db)):
    return db.query(models.ScheduledMessage).order_by(models.ScheduledMessage.id.desc()).all()

@app.post("/api/messages", response_model=schemas.ScheduledMessageRead)
def create_message(msg: schemas.ScheduledMessageCreate, db: Session = Depends(get_db)):
    db_msg = models.ScheduledMessage(**msg.model_dump())
    db.add(db_msg)
    db.commit()
    db.refresh(db_msg)
    return db_msg

@app.delete("/api/messages/{msg_id}")
def delete_message(msg_id: int, db: Session = Depends(get_db)):
    db_msg = db.query(models.ScheduledMessage).filter(models.ScheduledMessage.id == msg_id).first()
    if not db_msg:
        raise HTTPException(status_code=404, detail="Message not found")
    db.delete(db_msg)
    db.commit()
    return {"status": "success"}

@app.put("/api/messages/{msg_id}/status")
def update_message_status(msg_id: int, status_update: str, db: Session = Depends(get_db)):
    db_msg = db.query(models.ScheduledMessage).filter(models.ScheduledMessage.id == msg_id).first()
    if not db_msg:
        raise HTTPException(status_code=404, detail="Message not found")
    db_msg.status = status_update
    db.commit()
    return db_msg

@app.put("/api/messages/bulk-edit")
def bulk_edit_messages(bulk_req: schemas.BulkMessageUpdate, db: Session = Depends(get_db)):
    db_msgs = db.query(models.ScheduledMessage).filter(models.ScheduledMessage.id.in_(bulk_req.msg_ids)).all()
    for db_msg in db_msgs:
        for var, value in bulk_req.msg_update.model_dump(exclude_unset=True).items():
            setattr(db_msg, var, value) if value is not None else None
    db.commit()
    return {"status": "success", "updated_count": len(db_msgs)}

@app.put("/api/messages/{msg_id}", response_model=schemas.ScheduledMessageRead)
def edit_message(msg_id: int, msg_update: schemas.ScheduledMessageUpdate, db: Session = Depends(get_db)):
    db_msg = db.query(models.ScheduledMessage).filter(models.ScheduledMessage.id == msg_id).first()
    if not db_msg:
        raise HTTPException(status_code=404, detail="Message not found")
    
    for var, value in msg_update.model_dump(exclude_unset=True).items():
        setattr(db_msg, var, value) if value is not None else None

    db.commit()
    db.refresh(db_msg)
    return db_msg

# Only mount static files in local development, NOT on Vercel
# Vercel serves frontend/ via @vercel/static in vercel.json
if not os.environ.get("VERCEL"):
    frontend_path = os.path.join(os.path.dirname(__file__), "..", "frontend")
    if os.path.isdir(frontend_path):
        app.mount("/", StaticFiles(directory=frontend_path, html=True), name="frontend")
