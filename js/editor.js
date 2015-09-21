/**
 * editor.js
 *
 * - Main editor file
 * - Contains code for supporting main editor functionalities
 * - Mainly contains utility functions
 *
 * 
 * Authors:
 *
 *  - Nicholas Kyriakides(@nicholasmin, nik.kyriakides@gmail.com)
 *  
 */



"use strict";


function setCanvasCursor(name) {
	$("#canvas").removeClass (function (index, css) {
	    return (css.match (/\bcursor-\S+/g) || []).join(' ');
	}).addClass(name);
}


function snapDeltaToAngle(delta, snapAngle) {
	var angle = Math.atan2(delta.y, delta.x);
	angle = Math.round(angle/snapAngle) * snapAngle;
	var dirx = Math.cos(angle);
	var diry = Math.sin(angle);
	var d = dirx*delta.x + diry*delta.y;
	return new paper.Point(dirx*d, diry*d);
}


function indexFromAngle(angle) {
	var octant = Math.PI*2/8;
	var index = Math.round(angle/octant);
	if (index < 0) index += 8;
	return index % 8;
}


var oppositeCorner = {
	'top-left': 'bottom-right',
	'top-center': 'bottom-center',
	'top-right': 'bottom-left',
	'right-center': 'left-center',
	'bottom-right': 'top-left',
	'bottom-center': 'top-center',
	'bottom-left': 'top-right',
	'left-center': 'right-center',
};


function setCanvasRotateCursor(dir, da) {
	// zero is up, counter clockwise
	var angle = Math.atan2(dir.x, -dir.y) + da;
	var index = indexFromAngle(angle);
	var cursors = [
		'cursor-rotate-0',
		'cursor-rotate-45',
		'cursor-rotate-90',
		'cursor-rotate-135',
		'cursor-rotate-180',
		'cursor-rotate-225',
		'cursor-rotate-270',
		'cursor-rotate-315'
	];
	setCanvasCursor(cursors[index % 8]);
}


function setCanvasScaleCursor(dir) {
	// zero is up, counter clockwise
	var angle = Math.atan2(dir.x, -dir.y);
	var index = indexFromAngle(angle);
	var cursors = [
		'cursor-scale-0',
		'cursor-scale-45',
		'cursor-scale-90',
		'cursor-scale-135'
	];
	setCanvasCursor(cursors[index % 4]);
}

function dragRect(p1, p2) {
	// Create pixel perfect dotted rectable for drag selections.
	var half = new paper.Point(0.5 / paper.view.zoom, 0.5 / paper.view.zoom);
	var start = p1.add(half);
	var end = p2.add(half);
	var rect = new paper.CompoundPath();
	rect.moveTo(start);
	rect.lineTo(new paper.Point(start.x, end.y));
	rect.lineTo(end);
	rect.moveTo(start);
	rect.lineTo(new paper.Point(end.x, start.y));
	rect.lineTo(end);
	rect.strokeColor = 'black';
	rect.strokeWidth = 1.0 / paper.view.zoom;
	rect.dashOffset = 0.5 / paper.view.zoom;
	rect.dashArray = [1.0 / paper.view.zoom, 1.0 / paper.view.zoom];
	rect.removeOn({
		drag: true,
		up: true
	});
	rect.guide = true;
	return rect;
}


function findItemById(id) {
	if (id == -1) return null;
	function findItem(item) {
		if (item.id == id)
			return item;
		if (item.children) {
			for (var j = item.children.length-1; j >= 0; j--) {
				var it = findItem(item.children[j]);
				if (it != null)
					return it;
			}
		}
		return null;
	}

	for (var i = 0, l = paper.project.layers.length; i < l; i++) {
		var layer = paper.project.layers[i];
		var it = findItem(layer);
		if (it != null)
			return it;
	}
	return null;
}


var selectionBounds = null;
var selectionBoundsShape = null;
var drawSelectionBounds = 0;


function clearSelectionBounds() {
	if (selectionBoundsShape)
		selectionBoundsShape.remove();
	selectionBoundsShape = null;
	selectionBounds = null;
};


function showSelectionBounds() {
	drawSelectionBounds++;
	if (drawSelectionBounds > 0) {
		if (selectionBoundsShape)
			selectionBoundsShape.visible = true;
	}
}

function hideSelectionBounds() {
	if (drawSelectionBounds > 0)
		drawSelectionBounds--;
	if (drawSelectionBounds == 0) {
		if (selectionBoundsShape)
			selectionBoundsShape.visible = false;
	}
}


