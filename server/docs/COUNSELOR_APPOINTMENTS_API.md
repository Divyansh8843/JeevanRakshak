# Counselor Appointments Dashboard API Documentation

## Overview
This document describes the complete workflow for counselor appointments including filtering, payment confirmation, join requests, real-time updates, automatic session ending, and feedback collection.

---

## 1. Get Counselor Appointments with Filters

### Endpoint
```
GET /api/bookings/counselor-appointments
```

### Description
Retrieve counselor's appointments with advanced filtering, sorting, and pagination.

### Query Parameters
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `email` | string | No | Counselor email (auto-detected from auth token) |
| `status` | string | No | Filter by status (comma-separated): `pending_payment`, `paid_pending_counselor`, `confirmed`, `in_session`, `completed`, `cancelled`, `no_show` |
| `sessionType` | string | No | Filter by category (comma-separated): `chat`, `call`, `video` |
| `dateFrom` | string | No | Start date filter (YYYY-MM-DD) |
| `dateTo` | string | No | End date filter (YYYY-MM-DD) |
| `search` | string | No | Search in notes or user ID |
| `sortBy` | string | No | Sort field: `date`, `status`, `price` (default: `createdAt`) |
| `order` | string | No | Sort order: `asc` or `desc` (default: `desc`) |
| `page` | number | No | Page number (default: 1) |
| `limit` | number | No | Items per page (default: 20) |

### Response
```json
{
  "appointments": [
    {
      "_id": "booking_id",
      "googleId": "user_google_id",
      "counselorName": "Counselor Name",
      "counselorEmail": "counselor@email.com",
      "sessionType": "video",
      "date": "2025-11-10",
      "time": "14:00",
      "status": "paid_pending_counselor",
      "price": 1200,
      "currency": "INR",
      "notes": "User notes",
      "durationMinutes": 60,
      "createdAt": "2025-11-05T12:00:00Z"
    }
  ],
  "pagination": {
    "total": 45,
    "page": 1,
    "limit": 20,
    "pages": 3
  },
  "summary": {
    "paid_pending_counselor": 5,
    "confirmed": 10,
    "in_session": 2,
    "completed": 25,
    "cancelled": 3
  }
}
```

### Example Usage
```javascript
// Filter confirmed video sessions
fetch('/api/bookings/counselor-appointments?status=confirmed&sessionType=video&sortBy=date&order=asc')

// Search and filter by date range
fetch('/api/bookings/counselor-appointments?dateFrom=2025-11-01&dateTo=2025-11-30&search=anxiety')
```

---

## 2. Confirm Payment and Book Session

### Endpoint
```
POST /api/bookings/:id/confirm-payment
```

### Description
Counselor confirms payment and books the session. This atomically:
- Updates booking status to `confirmed`
- Generates join URL and room ID
- Credits counselor earnings
- Emits real-time updates to user and counselor

### Request Body
```json
{
  "email": "counselor@email.com" // Optional if authenticated
}
```

### Response
```json
{
  "success": true,
  "booking": {
    "_id": "booking_id",
    "status": "confirmed",
    "roomId": "room_id",
    "joinUrl": "https://meet.jit.si/JeevanRakshak-...",
    "earningsCredited": true
  },
  "message": "Payment confirmed and session booked"
}
```

### Real-time Events Emitted
1. **To User**: `booking:confirmed`
   ```json
   {
     "id": "booking_id",
     "counselorName": "...",
     "sessionType": "video",
     "date": "2025-11-10",
     "time": "14:00",
     "joinUrl": "...",
     "status": "confirmed"
   }
   ```

2. **To Counselor**: `earnings:updated`
   ```json
   {
     "bookingId": "booking_id",
     "thisMonthDelta": 1200,
     "totalDelta": 1200,
     "thisMonth": 15000,
     "total": 125000,
     "timestamp": "2025-11-05T12:30:00Z"
   }
   ```

3. **To Both**: `booking:updated` (via emitBookingUpdate)

---

## 3. Send Join Request to User (by Category)

