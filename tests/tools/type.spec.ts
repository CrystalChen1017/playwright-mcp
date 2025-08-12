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

test.describe('browser_type selector functionality', () => {
  test('returns selector for input element with name attribute', async ({ client, server }) => {
    server.setContent('/', `
      <title>Type Selector Test Page</title>
      <form>
        <input type="text" name="username" placeholder="Enter username">
      </form>
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
      name: 'browser_type',
      arguments: {
        element: 'Username input',
        ref: ref,
        text: 'testuser',
      },
    });

    expect(response.content?.[0]?.text).toContain('Typed text into element with selector:');
    expect(response.content?.[0]?.text).toContain('[name="username"]');
  });

  test('returns selector for input element with data-test-automation-id', async ({ client, server }) => {
    server.setContent('/', `
      <title>Type Selector Test Page</title>
      <form>
        <input type="email" data-test-automation-id="email-input" placeholder="Enter email">
      </form>
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
      name: 'browser_type',
      arguments: {
        element: 'Email input',
        ref: ref,
        text: 'test@example.com',
      },
    });

    expect(response.content?.[0]?.text).toContain('Typed text into element with selector:');
    expect(response.content?.[0]?.text).toContain('[data-test-automation-id="email-input"]');
  });

  test('returns selector with submit functionality', async ({ client, server }) => {
    server.setContent('/', `
      <title>Type Selector Test Page</title>
      <form>
        <input type="text" name="search" placeholder="Search...">
      </form>
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
      name: 'browser_type',
      arguments: {
        element: 'Search input',
        ref: ref,
        text: 'test query',
        submit: true,
      },
    });

    expect(response.content?.[0]?.text).toContain('Typed text into element with selector:');
    expect(response.content?.[0]?.text).toContain('[name="search"]');
    // Should also contain the typing and submit code
    expect(response.content?.[0]?.text).toContain('fill(');
    expect(response.content?.[0]?.text).toContain('press(\'Enter\')');
  });

  test('still works when selector generation fails', async ({ client, server }) => {
    server.setContent('/', `
      <title>Type Selector Test Page</title>
      <input type="text" placeholder="Simple input">
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
      name: 'browser_type',
      arguments: {
        element: 'Text input',
        ref: ref,
        text: 'test text',
      },
    });

    // Should still contain the normal type code execution
    expect(response.content?.[0]?.text).toContain('fill(');
    // Check that it either has selector info or executes successfully
    const responseText = response.content?.[0]?.text || '';
    const hasSelector = responseText.includes('Typed text into element with selector:');
    const hasTypeCode = responseText.includes('fill(');
    expect(hasSelector || hasTypeCode).toBe(true);
  });
}); 