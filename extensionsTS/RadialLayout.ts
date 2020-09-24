﻿/*
*  Copyright (C) 1998-2020 by Northwoods Software Corporation. All Rights Reserved.
*/

/*
* This is an extension and not part of the main GoJS library.
* Note that the API for this class may change with any version, even point releases.
* If you intend to use an extension in production, you should copy the code to your own source directory.
* Extensions can be found in the GoJS kit under the extensions or extensionsTS folders.
* See the Extensions intro page (https://gojs.net/latest/intro/extensions.html) for more information.
*/

import * as go from '../release/go.js';

/**
 * Given a root {@link Node}, this arranges connected nodes in concentric rings,
 * layered by the minimum link distance from the root.
 *
 * If you want to experiment with this extension, try the <a href="../../extensionsTS/Radial.html">Radial Layout</a> sample.
 * @category Layout Extension
 */
export class RadialLayout extends go.Layout {
  private _root: go.Node | null = null;
  private _layerThickness: number = 100;  // how thick each ring should be
  private _maxLayers: number = Infinity;

  /**
   * Gets or sets the {@link Node} that acts as the root or central node of the radial layout.
   */
  get root(): go.Node | null { return this._root; }
  set root(value: go.Node | null) {
    if (this._root !== value) {
      this._root = value;
      this.invalidateLayout();
    }
  }

  /**
   * Gets or sets the thickness of each ring representing a layer.
   *
   * The default value is 100.
   */
  get layerThickness(): number { return this._layerThickness; }
  set layerThickness(value: number) {
    if (this._layerThickness !== value) {
      this._layerThickness = value;
      this.invalidateLayout();
    }
  }

  /**
   * Gets or sets the maximum number of layers to be shown, in addition to the root node at layer zero.
   *
   * The default value is Infinity.
   */
  get maxLayers(): number { return this._maxLayers; }
  set maxLayers(value: number) {
    if (this._maxLayers !== value) {
      this._maxLayers = value;
      this.invalidateLayout();
    }
  }

  /**
   * Copies properties to a cloned Layout.
   */
  public cloneProtected(copy: this): void {
    super.cloneProtected(copy);
    // don't copy .root
    copy._layerThickness = this._layerThickness;
    copy._maxLayers = this._maxLayers;
  }

  /**
   * Use a LayoutNetwork that always creates RadialVertexes.
   */
  public createNetwork(): go.LayoutNetwork {
    const net = new go.LayoutNetwork(this);
    net.createVertex = () => new RadialVertex(net);
    return net;
  }

