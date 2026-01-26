/**
 * HTM (Hyperscript Tagged Markup) binding for Preact
 * 
 * Usage:
 *   import { html } from '../lib/htm.js';
 *   
 *   function MyComponent({ name }) {
 *     return html`<div class="greeting">Hello, ${name}!</div>`;
 *   }
 */

import { h, Fragment } from 'preact';
import htm from 'htm';

// Bind htm to Preact's h function
export const html = htm.bind(h);

// Re-export Fragment for convenience
export { Fragment };

// Re-export h for cases where direct createElement is needed
export { h };
