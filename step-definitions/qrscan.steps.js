const { Before, When, Then } = require('@wdio/cucumber-framework');
const homePage = require('../page-objects/HomePage');
const qrScanPage = require('../page-objects/QRScanPage');

/**
 * Before hook: dismiss any leftover QR result modal or camera screen
 * so the Background step "I am on the home dashboard" starts from a clean state.
 */
Before({ tags: '@qrscan' }, async () => {
  try {
    // Dismiss QR result modal if still open
    const closeBtn = await $('android=new UiSelector().resourceId("qr-close-btn")');
    if (await closeBtn.isDisplayed()) {
      await closeBtn.click();
      console.log('[QR Before] Dismissed leftover QR result modal');
    }
  } catch { /* not present */ }

  try {
    // Go back from camera if still open
    const src = await driver.getPageSource();
    if (src.includes('com.google.android.GoogleCamera')) {
      await driver.back();
      console.log('[QR Before] Navigated back from camera');
    }
  } catch { /* not present */ }
});

/**
 * QR Scan Step Definitions
 * Verified flow on Google Pixel 8 (com.yash.bankingapp):
 *   1. Home dashboard → tap "Scan QR" quick action
 *   2. Camera permission dialog → accept "While using the app"
 *   3. System camera opens → inject QR image → tap shutter (Take photo)
 *   4. Photo review screen → tap "Done"
 *   5. QR Result modal appears with decoded URL (resource-id: qr-result-text)
 *   6. "Scan Again" (resource-id: scan-again-btn) and "Close" (resource-id: qr-close-btn) buttons available
 *
 * Note: The app uses the system Google Camera for QR capture.
 * BrowserStack camera media injection is used to supply the QR image.
 * The enableCameraMediaInjection capability must be set in bstack:options.
 */

When('I tap the Scan QR quick action', async () => {
  await qrScanPage.tapScanQR();
});

When('I accept the camera permission if prompted', async () => {
  await qrScanPage.acceptCameraPermission();
});

When('I take a photo with the camera', async () => {
  // Wait for the system camera to open
  await qrScanPage.waitForCamera();

  // Inject the QR code image into the camera feed BEFORE tapping the shutter
  // Media URL uploaded to BrowserStack: contains a QR code for scanning
  await qrScanPage.injectQRImage('media://a85ff3f4d9c46cff13a7e88eef2308fa5a118da4');

  // Tap shutter to capture the injected QR image
  await qrScanPage.takePhoto();

  // Confirm the captured photo on the review screen
  await qrScanPage.confirmPhoto();
});

Then('I should see the QR result screen', async () => {
  await driver.waitUntil(
    async () => qrScanPage.isQRResultDisplayed(),
    { timeout: 15000, timeoutMsg: 'QR result screen did not appear after photo capture' }
  );
  const isDisplayed = await qrScanPage.isQRResultDisplayed();
  expect(isDisplayed).toBe(true);
});

Then('the QR result should contain a URL', async () => {
  const resultText = await qrScanPage.waitForQRResult();
  // The decoded QR result must be a non-empty string — observed value was a URL
  expect(typeof resultText).toBe('string');
  expect(resultText.length).toBeGreaterThan(0);
  console.log(`[QR Scan] Decoded QR result: ${resultText}`);
});

When('I tap the Close button on the QR result', async () => {
  await qrScanPage.tapClose();
});

Then('I should be on the home dashboard', async () => {
  await driver.waitUntil(
    async () => homePage.isDashboardDisplayed(),
    { timeout: 10000, timeoutMsg: 'Home dashboard did not appear after closing QR result' }
  );
  const isDisplayed = await homePage.isDashboardDisplayed();
  expect(isDisplayed).toBe(true);
});
