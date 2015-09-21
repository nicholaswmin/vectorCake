/**
 * devTools.js
 *
 * - Development tools for experimentation
 * - Contains code for supporting experiments/test functionality
 * - Remove this file and it's .js inclusion in live versions
 *
 * 
 * Authors:
 *
 *  - Nicholas Kyriakides(@nicholasmin, nik.kyriakides@gmail.com)
 *  
 */



  // creates test shapes for testing performance
  window.blitTestShapes = function(shapeNum) {

    for (var i = 0; i < shapeNum; i++) {
      var url = 'http://assets.paperjs.org/images/marilyn.jpg';
      var raster = new paper.Raster(url);
      raster.position = paper.view.center;
    };

    paper.view.update();
  }


  setTimeout(function() {
    blitTestShapes(1);
  },100);

