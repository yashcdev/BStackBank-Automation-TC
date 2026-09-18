const BasePage = require('./BasePage');

/**
 * QRScanPage - Page Object for the QR Scan flow
 * Selectors verified via live exploratory session on Google Pixel 8
 * App package: com.yash.bankingapp
 *
 * Flow:
 *   Home → tap "Scan QR" quick action → camera permission → system camera opens
 *   → inject QR image → take photo → confirm "Done" → QR Result modal appears
 *
 * Verified selectors:
 *   Scan QR quick action  → Button content-desc="Scan QR" (home screen)
 *   Camera permission     → com.android.permissioncontroller:id/permission_allow_foreground_only_button
 *   Shutter button        → com.google.android.GoogleCamera:id/shutter_button (Take photo / Done)
 *   QR result text        → resource-id="qr-result-text"  (decoded URL)
 *   Scan Again button     → resource-id="scan-again-btn"  content-desc=", Scan Again"
 *   Close button          → resource-id="qr-close-btn"    content-desc=", Close"
 */
class QRScanPage extends BasePage {
  // ─── Selectors ────────────────────────────────────────────────────────────

  get scanQRButton() {
    return $('android=new UiSelector().description("Scan QR")');
  }

  get cameraPermissionAllowButton() {
    return $('android=new UiSelector().resourceId("com.android.permissioncontroller:id/permission_allow_foreground_only_button")');
  }

  get shutterButton() {
    return $('android=new UiSelector().resourceId("com.google.android.GoogleCamera:id/shutter_button")');
  }

  get qrResultText() {
    return $('android=new UiSelector().resourceId("qr-result-text")');
  }

  get scanAgainButton() {
    return $('android=new UiSelector().resourceId("scan-again-btn")');
  }

  get closeButton() {
    return $('android=new UiSelector().resourceId("qr-close-btn")');
  }

  // ─── Actions ──────────────────────────────────────────────────────────────

  /**
   * Tap the Scan QR quick action on the home screen.
   */
  async tapScanQR() {
    await this.tap('android=new UiSelector().description("Scan QR")');
  }

  /**
   * Accept the camera permission dialog if it appears.
   */
  async acceptCameraPermission() {
    try {
      const btn = await $('android=new UiSelector().resourceId("com.android.permissioncontroller:id/permission_allow_foreground_only_button")');
      await btn.waitForDisplayed({ timeout: 6000 });
      await btn.click();
      console.log('[QRScanPage] Camera permission accepted');
    } catch {
      // Permission dialog may not appear if already granted
    }
  }

  /**
   * Wait for the system camera viewfinder to be ready.
   */
  async waitForCamera() {
    await driver.waitUntil(
      async () => {
        const src = await driver.getPageSource();
        return src.includes('com.google.android.GoogleCamera') || src.includes('shutter_button');
      },
      { timeout: 15000, timeoutMsg: 'Camera viewfinder did not open within 15 seconds' }
    );
  }

  /**
   * Inject a QR code image into the camera feed using BrowserStack's cameraImageInjection executor.
   * Must be called BEFORE tapping the shutter button.
   * @param {string} mediaUrl - BrowserStack media URL (e.g. "media://abc123...")
   */
  async injectQRImage(mediaUrl) {
    await driver.execute(
      `browserstack_executor: {"action":"cameraImageInjection", "arguments": {"imageUrl": "${mediaUrl}"}}`
    );
    console.log(`[QRScanPage] Injected QR image: ${mediaUrl}`);
  }

  /**
   * Tap the shutter button to take a photo (first tap captures, second tap confirms "Done").
   */
  async takePhoto() {
    const shutter = await $('android=new UiSelector().resourceId("com.google.android.GoogleCamera:id/shutter_button")');
    await shutter.waitForDisplayed({ timeout: 10000 });
    await shutter.click();
  }

  /**
   * Confirm the captured photo by tapping "Done".
   */
  async confirmPhoto() {
    await driver.waitUntil(
      async () => {
        const src = await driver.getPageSource();
        return src.includes('content-desc="Done"') || src.includes('Retake');
      },
      { timeout: 10000, timeoutMsg: 'Photo review screen did not appear' }
    );
    const doneBtn = await $('android=new UiSelector().resourceId("com.google.android.GoogleCamera:id/shutter_button")');
    await doneBtn.waitForDisplayed({ timeout: 5000 });
    await doneBtn.click();
  }

  /**
   * Wait for the QR result modal to appear and return the decoded text.
   */
  async waitForQRResult() {
    const resultEl = await $('android=new UiSelector().resourceId("qr-result-text")');
    await resultEl.waitForDisplayed({ timeout: 15000 });
    return resultEl.getText();
  }

  /**
   * Check if the QR result modal is displayed.
   */
  async isQRResultDisplayed() {
    return this.isDisplayed('android=new UiSelector().resourceId("qr-result-text")');
  }

  /**
   * Tap the Close button on the QR result modal.
   */
  async tapClose() {
    await this.tap('android=new UiSelector().resourceId("qr-close-btn")');
  }

  /**
   * Tap the Scan Again button on the QR result modal.
   */
  async tapScanAgain() {
    await this.tap('android=new UiSelector().resourceId("scan-again-btn")');
  }
}

module.exports = new QRScanPage();
