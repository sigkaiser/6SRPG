from playwright.sync_api import sync_playwright, expect

def run(playwright):
    browser = playwright.chromium.launch(headless=True)
    context = browser.new_context()
    page = context.new_page()

    try:
        # 1. Start at the root, which should be the TownPage
        page.goto("http://localhost:5173/")

        # 2. Register a new user
        page.get_by_role("button", name="Register").first.click()
        page.get_by_placeholder("Username").fill("testuser")
        page.get_by_placeholder("Email").fill("test@test.com")
        page.get_by_placeholder("Password").fill("password")
        page.locator("form").get_by_role("button", name="Register").click()

        # Wait for registration to complete, we should be back at the login form
        expect(page.get_by_role("button", name="Login").first).to_be_visible()

        # 3. Log in to the application
        page.get_by_role("button", name="Login").first.click()
        page.get_by_placeholder("Email").fill("test@test.com")
        page.get_by_placeholder("Password").fill("password")
        page.locator("form").get_by_role("button", name="Login").click()

        # Wait for navigation to the town page after login
        expect(page).to_have_url("http://localhost:5173/")

        # 4. Navigate to the Guild
        page.get_by_role("link", name="Guild").click()
        expect(page).to_have_url("http://localhost:5173/guild")

        # 5. Verify Quest Board
        page.get_by_role("button", name="View Quest Board").click()
        page.wait_for_timeout(1000) # allow content to render
        page.screenshot(path="jules-scratch/verification/quest_board.png")

        # 6. Verify Exercise History
        page.get_by_role("button", name="View Exercise History").click()
        page.wait_for_timeout(1000) # allow content to render
        page.screenshot(path="jules-scratch/verification/exercise_history.png")

    except Exception as e:
        print(f"An error occurred: {e}")
        page.screenshot(path="jules-scratch/verification/error.png")

    finally:
        browser.close()

with sync_playwright() as playwright:
    run(playwright)
