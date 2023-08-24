Cypress.Commands.add('press', keyCode => {
  cy.get('body').type(keyCode);
});

Cypress.Commands.add('holdModifier', (keyCode, action: () => void) => {
  cy.get('body').type(keyCode, {release: false});
  action();
  cy.get('body').type(keyCode);
});

Cypress.Commands.add('moveClick', {prevSubject: 'element'}, (subject, x, y) => {
  cy.wrap(subject)
    .trigger('mousemove', x, y)
    .trigger('mousedown', x, y, {button: 0})
    .trigger('mouseup', x, y, {button: 0});
});

Cypress.Commands.add('moveDrag', {prevSubject: 'element'}, (subject, x1, y1, x2, y2) => {
  cy.wrap(subject)
    .trigger('mousemove', x1, y1)
    .trigger('mousedown', x1, y1, {button: 0})
    .trigger('mousemove', x1, y1)
    .trigger('mousemove', x2, y2)
    .trigger('mouseup', x2, y2, {button: 0});
});

Cypress.Commands.add('moveRightClick', {prevSubject: 'element'}, (subject, x, y) => {
  cy.wrap(subject).trigger('mousemove', x, y).rightclick(x, y);
});
