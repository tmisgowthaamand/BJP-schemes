# Testing Guide - Individual Scheme Tracking

## 🎯 Real Voter Selected

**Name:** Mahalakshmi Muthaiah  
**EPIC:** AXL3040896  
**Mobile:** 9940089442  
**Booth:** 214 (Krishnagiri Assembly, KRISHNAGIRI District)  

**Has 3 Scheme Applications:**
- Scheme #2 - Status: Submitted → **We'll update this one!**
- Scheme #8 - Status: Submitted  
- Scheme #11 - Status: Completed  

---

## 🚀 Start the Application

### Terminal 1 - Backend:
```bash
cd backend
npm start
```
Wait for: `✅ MongoDB Connected` and `Server running on port 5000`

### Terminal 2 - Frontend:
```bash
cd frontend
npm run dev
```
Wait for: `Local: http://localhost:3000`

---

## 🔐 Login as Booth Admin

1. Open browser: `http://localhost:3000`
2. Click **"Admin Login"**
3. Login credentials for Booth 214:
   - **Username:** `booth_214_admin` (or the username for Booth 214)
   - **Password:** (your booth 214 admin password)
   
   > ⚠️ If you don't have booth 214 admin credentials, you can:
   > - Use Super Admin to access all booths
   > - Or create a Booth 214 admin from Super Admin panel

---

## 📋 Navigate to Applications

1. After login, you'll see the **Booth Admin Dashboard**
2. Click on **"Applications"** in the sidebar (or top navigation)
3. You'll see a list of voters with applications

---

## 🔍 Find the Voter

**Option 1: Search**
- In the search box, type: `Mahalakshmi` or `9940089442`
- Press Enter or click Search

**Option 2: Browse**
- If Booth 214 has few applications, just scroll through the list
- Look for: **Mahalakshmi Muthaiah**

---

## 👁️ View Individual Schemes

1. Find **Mahalakshmi Muthaiah** in the list
2. Click the **"View"** button (eye icon) next to her name

**What You'll See:**

```
┌─────────────────────────────────────────────────────────────┐
│ ← Back                                                       │
│                                                              │
│ Mahalakshmi Muthaiah                                        │
│ 📞 9940089442 | 🆔 AXL3040896 | 🗳️ Booth 214                │
│                                                              │
│ ┌──────────┐  ┌──────────┐  ┌──────────┐                  │
│ │    3     │  │    1     │  │    2     │                  │
│ │  Total   │  │Delivered │  │ Pending  │                  │
│ └──────────┘  └──────────┘  └──────────┘                  │
│                                                              │
│ ▼ Individual Scheme Applications (3)                       │
│                                                              │
│ #1 ┌────────────────────────────────────────────┐          │
│    │ Scheme ID: 2              [Submitted 🟠]   │          │
│    │ Applied: 01-Aug-2026                       │          │
│    │                                             │          │
│    │ [✅ Mark as Delivered] [📄 Need Docs]     │          │
│    │ [🔄 In Progress] [▶ History (1)]          │          │
│    └────────────────────────────────────────────┘          │
│                                                              │
│ #2 ┌────────────────────────────────────────────┐          │
│    │ Scheme ID: 8              [Submitted 🟠]   │          │
│    │ Applied: 01-Aug-2026                       │          │
│    │                                             │          │
│    │ [✅ Mark as Delivered] [📄 Need Docs]     │          │
│    └────────────────────────────────────────────┘          │
│                                                              │
│ #3 ┌────────────────────────────────────────────┐          │
│    │ Scheme ID: 11             [Completed ✅]   │          │
│    │ Applied: 01-Aug-2026                       │          │
│    │ Delivered: (already completed)             │          │
│    │                                             │          │
│    │ [▶ History (1)]                            │          │
│    └────────────────────────────────────────────┘          │
└─────────────────────────────────────────────────────────────┘
```

---

## ✅ Mark Scheme as Delivered

### Step 1: Click "Mark as Delivered" on Scheme #2

A modal will pop up:

```
┌─────────────────────────────────────────────────┐
│ Mark as Delivered                           × │
├─────────────────────────────────────────────────┤
│                                                 │
│ Scheme: Scheme ID 2                            │
│ Voter: Mahalakshmi Muthaiah (9940089442)      │
│                                                 │
│ Delivery Method *                              │
│ ┌─────────────────────────────────────────┐   │
│ │ Hand Delivery                      ▼    │   │
│ └─────────────────────────────────────────┘   │
│                                                 │
│ Delivery Location *                            │
│ ┌─────────────────────────────────────────┐   │
│ │ Voter Home                         ▼    │   │
│ └─────────────────────────────────────────┘   │
│                                                 │
│ Delivery Remarks *                             │
│ ┌─────────────────────────────────────────┐   │
│ │ Form filled and handed to voter at her  │   │
│ │ home. Family members present. Voter     │   │
│ │ confirmed receipt and signed            │   │
│ │ acknowledgment.                          │   │
│ └─────────────────────────────────────────┘   │
│                                                 │
│          [Cancel]    [Confirm & Save]          │
└─────────────────────────────────────────────────┘
```

### Step 2: Fill the Details

**Delivery Method:** Select from dropdown
- Hand Delivery ← (Already selected)
- Post
- Courier
- Email
- Online Portal
- Camp
- Other

**Delivery Location:** Select from dropdown
- Voter Home ← (Already selected)
- Booth Office
- Assembly Office
- Camp
- Other

**Delivery Remarks:** Type your notes (REQUIRED)
```
Form filled and handed to voter at her home. 
Family members present. Voter confirmed receipt 
and signed acknowledgment.
```

