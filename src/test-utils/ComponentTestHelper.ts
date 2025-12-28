/**
 * Helper utilities for testing FSComponent components.
 * 
 * Provides utilities to render components, query DOM, and test component behavior.
 */

import { FSComponent, DisplayComponent, VNode } from '@microsoft/msfs-sdk';
import { TestEnvironment } from './TestEnvironment';

/**
 * Recursively matches VNodes to actual DOM nodes and fixes Ref pointers.
 * This effectively "heals" the disconnect caused by cloning/rebuilding.
 * 
 * This solves the "Ghost Reference" problem where refs point to initial
 * VNode instances instead of the final DOM nodes in the container.
 */
function reconcileRefs(vnode: any, domNode: Node | null): void {
  if (!vnode || !domNode) return;

  // 1. If this VNode has a ref, FORCE it to point to the real DOM node
  if (vnode.props?.ref && typeof vnode.props.ref === 'object' && 'instance' in vnode.props.ref) {
    // This is the magic fix: overwrite the stale instance with the real one
    vnode.props.ref.instance = domNode;
  }

  // 2. If this VNode tracks an internal instance, update that too (optional but safe)
  if (vnode.instance) {
    vnode.instance = domNode;
  }

  // 3. Recurse through children
  // We must handle cases where VNodes have children but the DOM might have extra text/comment nodes
  if (vnode.children && Array.isArray(vnode.children) && vnode.children.length > 0 && domNode instanceof Element) {
    
    // Get real DOM element children
    // Filter to skip pure whitespace text nodes if VNode tree doesn't track them
    const domChildren = Array.from(domNode.childNodes).filter(node => {
      if (node.nodeType === Node.TEXT_NODE) {
        // Keep text nodes only if they have non-whitespace content
        return node.textContent?.trim().length! > 0;
      }
      // Keep all element nodes
      return true;
    });

    let domIndex = 0;
    
    for (const childVNode of vnode.children) {
      if (!childVNode) continue;

      // Skip non-VNode children (strings, numbers, nulls)
      if (typeof childVNode !== 'object') {
        // For text nodes, we might need to advance domIndex
        // But typically text VNodes are handled differently
        continue;
      }

      // Ensure we don't run out of DOM nodes
      if (domIndex >= domChildren.length) break;

      const currentDom = domChildren[domIndex];

      // Recursively fix the child
      reconcileRefs(childVNode, currentDom);

      domIndex++;
    }
  }
}

export class ComponentTestHelper {
  private env: TestEnvironment;
  private container: HTMLElement;

  constructor(env: TestEnvironment) {
    this.env = env;
    this.container = env.getDocument().createElement('div');
    env.getDocument().body.appendChild(this.container);
  }

  /**
   * Render a component to DOM
   */
  renderComponent<P>(
    ComponentClass: new (props: P) => any, // Use 'any' to avoid version conflicts
    props: P
  ): { component: any; element: HTMLElement; vnode: VNode } {
    // Create component instance
    const component = new ComponentClass(props);
    
    // Call onBeforeRender if exists
    if (component.onBeforeRender) {
      component.onBeforeRender();
    }
    
    // Render component - this creates the VNode structure
    const vnode = component.render();
    if (!vnode) {
      throw new Error('Component render() returned null');
    }

    // Render to DOM - this is when refs get populated and elements are added to container
    FSComponent.render(vnode, this.container);

    // Get the root element from the container (NOT from vnode.instance)
    // After FSComponent.render(), elements may have been cloned/adopted, so vnode.instance
    // might point to the old element. The actual rendered element is in the container.
    const element = this.container.firstElementChild as HTMLElement;
    if (!element) {
      throw new Error('Component did not render any DOM element to container');
    }

    // FIX: Reconcile the Refs!
    // We match the VNode tree (which holds the user's refs) to the Container's first child
    // This "heals" the disconnect caused by cloning/rebuilding during render
    reconcileRefs(vnode, element);

    // Call onAfterRender AFTER the VNode is in the DOM and refs are populated AND reconciled
    // This matches the MSFS SDK lifecycle - onAfterRender is called after render is complete
    // Now when onAfterRender runs, all refs (including child refs) point to the correct DOM nodes!
    if (component.onAfterRender) {
      component.onAfterRender(vnode);
    }

    return { component, element, vnode };
  }

  /**
   * Query selector within container
   */
  querySelector(selector: string): Element | null {
    return this.container.querySelector(selector);
  }

  /**
   * Query selector all within container
   */
  querySelectorAll(selector: string): NodeListOf<Element> {
    return this.container.querySelectorAll(selector);
  }

  /**
   * Get container element
   */
  getContainer(): HTMLElement {
    return this.container;
  }

  /**
   * Clean up - remove container from DOM
   */
  cleanup(): void {
    if (this.container.parentNode) {
      this.container.parentNode.removeChild(this.container);
    }
  }

  /**
   * Wait for async updates (useful for Subject subscriptions)
   */
  async waitForUpdate(ms: number = 10): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Get text content of element
   */
  getTextContent(selector: string): string | null {
    const element = this.querySelector(selector);
    return element ? element.textContent : null;
  }

  /**
   * Check if element has class
   */
  hasClass(selector: string, className: string): boolean {
    const element = this.querySelector(selector);
    return element ? element.classList.contains(className) : false;
  }

  /**
   * Get attribute value
   */
  getAttribute(selector: string, attrName: string): string | null {
    const element = this.querySelector(selector);
    return element ? element.getAttribute(attrName) : null;
  }

  /**
   * Get computed style property
   */
  getStyle(selector: string, property: string): string {
    const element = this.querySelector(selector);
    if (!element) return '';
    const style = this.env.getWindow().getComputedStyle(element as HTMLElement);
    return style.getPropertyValue(property);
  }

  /**
   * Query SVG element by selector
   */
  querySelectorSVG(selector: string): SVGElement | null {
    const element = this.querySelector(selector);
    // Check if it's an SVG element - use namespace or tagName check
    if (!element) return null;
    if (element instanceof SVGElement) return element;
    // Fallback: check if namespaceURI is SVG namespace
    if ((element as any).namespaceURI === 'http://www.w3.org/2000/svg') {
      return element as unknown as SVGElement;
    }
    return null;
  }

  /**
   * Query all SVG elements by selector
   */
  querySelectorAllSVG(selector: string): SVGElement[] {
    const elements = this.querySelectorAll(selector);
    // Filter to only SVG elements - check namespace or instanceof
    const svgElements: SVGElement[] = [];
    elements.forEach(el => {
      if (el instanceof SVGElement) {
        svgElements.push(el);
      } else if ((el as any).namespaceURI === 'http://www.w3.org/2000/svg') {
        // In jsdom, SVG elements have the correct namespace but may not be instanceof SVGElement
        svgElements.push(el as unknown as SVGElement);
      }
    });
    return svgElements;
  }

  /**
   * Get SVG attribute value
   */
  getSVGAttribute(selector: string, attrName: string): string | null {
    const element = this.querySelectorSVG(selector);
    return element ? element.getAttribute(attrName) : null;
  }

  /**
   * Check if SVG element exists and has specific attribute value
   */
  hasSVGAttribute(selector: string, attrName: string, value: string): boolean {
    const element = this.querySelectorSVG(selector);
    if (!element) return false;
    return element.getAttribute(attrName) === value;
  }
}

