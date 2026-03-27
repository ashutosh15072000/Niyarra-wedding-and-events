from pydantic import BaseModel
from typing import Optional

class GuestBase(BaseModel):
    name: str
    pax: int
    hotel: Optional[str] = None
    room: Optional[str] = None
    floor: Optional[str] = None
    guest_mobile: Optional[str] = None
    members_names: Optional[str] = None
    driver_name: Optional[str] = None
    driver_mobile: Optional[str] = None
    day0: Optional[bool] = False
    day1: Optional[bool] = False
    day2: Optional[bool] = False
    day3: Optional[bool] = False
    
    description: Optional[str] = None
    extra_bedding: Optional[bool] = False
    
    checked_in: bool = False
    
    # Logistics & Transportation
    transport_needed: bool = False
    transport_type: Optional[str] = None
    arrival_location: Optional[str] = None
    arrival_date: Optional[str] = None
    arrival_time: Optional[str] = None
    flight_train_number: Optional[str] = None
    pickup_arranged: bool = False
    dropoff_arranged: bool = False
    departure_transport_type: Optional[str] = None
    departure_location: Optional[str] = None
    departure_date: Optional[str] = None
    departure_time: Optional[str] = None
    departure_flight_train_number: Optional[str] = None

class GuestCreate(GuestBase):
    pass

class GuestUpdate(GuestBase):
    pass

class GuestRead(GuestBase):
    id: int

    class Config:
        from_attributes = True

class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    username: Optional[str] = None
