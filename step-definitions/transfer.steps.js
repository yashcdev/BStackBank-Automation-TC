const { When, Then } = require('@wdio/cucumber-framework');
const transferPage = require('../page-objects/TransferPage');
const homePage = require('../page-objects/HomePage');
const { handleBiometricDialog } = require('./hooks');

/**
 * Transfer Step Definitions
 * Verified flow on Samsung Galaxy S23 (com.yash.bankingapp):
 *   1. Home dashboard → tap Transfer nav tab
 *   2. Select recipient by name (descriptionContains)
 *   3. Scroll to amount input → enter amount or tap quick-amount chip
 *   4. Optionally enter remarks
 *   5. Tap Send Money → authorization sheet appears
 *   6. Tap Authenticate → biometric dialog → PASS
 *   7. Transfer Successful modal → tap Done
 */

When('I navigate to the Transfer screen', async () => {
  await homePage.navigateToTransfer();
  await driver.waitUntil(
    async () => transferPage.isTransferScreenDisplayed(),
    { timeout: 10000, timeoutMsg: 'Transfer screen did not appear' }
  );
  // Scroll recipient list to top so first recipient is always visible.
  // Use UiScrollable to scroll to the "Send To" label which is above the list.
  try {
    const sendToLabel = await $('android=new UiScrollable(new UiSelector().scrollable(true)).scrollIntoView(new UiSelector().text("Send To"))');
    await sendToLabel.waitForDisplayed({ timeout: 5000 });
  } catch {
    // Already at top or label not found — continue
  }
});

When('I select recipient {string}', async (name) => {
  await transferPage.selectRecipientByName(name);
});

When('I enter transfer amount {string}', async (amount) => {
  // Scroll amount-input into view using UiScrollable, then type
  const amountInput = await $('android=new UiScrollable(new UiSelector().scrollable(true)).scrollIntoView(new UiSelector().resourceId("amount-input"))');
  await amountInput.waitForDisplayed({ timeout: 10000 });
  await amountInput.clearValue();
  await amountInput.setValue(amount);
});

When('I tap the quick amount {string}', async (amount) => {
  // Scroll quick-amount chip into view using UiScrollable, then tap
  const chip = await $(`android=new UiScrollable(new UiSelector().scrollable(true)).scrollIntoView(new UiSelector().description("${amount}"))`);
  await chip.waitForDisplayed({ timeout: 10000 });
  await chip.click();
});

When('I enter transfer remarks {string}', async (note) => {
  // Scroll remarks-input into view using UiScrollable before typing
  const remarksInput = await $('android=new UiScrollable(new UiSelector().scrollable(true)).scrollIntoView(new UiSelector().resourceId("remarks-input"))');
  await remarksInput.waitForDisplayed({ timeout: 10000 });
  await remarksInput.clearValue();
  await remarksInput.setValue(note);
});

When('I tap the Send Money button', async () => {
  // Scroll send-btn into view using UiScrollable before tapping
  const sendBtn = await $('android=new UiScrollable(new UiSelector().scrollable(true)).scrollIntoView(new UiSelector().resourceId("send-btn"))');
  await sendBtn.waitForDisplayed({ timeout: 10000 });
  await driver.hideKeyboard().catch(() => {});
  await sendBtn.click();
});

Then('I should see the transaction authorization screen', async () => {
  await transferPage.waitForAuthSheet();
  const isDisplayed = await transferPage.isAuthSheetDisplayed();
  expect(isDisplayed).toBe(true);
});

When('I authenticate the transaction', async () => {
  await transferPage.tapAuthenticateButton();
  await handleBiometricDialog();
});

Then('I should see the transfer success modal', async () => {
  await transferPage.waitForSuccessModal();
  const isSuccessful = await transferPage.isTransferSuccessful();
  expect(isSuccessful).toBe(true);
});

When('I tap the Done button', async () => {
  await transferPage.tapDoneButton();
});

When('I cancel the transaction authorization', async () => {
  await transferPage.tapAuthCancelButton();
});

Then('I should be back on the transfer screen', async () => {
  await driver.waitUntil(
    async () => transferPage.isTransferScreenDisplayed(),
    { timeout: 10000, timeoutMsg: 'Transfer screen did not reappear after cancelling auth' }
  );
  const isDisplayed = await transferPage.isTransferScreenDisplayed();
  expect(isDisplayed).toBe(true);
});
