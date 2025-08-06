from playwright.sync_api import sync_playwright, expect

def run_verification(playwright):
    browser = playwright.chromium.launch(headless=True)
    context = browser.new_context()
    page = context.new_page()

    try:
        # Navigate to the app with the dev backdoor enabled
        page.goto("http://localhost:5173/?dev=true", timeout=60000)

        # Go to Guild Page
        page.get_by_role("link", name="🛡️ Guild").click()

        # --- Show Quest Board ---
        page.get_by_role("button", name="View Quest Board").click()

        # Give it a moment to render
        page.wait_for_timeout(2000) # Increased wait time

        # Take screenshot of the Quest Board
        page.screenshot(path="jules-scratch/verification/quest_board.png")
        print("Screenshot of Quest Board taken successfully.")

        # --- Show Exercise History ---
        page.get_by_role("button", name="View Exercise History").click()

        # Give it a moment to render
        page.wait_for_timeout(2000) # Increased wait time

        # Take screenshot of the Exercise History
        page.screenshot(path="jules-scratch/verification/exercise_history.png")
        print("Screenshot of Exercise History taken successfully.")


    except Exception as e:
        print(f"An error occurred: {e}")
        page.screenshot(path="jules-scratch/verification/error.png")
    finally:
        browser.close()

with sync_playwright() as playwright:
    run_verification(playwright)