### Endpoint
```
POST /api/bookings/:id/request-join
```

### Description
Counselor sends a join request to the user according to the session category (chat, call, video). User will receive this in real-time and can accept to join the session on the platform.

### Validation
- Booking must be in `confirmed` or `in_session` status
- Cannot request join more than 15 minutes before scheduled time

### Response
```json
{
  "ok": true,
  "joinUrl": "https://meet.jit.si/JeevanRakshak-...",
  "roomId": "room_id",
  "requestTime": "2025-11-10T14:00:00Z",
  "sessionType": "video",
  "category": "video"
}
```

### Real-time Events Emitted
1. **To User**: `session:join_request`
   ```json
   {
     "bookingId": "booking_id",
     "joinUrl": "...",
     "sessionType": "video",
     "category": "video",
     "date": "2025-11-10",
     "time": "14:00",
     "requestTime": "...",
     "counselorName": "...",
     "counselorEmail": "...",
     "durationMinutes": 60
   }
   ```

2. **To Counselor**: `session:join_request_sent`
   ```json
   {
     "bookingId": "booking_id",
     "status": "sent",
     "timestamp": "...",
     "sessionType": "video",
     "userName": "User"
   }
   ```

---

## 4. User Accepts Join Request (Real-time)

### Endpoint
```
POST /api/bookings/:id/accept-join
```

### Description
User accepts the join request in real-time. This:
- Updates booking status to `in_session`
- Starts the session timer
- Schedules automatic session end after duration
- Emits events to both parties
- Prompts user for feedback after session ends

### Response
```json
{
  "ok": true,
  "joinUrl": "...",
  "roomId": "...",
  "status": "in_session",
  "sessionType": "video",
  "category": "video",
  "sessionStartTime": "2025-11-10T14:00:00Z",
  "durationMinutes": 60
}
```

### Real-time Events Emitted
1. **To Both**: `session:started`
   ```json
   {
     "bookingId": "booking_id",
     "startTime": "...",
     "sessionType": "video",
     "category": "video",
     "joinUrl": "...",
     "roomId": "...",
     "durationMinutes": 60
   }
   ```

2. **To Counselor**: `booking:join_accepted`
3. **To User**: `booking:join_ready`
4. **To Both**: `booking:updated`

### Automatic Session End (After Duration)
After the session duration, the following automatically happens:
1. Booking status changes to `completed`
2. Session end time is recorded
3. Events emitted:
   - **To Both**: `session:ended`
   ```json
   {
     "bookingId": "booking_id",
     "endTime": "2025-11-10T15:00:00Z",
     "sessionType": "video",
     "category": "video",
     "duration": 60
   }
   ```
   
   - **To User**: `session:feedback_request`
   ```json
   {
     "bookingId": "booking_id",
     "counselorName": "...",
     "sessionType": "video",
     "endTime": "..."
   }
   ```

---

## 5. Submit Feedback and Review

### Endpoint
```
POST /api/bookings/:id/feedback
```

### Description
User submits feedback and rating after the session ends.

### Request Body
```json
{
  "rating": 5,
  "comment": "Excellent session, very helpful!"
}
```

### Response
```json
{
  "ok": true
}
```

### Real-time Events Emitted
- **To Counselor**: `appointment:updated` with feedback info

---

## Complete Workflow Summary

### Step-by-Step Flow

1. **User Creates Booking** → Status: `pending_payment`
2. **User Pays via Stripe** → Status: `paid_pending_counselor`
   - Counselor receives real-time notification
   - Appears in counselor's appointments dashboard

3. **Counselor Confirms Payment** (`POST /bookings/:id/confirm-payment`)
   - Status: `confirmed`
   - Earnings added to counselor account (live update)
   - User receives confirmation notification
   - Join URL generated

4. **Counselor Sends Join Request** (`POST /bookings/:id/request-join`)
   - At scheduled time (within 15 min window)
   - User receives real-time join request with category info
   - Request includes session type (chat/call/video)

