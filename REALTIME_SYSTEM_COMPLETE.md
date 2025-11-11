# JeevanRakshak Real-Time Counseling System - Complete Implementation

## 🎯 Overview

This document describes the complete real-time counseling session system with live earnings dashboard, automatic session management, and feedback system.

## ✨ Features Implemented

### 1. **Live Earnings Dashboard** 💰

#### Overview Section Stats
- **Total Earnings**: Live lifetime earnings display
- **Monthly Earnings**: Current month revenue (updates in real-time)
- Updates automatically when sessions complete and payments are confirmed

#### Earnings Section
Comprehensive earnings dashboard with:
- **Today's Earnings**: Real-time daily revenue
- **This Week**: 7-day earnings window
- **This Month**: Current month total
- **Total Earnings**: Lifetime revenue (with live updates)
- **Completed Sessions**: Total sessions completed
- **Earnings by Session Type**: Breakdown showing:
  - Video Sessions (count + earnings)
  - Call Sessions (count + earnings)
  - Chat Sessions (count + earnings)
- **Recent Transactions**: List of last 20 transactions with details

#### Real-Time Updates
- Socket event: `earnings:updated`
- Triggers automatic refresh of earnings data
- Shows toast notification with earnings delta
- Updates both Overview and Earnings sections instantly

### 2. **Session Join Request Flow** 🤝

#### Counselor Side (Appointments Panel)
1. **Confirm Booking Button**: Counselor confirms payment and accepts booking
   - Credits earnings immediately
   - Updates booking status to `confirmed`
   - Emits real-time update to user

2. **Send Join Request Button**: Counselor initiates session join
   - Enabled only at scheduled time (or up to 15 mins before)
   - Sends join request to user with session type (chat/call/video)
   - Tracks request time

#### User Side (StudentSession Component)
1. **Receive Join Request**: User gets real-time notification
   - Shows counselor name and session type
   - Displays "Accept & Join" button
   - Shows request timestamp

2. **Accept Join**: User accepts the request
   - Session status changes to `in_session`
   - Opens session link in new tab
   - Starts session timer

### 3. **Automatic Session Management** ⏱️

#### Session Lifecycle
```
Booking Created → Payment → Counselor Confirms → Confirmed
    ↓
Counselor Sends Join Request (at scheduled time) → User Accepts
    ↓
Session Starts (status: in_session)
    ↓
Timer Runs (shows countdown to user)
    ↓
Auto-End After Duration (default 60 mins)
    ↓
Status: Completed → Feedback Prompt
```

#### Auto-End Mechanism
- Session automatically ends after `durationMinutes` (default: 60)
- Emits `session:ended` event to both parties
- Updates booking status to `completed`
- Triggers feedback request to user

### 4. **Feedback and Rating System** ⭐

#### Student Feedback (StudentSession Component)
After session completion:
- **Rating**: 1-5 stars (required)
- **Comment**: Optional text feedback
- Submit button validates rating before submission

#### Real-Time Rating Updates (Counselor Side)
When student submits feedback:
1. Updates counselor's average rating
2. Increments review count
3. Emits `booking:feedback_received` event
4. Emits `stats:update` event
5. Counselor dashboard shows:
   - Toast notification with new rating
   - Updated average rating in Overview
   - Live update without page refresh

### 5. **Real-Time Socket Events** 🔄

All events use Socket.IO for instant updates:

#### Earnings Events
- `earnings:updated`: When session completes and earnings credited
  ```javascript
  {
    thisMonthDelta: 1200,
    totalDelta: 1200,
    thisMonth: 45600,
    total: 125000,
    completedSessionsDelta: 1
  }
  ```

#### Session Events
- `session:join_request`: Counselor requests to join
  ```javascript
  {
    bookingId: "123",
    sessionType: "video",
    category: "video",
    joinUrl: "https://...",
    counselorName: "Dr. Smith",
    durationMinutes: 60
  }
  ```

- `session:started`: Session begins
  ```javascript
  {
    bookingId: "123",
    startTime: "2025-11-06T15:30:00Z",
    sessionType: "video",
    durationMinutes: 60
  }
  ```

- `session:ended`: Session completes
  ```javascript
  {
    bookingId: "123",
    endTime: "2025-11-06T16:30:00Z",
    sessionType: "video"
  }
  ```

