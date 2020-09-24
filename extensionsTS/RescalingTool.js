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
    exports.RescalingTool = void 0;
    var go = require("../release/go.js");
    // A custom Tool to change the scale of an object in a Part.
    /*
    * This is an extension and not part of the main GoJS library.
    * Note that the API for this class may change with any version, even point releases.
    * If you intend to use an extension in production, you should copy the code to your own source directory.
    * Extensions can be found in the GoJS kit under the extensions or extensionsTS folders.
    * See the Extensions intro page (https://gojs.net/latest/intro/extensions.html) for more information.
    */
    /**
    * A custom tool for rescaling an object by modifying its {@link GraphObject#scale} property.
    *
    * Install the RescalingTool as a mouse-down tool by calling:
    * myDiagram.toolManager.mouseDownTools.add(new RescalingTool());
    *
    * Normally it would not make sense for the same object to be both resizable and rescalable.
    *
    * Note that there is no <code>Part.rescaleObjectName</code> property and there is no <code>Part.rescalable</code> property.
    * So although you cannot customize any Node to affect this tool, you can set
    * <a>RescalingTool.rescaleObjectName</a> and set <a>RescalingTool.isEnabled</a> to control
    * whether objects are rescalable and when.
    *
    * If you want to experiment with this extension, try the <a href="../../extensionsTS/Rescaling.html">Rescaling</a> sample.
    * @category Tool Extension
    */
    var RescalingTool = /** @class */ (function (_super) {
        __extends(RescalingTool, _super);
        function RescalingTool() {
            var _this = _super.call(this) || this;
            _this._rescaleObjectName = "";
            // internal state
            _this._adornedObject = null;
            _this._handle = null;
            _this.originalPoint = new go.Point();
            _this.originalTopLeft = new go.Point();
            _this.originalScale = 1.0;
            _this.name = "Rescaling";
            var h = new go.Shape();
            h.desiredSize = new go.Size(8, 8);
            h.fill = "lightblue";
            h.stroke = "dodgerblue";
            h.strokeWidth = 1;
            h.cursor = "nwse-resize";
            _this._handleArchetype = h;
            return _this;
        }
        Object.defineProperty(RescalingTool.prototype, "adornedObject", {
            /**
             * Gets the {@link GraphObject} that is being rescaled.
             * This may be the same object as the selected {@link Part} or it may be contained within that Part.
             *
             * This property is also settable, but should only be set when overriding functions
             * in RescalingTool, and not during normal operation.
             */
            get: function () { return this._adornedObject; },
            set: function (val) { this._adornedObject = val; },
            enumerable: false,
            configurable: true
        });
        Object.defineProperty(RescalingTool.prototype, "handleArchetype", {
            /**
             * Gets or sets a small GraphObject that is copied as a rescale handle for the selected part.
             * By default this is a {@link Shape} that is a small blue square.
             * Setting this property does not raise any events.
             *
             * Here is an example of changing the default handle to be green "X":
             * ```js
             *   tool.handleArchetype =
             *     $(go.Shape, "XLine",
             *       { width: 8, height: 8, stroke: "green", fill: "transparent" });
             * ```
             */
            get: function () { return this._handleArchetype; },
            set: function (val) { this._handleArchetype = val; },
            enumerable: false,
            configurable: true
        });
        Object.defineProperty(RescalingTool.prototype, "handle", {
            /**
             * This property returns the {@link GraphObject} that is the tool handle being dragged by the user.
             * This will be contained by an {@link Adornment} whose category is "RescalingTool".
             * Its {@link Adornment#adornedObject} is the same as the {@link #adornedObject}.
             *
             * This property is also settable, but should only be set either within an override of {@link #doActivate}
             * or prior to calling {@link #doActivate}.
             */
            get: function () { return this._handle; },
            set: function (val) { this._handle = val; },
            enumerable: false,
            configurable: true
        });
        Object.defineProperty(RescalingTool.prototype, "rescaleObjectName", {
            /**
             * This property returns the name of the GraphObject that identifies the object to be rescaled by this tool.
             *
             * The default value is the empty string, resulting in the whole Node being rescaled.
             * This property is used by findRescaleObject when calling {@link Panel#findObject}.
             */
            get: function () { return this._rescaleObjectName; },
            set: function (val) { this._rescaleObjectName = val; },
            enumerable: false,
            configurable: true
        });
        /**
        * @this {RescalingTool}
        * @param {Part} part
        */
        RescalingTool.prototype.updateAdornments = function (part) {
            if (part === null || part instanceof go.Link)
                return;
            if (part.isSelected && !this.diagram.isReadOnly) {
                var rescaleObj = this.findRescaleObject(part);
                if (rescaleObj !== null && part.actualBounds.isReal() && part.isVisible() &&
                    rescaleObj.actualBounds.isReal() && rescaleObj.isVisibleObject()) {
                    var adornment = part.findAdornment(this.name);
                    if (adornment === null || adornment.adornedObject !== rescaleObj) {
                        adornment = this.makeAdornment(rescaleObj);
                    }
                    if (adornment !== null) {
                        adornment.location = rescaleObj.getDocumentPoint(go.Spot.BottomRight);
                        part.addAdornment(this.name, adornment);
                        return;
                    }
                }
            }
            part.removeAdornment(this.name);
        };
        /**
        * @this {RescalingTool}
        * @param {GraphObject} rescaleObj
        * @return {Adornment}
        */
        RescalingTool.prototype.makeAdornment = function (rescaleObj) {
            var adornment = new go.Adornment();
            adornment.type = go.Panel.Position;
            adornment.locationSpot = go.Spot.Center;
            adornment.add(this._handleArchetype.copy());
            adornment.adornedObject = rescaleObj;
            return adornment;
        };
        /**
        * Return the GraphObject to be rescaled by the user.
        * @this {RescalingTool}
        * @return {GraphObject}
        */
        RescalingTool.prototype.findRescaleObject = function (part) {
            var obj = part.findObject(this.rescaleObjectName);
            if (obj)
                return obj;
            return part;
        };
        /**
        * This tool can start running if the mouse-down happens on a "Rescaling" handle.
        * @this {RescalingTool}
        * @return {boolean}
        */
        RescalingTool.prototype.canStart = function () {
            var diagram = this.diagram;
            if (diagram === null || diagram.isReadOnly)
                return false;
            if (!diagram.lastInput.left)
                return false;
            var h = this.findToolHandleAt(diagram.firstInput.documentPoint, this.name);
            return (h !== null);
        };
        /**
        * Activating this tool remembers the {@link #handle} that was dragged,
        * the {@link #adornedObject} that is being rescaled,
        * starts a transaction, and captures the mouse.
        * @this {RescalingTool}
        */
        RescalingTool.prototype.doActivate = function () {
            var diagram = this.diagram;
            if (diagram === null)
                return;
            this._handle = this.findToolHandleAt(diagram.firstInput.documentPoint, this.name);
            if (this._handle === null)
                return;
            var ad = this._handle.part;
            this._adornedObject = (ad instanceof go.Adornment) ? ad.adornedObject : null;
            if (!this._adornedObject)
                return;
            this.originalPoint = this._handle.getDocumentPoint(go.Spot.Center);
            this.originalTopLeft = this._adornedObject.getDocumentPoint(go.Spot.TopLeft);
            this.originalScale = this._adornedObject.scale;
            diagram.isMouseCaptured = true;
            diagram.delaysLayout = true;
            this.startTransaction(this.name);
            this.isActive = true;
        };
        /**
        * Stop the current transaction, forget the {@link #handle} and {@link #adornedObject}, and release the mouse.
        * @this {RescalingTool}
        */
        RescalingTool.prototype.doDeactivate = function () {
            var diagram = this.diagram;
            if (diagram === null)
                return;
            this.stopTransaction();
            this._handle = null;
            this._adornedObject = null;
            diagram.isMouseCaptured = false;
            this.isActive = false;
        };
        ;
        /**
        * Restore the original {@link GraphObject#scale} of the adorned object.
        * @this {RescalingTool}
        */
        RescalingTool.prototype.doCancel = function () {
            var diagram = this.diagram;
            if (diagram !== null)
                diagram.delaysLayout = false;
            this.scale(this.originalScale);
            this.stopTool();
        };
        /**
        * Call {@link #scale} with a new scale determined by the current mouse point.
        * This determines the new scale by calling {@link #computeScale}.
        * @this {RescalingTool}
        */
        RescalingTool.prototype.doMouseMove = function () {
            var diagram = this.diagram;
            if (this.isActive && diagram !== null) {
                var newScale = this.computeScale(diagram.lastInput.documentPoint);
                this.scale(newScale);
            }
        };
        /**
        * Call {@link #scale} with a new scale determined by the most recent mouse point,
        * and commit the transaction.
        * @this {RescalingTool}
        */
        RescalingTool.prototype.doMouseUp = function () {
            var diagram = this.diagram;
            if (this.isActive && diagram !== null) {
                diagram.delaysLayout = false;
                var newScale = this.computeScale(diagram.lastInput.documentPoint);
                this.scale(newScale);
                this.transactionResult = this.name;
            }
            this.stopTool();
        };
        /**
        * Set the {@link GraphObject#scale} of the {@link #findRescaleObject}.
        * @this {RescalingTool}
        * @param {number} newScale
        */
        RescalingTool.prototype.scale = function (newScale) {
            if (this._adornedObject !== null) {
                this._adornedObject.scale = newScale;
            }
        };
        /**
        * Compute the new scale given a point.
        *
        * This method is called by both {@link #doMouseMove} and {@link #doMouseUp}.
        * This method may be overridden.
        * Please read the Introduction page on <a href="../../intro/extensions.html">Extensions</a> for how to override methods and how to call this base method.
        * @this {RescalingTool}
        * @param {Point} newPoint in document coordinates
        */
        RescalingTool.prototype.computeScale = function (newPoint) {
            var scale = this.originalScale;
            var origdist = Math.sqrt(this.originalPoint.distanceSquaredPoint(this.originalTopLeft));
            var newdist = Math.sqrt(newPoint.distanceSquaredPoint(this.originalTopLeft));
            return scale * (newdist / origdist);
        };
        return RescalingTool;
    }(go.Tool));
    exports.RescalingTool = RescalingTool;
});
