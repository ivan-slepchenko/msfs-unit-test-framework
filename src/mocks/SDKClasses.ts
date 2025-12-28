/**
 * Mock implementations of MSFS SDK classes for testing.
 * 
 * These mocks provide the minimal interface needed for components to work in tests.
 */

/**
 * Mock DisplayComponent base class
 */
export class MockDisplayComponent<P = any> {
  public props: P;
  public context?: any;

  constructor(props: P) {
    this.props = props;
  }

  public onBeforeRender?(): void {}
  public onAfterRender?(vnode?: any): void {}
  public render(): any {
    return null;
  }
  public destroy?(): void {}
}

/**
 * Mock FSComponent utilities
 */
export const MockFSComponent = {
  buildComponent: (type: any, props: any, ...children: any[]): any => {
    if (typeof type === 'function') {
      // If it's a component class, instantiate it
      return new type(props);
    }
    // If it's a string (HTML/SVG tag), return a VNode-like object
    return {
      type,
      props: props || {},
      children: children || [],
      instance: null,
    };
  },
  Fragment: (props: any, ...children: any[]): any => {
    return {
      type: 'Fragment',
      props: props || {},
      children: children || [],
    };
  },
  render: (vnode: any, container: HTMLElement | Element): Element | null => {
    if (!vnode) return null;
    
    // Simple rendering logic for tests
    if (typeof vnode.type === 'string') {
      // HTML/SVG element
      const element = document.createElementNS(
        vnode.type === 'svg' || ['g', 'circle', 'line', 'text', 'polygon'].includes(vnode.type)
          ? 'http://www.w3.org/2000/svg'
          : 'http://www.w3.org/1999/xhtml',
        vnode.type
      ) as Element & Node;
      
      // Set attributes
      if (vnode.props) {
        Object.keys(vnode.props).forEach(key => {
          if (key === 'class') {
            element.setAttribute('class', vnode.props[key]);
          } else if (key === 'key' || key === 'ref') {
            // Skip React-like props
          } else {
            element.setAttribute(key, String(vnode.props[key]));
          }
        });
      }
      
      // Set text content if it's a text node
      if (vnode.children && vnode.children.length === 1 && typeof vnode.children[0] === 'string') {
        element.textContent = vnode.children[0];
      } else if (vnode.children) {
        // Recursively render children
        vnode.children.forEach((child: any) => {
          if (child) {
            const childElement = MockFSComponent.render(child, element);
            if (childElement) {
              element.appendChild(childElement);
            }
          }
        });
      }
      
      vnode.instance = element;
      container.appendChild(element);
      return element;
    } else if (typeof vnode.type === 'function') {
      // Component
      const component = new vnode.type(vnode.props);
      const childVNode = component.render();
      if (childVNode) {
        return MockFSComponent.render(childVNode, container);
      }
    }
    
    return null;
  },
  createRef: <T = any>(): { instance: T | null } => {
    return { instance: null };
  },
};

/**
 * Setup SDK classes as globals
 */
export function setupSDKClasses(): void {
  const globalObj = globalThis as any;
  
  // Make DisplayComponent available globally
  if (typeof globalObj.DisplayComponent === 'undefined') {
    globalObj.DisplayComponent = MockDisplayComponent;
  }
  
  // Make FSComponent available globally
  if (typeof globalObj.FSComponent === 'undefined') {
    globalObj.FSComponent = MockFSComponent;
  }
}

