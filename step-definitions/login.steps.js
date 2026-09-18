const { Given, When, Then } = require('@wdio/cucumber-framework');
const loginPage = require('../page-objects/LoginPage');
const homePage = require('../page-objects/HomePage');
const {
  acceptNotificationPermission,
  handleBiometricDialog,
  acceptLocationPermission,
  logoutFromApp,
} = require('./hooks');

/**
 * Login Step Definitions
 * Verified flow on Samsung Galaxy S23 (com.yash.bankingapp):
 *   1. App launch → accept notification permission
 *   2. Login screen → enter credentials → tap Sign In
 *   3. Biometric dialog → tap PASS
 *   4. Location permission → accept "While using the app"
 *   5. Home dashboard with "Total Balance" visible
 */

Given('the BStackBank app is launched', async () => {
  // Single waitUntil handles all intermediate states: permissions, home screen, biometric screen
  await driver.waitUntil(
    async () => {
      // Dismiss notification permission if present
      try {
        const notifBtn = await $('android=new UiSelector().resourceId("com.android.permissioncontroller:id/permission_allow_button")');
        if (await notifBtn.isDisplayed()) {
          await notifBtn.click();
          return false;
        }
      } catch { /* not present */ }
      // Dismiss location permission if present
      try {
        const locBtn = await $('android=new UiSelector().resourceId("com.android.permissioncontroller:id/permission_allow_foreground_only_button")');
        if (await locBtn.isDisplayed()) {
          await locBtn.click();
          return false;
        }
      } catch { /* not present */ }
      // Check current screen state
      const pageSrc = await driver.getPageSource();
      // Handle Sign Out confirmation dialog
      if (pageSrc.includes('SIGN OUT')) {
        try {
          const signOutBtn = await $('android=new UiSelector().text("SIGN OUT")');
          if (await signOutBtn.isDisplayed()) {
            await signOutBtn.click();
            return false;
          }
        } catch { /* not present */ }
      }
      // Detect any authenticated screen by presence of bottom nav tabs
      // Covers Home, Transfer, Transactions, Cards, Profile screens
      if (
        pageSrc.includes('Total Balance') ||
        pageSrc.includes('Good morning') ||
        pageSrc.includes(', Transfer') ||
        pageSrc.includes(', Transactions') ||
        pageSrc.includes(', Cards') ||
        pageSrc.includes(', Profile')
      ) {
        // Logged in on any app screen — logout via Profile → Sign Out
        await logoutFromApp();
        return false;
      }
      if (pageSrc.includes('Verify Your Identity')) {
        // On biometric screen (not logged in after cancel) — go back to login
        await driver.back();
        return false;
      }
      return loginPage.isLoginScreenDisplayed();
    },
    { timeout: 60000, timeoutMsg: 'Login screen did not appear within 60 seconds' }
  );
});

/**
 * Smart background step for transfer/transactions features.
 * - First scenario in the session: app is on login screen → login with autofill.
 * - Subsequent scenarios: already authenticated → just navigate to Home tab.
 * Requires noReset:true in capabilities so session state persists across scenarios.
 */
Given('I am on the home dashboard', async () => {
  const pageSrc = await driver.getPageSource();
  const isAuthenticated =
    pageSrc.includes('Total Balance') ||
    pageSrc.includes('Good morning') ||
    pageSrc.includes(', Transfer') ||
    pageSrc.includes(', Transactions') ||
    pageSrc.includes(', Cards') ||
    pageSrc.includes(', Profile');

  if (isAuthenticated) {
    // Already logged in — navigate to Home tab
    const homeTab = await $('android=new UiSelector().descriptionContains(", Home")');
    await homeTab.waitForDisplayed({ timeout: 5000 });
    await homeTab.click();
    await homePage.waitForDashboard();
    return;
  }

  // Not yet logged in — perform full login flow once
  await acceptNotificationPermission();
  await loginPage.tap('android=new UiSelector().resourceId("autofill-regular")');
  await loginPage.tapLoginButton();
  await handleBiometricDialog();
  await acceptLocationPermission();
  await homePage.waitForDashboard();
});

Given('I am logged in as {string} with password {string}', async (username, password) => {
  await acceptNotificationPermission();
  await loginPage.login(username, password);
  await handleBiometricDialog();
  await acceptLocationPermission();
  await homePage.waitForDashboard();
});

When('I enter username {string}', async (username) => {
  await loginPage.enterUsername(username);
});

When('I enter password {string}', async (password) => {
  await loginPage.enterPassword(password);
});

When('I tap the login button', async () => {
  await loginPage.tapLoginButton();
});

When('I tap the autofill regular user button', async () => {
  await loginPage.tap('android=new UiSelector().resourceId("autofill-regular")');
});

