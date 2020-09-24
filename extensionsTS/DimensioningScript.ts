/*
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
import { DimensioningLink } from './DimensioningLink.js';

export function init() {
  if ((window as any).goSamples) (window as any).goSamples();  // init for these samples -- you don't need to call this

  const $ = go.GraphObject.make;

  const myDiagram =
    $(go.Diagram, 'myDiagramDiv',
      {
        'undoManager.isEnabled': true
      });

  // A simple resizable node
  myDiagram.nodeTemplate =
    $(go.Node, 'Auto',
      { locationSpot: go.Spot.Center },
      new go.Binding('location', 'loc', go.Point.parse).makeTwoWay(go.Point.stringify),
      { resizable: true },
      $(go.Shape, { strokeWidth: 0, fill: 'lightgray' },
        new go.Binding('fill', 'color')),
      $(go.TextBlock, { margin: 10 },
        new go.Binding('text', 'key'))
    );

  // A generalized example template using a DimensioningLink.
  // Most usage might not have so many Bindings.
  myDiagram.linkTemplateMap.add('Dimensioning',
    $(DimensioningLink,
      new go.Binding('fromSpot', 'fromSpot', go.Spot.parse),
      new go.Binding('toSpot', 'toSpot', go.Spot.parse),
      new go.Binding('direction'),
      new go.Binding('extension'),
      new go.Binding('inset'),
      $(go.Shape, { stroke: 'gray' },
        new go.Binding('stroke', 'color')),
      $(go.Shape, { fromArrow: 'BackwardOpenTriangle', segmentIndex: 2, stroke: 'gray' },
        new go.Binding('stroke', 'color')),
      $(go.Shape, { toArrow: 'OpenTriangle', segmentIndex: -3, stroke: 'gray' },
        new go.Binding('stroke', 'color')),
      $(go.TextBlock,
        {
          segmentIndex: 2,
          segmentFraction: 0.5,
          segmentOrientation: go.Link.OrientUpright,
          alignmentFocus: go.Spot.Bottom,
          stroke: 'gray',
          font: '8pt sans-serif'
        },
        new go.Binding('text', '', showDistance).ofObject(),
        new go.Binding('stroke', 'color'))
    ));

  // Return a string representing the distance between the two points.
  // This is the cartesian distance if this.direction is NaN;
  // otherwise it is the orthogonal distance along that axis.
  function showDistance(link: go.Link) {
    const numpts = link.pointsCount;
    if (numpts < 2) return '';
    const p0 = link.getPoint(0);
    const pn = link.getPoint(numpts - 1);
    const ang = (link as any).direction;
    if (isNaN(ang)) return Math.floor(Math.sqrt(p0.distanceSquaredPoint(pn))) + '';
    const rad = ang * Math.PI / 180;
    return Math.floor(Math.abs(Math.cos(rad) * (p0.x - pn.x)) +
      Math.abs(Math.sin(rad) * (p0.y - pn.y))) + '';
  }

  myDiagram.model = new go.GraphLinksModel([
    { key: 'Alpha', loc: '0 50' },
    { key: 'Beta', loc: '150 0' },
    { key: 'Gamma', loc: '100 150' }
  ], [
      {
        from: 'Alpha', to: 'Beta', category: 'Dimensioning',
        fromSpot: 'TopRight', toSpot: 'TopLeft'
      },
      {
        from: 'Alpha', to: 'Beta', category: 'Dimensioning',
        fromSpot: 'TopLeft', toSpot: 'TopRight', extension: 50, color: 'blue'
      },
      {
        from: 'Alpha', to: 'Beta', category: 'Dimensioning',
        fromSpot: 'TopLeft', toSpot: 'TopLeft', direction: 270, color: 'green'
      },
      {
        from: 'Alpha', to: 'Beta', category: 'Dimensioning',
        fromSpot: 'BottomRight', toSpot: 'BottomRight', direction: 90, color: 'purple'
      },
      {
        from: 'Alpha', to: 'Beta', category: 'Dimensioning',
        fromSpot: 'Center', toSpot: 'Center', extension: 50, direction: NaN, color: 'red'
      },

      {
        from: 'Gamma', to: 'Gamma', category: 'Dimensioning',
        fromSpot: 'TopLeft', toSpot: 'TopRight', direction: 0
      },
      {
        from: 'Gamma', to: 'Gamma', category: 'Dimensioning',
        fromSpot: 'TopRight', toSpot: 'BottomRight', direction: 90
      },
      {
        from: 'Gamma', to: 'Gamma', category: 'Dimensioning',
        fromSpot: 'BottomRight', toSpot: 'BottomLeft', direction: 180
      },
      {
        from: 'Gamma', to: 'Gamma', category: 'Dimensioning',
        fromSpot: 'BottomLeft', toSpot: 'TopLeft', direction: 270
      }
    ]);

  // Attach to the window for console manipulation
  (window as any).myDiagram = myDiagram;
}
