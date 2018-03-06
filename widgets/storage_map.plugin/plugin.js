
function storage_map_plugin() {
    this.update = function(data) {
        var storage = data["sets"] || [];
        var root_items = {name: "Storage Map", description: "", total: 0, parent:{}, children:[]};
        for (var sdex = 0; sdex < storage.length; ++sdex) {
            var item = {};
            item.name = storage[sdex].storage_name;
            item.parent = root_items;
            item.total = storage[sdex].size_used;
            item.description = formatBytes(item.total);
            item.children = []; // clients backed up
            root_items.children.push(item);
            root_items.total += item.total;
        }
        root_items.description = formatBytes(root_items.total);
        root_items.children.sort(function(a, b) { return b.total - a.total });
        createSunburst(".storage", root_items, 2);
    }
    Updater.registerForStorage(this);
}
new storage_map_plugin();


/*
    sunburst.js
    
        Implements the creation of a sunburst visualization into a svg.
*/

function Sunburst(svg, default_list, hover_list, items, max_rings){
  // sunburst has a central disc with the item description
  // then a succession of rings with each arc segment the relative size of the child
  // default_list holds the title and aggregate size, followed by the names and sizes of the first children
  // hover_list holds the temporary version as a preview when hovering over a given arc segment
  
  // properties
  this.svg = svg;
  this.default_list = default_list;
  this.hover_list = hover_list;

  // methods
  this.updateList = function(html_list, item) {
    html_list.empty();
    var header = this.createRow(html_list, item.name, item.description, "title");
    if (item && item.parent && item.parent.children) {
      header.on("click", {sunburst: this, item: item.parent}, function(event) {
        event.data.sunburst.drawSunburst(event.data.item);
      });
    }
    if (!item.children)
      return;
    for (var dex = 0; dex < item.children.length; dex++) {
      var child_item = item.children[dex];
      var tr = this.createRow(html_list, child_item.name, child_item.description, child_item.class_name);
      tr.on("click", {sunburst: this, item: child_item}, function(event) {
        event.data.sunburst.drawSunburst(event.data.item);
      });
      tr.on("mouseenter", {sunburst: this, path: child_item.path}, function(event) {
        event.data.path.style.fillOpacity = .5;
      });
      tr.on("mouseleave", {sunburst: this, path: child_item.path}, function(event) {
        event.data.path.style.fillOpacity = 1;
      });
    }
  }
  this.drawRings = function(radius, item) {
    var parent_arc = item.end_angle - item.start_angle;
    if (!item.children)
      return;
    for (var dex = 0; dex < item.children.length; dex++) {
      var child_item = item.children[dex];
      child_item.start_angle = item.start_angle + (parent_arc * child_item.start);
      child_item.end_angle = item.start_angle + (parent_arc * child_item.stop);
    
      child_item.path = createArc(this.svg, {
        radius: radius,
        height: child_item.height,
        start_angle: child_item.start_angle,
        end_angle: child_item.end_angle,
        fill: child_item.color_val,
        class: child_item.class_name,
      });
      
      if (child_item.children.length) {
        $(child_item.path).on("click", {sunburst: this, item: child_item}, function(event) {
          event.data.sunburst.drawSunburst(event.data.item);
        });
      }
      $(child_item.path).on("mouseenter", {sunburst: this, item: child_item}, function(event) {
        event.data.item.path.style.fillOpacity = .5; // darker version
        event.data.sunburst.updateList(event.data.sunburst.hover_list, event.data.item);
        event.data.sunburst.default_list.hide();
        event.data.sunburst.hover_list.show();
      });
      $(child_item.path).on("mouseleave", {sunburst: this, item: child_item}, function(event) {
        event.data.item.path.style.fillOpacity = 1;
        event.data.sunburst.default_list.show();
        event.data.sunburst.hover_list.hide();
      });
      this.drawRings(radius + child_item.height, child_item);
    }
  }
  this.createRow = function(parent, name, description, class_name) {
    var tr = $("<tr>");
    if (class_name)
      tr.addClass(class_name);
    tr.append($("<td>").text(name));
    tr.append($("<td>").text(description));
    $(parent).append(tr);
    return tr;
  }
  this.colorForItem = function(item) {
    var mid = item.abs_start + (item.abs_stop - item.abs_start)/2;
    var hue = mid * 360;
    var color_val = 'hsl(210,100%,' + ((60 * mid)+20) + '%)';
    return color_val;
  }
  this.drawSunburst = function(item) {
    if (typeof item == "undefined") {
      console.log("drawSunburst: no item specified");
      return;
    }
	$(this.svg).find("path").remove();    // remove any prior paths
	$(this.svg).find("g").remove();       // remove any prior center summary circles
    var width = this.svg.width.baseVal.valueInSpecifiedUnits;
    var max_radius = width/2;
    
    var disc = drawDisc(this.svg, {
      title: item.description,
      color: item.color_val,
    });
      
    if (typeof item.parent != "undefined" && typeof item.parent["total"] != "undefined") { // there is no item.parent for the root
      if (typeof item.parent.children != "undefined") {
        $(disc).on("click", {sunburst: this, item: item.parent}, function(event) {
          event.data.sunburst.drawSunburst(event.data.item);
        });
      } else {
        console.log("drawSunburst: No children found for " + item.description);
      }
    }
    
    // create rings
    item.start_angle = 0;
    item.end_angle = 360;
    this.drawRings(item.height, item);

    // create default list for children of item
    this.updateList(this.default_list, item);
    this.default_list.show();
    this.hover_list.hide();
  }
  this.itemToHeight = function(item) {
    var height = 1/max_rings;
    return height;
  }
  this.mapItemsToSunburst = function(item, level) {
    if (level == 0) {
      item.start = item.abs_start = 0;
      item.stop = item.abs_stop = 1.0;
      item.radius = 0;
      item.height = this.itemToHeight(item);
      item.color_val = "#fff";
      level = 1; // fall through to level 1
    }
    // start and stop are 0-1.0 of the total of the parent
    // (if the sum of the totals are less than the parent's totals, the final stop will be < 1.0)
    var start = 0;
    var abs_start = item.abs_start;
    var par_length = item.abs_stop - item.abs_start;
    // console.log("parent: abs_start: " + item.abs_start + ", abs_stop: " + item.abs_stop);
    if (!item.children)
        return;
    for (var ndex = 0; ndex < item.children.length; ndex++) {
      var child_item = item.children[ndex];
      child_item.start = start;
      child_item.stop = child_item.start + child_item.total / item.total;
      child_item.abs_start = abs_start;
      child_item.abs_stop = child_item.abs_start + (child_item.stop - child_item.start) * par_length;
      start = child_item.stop;
      abs_start = child_item.abs_stop;
      child_item.radius = 1/3 * level;
      child_item.height = this.itemToHeight(child_item);
      child_item.color_val = this.colorForItem(child_item);
      if (level < 10) // Recursion beyond 10 is a programming error (as we cannot really show more than 4-5
        this.mapItemsToSunburst(child_item, level + 1);
    }
  }

  // initialization
  this.mapItemsToSunburst(items, 0); // adds start/stop, radius%/height% and color_val to all items
  this.drawSunburst(items);
}
function createSunburst(tag, items, max_rings) {
  var svg = $(tag).find("svg")[0];
  if (typeof svg == "undefined") {
    console.log("createSunburst: No svg found under " + tag);
    return;
  }
  var default_list = $($(tag).find(".list_container .default tbody")[0]);
  var hover_list = $($(tag).find(".list_container .mouseover tbody")[0]);
  var sunburst = new Sunburst(svg, default_list, hover_list, items, max_rings);
  
  /*
  For saving the svg as a file: Note you would need to incorporate the style into the svg or not use css.
  Note the 'click' so it goes straight to the donloads section. Alternately you could leave this as a button.
  c.f. https://stackoverflow.com/questions/23218174/how-do-i-save-export-an-svg-file-after-creating-an-svg-with-d3-js-ie-safari-an
  
  var svgData = $(".sunburst svg")[0].outerHTML;
  var svgBlob = new Blob([svgData], {type:"image/svg+xml;charset=utf-8"});
  var svgUrl = URL.createObjectURL(svgBlob);
  var downloadLink = document.createElement("a");
  downloadLink.href = svgUrl;
  downloadLink.download = "newesttree.svg";
  document.body.appendChild(downloadLink);
  downloadLink.click();
  document.body.removeChild(downloadLink);
  */
}
