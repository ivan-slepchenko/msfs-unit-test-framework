/**
 * Helper utilities for testing FSComponent components.
 * 
 * Provides utilities to render components, query DOM, and test component behavior.
 */

import { FSComponent, DisplayComponent, VNode } from '@microsoft/msfs-sdk';
import { TestEnvironment } from './TestEnvironment';


/**
 * Recursively matches VNodes to actual DOM nodes and fixes Ref pointers.
 * This effectively "heals" the disconnect caused by cloning/rebuilding during render.
 * 
 * This solves the "Ghost Reference" problem where refs point to initial
 * VNode instances instead of the final DOM nodes in the container.
 * 
 * This is Phase 2 of the ref reconciliation process. Phase 1 (direct DOM queries)
 * handles most cases efficiently. This function provides a fallback for complex
 * nested structures where position-based or attribute-based matching is needed.
 * 
 * Matching strategies (in order of preference):
 * 1. Position-based matching by tag name (fast, works for simple parent-child relationships)
 * 2. ID-based matching via querySelector (most reliable for deeply nested elements)
 * 3. Class-based matching via querySelector (fallback for elements without IDs)
 * 
 * @param vnode - The VNode to reconcile refs for
 * @param domNode - The corresponding DOM node
 * @param rootContainer - Root container element for ID-based lookups (optional, auto-detected)
 */
