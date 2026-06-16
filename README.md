# Subscription Endpoint Health Checker

A Chrome extension for testing and monitoring subscription-style endpoints on domains you own or are explicitly authorized to test.

This project is intended for internal diagnostics, development testing, and availability checks of known endpoints. It is not designed or intended for discovering, guessing, harvesting, or validating private links that do not belong to you.

## Purpose

This extension helps verify whether known subscription endpoints are reachable and responding as expected.

It may be useful when:

* testing a subscription endpoint on your own domain;
* checking whether your reverse proxy, CDN, or web server is configured correctly;
* validating a list of previously generated test links;
* comparing successful and failed responses during development;
* exporting diagnostic results for further review.

## Intended Use

Use this tool only with:

* domains that you own;
* services that you administer;
* endpoints created by you for testing;
* links provided to you with explicit permission to verify them.

Do not use this tool against third-party domains, public services, unknown subscription endpoints, or private links that you are not authorized to access.

## What It Does

The extension provides a simple interface for checking subscription-style URLs and collecting basic diagnostic results.

Main capabilities:

* check known endpoint URLs;
* import a list of URLs from a local text file;
* verify endpoint availability one by one;
* display basic real-time statistics;
* export successful and failed checks into separate files.

## What It Does Not Do

This project is not intended to:

* bypass access controls;
* bypass bot protection;
* bypass rate limits;
* discover hidden or private links;
* brute-force subscription keys;
* scan domains without authorization;
* collect third-party tokens, keys, or credentials.

Any use of this project for unauthorized scanning, scraping, enumeration, or access attempts is strictly discouraged.

## Features

### Endpoint Verification

* Checks whether a known URL is reachable.
* Separates successful and failed responses.
* Tracks the number of processed links.
* Shows current checking status in the popup interface.

### File Import

* Supports importing a local `.txt` file with one URL per line.
* Processes imported URLs sequentially.
* Useful for testing known links generated during development or deployment.

Example input file:

```text
https://sub.example.com/test-link-001
https://sub.example.com/test-link-002
https://sub.example.com/test-link-003
```

### Result Export

The extension can export diagnostic results into local files:

```text
output_ok.txt   — endpoints that responded successfully
output_err.txt  — endpoints that failed or returned an unexpected response
```

These files are intended for local troubleshooting and should not be published if they contain private endpoint URLs.

### Basic Statistics

The popup interface displays:

* total checked URLs;
* successful checks;
* failed checks;
* current working status.

## Installation

### Manual Installation for Development

1. Download or clone this repository.
2. Open Chrome.
3. Go to:

```text
chrome://extensions/
```

4. Enable **Developer mode**.
5. Click **Load unpacked**.
6. Select the folder containing the extension files.

## Usage

### Checking Known Endpoints from a File

1. Prepare a `.txt` file with one authorized URL per line.
2. Open the extension from the Chrome toolbar.
3. Select the file.
4. Start the check.
5. Wait until verification is complete.
6. Export the results if needed.

### Testing Your Own Development Domain

Use only your own domain or a domain where you have permission to perform checks.

Example:

```text
https://sub.example.com/test-token
```

Avoid using production secrets, customer links, or real private subscription URLs during testing.

## Recommended Safety Practices

When using this tool:

* test only your own infrastructure;
* use temporary test tokens instead of real user links;
* keep request rates low;
* avoid running long automated checks against production systems;
* do not publish exported result files;
* do not commit private domains, tokens, or endpoint lists to GitHub;
* review your browser extension permissions before use.

## Project Structure

```text
sub-endpoint-checker/
├── manifest.json       # Chrome extension configuration
├── popup.html          # Popup interface
├── popup.css           # Popup styling
├── popup.js            # Popup logic
├── background.js       # Background worker logic
└── README.md           # Project documentation
```

## Privacy

The extension is intended to run locally in the browser.

Depending on the current implementation, checked URLs and results may be stored in local browser storage or exported into local files. Do not check or export sensitive links unless you understand how the data is handled.

Before sharing logs, screenshots, or exported files, remove private domains, tokens, keys, and subscription URLs.

## Security Notice

Subscription URLs and access tokens should be treated as secrets.

Do not commit real links, tokens, API keys, credentials, or production endpoint lists to this repository. If such data is accidentally committed, remove it from the repository history and rotate the affected secrets.

## Responsible Use

This project is provided only for authorized testing and diagnostics.

You are responsible for ensuring that your use of this tool complies with applicable laws, service terms, and internal security policies.

If you are not sure whether you are allowed to test a domain or endpoint, do not use this tool against it.

## License

This project is licensed under the MIT License.

See the `LICENSE` file for details.
