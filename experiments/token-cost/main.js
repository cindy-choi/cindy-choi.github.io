// token-cost — experiment entry point.
// state / model / view / interaction stay separated (see docs/ARCHITECTURE.md).

const state = {};

function model(s) { return s; }
function view() {}
function update() { view(model(state)); }

update();
