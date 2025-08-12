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
const attrPriority = [
  'data-test-automation-id',
  'aria-label',
  'data-title',
  'name',
  'alt',
  'title',
  'role',
];
export class AiterElementUtils {
  private customGetSelector: ((el: Element) => string) | null = null;

  resetGetSelector(fn: (el: Element) => string) {
    this.customGetSelector = fn;
  }

  static escapeSelector(value: string): string {
    return CSS.escape(value);
  }

  static isNoiseClass(className: string): boolean {
    return (
      /^(?:js-|_|ng-|react-)/.test(className) ||
      className.length > 15 ||
      /\d{4,}/.test(className)
    );
  }

  static defaultGetSelector(el: HTMLElement) {
    for (const attr of attrPriority) {
      const value = el.getAttribute(attr);
      if (value)
        return `${el.tagName}[${attr}="${AiterElementUtils.escapeSelector(value)}"]`;
    }

    if (el.id) {
      const escapedId = AiterElementUtils.escapeSelector(el.id);
      if (document.querySelectorAll(`#${escapedId}`).length === 1)
        return `#${escapedId}`;

    }

    // const meaningfulClasses = Array.from(el.classList)
    //   .filter((c) => !AiterElementUtils.isNoiseClass(c))
    //   .map((c) => AiterElementUtils.escapeSelector(c));

    // if (meaningfulClasses.length > 0) {
    //   const classSelector = `${el.tagName.toLowerCase()}.${meaningfulClasses.join('.')}`;
    //   if (document.querySelectorAll(classSelector).length <= 3) {
    //     return classSelector;
    //   }
    // }

    return AiterElementUtils.generateNthPath(el);
  }

  getSelectorByPoint(x: number, y: number) {
    const el = document.elementFromPoint(x, y) as HTMLElement;
    if (el) {
      return this.customGetSelector
        ? this.customGetSelector(el)
        : AiterElementUtils.defaultGetSelector(el);
    }
    return '';
  }

  static generateNthPath(el: Element): string {
    let rootAncestor: Element | null = null;
    let current: Element | null = el;
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
      current = el;

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
      const escapedValue = AiterElementUtils.escapeSelector(attrValue);
      const rootSelector = `${rootAncestor.tagName.toLowerCase()}[${foundAttr}="${escapedValue}"]`;

      return pathParts.length === 0
        ? rootSelector
        : `${rootSelector} > ${pathParts.join(' > ')}`;
    }

    const path: string[] = [];
    current = el;
    while (current && current !== document.body) {
      const siblings = Array.from(current.parentElement?.children || []);
      const index = siblings.indexOf(current) + 1;
      path.unshift(`${current.tagName.toLowerCase()}:nth-child(${index})`);
      current = current.parentElement;
    }
    return path.join(' > ') || el.tagName.toLowerCase();
  }
}

export const aiterElementUtils = new AiterElementUtils();
