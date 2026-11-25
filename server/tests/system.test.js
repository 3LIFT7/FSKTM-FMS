process.env.PGLITE_DATA_DIR = 'memory://';
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test_super_secure_jwt_secret_key_for_automated_suite_2026';

const { test, describe, before, after } = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const crypto = require('node:crypto');

const app = require('../src/server');
const { seedDatabase } = require('../src/db/seed');
const { runMigrations } = require('../src/db/migrations');
const { query, withTransaction, closeDb } = require('../src/config/db');

let server;
let baseUrl;

function apiRequest(path, { method = 'GET', token = null, body = null, headers = {} } = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, baseUrl);
    const reqHeaders = { ...headers };
    if (token) {
      reqHeaders['Authorization'] = `Bearer ${token}`;
    }

    let payload = null;
    if (body !== null && !(body instanceof Buffer)) {
      payload = JSON.stringify(body);
      reqHeaders['Content-Type'] = 'application/json';
      reqHeaders['Content-Length'] = Buffer.byteLength(payload);
    } else if (body instanceof Buffer) {
      payload = body;
      reqHeaders['Content-Length'] = payload.length;
    }

    const req = http.request(
      url,
      {
        method,
        headers: reqHeaders,
      },
      (res) => {
        const chunks = [];
        res.on('data', (c) => chunks.push(c));
        res.on('end', () => {
          const text = Buffer.concat(chunks).toString('utf-8');
          let json = null;
          try {
            json = text ? JSON.parse(text) : null;
          } catch (_) {}
          resolve({
            status: res.statusCode,
            headers: res.headers,
            body: json,
            text,
          });
        });
      }
    );

    req.on('error', reject);
    if (payload) req.write(payload);
    req.end();
  });
}

function buildMultipart({ fieldName, filename, contentType, fileBuffer, fields = {} }) {
  const boundary = '----FSKTMTestBoundary' + crypto.randomBytes(8).toString('hex');
  const parts = [];

  for (const [k, v] of Object.entries(fields)) {
    parts.push(
      Buffer.from(
        `--${boundary}\r\nContent-Disposition: form-data; name="${k}"\r\n\r\n${v}\r\n`,
        'utf-8'
      )
    );
  }

  parts.push(
    Buffer.from(
      `--${boundary}\r\nContent-Disposition: form-data; name="${fieldName}"; filename="${filename}"\r\nContent-Type: ${contentType}\r\n\r\n`,
      'utf-8'
    )
  );
  parts.push(fileBuffer);
  parts.push(Buffer.from(`\r\n--${boundary}--\r\n`, 'utf-8'));

  return {
    contentType: `multipart/form-data; boundary=${boundary}`,
    buffer: Buffer.concat(parts),
  };
}

