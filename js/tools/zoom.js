/**
 * Zoom.js
 *
 * - Allows zooming in/out of point on scrolling
 * - Homes in on mouse cursor
 * - Not part of toolStack.js and cannot be activated/deactivated - it is triggered on mouse scroll on canvas
 *
 *
 * Authors:
 *
 *  - Nicholas Kyriakides(@nicholasmin, nik.kyriakides@gmail.com)
 *
 */




"use strict";


var toolZoomIn = new paper.Tool();
toolZoomIn.distanceThreshold = 8;
toolZoomIn.mouseStartPos = new paper.Point();

toolZoomIn.zoomFactor = 1.3;

toolZoomIn.lowerZoomLimit = 0.5;
toolZoomIn.upperZoomLimit = 30;

$(document).ready(function () {

    //Start of mouse scroll zoom. The mouse zoom ''homes in'' on the current mouse position.
    $('#canvas').bind('mousewheel DOMMouseScroll MozMousePixelScroll', function (e) {

        var delta = 0;
        var mouseX = e.originalEvent.offsetX;
        var mouseY = e.originalEvent.offsetY;
        var children = paper.project.activeLayer.children;

        e.preventDefault();
        e = e || window.event;
        if (e.type == 'mousewheel') { //this is for chrome/IE
            delta = e.originalEvent.wheelDelta;
        } else if (e.type == 'DOMMouseScroll') { //this is for FireFox
            delta = e.originalEvent.detail * -1; //FireFox reverses the scroll so we force to to re-reverse...
        }

        // scroll up
        if ((delta > 0) && (paper.view.zoom < toolZoomIn.upperZoomLimit)) {
            var point = new paper.Point(mouseX, mouseY);
            point = paper.view.viewToProject(point);
            var zoomCenter = point.subtract(paper.view.center);
            var moveFactor = toolZoomIn.zoomFactor - 1.0;
            paper.view.zoom *= toolZoomIn.zoomFactor;
            paper.view.center = paper.view.center.add(zoomCenter.multiply(moveFactor / toolZoomIn.zoomFactor));
            toolZoomIn.mode = '';

        //scroll down
        } else if ((delta < 0) && (paper.view.zoom > toolZoomIn.lowerZoomLimit)) {
            var point = new paper.Point(mouseX, mouseY);
            point = paper.view.viewToProject(point);
            var zoomCenter = point.subtract(paper.view.center);
            var moveFactor = toolZoomIn.zoomFactor - 1.0;
            paper.view.zoom /= toolZoomIn.zoomFactor;
            paper.view.center = paper.view.center.subtract(zoomCenter.multiply(moveFactor))
        }

    });

});