### Step 3: Click "Confirm & Save"

---

## ✅ Verify the Update

**Immediately After Saving:**

Scheme #2 card will update to show:

```
#1 ┌────────────────────────────────────────────────┐
   │ Scheme ID: 2          [Physically Delivered ✅]│
   │ Applied: 01-Aug-2026                           │
   │                                                 │
   │ ✅ Delivered: 04-Aug-2026 10:45 AM             │
   │ Delivered by: Booth Admin (booth_214_admin)    │
   │ Method: Hand Delivery                          │
   │ Location: Voter Home                           │
   │                                                 │
   │ Remarks: Form filled and handed to voter...    │
   │                                                 │
   │ ⏱️ Delivery Time: 3 days                       │
   │                                                 │
   │ [▼ History (2)]                                │
   └────────────────────────────────────────────────┘
```

**Summary Cards Update:**
- Total: 3
- Delivered: 2 ← (Was 1, now 2)
- Pending: 1 ← (Was 2, now 1)

**Other Schemes Unchanged:**
- Scheme #8: Still shows "Submitted" ✅
- Scheme #11: Still shows "Completed" ✅

---

## 🔍 Check Status History

1. Click **"▼ History (2)"** on Scheme #2
2. You'll see expanded history:

```
Status History
──────────────

Physically Delivered         04-Aug-2026 10:45 AM
by BOOTH_ADMIN (booth_214_admin)
Remarks: Form filled and handed to voter at her home...

Pending                      01-Aug-2026 08:00 AM
by User (Mahalakshmi Muthaiah)
Remarks: Application submitted via voter portal
```

---

## 🗄️ Verify in Database (Optional)

If you want to check the database directly:

### MongoDB Compass or Shell:
```javascript
// Connect to your MongoDB
// Database: bjp_nalam_thittam_db
// Collection: schemeapplications

// Find the updated application
db.schemeapplications.findOne({
  _id: ObjectId("6a6dc2331ff2006d844de08f")
})

// You should see:
{
  _id: ObjectId("6a6dc2331ff2006d844de08f"),
  schemeName: "2",
  status: "Physically Delivered",
  
  deliveryDetails: {
    deliveredBy: "booth_214_admin",
    deliveredByName: "Booth Admin",
    deliveredAt: ISODate("2026-08-04T05:15:00.000Z"),
    deliveryMethod: "Hand Delivery",
    deliveryLocation: "Voter Home",
    remarks: "Form filled and handed to voter..."
  },
  
  metrics: {
    daysToDeliver: 3,
    adminTouchpoints: 2
  },
  
  statusHistory: [
    {
      status: "Pending",
      remarks: "Application submitted via voter portal",
      updatedBy: "User (Mahalakshmi Muthaiah)",
      updatedAt: ISODate("2026-08-01T...")
    },
    {
      status: "Physically Delivered",
      remarks: "Form filled and handed to voter...",
      updatedBy: "BOOTH_ADMIN (booth_214_admin)",
      updatedAt: ISODate("2026-08-04T...")
    }
  ]
}
```

---

## 🎯 Test Other Features

### 1. Quick Status Updates

Instead of "Mark as Delivered", try:

**"📄 Need Docs" button:**
- Click it on Scheme #8
- Instantly updates to "Documents Required" status
- Adds remark: "Documents requested from voter"

**"🔄 In Progress" button:**
- Click it on any pending scheme
- Updates to "In Progress"
- Adds remark: "Processing application"

### 2. View History

- Click "▶ History" on any scheme
- See full timeline of status changes
- Each entry shows: Status, Date/Time, Updated By, Remarks

### 3. Multiple Schemes

- Update Scheme #8 separately
- Verify Scheme #2 remains unchanged
- Each scheme maintains independent status

---

## ✅ Success Criteria

You've successfully tested the feature if:

- ✅ You can see all 3 schemes listed separately
- ✅ You can update Scheme #2 to "Physically Delivered"
- ✅ Scheme #8 and #11 remain unchanged
- ✅ Delivery details are captured (who, when, how, where)
- ✅ Summary cards update correctly
- ✅ Status history shows the update
- ✅ Each scheme has independent status

---

## 🐛 Troubleshooting

### Issue 1: Can't find Mahalakshmi in the list
**Solution:**
- Check you're logged in as Booth 214 admin (or Super Admin)
- Try searching by mobile: `9940089442`
- Check the filters - clear all filters and search again

### Issue 2: "View" button doesn't open scheme details
**Solution:**
- Check browser console for errors (F12)
- Refresh the page
- Make sure frontend is running on correct port

### Issue 3: Modal doesn't open when clicking "Mark as Delivered"
**Solution:**
- Check browser console for JavaScript errors
- Verify the CSS files loaded correctly
- Try clearing browser cache

### Issue 4: Can't save delivery details
**Solution:**
- Make sure "Delivery Remarks" field is filled (it's required)
- Check backend console for API errors
- Verify backend is running on port 5000

### Issue 5: Other schemes are also getting updated
**Solution:**
- This shouldn't happen - each scheme has separate ID
- If it does happen, check the `handleUpdateAppStatus` function
- Verify the correct `app._id` is being sent

---

## 📞 Need Help?

If you encounter any issues:
1. Check backend console for errors
2. Check browser console (F12) for errors
3. Verify both servers are running
4. Check MongoDB connection

---

## 🎉 Congratulations!

You now have **individual scheme tracking** working! Each scheme can be:
- Updated independently
- Delivered at different times
- Tracked with full delivery details
- Monitored with complete audit trail

**This solves your original concern:** Different schemes have different delivery timelines, and now you can track each one separately with proper logging! ✅