function reconcileRefs(vnode: any, domNode: Node | null, rootContainer?: Element): void {
  if (!vnode || !domNode) return;
  
  // Store root container for ID-based lookups of deeply nested elements
  if (!rootContainer && domNode instanceof Element) {
    rootContainer = domNode;
  }

  // 1. If this VNode has a ref, FORCE it to point to the real DOM node
  if (vnode.props?.ref && typeof vnode.props.ref === 'object' && 'instance' in vnode.props.ref) {
    // Only update if ref.instance is not already set to a valid element in the container
    // This preserves matches from the direct DOM walk (Phase 1)
    if (!vnode.props.ref.instance || !rootContainer || !rootContainer.contains(vnode.props.ref.instance)) {
      vnode.props.ref.instance = domNode;
      
      // If this VNode has an ID, try to find it in the root container as a fallback
      // This helps with deeply nested elements where position matching might fail
      if (vnode.props?.id && typeof vnode.props.id === 'string' && rootContainer) {
        const foundById = rootContainer.querySelector(`#${vnode.props.id}`);
        if (foundById && foundById !== domNode) {
          // Use the element found by ID if it's different (more reliable for nested elements)
          vnode.props.ref.instance = foundById;
        }
      }
    }
  }

  // 2. If this VNode tracks an internal instance, update that too (optional but safe)
  if (vnode.instance) {
    vnode.instance = domNode;
  }

  // 3. Recurse through children
  if (vnode.children && domNode instanceof Element) {
    // Flatten children array (handle nested arrays from .map() calls)
    const flattenChildren = (children: any[]): any[] => {
      const result: any[] = [];
      for (const child of children) {
        if (Array.isArray(child)) {
          result.push(...flattenChildren(child));
        } else if (child !== null && child !== undefined) {
          result.push(child);
        }
      }
      return result;
    };
    
    const vnodeChildren = Array.isArray(vnode.children) 
      ? flattenChildren(vnode.children)
      : [vnode.children].filter(c => c !== null && c !== undefined);
    
    if (vnodeChildren.length > 0) {
      // Get DOM children - we need both elements AND text nodes for accurate matching
      // because VNode children can include text nodes
      const allDomChildren = Array.from(domNode.childNodes);
      
      // Separate elements from text nodes for matching
      const domElementChildren = allDomChildren.filter(node => node.nodeType !== Node.TEXT_NODE) as Element[];
      
      // Also track text nodes for cases where VNode has text children
      const domTextChildren = allDomChildren.filter(node => node.nodeType === Node.TEXT_NODE);
      
      // Track both element and text indices separately
      let domElementIndex = 0;
      let domTextIndex = 0;
      
      for (const childVNode of vnodeChildren) {
        if (!childVNode) continue;

        // Handle text VNodes (strings/numbers) - these don't have refs
        if (typeof childVNode === 'string' || typeof childVNode === 'number') {
          // Text nodes don't need ref reconciliation, but we should advance text index
          // if there's a corresponding text node in DOM
          if (domTextIndex < domTextChildren.length) {
            domTextIndex++;
          }
          continue;
        }

        // Handle element VNodes (these can have refs)
        if (typeof childVNode === 'object' && childVNode.type && typeof childVNode.type === 'string') {
          let matchedDom: Node | null = null;
          let matchedIndex = -1;
          
          // Strategy 1: Position-based matching (works well for simple parent-child relationships)
          // Try this first for better performance and accuracy in common cases
          if (domElementIndex < domElementChildren.length) {
            const candidate = domElementChildren[domElementIndex];
            // Match by tag name - this is reliable for simple parent-child relationships
            if (candidate.tagName.toLowerCase() === childVNode.type.toLowerCase()) {
              matchedDom = candidate;
              matchedIndex = domElementIndex;
            }
          }
          
          // Strategy 2: ID-based matching (most reliable for deeply nested elements)
          // Use this when position-based fails or when we have an ID
          if (!matchedDom && childVNode.props?.id && typeof childVNode.props.id === 'string' && rootContainer) {
            const foundById: Element | null = rootContainer.querySelector(`#${childVNode.props.id}`);
            if (foundById && domNode.contains(foundById)) {
              matchedDom = foundById;
              matchedIndex = domElementChildren.indexOf(foundById);
            }
          }
          
          // Strategy 3: Class-based matching (fallback for elements without IDs)
          // Only use if position and ID matching both failed
          if (!matchedDom && childVNode.props?.class && domNode instanceof Element) {
            let classNames: string[] = [];
            
            if (typeof childVNode.props.class === 'string') {
              classNames = childVNode.props.class.split(/\s+/).filter((c: string) => c.length > 0);
            } else if (typeof childVNode.props.class === 'object' && childVNode.props.class !== null) {
              classNames = Object.keys(childVNode.props.class).filter(k => childVNode.props.class[k]);
            }
            
            if (classNames.length > 0) {
              const primaryClass = classNames[0];
              // Build selector with tag name if available (more specific = better match)
              const selector = childVNode.type 
                ? `${childVNode.type}.${primaryClass}` 
                : `.${primaryClass}`;
              
              // Search within current subtree only
              const foundByClass: Element | null = domNode.querySelector(selector);
              if (foundByClass) {
                // Verify tag name matches if specified
                if (!childVNode.type || foundByClass.tagName.toLowerCase() === childVNode.type.toLowerCase()) {
                  // Verify it's actually a child/descendant of domNode
                  const parent: Node | null = foundByClass.parentNode;
                  if (parent === domNode || (parent && domNode.contains(parent))) {
                    const indexInChildren = domElementChildren.indexOf(foundByClass);
                    if (indexInChildren >= 0) {
                      matchedDom = foundByClass;
                      matchedIndex = indexInChildren;
                    }
                  }
                }
              }
            }
          }
          
          if (matchedDom && matchedIndex >= 0) {
            // Recursively fix the child
            reconcileRefs(childVNode, matchedDom, rootContainer);
            // Advance past the matched node
            domElementIndex = matchedIndex + 1;
          } else if (domElementIndex < domElementChildren.length) {
            // Last resort: use next element if tag matches
            const fallback = domElementChildren[domElementIndex];
            // Only use fallback if tag name matches (safer than blind matching)
            if (!childVNode.type || fallback.tagName.toLowerCase() === childVNode.type.toLowerCase()) {
              reconcileRefs(childVNode, fallback, rootContainer);
              domElementIndex++;
            }
            // If tag doesn't match, skip this VNode to avoid incorrect ref assignments
          }
        }
        // Text VNodes (strings/numbers) don't have refs, so we skip them
        // They're handled when we recurse into their parent element
      }
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
    // Two-phase approach solves the "Ghost Reference" problem:
    // 
    // Phase 1: Direct DOM queries (fast, reliable)
    //   - Collect all refs from VNode tree
    //   - Match by ID using querySelector (most reliable)
    //   - Match by class+tag for elements without IDs
    //   - This handles 90%+ of cases efficiently
    //
    // Phase 2: Recursive VNode-to-DOM matching (comprehensive fallback)
    //   - Handles complex nested structures
    //   - Uses position, ID, and class-based matching strategies
    //   - Ensures no refs are left unset
    
    // Phase 1: Collect all refs and match them directly to DOM elements
    const refsMap = new Map<any, any>();
    const collectRefs = (vnode: any): void => {
      if (!vnode) return;
      if (vnode.props?.ref && typeof vnode.props.ref === 'object' && 'instance' in vnode.props.ref) {
        refsMap.set(vnode.props.ref, vnode);
      }
      if (vnode.children) {
        const children = Array.isArray(vnode.children) ? vnode.children : [vnode.children];
        children.forEach((child: any) => {
          if (child && typeof child === 'object') {
            collectRefs(child);
          }
        });
      }
    };
    collectRefs(vnode);
    
    // Match refs to DOM elements using querySelector (more reliable than walking)
    // This direct DOM query approach is faster and more accurate than position-based matching
    refsMap.forEach((vnode, ref) => {
      // Skip if ref is already correctly set (from a previous match)
      // Check if ref.instance is a valid Node and is in the container
      if (ref.instance && ref.instance instanceof Node) {
        try {
          if (this.container.contains(ref.instance)) {
            return; // Ref is already correctly set
          }
        } catch (e) {
          // If contains() fails, the ref is definitely not in the container, continue matching
        }
      }
      
      // Strategy 1: Match by ID first (most reliable - IDs are unique)
      if (vnode.props?.id && typeof vnode.props.id === 'string') {
        const found = this.container.querySelector(`#${vnode.props.id}`);
        if (found) {
          // Verify tag name matches if specified (extra safety check)
          if (!vnode.type || found.tagName.toLowerCase() === vnode.type.toLowerCase()) {
            ref.instance = found;
            return; // ID match is definitive, no need to try class matching
          }
        }
      }
      
      // Strategy 2: Match by class (for elements without IDs)
      // This is less reliable since classes aren't unique, but works for most test cases
      if (vnode.props?.class) {
        let classNames: string[] = [];
        
        if (typeof vnode.props.class === 'string') {
          // Split by spaces and filter empty strings
          classNames = vnode.props.class.split(/\s+/).filter((c: string) => c.length > 0);
        } else if (typeof vnode.props.class === 'object' && vnode.props.class !== null) {
          // Handle class object: { 'class-name': true, 'other-class': false }
          classNames = Object.keys(vnode.props.class).filter(k => vnode.props.class[k]);
        }
        
        if (classNames.length > 0) {
          // Use the first class for selector (most specific)
          const primaryClass = classNames[0];
          
          // Build selector with tag name if available (more specific = better match)
          const selector = vnode.type 
            ? `${vnode.type}.${primaryClass}` 
            : `.${primaryClass}`;
          
          const found = this.container.querySelector(selector);
          
          if (found) {
            // Verify tag name matches if specified
            if (!vnode.type || found.tagName.toLowerCase() === vnode.type.toLowerCase()) {
              // Additional verification: check if all classes match (if multiple classes)
              if (classNames.length === 1 || classNames.every(cn => found.classList.contains(cn))) {
                ref.instance = found;
                return;
              }
            }
          }
        }
      }
      
      // If neither ID nor class matching worked, Phase 2 (reconcileRefs) will handle it
      // This ensures we don't leave any refs unset
    });
    
    // Phase 2: Recursive VNode-to-DOM matching for any remaining cases
    reconcileRefs(vnode, element, this.container);

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

