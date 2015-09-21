/**
 * selectionTools.js
 *
 * - Allows selecting, multiselecting, scaling, moving and rotating elements via mouse/touch.
 * - toolStack.js Tool.
 *
 * 
 * Authors:
 *
 *  - Nicholas Kyriakides(@nicholasmin, nik.kyriakides@gmail.com)
 *  
 */



"use strict";


var toolSelect = new paper.Tool();
toolSelect.mouseStartPos = new paper.Point();
toolSelect.mode = null;
toolSelect.hitItem = null;
toolSelect.originalContent = null;
toolSelect.changed = false;
toolSelect.duplicates = null;

toolSelect.createDuplicates = function(content) {
  this.duplicates = [];
  for (var i = 0; i < content.length; i++) {
    var orig = content[i];
    var item = paper.Base.importJSON(orig.json);
    if (item) {
      item.selected = false;
      this.duplicates.push(item);
    }
  }
};
toolSelect.removeDuplicates = function() {
  for (var i = 0; i < this.duplicates.length; i++)
    this.duplicates[i].remove();
  this.duplicates = null;
};

toolSelect.resetHot = function(type, event, mode) {
};
toolSelect.testHot = function(type, event, mode) {
/*  if (mode != 'tool-select')
    return false;*/
  return this.hitTest(event);
};
toolSelect.hitTest = function(event) {
  var hitSize = 8.0; // / paper.view.zoom;
  this.hitItem = null;

  // Hit test items.
  if (event.point)
    this.hitItem = paper.project.hitTest(event.point, { fill:true, stroke:true, tolerance: hitSize });

  if (this.hitItem) {

    if (this.hitItem.type == 'fill' || this.hitItem.type == 'stroke' || this.hitItem.type == 'pixel') {
      if (this.hitItem.item.selected) {
        setCanvasCursor('cursor-arrow-small');
      } else {
        setCanvasCursor('cursor-arrow-black-shape');
      }
    }
  } else {
    setCanvasCursor('cursor-arrow-black');
  }

  return true;
};
toolSelect.on({
  activate: function() {
    $("#tools").children().removeClass("selected");
    $("#tool-select").addClass("selected");
    setCanvasCursor('cursor-arrow-black');
    updateSelectionState();
    showSelectionBounds();
  },
  deactivate: function() {
    hideSelectionBounds();
  },
  mousedown: function(event) {
    this.mode = null;
    this.changed = false;

    if (this.hitItem) {
      if (this.hitItem.type == 'fill' || this.hitItem.type == 'stroke' || this.hitItem.type == 'pixel') {
        if(this.hitItem.item.data.nonMovable)
          return false;
        if (event.modifiers.shift) {
          this.hitItem.item.selected = !this.hitItem.item.selected;
        } else {
          if (!this.hitItem.item.selected)
            deselectAll();
          this.hitItem.item.selected = true;
        }
        if (this.hitItem.item.selected) {
          this.mode = 'move-shapes';
          deselectAllPoints();
          this.mouseStartPos = event.point.clone();
          this.originalContent = captureSelectionState();
        }
      }
      updateSelectionState();
    } else {
      // Clicked on and empty area, engage box select.
      this.mouseStartPos = event.point.clone();
      this.mode = 'box-select';
    }
  },
  mouseup: function(event) {
    if (this.mode == 'move-shapes') {
      if (this.changed) {
        clearSelectionBounds();
        undo.snapshot("Move Shapes");
      }
      this.duplicates = null;
    } else if (this.mode == 'box-select') {
      var box = new paper.Rectangle(this.mouseStartPos, event.point);

      if (!event.modifiers.shift)
        deselectAll();

      var selectedPaths = getPathsIntersectingRect(box);
      for (var i = 0; i < selectedPaths.length; i++)
        selectedPaths[i].selected = !selectedPaths[i].selected;
    }

    updateSelectionState();

    if (this.hitItem) {
      if (this.hitItem.item.selected) {
        setCanvasCursor('cursor-arrow-small');
      } else {
        setCanvasCursor('cursor-arrow-black-shape');
      }
    }
  },
  mousedrag: function(event) {
    if (this.mode == 'move-shapes') {

      this.changed = true;

      if (event.modifiers.option) {
        if (this.duplicates == null)
          this.createDuplicates(this.originalContent);
        setCanvasCursor('cursor-arrow-duplicate');
      } else {
        if (this.duplicates)
          this.removeDuplicates();
        setCanvasCursor('cursor-arrow-small');
      }

      var delta = event.point.subtract(this.mouseStartPos);
      if (event.modifiers.shift) {
        delta = snapDeltaToAngle(delta, Math.PI*2/8);
      }

      restoreSelectionState(this.originalContent);

      var selected = paper.project.selectedItems;
      for (var i = 0; i < selected.length; i++) {
        selected[i].position = selected[i].position.add(delta);
      }
      updateSelectionState();
    } else if (this.mode == 'box-select') {
      dragRect(this.mouseStartPos, event.point);
    }
  },
  mousemove: function(event) {
    this.hitTest(event);
  }
});



