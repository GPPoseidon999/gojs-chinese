/*
*  Copyright (C) 1998-2020 by Northwoods Software Corporation. All Rights Reserved.
*/
var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
(function (factory) {
    if (typeof module === "object" && typeof module.exports === "object") {
        var v = factory(require, exports);
        if (v !== undefined) module.exports = v;
    }
    else if (typeof define === "function" && define.amd) {
        define(["require", "exports", "../release/go.js"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.SwimLaneLayout = void 0;
    /*
    * This is an extension and not part of the main GoJS library.
    * Note that the API for this class may change with any version, even point releases.
    * If you intend to use an extension in production, you should copy the code to your own source directory.
    * Extensions can be found in the GoJS kit under the extensions or extensionsTS folders.
    * See the Extensions intro page (https://gojs.net/latest/intro/extensions.html) for more information.
    */
    var go = require("../release/go.js");
    /**
     * A custom LayeredDigraphLayout that knows about "lanes"
     * and that positions each node in its respective lane.
    
     * This assumes that each Node.data.lane property is a string that names the lane the node should be in.
     * You can set the {@link #laneProperty} property to use a different data property name.
     * It is commonplace to set this property to be the same as the {@link GraphLinksModel#nodeGroupKeyProperty},
     * so that the one property indicates that a particular node data is a member of a particular group
     * and thus that that group represents a lane.
    
     * The lanes can be sorted by specifying the {@link #laneComparer} function.
    
     * You can add extra space between the lanes by increasing {@link #laneSpacing} from its default of zero.
     * That number's unit is columns, {@link LayeredDigraphLayout#columnSpacing}, not in document coordinates.
     * @category Layout Extension
     */
    var SwimLaneLayout = /** @class */ (function (_super) {
        __extends(SwimLaneLayout, _super);
        function SwimLaneLayout() {
            var _this = _super !== null && _super.apply(this, arguments) || this;
            // settable properties
            _this._laneProperty = "lane"; // how to get lane identifier string from node data
            _this._laneNames = []; // lane names, may be sorted using this.laneComparer
            _this._laneComparer = null;
            _this._laneSpacing = 0; // in columns
            _this._router = { linkSpacing: 4 };
            _this._reducer = null;
            // computed, read-only state
            _this._lanePositions = new go.Map(); // lane names --> start columns, left to right
            _this._laneBreadths = new go.Map(); // lane names --> needed width in columns
            // internal state
            _this._layers = [[]];
            _this._neededSpaces = [];
            return _this;
        }
        Object.defineProperty(SwimLaneLayout.prototype, "laneProperty", {
            /**
             * Gets or sets the name of the data property that holds the string which is the name of the lane that the node should be in.
             * The default value is "lane".
             */
            get: function () { return this._laneProperty; },
            set: function (val) {
                if (typeof val !== 'string' && typeof val !== 'function')
                    throw new Error("new value for SwimLaneLayout.laneProperty must be a property name, not: " + val);
                if (this._laneProperty !== val) {
                    this._laneProperty = val;
                    this.invalidateLayout();
                }
            },
            enumerable: false,
            configurable: true
        });
        Object.defineProperty(SwimLaneLayout.prototype, "laneNames", {
            /**
             * Gets or sets an Array of lane names.
             * If you set this before a layout happens, it will use those lanes in that order.
             * Any additional lane names that it discovers will be added to the end of this Array.
             *
             * This property is reset to an empty Array at the end of each layout.
             * The default value is an empty Array.
             */
            get: function () { return this._laneNames; },
            set: function (val) {
                if (!Array.isArray(val))
                    throw new Error("new value for SwimLaneLayout.laneNames must be an Array, not: " + val);
                if (this._laneNames !== val) {
                    this._laneNames = val;
                    this.invalidateLayout();
                }
            },
            enumerable: false,
            configurable: true
        });
        Object.defineProperty(SwimLaneLayout.prototype, "laneComparer", {
            /**
             * Gets or sets a function by which to compare lane names, for ordering the lanes within the {@link #laneNames} Array.
             * By default the function is null -- the lanes are not sorted.
             */
            get: function () { return this._laneComparer; },
            set: function (val) {
                if (typeof val !== 'function')
                    throw new Error("new value for SwimLaneLayout.laneComparer must be a function, not: " + val);
                if (this._laneComparer !== val) {
                    this._laneComparer = val;
                    this.invalidateLayout();
                }
            },
            enumerable: false,
            configurable: true
        });
        Object.defineProperty(SwimLaneLayout.prototype, "laneSpacing", {
            /**
             * Gets or sets the amount of additional space it allocates between the lanes.
             * This number specifies the number of columns, with the same meaning as {@link LayeredDigraphLayout#columnSpacing}.
             * The number unit is not in document coordinate or pixels.
             * The default value is zero columns.
             */
            get: function () { return this._laneSpacing; },
            set: function (val) {
                if (typeof val !== 'number')
                    throw new Error("new value for SwimLaneLayout.laneSpacing must be a number, not: " + val);
                if (this._laneSpacing !== val) {
                    this._laneSpacing = val;
                    this.invalidateLayout();
                }
            },
            enumerable: false,
            configurable: true
        });
        Object.defineProperty(SwimLaneLayout.prototype, "router", {
            /**
             * @hidden
             */
            get: function () { return this._router; },
            set: function (val) {
                if (this._router !== val) {
                    this._router = val;
                    this.invalidateLayout();
                }
            },
            enumerable: false,
            configurable: true
        });
        Object.defineProperty(SwimLaneLayout.prototype, "reducer", {
            /**
             * @hidden
             */
            get: function () { return this._reducer; },
            set: function (val) {
                if (this._reducer !== val) {
                    this._reducer = val;
                    if (val) {
                        var lay_1 = this;
                        val.findLane = function (v) { return lay_1.getLane(v); };
                        val.getIndex = function (v) { return v.index; };
                        val.getBary = function (v) { return v.bary || 0; };
                        val.setBary = function (v, val) { v.bary = val; };
                        val.getConnectedNodesIterator = function (v) { return v.vertexes; };
                    }
                    this.invalidateLayout();
                }
            },
            enumerable: false,
            configurable: true
        });
        Object.defineProperty(SwimLaneLayout.prototype, "lanePositions", {
            /**
             * The computed positions of each lane,
             * in the form of a {@link Map} mapping lane names (strings) to numbers.
             */
            get: function () { return this._lanePositions; },
            enumerable: false,
            configurable: true
        });
        Object.defineProperty(SwimLaneLayout.prototype, "laneBreadths", {
            /**
             * The computed breadths (widths or heights depending on the direction) of each lane,
             * in the form of a {@link Map} mapping lane names (strings) to numbers.
             */
            get: function () { return this._laneBreadths; },
            enumerable: false,
            configurable: true
        });
        /**
         * @hidden
         * @param coll
         */
        SwimLaneLayout.prototype.doLayout = function (coll) {
            this.lanePositions.clear(); // lane names --> start columns, left to right
            this.laneBreadths.clear(); // lane names --> needed width in columns
            this._layers = [[]];
            this._neededSpaces = [];
            _super.prototype.doLayout.call(this, coll);
            this.lanePositions.clear();
            this.laneBreadths.clear();
            this._layers = [[]];
            this._neededSpaces = [];
            this.laneNames = []; // clear out for next layout
        };
        /**
         * @hidden
         * @param v
         * @param topleft
         */
        SwimLaneLayout.prototype.nodeMinLayerSpace = function (v, topleft) {
            if (!this._neededSpaces)
                this._neededSpaces = this.computeNeededLayerSpaces(this.network);
            if (v.node === null)
                return 0;
            var lay = v.layer;
            if (!topleft) {
                if (lay > 0)
                    lay--;
            }
            var overlaps = (this._neededSpaces[lay] || 0) / 2;
            var edges = this.countEdgesForDirection(v, (this.direction > 135) ? !topleft : topleft);
            var needed = Math.max(overlaps, edges) * this.router.linkSpacing * 1.5;
            if (this.direction === 90 || this.direction === 270) {
                if (topleft) {
                    return v.focus.y + 10 + needed;
                }
                else {
                    return v.bounds.height - v.focus.y + 10 + needed;
                }
            }
            else {
                if (topleft) {
                    return v.focus.x + 10 + needed;
                }
                else {
                    return v.bounds.width - v.focus.x + 10 + needed;
                }
            }
        };
        SwimLaneLayout.prototype.countEdgesForDirection = function (vertex, topleft) {
            var c = 0;
            var lay = vertex.layer;
            vertex.edges.each(function (e) {
                if (topleft) {
                    if (e.getOtherVertex(vertex).layer >= lay)
                        c++;
                }
                else {
                    if (e.getOtherVertex(vertex).layer <= lay)
                        c++;
                }
            });
            return c;
        };
        SwimLaneLayout.prototype.computeNeededLayerSpaces = function (net) {
            // group all edges by their connected vertexes' least layer
            var layerMinEdges = [];
            net.edges.each(function (e) {
                // consider all edges, including dummy ones!
                var f = e.fromVertex;
                var t = e.toVertex;
                if (f.column === t.column)
                    return; // skip edges that don't go between columns
                if (Math.abs(f.layer - t.layer) > 1)
                    return; // skip edges that don't go between adjacent layers
                var lay = Math.min(f.layer, t.layer);
                var arr = layerMinEdges[lay];
                if (!arr)
                    arr = layerMinEdges[lay] = [];
                arr.push(e);
            });
            // sort each array of edges by their lowest connected vertex column
            // for edges with the same minimum column, sort by their maximum column
            var layerMaxEdges = []; // same as layerMinEdges, but sorted by maximum column
            layerMinEdges.forEach(function (arr, lay) {
                if (!arr)
                    return;
                arr.sort(function (e1, e2) {
                    var f1c = e1.fromVertex.column;
                    var t1c = e1.toVertex.column;
                    var f2c = e2.fromVertex.column;
                    var t2c = e2.toVertex.column;
                    var e1mincol = Math.min(f1c, t1c);
                    var e2mincol = Math.min(f2c, t2c);
                    if (e1mincol > e2mincol)
                        return 1;
                    if (e1mincol < e2mincol)
                        return -1;
                    var e1maxcol = Math.max(f1c, t1c);
                    var e2maxcol = Math.max(f2c, t2c);
                    if (e1maxcol > e2maxcol)
                        return 1;
                    if (e1maxcol < e2maxcol)
                        return -1;
                    return 0;
                });
                layerMaxEdges[lay] = arr.slice(0);
                layerMaxEdges[lay].sort(function (e1, e2) {
                    var f1c = e1.fromVertex.column;
                    var t1c = e1.toVertex.column;
                    var f2c = e2.fromVertex.column;
                    var t2c = e2.toVertex.column;
                    var e1maxcol = Math.max(f1c, t1c);
                    var e2maxcol = Math.max(f2c, t2c);
                    if (e1maxcol > e2maxcol)
                        return 1;
                    if (e1maxcol < e2maxcol)
                        return -1;
                    var e1mincol = Math.min(f1c, t1c);
                    var e2mincol = Math.min(f2c, t2c);
                    if (e1mincol > e2mincol)
                        return 1;
                    if (e1mincol < e2mincol)
                        return -1;
                    return 0;
                });
            });
            // run through each array of edges to count how many overlaps there might be
            var layerOverlaps = [];
            layerMinEdges.forEach(function (arr, lay) {
                var mins = arr; // sorted by min column
                var maxs = layerMaxEdges[lay]; // sorted by max column
                var maxoverlap = 0; // maximum count for this layer
                if (mins && maxs && mins.length > 1 && maxs.length > 1) {
                    var mini = 0;
                    var min = null;
                    var maxi = 0;
                    var max = null;
                    while (mini < mins.length || maxi < maxs.length) {
                        if (mini < mins.length)
                            min = mins[mini];
                        var mincol = min ? Math.min(min.fromVertex.column, min.toVertex.column) : 0;
                        if (maxi < maxs.length)
                            max = maxs[maxi];
                        var maxcol = max ? Math.max(max.fromVertex.column, max.toVertex.column) : Infinity;
                        maxoverlap = Math.max(maxoverlap, Math.abs(mini - maxi));
                        if (mincol <= maxcol && mini < mins.length) {
                            mini++;
                        }
                        else if (maxi < maxs.length) {
                            maxi++;
                        }
                    }
                }
                layerOverlaps[lay] = maxoverlap * 1.5; // # of parallel links
            });
            return layerOverlaps;
        };
        SwimLaneLayout.prototype.setupLanes = function () {
            // set up some data structures
            var layout = this;
            var laneNameSet = new go.Set().addAll(this.laneNames);
            var laneIndexes = new go.Map(); // lane names --> index when sorted
            var vit = this.network.vertexes.iterator;
            while (vit.next()) {
                var v = vit.value;
                var lane = this.getLane(v); // cannot call findLane yet
                if (lane !== null && !laneNameSet.has(lane)) {
                    laneNameSet.add(lane);
                    this.laneNames.push(lane);
                }
                var layer = v.layer;
                if (layer >= 0) {
                    var arr = this._layers[layer];
                    if (!arr) {
                        this._layers[layer] = [v];
                    }
                    else {
                        arr.push(v);
                    }
                }
            }
            // sort laneNames and initialize laneIndexes
            if (typeof this.laneComparer === "function")
                this.laneNames.sort(this.laneComparer);
            for (var i = 0; i < this.laneNames.length; i++) {
                laneIndexes.add(this.laneNames[i], i);
            }
            // now OK to call findLane
            // sort vertexes so that vertexes are grouped by lane
            for (var i = 0; i <= this.maxLayer; i++) {
                this._layers[i].sort(function (a, b) { return layout.compareVertexes(a, b); });
            }
        };
        /**
         * @hidden
         * Replace the standard reduceCrossings behavior so that it respects lanes.
         */
        SwimLaneLayout.prototype.reduceCrossings = function () {
            this.setupLanes();
            // this just cares about the .index and ignores .column
            var layers = this._layers;
            var red = this.reducer;
            if (red) {
                for (var i = 0; i < layers.length - 1; i++) {
                    red.reduceCrossings(layers[i], layers[i + 1]);
                    layers[i].forEach(function (v, j) { v.index = j; });
                }
                for (var i = layers.length - 1; i > 0; i--) {
                    red.reduceCrossings(layers[i], layers[i - 1]);
                    layers[i].forEach(function (v, j) { v.index = j; });
                }
            }
            this.computeLanes(); // and recompute all vertex.column values
        };
        SwimLaneLayout.prototype.computeLanes = function () {
            // compute needed width for each lane, in columns
            for (var i = 0; i < this.laneNames.length; i++) {
                var lane = this.laneNames[i];
                this.laneBreadths.add(lane, this.computeMinLaneWidth(lane));
            }
            var lwidths = new go.Map(); // reused for each layer
            var _loop_1 = function (i) {
                var arr = this_1._layers[i];
                if (arr) {
                    var layout_1 = this_1;
                    // now run through Array finding width (in columns) of each lane
                    // and max with this.laneBreadths.get(lane)
                    for (var j = 0; j < arr.length; j++) {
                        var v = arr[j];
                        var w = this_1.nodeMinColumnSpace(v, true) + 1 + this_1.nodeMinColumnSpace(v, false);
                        var ln = this_1.findLane(v) || "";
                        var totw = lwidths.get(ln);
                        if (totw === null) {
                            lwidths.set(ln, w);
                        }
                        else {
                            lwidths.set(ln, totw + w);
                        }
                    }
                    lwidths.each(function (kvp) {
                        var lane = kvp.key;
                        var colsInLayer = kvp.value;
                        var colsMax = layout_1.laneBreadths.get(lane) || 0;
                        if (colsInLayer > colsMax)
                            layout_1.laneBreadths.set(lane, colsInLayer);
                    });
                    lwidths.clear();
                }
            };
            var this_1 = this;
            for (var i = 0; i <= this.maxLayer; i++) {
                _loop_1(i);
            }
            // compute starting positions for each lane
            var x = 0;
            for (var i = 0; i < this.laneNames.length; i++) {
                var lane = this.laneNames[i];
                this.lanePositions.set(lane, x);
                var w = this.laneBreadths.get(lane) || 0;
                x += w + this.laneSpacing;
            }
            this.renormalizeColumns();
        };
        SwimLaneLayout.prototype.renormalizeColumns = function () {
            // set new column and index on each vertex
            for (var i = 0; i < this._layers.length; i++) {
                var prevlane = null;
                var c = 0;
                var arr = this._layers[i];
                for (var j = 0; j < arr.length; j++) {
                    var v = arr[j];
                    v.index = j;
                    var l = this.findLane(v);
                    if (l && prevlane !== l) {
                        c = this.lanePositions.get(l) || 0;
                        var w = this.laneBreadths.get(l) || 0;
                        // compute needed breadth within lane, in columns
                        var z = this.nodeMinColumnSpace(v, true) + 1 + this.nodeMinColumnSpace(v, false);
                        var k = j + 1;
                        while (k < arr.length && this.findLane(arr[k]) === l) {
                            var vz = arr[k];
                            z += this.nodeMinColumnSpace(vz, true) + 1 + this.nodeMinColumnSpace(vz, false);
                            k++;
                        }
                        // if there is extra space, shift the vertexes to the middle of the lane
                        if (z < w) {
                            c += Math.floor((w - z) / 2);
                        }
                    }
                    c += this.nodeMinColumnSpace(v, true);
                    v.column = c;
                    c += 1;
                    c += this.nodeMinColumnSpace(v, false);
                    prevlane = l;
                }
            }
        };
        /**
         * Return the minimum lane width, in columns
         * @param lane
         */
        SwimLaneLayout.prototype.computeMinLaneWidth = function (lane) { return 0; };
        /**
         * @hidden
         * Disable normal straightenAndPack behavior, which would mess up the columns.
         */
        SwimLaneLayout.prototype.straightenAndPack = function () { };
        /**
         * Given a vertex, get the lane (name) that its node belongs in.
         * If the lane appears to be undefined, this returns the empty string.
         * For dummy vertexes (with no node) this will return null.
         * @param v
         */
        SwimLaneLayout.prototype.getLane = function (v) {
            if (v === null)
                return null;
            var node = v.node;
            if (node !== null) {
                var data = node.data;
                if (data !== null) {
                    var lane = null;
                    if (typeof this.laneProperty === "function") {
                        lane = this.laneProperty(data);
                    }
                    else {
                        lane = data[this.laneProperty];
                    }
                    if (typeof lane === "string")
                        return lane;
                    return ""; // default lane
                }
            }
            return null;
        };
        /**
         * This is just like {@link #getLane} but handles dummy vertexes
         * for which the {@link #getLane} returns null by returning the
         * lane of the edge's source or destination vertex.
         * This can only be called after the lanes have been set up internally.
         * @param v
         */
        SwimLaneLayout.prototype.findLane = function (v) {
            if (v !== null) {
                var lane = this.getLane(v);
                if (lane !== null) {
                    return lane;
                }
                else {
                    var srcv = this.findRealSource(v.sourceEdges.first());
                    var dstv = this.findRealDestination(v.destinationEdges.first());
                    var srcLane = this.getLane(srcv);
                    var dstLane = this.getLane(dstv);
                    if (srcLane !== null || dstLane !== null) {
                        if (srcLane === dstLane)
                            return srcLane;
                        if (srcLane !== null)
                            return srcLane;
                        if (dstLane !== null)
                            return dstLane;
                    }
                }
            }
            return null;
        };
        SwimLaneLayout.prototype.findRealSource = function (e) {
            if (e === null)
                return null;
            var fv = e.fromVertex;
            if (fv && fv.node)
                return fv;
            return this.findRealSource(fv.sourceEdges.first());
        };
        SwimLaneLayout.prototype.findRealDestination = function (e) {
            if (e === null)
                return null;
            var tv = e.toVertex;
            if (tv.node)
                return tv;
            return this.findRealDestination(tv.destinationEdges.first());
        };
        SwimLaneLayout.prototype.compareVertexes = function (v, w) {
            var laneV = this.findLane(v);
            if (laneV === null)
                laneV = "";
            var laneW = this.findLane(w);
            if (laneW === null)
                laneW = "";
            if (laneV < laneW)
                return -1;
            if (laneV > laneW)
                return 1;
            return 0;
        };
        ;
        return SwimLaneLayout;
    }(go.LayeredDigraphLayout));
    exports.SwimLaneLayout = SwimLaneLayout;
});
