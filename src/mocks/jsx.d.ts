/**
 * JSX type definitions for MSFS SDK testing
 * 
 * This file provides JSX.IntrinsicElements definitions so TypeScript
 * can properly type-check JSX in test files.
 */

// Global FSComponent declaration for JSX factory
declare global {
  namespace FSComponent {
    function buildComponent(type: any, props: any, ...children: any[]): any;
    function render(vnode: any, container: HTMLElement): void;
    function Fragment(props: any, ...children: any[]): any;
    function createRef<T = any>(): { instance: T | null };
  }
  
  const FSComponent: {
    buildComponent(type: any, props: any, ...children: any[]): any;
    render(vnode: any, container: HTMLElement): void;
    Fragment(props: any, ...children: any[]): any;
    createRef<T = any>(): { instance: T | null };
  };
  
  namespace JSX {
    interface IntrinsicElements {
      // HTML elements
      [elemName: string]: any;
      
      // SVG elements (explicitly defined for better type checking)
      svg: any;
      g: any;
      circle: any;
      line: any;
      text: any;
      polygon: any;
      path: any;
      rect: any;
      ellipse: any;
      polyline: any;
      defs: any;
      use: any;
      clipPath: any;
      mask: any;
      pattern: any;
      linearGradient: any;
      radialGradient: any;
      stop: any;
      filter: any;
      feGaussianBlur: any;
      feColorMatrix: any;
      feOffset: any;
      feMerge: any;
      feMergeNode: any;
    }
  }
}

export {};