var toolScale = new paper.Tool();
toolScale.mouseStartPos = new paper.Point();
toolScale.mode = null;
toolScale.hitItem = null;
toolScale.pivot = null;
toolScale.corner = null;
toolScale.originalCenter = null;
toolScale.originalSize = null;
toolScale.originalContent = null;
toolScale.changed = false;

toolScale.resetHot = function(type, event, mode) {
};
toolScale.testHot = function(type, event, mode) {
/*  if (mode != 'tool-select')
    return false;*/
  return this.hitTest(event);
};

toolScale.hitTest = function(event) {
  var hitSize = 12.0; // / paper.view.zoom;
  this.hitItem = null;

  if (!selectionBoundsShape || !selectionBounds)
    updateSelectionState();

  if (!selectionBoundsShape || !selectionBounds)
    return;

  // Hit test selection rectangle
  if (event.point)
    this.hitItem = selectionBoundsShape.hitTest(event.point, { bounds: true, guides: true, tolerance: hitSize });

  if (this.hitItem && this.hitItem.type == 'bounds') {
    // Normalize the direction so that corners are at 45° angles.
    var dir = event.point.subtract(selectionBounds.center);
    dir.x /= selectionBounds.width*0.5;
    dir.y /= selectionBounds.height*0.5;
    setCanvasScaleCursor(dir);
    return true;
  }

  return false;
};

toolScale.on({
  activate: function() {
    $("#tools").children().removeClass("selected");
    $("#tool-select").addClass("selected");
    setCanvasCursor('cursor-arrow-black');
    updateSelectionState();
    showSelectionBounds();
  },
  deactivate: function() {
    hideSelectionBounds();
  },
  mousedown: function(event) {
    this.mode = null;
    this.changed = false;
    if (this.hitItem) {
      if (this.hitItem.type == 'bounds') {
        this.originalContent = captureSelectionState();
        this.mode = 'scale';
        var pivotName = paper.Base.camelize(oppositeCorner[this.hitItem.name]);
        var cornerName = paper.Base.camelize(this.hitItem.name);
        this.pivot = selectionBounds[pivotName].clone();
        this.corner = selectionBounds[cornerName].clone();
        this.originalSize = this.corner.subtract(this.pivot);
        this.originalCenter = selectionBounds.center;
      }
      updateSelectionState();
    }
  },
  mouseup: function(event) {
    if (this.mode == 'scale') {
      if (this.changed) {
        clearSelectionBounds();
        undo.snapshot("Scale Shapes");
      }
    }
  },
  mousedrag: function(event) {
    if (this.mode == 'scale') {
      var pivot = this.pivot;
      var originalSize = this.originalSize;

      if (event.modifiers.option) {
        pivot = this.originalCenter;
        originalSize = originalSize.multiply(0.5);
      }

      this.corner = this.corner.add(event.delta);
      var size = this.corner.subtract(pivot);
      var sx = 1.0, sy = 1.0;
      if (Math.abs(originalSize.x) > 0.0000001)
        sx = size.x / originalSize.x;
      if (Math.abs(originalSize.y) > 0.0000001)
        sy = size.y / originalSize.y;

      if (event.modifiers.shift) {
        var signx = sx > 0 ? 1 : -1;
        var signy = sy > 0 ? 1 : -1;
        sx = sy = Math.max(Math.abs(sx), Math.abs(sy));
        sx *= signx;
        sy *= signy;
      }

      restoreSelectionState(this.originalContent);

      var selected = paper.project.selectedItems;
      for (var i = 0; i < selected.length; i++) {
        var item = selected[i];
        if (item.guide) continue; 
        item.scale(sx, sy, pivot);
      }
      updateSelectionState();
      this.changed = true;
    }
  },
  mousemove: function(event) {
    this.hitTest(event);
  }
});


