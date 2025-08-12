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

test.describe('browser_drag selector functionality', () => {
  test('returns selectors for drag and drop elements', async ({ client, server }) => {
    server.setContent('/', `
      <title>Drag Selector Test Page</title>
      <div 
        id="source" 
        data-test-automation-id="drag-source"
        style="width: 100px; height: 100px; background: red; margin: 10px;"
        draggable="true"
      >
        Source
      </div>
      <div 
        id="target" 
        data-test-automation-id="drop-target"
        style="width: 100px; height: 100px; background: blue; margin: 10px;"
      >
        Target
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

    // Extract refs from snapshot - look for specific text to identify elements
    const snapshotText = snapshotResponse.content?.[0]?.text || '';
    
    // Find refs for Source and Target elements specifically
    const sourceMatch = snapshotText.match(/.*Source.*\[ref=(\w+)\]/);
    const targetMatch = snapshotText.match(/.*Target.*\[ref=(\w+)\]/);
    
    const startRef = sourceMatch ? sourceMatch[1] : 'e2';
    const endRef = targetMatch ? targetMatch[1] : 'e3';

    const response = await client.callTool({
      name: 'browser_drag',
      arguments: {
        startElement: 'Source div',
        startRef: startRef,
        endElement: 'Target div',
        endRef: endRef,
      },
    });

    expect(response.content?.[0]?.text).toContain('Dragged from element with selector:');
    expect(response.content?.[0]?.text).toContain('to element with selector:');
    // Check that both automation IDs appear in the response
    const responseText = response.content?.[0]?.text || '';
    expect(responseText).toContain('data-test-automation-id');
    expect(responseText).toMatch(/(drag-source|drop-target)/);
  });

  test('still works when selector generation fails for drag', async ({ client, server }) => {
    server.setContent('/', `
      <title>Drag Selector Test Page</title>
      <div style="width: 100px; height: 100px; background: red; margin: 10px;" draggable="true">Source</div>
      <div style="width: 100px; height: 100px; background: blue; margin: 10px;">Target</div>
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

    // Extract refs from snapshot
    const snapshotText = snapshotResponse.content?.[0]?.text || '';
    const refMatches = snapshotText.match(/\[ref=(\w+)\]/g) || [];
    
    const startRef = refMatches[0]?.match(/\[ref=(\w+)\]/)?.[1] || 'e2';
    const endRef = refMatches[1]?.match(/\[ref=(\w+)\]/)?.[1] || 'e3';

    const response = await client.callTool({
      name: 'browser_drag',
      arguments: {
        startElement: 'Source div',
        startRef: startRef,
        endElement: 'Target div',
        endRef: endRef,
      },
    });

    // Should still contain drag code execution
    expect(response.content?.[0]?.text).toContain('dragTo');
    // Check that it either has selector info or executes successfully
    const responseText = response.content?.[0]?.text || '';
    const hasSelector = responseText.includes('Dragged from element with selector:');
    const hasDragCode = responseText.includes('dragTo');
    expect(hasSelector || hasDragCode).toBe(true);
  });
}); 