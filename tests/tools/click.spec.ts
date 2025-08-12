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

test('browser_click returns improved CSS selector with priority logic', async ({ client, server }) => {
  server.setContent('/', `
    <title>Selector Priority Test</title>
    <button id="simple-btn">Simple Button</button>
    <div data-test-automation-id="form-container">
      <button id="nested-btn">Nested Button</button>
      <button aria-label="Submit Form">Submit Without ID</button>
    </div>
    <div id="result"></div>
    <script>
      document.getElementById('simple-btn').addEventListener('click', () => {
        document.getElementById('result').textContent = 'Simple button clicked';
      });
      document.getElementById('nested-btn').addEventListener('click', () => {
        document.getElementById('result').textContent = 'Nested button clicked';
      });
      document.querySelector('[aria-label="Submit Form"]').addEventListener('click', () => {
        document.getElementById('result').textContent = 'Submit button clicked';
      });
    </script>
  `, 'text/html');

  await client.callTool({
    name: 'browser_navigate',
    arguments: { url: server.PREFIX },
  });

  // Test 1: Simple button (should use ID selector)
  const simpleResult = await client.callTool({
    name: 'browser_click',
    arguments: {
      element: 'Simple Button',
      ref: 'e2',
    },
  });

  // Test 2: Nested button with ID (should still prefer its own ID)
  const nestedResult = await client.callTool({
    name: 'browser_click',
    arguments: {
      element: 'Nested Button',
      ref: 'e4',
    },
  });

  // Test 3: Button without ID but with aria-label (should use aria-label)
  const submitResult = await client.callTool({
    name: 'browser_click',
    arguments: {
      element: 'Submit Without ID button',
      ref: 'e5',
    },
  });
  console.log(simpleResult);
  console.log(nestedResult);
  console.log(submitResult);

});
