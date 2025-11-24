# MFA Flow Testing Guide

## Overview
This guide provides step-by-step testing procedures for the Multi-Factor Authentication (MFA) implementation, including TOTP codes, backup codes, and AAL2 session elevation.

## Security Fix Applied
✅ **Fixed**: Backup codes now properly elevate sessions to AAL2 by calling `supabase.auth.mfa.challenge()` and `verify()` after validation.

---

## Test Scenarios

### 1. MFA Enrollment (Setup)

**Prerequisites:**
- User must be logged in
- User must NOT have MFA enabled yet

**Steps:**
1. Navigate to Profile page
2. Click "Configurar 2FA" (Configure 2FA)
3. Scan QR code with authenticator app (Google Authenticator, Authy, etc.)
   - OR copy the manual secret code
4. Enter the 6-digit code from your authenticator app
5. Click "Verificar e Ativar 2FA"

**Expected Results:**
- ✅ Backup codes dialog appears with 8 codes
- ✅ Success toast: "2FA ativado com sucesso!"
- ✅ Activity log entry: `mfa_enabled`
- ✅ User can copy or download backup codes

**Verify in Console:**
```
MFA enrollment successful
Backup codes generated
```

---

### 2. Login with TOTP Code (Primary Method)

**Prerequisites:**
- User account with MFA enabled
- User is logged out

**Steps:**
1. Navigate to `/auth`
2. Enter email and password
3. Click "Entrar"
4. MFA dialog should appear immediately
5. Open authenticator app and get current 6-digit code
6. Enter the code in the dialog
7. Click "Verificar"

**Expected Results:**
- ✅ Login successful after TOTP verification
- ✅ Success toast: "Login realizado com sucesso com 2FA!"
- ✅ User redirected to home page (`/`)
- ✅ Session AAL level = `aal2`
- ✅ Activity log entry: `login` with metadata `{ method: '2FA' }`
- ✅ ProtectedRoute allows access to protected pages

**Verify in Console:**
```
Login successful, checking MFA...
Factors: {...}
Active factor: {...}
MFA required! Showing dialog...
MFA Success!
Redirecting to home
```

**Verify in Network:**
- POST `/token` - Login with credentials (AAL1)
- POST `/factors/{id}/challenge` - MFA challenge
- POST `/factors/{id}/verify` - MFA verification (elevates to AAL2)

---

### 3. Login with Backup Code (Secondary Method)

**Prerequisites:**
- User account with MFA enabled
- User has saved backup codes
- User is logged out

**Steps:**
1. Navigate to `/auth`
2. Enter email and password
3. Click "Entrar"
4. MFA dialog appears
5. Click "Usar código de backup" link
6. Enter one of your 8-character backup codes (e.g., `ABCD-EFGH`)
7. Click "Verificar"

**Expected Results:**
- ✅ Backup code accepted (if unused)
- ✅ Session elevated to AAL2
- ✅ Success toast: "Login realizado com sucesso com 2FA!"
- ✅ User redirected to home page
- ✅ Backup code marked as `used_at` in database
- ✅ Activity log entry: `login` with metadata `{ method: '2FA' }`
- ✅ Additional activity log: `mfa_backup_code_used`
- ✅ ProtectedRoute allows access to protected pages

**Verify in Console:**
```
Login successful, checking MFA...
MFA required! Showing dialog...
MFA Success!
Redirecting to home
```

**Verify in Network:**
- POST `/token` - Login with credentials (AAL1)
- POST `/factors/{id}/challenge` - MFA challenge
- POST `/factors/{id}/verify` - MFA verification with backup code (elevates to AAL2)

**Database Verification:**
```sql
SELECT * FROM mfa_backup_codes 
WHERE user_id = '{user_id}' 
AND used_at IS NOT NULL;
-- Should show the used backup code with timestamp
```

---

### 4. ProtectedRoute AAL2 Validation

**Prerequisites:**
- User logged in with MFA-enabled account

**Test Case A: With AAL2 (Proper MFA)**
1. Complete login with TOTP or backup code
2. Try to access any protected route (e.g., `/profile`, `/cart`, `/my-orders`)

**Expected Results:**
- ✅ User can access all protected routes
- ✅ No redirect to `/auth`
- ✅ Session AAL = `aal2`

**Test Case B: With AAL1 Only (Should Block)**
1. Login with email/password
2. If MFA dialog appears, close/cancel it
3. Try to access protected route directly

**Expected Results:**
- ✅ User blocked from protected routes
- ✅ Redirected to `/auth`
- ✅ Session AAL = `aal1` (not sufficient)