5. **User Accepts Join Request** (`POST /bookings/:id/accept-join`)
   - Status: `in_session`
   - Session timer starts
   - Both parties redirected to session platform according to category
   - Automatic end scheduled

6. **Session Automatically Ends** (After duration)
   - Status: `completed`
   - User receives feedback request prompt
   - Both parties notified

7. **User Gives Feedback** (`POST /bookings/:id/feedback`)
   - Rating and review saved
   - Counselor notified of feedback

---

## Socket.IO Events Reference

### Events to Listen (Frontend)

#### Counselor Dashboard
```javascript
socket.on('booking:awaiting_confirmation', (data) => {
  // New booking needs confirmation
  // Refresh appointments list
});

socket.on('earnings:updated', (data) => {
  // Update earnings display in real-time
  // data: { thisMonth, total, thisMonthDelta, totalDelta }
});

socket.on('session:join_request_sent', (data) => {
  // Confirmation that join request was sent
});

socket.on('session:started', (data) => {
  // Session has started, user joined
});

socket.on('session:ended', (data) => {
  // Session has ended
  // Refresh appointments
});
```

#### User Dashboard
```javascript
socket.on('booking:confirmed', (data) => {
  // Counselor confirmed your booking
});

socket.on('session:join_request', (data) => {
  // Show join request modal/notification
  // Display: counselorName, sessionType/category, time
  // Button to accept join
});

socket.on('session:started', (data) => {
  // Session started, redirect to session platform
  // Use data.joinUrl and data.category
});

socket.on('session:ended', (data) => {
  // Session ended
});

socket.on('session:feedback_request', (data) => {
  // Show feedback/review modal
});
```

### Events to Emit (Frontend)

```javascript
// Join rooms
socket.emit('join:user', googleId);
socket.emit('join:counselor', email);
socket.emit('join:booking', bookingId);
socket.emit('join:session', { sessionId, role: 'user' }); // or 'counselor'
```

---

## Error Handling

All endpoints return appropriate HTTP status codes:
- `200` - Success
- `400` - Bad request (validation error)
- `401` - Unauthorized
- `403` - Forbidden
- `404` - Not found
- `500` - Server error

Error response format:
```json
{
  "error": "Error message",
  "code": "ERROR_CODE",
  "details": "Additional details"
}
```

---

## Testing Examples

### Filter Appointments
```bash
curl -X GET "http://localhost:3000/api/bookings/counselor-appointments?status=paid_pending_counselor,confirmed&sessionType=video" \
  -H "Cookie: auth_token=..."
```

### Confirm Payment
```bash
curl -X POST "http://localhost:3000/api/bookings/BOOKING_ID/confirm-payment" \
  -H "Content-Type: application/json" \
  -H "Cookie: auth_token=..." \
  -d '{}'
```

### Send Join Request
```bash
curl -X POST "http://localhost:3000/api/bookings/BOOKING_ID/request-join" \
  -H "Content-Type: application/json" \
  -H "Cookie: auth_token=..." \
  -d '{}'
```

### Accept Join Request
```bash
curl -X POST "http://localhost:3000/api/bookings/BOOKING_ID/accept-join" \
  -H "Content-Type: application/json" \
  -H "Cookie: auth_token=..." \
  -d '{}'
```

### Submit Feedback
```bash
curl -X POST "http://localhost:3000/api/bookings/BOOKING_ID/feedback" \
  -H "Content-Type: application/json" \
  -H "Cookie: auth_token=..." \
  -d '{"rating": 5, "comment": "Great session!"}'
```

---

## Notes

1. **Real-time Updates**: All critical actions emit socket events for live updates
2. **Earnings**: Credited only once per booking (earningsCredited flag prevents double-counting)
3. **Session Categories**: `chat`, `call`, `video` - used for routing to appropriate platform
4. **Auto-end**: Sessions automatically end after `durationMinutes` (default: 60)
5. **Join Window**: Can only send join request within 15 minutes of scheduled time
6. **Authentication**: All endpoints require authentication via `auth_token` cookie
