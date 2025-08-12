/**
 * Copyright (c) Microsoft Corporation.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

// @ts-ignore
import { asLocator } from 'playwright-core/lib/utils';

import type * as playwright from 'playwright';
import type { Tab } from '../tab.js';

export async function waitForCompletion<R>(tab: Tab, callback: () => Promise<R>): Promise<R> {
  const requests = new Set<playwright.Request>();
  let frameNavigated = false;
  let waitCallback: () => void = () => {};
  const waitBarrier = new Promise<void>(f => { waitCallback = f; });

  const requestListener = (request: playwright.Request) => requests.add(request);
  const requestFinishedListener = (request: playwright.Request) => {
    requests.delete(request);
    if (!requests.size)
      waitCallback();
  };

  const frameNavigateListener = (frame: playwright.Frame) => {
    if (frame.parentFrame())
      return;
    frameNavigated = true;
    dispose();
    clearTimeout(timeout);
    void tab.waitForLoadState('load').then(waitCallback);
  };

  const onTimeout = () => {
    dispose();
    waitCallback();
  };

  tab.page.on('request', requestListener);
  tab.page.on('requestfinished', requestFinishedListener);
  tab.page.on('framenavigated', frameNavigateListener);
  const timeout = setTimeout(onTimeout, 10000);

  const dispose = () => {
    tab.page.off('request', requestListener);
    tab.page.off('requestfinished', requestFinishedListener);
    tab.page.off('framenavigated', frameNavigateListener);
    clearTimeout(timeout);
  };

  try {
    const result = await callback();
    if (!requests.size && !frameNavigated)
      waitCallback();
    await waitBarrier;
    await tab.waitForTimeout(1000);
    return result;
  } finally {
    dispose();
  }
}

export async function generateLocator(locator: playwright.Locator): Promise<string> {
  try {
    const { resolvedSelector } = await (locator as any)._resolveSelector();
    return asLocator('javascript', resolvedSelector);
  } catch (e) {
    throw new Error('Ref not found, likely because element was removed. Use browser_snapshot to see what elements are currently on the page.');
  }
}

export async function refToSelector(ref: string, page: playwright.Page): Promise<string> {
  try {
    // Create a locator using the aria-ref selector
    const locator = page.locator(`aria-ref=${ref}`);

    // Get the bounding box to find the center point
    const boundingBox = await locator.boundingBox();
    if (!boundingBox)
      throw new Error('Element not visible or not found');

    const centerX = boundingBox.x + boundingBox.width / 2;
    const centerY = boundingBox.y + boundingBox.height / 2;

    // Get selector using point coordinates
    const selector = await page.evaluate(
        ({ x, y }) => {
          const el = document.elementFromPoint(x, y) as HTMLElement;
          if (!el)
            return '';

          // Priority attributes for selector generation
          const attrPriority = [
            'data-test-automation-id',
            'aria-label',
            'data-title',
            'name',
            'alt',
            'title',
            'role',
          ];

          for (const attr of attrPriority) {
            const value = el.getAttribute(attr);
            if (value) {
              const escapedValue = CSS.escape(value);
              return `${el.tagName.toLowerCase()}[${attr}="${escapedValue}"]`;
            }
          }

          // Use ID if it's unique
          if (el.id) {
            const escapedId = CSS.escape(el.id);
            if (document.querySelectorAll(`#${escapedId}`).length === 1)
              return `#${escapedId}`;
          }

          // Default to tag name
          return el.tagName.toLowerCase();
        },
        { x: centerX, y: centerY }
    );

    return selector;
  } catch (e) {
    throw new Error(`Failed to convert ref "${ref}" to selector: ${e instanceof Error ? e.message : 'Unknown error'}`);
  }
}

export async function callOnPageNoTrace<T>(page: playwright.Page, callback: (page: playwright.Page) => Promise<T>): Promise<T> {
  return await (page as any)._wrapApiCall(() => callback(page), { internal: true });
}
