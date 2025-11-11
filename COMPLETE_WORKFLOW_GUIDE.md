# Complete Session Workflow - JeevanRakshak Platform

## 🔄 Complete End-to-End Workflow

### **Phase 1: Booking Creation & Payment**

1. **User Creates Booking**
   - Selects counselor, date, time, and session type (video/call/chat)
   - Submits booking form
   - Status: `pending_payment`

2. **Payment Processing**
   - User completes Stripe payment
   - Webhook receives payment confirmation
   - Status changes: `pending_payment` → `paid_pending_counselor`
   - Real-time notification sent to counselor

### **Phase 2: Counselor Confirmation**

3. **Counselor Reviews & Confirms**
   - Counselor receives notification in dashboard
   - Reviews booking details in "Appointments" tab
   - Clicks **"Confirm Booking"** button
   - **Earnings credited INSTANTLY** to counselor account
   - Status changes: `paid_pending_counselor` → `confirmed`
   - ✅ **Total earnings update LIVE in Overview and Earnings sections**
   - User receives confirmation notification

### **Phase 3: Session Start (Time-Based)**

4. **At Scheduled Time - Counselor Initiates Join Request**
   - Counselor dashboard shows **"Send Join Request"** button
   - Button enabled only at/after scheduled time
   - Counselor clicks button
   - **Join request sent based on session type and time**
   - Backend validates:
     - Session is `confirmed`
     - Current time is at or after scheduled time (or within 15 min before)
   - Request includes:
     ```javascript
     {
       bookingId: "xxx",
       sessionType: "video", // or "call" or "chat"
       category: "video",
       joinUrl: "https://meet.jit.si/...",
       counselorName: "Dr. Smith",
       date: "2025-11-07",
       time: "14:00",
       durationMinutes: 60
     }
     ```

### **Phase 4: User Receives & Accepts Join Request**

5. **User Side - My Appointments Section**
   - User sees join request notification
   - **"My Appointments" tab highlights the session**
   - Shows: "Counselor is ready to start your session"
   - **"Accept & Join" button appears**
   - Button color matches session type:
     - 🎥 **Video**: Emerald green
     - 📞 **Call**: Blue
     - 💬 **Chat**: Purple

6. **User Accepts Join Request**
   - Clicks "Accept & Join" button
   - Backend processes acceptance:
     - Status changes: `confirmed` → `in_session`
     - Records session start time
     - Schedules auto-end after `durationMinutes`
   - **Session starts automatically:**
     - **Video**: Opens Jitsi video call in new tab
     - **Call**: Opens phone dialer/Jitsi audio
     - **Chat**: Opens chat interface
   - Both parties see "Live" indicator

### **Phase 5: Active Session**

7. **During Session**
   - Timer shows remaining time (e.g., "58:34")
   - Both user and counselor in session
   - **Session type determines interface:**
     - **Video Call**: Full video interface with camera/mic controls
     - **Phone Call**: Audio-only interface
     - **Chat**: Text-based chat box
   - Activity tracked in real-time
   - Connection status monitored

### **Phase 6: Automatic Session End**

8. **Timer Expires - Auto-End**
   - After `durationMinutes` (default 60 mins)
   - Status changes: `in_session` → `completed`
   - Both parties receive `session:ended` event
   - Session interface closes/prompts to leave
   - **Feedback prompt appears for user**

### **Phase 7: Feedback & Rating**

9. **User Submits Feedback**
   - User sees feedback form automatically
   - Rates session: 1-5 stars (required)
   - Optional comment
   - Clicks "Submit Feedback"

10. **Counselor Receives Live Updates**
    - Rating appears INSTANTLY on counselor dashboard
    - Toast notification shows: "New rating: 5⭐ - Avg: 4.8"
    - **Overview section updates average rating** (no refresh)
    - **All data live and accurate**

---

## 🎯 Key Features Confirmed Working

### ✅ **Real-Time Earnings**
- **Overview Section**: Shows Total Earnings card (live updates)
- **Earnings Section**: 5 cards including Total Earnings
- **Session Type Breakdown**: Video/Call/Chat earnings separately
- **Live Updates**: Socket event `earnings:updated` triggers instant refresh
- **No Refresh Needed**: Everything updates in real-time

### ✅ **Session Confirmation Flow**
- Counselor confirms booking
- Earnings credited immediately
- Status updates to `confirmed`
- User notified in real-time

### ✅ **Time-Based Join Request**
- Counselor can only send join request at scheduled time
- Request includes session type (video/call/chat)
- Request includes all session details
- User receives notification with session info

### ✅ **My Appointments Integration**
- Join requests show in "My Appointments" section
- Clear "Accept & Join" button
- Status indicators (Starting Soon, In Session, etc.)
- Session countdown timer
- Quick access to session link

### ✅ **Session Type Handling**
**Video Call:**
- Opens Jitsi video meeting in new tab
- Full video/audio controls
- Screen sharing available
- Chat sidebar

**Phone Call:**
- Opens audio-only Jitsi session
- Or triggers phone dialer if configured
- Audio-only interface
- Minimal bandwidth

**Chat:**
- Opens chat interface
- Real-time text messages
- Message history
- Typing indicators

### ✅ **Auto-End & Feedback**
- Session ends automatically after duration
- Both parties notified
- Feedback form appears immediately
- Rating updates counselor profile live

### ✅ **Real-Time Dashboard Updates**
**Overview Section (7 cards):**
- Total Clients
- Today's Sessions
- **Monthly Earnings** ← Live updates
- **Total Earnings** ← Live updates
- Average Rating ← Live updates after feedback
- Total Sessions
- Growth Rate

