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

export async function generateCSSSelector(locator: playwright.Locator): Promise<string> {
  try {
    // Try to get CSS selector from the element using improved logic
    const cssSelector = await locator.evaluate((el: Element) => {
      const attrPriority = [
        'data-test-automation-id',
        'aria-label',
        'data-title',
        'name',
        'alt',
        'title',
        'role',
      ];

      const escapeSelector = (value: string): string => {
        return CSS.escape(value);
      };

      const isNoiseClass = (className: string): boolean => {
        return (
          /^(?:js-|_|ng-|react-)/.test(className) ||
          className.length > 15 ||
          /\d{4,}/.test(className)
        );
      };

      const generateNthPath = (element: Element): string => {
        let rootAncestor: Element | null = null;
        let current: Element | null = element;

        // Find the nearest ancestor with a priority attribute
        while (current && current !== document.body) {
          const foundAttr = attrPriority.find(attr =>
            current?.hasAttribute(attr),
          );
          if (foundAttr) {
            rootAncestor = current;
            break;
          }
          current = current.parentElement;
        }

        if (rootAncestor) {
          const pathParts: string[] = [];
          current = element;

          // Build path from element to root ancestor
          while (current && current !== rootAncestor && current.parentElement) {
            const siblings = Array.from(current.parentElement.children);
            const index = siblings.indexOf(current) + 1;
            pathParts.unshift(
              `${current.tagName.toLowerCase()}:nth-child(${index})`,
            );
            current = current.parentElement;
          }

          const foundAttr = attrPriority.find(attr =>
            rootAncestor?.hasAttribute(attr),
          )!;
          const attrValue = rootAncestor.getAttribute(foundAttr)!;
          const escapedValue = escapeSelector(attrValue);
          const rootSelector = `${rootAncestor.tagName.toLowerCase()}[${foundAttr}="${escapedValue}"]`;

          return pathParts.length === 0
            ? rootSelector
            : `${rootSelector} > ${pathParts.join(' > ')}`;
        }

        // Fallback to full path if no priority attribute ancestor found
        const path: string[] = [];
        current = element;
        while (current && current !== document.body) {
          const siblings = Array.from(current.parentElement?.children || []);
          const index = siblings.indexOf(current) + 1;
          path.unshift(`${current.tagName.toLowerCase()}:nth-child(${index})`);
          current = current.parentElement;
        }
        return path.join(' > ') || element.tagName.toLowerCase();
      };

      const buildCSSSelector = (element: Element): string => {
        // Priority 1: Check for priority attributes
        for (const attr of attrPriority) {
          const value = element.getAttribute(attr);
          if (value)
            return `${element.tagName.toLowerCase()}[${attr}="${escapeSelector(value)}"]`;
        }

        // Priority 2: Use ID if it's unique
        if (element.id) {
          const escapedId = escapeSelector(element.id);
          if (document.querySelectorAll(`#${escapedId}`).length === 1)
            return `#${escapedId}`;
        }

        // Priority 3: Use meaningful classes
        const meaningfulClasses = Array.from((element as HTMLElement).classList || [])
          .filter(c => !isNoiseClass(c))
          .map(c => escapeSelector(c));

        if (meaningfulClasses.length > 0) {
          const classSelector = `${element.tagName.toLowerCase()}.${meaningfulClasses.join('.')}`;
          if (document.querySelectorAll(classSelector).length <= 3)
            return classSelector;
        }

        // Priority 4: Generate nth-child path
        return generateNthPath(element);
      };

      return buildCSSSelector(el);
    });

    return cssSelector;
  } catch (e) {
    // Fallback to using the resolved selector if available
    try {
      const { resolvedSelector } = await (locator as any)._resolveSelector();
      return resolvedSelector || '';
    } catch {
      return '';
    }
  }
}

export async function callOnPageNoTrace<T>(page: playwright.Page, callback: (page: playwright.Page) => Promise<T>): Promise<T> {
  return await (page as any)._wrapApiCall(() => callback(page), { internal: true });
}
