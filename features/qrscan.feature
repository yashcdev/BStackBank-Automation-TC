@qrscan @smoke @regression
Feature: QR Code Scanning
  As a BStackBank user
  I want to scan a QR code from the home screen
  So that I can view the decoded QR result

  Background:
    Given I am on the home dashboard

  @qr-scan-result
  Scenario: Scanning a QR code displays the decoded result
    When I tap the Scan QR quick action
    And I accept the camera permission if prompted
    And I take a photo with the camera
    Then I should see the QR result screen
    And the QR result should contain a URL

  @qr-scan-close
  Scenario: Closing the QR result returns to home screen
    When I tap the Scan QR quick action
    And I accept the camera permission if prompted
    And I take a photo with the camera
    Then I should see the QR result screen
    When I tap the Close button on the QR result
    Then I should be on the home dashboard