  /**
   * Find distances between root and vertexes, and then lay out radially.
   * @param {Diagram|Group|Iterable.<Part>} coll A {@link Diagram} or a {@link Group} or a collection of {@link Part}s.
   */
  public doLayout(coll: go.Diagram | go.Group | go.Iterable<go.Part>): void {
    if (this.network === null) {
      this.network = this.makeNetwork(coll);
    }
    if (this.network.vertexes.count === 0) return;

    if (this.root === null) {
      // If no root supplied, choose one without any incoming edges
      const rit = this.network.vertexes.iterator;
      while (rit.next()) {
        const v = rit.value;
        if (v.node !== null && v.sourceEdges.count === 0) {
          this.root = v.node;
          break;
        }
      }
    }
    if (this.root === null && this.network !== null) {
      // If could not find any default root, choose a random one
      const first = this.network.vertexes.first();
      this.root = first === null ? null : first.node;
    }
    if (this.root === null) return;  // nothing to do

    const rootvert = this.network.findVertex(this.root) as RadialVertex;
    if (rootvert === null) throw new Error('RadialLayout.root must be a Node in the LayoutNetwork that the RadialLayout is operating on');

    this.arrangementOrigin = this.initialOrigin(this.arrangementOrigin);
    this.findDistances(rootvert);

    // sort all results into Arrays of RadialVertexes with the same distance
    const verts = [];
    let maxlayer = 0;
    const it = this.network.vertexes.iterator;
    while (it.next()) {
      const vv = it.value as RadialVertex;
      vv.laid = false;
      const layer = vv.distance;
      if (layer === Infinity) continue; // Infinity used as init value (set in findDistances())
      if (layer > maxlayer) maxlayer = layer;
      let layerverts: Array<go.LayoutVertex> = verts[layer];
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
  }

  /**
   * Recursively position vertexes in a radial layout
   */
  private radlay1(vert: RadialVertex, layer: number, angle: number, sweep: number): void {
    if (layer > this.maxLayers) return; // no need to position nodes outside of maxLayers
    const verts: Array<RadialVertex> = []; // array of all RadialVertexes connected to 'vert' in layer 'layer'
    const vit = vert.vertexes.iterator;
    while (vit.next()) {
      const v = vit.value as RadialVertex;
      if (v.laid) continue;
      if (v.distance === layer) verts.push(v);
    }
    // vert.vertexes.each((v: go.LayoutVertex) => {
    //   if (!(v instanceof RadialVertex)) return; // typeguard
    //   if (v.laid) return;
    //   if (v.distance === layer) verts.push(v);
    // });
    const found = verts.length;
    if (found === 0) return;

    const radius = layer * this.layerThickness;
    const separator = sweep / found; // distance between nodes in their sweep portion
    const start = angle - sweep / 2 + separator / 2;
    // for each vertex in this layer, place it in its correct layer and position
    for (let i = 0; i < found; i++) {
      const v = verts[i];
      let a = start + i * separator; // the angle to rotate the node to
      if (a < 0) a += 360; else if (a > 360) a -= 360;
      // the point to place the node at -- this corresponds with the layer the node is in
      // all nodes in the same layer are placed at a constant point, then rotated accordingly
      const p = new go.Point(radius, 0);
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
  }

  /**
   * Update RadialVertex.distance for every vertex.
   */
  private findDistances(source: RadialVertex): void {
    if (this.network === null) return;

    // keep track of distances from the source node
    const vit = this.network.vertexes.iterator;
    while (vit.next()) {
      const v = vit.value as RadialVertex;
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
    const seen = new go.Set<RadialVertex>();
    seen.add(source);

    // local function for finding a vertex with the smallest distance in a given collection
    function leastVertex(coll: go.Set<RadialVertex>): RadialVertex | null {
      let bestdist = Infinity;
      let bestvert = null;
      const it = coll.iterator;
      while (it.next()) {
        const v = it.value;
        const dist = v.distance;
        if (dist < bestdist) {
          bestdist = dist;
          bestvert = v;
        }
      }
      return bestvert;
    }

    // keep track of vertexes we have finished examining;
    // this avoids unnecessary traversals and helps keep the SEEN collection small
    const finished = new go.Set<RadialVertex>();
    while (seen.count > 0) {
      // look at the unfinished vertex with the shortest distance so far
      const least = leastVertex(seen);
      if (least === null) return;
      const leastdist = least.distance;
      // by the end of this loop we will have finished examining this LEAST vertex
      seen.remove(least);
      finished.add(least);
      // look at all edges connected with this vertex
      least.edges.each(function(e) {
        if (least === null) return;
        const neighbor = e.getOtherVertex(least);
        // skip vertexes that we have finished
        if (finished.contains(neighbor as any)) return;
        const neighbordist = (neighbor as any).distance;
        // assume "distance" along a link is unitary, but could be any non-negative number.
        const dist = leastdist + 1;
        if (dist < neighbordist) {
          // if haven't seen that vertex before, add it to the SEEN collection
          if (neighbordist === Infinity) {
            seen.add(neighbor as any);
          }
          // record the new best distance so far to that node
          (neighbor as any).distance = dist;
        }
      });
    }
  }

  /**
   * This override positions each Node and also calls {@link #rotateNode}.
   */
  public commitLayout(): void {
    super.commitLayout();
    if (this.network !== null) {
      const it = this.network.vertexes.iterator;
      while (it.next()) {
        const v = it.value as RadialVertex;
        const n = v.node;
        if (n !== null) {
          n.visible = (v.distance <= this.maxLayers);
          this.rotateNode(n, v.angle, v.sweep, v.radius);
        }
      }
    }
    this.commitLayers();
  }

  /**
   * Override this method in order to modify each node as it is laid out.
   * By default this method does nothing.
   * @expose
   */
  public rotateNode(node: go.Node, angle: number, sweep: number, radius: number): void { }

  /**
   * Override this method in order to create background circles indicating the layers of the radial layout.
   * By default this method does nothing.
   * @expose
   */
  public commitLayers(): void { }
} // end RadialLayout


/**
 * RadialVertex, a LayoutVertex that holds additional info
 */
class RadialVertex extends go.LayoutVertex {
  constructor(network: go.LayoutNetwork) {
    super(network);
  }
  public distance: number = Infinity;  // number of layers from the root, non-negative integers
  public laid: boolean = false;  // used internally to keep track
  public angle: number = 0;  // the direction at which the node is placed relative to the root node
  public sweep: number = 0;  // the angle subtended by the vertex
  public radius: number = 0;  // the inner radius of the layer containing this vertex
}
