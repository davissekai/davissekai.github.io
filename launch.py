"""
Launch portfolio in a browser using Playwright.
"""

from playwright.sync_api import sync_playwright


def main() -> None:
    """Open the portfolio site in Chromium."""
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=False)
        page = browser.new_page(viewport={"width": 1440, "height": 900})
        page.goto("http://localhost:8765/")
        print("Portfolio launched at http://localhost:8765/")
        # Keep the browser open until the user closes it
        input("Press Enter to close the browser...")
        browser.close()


if __name__ == "__main__":
    main()
