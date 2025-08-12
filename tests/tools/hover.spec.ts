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

test.describe('browser_hover selector functionality', () => {
  test('returns selector for hovered element', async ({ client, server }) => {
    server.setContent('/', `
      <title>Hover Selector Test Page</title>
      <button 
        data-test-automation-id="hover-button"
        onmouseover="console.log('hovered')"
        style="padding: 10px;"
      >
        Hover Me
      </button>
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
      name: 'browser_hover',
      arguments: {
        element: 'Hover button',
        ref: ref,
      },
    });

    expect(response.content?.[0]?.text).toContain('Hovered over element with selector:');
    expect(response.content?.[0]?.text).toContain('[data-test-automation-id="hover-button"]');
  });

  test('returns selector for element with aria-label on hover', async ({ client, server }) => {
    server.setContent('/', `
      <title>Hover Selector Test Page</title>
      <div 
        aria-label="Information tooltip"
        onmouseover="console.log('tooltip hovered')"
        style="padding: 10px; background: lightblue;"
      >
        ℹ️ Info
      </div>
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
      name: 'browser_hover',
      arguments: {
        element: 'Info tooltip',
        ref: ref,
      },
    });

    expect(response.content?.[0]?.text).toContain('Hovered over element with selector:');
    expect(response.content?.[0]?.text).toMatch(/aria-label.*Information.*tooltip/);
  });

  test('still works when selector generation fails for hover', async ({ client, server }) => {
    server.setContent('/', `
      <title>Hover Selector Test Page</title>
      <span style="padding: 10px;">Simple span</span>
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
      name: 'browser_hover',
      arguments: {
        element: 'Simple span',
        ref: ref,
      },
    });

    // Should still contain hover code execution
    expect(response.content?.[0]?.text).toContain('hover');
    // Check that it either has selector info or executes successfully
    const responseText = response.content?.[0]?.text || '';
    const hasSelector = responseText.includes('Hovered over element with selector:');
    const hasHoverCode = responseText.includes('hover');
    expect(hasSelector || hasHoverCode).toBe(true);
  });
}); 