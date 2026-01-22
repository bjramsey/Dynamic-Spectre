const { test, expect } = require('@playwright/test');

test.describe('Spectre Tiling UI Controls', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/');
        // Select 'Spectres' to ensure UI controls are visible for most tests
        const shapeSelect = page.locator('select').nth(0);
        await shapeSelect.selectOption('Spectres');
    });

    test('should synchronize Param A and B when locked', async ({ page }) => {
        const lockCheckbox = page.locator('input[type="checkbox"]').nth(1);
        const aInput = page.locator('input[type="text"]').nth(0);
        const bInput = page.locator('input[type="text"]').nth(1);

        // Initial state: locked, both 1.000
        await expect(lockCheckbox).toBeChecked();
        await expect(aInput).toHaveValue('1.000');
        await expect(bInput).toHaveValue('1.000');

        // Change A, verify B follows
        await aInput.fill('1.5');
        await aInput.press('Enter');
        await expect(bInput).toHaveValue('1.500');
    });

    test('should allow independent Param A and B when unlocked', async ({ page }) => {
        const lockCheckbox = page.locator('input[type="checkbox"]').nth(1);
        const aInput = page.locator('input[type="text"]').nth(0);
        const bInput = page.locator('input[type="text"]').nth(1);

        await lockCheckbox.uncheck();
        await aInput.fill('2.0');
        await aInput.press('Enter');

        await expect(aInput).toHaveValue('2.0');
        await expect(bInput).toHaveValue('1.000'); // Remains unchanged
    });

    test('should reset Param A and B to 1.0 when re-locking', async ({ page }) => {
        const lockCheckbox = page.locator('input[type="checkbox"]').nth(1);
        const aInput = page.locator('input[type="text"]').nth(0);

        await lockCheckbox.uncheck();
        await aInput.fill('2.0');
        await aInput.press('Enter');

        await lockCheckbox.check();
        await expect(aInput).toHaveValue('1.000');
    });

    test('should toggle Remove Mystic state', async ({ page }) => {
        const mysticCheckbox = page.locator('input[type="checkbox"]').nth(0);

        await expect(mysticCheckbox).not.toBeChecked();
        await mysticCheckbox.check();
        await expect(mysticCheckbox).toBeChecked();
    });

    test('zoom buttons should exist', async ({ page }) => {
        const zoomIn = page.locator('button:has-text("+")');
        const zoomOut = page.locator('button:has-text("-")');
        const center = page.locator('button:has-text("Center")');
        const fit = page.locator('button:has-text("Fit")');

        await expect(zoomIn).toBeVisible();
        await expect(zoomOut).toBeVisible();
        await expect(center).toBeVisible();
        await expect(fit).toBeVisible();
    });

    test('Fit button should update view state', async ({ page }) => {
        // Build supertiles to have something to fit
        const buildButton = page.locator('button:has-text("Build Supertiles")');
        await buildButton.click();
        await buildButton.click();

        // Get initial transformation state
        const initialTransform = await page.evaluate(() => window.to_screen);

        // Click Fit
        const fitButton = page.locator('button:has-text("Fit")');
        await fitButton.click();

        // Verify state changed
        const newTransform = await page.evaluate(() => window.to_screen);
        expect(newTransform).not.toEqual(initialTransform);
    });

    test('UI controls should be hidden/shown based on shape selection', async ({ page }) => {
        const shapeSelect = page.locator('select').nth(0);
        const lockCheckbox = page.locator('input[type="checkbox"]').nth(1);
        const aInput = page.locator('input[type="text"]').nth(0);

        // Initially Spectres is selected (from beforeEach), so controls should be visible
        await expect(lockCheckbox).toBeVisible();
        await expect(aInput).toBeVisible();

        // Select 'Tile(1,1)' - controls should be hidden
        await shapeSelect.selectOption('Tile(1,1)');
        await expect(lockCheckbox).toBeHidden();
        await expect(aInput).toBeHidden();

        // Select 'Spectres' again - controls should reappear
        await shapeSelect.selectOption('Spectres');
        await expect(lockCheckbox).toBeVisible();
        await expect(aInput).toBeVisible();
    });
});
