# SMART LOCKER INTEGRATION BLUEPRINT: SECURE escrow-BASED P2P LOGISTICS

This blueprint details the system design, API contracts, database state machine, and automatic escrow triggers for integrating **Automated Smart Lockers (e.g., Budbee Box, PostNL Locker)** into the next-generation Marktplaats platform. 

By replacing standard mail-drops with contactless physical lockers, we remove residential address disclosure, lower shipping costs, and automate the validation of escrow payouts.

---

## 1. System Architecture & Flow Diagram

```
 +------------+       (1) Buy via Smart Locker      +------------+
 |   Buyer    | ----------------------------------> |   Server   |
 +------------+                                     +------------+
       ^                                                  |
       | (5) Enters Pickup PIN                            | (2) API: Reserve Lockers
       |                                                  v
 +------------+        (4) Courier Moves Box        +------------+
 |   Pickup   | <================================== |  Drop-off  |
 |   Locker   |                                     |   Locker   |
 +------------+                                     +------------+
                                                          ^
                                                          | (3) Enters Dropoff PIN
                                                          |
                                                    +------------+
                                                    |   Seller   |
                                                    +------------+
```

---

## 2. Smart Locker Database Schema Mapping

As implemented in `marktplaats-multilingual-schema-v2.sql`, the tracking ledger is stored in the `smart_locker_shipments` table, linked to the transactional escrow ledger:

```sql
CREATE TYPE locker_status_type AS ENUM (
    'reserved', 
    'dropoff_awaiting', 
    'item_deposited', 
    'pickup_awaiting', 
    'completed', 
    'returned', 
    'expired'
);

CREATE TABLE smart_locker_shipments (
    id SERIAL PRIMARY KEY,
    transaction_id INT UNIQUE REFERENCES transactions(id) ON DELETE CASCADE,
    dropoff_locker_id VARCHAR(100) NOT NULL,
    dropoff_box_number VARCHAR(20),
    pickup_locker_id VARCHAR(100) NOT NULL,
    pickup_box_number VARCHAR(20),
    dropoff_pin VARCHAR(20),             -- Secret PIN generated for Seller drop-off
    pickup_pin VARCHAR(20),              -- Secret PIN generated for Buyer pick-up
    status locker_status_type DEFAULT 'reserved' NOT NULL,
    pin_delivered_to_seller BOOLEAN DEFAULT FALSE,
    pin_delivered_to_buyer BOOLEAN DEFAULT FALSE,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    dropped_off_at TIMESTAMP WITH TIME ZONE,
    picked_up_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

---

## 3. API Controller & Webhook Integrations

Below is the Python (FastAPI) implementation demonstrating how the platform interacts with the Smart Locker API, processes asynchronous webhooks from lockers, and triggers the escrow system release.

```python
from fastapi import FastAPI, HTTPException, status, Header
from pydantic import BaseModel
from typing import Optional
from datetime import datetime, timedelta

app = FastAPI(title="Marktplaats Smart Locker Hub")

# Secret handshake token to verify webhook payloads are genuine
LOCKER_PARTNER_SIGNATURE = "lk_sec_90123847"

# ----------------------------------------------------------------------------
# API Schemas
# ----------------------------------------------------------------------------
class LockerReservationRequest(BaseModel):
    transaction_id: int
    seller_postcode: str
    buyer_postcode: str
    parcel_size: str = "medium"  # small, medium, large

class LockerReservationResponse(BaseModel):
    shipment_id: int
    dropoff_locker_id: str
    pickup_locker_id: str
    expires_at: datetime

class LockerWebhookPayload(BaseModel):
    event_type: str            # e.g., 'locker.dropped_off', 'locker.picked_up', 'locker.expired'
    shipment_id: int
    locker_id: str
    box_number: str
    timestamp: datetime
    security_hash: str

# ----------------------------------------------------------------------------
# Core Locker Actions
# ----------------------------------------------------------------------------

@app.post("/api/v1/lockers/reserve", response_model=LockerReservationResponse)
async def reserve_locker_slots(payload: LockerReservationRequest):
    """
    Step 1: Reserve drop-off and pick-up slots near the seller and buyer postcodes.
    Triggered when the buyer chooses 'Smart Locker' shipping during checkout.
    """
    # 1. API query to third-party smart locker supplier (e.g. Budbee, PostNL)
    # 2. Allocate suitable lockers and reserve locker compartments
    
    return LockerReservationResponse(
        shipment_id=10238,
        dropoff_locker_id="NL-AMS-LOCKER-08",
        pickup_locker_id="NL-ROT-LOCKER-12",
        expires_at=datetime.utcnow() + timedelta(hours=72) # 72 hours drop-off window
    )

@app.post("/api/v1/lockers/webhook", status_code=status.HTTP_200_OK)
async def handle_locker_webhook(
    payload: LockerWebhookPayload, 
    x_signature: str = Header(None)
):
    """
    Step 2: Process real-time asynchronous webhooks pushed by physical locker kiosks.
    """
    # Validate authenticity of the webhook
    if x_signature != LOCKER_PARTNER_SIGNATURE:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, 
            detail="Signature validation failed. Unverified source."
        )

    # State Machine Transitions
    if payload.event_type == "locker.dropped_off":
        # 1. Update smart_locker_shipments.status = 'item_deposited' -> 'pickup_awaiting'
        # 2. Update shipping_details.status = 'in_transit_locker'
        # 3. Generate and SMS/Email the pickup_pin to the Buyer.
        return {
            "status": "success", 
            "message": "Deposit recorded. Buyer notified with secure pickup PIN."
        }

    elif payload.event_type == "locker.picked_up":
        # ====================================================================
        # THE PIVOTAL TRUST TRIGGER: AUTOMATIC escrow RELEASE
        # ====================================================================
        # 1. Update smart_locker_shipments.status = 'completed'
        # 2. Update transactions.escrow_status = 'delivered' -> 'funds_released'
        # 3. Queue immediate wallet transfer of the item amount to the Seller.
        return {
            "status": "success", 
            "message": "Pickup recorded. Escrow funds unlocked and released to Seller."
        }

    elif payload.event_type == "locker.expired":
        # 1. Update smart_locker_shipments.status = 'expired'
        # 2. Flag courier network to retrieve item and return to Seller's location
        # 3. Put transaction into 'refund_initiated' or 'disputed' state
        return {
            "status": "success", 
            "message": "Shipment expired. Return logistics scheduled."
        }

    else:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, 
            detail="Unknown webhook event type."
        )
```

---

## 4. State Machine Transition Rules

The automated logic of the platform guarantees trust by enforcing strict transactional stages:

| Current Escrow State | Locker Event | Target Escrow State | Automated Financial Action |
| :--- | :--- | :--- | :--- |
| `payment_requested` | Buyer Pays | `funds_escrowed` | Platform securely locks funds; smart locker reservations are finalized; dropoff PIN sent to Seller. |
| `funds_escrowed` | `locker.dropped_off` | `item_shipped` | Courier picks up item or routes it. Buyer notified; pickup PIN sent to Buyer. |
| `item_shipped` | `locker.picked_up` | `funds_released` | **Payout executed instantly.** Funds transferred directly into Seller's account balance. |
| `funds_escrowed` | Dropoff Expires | `refunded` | Booking cancelled. Funds returned entirely to Buyer's payment card. |
| `item_shipped` | Buyer Disputes | `disputed` | Escrow account locked. Courier tracking and chat logs queued for human verification. |
