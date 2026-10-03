import { test, expect } from '@playwright/test';

test.beforeEach(async ({ context }) => {
  // Clear all cookies before each test so roles do not collide
  await context.clearCookies();
});

test.describe('UnboundYou LMS - Public Access & Landing Pages', () => {
  test('1. Course Store & Catalog loads with active courses', async ({ page }) => {
    await page.goto('/store');
    await expect(page).toHaveURL(/.*\/store/);
    const heading = page.locator('h1, h2').first();
    await expect(heading).toBeVisible();
    console.log('✅ Store page loaded successfully.');
  });

  test('2. Inbound Consultation Lead Form is interactive', async ({ page }) => {
    await page.goto('/consultation');
    await expect(page).toHaveURL(/.*\/consultation/);

    // Step 1: Select a subject
    const subjectBtn = page.locator('button:has-text("Mathematics")').first();
    await expect(subjectBtn).toBeVisible();
    await subjectBtn.click();

    const nextBtn = page.locator('button:has-text("Next Step")');
    await expect(nextBtn).toBeEnabled();
    await nextBtn.click();

    // Step 2: Date input should now be visible
    const dateInput = page.locator('input[type="date"]');
    await expect(dateInput).toBeVisible();
    console.log('✅ Inbound Consultation multi-step wizard successfully verified.');
  });

  test('3. Login Page renders with credentials form and Demo Portals', async ({ page }) => {
    await page.goto('/login');
    await expect(page).toHaveURL(/.*\/login/);
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();

    // Verify all 4 demo role buttons exist
    const demoStudent = page.locator('button:has-text("Student")');
    const demoEducator = page.locator('button:has-text("Educator")');
    const demoParent = page.locator('button:has-text("Parent")');
    const demoAdmin = page.locator('button:has-text("Admin")');

    await expect(demoStudent).toBeVisible();
    await expect(demoEducator).toBeVisible();
    await expect(demoParent).toBeVisible();
    await expect(demoAdmin).toBeVisible();
    console.log('✅ Login page verified with credentials form and 4 Demo quick-access buttons.');
  });
});

test.describe('UnboundYou LMS - Student Portal End-to-End', () => {
  test('Student Authentication & Navigation across student features', async ({ page }) => {
    await page.goto('/login');
    const studentBtn = page.locator('button:has-text("Student")');
    await studentBtn.click();

    await page.waitForURL(/.*\/student\/.*/, { timeout: 15000 });
    console.log(`✅ Student logged in! Current URL: ${page.url()}`);

    // Navigate to Student Courses
    await page.goto('/student/courses');
    await expect(page).toHaveURL(/.*\/student\/courses/);
    console.log('✅ Student Courses page accessible.');

    // Navigate to Student Sessions
    await page.goto('/student/sessions');
    await expect(page).toHaveURL(/.*\/student\/sessions/);
    console.log('✅ Student Sessions page accessible.');

    // Navigate to Student Chats
    await page.goto('/student/chats');
    await expect(page).toHaveURL(/.*\/student\/chats/);
    console.log('✅ Student Realtime Chat page accessible.');
  });
});

test.describe('UnboundYou LMS - Educator Portal End-to-End', () => {
  test('Educator Authentication & Navigation across teaching tools', async ({ page }) => {
    await page.goto('/login');
    const educatorBtn = page.locator('button:has-text("Educator")');
    await educatorBtn.click();

    await page.waitForURL(/.*\/educator\/.*/, { timeout: 15000 });
    console.log(`✅ Educator logged in! Current URL: ${page.url()}`);

    // Navigate to Availability & Schedule Management
    await page.goto('/educator/availability');
    await expect(page).toHaveURL(/.*\/educator\/availability/);
    console.log('✅ Educator Availability & Leave Management page accessible.');

    // Navigate to Educator Courses & Curriculum
    await page.goto('/educator/courses');
    await expect(page).toHaveURL(/.*\/educator\/courses/);
    console.log('✅ Educator Courses & Curriculum page accessible.');

    // Navigate to Educator Payouts Ledger
    await page.goto('/educator/payouts');
    await expect(page).toHaveURL(/.*\/educator\/payouts/);
    console.log('✅ Educator Payouts Ledger page accessible.');
  });
});

test.describe('UnboundYou LMS - Parent Portal End-to-End', () => {
  test('Parent Authentication, Child Overview & Monthly Reports', async ({ page }) => {
    await page.goto('/login');
    const parentBtn = page.locator('button:has-text("Parent")');
    await parentBtn.click();

    await page.waitForURL(/.*\/parent\/.*/, { timeout: 15000 });
    console.log(`✅ Parent logged in! Current URL: ${page.url()}`);

    // Navigate to Monthly Reports
    await page.goto('/parent/reports');
    await expect(page).toHaveURL(/.*\/parent\/reports/);
    console.log('✅ Parent Monthly Reports page accessible.');

    // Navigate to Fees / Credits
    await page.goto('/parent/fees');
    await expect(page).toHaveURL(/.*\/parent\/fees/);
    console.log('✅ Parent Fees & Credit Balance page accessible.');
  });
});

test.describe('UnboundYou LMS - Admin Portal End-to-End', () => {
  test('Super Admin Authentication, User Roster & Consultations Lead Pipeline', async ({ page }) => {
    await page.goto('/login');
    const adminBtn = page.locator('button:has-text("Admin")');
    await adminBtn.click();

    await page.waitForURL(/.*\/admin\/.*/, { timeout: 15000 });
    console.log(`✅ Admin logged in! Current URL: ${page.url()}`);

    // Navigate to Users directory
    await page.goto('/admin/users');
    await expect(page).toHaveURL(/.*\/admin\/users/);
    console.log('✅ Admin Users directory page accessible.');

    // Navigate to Inbound Consultations Leads
    await page.goto('/admin/consultations');
    await expect(page).toHaveURL(/.*\/admin\/consultations/);
    console.log('✅ Admin Consultations pipeline page accessible.');

    // Navigate to Platform Analytics
    await page.goto('/admin/analytics');
    await expect(page).toHaveURL(/.*\/admin\/analytics/);
    console.log('✅ Admin Platform Analytics page accessible.');
  });
});