- `session:feedback_request`: Prompt for feedback
  ```javascript
  {
    bookingId: "123",
    counselorName: "Dr. Smith",
    sessionType: "video"
  }
  ```

#### Feedback Events
- `booking:feedback_received`: New rating submitted
  ```javascript
  {
    bookingId: "123",
    rating: 5,
    comment: "Great session!",
    newAverageRating: 4.8,
    totalReviews: 127
  }
  ```

#### Stats Events
- `stats:update`: Dashboard statistics changed
  ```javascript
  {
    averageRating: 4.8,
    totalReviews: 127,
    completedSessions: 450
  }
  ```

#### Booking Events
- `booking:new`: New booking created
- `booking:updated`: Booking status changed
- `booking:confirmed`: Booking confirmed by counselor
- `booking:cancelled`: Booking cancelled

## 🏗️ Architecture

### Backend Components

#### Models
- **Booking-model.js**: Enhanced with:
  - `earningsCredited`: Prevents double-crediting
  - `sessionStartTime`, `sessionEndTime`: Track session duration
  - `lastJoinRequestTime`, `joinAcceptedTime`: Track join flow
  - `feedbackRating`, `feedbackComment`: Store user feedback

- **Counselor-model.js**: Tracks:
  - `earnings.total`: Lifetime earnings
  - `earnings.thisMonth`: Current month earnings
  - `earnings.lastUpdated`: Last update timestamp
  - `completedSessions`: Total completed sessions count

#### Controllers
- **booking-controller.js**: 
  - `/api/bookings/:id/request-join`: Counselor initiates join
  - `/api/bookings/:id/accept-join`: User accepts join
  - `/api/bookings/:id/feedback`: Submit feedback
  - Earnings crediting on booking confirmation
  - Auto-session end scheduling

- **booking-controller-feedback.js**:
  - Feedback submission with validation
  - Counselor rating calculation
  - Real-time notifications

- **user-controller.js**:
  - `/api/counselors/stats`: Dashboard statistics with total earnings
  - `/api/counselors/earnings`: Detailed earnings with breakdown

#### Socket Events (utils/socket.js)
- `emitToCounselor()`: Send to specific counselor
- `emitToUser()`: Send to specific user
- `emitBookingUpdate()`: Broadcast booking changes
- `emitSessionJoinRequest()`: Send join request

### Frontend Components

#### CounselorDashboard.jsx
- **Overview Section**: Live stats with earnings and rating
- **Earnings Section**: Comprehensive earnings dashboard
- **Appointments Section**: Join request management
- Real-time socket connections per section
- StrictMode-safe socket management with refs

#### StudentSession.jsx
- Join request notification UI
- Accept/Reject buttons
- Live session timer with countdown
- Feedback form after completion
- Real-time status updates

## 🧪 Testing the Complete Flow

### Step 1: Create Booking
```bash
# User creates booking
POST /api/bookings
{
  "googleId": "user123",
  "counselorName": "Dr. Smith",
  "counselorEmail": "dr.smith@example.com",
  "sessionType": "video",
  "date": "2025-11-07",
  "time": "14:00",
  "notes": "Need help with anxiety"
}
```

### Step 2: Payment (if enabled)
- User completes Stripe checkout
- Webhook updates booking to `paid_pending_counselor`

### Step 3: Counselor Confirms
```bash
# Counselor confirms booking
POST /api/bookings/{id}/confirm-payment
```
- ✅ Earnings credited instantly
- ✅ Overview shows updated total earnings
- ✅ Earnings section updates live
- ✅ Status changes to `confirmed`

### Step 4: Session Time Arrives
```bash
# At scheduled time, counselor sends join request
POST /api/bookings/{id}/request-join
```
- ✅ User receives real-time notification
- ✅ StudentSession page shows "Accept & Join" button

### Step 5: User Accepts
```bash
# User accepts join request
POST /api/bookings/{id}/accept-join
```
- ✅ Session starts (status: `in_session`)
- ✅ Both parties see "Live" indicator
- ✅ Timer starts counting down
- ✅ Session link opens automatically

### Step 6: Session Runs
- Timer shows remaining time (e.g., "58:34")
- Both parties in video/call/chat session
- Activity tracked in real-time