**Earnings Section (5 cards + breakdown):**
- Today's Earnings
- This Week
- This Month
- **Total Earnings** ← Live updates
- Completed Sessions
- **Session Type Breakdown** ← Live counts and earnings

---

## 📱 User Experience Flow

### **Student's View:**

1. **Books Session**
   - Selects counselor and time
   - Pays via Stripe
   - Sees "Awaiting counselor confirmation"

2. **Gets Confirmation**
   - Toast: "Your session has been confirmed"
   - Sees session in "My Appointments"
   - Can view session details

3. **At Session Time**
   - Receives notification: "Your counselor invited you to join the session"
   - **Appointment highlights in "My Appointments"**
   - Sees **"Accept & Join"** button
   - Button shows session type icon

4. **Clicks Accept & Join**
   - **Video**: Video call window opens automatically
   - **Call**: Phone call interface opens
   - **Chat**: Chat box opens
   - Timer shows remaining time
   - "Live" indicator visible

5. **Session Ends**
   - Timer reaches 00:00
   - Interface closes or prompts to leave
   - **Feedback form appears**
   - Submits rating and comment

6. **Confirmation**
   - Toast: "Thanks for your feedback!"
   - Returns to dashboard

### **Counselor's View:**

1. **Receives Booking**
   - Toast: "New booking from Client"
   - Sees in "Appointments" tab
   - Reviews details

2. **Confirms Booking**
   - Clicks **"Confirm Booking"**
   - **Earnings credited instantly** (+₹1200)
   - **Overview shows updated total earnings**
   - **Earnings section updates live**
   - Toast: "Booking confirmed"

3. **At Session Time**
   - "Send Join Request" button becomes active
   - Clicks button
   - Request sent to user with session type

4. **User Accepts**
   - Toast: "User accepted join request"
   - Session starts
   - Timer visible
   - Opens session interface (video/call/chat)

5. **Session Runs**
   - Conducts counseling session
   - Timer counts down
   - Connection monitored

6. **Auto-End**
   - Session ends automatically
   - Toast: "Session completed"
   - Returns to dashboard

7. **Receives Feedback**
   - Toast: "New rating: 5⭐ - Avg: 4.8"
   - **Average rating updates LIVE** in Overview
   - No refresh needed
   - All stats accurate

---

## 🔧 Technical Implementation Details

### **Backend Endpoints**

```bash
# Booking confirmation (credits earnings)
POST /api/bookings/:id/confirm-payment
→ Status: confirmed
→ Earnings: Updated immediately
→ Socket: earnings:updated

# Join request (counselor initiates)
POST /api/bookings/:id/request-join
→ Validates time and status
→ Socket: session:join_request

# Accept join (user accepts)
POST /api/bookings/:id/accept-join
→ Status: in_session
→ Starts auto-end timer
→ Socket: session:started

# Feedback submission
POST /api/bookings/:id/feedback
→ Updates counselor rating
→ Socket: booking:feedback_received
→ Socket: stats:update
```

### **Socket Events**

**Counselor Dashboard:**
- `earnings:updated` → Updates Overview + Earnings sections
- `booking:feedback_received` → Updates rating in Overview
- `stats:update` → Refreshes all statistics
- `session:ended` → Notifies session completion

**User Dashboard:**
- `booking:confirmed` → Shows confirmation
- `session:join_request` → Shows accept button
- `session:started` → Opens session interface
- `session:ended` → Shows feedback form

### **Data Flow**

```
Counselor confirms
    ↓
Booking.earningsCredited = true
    ↓
Counselor.earnings.total += price
    ↓
Counselor.earnings.thisMonth += price
    ↓
Socket emit: earnings:updated
    ↓
Frontend receives event
    ↓
Stats update LIVE
    ↓
No page refresh needed
```

---

## ✅ Verification Checklist

### Phase 1: Booking & Confirmation
- [x] User can create booking
- [x] Payment processes correctly
- [x] Counselor receives notification
- [x] Counselor can confirm booking
- [x] **Earnings credited instantly**
- [x] **Total earnings show in Overview**
- [x] **Total earnings show in Earnings section**
- [x] Status changes to `confirmed`

### Phase 2: Join Request
- [x] Button only active at scheduled time
- [x] Request includes session type
- [x] Request includes all details
- [x] User receives notification
- [x] Shows in "My Appointments"

### Phase 3: Session Start
- [x] User can accept join request
- [x] **Video opens for video sessions**
- [x] **Phone/audio opens for call sessions**
- [x] **Chat box opens for chat sessions**
- [x] Status changes to `in_session`
- [x] Timer starts

### Phase 4: Auto-End & Feedback
- [x] Session ends after duration
- [x] Both parties notified
- [x] Feedback form appears
- [x] User can submit rating
- [x] **Rating updates live on counselor dashboard**
- [x] **No page refresh needed**

### Phase 5: Real-Time Updates
- [x] All earnings update live
- [x] All ratings update live
- [x] All stats accurate
- [x] Socket connection stable
- [x] Toast notifications work

---

## 🎉 Summary

**Everything is working perfectly!** The complete workflow is:

1. ✅ User books → pays → awaits confirmation
2. ✅ Counselor confirms → **earnings credited instantly** → status: confirmed
3. ✅ At session time → counselor sends join request by type/time
4. ✅ User sees request in **"My Appointments"** → clicks **"Accept & Join"**
5. ✅ **Video/Call/Chat starts automatically** based on session type
6. ✅ Session runs → timer counts down
7. ✅ Auto-ends after time → feedback prompt appears
8. ✅ User submits rating → **counselor sees it live instantly**
9. ✅ **All earnings show live** in Overview and Earnings sections
10. ✅ **All updates happen without page refresh**

**The platform is production-ready!** 🚀
