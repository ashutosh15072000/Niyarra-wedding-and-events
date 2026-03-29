import requests
import json

API_URL = "http://127.0.0.1:8000/api"

def test_add_guest_day0():
    payload = {
        "name": "Verification Guest",
        "pax": 3,
        "hotel": "ITC Mughal",
        "day0": True,
        "day1": True,
        "day2": False,
        "day3": False,
        "transport_needed": True,
        "transport_type": "Airport"
    }
    
    # Add guest
    response = requests.post(f"{API_URL}/guests", json=payload)
    if response.status_code != 200:
        print(f"Failed to add guest: {response.status_code}")
        print(response.text)
        return
    
    guest_id = response.json()["id"]
    print(f"Added guest with ID: {guest_id}")
    
    # Verify guest details
    response = requests.get(f"{API_URL}/guests")
    guests = response.json()
    added_guest = next((g for g in guests if g["id"] == guest_id), None)
    
    if added_guest:
        print(f"Guest found: {added_guest['name']}")
        print(f"Day 0: {added_guest['day0']}")
        if added_guest['day0'] == True:
            print("Day 0 verification SUCCESSFUL")
        else:
            print("Day 0 verification FAILED")
    else:
        print("Guest not found in list")

if __name__ == "__main__":
    test_add_guest_day0()
