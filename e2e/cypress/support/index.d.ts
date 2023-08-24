/// <reference types="cypress" />

declare namespace Cypress {
  interface Chainable {
    press(keyCode: string): Chainable<null>;
    holdModifier(keyCode: string, action: () => void): Chainable<null>;
    moveClick(x: number, y: number): Chainable<string>;
    moveRightClick(x: number, y: number): Chainable<string>;
    moveDrag(x1: number, y1: number, x2: number, y2: number): Chainable<string>;
  }
}
