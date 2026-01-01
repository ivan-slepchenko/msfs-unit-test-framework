/**
 * Mock MSFS global objects and types required by SDK
 * 
 * These must be set on global object BEFORE any SDK code loads
 */

export function setupMSFSGlobals(): void {
  const globalObj = globalThis as any;

  // BaseInstrument stub
  if (typeof globalObj.BaseInstrument === 'undefined') {
    globalObj.BaseInstrument = class BaseInstrument {
      getChildById(id: string): HTMLElement | null {
        return null;
      }
    };
  }

  // DisplayComponent - must be available globally for SDK classes that extend it
  if (typeof globalObj.DisplayComponent === 'undefined') {
    globalObj.DisplayComponent = class DisplayComponent {
      public props: any;
      public state?: any;

      constructor(props: any) {
        this.props = props;
      }

      public onBeforeRender?(): void;
      public render(): any {
        return null;
      }
      public onAfterRender(_vnode?: any): void {
        // Default implementation
      }
      public destroy(): void {
        // Default implementation
      }
    };
  }

  // FSComponent - must be available globally for JSX factory
  // This implementation creates actual DOM elements for testing
  if (typeof globalObj.FSComponent === 'undefined') {
    globalObj.FSComponent = {
      buildComponent: (type: any, props: any, ...children: any[]): any => {
        // If it's a string (HTML/SVG tag), create a VNode structure with DOM element
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
                // Style object support (including Subscribable values)
                if (key === 'style' && typeof value === 'object') {
                  Object.keys(value).forEach(styleKey => {
                    const styleVal = (value as any)[styleKey];
                    if (styleVal && typeof styleVal === 'object' && typeof styleVal.get === 'function' && typeof styleVal.sub === 'function') {
                      try { (element as any).style[styleKey] = String(styleVal.get()); } catch {}
                      styleVal.sub((v: any) => { try { (element as any).style[styleKey] = String(v); } catch {} });
                    } else {
                      try { (element as any).style[styleKey] = String(styleVal); } catch {}
                    }
                  });
                  return;
                }

                if (key === 'className') {
                  element.setAttribute('class', String(value));
                  return;
                }
                if (key === 'class') {
                  element.setAttribute('class', String(value));
                  return;
                }

                const svgAttrMap: Record<string, string> = {
                  strokeWidth: 'stroke-width',
                  fillRule: 'fill-rule',
                  dominantBaseline: 'dominant-baseline',
                  textAnchor: 'text-anchor',
                };
                const attrName = svgAttrMap[key] || key.replace(/([A-Z])/g, '-$1').toLowerCase();
                element.setAttribute(attrName, String(value));
              } else {
                // For HTML elements
                if (key === 'style' && typeof value === 'object') {
                  Object.keys(value).forEach(styleKey => {
                    const styleVal = (value as any)[styleKey];
                    if (styleVal && typeof styleVal === 'object' && typeof styleVal.get === 'function' && typeof styleVal.sub === 'function') {
                      try { (element as any).style[styleKey] = String(styleVal.get()); } catch {}
                      styleVal.sub((v: any) => { try { (element as any).style[styleKey] = String(v); } catch {} });
                    } else {
                      try { (element as any).style[styleKey] = String(styleVal); } catch {}
                    }
                  });
                  return;
                }
                if (key === 'className') {
                  (element as HTMLElement).className = String(value);
                } else if (key === 'class') {
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

          // Helper to safely append a node
          const safeAppendChild = (parent: Node, child: Node): void => {
            try {
              parent.appendChild(child);
            } catch (e) {
              // If appendChild fails (e.g., cross-document issue), try to adopt/clone first
              try {
                if (doc.adoptNode) {
                  parent.appendChild(doc.adoptNode(child));
                } else {
                  parent.appendChild(child.cloneNode(true));
                }
              } catch (e2) {
                // If all else fails, clone
                parent.appendChild(child.cloneNode(true));
              }
            }
          };

          // Process children - recursively build VNodes into DOM nodes
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
                // If child is already a DOM Node, append safely
                if (child instanceof Node) {
                  safeAppendChild(element, child);
                  return;
                }
                
                // If child is a VNode with an instance (already built), append the instance
                if (child.instance && child.instance instanceof Node) {
                  safeAppendChild(element, child.instance);
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
                  const built = globalObj.FSComponent.buildComponent(child.type, child.props || {}, ...vnodeChildren);
                  
                  // Append the built element's instance
                  if (built && built.instance && built.instance instanceof Node) {
                    safeAppendChild(element, built.instance);
                  } else if (built && built.type) {
                    // If still a VNode, recursively process
                    const processedChildren: any[] = [];
                    if (Array.isArray(built.children)) {
                      processedChildren.push(...built.children.filter((c: any) => c !== null && c !== undefined));
                    } else if (built.children !== null && built.children !== undefined) {
                      processedChildren.push(built.children);
                    }
                    const processed = globalObj.FSComponent.buildComponent(built.type, built.props || {}, ...processedChildren);
                    if (processed && processed.instance && processed.instance instanceof Node) {
                      safeAppendChild(element, processed.instance);
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
          // Component refs: set ref.instance to the component instance
          if (props && props.ref && typeof props.ref === 'object' && 'instance' in props.ref) {
            props.ref.instance = component;
          }
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

        // Temporarily set global document to target document so buildComponent uses it
        const originalDoc = (globalThis as any).document;
        (globalThis as any).document = targetDoc;

        // Helper to recreate a node in the target document
        const recreateNodeInDocument = (node: Node, doc: Document): Node => {
          // Check if node is already in the target document
          if (node.ownerDocument === doc) {
            return node;
          }
          
          // Try to adopt the node first (works in real browsers, may not work in jsdom)
          try {
            if (doc.adoptNode) {
              return doc.adoptNode(node);
            }
          } catch (e) {
            // If adoptNode fails, recreate the node
          }
          
          // Recreate the element in the target document
          if (node instanceof Element) {
            const tagName = node.tagName.toLowerCase();
            let newElement: Element;
            
            // Check if it's an SVG element
            if (node instanceof SVGElement || node.namespaceURI === 'http://www.w3.org/2000/svg') {
              newElement = doc.createElementNS('http://www.w3.org/2000/svg', tagName);
            } else {
              newElement = doc.createElement(tagName);
            }
            
            // Copy attributes
            Array.from(node.attributes).forEach(attr => {
              newElement.setAttribute(attr.name, attr.value);
            });
            
            // Recursively recreate children
            Array.from(node.childNodes).forEach(child => {
              const recreatedChild = recreateNodeInDocument(child, doc);
              newElement.appendChild(recreatedChild);
            });
            
            return newElement;
          } else if (node instanceof Text) {
            return doc.createTextNode(node.textContent || '');
          } else if (node instanceof DocumentFragment) {
            const fragment = doc.createDocumentFragment();
            Array.from(node.childNodes).forEach(child => {
              const recreatedChild = recreateNodeInDocument(child, doc);
              fragment.appendChild(recreatedChild);
            });
            return fragment;
          }
          
          // Fallback: try clone
          return node.cloneNode(true);
        };

        // Helper to safely append a node to a parent
        const safeAppendChild = (parent: Node, child: Node): void => {
          try {
            // Check if child is in the same document
            if (child.ownerDocument !== targetDoc && child instanceof Node) {
              const recreated = recreateNodeInDocument(child, targetDoc);
              parent.appendChild(recreated);
            } else {
              parent.appendChild(child);
            }
          } catch (e) {
            // If appendChild still fails, try recreating
            try {
              const recreated = recreateNodeInDocument(child, targetDoc);
              parent.appendChild(recreated);
            } catch (e2) {
              // Last resort: log and skip
              console.warn('Failed to append node:', e2);
            }
          }
        };

        // Recursively build and render VNode tree
        const renderVNode = (node: any): Node | null => {
          if (!node) return null;

          // If it's already a DOM node, recreate it in target document
          if (node instanceof Node) {
            return recreateNodeInDocument(node, targetDoc);
          }

          // If it has an instance, recreate it in target document
          if (node.instance && node.instance instanceof Node) {
            return recreateNodeInDocument(node.instance, targetDoc);
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
            // Pass children directly to buildComponent - it will handle VNodes, Nodes, strings, etc.
            // Filter out null/undefined (from JSX comments)
            const children = (node.children || []).filter((child: any) => child !== null && child !== undefined);
            
            const built = globalObj.FSComponent.buildComponent(node.type, node.props || {}, ...children);
            
            // If built has instance, recreate it in target document
            if (built && built.instance && built.instance instanceof Node) {
              return recreateNodeInDocument(built.instance, targetDoc);
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
                  safeAppendChild(fragment, recreateNodeInDocument(child, targetDoc));
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

        // Helper to re-establish refs after node recreation
        const reestablishRefs = (vnode: any, domNode: Node): void => {
          if (!vnode || !domNode) return;
          
          // Update VNode instance to point to the new DOM node
          vnode.instance = domNode;
          
          // If this VNode has a ref in props, update it to point to the DOM node
          if (vnode.props && vnode.props.ref && typeof vnode.props.ref === 'object' && 'instance' in vnode.props.ref) {
            vnode.props.ref.instance = domNode;
          }
          
          // Recursively process children - match VNode children to DOM children
          if (vnode.children && Array.isArray(vnode.children) && domNode instanceof Element) {
            // Get all element children from DOM (skip text nodes)
            const domChildren = Array.from(domNode.childNodes).filter(n => n instanceof Element);
            let domIndex = 0;
            
            vnode.children.forEach((childVNode: any) => {
              if (!childVNode) return;
              
              // Skip non-VNode children (strings, numbers, nulls)
              if (typeof childVNode !== 'object') return;
              
              // Process VNode children
              if (childVNode.type || childVNode.instance) {
                if (domIndex < domChildren.length) {
                  reestablishRefs(childVNode, domChildren[domIndex]);
                  domIndex++;
                }
              }
            });
          }
        };

        const rootNode = renderVNode(vnode);
        if (rootNode) {
          safeAppendChild(container, rootNode);
          // Re-establish refs after all nodes are in the DOM
          reestablishRefs(vnode, rootNode);
        }

        // Restore original document
        (globalThis as any).document = originalDoc;
      },
      Fragment: (props: any, ...children: any[]): any => {
        return { type: 'Fragment', children };
      },
      createRef<T = any>(): { instance: T | null } {
        return { instance: null };
      },
    };
  }

  // GameState enum
  if (typeof globalObj.GameState === 'undefined') {
    globalObj.GameState = {
      NONE: 0,
      MENU: 1,
      LOADING: 2,
      FLYING: 3,
      PAUSED: 4,
    };
  }

  // Name_Z type (string alias in MSFS)
  if (typeof globalObj.Name_Z === 'undefined') {
    globalObj.Name_Z = String;
  }

  // RunwayDesignator
  if (typeof globalObj.RunwayDesignator === 'undefined') {
    globalObj.RunwayDesignator = {
      NONE: 0,
      LEFT: 1,
      RIGHT: 2,
      CENTER: 3,
    };
  }

  // AirportClass
  if (typeof globalObj.AirportClass === 'undefined') {
    globalObj.AirportClass = {
      HELIPORT: 0,
      SMALL_AIRPORT: 1,
      MEDIUM_AIRPORT: 2,
      LARGE_AIRPORT: 3,
    };
  }

  // Avionics global
  if (typeof globalObj.Avionics === 'undefined') {
    globalObj.Avionics = {
      getCurrentGpsTime: () => Date.now(),
      getCurrentUtcTime: () => Date.now(),
      Utils: {
        DEG2RAD: Math.PI / 180,
        RAD2DEG: 180 / Math.PI,
      },
    };
  }

  // Storage functions
  if (typeof globalObj.GetStoredData === 'undefined') {
    globalObj.GetStoredData = () => '';
  }
  if (typeof globalObj.SetStoredData === 'undefined') {
    globalObj.SetStoredData = () => {};
  }
}
