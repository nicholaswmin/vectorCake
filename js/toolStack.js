/**
 * toolStack.js
 *
 * - Contains tools that can be activated/deactivated in serial.
 * - There cannot be 2 toolStack.js activated at the same time - only 1 at a time
 *
 * 
 * Authors:
 *
 *  - Nicholas Kyriakides(@nicholasmin, nik.kyriakides@gmail.com)
 *  
 */




"use strict";


var toolStack = new paper.Tool();
toolStack.stack = [
  toolZoomPan,
  toolScale,
  toolRotate,
  toolSelect
];
toolStack.hotTool = null;
toolStack.activeTool = null;
toolStack.lastPoint = new paper.Point();
toolStack.command = function(cb) {
  if (this.activeTool != null)
    return;
/*  if (this.hotTool) {
    this.hotTool.fire('deactivate');
    this.hotTool = null;
  }*/
  if (cb) cb();
  var event = new paper.Event();
  event.point = this.lastPoint.clone();
  this.testHot('command', event);
};
toolStack.setToolMode = function(mode) {
  this.mode = mode;
  var event = new paper.Event();
  event.point = this.lastPoint.clone();
  this.testHot('mode', event);
};
toolStack.testHot = function(type, event) {
  // Reset the state of the tool before testing.
  var prev = this.hotTool;
  this.hotTool = null;
  for (var i = 0; i < this.stack.length; i++)
    this.stack[i].resetHot(type, event, this.mode);
  // Pick the first hot tool.
  for (var i = 0; i < this.stack.length; i++) {
    if (this.stack[i].testHot(type, event, this.mode)) {
      this.hotTool = this.stack[i];
      break;
    }
  }
  if (prev != this.hotTool) {
    if (prev)
      prev.fire('deactivate');
    if (this.hotTool)
      this.hotTool.fire('activate');
  }
};
toolStack.on({
  activate: function() {
    this.activeTool = null;
    this.hotTool = null;
  },

  deactivate: function() {
    this.activeTool = null;
    this.hotTool = null;
  },

  mousedown: function(event) {
    this.lastPoint = event.point.clone();
    if (this.hotTool) {
      this.activeTool = this.hotTool;
      this.activeTool.fire('mousedown', event);
    }
  },

  mouseup: function(event) {
    this.lastPoint = event.point.clone();
    if (this.activeTool)
      this.activeTool.fire('mouseup', event);
    this.activeTool = null;
    this.testHot('mouseup', event);
  },

  mousedrag: function(event) {
    this.lastPoint = event.point.clone();
    if (this.activeTool)
      this.activeTool.fire('mousedrag', event);
  },

  mousemove: function(event) {
    this.lastPoint = event.point.clone();
    this.testHot('mousemove', event);
  },

  keydown: function(event) {
    event.point = this.lastPoint.clone();
    if (this.activeTool)
      this.activeTool.fire('keydown', event);
    else
      this.testHot('keydown', event);
  },

  keyup: function(event) {
    event.point = this.lastPoint.clone();
    if (this.activeTool)
      this.activeTool.fire('keyup', event);
    else
      this.testHot('keyup', event);
  }
});