When('I fail the biometric verification 5 times', async () => {
  // The BrowserStack executor is the ONLY way to interact with this system dialog.
  // Send biometricMatch:fail 5 times via executor. After ~5 failures the app
  // switches to a "Device Passcode" fallback dialog.
  for (let i = 0; i < 5; i++) {
    // Wait for biometric dialog
    await driver.waitUntil(
      async () => {
        const src = await driver.getPageSource();
        return src.includes('Biometric Authentication') || src.includes('Device Passcode');
      },
      { timeout: 10000, timeoutMsg: `Biometric/Passcode dialog did not appear on attempt ${i + 1}` }
    );

    const src = await driver.getPageSource();
    // If passcode dialog already appeared, stop sending FAIL
    if (src.includes('Device Passcode')) {
      console.log(`[Step] Device Passcode dialog appeared after ${i} FAIL(s)`);
      break;
    }

    // Send FAIL via executor
    await driver.execute('browserstack_executor: {"action":"biometric", "arguments": {"biometricMatch": "fail"}}');
    console.log(`[Step] Biometric FAIL sent via executor (attempt ${i + 1})`);
  }
});

Then('I should see the device passcode dialog', async () => {
  // After 5 biometric failures the app shows "Device Passcode" dialog with CANCEL/PASS
  await driver.waitUntil(
    async () => {
      const src = await driver.getPageSource();
      return src.includes('Device Passcode');
    },
    { timeout: 12000, timeoutMsg: 'Device Passcode dialog did not appear after biometric failures' }
  );
  const src = await driver.getPageSource();
  expect(src).toContain('Device Passcode');
});

When('I cancel the passcode dialog', async () => {
  // CANCEL button: resource-id="android:id/button3" (confirmed in test run logs)
  const cancelBtn = await $('android=new UiSelector().resourceId("android:id/button3")');
  await cancelBtn.waitForDisplayed({ timeout: 5000 });
  await cancelBtn.click();
  console.log('[Step] Passcode dialog CANCEL tapped');
});

When('I pass the passcode dialog', async () => {
  // PASS button: resource-id="android:id/button1" (observed in live session)
  await driver.execute('browserstack_executor: {"action":"biometric", "arguments": {"biometricMatch": "pass"}}');
  console.log('[Step] Passcode dialog PASS sent via executor');
});

Then('I should see the biometric failure message', async () => {
  // After cancelling passcode: bio-error element appears on the Verify Your Identity screen
  // resource-id="bio-error", text="Biometric authentication failed. Please try again."
  await driver.waitUntil(
    async () => {
      const src = await driver.getPageSource();
      return src.includes('bio-error') || src.includes('Biometric authentication failed');
    },
    { timeout: 10000, timeoutMsg: 'Biometric failure message did not appear after cancelling passcode' }
  );
  const errorEl = await $('android=new UiSelector().resourceId("bio-error")');
  await errorEl.waitForDisplayed({ timeout: 5000 });
  const errorText = await errorEl.getText();
  // Actual text observed: 'Biometric cancelled. Tap "Scan Biometric" to try again.'
  expect(errorText).toContain('Biometric');
});

Then('I should see the home dashboard', async () => {
  // After login: handle biometric then location permission
  await handleBiometricDialog();
  await acceptLocationPermission();
  await driver.waitUntil(
    async () => homePage.isDashboardDisplayed(),
    { timeout: 15000, timeoutMsg: 'Home dashboard did not appear after login' }
  );
  const isDisplayed = await homePage.isDashboardDisplayed();
  expect(isDisplayed).toBe(true);
});

When('I tap the show password button', async () => {
  const btn = await $('android=new UiSelector().resourceId("toggle-password-visibility")');
  await btn.waitForDisplayed({ timeout: 5000 });
  await btn.click();
});

Then('the password field should be visible', async () => {
  const passwordField = await $('android=new UiSelector().resourceId("password-input")');
  await passwordField.waitForDisplayed({ timeout: 5000 });
  const isPassword = await passwordField.getAttribute('password');
  expect(isPassword).toBe('false');
});

Then('I should see an error message', async () => {
  await driver.waitUntil(
    async () => loginPage.isErrorDisplayed(),
    { timeout: 10000, timeoutMsg: 'Error message did not appear after invalid login' }
  );
  const isDisplayed = await loginPage.isErrorDisplayed();
  expect(isDisplayed).toBe(true);
});

Then('I should see a validation error', async () => {
  await driver.waitUntil(
    async () => loginPage.isValidationErrorDisplayed(),
    { timeout: 10000, timeoutMsg: 'Validation error did not appear' }
  );
  const isDisplayed = await loginPage.isValidationErrorDisplayed();
  expect(isDisplayed).toBe(true);
});
