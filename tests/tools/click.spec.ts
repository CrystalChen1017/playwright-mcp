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

import { test, expect } from '../fixtures.js';

test.describe('browser_click selector functionality', () => {
  test('returns selector for element with data-test-automation-id', async ({ client, server }) => {
    server.setContent('/', `
      <title>Selector Test Page</title>
      <button data-test-automation-id="submit-btn" id="submit">Submit</button>
    `, 'text/html');

    await client.callTool({
      name: 'browser_navigate',
      arguments: { url: server.PREFIX },
    });

    // First get snapshot to see available refs
    const snapshotResponse = await client.callTool({
      name: 'browser_snapshot',
      arguments: {},
    });

    // Extract ref from snapshot (typically first clickable element will be e2)
    const snapshotText = snapshotResponse.content?.[0]?.text || '';
    const refMatch = snapshotText.match(/\[ref=(\w+)\]/);
    const ref = refMatch ? refMatch[1] : 'e2';

    const response = await client.callTool({
      name: 'browser_click',
      arguments: {
        element: 'Submit button',
        ref: ref,
      },
    });

    expect(response.content?.[0]?.text).toContain('Clicked element with selector:');
    expect(response.content?.[0]?.text).toContain('[data-test-automation-id="submit-btn"]');
  });

  test('returns selector for element with aria-label', async ({ client, server }) => {
    server.setContent('/', `
      <title>Selector Test Page</title>
      <div aria-label="Close dialog" role="button" onclick="console.log('clicked')">X</div>
    `, 'text/html');

    await client.callTool({
      name: 'browser_navigate',
      arguments: { url: server.PREFIX },
    });

    // First get snapshot to see available refs
    const snapshotResponse = await client.callTool({
      name: 'browser_snapshot',
      arguments: {},
    });

    // Extract ref from snapshot
    const snapshotText = snapshotResponse.content?.[0]?.text || '';
    const refMatch = snapshotText.match(/\[ref=(\w+)\]/);
    const ref = refMatch ? refMatch[1] : 'e2';

    const response = await client.callTool({
      name: 'browser_click',
      arguments: {
        element: 'Close button',
        ref: ref,
      },
    });

    expect(response.content?.[0]?.text).toContain('Clicked element with selector:');
    // The selector might have escaped quotes or different format
    expect(response.content?.[0]?.text).toMatch(/aria-label.*Close.*dialog/);
  });

  test('still works when selector generation fails', async ({ client, server }) => {
    server.setContent('/', `
      <title>Selector Test Page</title>
      <button>Submit</button>
    `, 'text/html');

    await client.callTool({
      name: 'browser_navigate',
      arguments: { url: server.PREFIX },
    });

    // First get snapshot to see available refs
    const snapshotResponse = await client.callTool({
      name: 'browser_snapshot',
      arguments: {},
    });

    // Extract ref from snapshot
    const snapshotText = snapshotResponse.content?.[0]?.text || '';
    const refMatch = snapshotText.match(/\[ref=(\w+)\]/);
    const ref = refMatch ? refMatch[1] : 'e2';

    const response = await client.callTool({
      name: 'browser_click',
      arguments: {
        element: 'Submit button',
        ref: ref,
      },
    });

    // Should still contain the normal click code execution
    expect(response.content?.[0]?.text).toContain('button');
    // Check that it either has selector info or executes successfully
    const responseText = response.content?.[0]?.text || '';
    const hasSelector = responseText.includes('Clicked element with selector:');
    const hasClickCode = responseText.includes('page.') && responseText.includes('.click');
    expect(hasSelector || hasClickCode).toBe(true);
  });
}); 