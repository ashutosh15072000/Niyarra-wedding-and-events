from sqlalchemy import Column, Integer, String, Boolean
from .database import Base

class Guest(Base):
    __tablename__ = "guests"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True)
    pax = Column(Integer)
    hotel = Column(String)
    room = Column(String)
    floor = Column(String)
    guest_mobile = Column(String)
    members_names = Column(String)
    driver_name = Column(String)
    driver_mobile = Column(String)
    day0 = Column(Boolean, default=False)
    day1 = Column(Boolean, default=False)
    day2 = Column(Boolean, default=False)
    day3 = Column(Boolean, default=False)
    
    description = Column(String, nullable=True)
    extra_bedding = Column(Boolean, default=False)
    
    checked_in = Column(Boolean, default=False)
    
    # Logistics & Transportation
    transport_needed = Column(Boolean, default=False)
    transport_type = Column(String)
    arrival_location = Column(String)
    arrival_date = Column(String)
    arrival_time = Column(String)
    flight_train_number = Column(String)
    pickup_arranged = Column(Boolean, default=False)
    dropoff_arranged = Column(Boolean, default=False)
    departure_transport_type = Column(String)
    departure_location = Column(String)
    departure_date = Column(String)
    departure_time = Column(String)
    departure_flight_train_number = Column(String)

class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True)
    hashed_password = Column(String)
