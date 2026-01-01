/**
 * SDK Adapter for Jest testing
 * 
 * Provides mock implementations of MSFS SDK classes for testing.
 * This allows components to be tested without the full SDK bundle.
 * 
 * NOTE: We don't re-export types from @microsoft/msfs-types because
 * they are declaration files and not modules. Types are resolved
 * through TypeScript's type resolution.
 */

// Mock DisplayComponent
export abstract class DisplayComponent<P = any, S = any> {
  public props: P;
  public state?: S;

  constructor(props: P) {
    this.props = props;
  }

  public onBeforeRender?(): void;
  public abstract render(): any;
  public onAfterRender(vnode?: any): void {
    // Default implementation - can be overridden
  }
  public destroy(): void {
    // Default implementation - can be overridden
  }
}

// Mock FSComponent
// Use the global FSComponent that was set up by MSFSGlobals
// This ensures JSX transformation and runtime use the same implementation
// Note: MSFSGlobals sets up FSComponent before this module is imported
const globalFSComponent = (globalThis as any).FSComponent;

// Export the global FSComponent if available, otherwise use fallback
// (This should not happen if setupTests.ts runs correctly)
export const FSComponent = globalFSComponent || {
  buildComponent: (type: any, props: any, ...children: any[]): any => {
    // If it's a string (HTML/SVG tag), create a VNode structure
    if (typeof type === 'string') {
      const doc = (globalThis as any).document;
      if (!doc) {
        return { type, props, children };
      }

      // Create actual DOM element
      let element: HTMLElement | SVGElement;
      if (type === 'svg' || ['g', 'circle', 'text', 'line', 'polygon', 'path', 'rect', 'ellipse', 'polyline', 'defs', 'use', 'clipPath', 'mask', 'pattern', 'linearGradient', 'radialGradient', 'stop', 'filter', 'feGaussianBlur', 'feColorMatrix', 'feOffset', 'feMerge', 'feMergeNode'].includes(type)) {
        element = doc.createElementNS('http://www.w3.org/2000/svg', type);
      } else {
        element = doc.createElement(type);
      }

      // Handle ref first (before processing other props)
      let ref: any = null;
      if (props && props.ref) {
        ref = props.ref;
      }

      // Apply props
      if (props) {
        Object.keys(props).forEach(key => {
          if (key === 'key' || key === 'ref') {
            // Skip these - ref is handled separately
            return;
          }
          
          const value = props[key];
          if (value === null || value === undefined) {
            return;
          }

          // For SVG elements, always use setAttribute
          if (element instanceof SVGElement) {
            if (key === 'class') {
              element.setAttribute('class', String(value));
            } else {
              element.setAttribute(key, String(value));
            }
          } else {
            // For HTML elements
            if (key === 'class') {
              (element as HTMLElement).className = String(value);
            } else if (key.startsWith('data-')) {
              element.setAttribute(key, String(value));
            } else {
              // Try to set as property first, fallback to attribute
              try {
                (element as any)[key] = value;
              } catch {
                element.setAttribute(key, String(value));
              }
            }
          }
        });
      }

      // Set ref.instance after element is created and props are applied
      if (ref && typeof ref === 'object' && 'instance' in ref) {
        ref.instance = element;
      }

      // Process children - recursively build VNodes into DOM nodes
      // Children from JSX transformation are already VNodes (results of buildComponent calls)
      const processChildren = (childList: any[]): void => {
        childList.forEach(child => {
          if (child === null || child === undefined) {
            return; // Skip JSX comments and null children
          }
          
          // String/number children become text nodes
          if (typeof child === 'string' || typeof child === 'number') {
            element.appendChild(doc.createTextNode(String(child)));
            return;
          }
          
          if (child && typeof child === 'object') {
            // If child is already a DOM Node, append directly
            if (child instanceof Node) {
              element.appendChild(child);
              return;
            }
            
            // If child is a VNode with an instance (already built), append the instance
            if (child.instance && child.instance instanceof Node) {
              element.appendChild(child.instance);
              return;
            }
            
            // If child is a VNode with a type, build it
            if (child.type) {
              // Extract children from VNode, filtering null/undefined (JSX comments)
              const vnodeChildren: any[] = [];
              if (Array.isArray(child.children)) {
                vnodeChildren.push(...child.children.filter((c: any) => c !== null && c !== undefined));
              } else if (child.children !== null && child.children !== undefined) {
                vnodeChildren.push(child.children);
              }
              
              // Build the child VNode - this will create the DOM element
              const built = FSComponent.buildComponent(child.type, child.props || {}, ...vnodeChildren);
              
              // Append the built element's instance
              if (built && built.instance && built.instance instanceof Node) {
                element.appendChild(built.instance);
              } else if (built && built.type) {
                // If still a VNode, recursively process
                const processedChildren: any[] = [];
                if (Array.isArray(built.children)) {
                  processedChildren.push(...built.children.filter((c: any) => c !== null && c !== undefined));
                } else if (built.children !== null && built.children !== undefined) {
                  processedChildren.push(built.children);
                }
                const processed = FSComponent.buildComponent(built.type, built.props || {}, ...processedChildren);
                if (processed && processed.instance && processed.instance instanceof Node) {
                  element.appendChild(processed.instance);
                }
              }
              return;
            }
            
            // If child is an array, process recursively
            if (Array.isArray(child)) {
              processChildren(child);
              return;
            }
          }
        });
      };

      if (children && children.length > 0) {
        processChildren(children);
      }

      return {
        type,
        props,
        children,
        instance: element
      };
    }

    // If it's a function (component), instantiate it
    if (typeof type === 'function') {
      const component = new type(props);
      const renderResult = component.render();
      if (renderResult) {
        return renderResult;
      }
      return { type, props, children, instance: null };
    }

    return { type, props, children };
  },
  render: (vnode: any, container: HTMLElement): void => {
    if (!vnode) return;

    const targetDoc = container.ownerDocument || (globalThis as any).document;
    if (!targetDoc) return;

    // Helper to safely adopt or clone a node into the target document
    const adoptOrCloneNode = (node: Node): Node => {
      // Check if node is already in the target document
      if (node.ownerDocument === targetDoc) {
        return node;
      }
      
      // Try to adopt the node (works in real browsers, may not work in jsdom)
      try {
        if (targetDoc.adoptNode) {
          return targetDoc.adoptNode(node);
        }
      } catch (e) {
        // If adoptNode fails, clone the node
      }
      
      // Clone the node and its children recursively
      return node.cloneNode(true);
    };

    // Helper to safely append a node to a parent
    const safeAppendChild = (parent: Node, child: Node): void => {
      try {
        parent.appendChild(child);
      } catch (e) {
        // If appendChild fails (e.g., cross-document issue), try to adopt/clone first
        const adoptedChild = adoptOrCloneNode(child);
        parent.appendChild(adoptedChild);
      }
    };

    // Helper to re-establish refs after node manipulation
    // This ensures refs point to the correct DOM nodes after cloning/adopting
    const reestablishRefs = (vnode: any, domNode: Node): void => {
      if (!vnode || !domNode) return;
      
      // Update VNode instance to point to the new DOM node
      vnode.instance = domNode;
      
      // If this VNode has a ref in props, update it to point to the DOM node
      if (vnode.props && vnode.props.ref && typeof vnode.props.ref === 'object' && 'instance' in vnode.props.ref) {
        vnode.props.ref.instance = domNode;
      }
      
      // Also check if the built VNode has refs that need updating
      if (vnode.instance === domNode && vnode.props && vnode.props.ref) {
        // This is the original instance, ref should already be set, but ensure it's correct
        if (typeof vnode.props.ref === 'object' && 'instance' in vnode.props.ref) {
          vnode.props.ref.instance = domNode;
        }
      }
      
      // Recursively process children - match VNode children with DOM child nodes
      if (vnode.children && domNode instanceof Element) {
        const childNodes = Array.from(domNode.childNodes).filter(n => n instanceof Element);
        const vnodeChildren = Array.isArray(vnode.children) 
          ? vnode.children.filter((c: any) => c && (c.type || c.instance)) 
          : (vnode.children && (vnode.children.type || vnode.children.instance) ? [vnode.children] : []);
        
        // Match VNode children with DOM nodes by position
        vnodeChildren.forEach((childVNode: any, vnodeIndex: number) => {
          if (!childVNode) return;
          
          // Find corresponding DOM node
          // For elements, try to match by type/position
          let domChild: Node | null = null;
          
          if (childVNode.instance && childVNode.instance instanceof Node) {
            // VNode has an instance - find it in the DOM tree
            for (const node of childNodes) {
              if (node === childVNode.instance || 
                  (node instanceof Element && childVNode.instance instanceof Element &&
                   node.tagName === childVNode.instance.tagName &&
                   node.getAttribute('id') === childVNode.instance.getAttribute('id'))) {
                domChild = node;
                break;
              }
            }
          } else if (vnodeIndex < childNodes.length) {
            // Fallback: match by position
            domChild = childNodes[vnodeIndex];
          }
          
          if (domChild) {
            reestablishRefs(childVNode, domChild);
          }
        });
      }
    };

    // Recursively build and render VNode tree
    const renderVNode = (node: any): Node | null => {
      if (!node) return null;

      // If it's already a DOM node, adopt/clone it
      if (node instanceof Node) {
        return adoptOrCloneNode(node);
      }

      // If it has an instance, adopt/clone it and re-establish refs
      if (node.instance && node.instance instanceof Node) {
        const adoptedNode = adoptOrCloneNode(node.instance);
        reestablishRefs(node, adoptedNode);
        return adoptedNode;
      }

      // If it's a string or number, create text node
      if (typeof node === 'string' || typeof node === 'number') {
        return targetDoc.createTextNode(String(node));
      }

      // If it's an array, process each element
      if (Array.isArray(node)) {
        const fragment = targetDoc.createDocumentFragment();
        node.forEach(child => {
          const childNode = renderVNode(child);
          if (childNode) {
            safeAppendChild(fragment, childNode);
          }
        });
        return fragment;
      }

      // Build component from VNode
      if (node.type) {
        // If VNode already has an instance (from initial buildComponent), use it directly
        // This preserves refs that were set during the initial build
        if (node.instance && node.instance instanceof Node) {
          const adoptedNode = adoptOrCloneNode(node.instance);
          // Re-establish refs to point to the adopted/cloned node
          reestablishRefs(node, adoptedNode);
          return adoptedNode;
        }
        
        // Otherwise, build it fresh (shouldn't happen in normal flow, but handle it)
        // Pass children directly to buildComponent - it will handle VNodes, Nodes, strings, etc.
        // Filter out null/undefined (from JSX comments)
        const children = (node.children || []).filter((child: any) => child !== null && child !== undefined);
        
        const built = FSComponent.buildComponent(node.type, node.props || {}, ...children);
        
        // If built has instance, adopt/clone it and re-establish refs
        if (built && built.instance && built.instance instanceof Node) {
          const adoptedNode = adoptOrCloneNode(built.instance);
          reestablishRefs(built, adoptedNode);
          return adoptedNode;
        }

        // If built is a VNode without instance, recursively process it
        if (built && built.type && !built.instance) {
          return renderVNode(built);
        }

        // If built has children but no instance, process children into a fragment
        if (built && built.children && Array.isArray(built.children)) {
          const fragment = targetDoc.createDocumentFragment();
          built.children.forEach((child: any) => {
            // If child is already a Node, append it
            if (child instanceof Node) {
              safeAppendChild(fragment, adoptOrCloneNode(child));
            } else {
              // Otherwise process as VNode
              const childNode = renderVNode(child);
              if (childNode) {
                safeAppendChild(fragment, childNode);
              }
            }
          });
          return fragment;
        }
      }

      return null;
    };

    const rootNode = renderVNode(vnode);
    if (rootNode) {
      safeAppendChild(container, rootNode);
      // Re-establish all refs in the tree after everything is in the DOM
      // This ensures refs point to the final DOM nodes (after any cloning/adopting)
      reestablishRefs(vnode, rootNode);
    }
  },
  Fragment: (props: any, ...children: any[]): any => {
    return { type: 'Fragment', children };
  },
  createRef<T = any>(): { instance: T | null } {
    return { instance: null };
  },
};