### Step 7: Auto-End
- After 60 minutes (or configured duration)
- ✅ Status changes to `completed`
- ✅ Both parties receive `session:ended` event
- ✅ User sees feedback prompt

### Step 8: Feedback Submission
```bash
# User submits feedback
POST /api/bookings/{id}/feedback
{
  "rating": 5,
  "comment": "Excellent session!"
}
```
- ✅ Counselor rating updated
- ✅ Toast shows: "New rating: 5⭐ - Avg: 4.8"
- ✅ Overview shows updated rating instantly
- ✅ No page refresh needed

## 🔍 Verification Checklist

### Earnings Dashboard
- [ ] Overview shows Total Earnings card
- [ ] Monthly Earnings updates when session completes
- [ ] Earnings section shows all 5 cards (Today, Week, Month, Total, Sessions)
- [ ] Session type breakdown displays correctly (Video/Call/Chat)
- [ ] Recent transactions list shows last 20
- [ ] Live indicator shows "Connected" status
- [ ] Toast notification appears on earnings update

### Session Flow
- [ ] "Confirm Booking" button works at any time after payment
- [ ] "Send Join Request" only enabled at scheduled time
- [ ] User receives join request in real-time
- [ ] Accept button works and opens session link
- [ ] Timer shows countdown during session
- [ ] Session ends automatically after duration
- [ ] Feedback form appears after completion

### Real-Time Updates
- [ ] All socket connections show "Live" badge
- [ ] Overview stats refresh on earnings:updated event
- [ ] Rating updates instantly when feedback received
- [ ] No page refresh required for any update
- [ ] Multiple counselors receive independent updates

### Data Consistency
- [ ] Total earnings matches sum of all bookings
- [ ] Monthly earnings resets each month
- [ ] Session count increments correctly
- [ ] Rating calculation is accurate
- [ ] No duplicate earnings credits

## 🚀 Performance Optimizations

1. **Socket Management**: StrictMode-safe with refs to prevent double connections
2. **Debounced Updates**: Earnings reload instead of incremental updates for accuracy
3. **Selective Queries**: Only fetch necessary data for each endpoint
4. **Indexed Fields**: Database indexes on counselorEmail, status, scheduledAt
5. **Lean Queries**: Use `.lean()` for read-only operations

## 🐛 Common Issues & Solutions

### Issue: Earnings not updating
**Solution**: Check that `earningsCredited` flag is properly set and counselor email matches

### Issue: Socket not connecting
**Solution**: Verify VITE_SERVER_URL is set correctly and server is running

### Issue: Join request not received
**Solution**: Ensure user has joined socket rooms (join:user, join:booking)

### Issue: Rating not updating
**Solution**: Confirm feedback-controller.js is emitting both events (feedback_received and stats:update)

### Issue: Double earnings credit
**Solution**: Check `earningsCredited` flag before crediting in any endpoint

## 📊 Dashboard Screenshots

### Overview Section
- 7 stat cards including Total Earnings
- Real-time connection indicator
- Last update timestamp
- Pending booking alerts

### Earnings Section
- 5 earnings cards (Today, Week, Month, Total, Sessions)
- Session type breakdown (3 cards: Video, Call, Chat)
- Recent transactions table
- Live update indicators

## 🎓 API Reference

### Counselor Endpoints
- `GET /api/counselors/stats` - Dashboard statistics
- `GET /api/counselors/earnings` - Earnings summary and transactions
- `GET /api/counselors/clients` - Client list
- `GET /api/counselors/activity` - Recent activity

### Booking Endpoints
- `POST /api/bookings/:id/confirm-payment` - Confirm and credit earnings
- `POST /api/bookings/:id/request-join` - Initiate join request
- `POST /api/bookings/:id/accept-join` - Accept join and start session
- `POST /api/bookings/:id/feedback` - Submit feedback

## 🎉 Summary

The system now provides:
- ✅ Complete live earnings dashboard
- ✅ Real-time session join flow
- ✅ Automatic session management
- ✅ Instant feedback and rating updates
- ✅ Comprehensive socket event system
- ✅ All data displayed live without refresh

All components work together seamlessly to provide a professional, real-time counseling platform experience!
