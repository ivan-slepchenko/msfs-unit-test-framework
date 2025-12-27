/**
 * Helper utilities for testing FSComponent components.
 * 
 * Provides utilities to render components, query DOM, and test component behavior.
 */

import { FSComponent, DisplayComponent, VNode } from '@microsoft/msfs-sdk';
import { TestEnvironment } from './TestEnvironment';

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
    ComponentClass: new (props: P) => DisplayComponent<P>,
    props: P
  ): { component: DisplayComponent<P>; element: HTMLElement; vnode: VNode } {
    // Create component instance
    const component = new ComponentClass(props);
    
    // Call onBeforeRender if exists
    if (component.onBeforeRender) {
      component.onBeforeRender();
    }
    
    // Render component
    const vnode = component.render();
    if (!vnode) {
      throw new Error('Component render() returned null');
    }

    // Render to DOM
    FSComponent.render(vnode, this.container);

    // Call onAfterRender if exists
    if (component.onAfterRender) {
      component.onAfterRender(vnode);
    }

    // Get the root element
    let element: HTMLElement;
    if (vnode.instance instanceof HTMLElement || vnode.instance instanceof SVGElement) {
      element = vnode.instance as HTMLElement;
    } else if (vnode.children && vnode.children.length > 0) {
      // Find first HTML element in children
      const findElement = (node: VNode): HTMLElement | null => {
        if (node.instance instanceof HTMLElement || node.instance instanceof SVGElement) {
          return node.instance as HTMLElement;
        }
        if (node.children) {
          for (const child of node.children) {
            const found = findElement(child);
            if (found) return found;
          }
        }
        return null;
      };
      const found = findElement(vnode);
      if (!found) {
        throw new Error('Could not find root element in rendered component');
      }
      element = found;
    } else {
      throw new Error('Component did not render any DOM element');
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
}

