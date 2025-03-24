// @ts-check
import { test, expect } from '@playwright/test';

test('check for console errors', async ({ page }) => {
  // Create a list to store console errors
  const consoleErrors = [];
  
  // Listen for console events
  page.on('console', msg => {
    if (msg.type() === 'error') {
      consoleErrors.push(msg.text());
    }
  });

  // Navigate to the application
  await page.goto('http://localhost:4173/');
  
  // Wait for potential WebGL initialization and Three.js to load
  await page.waitForTimeout(2000);
  
  // Check for errors
  expect(consoleErrors).toEqual([]);
});