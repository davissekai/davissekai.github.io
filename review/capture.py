#!/usr/bin/env python3
"""Capture Domain review screenshots."""
from pathlib import Path
from playwright.sync_api import sync_playwright

OUT = Path(__file__).resolve().parent
BASE = "http://127.0.0.1:8765/"

def shot(page, name):
    path = OUT / name
    page.screenshot(path=str(path), full_page=False)
    print("wrote", path)

def run(width, height, prefix):
    with sync_playwright() as p:
        browser = p.chromium.launch(
            executable_path="/usr/bin/google-chrome",
            args=["--no-sandbox", "--disable-dev-shm-usage"],
        )
        context = browser.new_context(
            viewport={"width": width, "height": height},
            device_scale_factor=1,
            reduced_motion="no-preference",
        )
        page = context.new_page()
        page.goto(BASE, wait_until="networkidle", timeout=60000)
        page.wait_for_selector("html.is-ready", timeout=15000)
        page.wait_for_timeout(1200)

        # Hero
        page.evaluate("window.scrollTo(0,0)")
        page.wait_for_timeout(400)
        shot(page, f"{prefix}_01_hero.png")

        # Star map / worlds
        page.locator("#worlds").scroll_into_view_if_needed()
        page.wait_for_timeout(600)
        shot(page, f"{prefix}_02_worlds.png")

        # Open Two Eyes
        if width >= 800:
            page.locator('.world-node[data-id="two-eyes"]').click()
        else:
            page.locator('.world-list-item[data-id="two-eyes"]').click()
        page.wait_for_selector("#world-view.is-open", timeout=5000)
        page.wait_for_timeout(800)
        shot(page, f"{prefix}_03_world_two_eyes.png")

        # Back behaviour
        page.locator("#world-back").click()
        page.wait_for_selector("#world-view.is-open", state="detached", timeout=5000)
        page.wait_for_timeout(500)
        # Confirm we're back on worlds and scroll preserved-ish
        assert page.evaluate("!document.body.classList.contains('world-open')")
        shot(page, f"{prefix}_04_back_to_map.png")

        # Footer / contact
        page.locator("#contact").scroll_into_view_if_needed()
        page.wait_for_timeout(500)
        shot(page, f"{prefix}_05_contact.png")

        # Esc open + Esc close check
        if width >= 800:
            page.locator("#worlds").scroll_into_view_if_needed()
            page.wait_for_timeout(300)
            page.locator('.world-node[data-id="atmo"]').click()
            page.wait_for_selector("#world-view.is-open")
            page.keyboard.press("Escape")
            page.wait_for_timeout(500)
            assert page.evaluate("!document.getElementById('world-view').classList.contains('is-open')")
            print(f"{prefix}: Esc back OK")

        browser.close()

if __name__ == "__main__":
    run(1440, 900, "desktop1440")
    run(390, 844, "mobile390")
    print("done")
