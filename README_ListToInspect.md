# ListToInspect Component - Firebase Integration

## Overview
The `ListToInspect.js` component has been enhanced with Firebase integration to automatically display applicants that need inspection based on municipality assignment.

## Features

### 1. Automatic Municipality Assignment
- The component automatically detects the logged-in staff member's municipality from the Firebase `staff` collection
- Staff members are automatically assigned to inspect applicants in their own municipality

### 2. Smart Applicant Filtering
- Fetches applicants from the `applicants` collection
- Only shows applicants with `inspectionStatus: 'pending'`
- Automatically filters by municipality to match the staff member's assignment

### 3. Real-time Data
- Uses Firebase authentication state to identify current user
- Automatically refreshes applicant list when user logs in
- Real-time updates when inspection status changes

## Firebase Collections Required

### Staff Collection (`staff`)
```javascript
{
  uid: "user_uid",
  userId: "12345", // numeric user ID
  email: "staff@example.com",
  municipality: "Municipality Name",
  // other staff fields...
}
```

### Applicants Collection (`applicants`)
```javascript
{
  fullName: "Applicant Name",
  age: "25",
  gender: "Male",
  address: "Complete Address",
  municipality: "Municipality Name",
  inspectionStatus: "pending", // or "completed"
  // other applicant fields...
}
```

### Inspections Collection (`inspections`)
```javascript
{
  applicantId: "applicant_doc_id",
  inspectorId: "staff_uid",
  inspectionDate: "timestamp",
  eligibilityCriteria: [true, false, true, ...],
  siteSuitability: [true, true, false, ...],
  remarks: "Inspection notes",
  image: "image_uri",
  status: "completed"
}
```

## How It Works

1. **User Authentication**: Component listens to Firebase auth state changes
2. **Municipality Detection**: Fetches staff profile to get municipality assignment
3. **Applicant Query**: Queries applicants collection for pending inspections in the same municipality
4. **List Display**: Shows filtered applicants with pending inspection status
5. **Inspection Process**: Staff can select an applicant and complete the inspection form
6. **Data Update**: Updates applicant status and saves inspection results to Firebase

## UI Components

### List View
- Header showing municipality and pending count
- Loading state with spinner
- Empty state when no pending inspections
- Applicant cards with avatar, name, age, gender, and address
- Status badges showing "Pending" status

### Inspection Form
- Pre-filled applicant information
- Eligibility criteria checkboxes
- Site suitability checkboxes
- Photo capture/upload functionality
- Remarks field for additional notes
- Submit button to save inspection

## Error Handling

- Graceful fallbacks for missing data
- User-friendly error messages
- Loading states for better UX
- Validation for required fields

## Dependencies

- Firebase Web SDK (v9+)
- React Native AsyncStorage
- Expo Image Picker
- React Native Vector Icons

## Usage

The component automatically handles:
- User authentication state
- Municipality-based filtering
- Real-time data updates
- Form submission and validation

No additional configuration is needed - just ensure the Firebase collections are properly set up with the required fields.