function updateSelectionState() {
	paper.project.options.handleSize = 8;
	clearSelectionBounds();
	selectionBounds = getSelectionBounds();
	if (selectionBounds != null) {

		var rect =  new paper.Path.Rectangle(selectionBounds);
		rect.strokeColor = 'rgba(0,0,0,0)'; //color ? color : '#009dec';
		rect.strokeWidth = 1.0 / paper.view.zoom;
		rect.selected = true;
		rect.setFullySelected(true);
		rect.guide = true;
		rect.visible = drawSelectionBounds > 0;
		selectionBoundsShape = rect;

	}

	updateSelectionUI();
}


function updateSelectionUI() {
	if (selectionBounds == null) {
		$("#delete").addClass("disabled");
	} else {
		$("#delete").removeClass("disabled");
	}
}


function deleteSelection() {
	var selected = paper.project.selectedItems;
	for (var i = 0; i < selected.length; i++)
		selected[i].remove();

	undo.snapshot("Delete");

	updateSelectionState();
	paper.project.view.update();
}


// Returns serialized contents of selected items. 
function captureSelectionState() {
	var originalContent = [];
	var selected = paper.project.selectedItems;
	for (var i = 0; i < selected.length; i++) {
		var item = selected[i];
		if (item.guide) continue;
		var orig = {
			id: item.id,
			json: item.exportJSON({ asString: false }),
			selectedSegments: []
		};
		originalContent.push(orig);
	}
	return originalContent;
}


// Restore the state of selected items.
function restoreSelectionState(originalContent) {
	// TODO: could use findItemById() instead.
	for (var i = 0; i < originalContent.length; i++) {
		var orig = originalContent[i];
		var item = findItemById(orig.id);
		if (!item) continue;
		// HACK: paper does not retain item IDs after importJSON,
		// store the ID here, and restore after deserialization.
		var id = item.id;
		item.importJSON(orig.json);
		item._id = id;
	}
}

function deselectAll() {
	paper.project.deselectAll();
}

function deselectAllPoints() {
	var selected = paper.project.selectedItems;
	for (var i = 0; i < selected.length; i++) {
		var item = selected[i];
		if (item instanceof paper.Path) {
			for (var j = 0; j < item.segments.length; j++)
				if (item.segments[j].selected)
					item.segments[j].selected = false;
		}
	}
}


// Returns path points which are contained in the rect. 
function getSegmentsInRect(rect) {
	var segments = [];

	function checkPathItem(item) {
		if (item._locked || !item._visible || item._guide)
			return;
		var children = item.children;

		if (!rect.intersects(item.bounds))
			return;

		if (item instanceof paper.Path) {
			for (var i = 0; i < item.segments.length; i++) {
				if (rect.contains(item.segments[i].point))
					segments.push(item.segments[i]);
			}
		} else {
			for (var j = children.length-1; j >= 0; j--)
				checkPathItem(children[j]);
		}
	}

	for (var i = paper.project.layers.length - 1; i >= 0; i--) {
		checkPathItem(paper.project.layers[i]);
	}

	return segments;
}


// Returns all items intersecting the rect.
// Note: only the item outlines are tested.
function getPathsIntersectingRect(rect) {
	var paths = [];
	var boundingRect = new paper.Path.Rectangle(rect);

	function checkPathItem(item) {
		var children = item.children;

		if (item.equals(boundingRect))
			return;
		if (!rect.intersects(item.bounds))
			return;
		if (item instanceof paper.PathItem || item instanceof paper.Raster) {
			if (rect.contains(item.bounds)) {
				paths.push(item);
				return;
			}
			paths.push(item);
		} else {
			for (var j = children.length-1; j >= 0; j--)
				checkPathItem(children[j]);
		}
	}

	for (var i = 0, l = paper.project.layers.length; i < l; i++) {
		var layer = paper.project.layers[i];
		checkPathItem(layer);
	}

	boundingRect.remove();

	return paths;
}

// Returns bounding box of all selected items.
function getSelectionBounds() {
	var bounds = null;
	var selected = paper.project.selectedItems;
	for (var i = 0; i < selected.length; i++) {
		if (bounds == null)
			bounds = selected[i].bounds.clone();
		else
			bounds = bounds.unite(selected[i].bounds); 
	}
	return bounds;
}




$(document).ready(function() {

	var $canvas = $('#canvas');
	paper.setup($canvas[0]);

	// HACK: Do not select the children of layers, or else
	// the layers of selected objects will become selected
	// after importJSON(). 
	paper.Layer.inject({ 
		_selectChildren: false 
	});

	undo = new Undo(20);

	$("#tool-select").click(function() {
		toolStack.setToolMode('tool-select');
	});

	$("#undo").click(function() {
		toolStack.command(function() {
			if (undo.canUndo())
				undo.undo();
		});
	});

	$("#redo").click(function() {
		toolStack.command(function() {
			if (undo.canRedo())
				undo.redo();
		});
	});

	$("#delete").click(function() {
		deleteSelection();
	});

	toolStack.activate();
	toolStack.setToolMode('tool-select');

  paper.view.update();

});