var toolRotate = new paper.Tool();
toolRotate.mouseStartPos = new paper.Point();
toolRotate.mode = null;
toolRotate.hitItem = null;
toolRotate.originalCenter = null;
toolRotate.originalAngle = 0;
toolRotate.originalContent = null;
toolRotate.originalShape = null;
toolRotate.cursorDir = null;
toolRotate.changed = false;


toolRotate.resetHot = function(type, event, mode) {
};
toolRotate.testHot = function(type, event, mode) {
/*  if (mode != 'tool-select')
    return false;*/
  return this.hitTest(event);
};

toolRotate.hitTest = function(event) {
  var hitSize = 24.0; // / paper.view.zoom;
  this.hitItem = null;

  if (!selectionBoundsShape || !selectionBounds)
    updateSelectionState();

  if (!selectionBoundsShape || !selectionBounds)
    return;

  // Hit test selection rectangle
  this.hitItem = null;
  if (event.point && !selectionBounds.contains(event.point))
    this.hitItem = selectionBoundsShape.hitTest(event.point, { bounds: true, guides: true, tolerance: hitSize });

  if (this.hitItem && this.hitItem.type == 'bounds') {
    // Normalize the direction so that corners are at 45° angles.
    var dir = event.point.subtract(selectionBounds.center);
    dir.x /= selectionBounds.width*0.5;
    dir.y /= selectionBounds.height*0.5;
    setCanvasRotateCursor(dir, 0);
    toolRotate.cursorDir = dir;
    return true;
  }

  return false;
};

toolRotate.on({
  activate: function() {
    $("#tools").children().removeClass("selected");
    $("#tool-select").addClass("selected");
    setCanvasCursor('cursor-arrow-black');
    updateSelectionState();
    showSelectionBounds();
  },
  deactivate: function() {
    hideSelectionBounds();
  },
  mousedown: function(event) {
    this.mode = null;
    this.changed = false;
    if (this.hitItem) {
      if (this.hitItem.type == 'bounds') {
        this.originalContent = captureSelectionState();
        this.originalShape = selectionBoundsShape.exportJSON({ asString: false });
        this.mode = 'rotate';
        this.originalCenter = selectionBounds.center.clone();
        var delta = event.point.subtract(this.originalCenter);
        this.originalAngle = Math.atan2(delta.y, delta.x);
      }
      updateSelectionState();
    }
  },
  mouseup: function(event) {
    if (this.mode == 'rotate') {
      if (this.changed) {
        clearSelectionBounds();
        undo.snapshot("Rotate Shapes");
      }
    }
    updateSelectionState();
  },
  mousedrag: function(event) {
    if (this.mode == 'rotate') {

      var delta = event.point.subtract(this.originalCenter);
      var angle = Math.atan2(delta.y, delta.x);
      var da = angle - this.originalAngle;

      if (event.modifiers.shift) {
        var snapeAngle = Math.PI/4;
        da = Math.round(da / snapeAngle) * snapeAngle;
      }

      restoreSelectionState(this.originalContent);

      var id = selectionBoundsShape.id;
      selectionBoundsShape.importJSON(this.originalShape);
      selectionBoundsShape._id = id;

      var deg = da/Math.PI*180;

      selectionBoundsShape.rotate(deg, this.originalCenter);

      var selected = paper.project.selectedItems;
      for (var i = 0; i < selected.length; i++) {
        var item = selected[i];
        if (item.guide) continue;
        item.rotate(deg, this.originalCenter);
      }

      setCanvasRotateCursor(toolRotate.cursorDir, da);
      this.changed = true;
    }
  },
  mousemove: function(event) {
    this.hitTest(event);
  }
});


