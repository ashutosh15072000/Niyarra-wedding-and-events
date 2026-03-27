import requests

payload = {
    "name": "Test Guest",
    "pax": 2,
    "hotel": "Test Hotel",
    "room": "101",
    "floor": "1",
    "guest_mobile": "1234567890",
    "members_names": "John, Doe",
    "driver_name": "Driver 1",
    "driver_mobile": "0987654321",
    "day0": False,
    "day1": True,
    "day2": False,
    "day3": False,
    "description": "Test",
    "extra_bedding": False,
    "transport_needed": False,
    "transport_type": "",
    "arrival_location": "",
    "arrival_date": "",
    "arrival_time": "",
    "flight_train_number": "",
    "pickup_arranged": False,
    "dropoff_arranged": False,
    "departure_transport_type": "",
    "departure_location": "",
    "departure_flight_train_number": "",
    "departure_date": "",
    "departure_time": ""
}

try:
    response = requests.post("http://localhost:8000/api/guests", json=payload)
    print("Status code:", response.status_code)
    print("Response body:", response.text)
except Exception as e:
    print("Error:", e)
