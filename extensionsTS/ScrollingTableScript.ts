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

export function init() {
  if ((window as any).goSamples) (window as any).goSamples();  // init for these samples -- you don't need to call this

  const $ = go.GraphObject.make;

  const myDiagram =
    $(go.Diagram, 'myDiagramDiv',
      {
        'PartResized': function(e: go.DiagramEvent) {
          const node = e.subject;
          const scroller = node.findObject('SCROLLER');
          if (scroller !== null) scroller._updateScrollBar(scroller.findObject('TABLE'));
        }
      });

  myDiagram.nodeTemplate =
    $(go.Node, 'Vertical',
      {
        selectionObjectName: 'SCROLLER',
        resizable: true, resizeObjectName: 'SCROLLER',
        portSpreading: go.Node.SpreadingNone
      },
      new go.Binding('location').makeTwoWay(),
      $(go.TextBlock,
        { font: 'bold 14px sans-serif' },
        new go.Binding('text', 'key')),
      $(go.Panel, 'Auto',
        $(go.Shape, { fill: 'white' }),
        $('ScrollingTable',
          {
            name: 'SCROLLER',
            desiredSize: new go.Size(NaN, 60),  // fixed width
            stretch: go.GraphObject.Fill,       // but stretches vertically
            defaultColumnSeparatorStroke: 'gray',
            defaultColumnSeparatorStrokeWidth: 0.5
          },
          new go.Binding('TABLE.itemArray', 'items'),
          new go.Binding('TABLE.column', 'left', function(left) { return left ? 2 : 0; }),
          new go.Binding('desiredSize', 'size').makeTwoWay(),
          {
            'TABLE.itemTemplate':
              $(go.Panel, 'TableRow',
                {
                  defaultStretch: go.GraphObject.Horizontal,
                  fromSpot: go.Spot.LeftRightSides, toSpot: go.Spot.LeftRightSides,
                  fromLinkable: true, toLinkable: true
                },
                new go.Binding('portId', 'name'),
                $(go.TextBlock, { column: 0 }, new go.Binding('text', 'name')),
                $(go.TextBlock, { column: 1 }, new go.Binding('text', 'value'))
              ),
            'TABLE.defaultColumnSeparatorStroke': 'gray',
            'TABLE.defaultColumnSeparatorStrokeWidth': 0.5,
            'TABLE.defaultRowSeparatorStroke': 'gray',
            'TABLE.defaultRowSeparatorStrokeWidth': 0.5,
            'TABLE.defaultSeparatorPadding': new go.Margin(1, 3, 0, 3)
          }
        )
      )
    );

  myDiagram.model = $(go.GraphLinksModel,
    {
      linkFromPortIdProperty: 'fromPort',
      linkToPortIdProperty: 'toPort',
      nodeDataArray: [
        {
          key: 'Alpha', left: true, location: new go.Point(0, 0), size: new go.Size(100, 50),
          items:
            [
              { name: 'A', value: 1 },
              { name: 'B', value: 2 },
              { name: 'C', value: 3 },
              { name: 'D', value: 4 },
              { name: 'E', value: 5 },
              { name: 'F', value: 6 },
              { name: 'G', value: 7 }
            ]
        },
        {
          key: 'Beta', location: new go.Point(150, 0),
          items:
            [
              { name: 'Aa', value: 1 },
              { name: 'Bb', value: 2 },
              { name: 'Cc', value: 3 },
              { name: 'Dd', value: 4 },
              { name: 'Ee', value: 5 },
              { name: 'Ff', value: 6 },
              { name: 'Gg', value: 7 },
              { name: 'Hh', value: 8 },
              { name: 'Ii', value: 9 },
              { name: 'Jj', value: 10 },
              { name: 'Kk', value: 11 },
              { name: 'Ll', value: 12 },
              { name: 'Mm', value: 13 },
              { name: 'Nn', value: 14 }
            ]
        }
      ],
      linkDataArray: [
        { from: 'Alpha', fromPort: 'D', to: 'Beta', toPort: 'Ff' },
        { from: 'Alpha', fromPort: 'A', to: 'Beta', toPort: 'Nn' },
        { from: 'Alpha', fromPort: 'G', to: 'Beta', toPort: 'Aa' }
      ]
    });
}
