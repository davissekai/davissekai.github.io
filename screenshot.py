"""
Take a screenshot of the portfolio site using Playwright.
"""

from playwright.sync_api import sync_playwright


def main() -> None:
    """Screenshot the portfolio site."""
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page(viewport={"width": 1440, "height": 900})
        page.goto("http://localhost:8765/")
        page.wait_for_timeout(2000)
        page.screenshot(path="/home/davisdey1/portfolio/screenshot.png", full_page=True)
        print("Screenshot saved to /home/davisdey1/portfolio/screenshot.png")
        browser.close()


if __name__ == "__main__":
    main()