**Verify in Console (ProtectedRoute):**
```
Auth check error: ...
// OR
Session validated, AAL2 confirmed
```

---

### 5. Invalid Code Handling

**Test Case A: Invalid TOTP Code**
1. Enter wrong 6-digit code

**Expected Results:**
- ✅ Error toast: "Código inválido"
- ✅ Code input cleared
- ✅ Dialog remains open
- ✅ User can retry

**Test Case B: Invalid Backup Code**
1. Click "Usar código de backup"
2. Enter wrong or already-used backup code

**Expected Results:**
- ✅ Error toast: "Código de backup inválido"
- ✅ Description: "O código está incorreto ou já foi usado"
- ✅ Code input cleared
- ✅ Dialog remains open

**Test Case C: Expired TOTP Code**
1. Wait for authenticator code to expire
2. Enter the expired code

**Expected Results:**
- ✅ Error toast: "Código inválido"
- ✅ User can enter new code

---

### 6. MFA Cancellation

**Steps:**
1. Login with email/password
2. MFA dialog appears
3. Click "Cancelar" button

**Expected Results:**
- ✅ User logged out immediately
- ✅ Info toast: "Login cancelado."
- ✅ Dialog closes
- ✅ User remains on `/auth` page
- ✅ Session terminated

**Verify in Console:**
```
MFA Cancelled
```

---

### 7. Session Persistence

**Test Case A: Page Refresh with AAL2**
1. Complete login with TOTP/backup code
2. Refresh the page

**Expected Results:**
- ✅ User remains logged in
- ✅ AAL2 maintained
- ✅ No MFA challenge required
- ✅ Access to protected routes

**Test Case B: New Tab with AAL2**
1. Login in one tab
2. Open protected route in new tab

**Expected Results:**
- ✅ User authenticated in both tabs
- ✅ AAL2 recognized
- ✅ No additional MFA challenge

---

## Critical Security Checkpoints

### ✅ AAL2 Elevation Verification

After each successful MFA verification (TOTP or backup code), verify:

```javascript
// Check session AAL level
const { data: { session } } = await supabase.auth.getSession();
console.log('Session AAL:', session?.aal);
// Should output: "aal2"
```

### ✅ ProtectedRoute Logic

The route should:
1. Allow access if no MFA enabled
2. Allow access if MFA enabled AND AAL = 'aal2'
3. Block access if MFA enabled AND AAL ≠ 'aal2'

### ✅ Backup Code Security

Verify that:
- Backup codes are hashed (SHA-256) in database
- Used backup codes have `used_at` timestamp
- Used backup codes cannot be reused
- Each backup code works only once

---

## Troubleshooting

### Issue: MFA dialog doesn't appear after login
**Check:**
- Console logs for "MFA required! Showing dialog..."
- Verify user has verified TOTP factor
- Check `mfaPendingRef.current` value

### Issue: Stuck in redirect loop
**Check:**
- Session AAL level
- ProtectedRoute logic
- Console for "Checking auth state" messages

### Issue: Backup code doesn't work
**Check:**
- Code hasn't been used before (`used_at IS NULL`)
- Code format is correct (with or without hyphen)
- Code hash matches database

### Issue: Can access protected routes without MFA
**Check:**
- Session AAL level (should be 'aal2')
- ProtectedRoute is wrapping the route
- MFA factors are verified

---

## Summary Checklist

- [ ] MFA enrollment works with QR code
- [ ] Backup codes generated and displayed
- [ ] TOTP code login works
- [ ] TOTP code elevates session to AAL2
- [ ] Backup code login works  
- [ ] Backup code elevates session to AAL2
- [ ] Used backup codes marked in database
- [ ] Invalid codes show proper errors
- [ ] MFA cancellation logs user out
- [ ] ProtectedRoute validates AAL2
- [ ] Session persists across page refresh
- [ ] Activity logs recorded correctly

---

## Developer Notes

**Files Modified for Security Fix:**
- `src/hooks/useMFA.ts` - Added AAL2 elevation to `verifyBackupCode()`
- `src/hooks/useActivityLogs.ts` - Added `mfa_backup_code_used` activity type

**Key Components:**
- `src/pages/Auth.tsx` - Login flow with MFA detection
- `src/components/MFAVerifyDialog.tsx` - TOTP and backup code entry
- `src/components/ProtectedRoute.tsx` - AAL2 validation
- `src/hooks/useMFA.ts` - MFA operations

**Database Tables:**
- `mfa_backup_codes` - Stores hashed backup codes
- `user_activity_logs` - Logs MFA events
