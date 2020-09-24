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
    exports.RadialLayout = void 0;
    /*
    * This is an extension and not part of the main GoJS library.
    * Note that the API for this class may change with any version, even point releases.
    * If you intend to use an extension in production, you should copy the code to your own source directory.
    * Extensions can be found in the GoJS kit under the extensions or extensionsTS folders.
    * See the Extensions intro page (https://gojs.net/latest/intro/extensions.html) for more information.
    */
    var go = require("../release/go.js");
    /**
     * Given a root {@link Node}, this arranges connected nodes in concentric rings,
     * layered by the minimum link distance from the root.
     *
     * If you want to experiment with this extension, try the <a href="../../extensionsTS/Radial.html">Radial Layout</a> sample.
     * @category Layout Extension
     */
    var RadialLayout = /** @class */ (function (_super) {
        __extends(RadialLayout, _super);
        function RadialLayout() {
            var _this = _super !== null && _super.apply(this, arguments) || this;
            _this._root = null;
            _this._layerThickness = 100; // how thick each ring should be
            _this._maxLayers = Infinity;
            return _this;
        }
        Object.defineProperty(RadialLayout.prototype, "root", {
            /**
             * Gets or sets the {@link Node} that acts as the root or central node of the radial layout.
             */
            get: function () { return this._root; },
            set: function (value) {
                if (this._root !== value) {
                    this._root = value;
                    this.invalidateLayout();
                }
            },
            enumerable: false,
            configurable: true
        });
        Object.defineProperty(RadialLayout.prototype, "layerThickness", {
            /**
             * Gets or sets the thickness of each ring representing a layer.
             *
             * The default value is 100.
             */
            get: function () { return this._layerThickness; },
            set: function (value) {
                if (this._layerThickness !== value) {
                    this._layerThickness = value;
                    this.invalidateLayout();
                }
            },
            enumerable: false,
            configurable: true
        });
        Object.defineProperty(RadialLayout.prototype, "maxLayers", {
            /**
             * Gets or sets the maximum number of layers to be shown, in addition to the root node at layer zero.
             *
             * The default value is Infinity.
             */
            get: function () { return this._maxLayers; },
            set: function (value) {
                if (this._maxLayers !== value) {
                    this._maxLayers = value;
                    this.invalidateLayout();
                }
            },
            enumerable: false,
            configurable: true
        });
        /**
         * Copies properties to a cloned Layout.
         */
        RadialLayout.prototype.cloneProtected = function (copy) {
            _super.prototype.cloneProtected.call(this, copy);
            // don't copy .root
            copy._layerThickness = this._layerThickness;
            copy._maxLayers = this._maxLayers;
        };
        /**
         * Use a LayoutNetwork that always creates RadialVertexes.
         */
        RadialLayout.prototype.createNetwork = function () {
            var net = new go.LayoutNetwork(this);
            net.createVertex = function () { return new RadialVertex(net); };
            return net;
        };
        /**
         * Find distances between root and vertexes, and then lay out radially.
         * @param {Diagram|Group|Iterable.<Part>} coll A {@link Diagram} or a {@link Group} or a collection of {@link Part}s.
         */
        RadialLayout.prototype.doLayout = function (coll) {
            if (this.network === null) {
                this.network = this.makeNetwork(coll);
            }
            if (this.network.vertexes.count === 0)
                return;
            if (this.root === null) {
                // If no root supplied, choose one without any incoming edges
                var rit = this.network.vertexes.iterator;
                while (rit.next()) {
                    var v = rit.value;
                    if (v.node !== null && v.sourceEdges.count === 0) {
                        this.root = v.node;
                        break;
                    }
                }
            }
            if (this.root === null && this.network !== null) {
                // If could not find any default root, choose a random one
                var first = this.network.vertexes.first();
                this.root = first === null ? null : first.node;
            }
            if (this.root === null)
                return; // nothing to do
            var rootvert = this.network.findVertex(this.root);
            if (rootvert === null)
                throw new Error('RadialLayout.root must be a Node in the LayoutNetwork that the RadialLayout is operating on');
            this.arrangementOrigin = this.initialOrigin(this.arrangementOrigin);
            this.findDistances(rootvert);
            // sort all results into Arrays of RadialVertexes with the same distance
            var verts = [];
            var maxlayer = 0;
            var it = this.network.vertexes.iterator;
            while (it.next()) {
                var vv = it.value;
                vv.laid = false;
                var layer = vv.distance;
                if (layer === Infinity)
                    continue; // Infinity used as init value (set in findDistances())
                if (layer > maxlayer)
                    maxlayer = layer;
                var layerverts = verts[layer];
                if (layerverts === undefined) {
                    layerverts = [];
                    verts[layer] = layerverts;
                }
                layerverts.push(vv);
            }
            // now recursively position nodes (using radlay1()), starting with the root
            rootvert.centerX = this.arrangementOrigin.x;
            rootvert.centerY = this.arrangementOrigin.y;
            this.radlay1(rootvert, 1, 0, 360);
            // Update the "physical" positions of the nodes and links.
            this.updateParts();
            this.network = null;
        };
        /**
         * Recursively position vertexes in a radial layout
         */
        RadialLayout.prototype.radlay1 = function (vert, layer, angle, sweep) {
            if (layer > this.maxLayers)
                return; // no need to position nodes outside of maxLayers
            var verts = []; // array of all RadialVertexes connected to 'vert' in layer 'layer'
            var vit = vert.vertexes.iterator;
            while (vit.next()) {
                var v = vit.value;
                if (v.laid)
                    continue;
                if (v.distance === layer)
                    verts.push(v);
            }
            // vert.vertexes.each((v: go.LayoutVertex) => {
            //   if (!(v instanceof RadialVertex)) return; // typeguard
            //   if (v.laid) return;
            //   if (v.distance === layer) verts.push(v);
            // });
            var found = verts.length;
            if (found === 0)
                return;
            var radius = layer * this.layerThickness;
            var separator = sweep / found; // distance between nodes in their sweep portion
            var start = angle - sweep / 2 + separator / 2;
            // for each vertex in this layer, place it in its correct layer and position
            for (var i = 0; i < found; i++) {
                var v = verts[i];
                var a = start + i * separator; // the angle to rotate the node to
                if (a < 0)
                    a += 360;
                else if (a > 360)
                    a -= 360;
                // the point to place the node at -- this corresponds with the layer the node is in
                // all nodes in the same layer are placed at a constant point, then rotated accordingly
                var p = new go.Point(radius, 0);
                p.rotate(a);
                v.centerX = p.x + this.arrangementOrigin.x;
                v.centerY = p.y + this.arrangementOrigin.y;
                v.laid = true;
                v.angle = a;
                v.sweep = separator;
                v.radius = radius;
                // keep going for all layers
                this.radlay1(v, layer + 1, a, sweep / found);
            }
        };
        /**
         * Update RadialVertex.distance for every vertex.
         */
        RadialLayout.prototype.findDistances = function (source) {
            if (this.network === null)
                return;
            // keep track of distances from the source node
            var vit = this.network.vertexes.iterator;
            while (vit.next()) {
                var v = vit.value;
                v.distance = Infinity;
            }
            // this.network.vertexes.each((v: go.LayoutVertex) => {
            //   if (!(v instanceof RadialVertex)) return; // typeguard
            //   v.distance = Infinity;
            // });
            // the source node starts with distance 0
            source.distance = 0;
            // keep track of nodes for we have set a non-Infinity distance,
            // but which we have not yet finished examining
            var seen = new go.Set();
            seen.add(source);
            // local function for finding a vertex with the smallest distance in a given collection
            function leastVertex(coll) {
                var bestdist = Infinity;
                var bestvert = null;
                var it = coll.iterator;
                while (it.next()) {
                    var v = it.value;
                    var dist = v.distance;
                    if (dist < bestdist) {
                        bestdist = dist;
                        bestvert = v;
                    }
                }
                return bestvert;
            }
            // keep track of vertexes we have finished examining;
            // this avoids unnecessary traversals and helps keep the SEEN collection small
            var finished = new go.Set();
            var _loop_1 = function () {
                // look at the unfinished vertex with the shortest distance so far
                var least = leastVertex(seen);
                if (least === null)
                    return { value: void 0 };
                var leastdist = least.distance;
                // by the end of this loop we will have finished examining this LEAST vertex
                seen.remove(least);
                finished.add(least);
                // look at all edges connected with this vertex
                least.edges.each(function (e) {
                    if (least === null)
                        return;
                    var neighbor = e.getOtherVertex(least);
                    // skip vertexes that we have finished
                    if (finished.contains(neighbor))
                        return;
                    var neighbordist = neighbor.distance;
                    // assume "distance" along a link is unitary, but could be any non-negative number.
                    var dist = leastdist + 1;
                    if (dist < neighbordist) {
                        // if haven't seen that vertex before, add it to the SEEN collection
                        if (neighbordist === Infinity) {
                            seen.add(neighbor);
                        }
                        // record the new best distance so far to that node
                        neighbor.distance = dist;
                    }
                });
            };
            while (seen.count > 0) {
                var state_1 = _loop_1();
                if (typeof state_1 === "object")
                    return state_1.value;
            }
        };
        /**
         * This override positions each Node and also calls {@link #rotateNode}.
         */
        RadialLayout.prototype.commitLayout = function () {
            _super.prototype.commitLayout.call(this);
            if (this.network !== null) {
                var it = this.network.vertexes.iterator;
                while (it.next()) {
                    var v = it.value;
                    var n = v.node;
                    if (n !== null) {
                        n.visible = (v.distance <= this.maxLayers);
                        this.rotateNode(n, v.angle, v.sweep, v.radius);
                    }
                }
            }
            this.commitLayers();
        };
        /**
         * Override this method in order to modify each node as it is laid out.
         * By default this method does nothing.
         * @expose
         */
        RadialLayout.prototype.rotateNode = function (node, angle, sweep, radius) { };
        /**
         * Override this method in order to create background circles indicating the layers of the radial layout.
         * By default this method does nothing.
         * @expose
         */
        RadialLayout.prototype.commitLayers = function () { };
        return RadialLayout;
    }(go.Layout)); // end RadialLayout
    exports.RadialLayout = RadialLayout;
    /**
     * RadialVertex, a LayoutVertex that holds additional info
     */
    var RadialVertex = /** @class */ (function (_super) {
        __extends(RadialVertex, _super);
        function RadialVertex(network) {
            var _this = _super.call(this, network) || this;
            _this.distance = Infinity; // number of layers from the root, non-negative integers
            _this.laid = false; // used internally to keep track
            _this.angle = 0; // the direction at which the node is placed relative to the root node
            _this.sweep = 0; // the angle subtended by the vertex
            _this.radius = 0; // the inner radius of the layer containing this vertex
            return _this;
        }
        return RadialVertex;
    }(go.LayoutVertex));
});
