### VectorCake

*Base Cake for building WYSIWYG Vector-Graphic editors using Paper.js.
It includes the basic structure and only the most-basic Tools necessary to start building a vector editor that runs in a browser.*

[Online Demo](http://nicholaswmin.github.io/vectorCake/)

![Logo](http://nicholaswmin.github.io/vectorCake/logo.png)

=====

#### Included Tools ####

- **Selection Tools**
    - Click-to-select
    - Multi-Selection by intersection/containment rectangle
    - Multi-Selection by click+Shift

- **Element Manipulation Tools**
    - Move Element *(Translation)*
    - Scale Element by dragging it's selection corners *(Transformation)*
    - Rotate Element by dragging it's selection corners *(Transformation)*
    - Delete Tool

- **Undo/Redo**

- **Zoom Tools**    
    - Zoom in/out
    - Zoom to point *(cursor-homing zoom)*

=====

#### Tech ####
 - [Paper.js](http://www.paperjs.org)
 - [jQuery](http://www.jquery.com)
 - [SASS](http://sass-lang.com/) for stylesheets (*optional, you can ignore and use vanilla CSS in `styles.css`*)


#### Authors ####
 - Nicholas Kyriakides (@nicholaswmin, nik.kyriakides@gmail.com)
 - Base code (undo, redo, toolstacks etc) from project [Stylii by Miko Mononen (@memononen)](https://github.com/memononen/stylii)