// Helper to get a future weekday YYYY-MM-DD
function getFutureDateStr(daysAhead = 5) {
  const d = new Date();
  d.setDate(d.getDate() + daysAhead);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

describe('FSKTM-FMS Comprehensive Automated Security & Workflow Test Suite', () => {
  let studentToken;
  let lecturerToken;
  let techToken;
  let managerToken;
  let studentUser;
  let lecturerUser;
  let techUser;
  let managerUser;

  before(async () => {
    await seedDatabase();
    // Run migrations a second time to verify idempotency on existing database
    await runMigrations();

    await new Promise((resolve) => {
      server = app.listen(0, () => {
        const addr = server.address();
        baseUrl = `http://127.0.0.1:${addr.port}`;
        resolve();
      });
    });
  });

  after(async () => {
    if (server) {
      await new Promise((resolve) => server.close(resolve));
    }
    await closeDb();
  });

  // =========================================================================
  // 1. AUTHENTICATION & AUTHORIZATION
  // =========================================================================
  describe('1. Authentication & Authorization Security', () => {
    test('Correct login succeeds for Demo Student, Lecturer, Technician, and Lab Manager', async () => {
      const sRes = await apiRequest('/api/auth/login', {
        method: 'POST',
        body: { email: 'AI230182@student.uthm.edu.my', password: 'Student123!', portal: 'student' },
      });
      assert.equal(sRes.status, 200);
      assert.equal(sRes.body.user.role, 'student');
      studentToken = sRes.body.token;
      studentUser = sRes.body.user;

      const lRes = await apiRequest('/api/auth/login', {
        method: 'POST',
        body: { email: 'norasri@uthm.edu.my', password: 'Lecturer123!', portal: 'lecturer' },
      });
      assert.equal(lRes.status, 200);
      assert.equal(lRes.body.user.role, 'lecturer');
      lecturerToken = lRes.body.token;
      lecturerUser = lRes.body.user;

      const tRes = await apiRequest('/api/auth/login', {
        method: 'POST',
        body: { email: 'technician@fsktm.um.edu.my', password: 'Tech123!', portal: 'staff' },
      });
      assert.equal(tRes.status, 200);
      assert.equal(tRes.body.user.role, 'technician');
      techToken = tRes.body.token;
      techUser = tRes.body.user;

      const mRes = await apiRequest('/api/auth/login', {
        method: 'POST',
        body: { email: 'manager@fsktm.um.edu.my', password: 'Manager123!', portal: 'staff' },
      });
      assert.equal(mRes.status, 200);
      assert.equal(mRes.body.user.role, 'manager');
      managerToken = mRes.body.token;
      managerUser = mRes.body.user;
    });

    test('Incorrect password and legacy matric-as-password bypasses are strictly rejected', async () => {
      const wrongPass = await apiRequest('/api/auth/login', {
        method: 'POST',
        body: { email: 'AI230182@student.uthm.edu.my', password: 'WrongPassword999!' },
      });
      assert.equal(wrongPass.status, 401);

      const matricAsPass = await apiRequest('/api/auth/login', {
        method: 'POST',
        body: { email: 'AI230182@student.uthm.edu.my', password: 'AI230182' },
      });
      assert.equal(matricAsPass.status, 401);
    });

    test('First-time password setup flow works securely and blocks arbitrary login before setup', async () => {
      await query(
        `INSERT INTO users (name, email, password_hash, role, matric_or_staff_id, department, specialization, auth_provider, password_set)
         VALUES ('First Login Student', 'AI240999@student.uthm.edu.my', 'unusable_hash', 'student', 'AI240999', 'FSKTM', 'BIW', 'google', FALSE)`
      );

      // Attempting normal login with an arbitrary 6+ char password must be rejected
      const attemptLogin = await apiRequest('/api/auth/login', {
        method: 'POST',
        body: { email: 'AI240999@student.uthm.edu.my', password: 'AnyRandomPassword123' },
      });
      assert.equal(attemptLogin.status, 403);
      assert.equal(attemptLogin.body.code, 'PASSWORD_SETUP_REQUIRED');

      // Explicit first-time password setup with matching email & matric ID succeeds
      const setupRes = await apiRequest('/api/auth/setup-password', {
        method: 'POST',
        body: {
          email: 'AI240999@student.uthm.edu.my',
          matric_or_staff_id: 'AI240999',
          new_password: 'MySecureFirstPass!2026',
        },
      });
      assert.equal(setupRes.status, 200);
      assert.equal(setupRes.body.success, true);

      // Subsequent login with the configured password succeeds
      const validLogin = await apiRequest('/api/auth/login', {
        method: 'POST',
        body: { email: 'AI240999@student.uthm.edu.my', password: 'MySecureFirstPass!2026', portal: 'student' },
      });
      assert.equal(validLogin.status, 200);
    });

    test('Google login rejects invalid tokens and wrong email domains', async () => {
      const invalidTokenRes = await apiRequest('/api/auth/google', {
        method: 'POST',
        body: { credential: 'invalid.jwt.token' },
      });
      assert.equal(invalidTokenRes.status, 401);

      const { validateUniversityEmail } = require('../src/controllers/authController');
      const wrongDomain = validateUniversityEmail('someone@gmail.com');
      assert.equal(wrongDomain.valid, false);

      const validStudentDomain = validateUniversityEmail('AI230182@student.uthm.edu.my');
      assert.equal(validStudentDomain.valid, true);
      assert.equal(validStudentDomain.role, 'student');
    });

    test('Password reset does not leak tokens in API response and resets password with valid token', async () => {
      const forgotUnknown = await apiRequest('/api/auth/forgot-password', {
        method: 'POST',
        body: { email: 'nonexistent_user@uthm.edu.my' },
      });
      assert.equal(forgotUnknown.status, 200);
      assert.equal(forgotUnknown.body.stub_token, undefined);

      const forgotKnown = await apiRequest('/api/auth/forgot-password', {
        method: 'POST',
        body: { email: 'AI240999@student.uthm.edu.my' },
      });
      assert.equal(forgotKnown.status, 200);
      assert.equal(forgotKnown.body.stub_token, undefined);
      assert.equal(forgotKnown.body.message, forgotUnknown.body.message);

      // Simulate setting a known reset token hash in DB and resetting password
      const rawResetToken = 'test_reset_token_secret_1234567890';
      const tokenHash = crypto.createHash('sha256').update(rawResetToken).digest('hex');
      await query(
        `UPDATE users SET reset_token_hash = $1, reset_token_expires = CURRENT_TIMESTAMP + INTERVAL '1 hour'
         WHERE email = 'AI240999@student.uthm.edu.my'`,
        [tokenHash]
      );

      const resetRes = await apiRequest('/api/auth/reset-password', {
        method: 'POST',
        body: { token: rawResetToken, new_password: 'ResetPassConfirmed!99' },
      });
      assert.equal(resetRes.status, 200);

      // Verify old token cannot be reused
      const reuseRes = await apiRequest('/api/auth/reset-password', {
        method: 'POST',
        body: { token: rawResetToken, new_password: 'AnotherPassword!99' },
      });
      assert.equal(reuseRes.status, 400);

      // Verify login with new password works
      const loginAfterReset = await apiRequest('/api/auth/login', {
        method: 'POST',
        body: { email: 'AI240999@student.uthm.edu.my', password: 'ResetPassConfirmed!99' },
      });
      assert.equal(loginAfterReset.status, 200);
    });

    test('Role-based authorization prevents privilege escalation and deleted user tokens are invalidated immediately', async () => {
      // Student cannot access manager or technician endpoints
      const studentToAdmin = await apiRequest('/api/admin/users', { token: studentToken });
      assert.equal(studentToAdmin.status, 403);

      const studentCreateDevice = await apiRequest('/api/devices', {
        method: 'POST',
        token: studentToken,
        body: { name: 'Hack Device', serial_number: 'HACK-001' },
      });
      assert.equal(studentCreateDevice.status, 403);

      // Lecturer cannot access technician/manager inventory creation
      const lecturerCreateDevice = await apiRequest('/api/devices', {
        method: 'POST',
        token: lecturerToken,
        body: { name: 'Lec Device', serial_number: 'LEC-001' },
      });
      assert.equal(lecturerCreateDevice.status, 403);

      // Technician cannot access manager-only settings or user management
      const techToAdmin = await apiRequest('/api/admin/users', { token: techToken });
      assert.equal(techToAdmin.status, 403);

      const techUpdateSettings = await apiRequest('/api/settings', {
        method: 'PATCH',
        token: techToken,
        body: { settings: { max_booking_duration_hours: '6' } },
      });
      assert.equal(techUpdateSettings.status, 403);

      // Create a temporary user via manager, log them in, then delete them and verify their JWT is rejected
      const createTemp = await apiRequest('/api/admin/users', {
        method: 'POST',
        token: managerToken,
        body: {
          name: 'Temp Staff',
          email: 'tempstaff@uthm.edu.my',
          password: 'TempPassword123!',
          role: 'technician',
          matric_or_staff_id: 'T-9999',
        },
      });
      assert.equal(createTemp.status, 201);
      const tempUserId = createTemp.body.user.user_id;

      const tempLogin = await apiRequest('/api/auth/login', {
        method: 'POST',
        body: { email: 'tempstaff@uthm.edu.my', password: 'TempPassword123!' },
      });
      assert.equal(tempLogin.status, 200);
      const tempToken = tempLogin.body.token;

      // Change role from technician -> lecturer and verify technician endpoint immediately rejects old JWT
      const roleChange = await apiRequest(`/api/admin/users/${tempUserId}/role`, {
        method: 'PATCH',
        token: managerToken,
        body: { role: 'lecturer' },
      });
      assert.equal(roleChange.status, 200);

      const afterRoleChange = await apiRequest('/api/devices', {
        method: 'POST',
        token: tempToken,
        body: { name: 'Should Fail', serial_number: 'FAIL-999' },
      });
      assert.equal(afterRoleChange.status, 403);

      // Delete user and verify old JWT is rejected with 401 USER_NOT_FOUND
      const delRes = await apiRequest(`/api/admin/users/${tempUserId}`, {
        method: 'DELETE',
        token: managerToken,
      });
      assert.equal(delRes.status, 200);

      const reuseDeletedToken = await apiRequest('/api/auth/me', { token: tempToken });
      assert.equal(reuseDeletedToken.status, 401);
      assert.equal(reuseDeletedToken.body.code, 'USER_NOT_FOUND');
    });
  });

  // =========================================================================
  // 2. ROOM BOOKINGS & CONCURRENCY
  // =========================================================================
  describe('2. Room Bookings, Settings Enforcement & Concurrency', () => {
    let availableLabId;

    before(async () => {
      const locRes = await query("SELECT location_id FROM locations WHERE code = 'MGA' AND status = 'available' LIMIT 1");
      availableLabId = locRes.rows[0].location_id;
    });

    test('Enforces operating hours, max duration, and valid date range', async () => {
      // Ensure settings: 08:00 - 20:00, max 4 hours
      const setRes = await apiRequest('/api/settings', {
        method: 'PATCH',
        token: managerToken,
        body: {
          settings: {
            operating_hours_start: '08:00',
            operating_hours_end: '20:00',
            max_booking_duration_hours: '4',
            device_booking_requires_approval: 'true',
          },
        },
      });
      assert.equal(setRes.status, 200);

      // Rejects arbitrary setting keys
      const badKeyRes = await apiRequest('/api/settings', {
        method: 'PATCH',
        token: managerToken,
        body: { settings: { arbitrary_hack_key: '123' } },
      });
      assert.equal(badKeyRes.status, 400);

      const dateStr = getFutureDateStr(10);

      // 1. Invalid date range (end <= start)
      const invalidRange = await apiRequest('/api/bookings', {
        method: 'POST',
        token: studentToken,
        body: {
          location_id: availableLabId,
          start_time: `${dateStr}T14:00:00`,
          end_time: `${dateStr}T12:00:00`,
          purpose: 'Invalid Time Test',
          course_id: 'BIW10103',
          course_name: 'Programming',
        },
      });
      assert.equal(invalidRange.status, 400);

      // 2. Outside operating hours (06:00 - 08:00)
      const outsideHours = await apiRequest('/api/bookings', {
        method: 'POST',
        token: studentToken,
        body: {
          location_id: availableLabId,
          start_time: `${dateStr}T06:00:00`,
          end_time: `${dateStr}T08:00:00`,
          purpose: 'Early Morning Test',
          course_id: 'BIW10103',
          course_name: 'Programming',
        },
      });
      assert.equal(outsideHours.status, 400);
      assert.equal(outsideHours.body.code, 'OUTSIDE_OPERATING_HOURS');

      // 3. Exceeding max duration (5 hours > 4 hours max)
      const tooLong = await apiRequest('/api/bookings', {
        method: 'POST',
        token: studentToken,
        body: {
          location_id: availableLabId,
          start_time: `${dateStr}T09:00:00`,
          end_time: `${dateStr}T14:00:00`,
          purpose: '5 Hour Marathon',
          course_id: 'BIW10103',
          course_name: 'Programming',
        },
      });
      assert.equal(tooLong.status, 400);
      assert.equal(tooLong.body.code, 'MAX_DURATION_EXCEEDED');
    });

    test('Valid booking, conflict detection, and simultaneous concurrent booking protection', async () => {
      const dateStr = getFutureDateStr(12);

      // Simultaneous requests for the exact same room and time window
      const payload1 = {
        location_id: availableLabId,
        start_time: `${dateStr}T10:00:00`,
        end_time: `${dateStr}T12:00:00`,
        purpose: 'Concurrent Booking A',
        course_id: 'BIC21404',
        course_name: 'Software Design',
      };
      const payload2 = {
        location_id: availableLabId,
        start_time: `${dateStr}T10:00:00`,
        end_time: `${dateStr}T12:00:00`,
        purpose: 'Concurrent Booking B',
        course_id: 'BIW30103',
        course_name: 'Web Development',
      };

      const [res1, res2] = await Promise.all([
        apiRequest('/api/bookings', { method: 'POST', token: studentToken, body: payload1 }),
        apiRequest('/api/bookings', { method: 'POST', token: lecturerToken, body: payload2 }),
      ]);

      const statuses = [res1.status, res2.status].sort();
      assert.deepEqual(statuses, [201, 409], `Expected one 201 and one 409, got ${statuses}`);
    });

    test('Recurring booking creation, pause/reactivate without self-approval, and staff approval', async () => {
      const dateStr = getFutureDateStr(15);

      const recRes = await apiRequest('/api/bookings', {
        method: 'POST',
        token: lecturerToken,
        body: {
          location_id: availableLabId,
          start_time: `${dateStr}T14:00:00`,
          end_time: `${dateStr}T16:00:00`,
          purpose: 'Weekly AI Lab',
          course_id: 'BIP30203',
          course_name: 'Machine Learning',
          is_recurring: true,
          weeks: 3,
        },
      });
      assert.equal(recRes.status, 201);
      assert.equal(recRes.body.bookings.length, 3);
      assert.equal(recRes.body.status, 'pending');
      const groupId = recRes.body.recurrence_group_id;
      const firstBookingId = recRes.body.bookings[0].booking_id;

      // Pause the pending recurring series
      const pauseRes = await apiRequest(`/api/bookings/recurring/${groupId}/status`, {
        method: 'PATCH',
        token: lecturerToken,
        body: { action: 'pause' },
      });
      assert.equal(pauseRes.status, 200);

      // Reactivate the unapproved series as lecturer -> MUST remain 'pending', NOT self-approved!
      const reactivateRes = await apiRequest(`/api/bookings/recurring/${groupId}/status`, {
        method: 'PATCH',
        token: lecturerToken,
        body: { action: 'activate' },
      });
      assert.equal(reactivateRes.status, 200);

      const checkDbStatus = await query(
        'SELECT status, approved_by FROM location_bookings WHERE recurrence_group_id = $1',
        [groupId]
      );
      for (const row of checkDbStatus.rows) {
        assert.equal(row.status, 'pending', 'Reactivated unapproved series must remain pending');
        assert.equal(row.approved_by, null);
      }

      // Student cannot approve or cancel lecturer's booking
      const unauthApprove = await apiRequest(`/api/bookings/${firstBookingId}/status`, {
        method: 'PATCH',
        token: studentToken,
        body: { action: 'approve' },
      });
      assert.equal(unauthApprove.status, 403);

      const unauthCancel = await apiRequest(`/api/bookings/${firstBookingId}`, {
        method: 'DELETE',
        token: studentToken,
      });
      assert.equal(unauthCancel.status, 403);

      // Technician approves the recurring series
      const techApprove = await apiRequest(`/api/bookings/${firstBookingId}/status`, {
        method: 'PATCH',
        token: techToken,
        body: { action: 'approve' },
      });
      assert.equal(techApprove.status, 200);
      assert.equal(techApprove.body.count, 3);
    });
  });

  // =========================================================================
  // 3. DEVICE LOANS & RATING CONSISTENCY
  // =========================================================================
  describe('3. Device Loan State Machine, Concurrency & Ratings', () => {
    let loanableDeviceId;
    let fixedDeviceId;
    let maintenanceDeviceId;

    before(async () => {
      const loanableRes = await query(
        "SELECT device_id FROM devices WHERE serial_number = 'GMB-DJI-RS3P' AND status = 'available' LIMIT 1"
      );
      loanableDeviceId = loanableRes.rows[0].device_id;

      const fixedRes = await query(
        "SELECT device_id FROM devices WHERE is_loanable = FALSE LIMIT 1"
      );
      fixedDeviceId = fixedRes.rows[0].device_id;

      const maintRes = await query(
        "SELECT device_id FROM devices WHERE status = 'maintenance' LIMIT 1"
      );
      maintenanceDeviceId = maintRes.rows[0].device_id;
    });

    test('Rejects invalid device, fixed lab device, and maintenance device', async () => {
      const futureReturn = new Date(Date.now() + 48 * 3600 * 1000).toISOString();

      const notFound = await apiRequest('/api/device-loans', {
        method: 'POST',
        token: lecturerToken,
        body: { device_id: 999999, expected_return_time: futureReturn, purpose: 'Test' },
      });
      assert.equal(notFound.status, 404);

      const fixedAttempt = await apiRequest('/api/device-loans', {
        method: 'POST',
        token: lecturerToken,
        body: { device_id: fixedDeviceId, expected_return_time: futureReturn, purpose: 'Test Fixed' },
      });
      assert.equal(fixedAttempt.status, 403);

      const maintAttempt = await apiRequest('/api/device-loans', {
        method: 'POST',
        token: lecturerToken,
        body: { device_id: maintenanceDeviceId, expected_return_time: futureReturn, purpose: 'Test Maint' },
      });
      assert.equal(maintAttempt.status, 400);
    });

    test('Allows multiple users to request the same available device, prevents duplicate active approvals, and persists ratings', async () => {
      const futureReturn = new Date(Date.now() + 72 * 3600 * 1000).toISOString();

      // Two different borrowers requesting the same available physical device simultaneously both succeed (pending queue)
      const [loanReq1, loanReq2] = await Promise.all([
        apiRequest('/api/device-loans', {
          method: 'POST',
          token: studentToken,
          body: {
            device_id: loanableDeviceId,
            expected_return_time: futureReturn,
            purpose: 'FYP Video Recording',
            lecturer_approver_id: lecturerUser.user_id,
            selected_accessories: ['BG30 Battery Grip'],
          },
        }),
        apiRequest('/api/device-loans', {
          method: 'POST',
          token: lecturerToken,
          body: {
            device_id: loanableDeviceId,
            expected_return_time: futureReturn,
            purpose: 'Competing Request',
          },
        }),
      ]);

      assert.equal(loanReq1.status, 201);
      assert.equal(loanReq2.status, 201);

      // Same user submitting a duplicate pending request for the same device is blocked with 409
      const duplicateSameUser = await apiRequest('/api/device-loans', {
        method: 'POST',
        token: lecturerToken,
        body: {
          device_id: loanableDeviceId,
          expected_return_time: futureReturn,
          purpose: 'Duplicate Request By Same User',
        },
      });
      assert.equal(duplicateSameUser.status, 409);

      const loanId = loanReq1.body.loan.loan_id;
      const competingLoanId = loanReq2.body.loan.loan_id;

      // Student request must be approved by lecturer first before technician can approve
      const stuApprove = await apiRequest(`/api/device-loans/${loanId}/status`, {
        method: 'PATCH',
        token: studentToken,
        body: { action: 'lecturer_approve' },
      });
      assert.equal(stuApprove.status, 403);

      const lecApprove = await apiRequest(`/api/device-loans/${loanId}/status`, {
        method: 'PATCH',
        token: lecturerToken,
        body: { action: 'lecturer_approve' },
      });
      assert.equal(lecApprove.status, 200);

      // Technician approves the chosen request (loanId) with pickup location
      const techApprove = await apiRequest(`/api/device-loans/${loanId}/status`, {
        method: 'PATCH',
        token: techToken,
        body: { action: 'approve', pickup_location: 'FSKTM Counter Level 1' },
      });
      assert.equal(techApprove.status, 200);

      // Attempting to approve the second competing request while the first is already approved is blocked with 409
      const techApproveCompeting = await apiRequest(`/api/device-loans/${competingLoanId}/status`, {
        method: 'PATCH',
        token: techToken,
        body: { action: 'approve', pickup_location: 'FSKTM Counter Level 1' },
      });
      assert.equal(techApproveCompeting.status, 409);

      // Technician rejects the competing request
      const techRejectCompeting = await apiRequest(`/api/device-loans/${competingLoanId}/status`, {
        method: 'PATCH',
        token: techToken,
        body: { action: 'reject' },
      });
      assert.equal(techRejectCompeting.status, 200);

      // First checkout succeeds
      const checkout1 = await apiRequest(`/api/device-loans/${loanId}/status`, {
        method: 'PATCH',
        token: techToken,
        body: { action: 'checkout' },
      });
      assert.equal(checkout1.status, 200);

      // Double checkout is blocked with 409
      const checkout2 = await apiRequest(`/api/device-loans/${loanId}/status`, {
        method: 'PATCH',
        token: techToken,
        body: { action: 'checkout' },
      });
      assert.equal(checkout2.status, 409);

      // Return device with rating & notes
      const return1 = await apiRequest(`/api/device-loans/${loanId}/status`, {
        method: 'PATCH',
        token: techToken,
        body: {
          action: 'return',
          return_rating: 5,
          return_condition: 'Excellent',
          return_notes: 'Returned in spotless condition with battery grip.',
        },
      });
      assert.equal(return1.status, 200);

      // Duplicate return attempt is rejected with 400
      const return2 = await apiRequest(`/api/device-loans/${loanId}/status`, {
        method: 'PATCH',
        token: techToken,
        body: { action: 'return' },
      });
      assert.equal(return2.status, 400);

      // Update rating & review via POST /api/device-loans/:id/rating
      const rateUpdate = await apiRequest(`/api/device-loans/${loanId}/rating`, {
        method: 'POST',
        token: managerToken,
        body: {
          rating: 4,
          return_condition: 'Good',
          review: 'Updated inspection note: minor wear on carrying case.',
        },
      });
      assert.equal(rateUpdate.status, 200);
      assert.equal(rateUpdate.body.loan.return_rating, 4);
      assert.equal(rateUpdate.body.loan.device_rating, 4);
      assert.equal(rateUpdate.body.loan.return_notes, 'Updated inspection note: minor wear on carrying case.');
      assert.equal(rateUpdate.body.loan.device_review, 'Updated inspection note: minor wear on carrying case.');

      // Verify device details show rating & history to staff, but hide both from students
      const staffDevView = await apiRequest(`/api/devices/${loanableDeviceId}`, { token: techToken });
      assert.equal(staffDevView.status, 200);
      assert.equal(staffDevView.body.device.avg_rating, 4);
      assert.ok(staffDevView.body.device.loan_history.length >= 1);

      const studentDevView = await apiRequest(`/api/devices/${loanableDeviceId}`, { token: studentToken });
      assert.equal(studentDevView.status, 200);
      assert.equal(studentDevView.body.device.avg_rating, null);
      assert.equal(studentDevView.body.device.loan_history.length, 0);
    });

    test('Returning a damaged device marks the device status as maintenance', async () => {
      const futureReturn = new Date(Date.now() + 72 * 3600 * 1000).toISOString();
      const reqLoan = await apiRequest('/api/device-loans', {
        method: 'POST',
        token: lecturerToken,
        body: {
          device_id: loanableDeviceId,
          expected_return_time: futureReturn,
          purpose: 'Outdoor Shoot',
        },
      });
      assert.equal(reqLoan.status, 201);
      const loanId = reqLoan.body.loan.loan_id;

      await apiRequest(`/api/device-loans/${loanId}/status`, {
        method: 'PATCH',
        token: techToken,
        body: { action: 'approve', pickup_location: 'Counter A' },
      });
      await apiRequest(`/api/device-loans/${loanId}/status`, {
        method: 'PATCH',
        token: techToken,
        body: { action: 'checkout' },
      });

      const damagedReturn = await apiRequest(`/api/device-loans/${loanId}/status`, {
        method: 'PATCH',
        token: techToken,
        body: {
          action: 'return',
          return_rating: 1,
          return_condition: 'Damaged',
          return_notes: 'Motor axis needs calibration.',
        },
      });
      assert.equal(damagedReturn.status, 200);

      const devStatusRes = await query('SELECT status FROM devices WHERE device_id = $1', [loanableDeviceId]);
      assert.equal(devStatusRes.rows[0].status, 'maintenance');
    });
  });

  // =========================================================================
  // 4. QR ATTENDANCE VERIFICATION
  // =========================================================================
  describe('4. Faculty QR Attendance System', () => {
    let roomMgaId;

    before(async () => {
      const locRes = await query("SELECT location_id FROM locations WHERE code = 'MGA' LIMIT 1");
      roomMgaId = locRes.rows[0].location_id;
    });

    test('Blocks pending booking check-in, unauthorized user, wrong room QR, early check-in, late check-in, duplicate check-in, and tracks missed attendance', async () => {
      const now = new Date();

      // 1. Pending booking check-in attempt must fail and NOT approve the booking
      const pendingInsert = await query(
        `INSERT INTO location_bookings (location_id, user_id, start_time, end_time, purpose, course_id, course_name, status)
         VALUES ($1, $2, $3, $4, 'Pending Class', 'BIC10001', 'Pending Course', 'pending')
         RETURNING booking_id`,
        [
          roomMgaId,
          lecturerUser.user_id,
          new Date(now.getTime() - 5 * 60000).toISOString(),
          new Date(now.getTime() + 55 * 60000).toISOString(),
        ]
      );
      const pendingBookingId = pendingInsert.rows[0].booking_id;

      const pendingCheckIn = await apiRequest('/api/lab-usage/qr-checkin', {
        method: 'POST',
        token: lecturerToken,
        body: { booking_id: pendingBookingId, code: 'MGA' },
      });
      assert.equal(pendingCheckIn.status, 400);
      assert.equal(pendingCheckIn.body.code, 'BOOKING_NOT_APPROVED');

      const verifyStillPending = await query('SELECT status FROM location_bookings WHERE booking_id = $1', [
        pendingBookingId,
      ]);
      assert.equal(verifyStillPending.rows[0].status, 'pending');

      // 2. Approved booking currently within On-Time window (started 5 mins ago)
      const onTimeInsert = await query(
        `INSERT INTO location_bookings (location_id, user_id, start_time, end_time, purpose, course_id, course_name, status)
         VALUES ($1, $2, $3, $4, 'On Time Lecture', 'BIC20002', 'Software Engineering', 'approved')
         RETURNING booking_id`,
        [
          roomMgaId,
          lecturerUser.user_id,
          new Date(now.getTime() - 5 * 60000).toISOString(),
          new Date(now.getTime() + 55 * 60000).toISOString(),
        ]
      );
      const onTimeBookingId = onTimeInsert.rows[0].booking_id;

      // Student cannot check in
      const studentCheckin = await apiRequest('/api/lab-usage/qr-checkin', {
        method: 'POST',
        token: studentToken,
        body: { booking_id: onTimeBookingId, code: 'MGA' },
      });
      assert.equal(studentCheckin.status, 403);

      // Wrong room QR code rejected
      const wrongRoom = await apiRequest('/api/lab-usage/qr-checkin', {
        method: 'POST',
        token: lecturerToken,
        body: { booking_id: onTimeBookingId, code: 'SAV' },
      });
      assert.equal(wrongRoom.status, 400);
      assert.equal(wrongRoom.body.code, 'WRONG_ROOM_QR');

      // Valid QR check-in succeeds with on_time
      const validCheckin = await apiRequest('/api/lab-usage/qr-checkin', {
        method: 'POST',
        token: lecturerToken,
        body: { booking_id: onTimeBookingId, code: 'MGA', notes: 'Covered Chapter 4 UML' },
      });
      assert.equal(validCheckin.status, 200);
      assert.equal(validCheckin.body.attendance_status, 'on_time');

      // Duplicate check-in is blocked with 409
      const dupCheckin = await apiRequest('/api/lab-usage/qr-checkin', {
        method: 'POST',
        token: lecturerToken,
        body: { booking_id: onTimeBookingId, code: 'MGA' },
      });
      assert.equal(dupCheckin.status, 409);
      assert.equal(dupCheckin.body.code, 'DUPLICATE_CHECKIN');

      // 3. Early check-in (starts 60 mins from now) -> rejected with TOO_EARLY
      const earlyInsert = await query(
        `INSERT INTO location_bookings (location_id, user_id, start_time, end_time, purpose, course_id, course_name, status)
         VALUES ($1, $2, $3, $4, 'Future Lecture', 'BIC30003', 'Future Course', 'approved')
         RETURNING booking_id`,
        [
          roomMgaId,
          lecturerUser.user_id,
          new Date(now.getTime() + 60 * 60000).toISOString(),
          new Date(now.getTime() + 120 * 60000).toISOString(),
        ]
      );
      const earlyRes = await apiRequest('/api/lab-usage/qr-checkin', {
        method: 'POST',
        token: lecturerToken,
        body: { booking_id: earlyInsert.rows[0].booking_id, code: 'MGA' },
      });
      assert.equal(earlyRes.status, 400);
      assert.equal(earlyRes.body.code, 'TOO_EARLY');

      // 4. Late check-in (started 25 mins ago, ends in 35 mins) -> succeeds with 'late'
      const lateInsert = await query(
        `INSERT INTO location_bookings (location_id, user_id, start_time, end_time, purpose, course_id, course_name, status)
         VALUES ($1, $2, $3, $4, 'Late Lecture', 'BIC40004', 'Late Course', 'approved')
         RETURNING booking_id`,
        [
          roomMgaId,
          lecturerUser.user_id,
          new Date(now.getTime() - 25 * 60000).toISOString(),
          new Date(now.getTime() + 35 * 60000).toISOString(),
        ]
      );
      const lateRes = await apiRequest('/api/lab-usage/qr-checkin', {
        method: 'POST',
        token: lecturerToken,
        body: { booking_id: lateInsert.rows[0].booking_id, code: 'MGA' },
      });
      assert.equal(lateRes.status, 200);
      assert.equal(lateRes.body.attendance_status, 'late');
      assert.ok(lateRes.body.late_minutes >= 20);

      // 5. Missed attendance (ended 30 mins ago without check-in)
      const missedInsert = await query(
        `INSERT INTO location_bookings (location_id, user_id, start_time, end_time, purpose, course_id, course_name, status)
         VALUES ($1, $2, $3, $4, 'Missed Lecture', 'BIC50005', 'Missed Course', 'approved')
         RETURNING booking_id`,
        [
          roomMgaId,
          lecturerUser.user_id,
          new Date(now.getTime() - 90 * 60000).toISOString(),
          new Date(now.getTime() - 30 * 60000).toISOString(),
        ]
      );
      const missedCheckinAttempt = await apiRequest('/api/lab-usage/qr-checkin', {
        method: 'POST',
        token: lecturerToken,
        body: { booking_id: missedInsert.rows[0].booking_id, code: 'MGA' },
      });
      assert.equal(missedCheckinAttempt.status, 400);
      assert.equal(missedCheckinAttempt.body.code, 'WINDOW_CLOSED');

      // Verify Lab Manager sees on_time, late, and missed in LOG REKOD PENGGUNAAN MAKMAL
      const mgrLogs = await apiRequest('/api/lab-usage', { token: managerToken });
      assert.equal(mgrLogs.status, 200);
      const missedLog = mgrLogs.body.logs.find((l) => Number(l.booking_id) === Number(missedInsert.rows[0].booking_id));
      assert.ok(missedLog);
      assert.equal(missedLog.attendance_status, 'missed');
    });
  });

  // =========================================================================
  // 5. DATABASE INTEGRITY & TRANSACTION ROLLBACKS
  // =========================================================================
  describe('5. Database Constraints & Atomic Transaction Rollback', () => {
    test('Rejects duplicate room codes, invalid booking time constraint, and rolls back failed transactions cleanly', async () => {
      // Duplicate location code rejected
      const dupLoc = await apiRequest('/api/locations', {
        method: 'POST',
        token: managerToken,
        body: { code: 'MGA', name: 'Duplicate MGA', floor: 'Ground', capacity: 30 },
      });
      assert.equal(dupLoc.status, 400);

      // DB check constraint prevents end_time <= start_time on direct SQL insert
      await assert.rejects(async () => {
        await query(
          `INSERT INTO location_bookings (location_id, user_id, start_time, end_time, purpose, status)
           VALUES (1, 1, '2026-11-25T12:00:00Z', '2026-11-25T10:00:00Z', 'Bad SQL Time', 'pending')`
        );
      });

      // Transaction rollback verification: insert a location inside a failing transaction and verify it rolled back
      const countBefore = (await query('SELECT COUNT(*)::int AS cnt FROM locations')).rows[0].cnt;
      await assert.rejects(async () => {
        await withTransaction(async (tx) => {
          await tx.query(
            `INSERT INTO locations (code, name, floor, capacity, status)
             VALUES ('ROLLBACK-RM', 'Rollback Test Room', 'Ground', 20, 'available')`
          );
          throw new Error('Intentional transaction abort');
        });
      });
      const countAfter = (await query('SELECT COUNT(*)::int AS cnt FROM locations')).rows[0].cnt;
      assert.equal(countAfter, countBefore, 'Transaction rollback must undo all writes inside the failed transaction');
    });
  });

  // =========================================================================
  // 6. PUBLIC ACCESS & FILE UPLOAD SECURITY
  // =========================================================================
  describe('6. Public Data Exposure Prevention & File Upload Magic-Byte Validation', () => {
    test('Public calendar, room details, and QR feedback endpoints strip personal user information', async () => {
      // 1. Unauthenticated GET /api/bookings hides user_email, matric_or_staff_id, user_id, lecturer_name
      const pubBookings = await apiRequest('/api/bookings');
      assert.equal(pubBookings.status, 200);
      assert.ok(pubBookings.body.bookings.length > 0);
      for (const b of pubBookings.body.bookings) {
        assert.equal(b.user_email, undefined);
        assert.equal(b.matric_or_staff_id, undefined);
        assert.equal(b.user_id, undefined);
        assert.equal(b.lecturer_name, undefined);
      }

      // 2. Unauthenticated GET /api/feedback/location/MGA works for QR portal but hides private user emails/IDs
      const pubFeedback = await apiRequest('/api/feedback/location/MGA');
      assert.equal(pubFeedback.status, 200);
      assert.equal(pubFeedback.body.location.code, 'MGA');
      for (const b of pubFeedback.body.todays_bookings) {
        assert.equal(b.user_id, undefined);
        assert.equal(b.booked_by, undefined);
      }

      // 3. Unauthenticated and student requests to GET /api/lab-usage are blocked
      const pubAttendance = await apiRequest('/api/lab-usage');
      assert.equal(pubAttendance.status, 401);

      const stuAttendance = await apiRequest('/api/lab-usage', { token: studentToken });
      assert.equal(stuAttendance.status, 403);
    });

    test('File upload rejects spoofed image MIME with executable/text content and accepts authentic PNG magic bytes', async () => {
      // 1. Spoofed .png containing script/text content
      const fakePng = buildMultipart({
        fieldName: 'image',
        filename: 'exploit.png',
        contentType: 'image/png',
        fileBuffer: Buffer.from('#!/bin/sh\necho "not a real png image"\n', 'utf-8'),
      });
      const fakeUploadRes = await apiRequest('/api/upload', {
        method: 'POST',
        token: techToken,
        body: fakePng.buffer,
        headers: { 'Content-Type': fakePng.contentType },
      });
      assert.equal(fakeUploadRes.status, 400);

      // 2. Authentic 1x1 PNG image magic bytes
      const realPngBuffer = Buffer.from(
        '89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c4890000000a49444154789c63000100000500010d0a2db40000000049454e44ae426082',
        'hex'
      );
      const realPng = buildMultipart({
        fieldName: 'image',
        filename: 'valid.png',
        contentType: 'image/png',
        fileBuffer: realPngBuffer,
      });
      const validUploadRes = await apiRequest('/api/upload', {
        method: 'POST',
        token: techToken,
        body: realPng.buffer,
        headers: { 'Content-Type': realPng.contentType },
      });
      assert.equal(validUploadRes.status, 200);
      assert.equal(validUploadRes.body.success, true);
    });
  });
});
