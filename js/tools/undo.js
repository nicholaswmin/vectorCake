/**
 * undo.js
 *
 * - Allows undo/redo functionality
 * - Standalone tool, not part of toolStack.js
 * - Undo snapshots are taken using a command - on 'UNDO'/'REDO' it simply reimports the snapshots
 * - Undo snapshots are in the form of `paper.project.exportJSON()` dumps, so they are not really efficient
 * - Snapshots need to be manually taken after each action using e.g: `undo.snapshot("Move Shapes");`
 *
 * 
 * Authors:
 *
 *  - Nicholas Kyriakides(@nicholasmin, nik.kyriakides@gmail.com)
 *  
 */



"use strict";


function Undo(maxUndos) {
  this.states = [];
  this.head = -1;
  this.maxUndos = maxUndos || 10;
  this.updateUI();
}

Undo.prototype.snapshot = function(name) {

  // Update previous state's selection to the selection as of now
  // so that undo feels more natural after undo. Omitting this
  // makes the undo feel like it lost your selection.
  if (this.head >= 0 && this.head < this.states.length)
    this.states[this.head].selection = this.snapshotSelection();

  // HACK: Store original ID into the data of an item.
  this.captureIDs();

  var state = {
    name: name,
    stamp: Date.now(),
    json: this.snapshotProject(),
    selection: this.snapshotSelection()
  };

  // Discard states after the current one.
  if (this.head < this.states.length-1)
    this.states = this.states.slice(0, this.head+1);

  this.states.push(state);

  // Remove the oldest state if we have too many states.
  if (this.states.length > this.maxUndos)
    this.states.shift();

  this.head = this.states.length-1;

  this.updateUI();
}


Undo.prototype.restoreIDs = function() {
  // Restore IDs from the 'data'.
  var maxId = 0;
  function visitItem(item) {
    if (item.data.id) {
      item._id = item.data.id;
      if (item.id > maxId)
        maxId = item.id;
    }
    if (item.children) {
      for (var j = item.children.length-1; j >= 0; j--)
        visitItem(item.children[j]);
    }
  }
  for (var i = 0, l = paper.project.layers.length; i < l; i++) {
    var layer = paper.project.layers[i];
    visitItem(layer);
  }
  if (maxId > paper.Item._id)
    Item._id = maxId;
}


Undo.prototype.captureIDs = function() {
  // Store IDs of the items into 'data' so that they get serialized.
  function visitItem(item) {
    item.data.id = item.id;
    if (item.children) {
      for (var j = item.children.length-1; j >= 0; j--)
        visitItem(item.children[j]);
    }
  }
  for (var i = 0, l = paper.project.layers.length; i < l; i++) {
    var layer = paper.project.layers[i];
    visitItem(layer);
  }
}


Undo.prototype.snapshotProject = function() {
  var json = paper.project.exportJSON({ asString: false });
  return json;
}


Undo.prototype.snapshotSelection = function() {
  var selection = [];
  var selected = paper.project.selectedItems;
  for (var i = 0; i < selected.length; i++) {
    var item = selected[i];
    if (item.guide) continue;
    var state = {id: item.id, segs: []};
    if (item instanceof paper.Path) {
      var segs = [];
      for (var j = 0; j < item.segments.length; j++) {
        if (item.segments[j].selected)
          segs.push(item.segments[j].index);
      }
      if (segs.length > 0) {
        state.segs = segs;
      }
    }
    selection.push(state);
  }
  return selection;
}


Undo.prototype.restoreSelection = function(sel) {
  paper.project.deselectAll();
  // HACK: some logic in Paper.js prevents deselectAll in some cases,
  // enforce deselect.
  paper.project._selectedItems = {};

  for (var i = 0; i < sel.length; i++) {
    var state = sel[i];
    var item = findItemById(state.id);
    if (item == null) {
      console.log("restoreSelection: could not find "+state.id);
      continue;
    }
    item.selected = true;
    for (var j = 0; j < state.segs.length; j++) {
      var idx = state.segs[j];
      if (idx >= 0 && idx < item.segments.length)
        item.segments[idx].selected = true;
    }
  }
}


Undo.prototype.restore = function(state) {


  // Empty the project and deserialize the project from JSON.
  //paper.project.activeLayer.removeChildren();
  var children = paper.project.activeLayer.children;
  var skippedItems = [];
  for (var i = children.length - 1; i >= 0; i--) { //redraw items that were sniffed out of the undo JSON
    if(typeof children[i].data.nonUndoable !== "undefined"){
      if(children[i].data.nonUndoable)
        skippedItems.push(children[i])
    }
  };
  paper.project.activeLayer.removeChildren();
  paper.project.importJSON(state.json);
  for (var i = 0; i < skippedItems.length; i++) {
    paper.project.activeLayer.addChild(skippedItems[i]);
  };



  // HACK: paper does not retain IDs, we capture them on snapshot,
  // restore them here.
  this.restoreIDs();

  // Selection is serialized separately, restore now (requires correct IDs).
  this.restoreSelection(state.selection);

  // Update UI
  updateSelectionState();
  paper.project.view.update();
}

Undo.prototype.undo = function() {
  if (this.head > 0) {
    this.head--;
    this.restore(this.states[this.head]);
  }
  this.updateUI();
}

Undo.prototype.redo = function() {
  if (this.head < this.states.length-1) {
    this.head++;
    this.restore(this.states[this.head]);
  }
  this.updateUI();
}

Undo.prototype.canUndo = function() {
  return this.head > 0;
}

Undo.prototype.canRedo = function() {
  return this.head < this.states.length-1;
}

Undo.prototype.updateUI = function() {
  if (this.canUndo())
    $("#undo").removeClass("disabled");
  else
    $("#undo").addClass("disabled");

  if (this.canRedo())
    $("#redo").removeClass("disabled");
  else
    $("#redo").addClass("disabled");
}

var undo = null;