var toolZoomPan = new paper.Tool();
toolZoomPan.distanceThreshold = 8;
toolZoomPan.mouseStartPos = new paper.Point();
toolZoomPan.mode = 'pan';
toolZoomPan.zoomFactor = 1.3;
toolZoomPan.resetHot = function(type, event, mode) {
};
toolZoomPan.testHot = function(type, event, mode) {
  var spacePressed = event && event.modifiers.space;
  if (mode != 'tool-zoompan' && !spacePressed)
    return false;
  return this.hitTest(event);
};
toolZoomPan.hitTest = function(event) {
  if (event.modifiers.command) {
    if (event.modifiers.command && !event.modifiers.option) {
      setCanvasCursor('cursor-zoom-in');
    } else if (event.modifiers.command && event.modifiers.option) {
      setCanvasCursor('cursor-zoom-out');
    }
  } else {
    setCanvasCursor('cursor-hand');
  }
  return true;
};
toolZoomPan.on({
  activate: function() {
    $("#tools").children().removeClass("selected");
    $("#tool-zoompan").addClass("selected");
    setCanvasCursor('cursor-hand');
  },
  deactivate: function() {
  },
  mousedown: function(event) {
    this.mouseStartPos = event.point.subtract(paper.view.center);
    this.mode = '';
    if (event.modifiers.control) {
      this.mode = 'zoom';
    } else {
      setCanvasCursor('cursor-hand-grab');
      this.mode = 'pan';
    }
  },
  mouseup: function(event) {
    if (this.mode == 'zoom') {
      var zoomCenter = event.point.subtract(paper.view.center);
      var moveFactor = this.zoomFactor - 1.0;
      if (event.modifiers.command && !event.modifiers.option) {
        paper.view.zoom *= this.zoomFactor;
        paper.view.center = paper.view.center.add(zoomCenter.multiply(moveFactor / this.zoomFactor));
      } else if (event.modifiers.command && event.modifiers.option) {
        paper.view.zoom /= this.zoomFactor;
        paper.view.center = paper.view.center.subtract(zoomCenter.multiply(moveFactor));
      }
    } else if (this.mode == 'zoom-rect') {
      var start = paper.view.center.add(this.mouseStartPos);
      var end = event.point;
      paper.view.center = start.add(end).multiply(0.5);
      var dx = paper.view.bounds.width / Math.abs(end.x - start.x);
      var dy = paper.view.bounds.height / Math.abs(end.y - start.y);
      paper.view.zoom = Math.min(dx, dy) * paper.view.zoom;

    }
    this.hitTest(event);
    this.mode = '';
  },
  mousedrag: function(event) {
    if (this.mode == 'zoom') {
      // If dragging mouse while in zoom mode, switch to zoom-rect instead.
      this.mode = 'zoom-rect';
    } else if (this.mode == 'zoom-rect') {
      // While dragging the zoom rectangle, paint the selected area.
      dragRect(paper.view.center.add(this.mouseStartPos), event.point);
    } else if (this.mode == 'pan') {
      // Handle panning by moving the view center.
      var pt = event.point.subtract(paper.view.center);
      var delta = this.mouseStartPos.subtract(pt);
      paper.view.scrollBy(delta);
      this.mouseStartPos = pt;
    }
  },

  mousemove: function(event) {
    this.hitTest(event);
  },

  keydown: function(event) {
    this.hitTest(event);
  },

  keyup: function(event) {
    this.hitTest(event);
  }
});