// Mock VNode type
export interface VNode {
  instance?: any;
  children?: VNode[];
  [key: string]: any;
}

// Mock Subject
export class Subject<T> {
  private value: T;
  private subscribers: Array<(value: T) => void> = [];

  constructor(initialValue: T) {
    this.value = initialValue;
  }

  static create<T>(initialValue: T): Subject<T> {
    return new Subject(initialValue);
  }

  get(): T {
    return this.value;
  }

  set(value: T): void {
    this.value = value;
    this.subscribers.forEach(sub => sub(value));
  }

  sub(callback: (value: T) => void, immediate: boolean = false): { destroy: () => void } {
    this.subscribers.push(callback);
    if (immediate) {
      callback(this.value);
    }
    return {
      destroy: () => {
        const index = this.subscribers.indexOf(callback);
        if (index > -1) {
          this.subscribers.splice(index, 1);
        }
      }
    };
  }
}

// Mock Subscribable interface
// Matches the real SDK: Subscribable extends Accessible which has get()
export interface Subscribable<T> {
  get(): T;
  sub(callback: (value: T) => void, immediate?: boolean): { destroy: () => void };
  map?<M>(fn: (input: T, previousVal?: M) => M, equalityFunc?: ((a: M, b: M) => boolean)): Subscribable<M>;
}

// Mock EventBus
export class EventBus {
  private events: Map<string, Array<(data: any) => void>> = new Map();

  on<T>(topic: string, callback: (data: T) => void): void {
    if (!this.events.has(topic)) {
      this.events.set(topic, []);
    }
    this.events.get(topic)!.push(callback);
  }

  off<T>(topic: string, callback: (data: T) => void): void {
    const callbacks = this.events.get(topic);
    if (callbacks) {
      const index = callbacks.indexOf(callback);
      if (index > -1) {
        callbacks.splice(index, 1);
      }
    }
  }

  pub<T>(topic: string, data: T): void {
    const callbacks = this.events.get(topic);
    if (callbacks) {
      callbacks.forEach(cb => cb(data));
    }
  }
}

// Mock Subscription
export interface Subscription {
  destroy(): void;
}

// Export other commonly used types/interfaces
export type ComponentProps = any;
export type DisplayChildren = any;

