'use strict';

class EventDispatcher {
  constructor() {
    this._listeners = {};
  }

  addEventListener(type, listener) {
    const listeners = this._listeners;

    if (listeners[type] === undefined) {
      listeners[type] = [];
    }

    if (listeners[type].indexOf(listener) === -1) {
      listeners[type].push(listener);
    }

    return this;
  }

  removeEventListener(type, listener) {
    if (this._listeners === undefined) return this;
    const listeners = this._listeners;
    const listenerArray = listeners[type];

    if (listenerArray !== undefined) {
      const index = listenerArray.indexOf(listener);

      if (index !== -1) {
        listenerArray.splice(index, 1);
      }
    }

    return this;
  }

  dispatchEvent(event) {
    if (this._listeners === undefined) return this;
    const listeners = this._listeners;
    const listenerArray = listeners[event.type];

    if (listenerArray !== undefined) {
      // Make a copy, in case listeners are removed while iterating.
      const array = listenerArray.slice(0);

      for (let i = 0, l = array.length; i < l; i++) {
        array[i].call(this, event);
      }
    }

    return this;
  }

  dispose() {
    for (const key in this._listeners) {
      delete this._listeners[key];
    }
  }

}

/**
 * Represents a connection between two {@link GraphNode} resources in a {@link Graph}.
 *
 * The left node is considered the owner, and the right node the resource. The
 * owner is responsible for being able find and remove a reference to a resource, given
 * that link. The resource does not hold a reference to the link or to the owner,
 * although that reverse lookup can be done on the graph.
 */

class GraphEdge extends EventDispatcher {
  constructor(_name, _parent, _child, _attributes = {}) {
    super();
    this._name = void 0;
    this._parent = void 0;
    this._child = void 0;
    this._attributes = void 0;
    this._disposed = false;
    this._name = _name;
    this._parent = _parent;
    this._child = _child;
    this._attributes = _attributes;

    if (!_parent.isOnGraph(_child)) {
      throw new Error('Cannot connect disconnected graphs.');
    }
  }
  /** Name. */


  getName() {
    return this._name;
  }
  /** Owner node. */


  getParent() {
    return this._parent;
  }
  /** Resource node. */


  getChild() {
    return this._child;
  }
  /**
   * Sets the child node.
   *
   * @internal Only {@link Graph} implementations may safely call this method directly. Use
   * 	{@link Property.swap} or {@link Graph.swapChild} instead.
   */


  setChild(child) {
    this._child = child;
    return this;
  }
  /** Attributes of the graph node relationship. */


  getAttributes() {
    return this._attributes;
  }
  /** Destroys a (currently intact) edge, updating both the graph and the owner. */


  dispose() {
    if (this._disposed) return;
    this._disposed = true;
    this.dispatchEvent({
      type: 'dispose',
      target: this
    });
    super.dispose();
  }
  /** Whether this link has been destroyed. */


  isDisposed() {
    return this._disposed;
  }

}

/**
 * A graph manages a network of {@link GraphNode} nodes, connected
 * by {@link @Link} edges.
 */

class Graph extends EventDispatcher {
  constructor(...args) {
    super(...args);
    this._emptySet = new Set();
    this._edges = new Set();
    this._parentEdges = new Map();
    this._childEdges = new Map();
  }

  /** Returns a list of all parent->child edges on this graph. */
  listEdges() {
    return Array.from(this._edges);
  }
  /** Returns a list of all edges on the graph having the given node as their child. */


  listParentEdges(node) {
    return Array.from(this._childEdges.get(node) || this._emptySet);
  }
  /** Returns a list of parent nodes for the given child node. */


  listParents(node) {
    return this.listParentEdges(node).map(edge => edge.getParent());
  }
  /** Returns a list of all edges on the graph having the given node as their parent. */


  listChildEdges(node) {
    return Array.from(this._parentEdges.get(node) || this._emptySet);
  }
  /** Returns a list of child nodes for the given parent node. */


  listChildren(node) {
    return this.listChildEdges(node).map(edge => edge.getChild());
  }

  disconnectParents(node, filter) {
    let edges = this.listParentEdges(node);

    if (filter) {
      edges = edges.filter(edge => filter(edge.getParent()));
    }

    edges.forEach(edge => edge.dispose());
    return this;
  }
  /**
   * Creates a {@link GraphEdge} connecting two {@link GraphNode} instances. Edge is returned
   * for the caller to store.
   * @param a Owner
   * @param b Resource
   */


  createEdge(name, a, b, attributes) {
    return this._registerEdge(new GraphEdge(name, a, b, attributes));
  }
  /**********************************************************************************************
   * Internal.
   */

  /** @hidden */


  _registerEdge(edge) {
    this._edges.add(edge);

    const parent = edge.getParent();
    if (!this._parentEdges.has(parent)) this._parentEdges.set(parent, new Set());

    this._parentEdges.get(parent).add(edge);

    const child = edge.getChild();
    if (!this._childEdges.has(child)) this._childEdges.set(child, new Set());

    this._childEdges.get(child).add(edge);

    edge.addEventListener('dispose', () => this._removeEdge(edge));
    return edge;
  }
  /**
   * Removes the {@link GraphEdge} from the {@link Graph}. This method should only
   * be invoked by the onDispose() listener created in {@link _registerEdge()}. The
   * public method of removing an edge is {@link GraphEdge.dispose}.
   */


  _removeEdge(edge) {
    this._edges.delete(edge);

    this._parentEdges.get(edge.getParent()).delete(edge);

    this._childEdges.get(edge.getChild()).delete(edge);

    return this;
  }

}

function _extends$3() {
  _extends$3 = Object.assign || function (target) {
    for (var i = 1; i < arguments.length; i++) {
      var source = arguments[i];

      for (var key in source) {
        if (Object.prototype.hasOwnProperty.call(source, key)) {
          target[key] = source[key];
        }
      }
    }

    return target;
  };

  return _extends$3.apply(this, arguments);
}

/**
 * An ordered collection of {@link Ref Refs}, allowing duplicates. Removing
 * a Ref is an O(n) operation — use {@link RefSet} for faster removal, if
 * duplicates are not required.
 */
class RefList {
  constructor(refs) {
    this.list = [];

    if (refs) {
      for (const ref of refs) {
        this.list.push(ref);
      }
    }
  }

  add(ref) {
    this.list.push(ref);
  }

  remove(ref) {
    const index = this.list.indexOf(ref);
    if (index >= 0) this.list.splice(index, 1);
  }

  removeChild(child) {
    const refs = [];

    for (const ref of this.list) {
      if (ref.getChild() === child) {
        refs.push(ref);
      }
    }

    for (const ref of refs) {
      this.remove(ref);
    }

    return refs;
  }

  listRefsByChild(child) {
    const refs = [];

    for (const ref of this.list) {
      if (ref.getChild() === child) {
        refs.push(ref);
      }
    }

    return refs;
  }

  values() {
    return this.list;
  }

}
/**
 * An ordered collection of {@link Ref Refs}, without duplicates. Adding or
 * removing a Ref is typically O(1) or O(log(n)), and faster than
 * {@link RefList}. If support for duplicates is required, use {@link RefList}.
 */

class RefSet {
  constructor(refs) {
    this.set = new Set();
    this.map = new Map();

    if (refs) {
      for (const ref of refs) {
        this.add(ref);
      }
    }
  }

  add(ref) {
    const child = ref.getChild();
    this.removeChild(child);
    this.set.add(ref);
    this.map.set(child, ref);
  }

  remove(ref) {
    this.set.delete(ref);
    this.map.delete(ref.getChild());
  }

  removeChild(child) {
    const ref = this.map.get(child) || null;
    if (ref) this.remove(ref);
    return ref;
  }

  getRefByChild(child) {
    return this.map.get(child) || null;
  }

  values() {
    return Array.from(this.set);
  }

}
/**
 * Map (or dictionary) from string keys to {@link Ref Refs}.
 */

class RefMap {
  constructor(map) {
    this.map = {};

    if (map) {
      Object.assign(this.map, map);
    }
  }

  set(key, child) {
    this.map[key] = child;
  }

  delete(key) {
    delete this.map[key];
  }

  get(key) {
    return this.map[key] || null;
  }

  keys() {
    return Object.keys(this.map);
  }

  values() {
    return Object.values(this.map);
  }

}

const $attributes = Symbol('attributes');
const $immutableKeys = Symbol('immutableKeys');
/**
 * Represents a node in a {@link Graph}.
 */

class GraphNode extends EventDispatcher {
  /**
   * Internal graph used to search and maintain references.
   * @hidden
   */

  /**
   * Attributes (literal values and GraphNode references) associated with this instance. For each
   * GraphNode reference, the attributes stores a {@link GraphEdge}. List and Map references are
   * stored as arrays and dictionaries of edges.
   * @internal
   */

  /**
   * Attributes included with `getDefaultAttributes` are considered immutable, and cannot be
   * modifed by `.setRef()`, `.copy()`, or other GraphNode methods. Both the edges and the
   * properties will be disposed with the parent GraphNode.
   *
   * Currently, only single-edge references (getRef/setRef) are supported as immutables.
   *
   * @internal
   */
  constructor(graph) {
    super();
    this._disposed = false;
    this.graph = void 0;
    this[$attributes] = void 0;
    this[$immutableKeys] = void 0;
    this.graph = graph;
    this[$immutableKeys] = new Set();
    this[$attributes] = this._createAttributes();
  }
  /**
   * Returns default attributes for the graph node. Subclasses having any attributes (either
   * literal values or references to other graph nodes) must override this method. Literal
   * attributes should be given their default values, if any. References should generally be
   * initialized as empty (Ref → null, RefList → [], RefMap → {}) and then modified by setters.
   *
   * Any single-edge references (setRef) returned by this method will be considered immutable,
   * to be owned by and disposed with the parent node. Multi-edge references (addRef, removeRef,
   * setRefMap) cannot be returned as default attributes.
   */


  getDefaults() {
    return {};
  }
  /**
   * Constructs and returns an object used to store a graph nodes attributes. Compared to the
   * default Attributes interface, this has two distinctions:
   *
   * 1. Slots for GraphNode<T> objects are replaced with slots for GraphEdge<this, GraphNode<T>>
   * 2. GraphNode<T> objects provided as defaults are considered immutable
   *
   * @internal
   */


  _createAttributes() {
    const defaultAttributes = this.getDefaults();
    const attributes = {};

    for (const key in defaultAttributes) {
      const value = defaultAttributes[key]; // TODO(design): With Ref, RefList, and RefMap types, should users
      // be able to pass them all here? Listeners must be added.

      if (value instanceof GraphNode) {
        const ref = this.graph.createEdge(key, this, value);
        ref.addEventListener('dispose', () => value.dispose());
        this[$immutableKeys].add(key);
        attributes[key] = ref;
      } else {
        attributes[key] = value;
      }
    }

    return attributes;
  }
  /** @internal Returns true if two nodes are on the same {@link Graph}. */


  isOnGraph(other) {
    return this.graph === other.graph;
  }
  /** Returns true if the node has been permanently removed from the graph. */


  isDisposed() {
    return this._disposed;
  }
  /**
   * Removes both inbound references to and outbound references from this object. At the end
   * of the process the object holds no references, and nothing holds references to it. A
   * disposed object is not reusable.
   */


  dispose() {
    if (this._disposed) return;
    this.graph.listChildEdges(this).forEach(edge => edge.dispose());
    this.graph.disconnectParents(this);
    this._disposed = true;
    this.dispatchEvent({
      type: 'dispose'
    });
  }
  /**
   * Removes all inbound references to this object. At the end of the process the object is
   * considered 'detached': it may hold references to child resources, but nothing holds
   * references to it. A detached object may be re-attached.
   */


  detach() {
    this.graph.disconnectParents(this);
    return this;
  }
  /**
   * Transfers this object's references from the old node to the new one. The old node is fully
   * detached from this parent at the end of the process.
   *
   * @hidden
   */


  swap(prevValue, nextValue) {
    for (const attribute in this[$attributes]) {
      const value = this[$attributes][attribute];

      if (value instanceof GraphEdge) {
        const ref = value;

        if (ref.getChild() === prevValue) {
          this.setRef(attribute, nextValue, ref.getAttributes());
        }
      } else if (value instanceof RefList) {
        for (const ref of value.listRefsByChild(prevValue)) {
          const refAttributes = ref.getAttributes();
          this.removeRef(attribute, prevValue);
          this.addRef(attribute, nextValue, refAttributes);
        }
      } else if (value instanceof RefSet) {
        const ref = value.getRefByChild(prevValue);

        if (ref) {
          const refAttributes = ref.getAttributes();
          this.removeRef(attribute, prevValue);
          this.addRef(attribute, nextValue, refAttributes);
        }
      } else if (value instanceof RefMap) {
        for (const key of value.keys()) {
          const ref = value.get(key);

          if (ref.getChild() === prevValue) {
            this.setRefMap(attribute, key, nextValue, ref.getAttributes());
          }
        }
      }
    }

    return this;
  }
  /**********************************************************************************************
   * Literal attributes.
   */

  /** @hidden */


  get(attribute) {
    return this[$attributes][attribute];
  }
  /** @hidden */


  set(attribute, value) {
    this[$attributes][attribute] = value;
    return this.dispatchEvent({
      type: 'change',
      attribute
    });
  }
  /**********************************************************************************************
   * Ref: 1:1 graph node references.
   */

  /** @hidden */


  getRef(attribute) {
    const ref = this[$attributes][attribute];
    return ref ? ref.getChild() : null;
  }
  /** @hidden */


  setRef(attribute, value, attributes) {
    if (this[$immutableKeys].has(attribute)) {
      throw new Error(`Cannot overwrite immutable attribute, "${attribute}".`);
    }

    const prevRef = this[$attributes][attribute];
    if (prevRef) prevRef.dispose(); // TODO(cleanup): Possible duplicate event.

    if (!value) return this;
    const ref = this.graph.createEdge(attribute, this, value, attributes);
    ref.addEventListener('dispose', () => {
      delete this[$attributes][attribute];
      this.dispatchEvent({
        type: 'change',
        attribute
      });
    });
    this[$attributes][attribute] = ref;
    return this.dispatchEvent({
      type: 'change',
      attribute
    });
  }
  /**********************************************************************************************
   * RefList: 1:many graph node references.
   */

  /** @hidden */


  listRefs(attribute) {
    const refs = this.assertRefList(attribute);
    return refs.values().map(ref => ref.getChild());
  }
  /** @hidden */


  addRef(attribute, value, attributes) {
    const ref = this.graph.createEdge(attribute, this, value, attributes);
    const refs = this.assertRefList(attribute);
    refs.add(ref);
    ref.addEventListener('dispose', () => {
      refs.remove(ref);
      this.dispatchEvent({
        type: 'change',
        attribute
      });
    });
    return this.dispatchEvent({
      type: 'change',
      attribute
    });
  }
  /** @hidden */


  removeRef(attribute, value) {
    const refs = this.assertRefList(attribute);

    if (refs instanceof RefList) {
      for (const ref of refs.removeChild(value)) {
        ref.dispose();
      }
    } else {
      const ref = refs.removeChild(value);
      if (ref) ref.dispose();
    }

    return this;
  }
  /** @hidden */


  assertRefList(attribute) {
    const list = this[$attributes][attribute];

    if (list instanceof RefList || list instanceof RefSet) {
      return list;
    } // TODO(v3) Remove warning.


    throw new Error(`Expected RefList or RefSet for attribute "${attribute}"`);
  }
  /**********************************************************************************************
   * RefMap: Named 1:many (map) graph node references.
   */

  /** @hidden */


  listRefMapKeys(attribute) {
    return this.assertRefMap(attribute).keys();
  }
  /** @hidden */


  listRefMapValues(attribute) {
    return this.assertRefMap(attribute).values().map(ref => ref.getChild());
  }
  /** @hidden */


  getRefMap(attribute, key) {
    const refMap = this.assertRefMap(attribute);
    const ref = refMap.get(key);
    return ref ? ref.getChild() : null;
  }
  /** @hidden */


  setRefMap(attribute, key, value, metadata) {
    const refMap = this.assertRefMap(attribute);
    const prevRef = refMap.get(key);
    if (prevRef) prevRef.dispose(); // TODO(cleanup): Possible duplicate event.

    if (!value) return this;
    metadata = Object.assign(metadata || {}, {
      key: key
    });
    const ref = this.graph.createEdge(attribute, this, value, _extends$3({}, metadata, {
      key
    }));
    ref.addEventListener('dispose', () => {
      refMap.delete(key);
      this.dispatchEvent({
        type: 'change',
        attribute,
        key
      });
    });
    refMap.set(key, ref);
    return this.dispatchEvent({
      type: 'change',
      attribute,
      key
    });
  }
  /** @hidden */


  assertRefMap(attribute) {
    const map = this[$attributes][attribute];

    if (map instanceof RefMap) {
      return map;
    } // TODO(v3) Remove warning.


    throw new Error(`Expected RefMap for attribute "${attribute}"`);
  }
  /**********************************************************************************************
   * Events.
   */

  /**
   * Dispatches an event on the GraphNode, and on the associated
   * Graph. Event types on the graph are prefixed, `"node:[type]"`.
   */


  dispatchEvent(event) {
    super.dispatchEvent(_extends$3({}, event, {
      target: this
    }));
    this.graph.dispatchEvent(_extends$3({}, event, {
      target: this,
      type: `node:${event.type}`
    }));
    return this;
  }

}

/**
 * Current version of the package.
 * @hidden
 */
const VERSION = `v${"4.0.8"}`;
/** @hidden */
const GLB_BUFFER = '@glb.bin';
/** String IDs for core {@link Property} types. */
var PropertyType;
(function (PropertyType) {
  PropertyType["ACCESSOR"] = "Accessor";
  PropertyType["ANIMATION"] = "Animation";
  PropertyType["ANIMATION_CHANNEL"] = "AnimationChannel";
  PropertyType["ANIMATION_SAMPLER"] = "AnimationSampler";
  PropertyType["BUFFER"] = "Buffer";
  PropertyType["CAMERA"] = "Camera";
  PropertyType["MATERIAL"] = "Material";
  PropertyType["MESH"] = "Mesh";
  PropertyType["PRIMITIVE"] = "Primitive";
  PropertyType["PRIMITIVE_TARGET"] = "PrimitiveTarget";
  PropertyType["NODE"] = "Node";
  PropertyType["ROOT"] = "Root";
  PropertyType["SCENE"] = "Scene";
  PropertyType["SKIN"] = "Skin";
  PropertyType["TEXTURE"] = "Texture";
  PropertyType["TEXTURE_INFO"] = "TextureInfo";
})(PropertyType || (PropertyType = {}));
/** Vertex layout method. */
var VertexLayout;
(function (VertexLayout) {
  /**
   * Stores vertex attributes in a single buffer view per mesh primitive. Interleaving vertex
   * data may improve performance by reducing page-thrashing in GPU memory.
   */
  VertexLayout["INTERLEAVED"] = "interleaved";
  /**
   * Stores each vertex attribute in a separate buffer view. May decrease performance by causing
   * page-thrashing in GPU memory. Some 3D engines may prefer this layout, e.g. for simplicity.
   */
  VertexLayout["SEPARATE"] = "separate";
})(VertexLayout || (VertexLayout = {}));
/** Accessor usage. */
var BufferViewUsage$1;
(function (BufferViewUsage) {
  BufferViewUsage["ARRAY_BUFFER"] = "ARRAY_BUFFER";
  BufferViewUsage["ELEMENT_ARRAY_BUFFER"] = "ELEMENT_ARRAY_BUFFER";
  BufferViewUsage["INVERSE_BIND_MATRICES"] = "INVERSE_BIND_MATRICES";
  BufferViewUsage["OTHER"] = "OTHER";
  BufferViewUsage["SPARSE"] = "SPARSE";
})(BufferViewUsage$1 || (BufferViewUsage$1 = {}));
/** Texture channels. */
var TextureChannel;
(function (TextureChannel) {
  TextureChannel[TextureChannel["R"] = 4096] = "R";
  TextureChannel[TextureChannel["G"] = 256] = "G";
  TextureChannel[TextureChannel["B"] = 16] = "B";
  TextureChannel[TextureChannel["A"] = 1] = "A";
})(TextureChannel || (TextureChannel = {}));
var Format;
(function (Format) {
  Format["GLTF"] = "GLTF";
  Format["GLB"] = "GLB";
})(Format || (Format = {}));
const ComponentTypeToTypedArray = {
  '5120': Int8Array,
  '5121': Uint8Array,
  '5122': Int16Array,
  '5123': Uint16Array,
  '5125': Uint32Array,
  '5126': Float32Array
};

/**
 * Common utilities
 * @module glMatrix
 */
var ARRAY_TYPE$1 = typeof Float32Array !== 'undefined' ? Float32Array : Array;
if (!Math.hypot) Math.hypot = function () {
  var y = 0,
      i = arguments.length;

  while (i--) {
    y += arguments[i] * arguments[i];
  }

  return Math.sqrt(y);
};

/**
 * 3 Dimensional Vector
 * @module vec3
 */

/**
 * Creates a new, empty vec3
 *
 * @returns {vec3} a new 3D vector
 */

function create$3() {
  var out = new ARRAY_TYPE$1(3);

  if (ARRAY_TYPE$1 != Float32Array) {
    out[0] = 0;
    out[1] = 0;
    out[2] = 0;
  }

  return out;
}
/**
 * Calculates the length of a vec3
 *
 * @param {ReadonlyVec3} a vector to calculate length of
 * @returns {Number} length of a
 */

function length$1(a) {
  var x = a[0];
  var y = a[1];
  var z = a[2];
  return Math.hypot(x, y, z);
}
/**
 * Transforms the vec3 with a mat4.
 * 4th vector component is implicitly '1'
 *
 * @param {vec3} out the receiving vector
 * @param {ReadonlyVec3} a the vector to transform
 * @param {ReadonlyMat4} m matrix to transform with
 * @returns {vec3} out
 */

function transformMat4$1(out, a, m) {
  var x = a[0],
      y = a[1],
      z = a[2];
  var w = m[3] * x + m[7] * y + m[11] * z + m[15];
  w = w || 1.0;
  out[0] = (m[0] * x + m[4] * y + m[8] * z + m[12]) / w;
  out[1] = (m[1] * x + m[5] * y + m[9] * z + m[13]) / w;
  out[2] = (m[2] * x + m[6] * y + m[10] * z + m[14]) / w;
  return out;
}
/**
 * Perform some operation over an array of vec3s.
 *
 * @param {Array} a the array of vectors to iterate over
 * @param {Number} stride Number of elements between the start of each vec3. If 0 assumes tightly packed
 * @param {Number} offset Number of elements to skip at the beginning of the array
 * @param {Number} count Number of vec3s to iterate over. If 0 iterates over entire array
 * @param {Function} fn Function to call for each vector in the array
 * @param {Object} [arg] additional argument to pass to fn
 * @returns {Array} a
 * @function
 */

(function () {
  var vec = create$3();
  return function (a, stride, offset, count, fn, arg) {
    var i, l;

    if (!stride) {
      stride = 3;
    }

    if (!offset) {
      offset = 0;
    }

    if (count) {
      l = Math.min(count * stride + offset, a.length);
    } else {
      l = a.length;
    }

    for (i = offset; i < l; i += stride) {
      vec[0] = a[i];
      vec[1] = a[i + 1];
      vec[2] = a[i + 2];
      fn(vec, vec, arg);
      a[i] = vec[0];
      a[i + 1] = vec[1];
      a[i + 2] = vec[2];
    }

    return a;
  };
})();

/** @hidden Implemented in /core for use by /extensions, publicly exported from /functions. */
function getBounds(node) {
  const resultBounds = createBounds();
  const parents = node.propertyType === PropertyType.NODE ? [node] : node.listChildren();
  for (const parent of parents) {
    parent.traverse(node => {
      const mesh = node.getMesh();
      if (!mesh) return;
      // Compute mesh bounds and update result.
      const meshBounds = getMeshBounds(mesh, node.getWorldMatrix());
      if (meshBounds.min.every(isFinite) && meshBounds.max.every(isFinite)) {
        expandBounds(meshBounds.min, resultBounds);
        expandBounds(meshBounds.max, resultBounds);
      }
    });
  }
  return resultBounds;
}
/** Computes mesh bounds in world space. */
function getMeshBounds(mesh, worldMatrix) {
  const meshBounds = createBounds();
  // We can't transform a local AABB into world space and still have a tight AABB in world space,
  // so we need to compute the world AABB vertex by vertex here.
  for (const prim of mesh.listPrimitives()) {
    const position = prim.getAttribute('POSITION');
    const indices = prim.getIndices();
    if (!position) continue;
    let localPos = [0, 0, 0];
    let worldPos = [0, 0, 0];
    for (let i = 0, il = indices ? indices.getCount() : position.getCount(); i < il; i++) {
      const index = indices ? indices.getScalar(i) : i;
      localPos = position.getElement(index, localPos);
      worldPos = transformMat4$1(worldPos, localPos, worldMatrix);
      expandBounds(worldPos, meshBounds);
    }
  }
  return meshBounds;
}
/** Expands bounds of target by given source. */
function expandBounds(point, target) {
  for (let i = 0; i < 3; i++) {
    target.min[i] = Math.min(point[i], target.min[i]);
    target.max[i] = Math.max(point[i], target.max[i]);
  }
}
/** Creates new bounds with min=Infinity, max=-Infinity. */
function createBounds() {
  return {
    min: [Infinity, Infinity, Infinity],
    max: [-Infinity, -Infinity, -Infinity]
  };
}

/**
 * *Common utilities for working with Uint8Array and Buffer objects.*
 *
 * @category Utilities
 */
class BufferUtils {
  /** Creates a byte array from a Data URI. */
  static createBufferFromDataURI(dataURI) {
    if (typeof Buffer === 'undefined') {
      // Browser.
      const byteString = atob(dataURI.split(',')[1]);
      const ia = new Uint8Array(byteString.length);
      for (let i = 0; i < byteString.length; i++) {
        ia[i] = byteString.charCodeAt(i);
      }
      return ia;
    } else {
      // Node.js.
      const data = dataURI.split(',')[1];
      const isBase64 = dataURI.indexOf('base64') >= 0;
      return Buffer.from(data, isBase64 ? 'base64' : 'utf8');
    }
  }
  /** Encodes text to a byte array. */
  static encodeText(text) {
    if (typeof TextEncoder !== 'undefined') {
      return new TextEncoder().encode(text);
    }
    return Buffer.from(text);
  }
  /** Decodes a byte array to text. */
  static decodeText(array) {
    if (typeof TextDecoder !== 'undefined') {
      return new TextDecoder().decode(array);
    }
    return Buffer.from(array).toString('utf8');
  }
  /**
   * Concatenates N byte arrays.
   */
  static concat(arrays) {
    let totalByteLength = 0;
    for (const array of arrays) {
      totalByteLength += array.byteLength;
    }
    const result = new Uint8Array(totalByteLength);
    let byteOffset = 0;
    for (const array of arrays) {
      result.set(array, byteOffset);
      byteOffset += array.byteLength;
    }
    return result;
  }
  /**
   * Pads a Uint8Array to the next 4-byte boundary.
   *
   * Reference: [glTF → Data Alignment](https://github.com/KhronosGroup/glTF/tree/master/specification/2.0#data-alignment)
   */
  static pad(srcArray, paddingByte = 0) {
    const paddedLength = this.padNumber(srcArray.byteLength);
    if (paddedLength === srcArray.byteLength) return srcArray;
    const dstArray = new Uint8Array(paddedLength);
    dstArray.set(srcArray);
    if (paddingByte !== 0) {
      for (let i = srcArray.byteLength; i < paddedLength; i++) {
        dstArray[i] = paddingByte;
      }
    }
    return dstArray;
  }
  /** Pads a number to 4-byte boundaries. */
  static padNumber(v) {
    return Math.ceil(v / 4) * 4;
  }
  /** Returns true if given byte array instances are equal. */
  static equals(a, b) {
    if (a === b) return true;
    if (a.byteLength !== b.byteLength) return false;
    let i = a.byteLength;
    while (i--) {
      if (a[i] !== b[i]) return false;
    }
    return true;
  }
  /**
   * Returns a Uint8Array view of a typed array, with the same underlying ArrayBuffer.
   *
   * A shorthand for:
   *
   * ```js
   * const buffer = new Uint8Array(
   * 	array.buffer,
   * 	array.byteOffset + byteOffset,
   * 	Math.min(array.byteLength, byteLength)
   * );
   * ```
   *
   */
  static toView(a, byteOffset = 0, byteLength = Infinity) {
    return new Uint8Array(a.buffer, a.byteOffset + byteOffset, Math.min(a.byteLength, byteLength));
  }
  static assertView(view) {
    if (view && !ArrayBuffer.isView(view)) {
      throw new Error(`Method requires Uint8Array parameter; received "${typeof view}".`);
    }
    return view;
  }
}

/**
 * *Common utilities for working with colors in vec3, vec4, or hexadecimal form.*
 *
 * Provides methods to convert linear components (vec3, vec4) to sRGB hex values. All colors in
 * the glTF specification, excluding color textures, are linear. Hexadecimal values, in sRGB
 * colorspace, are accessible through helper functions in the API as a convenience.
 *
 * ```typescript
 * // Hex (sRGB) to factor (linear).
 * const factor = ColorUtils.hexToFactor(0xFFCCCC, []);
 *
 * // Factor (linear) to hex (sRGB).
 * const hex = ColorUtils.factorToHex([1, .25, .25])
 * ```
 *
 * @category Utilities
 */
class ColorUtils {
  /**
   * Converts sRGB hexadecimal to linear components.
   * @typeParam T vec3 or vec4 linear components.
   */
  static hexToFactor(hex, target) {
    hex = Math.floor(hex);
    const _target = target;
    _target[0] = (hex >> 16 & 255) / 255;
    _target[1] = (hex >> 8 & 255) / 255;
    _target[2] = (hex & 255) / 255;
    return this.convertSRGBToLinear(target, target);
  }
  /**
   * Converts linear components to sRGB hexadecimal.
   * @typeParam T vec3 or vec4 linear components.
   */
  static factorToHex(factor) {
    const target = [...factor];
    const [r, g, b] = this.convertLinearToSRGB(factor, target);
    return r * 255 << 16 ^ g * 255 << 8 ^ b * 255 << 0;
  }
  /**
   * Converts sRGB components to linear components.
   * @typeParam T vec3 or vec4 linear components.
   */
  static convertSRGBToLinear(source, target) {
    const _source = source;
    const _target = target;
    for (let i = 0; i < 3; i++) {
      _target[i] = _source[i] < 0.04045 ? _source[i] * 0.0773993808 : Math.pow(_source[i] * 0.9478672986 + 0.0521327014, 2.4);
    }
    return target;
  }
  /**
   * Converts linear components to sRGB components.
   * @typeParam T vec3 or vec4 linear components.
   */
  static convertLinearToSRGB(source, target) {
    const _source = source;
    const _target = target;
    for (let i = 0; i < 3; i++) {
      _target[i] = _source[i] < 0.0031308 ? _source[i] * 12.92 : 1.055 * Math.pow(_source[i], 0.41666) - 0.055;
    }
    return target;
  }
}

/** JPEG image support. */
class JPEGImageUtils {
  match(array) {
    return array.length >= 3 && array[0] === 255 && array[1] === 216 && array[2] === 255;
  }
  getSize(array) {
    // Skip 4 chars, they are for signature
    let view = new DataView(array.buffer, array.byteOffset + 4);
    let i, next;
    while (view.byteLength) {
      // read length of the next block
      i = view.getUint16(0, false);
      // i = buffer.readUInt16BE(0);
      // ensure correct format
      validateJPEGBuffer(view, i);
      // 0xFFC0 is baseline standard(SOF)
      // 0xFFC1 is baseline optimized(SOF)
      // 0xFFC2 is progressive(SOF2)
      next = view.getUint8(i + 1);
      if (next === 0xc0 || next === 0xc1 || next === 0xc2) {
        return [view.getUint16(i + 7, false), view.getUint16(i + 5, false)];
      }
      // move to the next block
      view = new DataView(array.buffer, view.byteOffset + i + 2);
    }
    throw new TypeError('Invalid JPG, no size found');
  }
  getChannels(_buffer) {
    return 3;
  }
}
/**
 * PNG image support.
 *
 * PNG signature: 'PNG\r\n\x1a\n'
 * PNG image header chunk name: 'IHDR'
 */
class PNGImageUtils {
  match(array) {
    return array.length >= 8 && array[0] === 0x89 && array[1] === 0x50 && array[2] === 0x4e && array[3] === 0x47 && array[4] === 0x0d && array[5] === 0x0a && array[6] === 0x1a && array[7] === 0x0a;
  }
  getSize(array) {
    const view = new DataView(array.buffer, array.byteOffset);
    const magic = BufferUtils.decodeText(array.slice(12, 16));
    if (magic === PNGImageUtils.PNG_FRIED_CHUNK_NAME) {
      return [view.getUint32(32, false), view.getUint32(36, false)];
    }
    return [view.getUint32(16, false), view.getUint32(20, false)];
  }
  getChannels(_buffer) {
    return 4;
  }
}
/**
 * *Common utilities for working with image data.*
 *
 * @category Utilities
 */
// Used to detect "fried" png's: http://www.jongware.com/pngdefry.html
PNGImageUtils.PNG_FRIED_CHUNK_NAME = 'CgBI';
class ImageUtils {
  /** Registers support for a new image format; useful for certain extensions. */
  static registerFormat(mimeType, impl) {
    this.impls[mimeType] = impl;
  }
  /**
   * Returns detected MIME type of the given image buffer. Note that for image
   * formats with support provided by extensions, the extension must be
   * registered with an I/O class before it can be detected by ImageUtils.
   */
  static getMimeType(buffer) {
    for (const mimeType in this.impls) {
      if (this.impls[mimeType].match(buffer)) {
        return mimeType;
      }
    }
    return null;
  }
  /** Returns the dimensions of the image. */
  static getSize(buffer, mimeType) {
    if (!this.impls[mimeType]) return null;
    return this.impls[mimeType].getSize(buffer);
  }
  /**
   * Returns a conservative estimate of the number of channels in the image. For some image
   * formats, the method may return 4 indicating the possibility of an alpha channel, without
   * the ability to guarantee that an alpha channel is present.
   */
  static getChannels(buffer, mimeType) {
    if (!this.impls[mimeType]) return null;
    return this.impls[mimeType].getChannels(buffer);
  }
  /** Returns a conservative estimate of the GPU memory required by this image. */
  static getVRAMByteLength(buffer, mimeType) {
    if (!this.impls[mimeType]) return null;
    if (this.impls[mimeType].getVRAMByteLength) {
      return this.impls[mimeType].getVRAMByteLength(buffer);
    }
    let uncompressedBytes = 0;
    const channels = 4; // See https://github.com/donmccurdy/glTF-Transform/issues/151.
    const resolution = this.getSize(buffer, mimeType);
    if (!resolution) return null;
    while (resolution[0] > 1 || resolution[1] > 1) {
      uncompressedBytes += resolution[0] * resolution[1] * channels;
      resolution[0] = Math.max(Math.floor(resolution[0] / 2), 1);
      resolution[1] = Math.max(Math.floor(resolution[1] / 2), 1);
    }
    uncompressedBytes += 1 * 1 * channels;
    return uncompressedBytes;
  }
  /** Returns the preferred file extension for the given MIME type. */
  static mimeTypeToExtension(mimeType) {
    if (mimeType === 'image/jpeg') return 'jpg';
    return mimeType.split('/').pop();
  }
  /** Returns the MIME type for the given file extension. */
  static extensionToMimeType(extension) {
    if (extension === 'jpg') return 'image/jpeg';
    if (!extension) return '';
    return `image/${extension}`;
  }
}
ImageUtils.impls = {
  'image/jpeg': new JPEGImageUtils(),
  'image/png': new PNGImageUtils()
};
function validateJPEGBuffer(view, i) {
  // index should be within buffer limits
  if (i > view.byteLength) {
    throw new TypeError('Corrupt JPG, exceeded buffer limits');
  }
  // Every JPEG block must begin with a 0xFF
  if (view.getUint8(i) !== 0xff) {
    throw new TypeError('Invalid JPG, marker table corrupted');
  }
  return view;
}

/**
 * *Utility class for working with file systems and URI paths.*
 *
 * @category Utilities
 */
class FileUtils {
  /**
   * Extracts the basename from a file path, e.g. "folder/model.glb" -> "model".
   * See: {@link HTTPUtils.basename}
   */
  static basename(uri) {
    const fileName = uri.split(/[\\/]/).pop();
    return fileName.substring(0, fileName.lastIndexOf('.'));
  }
  /**
   * Extracts the extension from a file path, e.g. "folder/model.glb" -> "glb".
   * See: {@link HTTPUtils.extension}
   */
  static extension(uri) {
    if (uri.startsWith('data:image/')) {
      const mimeType = uri.match(/data:(image\/\w+)/)[1];
      return ImageUtils.mimeTypeToExtension(mimeType);
    } else if (uri.startsWith('data:model/gltf+json')) {
      return 'gltf';
    } else if (uri.startsWith('data:model/gltf-binary')) {
      return 'glb';
    } else if (uri.startsWith('data:application/')) {
      return 'bin';
    }
    return uri.split(/[\\/]/).pop().split(/[.]/).pop();
  }
}

/* eslint-disable @typescript-eslint/no-explicit-any */
// Reference: https://github.com/jonschlinkert/is-plain-object
function isObject(o) {
  return Object.prototype.toString.call(o) === '[object Object]';
}
function isPlainObject(o) {
  if (isObject(o) === false) return false;
  // If has modified constructor
  const ctor = o.constructor;
  if (ctor === undefined) return true;
  // If has modified prototype
  const prot = ctor.prototype;
  if (isObject(prot) === false) return false;
  // If constructor does not have an Object-specific method
  if (Object.prototype.hasOwnProperty.call(prot, 'isPrototypeOf') === false) {
    return false;
  }
  // Most likely a plain Object
  return true;
}

var _class;
/** Logger verbosity thresholds. */
var Verbosity;
(function (Verbosity) {
  /** No events are logged. */
  Verbosity[Verbosity["SILENT"] = 4] = "SILENT";
  /** Only error events are logged. */
  Verbosity[Verbosity["ERROR"] = 3] = "ERROR";
  /** Only error and warn events are logged. */
  Verbosity[Verbosity["WARN"] = 2] = "WARN";
  /** Only error, warn, and info events are logged. (DEFAULT) */
  Verbosity[Verbosity["INFO"] = 1] = "INFO";
  /** All events are logged. */
  Verbosity[Verbosity["DEBUG"] = 0] = "DEBUG";
})(Verbosity || (Verbosity = {}));
/**
 * *Logger utility class.*
 *
 * @category Utilities
 */
class Logger {
  /** Constructs a new Logger instance. */
  constructor(verbosity) {
    this.verbosity = void 0;
    this.verbosity = verbosity;
  }
  /** Logs an event at level {@link Logger.Verbosity.DEBUG}. */
  debug(text) {
    if (this.verbosity <= Logger.Verbosity.DEBUG) {
      console.debug(text);
    }
  }
  /** Logs an event at level {@link Logger.Verbosity.INFO}. */
  info(text) {
    if (this.verbosity <= Logger.Verbosity.INFO) {
      console.info(text);
    }
  }
  /** Logs an event at level {@link Logger.Verbosity.WARN}. */
  warn(text) {
    if (this.verbosity <= Logger.Verbosity.WARN) {
      console.warn(text);
    }
  }
  /** Logs an event at level {@link Logger.Verbosity.ERROR}. */
  error(text) {
    if (this.verbosity <= Logger.Verbosity.ERROR) {
      console.error(text);
    }
  }
}
_class = Logger;
/** Logger verbosity thresholds. */
Logger.Verbosity = Verbosity;
/** Default logger instance. */
Logger.DEFAULT_INSTANCE = new _class(_class.Verbosity.INFO);

/**
 * Calculates the determinant of a mat4
 *
 * @param {ReadonlyMat4} a the source matrix
 * @returns {Number} determinant of a
 */

function determinant$1(a) {
  var a00 = a[0],
      a01 = a[1],
      a02 = a[2],
      a03 = a[3];
  var a10 = a[4],
      a11 = a[5],
      a12 = a[6],
      a13 = a[7];
  var a20 = a[8],
      a21 = a[9],
      a22 = a[10],
      a23 = a[11];
  var a30 = a[12],
      a31 = a[13],
      a32 = a[14],
      a33 = a[15];
  var b00 = a00 * a11 - a01 * a10;
  var b01 = a00 * a12 - a02 * a10;
  var b02 = a00 * a13 - a03 * a10;
  var b03 = a01 * a12 - a02 * a11;
  var b04 = a01 * a13 - a03 * a11;
  var b05 = a02 * a13 - a03 * a12;
  var b06 = a20 * a31 - a21 * a30;
  var b07 = a20 * a32 - a22 * a30;
  var b08 = a20 * a33 - a23 * a30;
  var b09 = a21 * a32 - a22 * a31;
  var b10 = a21 * a33 - a23 * a31;
  var b11 = a22 * a33 - a23 * a32; // Calculate the determinant

  return b00 * b11 - b01 * b10 + b02 * b09 + b03 * b08 - b04 * b07 + b05 * b06;
}
/**
 * Multiplies two mat4s
 *
 * @param {mat4} out the receiving matrix
 * @param {ReadonlyMat4} a the first operand
 * @param {ReadonlyMat4} b the second operand
 * @returns {mat4} out
 */

function multiply$3(out, a, b) {
  var a00 = a[0],
      a01 = a[1],
      a02 = a[2],
      a03 = a[3];
  var a10 = a[4],
      a11 = a[5],
      a12 = a[6],
      a13 = a[7];
  var a20 = a[8],
      a21 = a[9],
      a22 = a[10],
      a23 = a[11];
  var a30 = a[12],
      a31 = a[13],
      a32 = a[14],
      a33 = a[15]; // Cache only the current line of the second matrix

  var b0 = b[0],
      b1 = b[1],
      b2 = b[2],
      b3 = b[3];
  out[0] = b0 * a00 + b1 * a10 + b2 * a20 + b3 * a30;
  out[1] = b0 * a01 + b1 * a11 + b2 * a21 + b3 * a31;
  out[2] = b0 * a02 + b1 * a12 + b2 * a22 + b3 * a32;
  out[3] = b0 * a03 + b1 * a13 + b2 * a23 + b3 * a33;
  b0 = b[4];
  b1 = b[5];
  b2 = b[6];
  b3 = b[7];
  out[4] = b0 * a00 + b1 * a10 + b2 * a20 + b3 * a30;
  out[5] = b0 * a01 + b1 * a11 + b2 * a21 + b3 * a31;
  out[6] = b0 * a02 + b1 * a12 + b2 * a22 + b3 * a32;
  out[7] = b0 * a03 + b1 * a13 + b2 * a23 + b3 * a33;
  b0 = b[8];
  b1 = b[9];
  b2 = b[10];
  b3 = b[11];
  out[8] = b0 * a00 + b1 * a10 + b2 * a20 + b3 * a30;
  out[9] = b0 * a01 + b1 * a11 + b2 * a21 + b3 * a31;
  out[10] = b0 * a02 + b1 * a12 + b2 * a22 + b3 * a32;
  out[11] = b0 * a03 + b1 * a13 + b2 * a23 + b3 * a33;
  b0 = b[12];
  b1 = b[13];
  b2 = b[14];
  b3 = b[15];
  out[12] = b0 * a00 + b1 * a10 + b2 * a20 + b3 * a30;
  out[13] = b0 * a01 + b1 * a11 + b2 * a21 + b3 * a31;
  out[14] = b0 * a02 + b1 * a12 + b2 * a22 + b3 * a32;
  out[15] = b0 * a03 + b1 * a13 + b2 * a23 + b3 * a33;
  return out;
}
/**
 * Returns the scaling factor component of a transformation
 *  matrix. If a matrix is built with fromRotationTranslationScale
 *  with a normalized Quaternion paramter, the returned vector will be
 *  the same as the scaling vector
 *  originally supplied.
 * @param  {vec3} out Vector to receive scaling factor component
 * @param  {ReadonlyMat4} mat Matrix to be decomposed (input)
 * @return {vec3} out
 */

function getScaling(out, mat) {
  var m11 = mat[0];
  var m12 = mat[1];
  var m13 = mat[2];
  var m21 = mat[4];
  var m22 = mat[5];
  var m23 = mat[6];
  var m31 = mat[8];
  var m32 = mat[9];
  var m33 = mat[10];
  out[0] = Math.hypot(m11, m12, m13);
  out[1] = Math.hypot(m21, m22, m23);
  out[2] = Math.hypot(m31, m32, m33);
  return out;
}
/**
 * Returns a quaternion representing the rotational component
 *  of a transformation matrix. If a matrix is built with
 *  fromRotationTranslation, the returned quaternion will be the
 *  same as the quaternion originally supplied.
 * @param {quat} out Quaternion to receive the rotation component
 * @param {ReadonlyMat4} mat Matrix to be decomposed (input)
 * @return {quat} out
 */

function getRotation(out, mat) {
  var scaling = new ARRAY_TYPE$1(3);
  getScaling(scaling, mat);
  var is1 = 1 / scaling[0];
  var is2 = 1 / scaling[1];
  var is3 = 1 / scaling[2];
  var sm11 = mat[0] * is1;
  var sm12 = mat[1] * is2;
  var sm13 = mat[2] * is3;
  var sm21 = mat[4] * is1;
  var sm22 = mat[5] * is2;
  var sm23 = mat[6] * is3;
  var sm31 = mat[8] * is1;
  var sm32 = mat[9] * is2;
  var sm33 = mat[10] * is3;
  var trace = sm11 + sm22 + sm33;
  var S = 0;

  if (trace > 0) {
    S = Math.sqrt(trace + 1.0) * 2;
    out[3] = 0.25 * S;
    out[0] = (sm23 - sm32) / S;
    out[1] = (sm31 - sm13) / S;
    out[2] = (sm12 - sm21) / S;
  } else if (sm11 > sm22 && sm11 > sm33) {
    S = Math.sqrt(1.0 + sm11 - sm22 - sm33) * 2;
    out[3] = (sm23 - sm32) / S;
    out[0] = 0.25 * S;
    out[1] = (sm12 + sm21) / S;
    out[2] = (sm31 + sm13) / S;
  } else if (sm22 > sm33) {
    S = Math.sqrt(1.0 + sm22 - sm11 - sm33) * 2;
    out[3] = (sm31 - sm13) / S;
    out[0] = (sm12 + sm21) / S;
    out[1] = 0.25 * S;
    out[2] = (sm23 + sm32) / S;
  } else {
    S = Math.sqrt(1.0 + sm33 - sm11 - sm22) * 2;
    out[3] = (sm12 - sm21) / S;
    out[0] = (sm31 + sm13) / S;
    out[1] = (sm23 + sm32) / S;
    out[2] = 0.25 * S;
  }

  return out;
}

/** @hidden */
class MathUtils {
  static identity(v) {
    return v;
  }
  static eq(a, b, tolerance = 10e-6) {
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) {
      if (Math.abs(a[i] - b[i]) > tolerance) return false;
    }
    return true;
  }
  static clamp(value, min, max) {
    if (value < min) return min;
    if (value > max) return max;
    return value;
  }
  // TODO(perf): Compare performance if we replace the switch with individual functions.
  static decodeNormalizedInt(i, componentType) {
    // Hardcode enums from accessor.ts to avoid a circular dependency.
    switch (componentType) {
      case 5126:
        // FLOAT
        return i;
      case 5123:
        // UNSIGNED_SHORT
        return i / 65535.0;
      case 5121:
        // UNSIGNED_BYTE
        return i / 255.0;
      case 5122:
        // SHORT
        return Math.max(i / 32767.0, -1.0);
      case 5120:
        // BYTE
        return Math.max(i / 127.0, -1.0);
      default:
        throw new Error('Invalid component type.');
    }
  }
  // TODO(perf): Compare performance if we replace the switch with individual functions.
  static encodeNormalizedInt(f, componentType) {
    // Hardcode enums from accessor.ts to avoid a circular dependency.
    switch (componentType) {
      case 5126:
        // FLOAT
        return f;
      case 5123:
        // UNSIGNED_SHORT
        return Math.round(MathUtils.clamp(f, 0, 1) * 65535.0);
      case 5121:
        // UNSIGNED_BYTE
        return Math.round(MathUtils.clamp(f, 0, 1) * 255.0);
      case 5122:
        // SHORT
        return Math.round(MathUtils.clamp(f, -1, 1) * 32767.0);
      case 5120:
        // BYTE
        return Math.round(MathUtils.clamp(f, -1, 1) * 127.0);
      default:
        throw new Error('Invalid component type.');
    }
  }
  /**
   * Decompose a mat4 to TRS properties.
   *
   * Equivalent to the Matrix4 decompose() method in three.js, and intentionally not using the
   * gl-matrix version. See: https://github.com/toji/gl-matrix/issues/408
   *
   * @param srcMat Matrix element, to be decomposed to TRS properties.
   * @param dstTranslation Translation element, to be overwritten.
   * @param dstRotation Rotation element, to be overwritten.
   * @param dstScale Scale element, to be overwritten.
   */
  static decompose(srcMat, dstTranslation, dstRotation, dstScale) {
    let sx = length$1([srcMat[0], srcMat[1], srcMat[2]]);
    const sy = length$1([srcMat[4], srcMat[5], srcMat[6]]);
    const sz = length$1([srcMat[8], srcMat[9], srcMat[10]]);
    // if determine is negative, we need to invert one scale
    const det = determinant$1(srcMat);
    if (det < 0) sx = -sx;
    dstTranslation[0] = srcMat[12];
    dstTranslation[1] = srcMat[13];
    dstTranslation[2] = srcMat[14];
    // scale the rotation part
    const _m1 = srcMat.slice();
    const invSX = 1 / sx;
    const invSY = 1 / sy;
    const invSZ = 1 / sz;
    _m1[0] *= invSX;
    _m1[1] *= invSX;
    _m1[2] *= invSX;
    _m1[4] *= invSY;
    _m1[5] *= invSY;
    _m1[6] *= invSY;
    _m1[8] *= invSZ;
    _m1[9] *= invSZ;
    _m1[10] *= invSZ;
    getRotation(dstRotation, _m1);
    dstScale[0] = sx;
    dstScale[1] = sy;
    dstScale[2] = sz;
  }
  /**
   * Compose TRS properties to a mat4.
   *
   * Equivalent to the Matrix4 compose() method in three.js, and intentionally not using the
   * gl-matrix version. See: https://github.com/toji/gl-matrix/issues/408
   *
   * @param srcTranslation Translation element of matrix.
   * @param srcRotation Rotation element of matrix.
   * @param srcScale Scale element of matrix.
   * @param dstMat Matrix element, to be modified and returned.
   * @returns dstMat, overwritten to mat4 equivalent of given TRS properties.
   */
  static compose(srcTranslation, srcRotation, srcScale, dstMat) {
    const te = dstMat;
    const x = srcRotation[0],
      y = srcRotation[1],
      z = srcRotation[2],
      w = srcRotation[3];
    const x2 = x + x,
      y2 = y + y,
      z2 = z + z;
    const xx = x * x2,
      xy = x * y2,
      xz = x * z2;
    const yy = y * y2,
      yz = y * z2,
      zz = z * z2;
    const wx = w * x2,
      wy = w * y2,
      wz = w * z2;
    const sx = srcScale[0],
      sy = srcScale[1],
      sz = srcScale[2];
    te[0] = (1 - (yy + zz)) * sx;
    te[1] = (xy + wz) * sx;
    te[2] = (xz - wy) * sx;
    te[3] = 0;
    te[4] = (xy - wz) * sy;
    te[5] = (1 - (xx + zz)) * sy;
    te[6] = (yz + wx) * sy;
    te[7] = 0;
    te[8] = (xz + wy) * sz;
    te[9] = (yz - wx) * sz;
    te[10] = (1 - (xx + yy)) * sz;
    te[11] = 0;
    te[12] = srcTranslation[0];
    te[13] = srcTranslation[1];
    te[14] = srcTranslation[2];
    te[15] = 1;
    return te;
  }
}

function equalsRef(refA, refB) {
  if (!!refA !== !!refB) return false;
  const a = refA.getChild();
  const b = refB.getChild();
  return a === b || a.equals(b);
}
function equalsRefSet(refSetA, refSetB) {
  if (!!refSetA !== !!refSetB) return false;
  const refValuesA = refSetA.values();
  const refValuesB = refSetB.values();
  if (refValuesA.length !== refValuesB.length) return false;
  for (let i = 0; i < refValuesA.length; i++) {
    const a = refValuesA[i];
    const b = refValuesB[i];
    if (a.getChild() === b.getChild()) continue;
    if (!a.getChild().equals(b.getChild())) return false;
  }
  return true;
}
function equalsRefMap(refMapA, refMapB) {
  if (!!refMapA !== !!refMapB) return false;
  const keysA = refMapA.keys();
  const keysB = refMapB.keys();
  if (keysA.length !== keysB.length) return false;
  for (const key of keysA) {
    const refA = refMapA.get(key);
    const refB = refMapB.get(key);
    if (!!refA !== !!refB) return false;
    const a = refA.getChild();
    const b = refB.getChild();
    if (a === b) continue;
    if (!a.equals(b)) return false;
  }
  return true;
}
function equalsArray(a, b) {
  if (a === b) return true;
  if (!!a !== !!b || !a || !b) return false;
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) return false;
  }
  return true;
}
function equalsObject(_a, _b) {
  if (_a === _b) return true;
  if (!!_a !== !!_b) return false;
  if (!isPlainObject(_a) || !isPlainObject(_b)) {
    return _a === _b;
  }
  const a = _a;
  const b = _b;
  let numKeysA = 0;
  let numKeysB = 0;
  let key;
  for (key in a) numKeysA++;
  for (key in b) numKeysB++;
  if (numKeysA !== numKeysB) return false;
  for (key in a) {
    const valueA = a[key];
    const valueB = b[key];
    if (isArray(valueA) && isArray(valueB)) {
      if (!equalsArray(valueA, valueB)) return false;
    } else if (isPlainObject(valueA) && isPlainObject(valueB)) {
      if (!equalsObject(valueA, valueB)) return false;
    } else {
      if (valueA !== valueB) return false;
    }
  }
  return true;
}
function isArray(value) {
  return Array.isArray(value) || ArrayBuffer.isView(value);
}

const ALPHABET = '23456789abdegjkmnpqrvwxyzABDEGJKMNPQRVWXYZ';
const UNIQUE_RETRIES = 999;
const ID_LENGTH = 6;
const previousIDs = new Set();
const generateOne = function generateOne() {
  let rtn = '';
  for (let i = 0; i < ID_LENGTH; i++) {
    rtn += ALPHABET.charAt(Math.floor(Math.random() * ALPHABET.length));
  }
  return rtn;
};
/**
 * Short ID generator.
 *
 * Generated IDs are short, easy to type, and unique for the duration of the program's execution.
 * Uniqueness across multiple program executions, or on other devices, is not guaranteed. Based on
 * [Short ID Generation in JavaScript](https://tomspencer.dev/blog/2014/11/16/short-id-generation-in-javascript/),
 * with alterations.
 *
 * @category Utilities
 * @hidden
 */
const uuid = function uuid() {
  for (let retries = 0; retries < UNIQUE_RETRIES; retries++) {
    const id = generateOne();
    if (!previousIDs.has(id)) {
      previousIDs.add(id);
      return id;
    }
  }
  return '';
};

// Need a placeholder domain to construct a URL from a relative path. We only
// access `url.pathname`, so the domain doesn't matter.
const NULL_DOMAIN = 'https://null.example';
/**
 * *Utility class for working with URLs.*
 *
 * @category Utilities
 */
class HTTPUtils {
  static dirname(path) {
    const index = path.lastIndexOf('/');
    if (index === -1) return './';
    return path.substring(0, index + 1);
  }
  /**
   * Extracts the basename from a URL, e.g. "folder/model.glb" -> "model".
   * See: {@link FileUtils.basename}
   */
  static basename(uri) {
    return FileUtils.basename(new URL(uri, NULL_DOMAIN).pathname);
  }
  /**
   * Extracts the extension from a URL, e.g. "folder/model.glb" -> "glb".
   * See: {@link FileUtils.extension}
   */
  static extension(uri) {
    return FileUtils.extension(new URL(uri, NULL_DOMAIN).pathname);
  }
  static resolve(base, path) {
    if (!this.isRelativePath(path)) return path;
    const stack = base.split('/');
    const parts = path.split('/');
    stack.pop();
    for (let i = 0; i < parts.length; i++) {
      if (parts[i] === '.') continue;
      if (parts[i] === '..') {
        stack.pop();
      } else {
        stack.push(parts[i]);
      }
    }
    return stack.join('/');
  }
  /**
   * Returns true for URLs containing a protocol, and false for both
   * absolute and relative paths.
   */
  static isAbsoluteURL(path) {
    return this.PROTOCOL_REGEXP.test(path);
  }
  /**
   * Returns true for paths that are declared relative to some unknown base
   * path. For example, "foo/bar/" is relative both "/foo/bar/" is not.
   */
  static isRelativePath(path) {
    return !/^(?:[a-zA-Z]+:)?\//.test(path);
  }
}
HTTPUtils.DEFAULT_INIT = {};
HTTPUtils.PROTOCOL_REGEXP = /^[a-zA-Z]+:\/\//;

const COPY_IDENTITY = t => t;
const EMPTY_SET = new Set();
/**
 * *Properties represent distinct resources in a glTF asset, referenced by other properties.*
 *
 * For example, each material and texture is a property, with material properties holding
 * references to the textures. All properties are created with factory methods on the
 * {@link Document} in which they should be constructed. Properties are destroyed by calling
 * {@link Property.dispose}().
 *
 * Usage:
 *
 * ```ts
 * const texture = doc.createTexture('myTexture');
 * doc.listTextures(); // → [texture x 1]
 *
 * // Attach a texture to a material.
 * material.setBaseColorTexture(texture);
 * material.getBaseColortexture(); // → texture
 *
 * // Detaching a texture removes any references to it, except from the doc.
 * texture.detach();
 * material.getBaseColorTexture(); // → null
 * doc.listTextures(); // → [texture x 1]
 *
 * // Disposing a texture removes all references to it, and its own references.
 * texture.dispose();
 * doc.listTextures(); // → []
 * ```
 *
 * Reference:
 * - [glTF → Concepts](https://github.com/KhronosGroup/gltf/blob/main/specification/2.0/README.md#concepts)
 *
 * @category Properties
 */
class Property extends GraphNode {
  /** @hidden */
  constructor(graph, name = '') {
    super(graph);
    this[$attributes]['name'] = name;
    this.init();
    this.dispatchEvent({
      type: 'create'
    });
  }
  /**
   * Returns the Graph associated with this Property. For internal use.
   * @hidden
   * @experimental
   */
  getGraph() {
    return this.graph;
  }
  /**
   * Returns default attributes for the property. Empty lists and maps should be initialized
   * to empty arrays and objects. Always invoke `super.getDefaults()` and extend the result.
   */
  getDefaults() {
    return Object.assign(super.getDefaults(), {
      name: '',
      extras: {}
    });
  }
  /** @hidden */
  set(attribute, value) {
    if (Array.isArray(value)) value = value.slice(); // copy vector, quat, color …
    return super.set(attribute, value);
  }
  /**********************************************************************************************
   * Name.
   */
  /**
   * Returns the name of this property. While names are not required to be unique, this is
   * encouraged, and non-unique names will be overwritten in some tools. For custom data about
   * a property, prefer to use Extras.
   */
  getName() {
    return this.get('name');
  }
  /**
   * Sets the name of this property. While names are not required to be unique, this is
   * encouraged, and non-unique names will be overwritten in some tools. For custom data about
   * a property, prefer to use Extras.
   */
  setName(name) {
    return this.set('name', name);
  }
  /**********************************************************************************************
   * Extras.
   */
  /**
   * Returns a reference to the Extras object, containing application-specific data for this
   * Property. Extras should be an Object, not a primitive value, for best portability.
   */
  getExtras() {
    return this.get('extras');
  }
  /**
   * Updates the Extras object, containing application-specific data for this Property. Extras
   * should be an Object, not a primitive value, for best portability.
   */
  setExtras(extras) {
    return this.set('extras', extras);
  }
  /**********************************************************************************************
   * Graph state.
   */
  /**
   * Makes a copy of this property, with the same resources (by reference) as the original.
   */
  clone() {
    const PropertyClass = this.constructor;
    return new PropertyClass(this.graph).copy(this, COPY_IDENTITY);
  }
  /**
   * Copies all data from another property to this one. Child properties are copied by reference,
   * unless a 'resolve' function is given to override that.
   * @param other Property to copy references from.
   * @param resolve Function to resolve each Property being transferred. Default is identity.
   */
  copy(other, resolve = COPY_IDENTITY) {
    // Remove previous references.
    for (const key in this[$attributes]) {
      const value = this[$attributes][key];
      if (value instanceof GraphEdge) {
        if (!this[$immutableKeys].has(key)) {
          value.dispose();
        }
      } else if (value instanceof RefList || value instanceof RefSet) {
        for (const ref of value.values()) {
          ref.dispose();
        }
      } else if (value instanceof RefMap) {
        for (const ref of value.values()) {
          ref.dispose();
        }
      }
    }
    // Add new references.
    for (const key in other[$attributes]) {
      const thisValue = this[$attributes][key];
      const otherValue = other[$attributes][key];
      if (otherValue instanceof GraphEdge) {
        if (this[$immutableKeys].has(key)) {
          const ref = thisValue;
          ref.getChild().copy(resolve(otherValue.getChild()), resolve);
        } else {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          this.setRef(key, resolve(otherValue.getChild()), otherValue.getAttributes());
        }
      } else if (otherValue instanceof RefSet || otherValue instanceof RefList) {
        for (const ref of otherValue.values()) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          this.addRef(key, resolve(ref.getChild()), ref.getAttributes());
        }
      } else if (otherValue instanceof RefMap) {
        for (const subkey of otherValue.keys()) {
          const ref = otherValue.get(subkey);
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          this.setRefMap(key, subkey, resolve(ref.getChild()), ref.getAttributes());
        }
      } else if (isPlainObject(otherValue)) {
        this[$attributes][key] = JSON.parse(JSON.stringify(otherValue));
      } else if (Array.isArray(otherValue) || otherValue instanceof ArrayBuffer || ArrayBuffer.isView(otherValue)) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        this[$attributes][key] = otherValue.slice();
      } else {
        this[$attributes][key] = otherValue;
      }
    }
    return this;
  }
  /**
   * Returns true if two properties are deeply equivalent, recursively comparing the attributes
   * of the properties. Optionally, a 'skip' set may be included, specifying attributes whose
   * values should not be considered in the comparison.
   *
   * Example: Two {@link Primitive Primitives} are equivalent if they have accessors and
   * materials with equivalent content — but not necessarily the same specific accessors
   * and materials.
   */
  equals(other, skip = EMPTY_SET) {
    if (this === other) return true;
    if (this.propertyType !== other.propertyType) return false;
    for (const key in this[$attributes]) {
      if (skip.has(key)) continue;
      const a = this[$attributes][key];
      const b = other[$attributes][key];
      if (a instanceof GraphEdge || b instanceof GraphEdge) {
        if (!equalsRef(a, b)) {
          return false;
        }
      } else if (a instanceof RefSet || b instanceof RefSet || a instanceof RefList || b instanceof RefList) {
        if (!equalsRefSet(a, b)) {
          return false;
        }
      } else if (a instanceof RefMap || b instanceof RefMap) {
        if (!equalsRefMap(a, b)) {
          return false;
        }
      } else if (isPlainObject(a) || isPlainObject(b)) {
        if (!equalsObject(a, b)) return false;
      } else if (isArray(a) || isArray(b)) {
        if (!equalsArray(a, b)) return false;
      } else {
        // Literal.
        if (a !== b) return false;
      }
    }
    return true;
  }
  detach() {
    // Detaching should keep properties in the same Document, and attached to its root.
    this.graph.disconnectParents(this, n => n.propertyType !== 'Root');
    return this;
  }
  /**
   * Returns a list of all properties that hold a reference to this property. For example, a
   * material may hold references to various textures, but a texture does not hold references
   * to the materials that use it.
   *
   * It is often necessary to filter the results for a particular type: some resources, like
   * {@link Accessor}s, may be referenced by different types of properties. Most properties
   * include the {@link Root} as a parent, which is usually not of interest.
   *
   * Usage:
   *
   * ```ts
   * const materials = texture
   * 	.listParents()
   * 	.filter((p) => p instanceof Material)
   * ```
   */
  listParents() {
    return this.graph.listParents(this);
  }
}

/**
 * *A {@link Property} that can have {@link ExtensionProperty} instances attached.*
 *
 * Most properties are extensible. See the {@link Extension} documentation for information about
 * how to use extensions.
 *
 * @category Properties
 */
class ExtensibleProperty extends Property {
  getDefaults() {
    return Object.assign(super.getDefaults(), {
      extensions: new RefMap()
    });
  }
  /** Returns an {@link ExtensionProperty} attached to this Property, if any. */
  getExtension(name) {
    return this.getRefMap('extensions', name);
  }
  /**
   * Attaches the given {@link ExtensionProperty} to this Property. For a given extension, only
   * one ExtensionProperty may be attached to any one Property at a time.
   */
  setExtension(name, extensionProperty) {
    if (extensionProperty) extensionProperty._validateParent(this);
    return this.setRefMap('extensions', name, extensionProperty);
  }
  /** Lists all {@link ExtensionProperty} instances attached to this Property. */
  listExtensions() {
    return this.listRefMapValues('extensions');
  }
}

/**
 * *Accessors store lists of numeric, vector, or matrix elements in a typed array.*
 *
 * All large data for {@link Mesh}, {@link Skin}, and {@link Animation} properties is stored in
 * {@link Accessor}s, organized into one or more {@link Buffer}s. Each accessor provides data in
 * typed arrays, with two abstractions:
 *
 * *Elements* are the logical divisions of the data into useful types: `"SCALAR"`, `"VEC2"`,
 * `"VEC3"`, `"VEC4"`, `"MAT3"`, or `"MAT4"`. The element type can be determined with the
 * {@link Accessor.getType getType}() method, and the number of elements in the accessor determine its
 * {@link Accessor.getCount getCount}(). The number of components in an element — e.g. 9 for `"MAT3"` — are its
 * {@link Accessor.getElementSize getElementSize}(). See {@link Accessor.Type}.
 *
 * *Components* are the numeric values within an element — e.g. `.x` and `.y` for `"VEC2"`. Various
 * component types are available: `BYTE`, `UNSIGNED_BYTE`, `SHORT`, `UNSIGNED_SHORT`,
 * `UNSIGNED_INT`, and `FLOAT`. The component type can be determined with the
 * {@link Accessor.getComponentType getComponentType} method, and the number of bytes in each component determine its
 * {@link Accessor.getComponentSize getComponentSize}. See {@link Accessor.ComponentType}.
 *
 * Usage:
 *
 * ```typescript
 * const accessor = doc.createAccessor('myData')
 * 	.setArray(new Float32Array([1,2,3,4,5,6,7,8,9,10,11,12]))
 * 	.setType(Accessor.Type.VEC3)
 * 	.setBuffer(doc.getRoot().listBuffers()[0]);
 *
 * accessor.getCount();        // → 4
 * accessor.getElementSize();  // → 3
 * accessor.getByteLength();   // → 48
 * accessor.getElement(1, []); // → [4, 5, 6]
 *
 * accessor.setElement(0, [10, 20, 30]);
 * ```
 *
 * Data access through the {@link Accessor.getElement getElement} and {@link Accessor.setElement setElement}
 * methods reads or overwrites the content of the underlying typed array. These methods use
 * element arrays intended to be compatible with the [gl-matrix](https://github.com/toji/gl-matrix)
 * library, or with the `toArray`/`fromArray` methods of libraries like three.js and babylon.js.
 *
 * Each Accessor must be assigned to a {@link Buffer}, which determines where the accessor's data
 * is stored in the final file. Assigning Accessors to different Buffers allows the data to be
 * written to different `.bin` files.
 *
 * glTF Transform does not expose many details of sparse, normalized, or interleaved accessors
 * through its API. It reads files using those techniques, presents a simplified view of the data
 * for editing, and attempts to write data back out with optimizations. For example, vertex
 * attributes will typically be interleaved by default, regardless of the input file.
 *
 * References:
 * - [glTF → Accessors](https://github.com/KhronosGroup/gltf/blob/main/specification/2.0/README.md#accessors)
 *
 * @category Properties
 */
class Accessor extends ExtensibleProperty {
  /**********************************************************************************************
   * Instance.
   */
  init() {
    this.propertyType = PropertyType.ACCESSOR;
  }
  getDefaults() {
    return Object.assign(super.getDefaults(), {
      array: null,
      type: Accessor.Type.SCALAR,
      componentType: Accessor.ComponentType.FLOAT,
      normalized: false,
      sparse: false,
      buffer: null
    });
  }
  /**********************************************************************************************
   * Static.
   */
  /** Returns size of a given element type, in components. */
  static getElementSize(type) {
    switch (type) {
      case Accessor.Type.SCALAR:
        return 1;
      case Accessor.Type.VEC2:
        return 2;
      case Accessor.Type.VEC3:
        return 3;
      case Accessor.Type.VEC4:
        return 4;
      case Accessor.Type.MAT2:
        return 4;
      case Accessor.Type.MAT3:
        return 9;
      case Accessor.Type.MAT4:
        return 16;
      default:
        throw new Error('Unexpected type: ' + type);
    }
  }
  /** Returns size of a given component type, in bytes. */
  static getComponentSize(componentType) {
    switch (componentType) {
      case Accessor.ComponentType.BYTE:
        return 1;
      case Accessor.ComponentType.UNSIGNED_BYTE:
        return 1;
      case Accessor.ComponentType.SHORT:
        return 2;
      case Accessor.ComponentType.UNSIGNED_SHORT:
        return 2;
      case Accessor.ComponentType.UNSIGNED_INT:
        return 4;
      case Accessor.ComponentType.FLOAT:
        return 4;
      default:
        throw new Error('Unexpected component type: ' + componentType);
    }
  }
  /**********************************************************************************************
   * Min/max bounds.
   */
  /**
   * Minimum value of each component in this attribute. Unlike in a final glTF file, values
   * returned by this method will reflect the minimum accounting for {@link .normalized}
   * state.
   */
  getMinNormalized(target) {
    const normalized = this.getNormalized();
    const elementSize = this.getElementSize();
    const componentType = this.getComponentType();
    this.getMin(target);
    if (normalized) {
      for (let j = 0; j < elementSize; j++) {
        target[j] = MathUtils.decodeNormalizedInt(target[j], componentType);
      }
    }
    return target;
  }
  /**
   * Minimum value of each component in this attribute. Values returned by this method do not
   * reflect normalization: use {@link .getMinNormalized} in that case.
   */
  getMin(target) {
    const array = this.getArray();
    const count = this.getCount();
    const elementSize = this.getElementSize();
    for (let j = 0; j < elementSize; j++) target[j] = Infinity;
    for (let i = 0; i < count * elementSize; i += elementSize) {
      for (let j = 0; j < elementSize; j++) {
        const value = array[i + j];
        if (Number.isFinite(value)) {
          target[j] = Math.min(target[j], value);
        }
      }
    }
    return target;
  }
  /**
   * Maximum value of each component in this attribute. Unlike in a final glTF file, values
   * returned by this method will reflect the minimum accounting for {@link .normalized}
   * state.
   */
  getMaxNormalized(target) {
    const normalized = this.getNormalized();
    const elementSize = this.getElementSize();
    const componentType = this.getComponentType();
    this.getMax(target);
    if (normalized) {
      for (let j = 0; j < elementSize; j++) {
        target[j] = MathUtils.decodeNormalizedInt(target[j], componentType);
      }
    }
    return target;
  }
  /**
   * Maximum value of each component in this attribute. Values returned by this method do not
   * reflect normalization: use {@link .getMinNormalized} in that case.
   */
  getMax(target) {
    const array = this.get('array');
    const count = this.getCount();
    const elementSize = this.getElementSize();
    for (let j = 0; j < elementSize; j++) target[j] = -Infinity;
    for (let i = 0; i < count * elementSize; i += elementSize) {
      for (let j = 0; j < elementSize; j++) {
        const value = array[i + j];
        if (Number.isFinite(value)) {
          target[j] = Math.max(target[j], value);
        }
      }
    }
    return target;
  }
  /**********************************************************************************************
   * Layout.
   */
  /**
   * Number of elements in the accessor. An array of length 30, containing 10 `VEC3` elements,
   * will have a count of 10.
   */
  getCount() {
    const array = this.get('array');
    return array ? array.length / this.getElementSize() : 0;
  }
  /** Type of element stored in the accessor. `VEC2`, `VEC3`, etc. */
  getType() {
    return this.get('type');
  }
  /**
   * Sets type of element stored in the accessor. `VEC2`, `VEC3`, etc. Array length must be a
   * multiple of the component size (`VEC2` = 2, `VEC3` = 3, ...) for the selected type.
   */
  setType(type) {
    return this.set('type', type);
  }
  /**
   * Number of components in each element of the accessor. For example, the element size of a
   * `VEC2` accessor is 2. This value is determined automatically based on array length and
   * accessor type, specified with {@link Accessor.setType setType()}.
   */
  getElementSize() {
    return Accessor.getElementSize(this.get('type'));
  }
  /**
   * Size of each component (a value in the raw array), in bytes. For example, the
   * `componentSize` of data backed by a `float32` array is 4 bytes.
   */
  getComponentSize() {
    return this.get('array').BYTES_PER_ELEMENT;
  }
  /**
   * Component type (float32, uint16, etc.). This value is determined automatically, and can only
   * be modified by replacing the underlying array.
   */
  getComponentType() {
    return this.get('componentType');
  }
  /**********************************************************************************************
   * Normalization.
   */
  /**
   * Specifies whether integer data values should be normalized (true) to [0, 1] (for unsigned
   * types) or [-1, 1] (for signed types), or converted directly (false) when they are accessed.
   * This property is defined only for accessors that contain vertex attributes or animation
   * output data.
   */
  getNormalized() {
    return this.get('normalized');
  }
  /**
   * Specifies whether integer data values should be normalized (true) to [0, 1] (for unsigned
   * types) or [-1, 1] (for signed types), or converted directly (false) when they are accessed.
   * This property is defined only for accessors that contain vertex attributes or animation
   * output data.
   */
  setNormalized(normalized) {
    return this.set('normalized', normalized);
  }
  /**********************************************************************************************
   * Data access.
   */
  /**
   * Returns the scalar element value at the given index. For
   * {@link Accessor.getNormalized normalized} integer accessors, values are
   * decoded and returned in floating-point form.
   */
  getScalar(index) {
    const elementSize = this.getElementSize();
    const componentType = this.getComponentType();
    const array = this.getArray();
    if (this.getNormalized()) {
      return MathUtils.decodeNormalizedInt(array[index * elementSize], componentType);
    }
    return array[index * elementSize];
  }
  /**
   * Assigns the scalar element value at the given index. For
   * {@link Accessor.getNormalized normalized} integer accessors, "value" should be
   * given in floating-point form — it will be integer-encoded before writing
   * to the underlying array.
   */
  setScalar(index, x) {
    const elementSize = this.getElementSize();
    const componentType = this.getComponentType();
    const array = this.getArray();
    if (this.getNormalized()) {
      array[index * elementSize] = MathUtils.encodeNormalizedInt(x, componentType);
    } else {
      array[index * elementSize] = x;
    }
    return this;
  }
  /**
   * Returns the vector or matrix element value at the given index. For
   * {@link Accessor.getNormalized normalized} integer accessors, values are
   * decoded and returned in floating-point form.
   *
   * Example:
   *
   * ```javascript
   * import { add } from 'gl-matrix/add';
   *
   * const element = [];
   * const offset = [1, 1, 1];
   *
   * for (let i = 0; i < accessor.getCount(); i++) {
   * 	accessor.getElement(i, element);
   * 	add(element, element, offset);
   * 	accessor.setElement(i, element);
   * }
   * ```
   */
  getElement(index, target) {
    const normalized = this.getNormalized();
    const elementSize = this.getElementSize();
    const componentType = this.getComponentType();
    const array = this.getArray();
    for (let i = 0; i < elementSize; i++) {
      if (normalized) {
        target[i] = MathUtils.decodeNormalizedInt(array[index * elementSize + i], componentType);
      } else {
        target[i] = array[index * elementSize + i];
      }
    }
    return target;
  }
  /**
   * Assigns the vector or matrix element value at the given index. For
   * {@link Accessor.getNormalized normalized} integer accessors, "value" should be
   * given in floating-point form — it will be integer-encoded before writing
   * to the underlying array.
   *
   * Example:
   *
   * ```javascript
   * import { add } from 'gl-matrix/add';
   *
   * const element = [];
   * const offset = [1, 1, 1];
   *
   * for (let i = 0; i < accessor.getCount(); i++) {
   * 	accessor.getElement(i, element);
   * 	add(element, element, offset);
   * 	accessor.setElement(i, element);
   * }
   * ```
   */
  setElement(index, value) {
    const normalized = this.getNormalized();
    const elementSize = this.getElementSize();
    const componentType = this.getComponentType();
    const array = this.getArray();
    for (let i = 0; i < elementSize; i++) {
      if (normalized) {
        array[index * elementSize + i] = MathUtils.encodeNormalizedInt(value[i], componentType);
      } else {
        array[index * elementSize + i] = value[i];
      }
    }
    return this;
  }
  /**********************************************************************************************
   * Raw data storage.
   */
  /**
   * Specifies whether the accessor should be stored sparsely. When written to a glTF file, sparse
   * accessors store only values that differ from base values. When loaded in glTF Transform (or most
   * runtimes) a sparse accessor can be treated like any other accessor. Currently, glTF Transform always
   * uses zeroes for the base values when writing files.
   * @experimental
   */
  getSparse() {
    return this.get('sparse');
  }
  /**
   * Specifies whether the accessor should be stored sparsely. When written to a glTF file, sparse
   * accessors store only values that differ from base values. When loaded in glTF Transform (or most
   * runtimes) a sparse accessor can be treated like any other accessor. Currently, glTF Transform always
   * uses zeroes for the base values when writing files.
   * @experimental
   */
  setSparse(sparse) {
    return this.set('sparse', sparse);
  }
  /** Returns the {@link Buffer} into which this accessor will be organized. */
  getBuffer() {
    return this.getRef('buffer');
  }
  /** Assigns the {@link Buffer} into which this accessor will be organized. */
  setBuffer(buffer) {
    return this.setRef('buffer', buffer);
  }
  /** Returns the raw typed array underlying this accessor. */
  getArray() {
    return this.get('array');
  }
  /** Assigns the raw typed array underlying this accessor. */
  setArray(array) {
    this.set('componentType', array ? arrayToComponentType(array) : Accessor.ComponentType.FLOAT);
    this.set('array', array);
    return this;
  }
  /** Returns the total bytelength of this accessor, exclusive of padding. */
  getByteLength() {
    const array = this.get('array');
    return array ? array.byteLength : 0;
  }
}
/**************************************************************************************************
 * Accessor utilities.
 */
/** @internal */
/**********************************************************************************************
 * Constants.
 */
/** Element type contained by the accessor (SCALAR, VEC2, ...). */
Accessor.Type = {
  /** Scalar, having 1 value per element. */
  SCALAR: 'SCALAR',
  /** 2-component vector, having 2 components per element. */
  VEC2: 'VEC2',
  /** 3-component vector, having 3 components per element. */
  VEC3: 'VEC3',
  /** 4-component vector, having 4 components per element. */
  VEC4: 'VEC4',
  /** 2x2 matrix, having 4 components per element. */
  MAT2: 'MAT2',
  /** 3x3 matrix, having 9 components per element. */
  MAT3: 'MAT3',
  /** 4x3 matrix, having 16 components per element. */
  MAT4: 'MAT4'
};
/** Data type of the values composing each element in the accessor. */
Accessor.ComponentType = {
  /**
   * 1-byte signed integer, stored as
   * {@link https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Int8Array Int8Array}.
   */
  BYTE: 5120,
  /**
   * 1-byte unsigned integer, stored as
   * {@link https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Uint8Array Uint8Array}.
   */
  UNSIGNED_BYTE: 5121,
  /**
   * 2-byte signed integer, stored as
   * {@link https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Int16Array Int16Array}.
   */
  SHORT: 5122,
  /**
   * 2-byte unsigned integer, stored as
   * {@link https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Uint16Array Uint16Array}.
   */
  UNSIGNED_SHORT: 5123,
  /**
   * 4-byte unsigned integer, stored as
   * {@link https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Uint32Array Uint32Array}.
   */
  UNSIGNED_INT: 5125,
  /**
   * 4-byte floating point number, stored as
   * {@link https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Float32Array Float32Array}.
   */
  FLOAT: 5126
};
function arrayToComponentType(array) {
  switch (array.constructor) {
    case Float32Array:
      return Accessor.ComponentType.FLOAT;
    case Uint32Array:
      return Accessor.ComponentType.UNSIGNED_INT;
    case Uint16Array:
      return Accessor.ComponentType.UNSIGNED_SHORT;
    case Uint8Array:
      return Accessor.ComponentType.UNSIGNED_BYTE;
    case Int16Array:
      return Accessor.ComponentType.SHORT;
    case Int8Array:
      return Accessor.ComponentType.BYTE;
    default:
      throw new Error('Unknown accessor componentType.');
  }
}

/**
 * *Reusable collections of {@link AnimationChannel}s, together representing a discrete animation
 * clip.*
 *
 * One Animation represents one playable unit in an animation system. Each may contain channels
 * affecting multiple paths (`translation`, `rotation`, `scale`, or `weights`) on multiple
 * {@link Node}s. An Animation's channels must be played together, and do not have any meaning in
 * isolation.
 *
 * Multiple Animations _may_ be played together: for example, one character's _Walk_ animation
 * might play while another character's _Run_ animation plays. Or a single character might have
 * both an _Idle_ and a _Talk_ animation playing at the same time. However, glTF does not define
 * any particular relationship between top-level Animations, or any particular playback behavior
 * like looping or sequences of Animations. General-purpose viewers typically autoplay the first
 * animation and provide UI controls for choosing another. Game engines may have significantly
 * more advanced methods of playing and blending animations.
 *
 * For example, a very simple skinned {@link Mesh} might have two Animations, _Idle_ and _Walk_.
 * Each of those Animations might affect the rotations of two bones, _LegL_ and _LegR_, where the
 * keyframes for each target-path pair are stored in {@link AnimationChannel} instances. In  total,
 * this model would contain two Animations and Four {@link AnimationChannel}s.
 *
 * Usage:
 *
 * ```ts
 * const animation = doc.createAnimation('machineRun')
 * 	.addChannel(rotateCog1)
 * 	.addChannel(rotateCog2)
 * 	.addChannel(rotateCog3);
 * ```
 *
 * Reference
 * - [glTF → Animations](https://github.com/KhronosGroup/gltf/blob/main/specification/2.0/README.md#animations)
 *
 * @category Properties
 */
class Animation extends ExtensibleProperty {
  init() {
    this.propertyType = PropertyType.ANIMATION;
  }
  getDefaults() {
    return Object.assign(super.getDefaults(), {
      channels: new RefSet(),
      samplers: new RefSet()
    });
  }
  /** Adds an {@link AnimationChannel} to this Animation. */
  addChannel(channel) {
    return this.addRef('channels', channel);
  }
  /** Removes an {@link AnimationChannel} from this Animation. */
  removeChannel(channel) {
    return this.removeRef('channels', channel);
  }
  /** Lists {@link AnimationChannel}s in this Animation. */
  listChannels() {
    return this.listRefs('channels');
  }
  /** Adds an {@link AnimationSampler} to this Animation. */
  addSampler(sampler) {
    return this.addRef('samplers', sampler);
  }
  /** Removes an {@link AnimationSampler} from this Animation. */
  removeSampler(sampler) {
    return this.removeRef('samplers', sampler);
  }
  /** Lists {@link AnimationSampler}s in this Animation. */
  listSamplers() {
    return this.listRefs('samplers');
  }
}

/**
 * *A target-path pair within a larger {@link Animation}, which refers to an
 * {@link AnimationSampler} storing the keyframe data for that pair.*
 *
 * A _target_ is always a {@link Node}, in the core glTF spec. A _path_ is any property of that
 * Node that can be affected by animation: `translation`, `rotation`, `scale`, or `weights`. An
 * {@link Animation} affecting the positions and rotations of several {@link Node}s would contain
 * one channel for each Node-position or Node-rotation pair. The keyframe data for an
 * AnimationChannel is stored in an {@link AnimationSampler}, which must be attached to the same
 * {@link Animation}.
 *
 * Usage:
 *
 * ```ts
 * const node = doc.getRoot()
 * 	.listNodes()
 * 	.find((node) => node.getName() === 'Cog');
 *
 * const channel = doc.createAnimationChannel('cogRotation')
 * 	.setTargetPath('rotation')
 * 	.setTargetNode(node)
 * 	.setSampler(rotateSampler);
 * ```
 *
 * Reference
 * - [glTF → Animations](https://github.com/KhronosGroup/gltf/blob/main/specification/2.0/README.md#animations)
 *
 * @category Properties
 */
class AnimationChannel extends ExtensibleProperty {
  /**********************************************************************************************
   * Instance.
   */
  init() {
    this.propertyType = PropertyType.ANIMATION_CHANNEL;
  }
  getDefaults() {
    return Object.assign(super.getDefaults(), {
      targetPath: null,
      targetNode: null,
      sampler: null
    });
  }
  /**********************************************************************************************
   * Properties.
   */
  /**
   * Path (property) animated on the target {@link Node}. Supported values include:
   * `translation`, `rotation`, `scale`, or `weights`.
   */
  getTargetPath() {
    return this.get('targetPath');
  }
  /**
   * Path (property) animated on the target {@link Node}. Supported values include:
   * `translation`, `rotation`, `scale`, or `weights`.
   */
  setTargetPath(targetPath) {
    return this.set('targetPath', targetPath);
  }
  /** Target {@link Node} animated by the channel. */
  getTargetNode() {
    return this.getRef('targetNode');
  }
  /** Target {@link Node} animated by the channel. */
  setTargetNode(targetNode) {
    return this.setRef('targetNode', targetNode);
  }
  /**
   * Keyframe data input/output values for the channel. Must be attached to the same
   * {@link Animation}.
   */
  getSampler() {
    return this.getRef('sampler');
  }
  /**
   * Keyframe data input/output values for the channel. Must be attached to the same
   * {@link Animation}.
   */
  setSampler(sampler) {
    return this.setRef('sampler', sampler);
  }
}
/**********************************************************************************************
 * Constants.
 */
/** Name of the property to be modified by an animation channel. */
AnimationChannel.TargetPath = {
  /** Channel targets {@link Node.setTranslation}. */
  TRANSLATION: 'translation',
  /** Channel targets {@link Node.setRotation}. */
  ROTATION: 'rotation',
  /** Channel targets {@link Node.setScale}. */
  SCALE: 'scale',
  /** Channel targets {@link Node.setWeights}, affecting {@link PrimitiveTarget} weights. */
  WEIGHTS: 'weights'
};

/**
 * *Reusable collection of keyframes affecting particular property of an object.*
 *
 * Each AnimationSampler refers to an input and an output {@link Accessor}. Input contains times
 * (in seconds) for each keyframe. Output contains values (of any {@link Accessor.Type}) for the
 * animated property at each keyframe. Samplers using `CUBICSPLINE` interpolation will also contain
 * in/out tangents in the output, with the layout:
 *
 * in<sub>1</sub>, value<sub>1</sub>, out<sub>1</sub>,
 * in<sub>2</sub>, value<sub>2</sub>, out<sub>2</sub>,
 * in<sub>3</sub>, value<sub>3</sub>, out<sub>3</sub>, ...
 *
 * Usage:
 *
 * ```ts
 * // Create accessor containing input times, in seconds.
 * const input = doc.createAccessor('bounceTimes')
 * 	.setArray(new Float32Array([0, 1, 2]))
 * 	.setType(Accessor.Type.SCALAR);
 *
 * // Create accessor containing output values, in local units.
 * const output = doc.createAccessor('bounceValues')
 * 	.setArray(new Float32Array([
 * 		0, 0, 0, // y = 0
 * 		0, 1, 0, // y = 1
 * 		0, 0, 0, // y = 0
 * 	]))
 * 	.setType(Accessor.Type.VEC3);
 *
 * // Create sampler.
 * const sampler = doc.createAnimationSampler('bounce')
 * 	.setInput(input)
 * 	.setOutput(output)
 * 	.setInterpolation('LINEAR');
 * ```
 *
 * Reference
 * - [glTF → Animations](https://github.com/KhronosGroup/gltf/blob/main/specification/2.0/README.md#animations)
 *
 * @category Properties
 */
class AnimationSampler extends ExtensibleProperty {
  /**********************************************************************************************
   * Instance.
   */
  init() {
    this.propertyType = PropertyType.ANIMATION_SAMPLER;
  }
  getDefaultAttributes() {
    return Object.assign(super.getDefaults(), {
      interpolation: AnimationSampler.Interpolation.LINEAR,
      input: null,
      output: null
    });
  }
  /**********************************************************************************************
   * Static.
   */
  /** Interpolation mode: `STEP`, `LINEAR`, or `CUBICSPLINE`. */
  getInterpolation() {
    return this.get('interpolation');
  }
  /** Interpolation mode: `STEP`, `LINEAR`, or `CUBICSPLINE`. */
  setInterpolation(interpolation) {
    return this.set('interpolation', interpolation);
  }
  /** Times for each keyframe, in seconds. */
  getInput() {
    return this.getRef('input');
  }
  /** Times for each keyframe, in seconds. */
  setInput(input) {
    return this.setRef('input', input, {
      usage: BufferViewUsage$1.OTHER
    });
  }
  /**
   * Values for each keyframe. For `CUBICSPLINE` interpolation, output also contains in/out
   * tangents.
   */
  getOutput() {
    return this.getRef('output');
  }
  /**
   * Values for each keyframe. For `CUBICSPLINE` interpolation, output also contains in/out
   * tangents.
   */
  setOutput(output) {
    return this.setRef('output', output, {
      usage: BufferViewUsage$1.OTHER
    });
  }
}
/**********************************************************************************************
 * Constants.
 */
/** Interpolation method. */
AnimationSampler.Interpolation = {
  /** Animated values are linearly interpolated between keyframes. */
  LINEAR: 'LINEAR',
  /** Animated values remain constant from one keyframe until the next keyframe. */
  STEP: 'STEP',
  /** Animated values are interpolated according to given cubic spline tangents. */
  CUBICSPLINE: 'CUBICSPLINE'
};

/**
 * *Buffers are low-level storage units for binary data.*
 *
 * glTF 2.0 has three concepts relevant to binary storage: accessors, buffer views, and buffers.
 * In glTF Transform, an {@link Accessor} is referenced by any property that requires numeric typed
 * array data. Meshes, Primitives, and Animations all reference Accessors. Buffers define how that
 * data is organized into transmitted file(s). A `.glb` file has only a single Buffer, and when
 * exporting to `.glb` your resources should be grouped accordingly. A `.gltf` file may reference
 * one or more `.bin` files — each `.bin` is a Buffer — and grouping Accessors under different
 * Buffers allow you to specify that structure.
 *
 * For engines that can dynamically load portions of a glTF file, splitting data into separate
 * buffers can allow you to avoid loading data until it is needed. For example, you might put
 * binary data for specific meshes into a different `.bin` buffer, or put each animation's binary
 * payload into its own `.bin`.
 *
 * Buffer Views define how Accessors are organized within a given Buffer. glTF Transform creates an
 * efficient Buffer View layout automatically at export: there is no Buffer View property exposed
 * by the glTF Transform API, simplifying data management.
 *
 * Usage:
 *
 * ```ts
 * // Create two buffers with custom filenames.
 * const buffer1 = doc.createBuffer('buffer1')
 * 	.setURI('part1.bin');
 * const buffer2 = doc.createBuffer('buffer2')
 * 	.setURI('part2.bin');
 *
 * // Assign the attributes of two meshes to different buffers. If the meshes
 * // had indices or morph target attributes, you would also want to relocate
 * // those accessors.
 * mesh1
 * 	.listPrimitives()
 * 	.forEach((primitive) => primitive.listAttributes()
 * 		.forEach((attribute) => attribute.setBuffer(buffer1)));
 * mesh2
 * 	.listPrimitives()
 * 	.forEach((primitive) => primitive.listAttributes()
 * 		.forEach((attribute) => attribute.setBuffer(buffer2)));
 *
 * // Write to disk. Each mesh's binary data will be in a separate binary file;
 * // any remaining accessors will be in a third (default) buffer.
 * await new NodeIO().write('scene.gltf', doc);
 * // → scene.gltf, part1.bin, part2.bin
 * ```
 *
 * References:
 * - [glTF → Buffers and Buffer Views](https://github.com/KhronosGroup/gltf/blob/main/specification/2.0/README.md#buffers-and-buffer-views)
 * - [glTF → Accessors](https://github.com/KhronosGroup/gltf/blob/main/specification/2.0/README.md#accessors)
 *
 * @category Properties
 */
class Buffer$1 extends ExtensibleProperty {
  init() {
    this.propertyType = PropertyType.BUFFER;
  }
  getDefaults() {
    return Object.assign(super.getDefaults(), {
      uri: ''
    });
  }
  /**
   * Returns the URI (or filename) of this buffer (e.g. 'myBuffer.bin'). URIs are strongly
   * encouraged to be relative paths, rather than absolute. Use of a protocol (like `file://`)
   * is possible for custom applications, but will limit the compatibility of the asset with most
   * tools.
   *
   * Buffers commonly use the extension `.bin`, though this is not required.
   */
  getURI() {
    return this.get('uri');
  }
  /**
   * Sets the URI (or filename) of this buffer (e.g. 'myBuffer.bin'). URIs are strongly
   * encouraged to be relative paths, rather than absolute. Use of a protocol (like `file://`)
   * is possible for custom applications, but will limit the compatibility of the asset with most
   * tools.
   *
   * Buffers commonly use the extension `.bin`, though this is not required.
   */
  setURI(uri) {
    return this.set('uri', uri);
  }
}

/**
 * *Cameras are perspectives through which the {@link Scene} may be viewed.*
 *
 * Projection can be perspective or orthographic. Cameras are contained in nodes and thus can be
 * transformed. The camera is defined such that the local +X axis is to the right, the lens looks
 * towards the local -Z axis, and the top of the camera is aligned with the local +Y axis. If no
 * transformation is specified, the location of the camera is at the origin.
 *
 * Usage:
 *
 * ```typescript
 * const camera = doc.createCamera('myCamera')
 * 	.setType(GLTF.CameraType.PERSPECTIVE)
 * 	.setZNear(0.1)
 * 	.setZFar(100)
 * 	.setYFov(Math.PI / 4)
 * 	.setAspectRatio(1.5);
 *
 * node.setCamera(camera);
 * ```
 *
 * References:
 * - [glTF → Cameras](https://github.com/KhronosGroup/gltf/blob/main/specification/2.0/README.md#cameras)
 *
 * @category Properties
 */
class Camera extends ExtensibleProperty {
  /**********************************************************************************************
   * Instance.
   */
  init() {
    this.propertyType = PropertyType.CAMERA;
  }
  getDefaults() {
    return Object.assign(super.getDefaults(), {
      // Common.
      type: Camera.Type.PERSPECTIVE,
      znear: 0.1,
      zfar: 100,
      // Perspective.
      aspectRatio: null,
      yfov: Math.PI * 2 * 50 / 360,
      // 50º
      // Orthographic.
      xmag: 1,
      ymag: 1
    });
  }
  /**********************************************************************************************
   * Common.
   */
  /** Specifies if the camera uses a perspective or orthographic projection. */
  getType() {
    return this.get('type');
  }
  /** Specifies if the camera uses a perspective or orthographic projection. */
  setType(type) {
    return this.set('type', type);
  }
  /** Floating-point distance to the near clipping plane. */
  getZNear() {
    return this.get('znear');
  }
  /** Floating-point distance to the near clipping plane. */
  setZNear(znear) {
    return this.set('znear', znear);
  }
  /**
   * Floating-point distance to the far clipping plane. When defined, zfar must be greater than
   * znear. If zfar is undefined, runtime must use infinite projection matrix.
   */
  getZFar() {
    return this.get('zfar');
  }
  /**
   * Floating-point distance to the far clipping plane. When defined, zfar must be greater than
   * znear. If zfar is undefined, runtime must use infinite projection matrix.
   */
  setZFar(zfar) {
    return this.set('zfar', zfar);
  }
  /**********************************************************************************************
   * Perspective.
   */
  /**
   * Floating-point aspect ratio of the field of view. When undefined, the aspect ratio of the
   * canvas is used.
   */
  getAspectRatio() {
    return this.get('aspectRatio');
  }
  /**
   * Floating-point aspect ratio of the field of view. When undefined, the aspect ratio of the
   * canvas is used.
   */
  setAspectRatio(aspectRatio) {
    return this.set('aspectRatio', aspectRatio);
  }
  /** Floating-point vertical field of view in radians. */
  getYFov() {
    return this.get('yfov');
  }
  /** Floating-point vertical field of view in radians. */
  setYFov(yfov) {
    return this.set('yfov', yfov);
  }
  /**********************************************************************************************
   * Orthographic.
   */
  /**
   * Floating-point horizontal magnification of the view, and half the view's width
   * in world units.
   */
  getXMag() {
    return this.get('xmag');
  }
  /**
   * Floating-point horizontal magnification of the view, and half the view's width
   * in world units.
   */
  setXMag(xmag) {
    return this.set('xmag', xmag);
  }
  /**
   * Floating-point vertical magnification of the view, and half the view's height
   * in world units.
   */
  getYMag() {
    return this.get('ymag');
  }
  /**
   * Floating-point vertical magnification of the view, and half the view's height
   * in world units.
   */
  setYMag(ymag) {
    return this.set('ymag', ymag);
  }
}
/**********************************************************************************************
 * Constants.
 */
Camera.Type = {
  /** A perspective camera representing a perspective projection matrix. */
  PERSPECTIVE: 'perspective',
  /** An orthographic camera representing an orthographic projection matrix. */
  ORTHOGRAPHIC: 'orthographic'
};

/**
 * *Base class for all {@link Property} types that can be attached by an {@link Extension}.*
 *
 * After an {@link Extension} is attached to a glTF {@link Document}, the Extension may be used to
 * construct ExtensionProperty instances, to be referenced throughout the document as prescribed by
 * the Extension. For example, the `KHR_materials_clearcoat` Extension defines a `Clearcoat`
 * ExtensionProperty, which is referenced by {@link Material} Properties in the Document, and may
 * contain references to {@link Texture} properties of its own.
 *
 * For more information on available extensions and their usage, see [Extensions](/extensions).
 *
 * Reference:
 * - [glTF → Extensions](https://github.com/KhronosGroup/gltf/blob/main/specification/2.0/README.md#specifying-extensions)
 *
 * @category Properties
 */
class ExtensionProperty extends Property {
  /** @hidden */
  _validateParent(parent) {
    if (!this.parentTypes.includes(parent.propertyType)) {
      throw new Error(`Parent "${parent.propertyType}" invalid for child "${this.propertyType}".`);
    }
  }
}
ExtensionProperty.EXTENSION_NAME = void 0;

/**
 * *Settings associated with a particular use of a {@link Texture}.*
 *
 * Different materials may reuse the same texture but with different texture coordinates,
 * minFilter/magFilter, or wrapS/wrapT settings. The TextureInfo class contains settings
 * derived from both the "TextureInfo" and "Sampler" properties in the glTF specification,
 * consolidated here for simplicity.
 *
 * TextureInfo properties cannot be directly created. For any material texture slot, such as
 * baseColorTexture, there will be a corresponding method to obtain the TextureInfo for that slot.
 * For example, see {@link Material.getBaseColorTextureInfo}.
 *
 * References:
 * - [glTF → Texture Info](https://github.com/KhronosGroup/gltf/blob/main/specification/2.0/README.md#reference-textureinfo)
 *
 * @category Properties
 */
class TextureInfo extends ExtensibleProperty {
  /**********************************************************************************************
   * Instance.
   */
  init() {
    this.propertyType = PropertyType.TEXTURE_INFO;
  }
  getDefaults() {
    return Object.assign(super.getDefaults(), {
      texCoord: 0,
      magFilter: null,
      minFilter: null,
      wrapS: TextureInfo.WrapMode.REPEAT,
      wrapT: TextureInfo.WrapMode.REPEAT
    });
  }
  /**********************************************************************************************
   * Texture coordinates.
   */
  /** Returns the texture coordinate (UV set) index for the texture. */
  getTexCoord() {
    return this.get('texCoord');
  }
  /** Sets the texture coordinate (UV set) index for the texture. */
  setTexCoord(texCoord) {
    return this.set('texCoord', texCoord);
  }
  /**********************************************************************************************
   * Min/mag filter.
   */
  /** Returns the magnification filter applied to the texture. */
  getMagFilter() {
    return this.get('magFilter');
  }
  /** Sets the magnification filter applied to the texture. */
  setMagFilter(magFilter) {
    return this.set('magFilter', magFilter);
  }
  /** Sets the minification filter applied to the texture. */
  getMinFilter() {
    return this.get('minFilter');
  }
  /** Returns the minification filter applied to the texture. */
  setMinFilter(minFilter) {
    return this.set('minFilter', minFilter);
  }
  /**********************************************************************************************
   * UV wrapping.
   */
  /** Returns the S (U) wrapping mode for UVs used by the texture. */
  getWrapS() {
    return this.get('wrapS');
  }
  /** Sets the S (U) wrapping mode for UVs used by the texture. */
  setWrapS(wrapS) {
    return this.set('wrapS', wrapS);
  }
  /** Returns the T (V) wrapping mode for UVs used by the texture. */
  getWrapT() {
    return this.get('wrapT');
  }
  /** Sets the T (V) wrapping mode for UVs used by the texture. */
  setWrapT(wrapT) {
    return this.set('wrapT', wrapT);
  }
}
/**********************************************************************************************
 * Constants.
 */
/** UV wrapping mode. Values correspond to WebGL enums. */
TextureInfo.WrapMode = {
  /** */
  CLAMP_TO_EDGE: 33071,
  /** */
  MIRRORED_REPEAT: 33648,
  /** */
  REPEAT: 10497
};
/** Magnification filter. Values correspond to WebGL enums. */
TextureInfo.MagFilter = {
  /** */
  NEAREST: 9728,
  /** */
  LINEAR: 9729
};
/** Minification filter. Values correspond to WebGL enums. */
TextureInfo.MinFilter = {
  /** */
  NEAREST: 9728,
  /** */
  LINEAR: 9729,
  /** */
  NEAREST_MIPMAP_NEAREST: 9984,
  /** */
  LINEAR_MIPMAP_NEAREST: 9985,
  /** */
  NEAREST_MIPMAP_LINEAR: 9986,
  /** */
  LINEAR_MIPMAP_LINEAR: 9987
};

const {
  R: R$8,
  G: G$8,
  B: B$6,
  A: A$4
} = TextureChannel;
/**
 * *Materials describe a surface's appearance and response to light.*
 *
 * Each {@link Primitive} within a {@link Mesh} may be assigned a single Material. The number of
 * GPU draw calls typically increases with both the numbers of Primitives and of Materials in an
 * asset; Materials should be reused wherever possible. Techniques like texture atlasing and vertex
 * colors allow objects to have varied appearances while technically sharing a single Material.
 *
 * Material properties are modified by both scalars (like `baseColorFactor`) and textures (like
 * `baseColorTexture`). When both are available, factors are considered linear multipliers against
 * textures of the same name. In the case of base color, vertex colors (`COLOR_0` attributes) are
 * also multiplied.
 *
 * Textures containing color data (`baseColorTexture`, `emissiveTexture`) are sRGB. All other
 * textures are linear. Like other resources, textures should be reused when possible.
 *
 * Usage:
 *
 * ```typescript
 * const material = doc.createMaterial('myMaterial')
 * 	.setBaseColorFactor([1, 0.5, 0.5, 1]) // RGBA
 * 	.setOcclusionTexture(aoTexture)
 * 	.setOcclusionStrength(0.5);
 *
 * mesh.listPrimitives()
 * 	.forEach((prim) => prim.setMaterial(material));
 * ```
 *
 * @category Properties
 */
class Material extends ExtensibleProperty {
  /**********************************************************************************************
   * Instance.
   */
  init() {
    this.propertyType = PropertyType.MATERIAL;
  }
  getDefaults() {
    return Object.assign(super.getDefaults(), {
      alphaMode: Material.AlphaMode.OPAQUE,
      alphaCutoff: 0.5,
      doubleSided: false,
      baseColorFactor: [1, 1, 1, 1],
      baseColorTexture: null,
      baseColorTextureInfo: new TextureInfo(this.graph, 'baseColorTextureInfo'),
      emissiveFactor: [0, 0, 0],
      emissiveTexture: null,
      emissiveTextureInfo: new TextureInfo(this.graph, 'emissiveTextureInfo'),
      normalScale: 1,
      normalTexture: null,
      normalTextureInfo: new TextureInfo(this.graph, 'normalTextureInfo'),
      occlusionStrength: 1,
      occlusionTexture: null,
      occlusionTextureInfo: new TextureInfo(this.graph, 'occlusionTextureInfo'),
      roughnessFactor: 1,
      metallicFactor: 1,
      metallicRoughnessTexture: null,
      metallicRoughnessTextureInfo: new TextureInfo(this.graph, 'metallicRoughnessTextureInfo')
    });
  }
  /**********************************************************************************************
   * Double-sided / culling.
   */
  /** Returns true when both sides of triangles should be rendered. May impact performance. */
  getDoubleSided() {
    return this.get('doubleSided');
  }
  /** Sets whether to render both sides of triangles. May impact performance. */
  setDoubleSided(doubleSided) {
    return this.set('doubleSided', doubleSided);
  }
  /**********************************************************************************************
   * Alpha.
   */
  /** Returns material alpha, equivalent to baseColorFactor[3]. */
  getAlpha() {
    return this.get('baseColorFactor')[3];
  }
  /** Sets material alpha, equivalent to baseColorFactor[3]. */
  setAlpha(alpha) {
    const baseColorFactor = this.get('baseColorFactor').slice();
    baseColorFactor[3] = alpha;
    return this.set('baseColorFactor', baseColorFactor);
  }
  /**
   * Returns the mode of the material's alpha channels, which are provided by `baseColorFactor`
   * and `baseColorTexture`.
   *
   * - `OPAQUE`: Alpha value is ignored and the rendered output is fully opaque.
   * - `BLEND`: Alpha value is used to determine the transparency each pixel on a surface, and
   * 	the fraction of surface vs. background color in the final result. Alpha blending creates
   *	significant edge cases in realtime renderers, and some care when structuring the model is
   * 	necessary for good results. In particular, transparent geometry should be kept in separate
   * 	meshes or primitives from opaque geometry. The `depthWrite` or `zWrite` settings in engines
   * 	should usually be disabled on transparent materials.
   * - `MASK`: Alpha value is compared against `alphaCutoff` threshold for each pixel on a
   * 	surface, and the pixel is either fully visible or fully discarded based on that cutoff.
   * 	This technique is useful for things like leafs/foliage, grass, fabric meshes, and other
   * 	surfaces where no semitransparency is needed. With a good choice of `alphaCutoff`, surfaces
   * 	that don't require semitransparency can avoid the performance penalties and visual issues
   * 	involved with `BLEND` transparency.
   *
   * Reference:
   * - [glTF → material.alphaMode](https://github.com/KhronosGroup/gltf/blob/main/specification/2.0/README.md#materialalphamode)
   */
  getAlphaMode() {
    return this.get('alphaMode');
  }
  /** Sets the mode of the material's alpha channels. See {@link Material.getAlphaMode getAlphaMode} for details. */
  setAlphaMode(alphaMode) {
    return this.set('alphaMode', alphaMode);
  }
  /** Returns the visibility threshold; applied only when `.alphaMode='MASK'`. */
  getAlphaCutoff() {
    return this.get('alphaCutoff');
  }
  /** Sets the visibility threshold; applied only when `.alphaMode='MASK'`. */
  setAlphaCutoff(alphaCutoff) {
    return this.set('alphaCutoff', alphaCutoff);
  }
  /**********************************************************************************************
   * Base color.
   */
  /**
   * Base color / albedo factor; Linear-sRGB components.
   * See {@link Material.getBaseColorTexture getBaseColorTexture}.
   */
  getBaseColorFactor() {
    return this.get('baseColorFactor');
  }
  /**
   * Base color / albedo factor; Linear-sRGB components.
   * See {@link Material.getBaseColorTexture getBaseColorTexture}.
   */
  setBaseColorFactor(baseColorFactor) {
    return this.set('baseColorFactor', baseColorFactor);
  }
  /**
   * Base color / albedo. The visible color of a non-metallic surface under constant ambient
   * light would be a linear combination (multiplication) of its vertex colors, base color
   * factor, and base color texture. Lighting, and reflections in metallic or smooth surfaces,
   * also effect the final color. The alpha (`.a`) channel of base color factors and textures
   * will have varying effects, based on the setting of {@link Material.getAlphaMode getAlphaMode}.
   *
   * Reference:
   * - [glTF → material.pbrMetallicRoughness.baseColorFactor](https://github.com/KhronosGroup/gltf/blob/main/specification/2.0/README.md#pbrmetallicroughnessbasecolorfactor)
   */
  getBaseColorTexture() {
    return this.getRef('baseColorTexture');
  }
  /**
   * Settings affecting the material's use of its base color texture. If no texture is attached,
   * {@link TextureInfo} is `null`.
   */
  getBaseColorTextureInfo() {
    return this.getRef('baseColorTexture') ? this.getRef('baseColorTextureInfo') : null;
  }
  /** Sets base color / albedo texture. See {@link Material.getBaseColorTexture getBaseColorTexture}. */
  setBaseColorTexture(texture) {
    return this.setRef('baseColorTexture', texture, {
      channels: R$8 | G$8 | B$6 | A$4,
      isColor: true
    });
  }
  /**********************************************************************************************
   * Emissive.
   */
  /** Emissive color; Linear-sRGB components. See {@link Material.getEmissiveTexture getEmissiveTexture}. */
  getEmissiveFactor() {
    return this.get('emissiveFactor');
  }
  /** Emissive color; Linear-sRGB components. See {@link Material.getEmissiveTexture getEmissiveTexture}. */
  setEmissiveFactor(emissiveFactor) {
    return this.set('emissiveFactor', emissiveFactor);
  }
  /**
   * Emissive texture. Emissive color is added to any base color of the material, after any
   * lighting/shadowing are applied. An emissive color does not inherently "glow", or affect
   * objects around it at all. To create that effect, most viewers must also enable a
   * post-processing effect called "bloom".
   *
   * Reference:
   * - [glTF → material.emissiveTexture](https://github.com/KhronosGroup/gltf/blob/main/specification/2.0/README.md#materialemissivetexture)
   */
  getEmissiveTexture() {
    return this.getRef('emissiveTexture');
  }
  /**
   * Settings affecting the material's use of its emissive texture. If no texture is attached,
   * {@link TextureInfo} is `null`.
   */
  getEmissiveTextureInfo() {
    return this.getRef('emissiveTexture') ? this.getRef('emissiveTextureInfo') : null;
  }
  /** Sets emissive texture. See {@link Material.getEmissiveTexture getEmissiveTexture}. */
  setEmissiveTexture(texture) {
    return this.setRef('emissiveTexture', texture, {
      channels: R$8 | G$8 | B$6,
      isColor: true
    });
  }
  /**********************************************************************************************
   * Normal.
   */
  /** Normal (surface detail) factor; linear multiplier. Affects `.normalTexture`. */
  getNormalScale() {
    return this.get('normalScale');
  }
  /** Normal (surface detail) factor; linear multiplier. Affects `.normalTexture`. */
  setNormalScale(scale) {
    return this.set('normalScale', scale);
  }
  /**
   * Normal (surface detail) texture.
   *
   * A tangent space normal map. The texture contains RGB components. Each texel represents the
   * XYZ components of a normal vector in tangent space. Red [0 to 255] maps to X [-1 to 1].
   * Green [0 to 255] maps to Y [-1 to 1]. Blue [128 to 255] maps to Z [1/255 to 1]. The normal
   * vectors use OpenGL conventions where +X is right and +Y is up. +Z points toward the viewer.
   *
   * Reference:
   * - [glTF → material.normalTexture](https://github.com/KhronosGroup/gltf/blob/main/specification/2.0/README.md#materialnormaltexture)
   */
  getNormalTexture() {
    return this.getRef('normalTexture');
  }
  /**
   * Settings affecting the material's use of its normal texture. If no texture is attached,
   * {@link TextureInfo} is `null`.
   */
  getNormalTextureInfo() {
    return this.getRef('normalTexture') ? this.getRef('normalTextureInfo') : null;
  }
  /** Sets normal (surface detail) texture. See {@link Material.getNormalTexture getNormalTexture}. */
  setNormalTexture(texture) {
    return this.setRef('normalTexture', texture, {
      channels: R$8 | G$8 | B$6
    });
  }
  /**********************************************************************************************
   * Occlusion.
   */
  /** (Ambient) Occlusion factor; linear multiplier. Affects `.occlusionTexture`. */
  getOcclusionStrength() {
    return this.get('occlusionStrength');
  }
  /** Sets (ambient) occlusion factor; linear multiplier. Affects `.occlusionTexture`. */
  setOcclusionStrength(strength) {
    return this.set('occlusionStrength', strength);
  }
  /**
   * (Ambient) Occlusion texture, generally used for subtle 'baked' shadowing effects that are
   * independent of an object's position, such as shading in inset areas and corners. Direct
   * lighting is not affected by occlusion, so at least one indirect light source must be present
   * in the scene for occlusion effects to be visible.
   *
   * The occlusion values are sampled from the R channel. Higher values indicate areas that
   * should receive full indirect lighting and lower values indicate no indirect lighting.
   *
   * Reference:
   * - [glTF → material.occlusionTexture](https://github.com/KhronosGroup/gltf/blob/main/specification/2.0/README.md#materialocclusiontexture)
   */
  getOcclusionTexture() {
    return this.getRef('occlusionTexture');
  }
  /**
   * Settings affecting the material's use of its occlusion texture. If no texture is attached,
   * {@link TextureInfo} is `null`.
   */
  getOcclusionTextureInfo() {
    return this.getRef('occlusionTexture') ? this.getRef('occlusionTextureInfo') : null;
  }
  /** Sets (ambient) occlusion texture. See {@link Material.getOcclusionTexture getOcclusionTexture}. */
  setOcclusionTexture(texture) {
    return this.setRef('occlusionTexture', texture, {
      channels: R$8
    });
  }
  /**********************************************************************************************
   * Metallic / roughness.
   */
  /**
   * Roughness factor; linear multiplier. Affects roughness channel of
   * `metallicRoughnessTexture`. See {@link Material.getMetallicRoughnessTexture getMetallicRoughnessTexture}.
   */
  getRoughnessFactor() {
    return this.get('roughnessFactor');
  }
  /**
   * Sets roughness factor; linear multiplier. Affects roughness channel of
   * `metallicRoughnessTexture`. See {@link Material.getMetallicRoughnessTexture getMetallicRoughnessTexture}.
   */
  setRoughnessFactor(factor) {
    return this.set('roughnessFactor', factor);
  }
  /**
   * Metallic factor; linear multiplier. Affects roughness channel of
   * `metallicRoughnessTexture`. See {@link Material.getMetallicRoughnessTexture getMetallicRoughnessTexture}.
   */
  getMetallicFactor() {
    return this.get('metallicFactor');
  }
  /**
   * Sets metallic factor; linear multiplier. Affects roughness channel of
   * `metallicRoughnessTexture`. See {@link Material.getMetallicRoughnessTexture getMetallicRoughnessTexture}.
   */
  setMetallicFactor(factor) {
    return this.set('metallicFactor', factor);
  }
  /**
   * Metallic roughness texture. The metalness values are sampled from the B channel. The
   * roughness values are sampled from the G channel. When a material is fully metallic,
   * or nearly so, it may require image-based lighting (i.e. an environment map) or global
   * illumination to appear well-lit.
   *
   * Reference:
   * - [glTF → material.pbrMetallicRoughness.metallicRoughnessTexture](https://github.com/KhronosGroup/gltf/blob/main/specification/2.0/README.md#pbrmetallicroughnessmetallicroughnesstexture)
   */
  getMetallicRoughnessTexture() {
    return this.getRef('metallicRoughnessTexture');
  }
  /**
   * Settings affecting the material's use of its metallic/roughness texture. If no texture is
   * attached, {@link TextureInfo} is `null`.
   */
  getMetallicRoughnessTextureInfo() {
    return this.getRef('metallicRoughnessTexture') ? this.getRef('metallicRoughnessTextureInfo') : null;
  }
  /**
   * Sets metallic/roughness texture.
   * See {@link Material.getMetallicRoughnessTexture getMetallicRoughnessTexture}.
   */
  setMetallicRoughnessTexture(texture) {
    return this.setRef('metallicRoughnessTexture', texture, {
      channels: G$8 | B$6
    });
  }
}
/**********************************************************************************************
 * Constants.
 */
Material.AlphaMode = {
  /**
   * The alpha value is ignored and the rendered output is fully opaque
   */
  OPAQUE: 'OPAQUE',
  /**
   * The rendered output is either fully opaque or fully transparent depending on the alpha
   * value and the specified alpha cutoff value
   */
  MASK: 'MASK',
  /**
   * The alpha value is used to composite the source and destination areas. The rendered
   * output is combined with the background using the normal painting operation (i.e. the
   * Porter and Duff over operator)
   */
  BLEND: 'BLEND'
};

/**
 * *Meshes define reusable geometry (triangles, lines, or points) and are instantiated by
 * {@link Node}s.*
 *
 * Each draw call required to render a mesh is represented as a {@link Primitive}. Meshes typically
 * have only a single {@link Primitive}, but may have more for various reasons. A mesh manages only
 * a list of primitives — materials, morph targets, and other properties are managed on a per-
 * primitive basis.
 *
 * When the same geometry and material should be rendered at multiple places in the scene, reuse
 * the same Mesh instance and attach it to multiple nodes for better efficiency. Where the geometry
 * is shared but the material is not, reusing {@link Accessor}s under different meshes and
 * primitives can similarly improve transmission efficiency, although some rendering efficiency is
 * lost as the number of materials in a scene increases.
 *
 * Usage:
 *
 * ```ts
 * const primitive = doc.createPrimitive()
 * 	.setAttribute('POSITION', positionAccessor)
 * 	.setAttribute('TEXCOORD_0', uvAccessor);
 * const mesh = doc.createMesh('myMesh')
 * 	.addPrimitive(primitive);
 * node.setMesh(mesh);
 * ```
 *
 * References:
 * - [glTF → Geometry](https://github.com/KhronosGroup/gltf/blob/main/specification/2.0/README.md#geometry)
 *
 * @category Properties
 */
class Mesh extends ExtensibleProperty {
  init() {
    this.propertyType = PropertyType.MESH;
  }
  getDefaults() {
    return Object.assign(super.getDefaults(), {
      weights: [],
      primitives: new RefSet()
    });
  }
  /** Adds a {@link Primitive} to the mesh's draw call list. */
  addPrimitive(primitive) {
    return this.addRef('primitives', primitive);
  }
  /** Removes a {@link Primitive} from the mesh's draw call list. */
  removePrimitive(primitive) {
    return this.removeRef('primitives', primitive);
  }
  /** Lists {@link Primitive} draw calls of the mesh. */
  listPrimitives() {
    return this.listRefs('primitives');
  }
  /**
   * Initial weights of each {@link PrimitiveTarget} on this mesh. Each {@link Primitive} must
   * have the same number of targets. Most engines only support 4-8 active morph targets at a
   * time.
   */
  getWeights() {
    return this.get('weights');
  }
  /**
   * Initial weights of each {@link PrimitiveTarget} on this mesh. Each {@link Primitive} must
   * have the same number of targets. Most engines only support 4-8 active morph targets at a
   * time.
   */
  setWeights(weights) {
    return this.set('weights', weights);
  }
}

/**
 * *Nodes are the objects that comprise a {@link Scene}.*
 *
 * Each Node may have one or more children, and a transform (position, rotation, and scale) that
 * applies to all of its descendants. A Node may also reference (or "instantiate") other resources
 * at its location, including {@link Mesh}, Camera, Light, and Skin properties. A Node cannot be
 * part of more than one {@link Scene}.
 *
 * A Node's local transform is represented with array-like objects, intended to be compatible with
 * [gl-matrix](https://github.com/toji/gl-matrix), or with the `toArray`/`fromArray` methods of
 * libraries like three.js and babylon.js.
 *
 * Usage:
 *
 * ```ts
 * const node = doc.createNode('myNode')
 * 	.setMesh(mesh)
 * 	.setTranslation([0, 0, 0])
 * 	.addChild(otherNode);
 * ```
 *
 * References:
 * - [glTF → Nodes and Hierarchy](https://github.com/KhronosGroup/gltf/blob/main/specification/2.0/README.md#nodes-and-hierarchy)
 *
 * @category Properties
 */
class Node extends ExtensibleProperty {
  init() {
    this.propertyType = PropertyType.NODE;
  }
  getDefaults() {
    return Object.assign(super.getDefaults(), {
      translation: [0, 0, 0],
      rotation: [0, 0, 0, 1],
      scale: [1, 1, 1],
      weights: [],
      camera: null,
      mesh: null,
      skin: null,
      children: new RefSet()
    });
  }
  copy(other, resolve = COPY_IDENTITY) {
    // Node cannot be copied, only cloned. Copying is shallow, but Nodes cannot have more than
    // one parent. Rather than leaving one of the two Nodes without children, throw an error here.
    if (resolve === COPY_IDENTITY) throw new Error('Node cannot be copied.');
    return super.copy(other, resolve);
  }
  /**********************************************************************************************
   * Local transform.
   */
  /** Returns the translation (position) of this Node in local space. */
  getTranslation() {
    return this.get('translation');
  }
  /** Returns the rotation (quaternion) of this Node in local space. */
  getRotation() {
    return this.get('rotation');
  }
  /** Returns the scale of this Node in local space. */
  getScale() {
    return this.get('scale');
  }
  /** Sets the translation (position) of this Node in local space. */
  setTranslation(translation) {
    return this.set('translation', translation);
  }
  /** Sets the rotation (quaternion) of this Node in local space. */
  setRotation(rotation) {
    return this.set('rotation', rotation);
  }
  /** Sets the scale of this Node in local space. */
  setScale(scale) {
    return this.set('scale', scale);
  }
  /** Returns the local matrix of this Node. */
  getMatrix() {
    return MathUtils.compose(this.get('translation'), this.get('rotation'), this.get('scale'), []);
  }
  /** Sets the local matrix of this Node. Matrix will be decomposed to TRS properties. */
  setMatrix(matrix) {
    const translation = this.get('translation').slice();
    const rotation = this.get('rotation').slice();
    const scale = this.get('scale').slice();
    MathUtils.decompose(matrix, translation, rotation, scale);
    return this.set('translation', translation).set('rotation', rotation).set('scale', scale);
  }
  /**********************************************************************************************
   * World transform.
   */
  /** Returns the translation (position) of this Node in world space. */
  getWorldTranslation() {
    const t = [0, 0, 0];
    MathUtils.decompose(this.getWorldMatrix(), t, [0, 0, 0, 1], [1, 1, 1]);
    return t;
  }
  /** Returns the rotation (quaternion) of this Node in world space. */
  getWorldRotation() {
    const r = [0, 0, 0, 1];
    MathUtils.decompose(this.getWorldMatrix(), [0, 0, 0], r, [1, 1, 1]);
    return r;
  }
  /** Returns the scale of this Node in world space. */
  getWorldScale() {
    const s = [1, 1, 1];
    MathUtils.decompose(this.getWorldMatrix(), [0, 0, 0], [0, 0, 0, 1], s);
    return s;
  }
  /** Returns the world matrix of this Node. */
  getWorldMatrix() {
    // Build ancestor chain.
    const ancestors = [];
    for (let node = this; node != null; node = node.getParentNode()) {
      ancestors.push(node);
    }
    // Compute world matrix.
    let ancestor;
    const worldMatrix = ancestors.pop().getMatrix();
    while (ancestor = ancestors.pop()) {
      multiply$3(worldMatrix, worldMatrix, ancestor.getMatrix());
    }
    return worldMatrix;
  }
  /**********************************************************************************************
   * Scene hierarchy.
   */
  /**
   * Adds the given Node as a child of this Node.
   *
   * Requirements:
   *
   * 1. Nodes MAY be root children of multiple {@link Scene Scenes}
   * 2. Nodes MUST NOT be children of >1 Node
   * 3. Nodes MUST NOT be children of both Nodes and {@link Scene Scenes}
   *
   * The `addChild` method enforces these restrictions automatically, and will
   * remove the new child from previous parents where needed. This behavior
   * may change in future major releases of the library.
   */
  addChild(child) {
    // Remove existing parents.
    const parentNode = child.getParentNode();
    if (parentNode) parentNode.removeChild(child);
    for (const parent of child.listParents()) {
      if (parent.propertyType === PropertyType.SCENE) {
        parent.removeChild(child);
      }
    }
    return this.addRef('children', child);
  }
  /** Removes a Node from this Node's child Node list. */
  removeChild(child) {
    return this.removeRef('children', child);
  }
  /** Lists all child Nodes of this Node. */
  listChildren() {
    return this.listRefs('children');
  }
  /**
   * Returns the Node's unique parent Node within the scene graph. If the
   * Node has no parents, or is a direct child of the {@link Scene}
   * ("root node"), this method returns null.
   *
   * Unrelated to {@link Property.listParents}, which lists all resource
   * references from properties of any type ({@link Skin}, {@link Root}, ...).
   */
  getParentNode() {
    for (const parent of this.listParents()) {
      if (parent.propertyType === PropertyType.NODE) {
        return parent;
      }
    }
    return null;
  }
  /**********************************************************************************************
   * Attachments.
   */
  /** Returns the {@link Mesh}, if any, instantiated at this Node. */
  getMesh() {
    return this.getRef('mesh');
  }
  /**
   * Sets a {@link Mesh} to be instantiated at this Node. A single mesh may be instatiated by
   * multiple Nodes; reuse of this sort is strongly encouraged.
   */
  setMesh(mesh) {
    return this.setRef('mesh', mesh);
  }
  /** Returns the {@link Camera}, if any, instantiated at this Node. */
  getCamera() {
    return this.getRef('camera');
  }
  /** Sets a {@link Camera} to be instantiated at this Node. */
  setCamera(camera) {
    return this.setRef('camera', camera);
  }
  /** Returns the {@link Skin}, if any, instantiated at this Node. */
  getSkin() {
    return this.getRef('skin');
  }
  /** Sets a {@link Skin} to be instantiated at this Node. */
  setSkin(skin) {
    return this.setRef('skin', skin);
  }
  /**
   * Initial weights of each {@link PrimitiveTarget} for the mesh instance at this Node.
   * Most engines only support 4-8 active morph targets at a time.
   */
  getWeights() {
    return this.get('weights');
  }
  /**
   * Initial weights of each {@link PrimitiveTarget} for the mesh instance at this Node.
   * Most engines only support 4-8 active morph targets at a time.
   */
  setWeights(weights) {
    return this.set('weights', weights);
  }
  /**********************************************************************************************
   * Helpers.
   */
  /** Visits this {@link Node} and its descendants, top-down. */
  traverse(fn) {
    fn(this);
    for (const child of this.listChildren()) child.traverse(fn);
    return this;
  }
}

/**
 * *Primitives are individual GPU draw calls comprising a {@link Mesh}.*
 *
 * Meshes typically have only a single Primitive, although various cases may require more. Each
 * primitive may be assigned vertex attributes, morph target attributes, and a material. Any of
 * these properties should be reused among multiple primitives where feasible.
 *
 * Primitives cannot be moved independently of other primitives within the same mesh, except
 * through the use of morph targets and skinning. If independent movement or other runtime
 * behavior is necessary (like raycasting or collisions) prefer to assign each primitive to a
 * different mesh. The number of GPU draw calls is typically not affected by grouping or
 * ungrouping primitives to a mesh.
 *
 * Each primitive may optionally be deformed by one or more morph targets, stored in a
 * {@link PrimitiveTarget}.
 *
 * Usage:
 *
 * ```ts
 * const primitive = doc.createPrimitive()
 * 	.setAttribute('POSITION', positionAccessor)
 * 	.setAttribute('TEXCOORD_0', uvAccessor)
 * 	.setMaterial(material);
 * mesh.addPrimitive(primitive);
 * node.setMesh(mesh);
 * ```
 *
 * References:
 * - [glTF → Geometry](https://github.com/KhronosGroup/gltf/blob/main/specification/2.0/README.md#geometry)
 *
 * @category Properties
 */
class Primitive extends ExtensibleProperty {
  /**********************************************************************************************
   * Instance.
   */
  init() {
    this.propertyType = PropertyType.PRIMITIVE;
  }
  getDefaults() {
    return Object.assign(super.getDefaults(), {
      mode: Primitive.Mode.TRIANGLES,
      material: null,
      indices: null,
      attributes: new RefMap(),
      targets: new RefSet()
    });
  }
  /**********************************************************************************************
   * Primitive data.
   */
  /** Returns an {@link Accessor} with indices of vertices to be drawn. */
  getIndices() {
    return this.getRef('indices');
  }
  /**
   * Sets an {@link Accessor} with indices of vertices to be drawn. In `TRIANGLES` draw mode,
   * each set of three indices define a triangle. The front face has a counter-clockwise (CCW)
   * winding order.
   */
  setIndices(indices) {
    return this.setRef('indices', indices, {
      usage: BufferViewUsage$1.ELEMENT_ARRAY_BUFFER
    });
  }
  /** Returns a vertex attribute as an {@link Accessor}. */
  getAttribute(semantic) {
    return this.getRefMap('attributes', semantic);
  }
  /**
   * Sets a vertex attribute to an {@link Accessor}. All attributes must have the same vertex
   * count.
   */
  setAttribute(semantic, accessor) {
    return this.setRefMap('attributes', semantic, accessor, {
      usage: BufferViewUsage$1.ARRAY_BUFFER
    });
  }
  /**
   * Lists all vertex attribute {@link Accessor}s associated with the primitive, excluding any
   * attributes used for morph targets. For example, `[positionAccessor, normalAccessor,
   * uvAccessor]`. Order will be consistent with the order returned by {@link .listSemantics}().
   */
  listAttributes() {
    return this.listRefMapValues('attributes');
  }
  /**
   * Lists all vertex attribute semantics associated with the primitive, excluding any semantics
   * used for morph targets. For example, `['POSITION', 'NORMAL', 'TEXCOORD_0']`. Order will be
   * consistent with the order returned by {@link .listAttributes}().
   */
  listSemantics() {
    return this.listRefMapKeys('attributes');
  }
  /** Returns the material used to render the primitive. */
  getMaterial() {
    return this.getRef('material');
  }
  /** Sets the material used to render the primitive. */
  setMaterial(material) {
    return this.setRef('material', material);
  }
  /**********************************************************************************************
   * Mode.
   */
  /**
   * Returns the GPU draw mode (`TRIANGLES`, `LINES`, `POINTS`...) as a WebGL enum value.
   *
   * Reference:
   * - [glTF → `primitive.mode`](https://github.com/KhronosGroup/gltf/blob/main/specification/2.0/README.md#primitivemode)
   */
  getMode() {
    return this.get('mode');
  }
  /**
   * Sets the GPU draw mode (`TRIANGLES`, `LINES`, `POINTS`...) as a WebGL enum value.
   *
   * Reference:
   * - [glTF → `primitive.mode`](https://github.com/KhronosGroup/gltf/blob/main/specification/2.0/README.md#primitivemode)
   */
  setMode(mode) {
    return this.set('mode', mode);
  }
  /**********************************************************************************************
   * Morph targets.
   */
  /** Lists all morph targets associated with the primitive. */
  listTargets() {
    return this.listRefs('targets');
  }
  /**
   * Adds a morph target to the primitive. All primitives in the same mesh must have the same
   * number of targets.
   */
  addTarget(target) {
    return this.addRef('targets', target);
  }
  /**
   * Removes a morph target from the primitive. All primitives in the same mesh must have the same
   * number of targets.
   */
  removeTarget(target) {
    return this.removeRef('targets', target);
  }
}
/**********************************************************************************************
 * Constants.
 */
/** Type of primitives to render. All valid values correspond to WebGL enums. */
Primitive.Mode = {
  /** Draw single points. */
  POINTS: 0,
  /** Draw lines. Each vertex connects to the one after it. */
  LINES: 1,
  /**
   * Draw lines. Each set of two vertices is treated as a separate line segment.
   * @deprecated See {@link https://github.com/KhronosGroup/glTF/issues/1883 KhronosGroup/glTF#1883}.
   */
  LINE_LOOP: 2,
  /** Draw a connected group of line segments from the first vertex to the last,  */
  LINE_STRIP: 3,
  /** Draw triangles. Each set of three vertices creates a separate triangle. */
  TRIANGLES: 4,
  /** Draw a connected strip of triangles. */
  TRIANGLE_STRIP: 5,
  /**
   * Draw a connected group of triangles. Each vertex connects to the previous and the first
   * vertex in the fan.
   * @deprecated See {@link https://github.com/KhronosGroup/glTF/issues/1883 KhronosGroup/glTF#1883}.
   */
  TRIANGLE_FAN: 6
};

/**
 * *Morph target or shape key used to deform one {@link Primitive} in a {@link Mesh}.*
 *
 * A PrimitiveTarget contains a `POSITION` attribute (and optionally `NORMAL` and `TANGENT`) that
 * can additively deform the base attributes on a {@link Mesh} {@link Primitive}. Vertex values
 * of `0, 0, 0` in the target will have no effect, whereas a value of `0, 1, 0` would offset that
 * vertex in the base geometry by y+=1. Morph targets can be fully or partially applied: their
 * default state is controlled by {@link Mesh.getWeights}, which can also be overridden for a
 * particular instantiation of a {@link Mesh}, using {@link Node.getWeights}.
 *
 * Reference:
 * - [glTF → Morph Targets](https://github.com/KhronosGroup/gltf/blob/main/specification/2.0/README.md#morph-targets)
 *
 * @category Properties
 */
class PrimitiveTarget extends Property {
  init() {
    this.propertyType = PropertyType.PRIMITIVE_TARGET;
  }
  getDefaults() {
    return Object.assign(super.getDefaults(), {
      attributes: new RefMap()
    });
  }
  /** Returns a morph target vertex attribute as an {@link Accessor}. */
  getAttribute(semantic) {
    return this.getRefMap('attributes', semantic);
  }
  /**
   * Sets a morph target vertex attribute to an {@link Accessor}.
   */
  setAttribute(semantic, accessor) {
    return this.setRefMap('attributes', semantic, accessor, {
      usage: BufferViewUsage$1.ARRAY_BUFFER
    });
  }
  /**
   * Lists all morph target vertex attribute {@link Accessor}s associated. Order will be
   * consistent with the order returned by {@link .listSemantics}().
   */
  listAttributes() {
    return this.listRefMapValues('attributes');
  }
  /**
   * Lists all morph target vertex attribute semantics associated. Order will be
   * consistent with the order returned by {@link .listAttributes}().
   */
  listSemantics() {
    return this.listRefMapKeys('attributes');
  }
}

function _extends$2() {
  _extends$2 = Object.assign ? Object.assign.bind() : function (target) {
    for (var i = 1; i < arguments.length; i++) {
      var source = arguments[i];
      for (var key in source) {
        if (Object.prototype.hasOwnProperty.call(source, key)) {
          target[key] = source[key];
        }
      }
    }
    return target;
  };
  return _extends$2.apply(this, arguments);
}

/**
 * *Scenes represent a set of visual objects to render.*
 *
 * Typically a glTF file contains only a single Scene, although more are allowed and useful in some
 * cases. No particular meaning is associated with additional Scenes, except as defined by the
 * application. Scenes reference {@link Node}s, and a single Node cannot be a member of more than
 * one Scene.
 *
 * References:
 * - [glTF → Scenes](https://github.com/KhronosGroup/gltf/blob/main/specification/2.0/README.md#scenes)
 * - [glTF → Coordinate System and Units](https://github.com/KhronosGroup/gltf/blob/main/specification/2.0/README.md#coordinate-system-and-units)
 *
 * @category Properties
 */
class Scene extends ExtensibleProperty {
  init() {
    this.propertyType = PropertyType.SCENE;
  }
  getDefaults() {
    return Object.assign(super.getDefaults(), {
      children: new RefSet()
    });
  }
  copy(other, resolve = COPY_IDENTITY) {
    // Scene cannot be copied, only cloned. Copying is shallow, but nodes cannot have more than
    // one parent. Rather than leaving one of the two Scenes without children, throw an error here.
    if (resolve === COPY_IDENTITY) throw new Error('Scene cannot be copied.');
    return super.copy(other, resolve);
  }
  /**
   * Adds a {@link Node} to the Scene.
   *
   * Requirements:
   *
   * 1. Nodes MAY be root children of multiple {@link Scene Scenes}
   * 2. Nodes MUST NOT be children of >1 Node
   * 3. Nodes MUST NOT be children of both Nodes and {@link Scene Scenes}
   *
   * The `addChild` method enforces these restrictions automatically, and will
   * remove the new child from previous parents where needed. This behavior
   * may change in future major releases of the library.
   */
  addChild(node) {
    // Remove existing parent.
    const parentNode = node.getParentNode();
    if (parentNode) parentNode.removeChild(node);
    return this.addRef('children', node);
  }
  /** Removes a {@link Node} from the Scene. */
  removeChild(node) {
    return this.removeRef('children', node);
  }
  /**
   * Lists all direct child {@link Node Nodes} in the Scene. Indirect
   * descendants (children of children) are not returned, but may be
   * reached recursively or with {@link Scene.traverse} instead.
   */
  listChildren() {
    return this.listRefs('children');
  }
  /** Visits each {@link Node} in the Scene, including descendants, top-down. */
  traverse(fn) {
    for (const node of this.listChildren()) node.traverse(fn);
    return this;
  }
}

/**
 * *Collection of {@link Node} joints and inverse bind matrices used with skinned {@link Mesh}
 * instances.*
 *
 * Reference
 * - [glTF → Skins](https://github.com/KhronosGroup/gltf/blob/main/specification/2.0/README.md#skins)
 *
 * @category Properties
 */
class Skin extends ExtensibleProperty {
  init() {
    this.propertyType = PropertyType.SKIN;
  }
  getDefaults() {
    return Object.assign(super.getDefaults(), {
      skeleton: null,
      inverseBindMatrices: null,
      joints: new RefSet()
    });
  }
  /**
   * {@link Node} used as a skeleton root. The node must be the closest common root of the joints
   * hierarchy or a direct or indirect parent node of the closest common root.
   */
  getSkeleton() {
    return this.getRef('skeleton');
  }
  /**
   * {@link Node} used as a skeleton root. The node must be the closest common root of the joints
   * hierarchy or a direct or indirect parent node of the closest common root.
   */
  setSkeleton(skeleton) {
    return this.setRef('skeleton', skeleton);
  }
  /**
   * {@link Accessor} containing the floating-point 4x4 inverse-bind matrices. The default is
   * that each matrix is a 4x4 identity matrix, which implies that inverse-bind matrices were
   * pre-applied.
   */
  getInverseBindMatrices() {
    return this.getRef('inverseBindMatrices');
  }
  /**
   * {@link Accessor} containing the floating-point 4x4 inverse-bind matrices. The default is
   * that each matrix is a 4x4 identity matrix, which implies that inverse-bind matrices were
   * pre-applied.
   */
  setInverseBindMatrices(inverseBindMatrices) {
    return this.setRef('inverseBindMatrices', inverseBindMatrices, {
      usage: BufferViewUsage$1.INVERSE_BIND_MATRICES
    });
  }
  /** Adds a joint {@link Node} to this {@link Skin}. */
  addJoint(joint) {
    return this.addRef('joints', joint);
  }
  /** Removes a joint {@link Node} from this {@link Skin}. */
  removeJoint(joint) {
    return this.removeRef('joints', joint);
  }
  /** Lists joints ({@link Node}s used as joints or bones) in this {@link Skin}. */
  listJoints() {
    return this.listRefs('joints');
  }
}

/**
 * *Texture, or images, referenced by {@link Material} properties.*
 *
 * Textures in glTF Transform are a combination of glTF's `texture` and `image` properties, and
 * should be unique within a document, such that no other texture contains the same
 * {@link Texture.getImage getImage()} data. Where duplicates may already exist, the `dedup({textures: true})`
 * transform can remove them. A {@link Document} with N texture properties will be exported to a
 * glTF file with N `image` properties, and the minimum number of `texture` properties necessary
 * for the materials that use it.
 *
 * For properties associated with a particular _use_ of a texture, see {@link TextureInfo}.
 *
 * Reference:
 * - [glTF → Textures](https://github.com/KhronosGroup/gltf/blob/main/specification/2.0/README.md#textures)
 * - [glTF → Images](https://github.com/KhronosGroup/gltf/blob/main/specification/2.0/README.md#images)
 *
 * @category Properties
 */
class Texture extends ExtensibleProperty {
  init() {
    this.propertyType = PropertyType.TEXTURE;
  }
  getDefaults() {
    return Object.assign(super.getDefaults(), {
      image: null,
      mimeType: '',
      uri: ''
    });
  }
  /**********************************************************************************************
   * MIME type / format.
   */
  /** Returns the MIME type for this texture ('image/jpeg' or 'image/png'). */
  getMimeType() {
    return this.get('mimeType') || ImageUtils.extensionToMimeType(FileUtils.extension(this.get('uri')));
  }
  /**
   * Sets the MIME type for this texture ('image/jpeg' or 'image/png'). If the texture does not
   * have a URI, a MIME type is required for correct export.
   */
  setMimeType(mimeType) {
    return this.set('mimeType', mimeType);
  }
  /**********************************************************************************************
   * URI / filename.
   */
  /** Returns the URI (e.g. 'path/to/file.png') for this texture. */
  getURI() {
    return this.get('uri');
  }
  /**
   * Sets the URI (e.g. 'path/to/file.png') for this texture. If the texture does not have a MIME
   * type, a URI is required for correct export.
   */
  setURI(uri) {
    this.set('uri', uri);
    const mimeType = ImageUtils.extensionToMimeType(FileUtils.extension(uri));
    if (mimeType) this.set('mimeType', mimeType);
    return this;
  }
  /**********************************************************************************************
   * Image data.
   */
  /** Returns the raw image data for this texture. */
  getImage() {
    return this.get('image');
  }
  /** Sets the raw image data for this texture. */
  setImage(image) {
    return this.set('image', BufferUtils.assertView(image));
  }
  /** Returns the size, in pixels, of this texture. */
  getSize() {
    const image = this.get('image');
    if (!image) return null;
    return ImageUtils.getSize(image, this.getMimeType());
  }
}

/**
 * *Root property of a glTF asset.*
 *
 * Any properties to be exported with a particular asset must be referenced (directly or
 * indirectly) by the root. Metadata about the asset's license, generator, and glTF specification
 * version are stored in the asset, accessible with {@link Root.getAsset}.
 *
 * Properties are added to the root with factory methods on its {@link Document}, and removed by
 * calling {@link Property.dispose}() on the resource. Any properties that have been created but
 * not disposed will be included when calling the various `root.list*()` methods.
 *
 * A document's root cannot be removed, and no other root may be created. Unlike other
 * {@link Property} types, the `.dispose()`, `.detach()` methods have no useful function on a
 * Root property.
 *
 * Usage:
 *
 * ```ts
 * const root = document.getRoot();
 * const scene = document.createScene('myScene');
 * const node = document.createNode('myNode');
 * scene.addChild(node);
 *
 * console.log(root.listScenes()); // → [scene x 1]
 * ```
 *
 * Reference: [glTF → Concepts](https://github.com/KhronosGroup/gltf/blob/main/specification/2.0/README.md#concepts)
 *
 * @category Properties
 */
class Root extends ExtensibleProperty {
  init() {
    this.propertyType = PropertyType.ROOT;
  }
  getDefaults() {
    return Object.assign(super.getDefaults(), {
      asset: {
        generator: `glTF-Transform ${VERSION}`,
        version: '2.0'
      },
      defaultScene: null,
      accessors: new RefSet(),
      animations: new RefSet(),
      buffers: new RefSet(),
      cameras: new RefSet(),
      materials: new RefSet(),
      meshes: new RefSet(),
      nodes: new RefSet(),
      scenes: new RefSet(),
      skins: new RefSet(),
      textures: new RefSet()
    });
  }
  /** @internal */
  constructor(graph) {
    super(graph);
    this._extensions = new Set();
    graph.addEventListener('node:create', event => {
      this._addChildOfRoot(event.target);
    });
  }
  clone() {
    throw new Error('Root cannot be cloned.');
  }
  copy(other, resolve = COPY_IDENTITY) {
    // Root cannot be cloned in isolation: only with its Document. Extensions are managed by
    // the Document during cloning. The Root, and only the Root, should keep existing
    // references while copying to avoid overwriting during a merge.
    if (resolve === COPY_IDENTITY) throw new Error('Root cannot be copied.');
    // IMPORTANT: Root cannot call super.copy(), which removes existing references.
    this.set('asset', _extends$2({}, other.get('asset')));
    this.setName(other.getName());
    this.setExtras(_extends$2({}, other.getExtras()));
    this.setDefaultScene(other.getDefaultScene() ? resolve(other.getDefaultScene()) : null);
    for (const extensionName of other.listRefMapKeys('extensions')) {
      const otherExtension = other.getExtension(extensionName);
      this.setExtension(extensionName, resolve(otherExtension));
    }
    return this;
  }
  _addChildOfRoot(child) {
    if (child instanceof Scene) {
      this.addRef('scenes', child);
    } else if (child instanceof Node) {
      this.addRef('nodes', child);
    } else if (child instanceof Camera) {
      this.addRef('cameras', child);
    } else if (child instanceof Skin) {
      this.addRef('skins', child);
    } else if (child instanceof Mesh) {
      this.addRef('meshes', child);
    } else if (child instanceof Material) {
      this.addRef('materials', child);
    } else if (child instanceof Texture) {
      this.addRef('textures', child);
    } else if (child instanceof Animation) {
      this.addRef('animations', child);
    } else if (child instanceof Accessor) {
      this.addRef('accessors', child);
    } else if (child instanceof Buffer$1) {
      this.addRef('buffers', child);
    }
    // No error for untracked property types.
    return this;
  }
  /**
   * Returns the `asset` object, which specifies the target glTF version of the asset. Additional
   * metadata can be stored in optional properties such as `generator` or `copyright`.
   *
   * Reference: [glTF → Asset](https://github.com/KhronosGroup/gltf/blob/main/specification/2.0/README.md#asset)
   */
  getAsset() {
    return this.get('asset');
  }
  /**********************************************************************************************
   * Extensions.
   */
  /** Lists all {@link Extension Extensions} enabled for this root. */
  listExtensionsUsed() {
    return Array.from(this._extensions);
  }
  /** Lists all {@link Extension Extensions} enabled and required for this root. */
  listExtensionsRequired() {
    return this.listExtensionsUsed().filter(extension => extension.isRequired());
  }
  /** @internal */
  _enableExtension(extension) {
    this._extensions.add(extension);
    return this;
  }
  /** @internal */
  _disableExtension(extension) {
    this._extensions.delete(extension);
    return this;
  }
  /**********************************************************************************************
   * Properties.
   */
  /** Lists all {@link Scene} properties associated with this root. */
  listScenes() {
    return this.listRefs('scenes');
  }
  /** Default {@link Scene} associated with this root. */
  setDefaultScene(defaultScene) {
    return this.setRef('defaultScene', defaultScene);
  }
  /** Default {@link Scene} associated with this root. */
  getDefaultScene() {
    return this.getRef('defaultScene');
  }
  /** Lists all {@link Node} properties associated with this root. */
  listNodes() {
    return this.listRefs('nodes');
  }
  /** Lists all {@link Camera} properties associated with this root. */
  listCameras() {
    return this.listRefs('cameras');
  }
  /** Lists all {@link Skin} properties associated with this root. */
  listSkins() {
    return this.listRefs('skins');
  }
  /** Lists all {@link Mesh} properties associated with this root. */
  listMeshes() {
    return this.listRefs('meshes');
  }
  /** Lists all {@link Material} properties associated with this root. */
  listMaterials() {
    return this.listRefs('materials');
  }
  /** Lists all {@link Texture} properties associated with this root. */
  listTextures() {
    return this.listRefs('textures');
  }
  /** Lists all {@link Animation} properties associated with this root. */
  listAnimations() {
    return this.listRefs('animations');
  }
  /** Lists all {@link Accessor} properties associated with this root. */
  listAccessors() {
    return this.listRefs('accessors');
  }
  /** Lists all {@link Buffer} properties associated with this root. */
  listBuffers() {
    return this.listRefs('buffers');
  }
}

/**
 * *Wraps a glTF asset and its resources for easier modification.*
 *
 * Documents manage glTF assets and the relationships among dependencies. The document wrapper
 * allow tools to read and write changes without dealing with array indices or byte offsets, which
 * would otherwise require careful management over the course of a file modification. An internal
 * graph structure allows any property in the glTF file to maintain references to its dependencies,
 * and makes it easy to determine where a particular property dependency is being used. For
 * example, finding a list of materials that use a particular texture is as simple as calling
 * {@link Texture.listParents}().
 *
 * A new resource {@link Property} (e.g. a {@link Mesh} or {@link Material}) is created by calling
 * 'create' methods on the document. Resources are destroyed by calling {@link Property.dispose}().
 *
 * ```ts
 * import fs from 'fs/promises';
 * import { Document } from '@gltf-transform/core';
 * import { dedup } from '@gltf-transform/functions';
 *
 * const document = new Document();
 *
 * const texture1 = document.createTexture('myTexture')
 * 	.setImage(await fs.readFile('path/to/image.png'))
 * 	.setMimeType('image/png');
 * const texture2 = document.createTexture('myTexture2')
 * 	.setImage(await fs.readFile('path/to/image2.png'))
 * 	.setMimeType('image/png');
 *
 * // Document containing duplicate copies of the same texture.
 * document.getRoot().listTextures(); // → [texture x 2]
 *
 * await document.transform(
 * 	dedup({textures: true}),
 * 	// ...
 * );
 *
 * // Document with duplicate textures removed.
 * document.getRoot().listTextures(); // → [texture x 1]
 * ```
 *
 * Reference:
 * - [glTF → Basics](https://github.com/KhronosGroup/gltf/blob/main/specification/2.0/README.md#gltf-basics)
 * - [glTF → Concepts](https://github.com/KhronosGroup/gltf/blob/main/specification/2.0/README.md#concepts)
 *
 * @category Documents
 */
class Document {
  /**
   * Returns the Document associated with a given Graph, if any.
   * @hidden
   * @experimental
   */
  static fromGraph(graph) {
    return Document._GRAPH_DOCUMENTS.get(graph) || null;
  }
  /** Creates a new Document, representing an empty glTF asset. */
  constructor() {
    this._graph = new Graph();
    this._root = new Root(this._graph);
    this._logger = Logger.DEFAULT_INSTANCE;
    Document._GRAPH_DOCUMENTS.set(this._graph, this);
  }
  /** Returns the glTF {@link Root} property. */
  getRoot() {
    return this._root;
  }
  /**
   * Returns the {@link Graph} representing connectivity of resources within this document.
   * @hidden
   */
  getGraph() {
    return this._graph;
  }
  /** Returns the {@link Logger} instance used for any operations performed on this document. */
  getLogger() {
    return this._logger;
  }
  /**
   * Overrides the {@link Logger} instance used for any operations performed on this document.
   *
   * Usage:
   *
   * ```ts
   * doc
   * 	.setLogger(new Logger(Logger.Verbosity.SILENT))
   * 	.transform(dedup(), weld());
   * ```
   */
  setLogger(logger) {
    this._logger = logger;
    return this;
  }
  /**
   * Clones this Document, copying all resources within it.
   * @deprecated Use 'cloneDocument(document)' from '@gltf-transform/functions'.
   * @hidden
   * @internal
   */
  clone() {
    throw new Error(`Use 'cloneDocument(source)' from '@gltf-transform/functions'.`);
  }
  /**
   * Merges the content of another Document into this one, without affecting the original.
   * @deprecated Use 'mergeDocuments(target, source)' from '@gltf-transform/functions'.
   * @hidden
   * @internal
   */
  merge(_other) {
    throw new Error(`Use 'mergeDocuments(target, source)' from '@gltf-transform/functions'.`);
  }
  /**
   * Applies a series of modifications to this document. Each transformation is asynchronous,
   * takes the {@link Document} as input, and returns nothing. Transforms are applied in the
   * order given, which may affect the final result.
   *
   * Usage:
   *
   * ```ts
   * await doc.transform(
   * 	dedup(),
   * 	prune()
   * );
   * ```
   *
   * @param transforms List of synchronous transformation functions to apply.
   */
  async transform(...transforms) {
    const stack = transforms.map(fn => fn.name);
    for (const transform of transforms) {
      await transform(this, {
        stack
      });
    }
    return this;
  }
  /**********************************************************************************************
   * Extension factory method.
   */
  /**
   * Creates a new {@link Extension}, for the extension type of the given constructor. If the
   * extension is already enabled for this Document, the previous Extension reference is reused.
   */
  createExtension(ctor) {
    const extensionName = ctor.EXTENSION_NAME;
    const prevExtension = this.getRoot().listExtensionsUsed().find(ext => ext.extensionName === extensionName);
    return prevExtension || new ctor(this);
  }
  /**********************************************************************************************
   * Property factory methods.
   */
  /** Creates a new {@link Scene} attached to this document's {@link Root}. */
  createScene(name = '') {
    return new Scene(this._graph, name);
  }
  /** Creates a new {@link Node} attached to this document's {@link Root}. */
  createNode(name = '') {
    return new Node(this._graph, name);
  }
  /** Creates a new {@link Camera} attached to this document's {@link Root}. */
  createCamera(name = '') {
    return new Camera(this._graph, name);
  }
  /** Creates a new {@link Skin} attached to this document's {@link Root}. */
  createSkin(name = '') {
    return new Skin(this._graph, name);
  }
  /** Creates a new {@link Mesh} attached to this document's {@link Root}. */
  createMesh(name = '') {
    return new Mesh(this._graph, name);
  }
  /**
   * Creates a new {@link Primitive}. Primitives must be attached to a {@link Mesh}
   * for use and export; they are not otherwise associated with a {@link Root}.
   */
  createPrimitive() {
    return new Primitive(this._graph);
  }
  /**
   * Creates a new {@link PrimitiveTarget}, or morph target. Targets must be attached to a
   * {@link Primitive} for use and export; they are not otherwise associated with a {@link Root}.
   */
  createPrimitiveTarget(name = '') {
    return new PrimitiveTarget(this._graph, name);
  }
  /** Creates a new {@link Material} attached to this document's {@link Root}. */
  createMaterial(name = '') {
    return new Material(this._graph, name);
  }
  /** Creates a new {@link Texture} attached to this document's {@link Root}. */
  createTexture(name = '') {
    return new Texture(this._graph, name);
  }
  /** Creates a new {@link Animation} attached to this document's {@link Root}. */
  createAnimation(name = '') {
    return new Animation(this._graph, name);
  }
  /**
   * Creates a new {@link AnimationChannel}. Channels must be attached to an {@link Animation}
   * for use and export; they are not otherwise associated with a {@link Root}.
   */
  createAnimationChannel(name = '') {
    return new AnimationChannel(this._graph, name);
  }
  /**
   * Creates a new {@link AnimationSampler}. Samplers must be attached to an {@link Animation}
   * for use and export; they are not otherwise associated with a {@link Root}.
   */
  createAnimationSampler(name = '') {
    return new AnimationSampler(this._graph, name);
  }
  /** Creates a new {@link Accessor} attached to this document's {@link Root}. */
  createAccessor(name = '', buffer = null) {
    if (!buffer) {
      buffer = this.getRoot().listBuffers()[0];
    }
    return new Accessor(this._graph, name).setBuffer(buffer);
  }
  /** Creates a new {@link Buffer} attached to this document's {@link Root}. */
  createBuffer(name = '') {
    return new Buffer$1(this._graph, name);
  }
}
/**
 * Enables lookup of a Document from its Graph. For internal use, only.
 * @internal
 * @experimental
 */
Document._GRAPH_DOCUMENTS = new WeakMap();

/**
 * *Base class for all Extensions.*
 *
 * Extensions enhance a glTF {@link Document} with additional features and schema, beyond the core
 * glTF specification. Common extensions may be imported from the `@gltf-transform/extensions`
 * package, or custom extensions may be created by extending this base class.
 *
 * An extension is added to a Document by calling {@link Document.createExtension} with the
 * extension constructor. The extension object may then be used to construct
 * {@link ExtensionProperty} instances, which are attached to properties throughout the Document
 * as prescribed by the extension itself.
 *
 * For more information on available extensions and their usage, see [Extensions](/extensions).
 *
 * Reference:
 * - [glTF → Extensions](https://github.com/KhronosGroup/gltf/blob/main/specification/2.0/README.md#specifying-extensions)
 * - [glTF Extension Registry](https://github.com/KhronosGroup/gltf/blob/main/extensions)
 *
 * @category Extensions
 */
class Extension {
  /** @hidden */
  constructor(document) {
    /** Official name of the extension. */
    this.extensionName = '';
    /**
     * Before reading, extension should be called for these {@link Property} types. *Most
     * extensions don't need to implement this.*
     * @hidden
     */
    this.prereadTypes = [];
    /**
     * Before writing, extension should be called for these {@link Property} types. *Most
     * extensions don't need to implement this.*
     * @hidden
     */
    this.prewriteTypes = [];
    /** @hidden Dependency IDs needed to read this extension, to be installed before I/O. */
    this.readDependencies = [];
    /** @hidden Dependency IDs needed to write this extension, to be installed before I/O. */
    this.writeDependencies = [];
    /** @hidden */
    this.document = void 0;
    /** @hidden */
    this.required = false;
    /** @hidden */
    this.properties = new Set();
    /** @hidden */
    this._listener = void 0;
    this.document = document;
    document.getRoot()._enableExtension(this);
    this._listener = _event => {
      const event = _event;
      const target = event.target;
      if (target instanceof ExtensionProperty && target.extensionName === this.extensionName) {
        if (event.type === 'node:create') this._addExtensionProperty(target);
        if (event.type === 'node:dispose') this._removeExtensionProperty(target);
      }
    };
    const graph = document.getGraph();
    graph.addEventListener('node:create', this._listener);
    graph.addEventListener('node:dispose', this._listener);
  }
  /** Disables and removes the extension from the Document. */
  dispose() {
    this.document.getRoot()._disableExtension(this);
    const graph = this.document.getGraph();
    graph.removeEventListener('node:create', this._listener);
    graph.removeEventListener('node:dispose', this._listener);
    for (const property of this.properties) {
      property.dispose();
    }
  }
  /** @hidden Performs first-time setup for the extension. Must be idempotent. */
  static register() {}
  /**
   * Indicates to the client whether it is OK to load the asset when this extension is not
   * recognized. Optional extensions are generally preferred, if there is not a good reason
   * to require a client to completely fail when an extension isn't known.
   */
  isRequired() {
    return this.required;
  }
  /**
   * Indicates to the client whether it is OK to load the asset when this extension is not
   * recognized. Optional extensions are generally preferred, if there is not a good reason
   * to require a client to completely fail when an extension isn't known.
   */
  setRequired(required) {
    this.required = required;
    return this;
  }
  /**
   * Lists all {@link ExtensionProperty} instances associated with, or created by, this
   * extension. Includes only instances that are attached to the Document's graph; detached
   * instances will be excluded.
   */
  listProperties() {
    return Array.from(this.properties);
  }
  /**********************************************************************************************
   * ExtensionProperty management.
   */
  /** @internal */
  _addExtensionProperty(property) {
    this.properties.add(property);
    return this;
  }
  /** @internal */
  _removeExtensionProperty(property) {
    this.properties.delete(property);
    return this;
  }
  /**********************************************************************************************
   * I/O implementation.
   */
  /** @hidden Installs dependencies required by the extension. */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  install(key, dependency) {
    return this;
  }
  /**
   * Used by the {@link PlatformIO} utilities when reading a glTF asset. This method may
   * optionally be implemented by an extension, and should then support any property type
   * declared by the Extension's {@link Extension.prereadTypes} list. The Extension will
   * be given a ReaderContext instance, and is expected to update either the context or its
   * {@link JSONDocument} with resources known to the Extension. *Most extensions don't need to
   * implement this.*
   * @hidden
   */
  preread(_readerContext, _propertyType) {
    return this;
  }
  /**
   * Used by the {@link PlatformIO} utilities when writing a glTF asset. This method may
   * optionally be implemented by an extension, and should then support any property type
   * declared by the Extension's {@link Extension.prewriteTypes} list. The Extension will
   * be given a WriterContext instance, and is expected to update either the context or its
   * {@link JSONDocument} with resources known to the Extension. *Most extensions don't need to
   * implement this.*
   * @hidden
   */
  prewrite(_writerContext, _propertyType) {
    return this;
  }
}
/** Official name of the extension. */
Extension.EXTENSION_NAME = void 0;

/**
 * Model class providing glTF Transform objects representing each definition in the glTF file, used
 * by a {@link GLTFReader} and its {@link Extension} implementations. Indices of all properties will be
 * consistent with the glTF file.
 *
 * @hidden
 */
class ReaderContext {
  constructor(jsonDoc) {
    this.jsonDoc = void 0;
    this.buffers = [];
    this.bufferViews = [];
    this.bufferViewBuffers = [];
    this.accessors = [];
    this.textures = [];
    this.textureInfos = new Map();
    this.materials = [];
    this.meshes = [];
    this.cameras = [];
    this.nodes = [];
    this.skins = [];
    this.animations = [];
    this.scenes = [];
    this.jsonDoc = jsonDoc;
  }
  setTextureInfo(textureInfo, textureInfoDef) {
    this.textureInfos.set(textureInfo, textureInfoDef);
    if (textureInfoDef.texCoord !== undefined) {
      textureInfo.setTexCoord(textureInfoDef.texCoord);
    }
    if (textureInfoDef.extras !== undefined) {
      textureInfo.setExtras(textureInfoDef.extras);
    }
    const textureDef = this.jsonDoc.json.textures[textureInfoDef.index];
    if (textureDef.sampler === undefined) return;
    const samplerDef = this.jsonDoc.json.samplers[textureDef.sampler];
    if (samplerDef.magFilter !== undefined) {
      textureInfo.setMagFilter(samplerDef.magFilter);
    }
    if (samplerDef.minFilter !== undefined) {
      textureInfo.setMinFilter(samplerDef.minFilter);
    }
    if (samplerDef.wrapS !== undefined) {
      textureInfo.setWrapS(samplerDef.wrapS);
    }
    if (samplerDef.wrapT !== undefined) {
      textureInfo.setWrapT(samplerDef.wrapT);
    }
  }
}

const DEFAULT_OPTIONS = {
  logger: Logger.DEFAULT_INSTANCE,
  extensions: [],
  dependencies: {}
};
const SUPPORTED_PREREAD_TYPES = new Set([PropertyType.BUFFER, PropertyType.TEXTURE, PropertyType.MATERIAL, PropertyType.MESH, PropertyType.PRIMITIVE, PropertyType.NODE, PropertyType.SCENE]);
/** @internal */
class GLTFReader {
  static read(jsonDoc, _options = DEFAULT_OPTIONS) {
    const options = _extends$2({}, DEFAULT_OPTIONS, _options);
    const {
      json
    } = jsonDoc;
    const document = new Document().setLogger(options.logger);
    this.validate(jsonDoc, options);
    /* Reader context. */
    const context = new ReaderContext(jsonDoc);
    /** Asset. */
    const assetDef = json.asset;
    const asset = document.getRoot().getAsset();
    if (assetDef.copyright) asset.copyright = assetDef.copyright;
    if (assetDef.extras) asset.extras = assetDef.extras;
    if (json.extras !== undefined) {
      document.getRoot().setExtras(_extends$2({}, json.extras));
    }
    /** Extensions (1/2). */
    const extensionsUsed = json.extensionsUsed || [];
    const extensionsRequired = json.extensionsRequired || [];
    options.extensions.sort((a, b) => a.EXTENSION_NAME > b.EXTENSION_NAME ? 1 : -1);
    for (const Extension of options.extensions) {
      if (extensionsUsed.includes(Extension.EXTENSION_NAME)) {
        // Create extension.
        const extension = document.createExtension(Extension).setRequired(extensionsRequired.includes(Extension.EXTENSION_NAME));
        // Warn on unsupported preread hooks.
        const unsupportedHooks = extension.prereadTypes.filter(type => !SUPPORTED_PREREAD_TYPES.has(type));
        if (unsupportedHooks.length) {
          options.logger.warn(`Preread hooks for some types (${unsupportedHooks.join()}), requested by extension ` + `${extension.extensionName}, are unsupported. Please file an issue or a PR.`);
        }
        // Install dependencies.
        for (const key of extension.readDependencies) {
          extension.install(key, options.dependencies[key]);
        }
      }
    }
    /** Buffers. */
    const bufferDefs = json.buffers || [];
    document.getRoot().listExtensionsUsed().filter(extension => extension.prereadTypes.includes(PropertyType.BUFFER)).forEach(extension => extension.preread(context, PropertyType.BUFFER));
    context.buffers = bufferDefs.map(bufferDef => {
      const buffer = document.createBuffer(bufferDef.name);
      if (bufferDef.extras) buffer.setExtras(bufferDef.extras);
      if (bufferDef.uri && bufferDef.uri.indexOf('__') !== 0) {
        buffer.setURI(bufferDef.uri);
      }
      return buffer;
    });
    /** Buffer views. */
    const bufferViewDefs = json.bufferViews || [];
    context.bufferViewBuffers = bufferViewDefs.map((bufferViewDef, index) => {
      if (!context.bufferViews[index]) {
        const bufferDef = jsonDoc.json.buffers[bufferViewDef.buffer];
        const resource = bufferDef.uri ? jsonDoc.resources[bufferDef.uri] : jsonDoc.resources[GLB_BUFFER];
        const byteOffset = bufferViewDef.byteOffset || 0;
        context.bufferViews[index] = BufferUtils.toView(resource, byteOffset, bufferViewDef.byteLength);
      }
      return context.buffers[bufferViewDef.buffer];
    });
    /** Accessors. */
    // Accessor .count and .componentType properties are inferred dynamically.
    const accessorDefs = json.accessors || [];
    context.accessors = accessorDefs.map(accessorDef => {
      const buffer = context.bufferViewBuffers[accessorDef.bufferView];
      const accessor = document.createAccessor(accessorDef.name, buffer).setType(accessorDef.type);
      if (accessorDef.extras) accessor.setExtras(accessorDef.extras);
      if (accessorDef.normalized !== undefined) {
        accessor.setNormalized(accessorDef.normalized);
      }
      // Sparse accessors, KHR_draco_mesh_compression, and EXT_meshopt_compression.
      if (accessorDef.bufferView === undefined) return accessor;
      // NOTICE: We mark sparse accessors at the end of the I/O reading process. Consider an
      // accessor to be 'sparse' if it (A) includes sparse value overrides, or (B) does not
      // define .bufferView _and_ no extension provides that data.
      accessor.setArray(getAccessorArray(accessorDef, context));
      return accessor;
    });
    /** Textures. */
    // glTF Transform's "Texture" properties correspond 1:1 with glTF "Image" properties, and
    // with image files. The glTF file may contain more one texture per image, where images
    // are reused with different sampler properties.
    const imageDefs = json.images || [];
    const textureDefs = json.textures || [];
    document.getRoot().listExtensionsUsed().filter(extension => extension.prereadTypes.includes(PropertyType.TEXTURE)).forEach(extension => extension.preread(context, PropertyType.TEXTURE));
    context.textures = imageDefs.map(imageDef => {
      const texture = document.createTexture(imageDef.name);
      // glTF Image corresponds 1:1 with glTF Transform Texture. See `writer.ts`.
      if (imageDef.extras) texture.setExtras(imageDef.extras);
      if (imageDef.bufferView !== undefined) {
        const bufferViewDef = json.bufferViews[imageDef.bufferView];
        const bufferDef = jsonDoc.json.buffers[bufferViewDef.buffer];
        const bufferData = bufferDef.uri ? jsonDoc.resources[bufferDef.uri] : jsonDoc.resources[GLB_BUFFER];
        const byteOffset = bufferViewDef.byteOffset || 0;
        const byteLength = bufferViewDef.byteLength;
        const imageData = bufferData.slice(byteOffset, byteOffset + byteLength);
        texture.setImage(imageData);
      } else if (imageDef.uri !== undefined) {
        texture.setImage(jsonDoc.resources[imageDef.uri]);
        if (imageDef.uri.indexOf('__') !== 0) {
          texture.setURI(imageDef.uri);
        }
      }
      if (imageDef.mimeType !== undefined) {
        texture.setMimeType(imageDef.mimeType);
      } else if (imageDef.uri) {
        const extension = FileUtils.extension(imageDef.uri);
        texture.setMimeType(ImageUtils.extensionToMimeType(extension));
      }
      return texture;
    });
    /** Materials. */
    document.getRoot().listExtensionsUsed().filter(extension => extension.prereadTypes.includes(PropertyType.MATERIAL)).forEach(extension => extension.preread(context, PropertyType.MATERIAL));
    const materialDefs = json.materials || [];
    context.materials = materialDefs.map(materialDef => {
      const material = document.createMaterial(materialDef.name);
      if (materialDef.extras) material.setExtras(materialDef.extras);
      // Program state & blending.
      if (materialDef.alphaMode !== undefined) {
        material.setAlphaMode(materialDef.alphaMode);
      }
      if (materialDef.alphaCutoff !== undefined) {
        material.setAlphaCutoff(materialDef.alphaCutoff);
      }
      if (materialDef.doubleSided !== undefined) {
        material.setDoubleSided(materialDef.doubleSided);
      }
      // Factors.
      const pbrDef = materialDef.pbrMetallicRoughness || {};
      if (pbrDef.baseColorFactor !== undefined) {
        material.setBaseColorFactor(pbrDef.baseColorFactor);
      }
      if (materialDef.emissiveFactor !== undefined) {
        material.setEmissiveFactor(materialDef.emissiveFactor);
      }
      if (pbrDef.metallicFactor !== undefined) {
        material.setMetallicFactor(pbrDef.metallicFactor);
      }
      if (pbrDef.roughnessFactor !== undefined) {
        material.setRoughnessFactor(pbrDef.roughnessFactor);
      }
      // Textures.
      if (pbrDef.baseColorTexture !== undefined) {
        const textureInfoDef = pbrDef.baseColorTexture;
        const texture = context.textures[textureDefs[textureInfoDef.index].source];
        material.setBaseColorTexture(texture);
        context.setTextureInfo(material.getBaseColorTextureInfo(), textureInfoDef);
      }
      if (materialDef.emissiveTexture !== undefined) {
        const textureInfoDef = materialDef.emissiveTexture;
        const texture = context.textures[textureDefs[textureInfoDef.index].source];
        material.setEmissiveTexture(texture);
        context.setTextureInfo(material.getEmissiveTextureInfo(), textureInfoDef);
      }
      if (materialDef.normalTexture !== undefined) {
        const textureInfoDef = materialDef.normalTexture;
        const texture = context.textures[textureDefs[textureInfoDef.index].source];
        material.setNormalTexture(texture);
        context.setTextureInfo(material.getNormalTextureInfo(), textureInfoDef);
        if (materialDef.normalTexture.scale !== undefined) {
          material.setNormalScale(materialDef.normalTexture.scale);
        }
      }
      if (materialDef.occlusionTexture !== undefined) {
        const textureInfoDef = materialDef.occlusionTexture;
        const texture = context.textures[textureDefs[textureInfoDef.index].source];
        material.setOcclusionTexture(texture);
        context.setTextureInfo(material.getOcclusionTextureInfo(), textureInfoDef);
        if (materialDef.occlusionTexture.strength !== undefined) {
          material.setOcclusionStrength(materialDef.occlusionTexture.strength);
        }
      }
      if (pbrDef.metallicRoughnessTexture !== undefined) {
        const textureInfoDef = pbrDef.metallicRoughnessTexture;
        const texture = context.textures[textureDefs[textureInfoDef.index].source];
        material.setMetallicRoughnessTexture(texture);
        context.setTextureInfo(material.getMetallicRoughnessTextureInfo(), textureInfoDef);
      }
      return material;
    });
    /** Meshes. */
    document.getRoot().listExtensionsUsed().filter(extension => extension.prereadTypes.includes(PropertyType.MESH)).forEach(extension => extension.preread(context, PropertyType.MESH));
    const meshDefs = json.meshes || [];
    document.getRoot().listExtensionsUsed().filter(extension => extension.prereadTypes.includes(PropertyType.PRIMITIVE)).forEach(extension => extension.preread(context, PropertyType.PRIMITIVE));
    context.meshes = meshDefs.map(meshDef => {
      const mesh = document.createMesh(meshDef.name);
      if (meshDef.extras) mesh.setExtras(meshDef.extras);
      if (meshDef.weights !== undefined) {
        mesh.setWeights(meshDef.weights);
      }
      const primitiveDefs = meshDef.primitives || [];
      primitiveDefs.forEach(primitiveDef => {
        const primitive = document.createPrimitive();
        if (primitiveDef.extras) primitive.setExtras(primitiveDef.extras);
        if (primitiveDef.material !== undefined) {
          primitive.setMaterial(context.materials[primitiveDef.material]);
        }
        if (primitiveDef.mode !== undefined) {
          primitive.setMode(primitiveDef.mode);
        }
        for (const [semantic, index] of Object.entries(primitiveDef.attributes || {})) {
          primitive.setAttribute(semantic, context.accessors[index]);
        }
        if (primitiveDef.indices !== undefined) {
          primitive.setIndices(context.accessors[primitiveDef.indices]);
        }
        const targetNames = meshDef.extras && meshDef.extras.targetNames || [];
        const targetDefs = primitiveDef.targets || [];
        targetDefs.forEach((targetDef, targetIndex) => {
          const targetName = targetNames[targetIndex] || targetIndex.toString();
          const target = document.createPrimitiveTarget(targetName);
          for (const [semantic, accessorIndex] of Object.entries(targetDef)) {
            target.setAttribute(semantic, context.accessors[accessorIndex]);
          }
          primitive.addTarget(target);
        });
        mesh.addPrimitive(primitive);
      });
      return mesh;
    });
    /** Cameras. */
    const cameraDefs = json.cameras || [];
    context.cameras = cameraDefs.map(cameraDef => {
      const camera = document.createCamera(cameraDef.name).setType(cameraDef.type);
      if (cameraDef.extras) camera.setExtras(cameraDef.extras);
      if (cameraDef.type === Camera.Type.PERSPECTIVE) {
        const perspectiveDef = cameraDef.perspective;
        camera.setYFov(perspectiveDef.yfov);
        camera.setZNear(perspectiveDef.znear);
        if (perspectiveDef.zfar !== undefined) {
          camera.setZFar(perspectiveDef.zfar);
        }
        if (perspectiveDef.aspectRatio !== undefined) {
          camera.setAspectRatio(perspectiveDef.aspectRatio);
        }
      } else {
        const orthoDef = cameraDef.orthographic;
        camera.setZNear(orthoDef.znear).setZFar(orthoDef.zfar).setXMag(orthoDef.xmag).setYMag(orthoDef.ymag);
      }
      return camera;
    });
    /** Nodes. */
    const nodeDefs = json.nodes || [];
    document.getRoot().listExtensionsUsed().filter(extension => extension.prereadTypes.includes(PropertyType.NODE)).forEach(extension => extension.preread(context, PropertyType.NODE));
    context.nodes = nodeDefs.map(nodeDef => {
      const node = document.createNode(nodeDef.name);
      if (nodeDef.extras) node.setExtras(nodeDef.extras);
      if (nodeDef.translation !== undefined) {
        node.setTranslation(nodeDef.translation);
      }
      if (nodeDef.rotation !== undefined) {
        node.setRotation(nodeDef.rotation);
      }
      if (nodeDef.scale !== undefined) {
        node.setScale(nodeDef.scale);
      }
      if (nodeDef.matrix !== undefined) {
        const translation = [0, 0, 0];
        const rotation = [0, 0, 0, 1];
        const scale = [1, 1, 1];
        MathUtils.decompose(nodeDef.matrix, translation, rotation, scale);
        node.setTranslation(translation);
        node.setRotation(rotation);
        node.setScale(scale);
      }
      if (nodeDef.weights !== undefined) {
        node.setWeights(nodeDef.weights);
      }
      // Attachments (mesh, camera, skin) defined later in reading process.
      return node;
    });
    /** Skins. */
    const skinDefs = json.skins || [];
    context.skins = skinDefs.map(skinDef => {
      const skin = document.createSkin(skinDef.name);
      if (skinDef.extras) skin.setExtras(skinDef.extras);
      if (skinDef.inverseBindMatrices !== undefined) {
        skin.setInverseBindMatrices(context.accessors[skinDef.inverseBindMatrices]);
      }
      if (skinDef.skeleton !== undefined) {
        skin.setSkeleton(context.nodes[skinDef.skeleton]);
      }
      for (const nodeIndex of skinDef.joints) {
        skin.addJoint(context.nodes[nodeIndex]);
      }
      return skin;
    });
    /** Node attachments. */
    nodeDefs.map((nodeDef, nodeIndex) => {
      const node = context.nodes[nodeIndex];
      const children = nodeDef.children || [];
      children.forEach(childIndex => node.addChild(context.nodes[childIndex]));
      if (nodeDef.mesh !== undefined) node.setMesh(context.meshes[nodeDef.mesh]);
      if (nodeDef.camera !== undefined) node.setCamera(context.cameras[nodeDef.camera]);
      if (nodeDef.skin !== undefined) node.setSkin(context.skins[nodeDef.skin]);
    });
    /** Animations. */
    const animationDefs = json.animations || [];
    context.animations = animationDefs.map(animationDef => {
      const animation = document.createAnimation(animationDef.name);
      if (animationDef.extras) animation.setExtras(animationDef.extras);
      const samplerDefs = animationDef.samplers || [];
      const samplers = samplerDefs.map(samplerDef => {
        const sampler = document.createAnimationSampler().setInput(context.accessors[samplerDef.input]).setOutput(context.accessors[samplerDef.output]).setInterpolation(samplerDef.interpolation || AnimationSampler.Interpolation.LINEAR);
        if (samplerDef.extras) sampler.setExtras(samplerDef.extras);
        animation.addSampler(sampler);
        return sampler;
      });
      const channels = animationDef.channels || [];
      channels.forEach(channelDef => {
        const channel = document.createAnimationChannel().setSampler(samplers[channelDef.sampler]).setTargetPath(channelDef.target.path);
        if (channelDef.target.node !== undefined) channel.setTargetNode(context.nodes[channelDef.target.node]);
        if (channelDef.extras) channel.setExtras(channelDef.extras);
        animation.addChannel(channel);
      });
      return animation;
    });
    /** Scenes. */
    const sceneDefs = json.scenes || [];
    document.getRoot().listExtensionsUsed().filter(extension => extension.prereadTypes.includes(PropertyType.SCENE)).forEach(extension => extension.preread(context, PropertyType.SCENE));
    context.scenes = sceneDefs.map(sceneDef => {
      const scene = document.createScene(sceneDef.name);
      if (sceneDef.extras) scene.setExtras(sceneDef.extras);
      const children = sceneDef.nodes || [];
      children.map(nodeIndex => context.nodes[nodeIndex]).forEach(node => scene.addChild(node));
      return scene;
    });
    if (json.scene !== undefined) {
      document.getRoot().setDefaultScene(context.scenes[json.scene]);
    }
    /** Extensions (2/2). */
    document.getRoot().listExtensionsUsed().forEach(extension => extension.read(context));
    /** Post-processing. */
    // Consider an accessor to be 'sparse' if it (A) includes sparse value overrides,
    // or (B) does not define .bufferView _and_ no extension provides that data. Case
    // (B) represents a zero-filled accessor.
    accessorDefs.forEach((accessorDef, index) => {
      const accessor = context.accessors[index];
      const hasSparseValues = !!accessorDef.sparse;
      const isZeroFilled = !accessorDef.bufferView && !accessor.getArray();
      if (hasSparseValues || isZeroFilled) {
        accessor.setSparse(true).setArray(getSparseArray(accessorDef, context));
      }
    });
    return document;
  }
  static validate(jsonDoc, options) {
    const json = jsonDoc.json;
    if (json.asset.version !== '2.0') {
      throw new Error(`Unsupported glTF version, "${json.asset.version}".`);
    }
    if (json.extensionsRequired) {
      for (const extensionName of json.extensionsRequired) {
        if (!options.extensions.find(extension => extension.EXTENSION_NAME === extensionName)) {
          throw new Error(`Missing required extension, "${extensionName}".`);
        }
      }
    }
    if (json.extensionsUsed) {
      for (const extensionName of json.extensionsUsed) {
        if (!options.extensions.find(extension => extension.EXTENSION_NAME === extensionName)) {
          options.logger.warn(`Missing optional extension, "${extensionName}".`);
        }
      }
    }
  }
}
/**
 * Returns the contents of an interleaved accessor, as a typed array.
 * @internal
 */
function getInterleavedArray(accessorDef, context) {
  const jsonDoc = context.jsonDoc;
  const bufferView = context.bufferViews[accessorDef.bufferView];
  const bufferViewDef = jsonDoc.json.bufferViews[accessorDef.bufferView];
  const TypedArray = ComponentTypeToTypedArray[accessorDef.componentType];
  const elementSize = Accessor.getElementSize(accessorDef.type);
  const componentSize = TypedArray.BYTES_PER_ELEMENT;
  const accessorByteOffset = accessorDef.byteOffset || 0;
  const array = new TypedArray(accessorDef.count * elementSize);
  const view = new DataView(bufferView.buffer, bufferView.byteOffset, bufferView.byteLength);
  const byteStride = bufferViewDef.byteStride;
  for (let i = 0; i < accessorDef.count; i++) {
    for (let j = 0; j < elementSize; j++) {
      const byteOffset = accessorByteOffset + i * byteStride + j * componentSize;
      let value;
      switch (accessorDef.componentType) {
        case Accessor.ComponentType.FLOAT:
          value = view.getFloat32(byteOffset, true);
          break;
        case Accessor.ComponentType.UNSIGNED_INT:
          value = view.getUint32(byteOffset, true);
          break;
        case Accessor.ComponentType.UNSIGNED_SHORT:
          value = view.getUint16(byteOffset, true);
          break;
        case Accessor.ComponentType.UNSIGNED_BYTE:
          value = view.getUint8(byteOffset);
          break;
        case Accessor.ComponentType.SHORT:
          value = view.getInt16(byteOffset, true);
          break;
        case Accessor.ComponentType.BYTE:
          value = view.getInt8(byteOffset);
          break;
        default:
          throw new Error(`Unexpected componentType "${accessorDef.componentType}".`);
      }
      array[i * elementSize + j] = value;
    }
  }
  return array;
}
/**
 * Returns the contents of an accessor, as a typed array.
 * @internal
 */
function getAccessorArray(accessorDef, context) {
  const jsonDoc = context.jsonDoc;
  const bufferView = context.bufferViews[accessorDef.bufferView];
  const bufferViewDef = jsonDoc.json.bufferViews[accessorDef.bufferView];
  const TypedArray = ComponentTypeToTypedArray[accessorDef.componentType];
  const elementSize = Accessor.getElementSize(accessorDef.type);
  const componentSize = TypedArray.BYTES_PER_ELEMENT;
  const elementStride = elementSize * componentSize;
  // Interleaved buffer view.
  if (bufferViewDef.byteStride !== undefined && bufferViewDef.byteStride !== elementStride) {
    return getInterleavedArray(accessorDef, context);
  }
  const byteOffset = bufferView.byteOffset + (accessorDef.byteOffset || 0);
  const byteLength = accessorDef.count * elementSize * componentSize;
  // Might optimize this to avoid deep copy later, but it's useful for now and not a known
  // bottleneck. See https://github.com/donmccurdy/glTF-Transform/issues/256.
  return new TypedArray(bufferView.buffer.slice(byteOffset, byteOffset + byteLength));
}
/**
 * Returns the contents of a sparse accessor, as a typed array.
 * @internal
 */
function getSparseArray(accessorDef, context) {
  const TypedArray = ComponentTypeToTypedArray[accessorDef.componentType];
  const elementSize = Accessor.getElementSize(accessorDef.type);
  let array;
  if (accessorDef.bufferView !== undefined) {
    array = getAccessorArray(accessorDef, context);
  } else {
    array = new TypedArray(accessorDef.count * elementSize);
  }
  const sparseDef = accessorDef.sparse;
  if (!sparseDef) return array; // Zero-filled accessor.
  const count = sparseDef.count;
  const indicesDef = _extends$2({}, accessorDef, sparseDef.indices, {
    count,
    type: 'SCALAR'
  });
  const valuesDef = _extends$2({}, accessorDef, sparseDef.values, {
    count
  });
  const indices = getAccessorArray(indicesDef, context);
  const values = getAccessorArray(valuesDef, context);
  // Override indices given in the sparse data.
  for (let i = 0; i < indicesDef.count; i++) {
    for (let j = 0; j < elementSize; j++) {
      array[indices[i] * elementSize + j] = values[i * elementSize + j];
    }
  }
  return array;
}

var BufferViewTarget;
(function (BufferViewTarget) {
  BufferViewTarget[BufferViewTarget["ARRAY_BUFFER"] = 34962] = "ARRAY_BUFFER";
  BufferViewTarget[BufferViewTarget["ELEMENT_ARRAY_BUFFER"] = 34963] = "ELEMENT_ARRAY_BUFFER";
})(BufferViewTarget || (BufferViewTarget = {}));
/**
 * Model class providing writing state to a {@link GLTFWriter} and its {@link Extension}
 * implementations.
 *
 * @hidden
 */
class WriterContext {
  constructor(_doc, jsonDoc, options) {
    this._doc = void 0;
    this.jsonDoc = void 0;
    this.options = void 0;
    this.accessorIndexMap = new Map();
    this.animationIndexMap = new Map();
    this.bufferIndexMap = new Map();
    this.cameraIndexMap = new Map();
    this.skinIndexMap = new Map();
    this.materialIndexMap = new Map();
    this.meshIndexMap = new Map();
    this.nodeIndexMap = new Map();
    this.imageIndexMap = new Map();
    this.textureDefIndexMap = new Map();
    // textureDef JSON -> index
    this.textureInfoDefMap = new Map();
    this.samplerDefIndexMap = new Map();
    // samplerDef JSON -> index
    this.sceneIndexMap = new Map();
    this.imageBufferViews = [];
    this.otherBufferViews = new Map();
    this.otherBufferViewsIndexMap = new Map();
    this.extensionData = {};
    this.bufferURIGenerator = void 0;
    this.imageURIGenerator = void 0;
    this.logger = void 0;
    this._accessorUsageMap = new Map();
    this.accessorUsageGroupedByParent = new Set(['ARRAY_BUFFER']);
    this.accessorParents = new Map();
    this._doc = _doc;
    this.jsonDoc = jsonDoc;
    this.options = options;
    const root = _doc.getRoot();
    const numBuffers = root.listBuffers().length;
    const numImages = root.listTextures().length;
    this.bufferURIGenerator = new UniqueURIGenerator(numBuffers > 1, () => options.basename || 'buffer');
    this.imageURIGenerator = new UniqueURIGenerator(numImages > 1, texture => getSlot(_doc, texture) || options.basename || 'texture');
    this.logger = _doc.getLogger();
  }
  /**
   * Creates a TextureInfo definition, and any Texture or Sampler definitions it requires. If
   * possible, Texture and Sampler definitions are shared.
   */
  createTextureInfoDef(texture, textureInfo) {
    const samplerDef = {
      magFilter: textureInfo.getMagFilter() || undefined,
      minFilter: textureInfo.getMinFilter() || undefined,
      wrapS: textureInfo.getWrapS(),
      wrapT: textureInfo.getWrapT()
    };
    const samplerKey = JSON.stringify(samplerDef);
    if (!this.samplerDefIndexMap.has(samplerKey)) {
      this.samplerDefIndexMap.set(samplerKey, this.jsonDoc.json.samplers.length);
      this.jsonDoc.json.samplers.push(samplerDef);
    }
    const textureDef = {
      source: this.imageIndexMap.get(texture),
      sampler: this.samplerDefIndexMap.get(samplerKey)
    };
    const textureKey = JSON.stringify(textureDef);
    if (!this.textureDefIndexMap.has(textureKey)) {
      this.textureDefIndexMap.set(textureKey, this.jsonDoc.json.textures.length);
      this.jsonDoc.json.textures.push(textureDef);
    }
    const textureInfoDef = {
      index: this.textureDefIndexMap.get(textureKey)
    };
    if (textureInfo.getTexCoord() !== 0) {
      textureInfoDef.texCoord = textureInfo.getTexCoord();
    }
    if (Object.keys(textureInfo.getExtras()).length > 0) {
      textureInfoDef.extras = textureInfo.getExtras();
    }
    this.textureInfoDefMap.set(textureInfo, textureInfoDef);
    return textureInfoDef;
  }
  createPropertyDef(property) {
    const def = {};
    if (property.getName()) {
      def.name = property.getName();
    }
    if (Object.keys(property.getExtras()).length > 0) {
      def.extras = property.getExtras();
    }
    return def;
  }
  createAccessorDef(accessor) {
    const accessorDef = this.createPropertyDef(accessor);
    accessorDef.type = accessor.getType();
    accessorDef.componentType = accessor.getComponentType();
    accessorDef.count = accessor.getCount();
    const needsBounds = this._doc.getGraph().listParentEdges(accessor).some(edge => edge.getName() === 'attributes' && edge.getAttributes().key === 'POSITION' || edge.getName() === 'input');
    if (needsBounds) {
      accessorDef.max = accessor.getMax([]).map(Math.fround);
      accessorDef.min = accessor.getMin([]).map(Math.fround);
    }
    if (accessor.getNormalized()) {
      accessorDef.normalized = accessor.getNormalized();
    }
    return accessorDef;
  }
  createImageData(imageDef, data, texture) {
    if (this.options.format === Format.GLB) {
      this.imageBufferViews.push(data);
      imageDef.bufferView = this.jsonDoc.json.bufferViews.length;
      this.jsonDoc.json.bufferViews.push({
        buffer: 0,
        byteOffset: -1,
        // determined while iterating buffers, in Writer.ts.
        byteLength: data.byteLength
      });
    } else {
      const extension = ImageUtils.mimeTypeToExtension(texture.getMimeType());
      imageDef.uri = this.imageURIGenerator.createURI(texture, extension);
      this.jsonDoc.resources[imageDef.uri] = data;
    }
  }
  /**
   * Returns implicit usage type of the given accessor, related to grouping accessors into
   * buffer views. Usage is a superset of buffer view target, including ARRAY_BUFFER and
   * ELEMENT_ARRAY_BUFFER, but also usages that do not match GPU buffer view targets such as
   * IBMs. Additional usages are defined by extensions, like `EXT_mesh_gpu_instancing`.
   */
  getAccessorUsage(accessor) {
    const cachedUsage = this._accessorUsageMap.get(accessor);
    if (cachedUsage) return cachedUsage;
    if (accessor.getSparse()) return BufferViewUsage$1.SPARSE;
    for (const edge of this._doc.getGraph().listParentEdges(accessor)) {
      const {
        usage
      } = edge.getAttributes();
      if (usage) return usage;
      if (edge.getParent().propertyType !== PropertyType.ROOT) {
        this.logger.warn(`Missing attribute ".usage" on edge, "${edge.getName()}".`);
      }
    }
    // Group accessors with no specified usage into a miscellaneous buffer view.
    return BufferViewUsage$1.OTHER;
  }
  /**
   * Sets usage for the given accessor. Some accessor types must be grouped into
   * buffer views with like accessors. This includes the specified buffer view "targets", but
   * also implicit usage like IBMs or instanced mesh attributes. If unspecified, an accessor
   * will be grouped with other accessors of unspecified usage.
   */
  addAccessorToUsageGroup(accessor, usage) {
    const prevUsage = this._accessorUsageMap.get(accessor);
    if (prevUsage && prevUsage !== usage) {
      throw new Error(`Accessor with usage "${prevUsage}" cannot be reused as "${usage}".`);
    }
    this._accessorUsageMap.set(accessor, usage);
    return this;
  }
}
/** Explicit buffer view targets defined by glTF specification. */
WriterContext.BufferViewTarget = BufferViewTarget;
/**
 * Implicit buffer view usage, not required by glTF specification, but nonetheless useful for
 * proper grouping of accessors into buffer views. Additional usages are defined by extensions,
 * like `EXT_mesh_gpu_instancing`.
 */
WriterContext.BufferViewUsage = BufferViewUsage$1;
/** Maps usage type to buffer view target. Usages not mapped have undefined targets. */
WriterContext.USAGE_TO_TARGET = {
  [BufferViewUsage$1.ARRAY_BUFFER]: BufferViewTarget.ARRAY_BUFFER,
  [BufferViewUsage$1.ELEMENT_ARRAY_BUFFER]: BufferViewTarget.ELEMENT_ARRAY_BUFFER
};
class UniqueURIGenerator {
  constructor(multiple, basename) {
    this.multiple = void 0;
    this.basename = void 0;
    this.counter = {};
    this.multiple = multiple;
    this.basename = basename;
  }
  createURI(object, extension) {
    if (object.getURI()) {
      return object.getURI();
    } else if (!this.multiple) {
      return `${this.basename(object)}.${extension}`;
    } else {
      const basename = this.basename(object);
      this.counter[basename] = this.counter[basename] || 1;
      return `${basename}_${this.counter[basename]++}.${extension}`;
    }
  }
}
/** Returns the first slot (by name) to which the texture is assigned. */
function getSlot(document, texture) {
  const edge = document.getGraph().listParentEdges(texture).find(edge => edge.getParent() !== document.getRoot());
  return edge ? edge.getName().replace(/texture$/i, '') : '';
}

const {
  BufferViewUsage
} = WriterContext;
const {
  UNSIGNED_INT,
  UNSIGNED_SHORT,
  UNSIGNED_BYTE
} = Accessor.ComponentType;
const SUPPORTED_PREWRITE_TYPES = new Set([PropertyType.ACCESSOR, PropertyType.BUFFER, PropertyType.MATERIAL, PropertyType.MESH]);
/**
 * @internal
 * @hidden
 */
class GLTFWriter {
  static write(doc, options) {
    const graph = doc.getGraph();
    const root = doc.getRoot();
    const json = {
      asset: _extends$2({
        generator: `glTF-Transform ${VERSION}`
      }, root.getAsset()),
      extras: _extends$2({}, root.getExtras())
    };
    const jsonDoc = {
      json,
      resources: {}
    };
    const context = new WriterContext(doc, jsonDoc, options);
    const logger = options.logger || Logger.DEFAULT_INSTANCE;
    /* Extensions (1/2). */
    // Extensions present on the Document are not written unless they are also registered with
    // the I/O class. This ensures that setup in `extension.register()` is completed, and
    // allows a Document to be written with specific extensions disabled.
    const extensionsRegistered = new Set(options.extensions.map(ext => ext.EXTENSION_NAME));
    const extensionsUsed = doc.getRoot().listExtensionsUsed().filter(ext => extensionsRegistered.has(ext.extensionName)).sort((a, b) => a.extensionName > b.extensionName ? 1 : -1);
    const extensionsRequired = doc.getRoot().listExtensionsRequired().filter(ext => extensionsRegistered.has(ext.extensionName)).sort((a, b) => a.extensionName > b.extensionName ? 1 : -1);
    if (extensionsUsed.length < doc.getRoot().listExtensionsUsed().length) {
      logger.warn('Some extensions were not registered for I/O, and will not be written.');
    }
    for (const extension of extensionsUsed) {
      // Warn on unsupported prewrite hooks.
      const unsupportedHooks = extension.prewriteTypes.filter(type => !SUPPORTED_PREWRITE_TYPES.has(type));
      if (unsupportedHooks.length) {
        logger.warn(`Prewrite hooks for some types (${unsupportedHooks.join()}), requested by extension ` + `${extension.extensionName}, are unsupported. Please file an issue or a PR.`);
      }
      // Install dependencies.
      for (const key of extension.writeDependencies) {
        extension.install(key, options.dependencies[key]);
      }
    }
    /**
     * Pack a group of accessors into a sequential buffer view. Appends accessor and buffer view
     * definitions to the root JSON lists.
     *
     * @param accessors Accessors to be included.
     * @param bufferIndex Buffer to write to.
     * @param bufferByteOffset Current offset into the buffer, accounting for other buffer views.
     * @param bufferViewTarget (Optional) target use of the buffer view.
     */
    function concatAccessors(accessors, bufferIndex, bufferByteOffset, bufferViewTarget) {
      const buffers = [];
      let byteLength = 0;
      // Create accessor definitions, determining size of final buffer view.
      for (const accessor of accessors) {
        const accessorDef = context.createAccessorDef(accessor);
        accessorDef.bufferView = json.bufferViews.length;
        const accessorArray = accessor.getArray();
        const data = BufferUtils.pad(BufferUtils.toView(accessorArray));
        accessorDef.byteOffset = byteLength;
        byteLength += data.byteLength;
        buffers.push(data);
        context.accessorIndexMap.set(accessor, json.accessors.length);
        json.accessors.push(accessorDef);
      }
      // Create buffer view definition.
      const bufferViewData = BufferUtils.concat(buffers);
      const bufferViewDef = {
        buffer: bufferIndex,
        byteOffset: bufferByteOffset,
        byteLength: bufferViewData.byteLength
      };
      if (bufferViewTarget) bufferViewDef.target = bufferViewTarget;
      json.bufferViews.push(bufferViewDef);
      return {
        buffers,
        byteLength
      };
    }
    /**
     * Pack a group of accessors into an interleaved buffer view. Appends accessor and buffer
     * view definitions to the root JSON lists. Buffer view target is implicitly attribute data.
     *
     * References:
     * - [Apple • Best Practices for Working with Vertex Data](https://developer.apple.com/library/archive/documentation/3DDrawing/Conceptual/OpenGLES_ProgrammingGuide/TechniquesforWorkingwithVertexData/TechniquesforWorkingwithVertexData.html)
     * - [Khronos • Vertex Specification Best Practices](https://www.khronos.org/opengl/wiki/Vertex_Specification_Best_Practices)
     *
     * @param accessors Accessors to be included.
     * @param bufferIndex Buffer to write to.
     * @param bufferByteOffset Offset into the buffer, accounting for other buffer views.
     */
    function interleaveAccessors(accessors, bufferIndex, bufferByteOffset) {
      const vertexCount = accessors[0].getCount();
      let byteStride = 0;
      // Create accessor definitions, determining size and stride of final buffer view.
      for (const accessor of accessors) {
        const accessorDef = context.createAccessorDef(accessor);
        accessorDef.bufferView = json.bufferViews.length;
        accessorDef.byteOffset = byteStride;
        const elementSize = accessor.getElementSize();
        const componentSize = accessor.getComponentSize();
        byteStride += BufferUtils.padNumber(elementSize * componentSize);
        context.accessorIndexMap.set(accessor, json.accessors.length);
        json.accessors.push(accessorDef);
      }
      // Allocate interleaved buffer view.
      const byteLength = vertexCount * byteStride;
      const buffer = new ArrayBuffer(byteLength);
      const view = new DataView(buffer);
      // Write interleaved accessor data to the buffer view.
      for (let i = 0; i < vertexCount; i++) {
        let vertexByteOffset = 0;
        for (const accessor of accessors) {
          const elementSize = accessor.getElementSize();
          const componentSize = accessor.getComponentSize();
          const componentType = accessor.getComponentType();
          const array = accessor.getArray();
          for (let j = 0; j < elementSize; j++) {
            const viewByteOffset = i * byteStride + vertexByteOffset + j * componentSize;
            const value = array[i * elementSize + j];
            switch (componentType) {
              case Accessor.ComponentType.FLOAT:
                view.setFloat32(viewByteOffset, value, true);
                break;
              case Accessor.ComponentType.BYTE:
                view.setInt8(viewByteOffset, value);
                break;
              case Accessor.ComponentType.SHORT:
                view.setInt16(viewByteOffset, value, true);
                break;
              case Accessor.ComponentType.UNSIGNED_BYTE:
                view.setUint8(viewByteOffset, value);
                break;
              case Accessor.ComponentType.UNSIGNED_SHORT:
                view.setUint16(viewByteOffset, value, true);
                break;
              case Accessor.ComponentType.UNSIGNED_INT:
                view.setUint32(viewByteOffset, value, true);
                break;
              default:
                throw new Error('Unexpected component type: ' + componentType);
            }
          }
          vertexByteOffset += BufferUtils.padNumber(elementSize * componentSize);
        }
      }
      // Create buffer view definition.
      const bufferViewDef = {
        buffer: bufferIndex,
        byteOffset: bufferByteOffset,
        byteLength: byteLength,
        byteStride: byteStride,
        target: WriterContext.BufferViewTarget.ARRAY_BUFFER
      };
      json.bufferViews.push(bufferViewDef);
      return {
        byteLength,
        buffers: [new Uint8Array(buffer)]
      };
    }
    /**
     * Pack a group of sparse accessors. Appends accessor and buffer view
     * definitions to the root JSON lists.
     *
     * @param accessors Accessors to be included.
     * @param bufferIndex Buffer to write to.
     * @param bufferByteOffset Current offset into the buffer, accounting for other buffer views.
     */
    function concatSparseAccessors(accessors, bufferIndex, bufferByteOffset) {
      const buffers = [];
      let byteLength = 0;
      const sparseData = new Map();
      let maxIndex = -Infinity;
      let needSparseWarning = false;
      // (1) Write accessor definitions, gathering indices and values.
      for (const accessor of accessors) {
        const accessorDef = context.createAccessorDef(accessor);
        json.accessors.push(accessorDef);
        context.accessorIndexMap.set(accessor, json.accessors.length - 1);
        const indices = [];
        const values = [];
        const el = [];
        const base = new Array(accessor.getElementSize()).fill(0);
        for (let i = 0, il = accessor.getCount(); i < il; i++) {
          accessor.getElement(i, el);
          if (MathUtils.eq(el, base, 0)) continue;
          maxIndex = Math.max(i, maxIndex);
          indices.push(i);
          for (let j = 0; j < el.length; j++) values.push(el[j]);
        }
        const count = indices.length;
        const data = {
          accessorDef,
          count
        };
        sparseData.set(accessor, data);
        if (count === 0) continue;
        if (count > accessor.getCount() / 2) {
          needSparseWarning = true;
        }
        const ValueArray = ComponentTypeToTypedArray[accessor.getComponentType()];
        data.indices = indices;
        data.values = new ValueArray(values);
      }
      // (2) Early exit if all sparse accessors are just zero-filled arrays.
      if (!Number.isFinite(maxIndex)) {
        return {
          buffers,
          byteLength
        };
      }
      if (needSparseWarning) {
        logger.warn(`Some sparse accessors have >50% non-zero elements, which may increase file size.`);
      }
      // (3) Write index buffer view.
      const IndexArray = maxIndex < 255 ? Uint8Array : maxIndex < 65535 ? Uint16Array : Uint32Array;
      const IndexComponentType = maxIndex < 255 ? UNSIGNED_BYTE : maxIndex < 65535 ? UNSIGNED_SHORT : UNSIGNED_INT;
      const indicesBufferViewDef = {
        buffer: bufferIndex,
        byteOffset: bufferByteOffset + byteLength,
        byteLength: 0
      };
      for (const accessor of accessors) {
        const data = sparseData.get(accessor);
        if (data.count === 0) continue;
        data.indicesByteOffset = indicesBufferViewDef.byteLength;
        const buffer = BufferUtils.pad(BufferUtils.toView(new IndexArray(data.indices)));
        buffers.push(buffer);
        byteLength += buffer.byteLength;
        indicesBufferViewDef.byteLength += buffer.byteLength;
      }
      json.bufferViews.push(indicesBufferViewDef);
      const indicesBufferViewIndex = json.bufferViews.length - 1;
      // (4) Write value buffer view.
      const valuesBufferViewDef = {
        buffer: bufferIndex,
        byteOffset: bufferByteOffset + byteLength,
        byteLength: 0
      };
      for (const accessor of accessors) {
        const data = sparseData.get(accessor);
        if (data.count === 0) continue;
        data.valuesByteOffset = valuesBufferViewDef.byteLength;
        const buffer = BufferUtils.pad(BufferUtils.toView(data.values));
        buffers.push(buffer);
        byteLength += buffer.byteLength;
        valuesBufferViewDef.byteLength += buffer.byteLength;
      }
      json.bufferViews.push(valuesBufferViewDef);
      const valuesBufferViewIndex = json.bufferViews.length - 1;
      // (5) Write accessor sparse entries.
      for (const accessor of accessors) {
        const data = sparseData.get(accessor);
        if (data.count === 0) continue;
        data.accessorDef.sparse = {
          count: data.count,
          indices: {
            bufferView: indicesBufferViewIndex,
            byteOffset: data.indicesByteOffset,
            componentType: IndexComponentType
          },
          values: {
            bufferView: valuesBufferViewIndex,
            byteOffset: data.valuesByteOffset
          }
        };
      }
      return {
        buffers,
        byteLength
      };
    }
    json.accessors = [];
    json.bufferViews = [];
    /* Textures. */
    // glTF Transform's "Texture" properties correspond 1:1 with glTF "Image" properties, and
    // with image files. The glTF file may contain more one texture per image, where images
    // are reused with different sampler properties.
    json.samplers = [];
    json.textures = [];
    json.images = root.listTextures().map((texture, textureIndex) => {
      const imageDef = context.createPropertyDef(texture);
      if (texture.getMimeType()) {
        imageDef.mimeType = texture.getMimeType();
      }
      const image = texture.getImage();
      if (image) {
        context.createImageData(imageDef, image, texture);
      }
      context.imageIndexMap.set(texture, textureIndex);
      return imageDef;
    });
    /* Accessors. */
    extensionsUsed.filter(extension => extension.prewriteTypes.includes(PropertyType.ACCESSOR)).forEach(extension => extension.prewrite(context, PropertyType.ACCESSOR));
    root.listAccessors().forEach(accessor => {
      // Attributes are grouped and interleaved in one buffer view per mesh primitive.
      // Indices for all primitives are grouped into a single buffer view. IBMs are grouped
      // into a single buffer view. Other usage (if specified by extensions) also goes into
      // a dedicated buffer view. Everything else goes into a miscellaneous buffer view.
      // Certain accessor usage should group data into buffer views by the accessor parent.
      // The `accessorParents` map uses the first parent of each accessor for this purpose.
      const groupByParent = context.accessorUsageGroupedByParent;
      const accessorParents = context.accessorParents;
      // Skip if already written by an extension.
      if (context.accessorIndexMap.has(accessor)) return;
      // Assign usage for core accessor usage types (explicit targets and implicit usage).
      const usage = context.getAccessorUsage(accessor);
      context.addAccessorToUsageGroup(accessor, usage);
      // For accessor usage that requires grouping by parent (vertex and instance
      // attributes) organize buffer views accordingly.
      if (groupByParent.has(usage)) {
        const parent = graph.listParents(accessor).find(parent => parent.propertyType !== PropertyType.ROOT);
        accessorParents.set(accessor, parent);
      }
    });
    /* Buffers, buffer views. */
    extensionsUsed.filter(extension => extension.prewriteTypes.includes(PropertyType.BUFFER)).forEach(extension => extension.prewrite(context, PropertyType.BUFFER));
    const hasBinaryResources = root.listAccessors().length > 0 || root.listTextures().length > 0 || context.otherBufferViews.size > 0;
    if (hasBinaryResources && root.listBuffers().length === 0) {
      throw new Error('Buffer required for Document resources, but none was found.');
    }
    json.buffers = [];
    root.listBuffers().forEach((buffer, index) => {
      const bufferDef = context.createPropertyDef(buffer);
      const groupByParent = context.accessorUsageGroupedByParent;
      const accessors = buffer.listParents().filter(property => property instanceof Accessor);
      const uniqueParents = new Set(accessors.map(accessor => context.accessorParents.get(accessor)));
      const parentToIndex = new Map(Array.from(uniqueParents).map((parent, index) => [parent, index]));
      const accessorGroups = {};
      for (const accessor of accessors) {
        var _key;
        // Skip if already written by an extension.
        if (context.accessorIndexMap.has(accessor)) continue;
        const usage = context.getAccessorUsage(accessor);
        let key = usage;
        if (groupByParent.has(usage)) {
          const parent = context.accessorParents.get(accessor);
          key += `:${parentToIndex.get(parent)}`;
        }
        accessorGroups[_key = key] || (accessorGroups[_key] = {
          usage,
          accessors: []
        });
        accessorGroups[key].accessors.push(accessor);
      }
      // Write accessor groups to buffer views.
      const buffers = [];
      const bufferIndex = json.buffers.length;
      let bufferByteLength = 0;
      for (const {
        usage,
        accessors: groupAccessors
      } of Object.values(accessorGroups)) {
        if (usage === BufferViewUsage.ARRAY_BUFFER && options.vertexLayout === VertexLayout.INTERLEAVED) {
          // (1) Interleaved vertex attributes.
          const result = interleaveAccessors(groupAccessors, bufferIndex, bufferByteLength);
          bufferByteLength += result.byteLength;
          buffers.push(...result.buffers);
        } else if (usage === BufferViewUsage.ARRAY_BUFFER) {
          // (2) Non-interleaved vertex attributes.
          for (const accessor of groupAccessors) {
            // We 'interleave' a single accessor because the method pads to
            // 4-byte boundaries, which concatAccessors() does not.
            const result = interleaveAccessors([accessor], bufferIndex, bufferByteLength);
            bufferByteLength += result.byteLength;
            buffers.push(...result.buffers);
          }
        } else if (usage === BufferViewUsage.SPARSE) {
          // (3) Sparse accessors.
          const result = concatSparseAccessors(groupAccessors, bufferIndex, bufferByteLength);
          bufferByteLength += result.byteLength;
          buffers.push(...result.buffers);
        } else if (usage === BufferViewUsage.ELEMENT_ARRAY_BUFFER) {
          // (4) Indices.
          const target = WriterContext.BufferViewTarget.ELEMENT_ARRAY_BUFFER;
          const result = concatAccessors(groupAccessors, bufferIndex, bufferByteLength, target);
          bufferByteLength += result.byteLength;
          buffers.push(...result.buffers);
        } else {
          // (5) Other.
          const result = concatAccessors(groupAccessors, bufferIndex, bufferByteLength);
          bufferByteLength += result.byteLength;
          buffers.push(...result.buffers);
        }
      }
      // We only support embedded images in GLB, where the embedded buffer must be the first.
      // Additional buffers are currently left empty (see EXT_meshopt_compression fallback).
      if (context.imageBufferViews.length && index === 0) {
        for (let i = 0; i < context.imageBufferViews.length; i++) {
          json.bufferViews[json.images[i].bufferView].byteOffset = bufferByteLength;
          bufferByteLength += context.imageBufferViews[i].byteLength;
          buffers.push(context.imageBufferViews[i]);
          if (bufferByteLength % 8) {
            // See: https://github.com/KhronosGroup/glTF/issues/1935
            const imagePadding = 8 - bufferByteLength % 8;
            bufferByteLength += imagePadding;
            buffers.push(new Uint8Array(imagePadding));
          }
        }
      }
      if (context.otherBufferViews.has(buffer)) {
        for (const data of context.otherBufferViews.get(buffer)) {
          json.bufferViews.push({
            buffer: bufferIndex,
            byteOffset: bufferByteLength,
            byteLength: data.byteLength
          });
          context.otherBufferViewsIndexMap.set(data, json.bufferViews.length - 1);
          bufferByteLength += data.byteLength;
          buffers.push(data);
        }
      }
      if (bufferByteLength) {
        // Assign buffer URI.
        let uri;
        if (options.format === Format.GLB) {
          uri = GLB_BUFFER;
        } else {
          uri = context.bufferURIGenerator.createURI(buffer, 'bin');
          bufferDef.uri = uri;
        }
        // Write buffer views to buffer.
        bufferDef.byteLength = bufferByteLength;
        jsonDoc.resources[uri] = BufferUtils.concat(buffers);
      }
      json.buffers.push(bufferDef);
      context.bufferIndexMap.set(buffer, index);
    });
    if (root.listAccessors().find(a => !a.getBuffer())) {
      logger.warn('Skipped writing one or more Accessors: no Buffer assigned.');
    }
    /* Materials. */
    extensionsUsed.filter(extension => extension.prewriteTypes.includes(PropertyType.MATERIAL)).forEach(extension => extension.prewrite(context, PropertyType.MATERIAL));
    json.materials = root.listMaterials().map((material, index) => {
      const materialDef = context.createPropertyDef(material);
      // Program state & blending.
      if (material.getAlphaMode() !== Material.AlphaMode.OPAQUE) {
        materialDef.alphaMode = material.getAlphaMode();
      }
      if (material.getAlphaMode() === Material.AlphaMode.MASK) {
        materialDef.alphaCutoff = material.getAlphaCutoff();
      }
      if (material.getDoubleSided()) materialDef.doubleSided = true;
      // Factors.
      materialDef.pbrMetallicRoughness = {};
      if (!MathUtils.eq(material.getBaseColorFactor(), [1, 1, 1, 1])) {
        materialDef.pbrMetallicRoughness.baseColorFactor = material.getBaseColorFactor();
      }
      if (!MathUtils.eq(material.getEmissiveFactor(), [0, 0, 0])) {
        materialDef.emissiveFactor = material.getEmissiveFactor();
      }
      if (material.getRoughnessFactor() !== 1) {
        materialDef.pbrMetallicRoughness.roughnessFactor = material.getRoughnessFactor();
      }
      if (material.getMetallicFactor() !== 1) {
        materialDef.pbrMetallicRoughness.metallicFactor = material.getMetallicFactor();
      }
      // Textures.
      if (material.getBaseColorTexture()) {
        const texture = material.getBaseColorTexture();
        const textureInfo = material.getBaseColorTextureInfo();
        materialDef.pbrMetallicRoughness.baseColorTexture = context.createTextureInfoDef(texture, textureInfo);
      }
      if (material.getEmissiveTexture()) {
        const texture = material.getEmissiveTexture();
        const textureInfo = material.getEmissiveTextureInfo();
        materialDef.emissiveTexture = context.createTextureInfoDef(texture, textureInfo);
      }
      if (material.getNormalTexture()) {
        const texture = material.getNormalTexture();
        const textureInfo = material.getNormalTextureInfo();
        const textureInfoDef = context.createTextureInfoDef(texture, textureInfo);
        if (material.getNormalScale() !== 1) {
          textureInfoDef.scale = material.getNormalScale();
        }
        materialDef.normalTexture = textureInfoDef;
      }
      if (material.getOcclusionTexture()) {
        const texture = material.getOcclusionTexture();
        const textureInfo = material.getOcclusionTextureInfo();
        const textureInfoDef = context.createTextureInfoDef(texture, textureInfo);
        if (material.getOcclusionStrength() !== 1) {
          textureInfoDef.strength = material.getOcclusionStrength();
        }
        materialDef.occlusionTexture = textureInfoDef;
      }
      if (material.getMetallicRoughnessTexture()) {
        const texture = material.getMetallicRoughnessTexture();
        const textureInfo = material.getMetallicRoughnessTextureInfo();
        materialDef.pbrMetallicRoughness.metallicRoughnessTexture = context.createTextureInfoDef(texture, textureInfo);
      }
      context.materialIndexMap.set(material, index);
      return materialDef;
    });
    /* Meshes. */
    extensionsUsed.filter(extension => extension.prewriteTypes.includes(PropertyType.MESH)).forEach(extension => extension.prewrite(context, PropertyType.MESH));
    json.meshes = root.listMeshes().map((mesh, index) => {
      const meshDef = context.createPropertyDef(mesh);
      let targetNames = null;
      meshDef.primitives = mesh.listPrimitives().map(primitive => {
        const primitiveDef = {
          attributes: {}
        };
        primitiveDef.mode = primitive.getMode();
        const material = primitive.getMaterial();
        if (material) {
          primitiveDef.material = context.materialIndexMap.get(material);
        }
        if (Object.keys(primitive.getExtras()).length) {
          primitiveDef.extras = primitive.getExtras();
        }
        const indices = primitive.getIndices();
        if (indices) {
          primitiveDef.indices = context.accessorIndexMap.get(indices);
        }
        for (const semantic of primitive.listSemantics()) {
          primitiveDef.attributes[semantic] = context.accessorIndexMap.get(primitive.getAttribute(semantic));
        }
        for (const target of primitive.listTargets()) {
          const targetDef = {};
          for (const semantic of target.listSemantics()) {
            targetDef[semantic] = context.accessorIndexMap.get(target.getAttribute(semantic));
          }
          primitiveDef.targets = primitiveDef.targets || [];
          primitiveDef.targets.push(targetDef);
        }
        if (primitive.listTargets().length && !targetNames) {
          targetNames = primitive.listTargets().map(target => target.getName());
        }
        return primitiveDef;
      });
      if (mesh.getWeights().length) {
        meshDef.weights = mesh.getWeights();
      }
      if (targetNames) {
        meshDef.extras = meshDef.extras || {};
        meshDef.extras['targetNames'] = targetNames;
      }
      context.meshIndexMap.set(mesh, index);
      return meshDef;
    });
    /** Cameras. */
    json.cameras = root.listCameras().map((camera, index) => {
      const cameraDef = context.createPropertyDef(camera);
      cameraDef.type = camera.getType();
      if (cameraDef.type === Camera.Type.PERSPECTIVE) {
        cameraDef.perspective = {
          znear: camera.getZNear(),
          zfar: camera.getZFar(),
          yfov: camera.getYFov()
        };
        const aspectRatio = camera.getAspectRatio();
        if (aspectRatio !== null) {
          cameraDef.perspective.aspectRatio = aspectRatio;
        }
      } else {
        cameraDef.orthographic = {
          znear: camera.getZNear(),
          zfar: camera.getZFar(),
          xmag: camera.getXMag(),
          ymag: camera.getYMag()
        };
      }
      context.cameraIndexMap.set(camera, index);
      return cameraDef;
    });
    /* Nodes. */
    json.nodes = root.listNodes().map((node, index) => {
      const nodeDef = context.createPropertyDef(node);
      if (!MathUtils.eq(node.getTranslation(), [0, 0, 0])) {
        nodeDef.translation = node.getTranslation();
      }
      if (!MathUtils.eq(node.getRotation(), [0, 0, 0, 1])) {
        nodeDef.rotation = node.getRotation();
      }
      if (!MathUtils.eq(node.getScale(), [1, 1, 1])) {
        nodeDef.scale = node.getScale();
      }
      if (node.getWeights().length) {
        nodeDef.weights = node.getWeights();
      }
      // Attachments (mesh, camera, skin) defined later in writing process.
      context.nodeIndexMap.set(node, index);
      return nodeDef;
    });
    /** Skins. */
    json.skins = root.listSkins().map((skin, index) => {
      const skinDef = context.createPropertyDef(skin);
      const inverseBindMatrices = skin.getInverseBindMatrices();
      if (inverseBindMatrices) {
        skinDef.inverseBindMatrices = context.accessorIndexMap.get(inverseBindMatrices);
      }
      const skeleton = skin.getSkeleton();
      if (skeleton) {
        skinDef.skeleton = context.nodeIndexMap.get(skeleton);
      }
      skinDef.joints = skin.listJoints().map(joint => context.nodeIndexMap.get(joint));
      context.skinIndexMap.set(skin, index);
      return skinDef;
    });
    /** Node attachments. */
    root.listNodes().forEach((node, index) => {
      const nodeDef = json.nodes[index];
      const mesh = node.getMesh();
      if (mesh) {
        nodeDef.mesh = context.meshIndexMap.get(mesh);
      }
      const camera = node.getCamera();
      if (camera) {
        nodeDef.camera = context.cameraIndexMap.get(camera);
      }
      const skin = node.getSkin();
      if (skin) {
        nodeDef.skin = context.skinIndexMap.get(skin);
      }
      if (node.listChildren().length > 0) {
        nodeDef.children = node.listChildren().map(node => context.nodeIndexMap.get(node));
      }
    });
    /** Animations. */
    json.animations = root.listAnimations().map((animation, index) => {
      const animationDef = context.createPropertyDef(animation);
      const samplerIndexMap = new Map();
      animationDef.samplers = animation.listSamplers().map((sampler, samplerIndex) => {
        const samplerDef = context.createPropertyDef(sampler);
        samplerDef.input = context.accessorIndexMap.get(sampler.getInput());
        samplerDef.output = context.accessorIndexMap.get(sampler.getOutput());
        samplerDef.interpolation = sampler.getInterpolation();
        samplerIndexMap.set(sampler, samplerIndex);
        return samplerDef;
      });
      animationDef.channels = animation.listChannels().map(channel => {
        const channelDef = context.createPropertyDef(channel);
        channelDef.sampler = samplerIndexMap.get(channel.getSampler());
        channelDef.target = {
          node: context.nodeIndexMap.get(channel.getTargetNode()),
          path: channel.getTargetPath()
        };
        return channelDef;
      });
      context.animationIndexMap.set(animation, index);
      return animationDef;
    });
    /* Scenes. */
    json.scenes = root.listScenes().map((scene, index) => {
      const sceneDef = context.createPropertyDef(scene);
      sceneDef.nodes = scene.listChildren().map(node => context.nodeIndexMap.get(node));
      context.sceneIndexMap.set(scene, index);
      return sceneDef;
    });
    const defaultScene = root.getDefaultScene();
    if (defaultScene) {
      json.scene = root.listScenes().indexOf(defaultScene);
    }
    /* Extensions (2/2). */
    json.extensionsUsed = extensionsUsed.map(ext => ext.extensionName);
    json.extensionsRequired = extensionsRequired.map(ext => ext.extensionName);
    extensionsUsed.forEach(extension => extension.write(context));
    //
    clean(json);
    return jsonDoc;
  }
}
/**
 * Removes empty and null values from an object.
 * @param object
 * @internal
 */
function clean(object) {
  const unused = [];
  for (const key in object) {
    const value = object[key];
    if (Array.isArray(value) && value.length === 0) {
      unused.push(key);
    } else if (value === null || value === '') {
      unused.push(key);
    } else if (value && typeof value === 'object' && Object.keys(value).length === 0) {
      unused.push(key);
    }
  }
  for (const key of unused) {
    delete object[key];
  }
}

var ChunkType;
(function (ChunkType) {
  ChunkType[ChunkType["JSON"] = 1313821514] = "JSON";
  ChunkType[ChunkType["BIN"] = 5130562] = "BIN";
})(ChunkType || (ChunkType = {}));
/**
 * *Abstract I/O service.*
 *
 * The most common use of the I/O service is to read/write a {@link Document} with a given path.
 * Methods are also available for converting in-memory representations of raw glTF files, both
 * binary (*Uint8Array*) and JSON ({@link JSONDocument}).
 *
 * For platform-specific implementations, see {@link NodeIO}, {@link WebIO}, and {@link DenoIO}.
 *
 * @category I/O
 */
class PlatformIO {
  constructor() {
    this._logger = Logger.DEFAULT_INSTANCE;
    this._extensions = new Set();
    this._dependencies = {};
    this._vertexLayout = VertexLayout.INTERLEAVED;
    /** @hidden */
    this.lastReadBytes = 0;
    /** @hidden */
    this.lastWriteBytes = 0;
  }
  /** Sets the {@link Logger} used by this I/O instance. Defaults to Logger.DEFAULT_INSTANCE. */
  setLogger(logger) {
    this._logger = logger;
    return this;
  }
  /** Registers extensions, enabling I/O class to read and write glTF assets requiring them. */
  registerExtensions(extensions) {
    for (const extension of extensions) {
      this._extensions.add(extension);
      extension.register();
    }
    return this;
  }
  /** Registers dependencies used (e.g. by extensions) in the I/O process. */
  registerDependencies(dependencies) {
    Object.assign(this._dependencies, dependencies);
    return this;
  }
  /**
   * Sets the vertex layout method used by this I/O instance. Defaults to
   * VertexLayout.INTERLEAVED.
   */
  setVertexLayout(layout) {
    this._vertexLayout = layout;
    return this;
  }
  /**********************************************************************************************
   * Public Read API.
   */
  /** Reads a {@link Document} from the given URI. */
  async read(uri) {
    return await this.readJSON(await this.readAsJSON(uri));
  }
  /** Loads a URI and returns a {@link JSONDocument} struct, without parsing. */
  async readAsJSON(uri) {
    const view = await this.readURI(uri, 'view');
    this.lastReadBytes = view.byteLength;
    const jsonDoc = isGLB(view) ? this._binaryToJSON(view) : {
      json: JSON.parse(BufferUtils.decodeText(view)),
      resources: {}
    };
    // Read external resources first, before Data URIs are replaced.
    await this._readResourcesExternal(jsonDoc, this.dirname(uri));
    this._readResourcesInternal(jsonDoc);
    return jsonDoc;
  }
  /** Converts glTF-formatted JSON and a resource map to a {@link Document}. */
  async readJSON(jsonDoc) {
    jsonDoc = this._copyJSON(jsonDoc);
    this._readResourcesInternal(jsonDoc);
    return GLTFReader.read(jsonDoc, {
      extensions: Array.from(this._extensions),
      dependencies: this._dependencies,
      logger: this._logger
    });
  }
  /** Converts a GLB-formatted Uint8Array to a {@link JSONDocument}. */
  async binaryToJSON(glb) {
    const jsonDoc = this._binaryToJSON(BufferUtils.assertView(glb));
    this._readResourcesInternal(jsonDoc);
    const json = jsonDoc.json;
    // Check for external references, which can't be resolved by this method.
    if (json.buffers && json.buffers.some(bufferDef => isExternalBuffer(jsonDoc, bufferDef))) {
      throw new Error('Cannot resolve external buffers with binaryToJSON().');
    } else if (json.images && json.images.some(imageDef => isExternalImage(jsonDoc, imageDef))) {
      throw new Error('Cannot resolve external images with binaryToJSON().');
    }
    return jsonDoc;
  }
  /** Converts a GLB-formatted Uint8Array to a {@link Document}. */
  async readBinary(glb) {
    return this.readJSON(await this.binaryToJSON(BufferUtils.assertView(glb)));
  }
  /**********************************************************************************************
   * Public Write API.
   */
  /** Converts a {@link Document} to glTF-formatted JSON and a resource map. */
  async writeJSON(doc, _options = {}) {
    if (_options.format === Format.GLB && doc.getRoot().listBuffers().length > 1) {
      throw new Error('GLB must have 0–1 buffers.');
    }
    return GLTFWriter.write(doc, {
      format: _options.format || Format.GLTF,
      basename: _options.basename || '',
      logger: this._logger,
      vertexLayout: this._vertexLayout,
      dependencies: _extends$2({}, this._dependencies),
      extensions: Array.from(this._extensions)
    });
  }
  /** Converts a {@link Document} to a GLB-formatted Uint8Array. */
  async writeBinary(doc) {
    const {
      json,
      resources
    } = await this.writeJSON(doc, {
      format: Format.GLB
    });
    const header = new Uint32Array([0x46546c67, 2, 12]);
    const jsonText = JSON.stringify(json);
    const jsonChunkData = BufferUtils.pad(BufferUtils.encodeText(jsonText), 0x20);
    const jsonChunkHeader = BufferUtils.toView(new Uint32Array([jsonChunkData.byteLength, 0x4e4f534a]));
    const jsonChunk = BufferUtils.concat([jsonChunkHeader, jsonChunkData]);
    header[header.length - 1] += jsonChunk.byteLength;
    const binBuffer = Object.values(resources)[0];
    if (!binBuffer || !binBuffer.byteLength) {
      return BufferUtils.concat([BufferUtils.toView(header), jsonChunk]);
    }
    const binChunkData = BufferUtils.pad(binBuffer, 0x00);
    const binChunkHeader = BufferUtils.toView(new Uint32Array([binChunkData.byteLength, 0x004e4942]));
    const binChunk = BufferUtils.concat([binChunkHeader, binChunkData]);
    header[header.length - 1] += binChunk.byteLength;
    return BufferUtils.concat([BufferUtils.toView(header), jsonChunk, binChunk]);
  }
  /**********************************************************************************************
   * Internal.
   */
  async _readResourcesExternal(jsonDoc, base) {
    var _this = this;
    const images = jsonDoc.json.images || [];
    const buffers = jsonDoc.json.buffers || [];
    const pendingResources = [...images, ...buffers].map(async function (resource) {
      const uri = resource.uri;
      if (!uri || uri.match(/data:/)) return Promise.resolve();
      jsonDoc.resources[uri] = await _this.readURI(_this.resolve(base, uri), 'view');
      _this.lastReadBytes += jsonDoc.resources[uri].byteLength;
    });
    await Promise.all(pendingResources);
  }
  _readResourcesInternal(jsonDoc) {
    // NOTICE: This method may be called more than once during the loading
    // process (e.g. WebIO.read) and should handle that safely.
    function resolveResource(resource) {
      if (!resource.uri) return;
      if (resource.uri in jsonDoc.resources) {
        BufferUtils.assertView(jsonDoc.resources[resource.uri]);
        return;
      }
      if (resource.uri.match(/data:/)) {
        // Rewrite Data URIs to something short and unique.
        const resourceUUID = `__${uuid()}.${FileUtils.extension(resource.uri)}`;
        jsonDoc.resources[resourceUUID] = BufferUtils.createBufferFromDataURI(resource.uri);
        resource.uri = resourceUUID;
      }
    }
    // Unpack images.
    const images = jsonDoc.json.images || [];
    images.forEach(image => {
      if (image.bufferView === undefined && image.uri === undefined) {
        throw new Error('Missing resource URI or buffer view.');
      }
      resolveResource(image);
    });
    // Unpack buffers.
    const buffers = jsonDoc.json.buffers || [];
    buffers.forEach(resolveResource);
  }
  /**
   * Creates a shallow copy of glTF-formatted {@link JSONDocument}.
   *
   * Images, Buffers, and Resources objects are deep copies so that PlatformIO can safely
   * modify them during the parsing process. Other properties are shallow copies, and buffers
   * are passed by reference.
   */
  _copyJSON(jsonDoc) {
    const {
      images,
      buffers
    } = jsonDoc.json;
    jsonDoc = {
      json: _extends$2({}, jsonDoc.json),
      resources: _extends$2({}, jsonDoc.resources)
    };
    if (images) {
      jsonDoc.json.images = images.map(image => _extends$2({}, image));
    }
    if (buffers) {
      jsonDoc.json.buffers = buffers.map(buffer => _extends$2({}, buffer));
    }
    return jsonDoc;
  }
  /** Internal version of binaryToJSON; does not warn about external resources. */
  _binaryToJSON(glb) {
    // Decode and verify GLB header.
    if (!isGLB(glb)) {
      throw new Error('Invalid glTF 2.0 binary.');
    }
    // Decode JSON chunk.
    const jsonChunkHeader = new Uint32Array(glb.buffer, glb.byteOffset + 12, 2);
    if (jsonChunkHeader[1] !== ChunkType.JSON) {
      throw new Error('Missing required GLB JSON chunk.');
    }
    const jsonByteOffset = 20;
    const jsonByteLength = jsonChunkHeader[0];
    const jsonText = BufferUtils.decodeText(BufferUtils.toView(glb, jsonByteOffset, jsonByteLength));
    const json = JSON.parse(jsonText);
    // Decode BIN chunk.
    const binByteOffset = jsonByteOffset + jsonByteLength;
    if (glb.byteLength <= binByteOffset) {
      return {
        json,
        resources: {}
      };
    }
    const binChunkHeader = new Uint32Array(glb.buffer, glb.byteOffset + binByteOffset, 2);
    if (binChunkHeader[1] !== ChunkType.BIN) {
      // Allow GLB files without BIN chunk, but with unknown chunk
      // Spec: https://registry.khronos.org/glTF/specs/2.0/glTF-2.0.html#chunks-overview
      return {
        json,
        resources: {}
      };
    }
    const binByteLength = binChunkHeader[0];
    const binBuffer = BufferUtils.toView(glb, binByteOffset + 8, binByteLength);
    return {
      json,
      resources: {
        [GLB_BUFFER]: binBuffer
      }
    };
  }
}
function isExternalBuffer(jsonDocument, bufferDef) {
  return bufferDef.uri !== undefined && !(bufferDef.uri in jsonDocument.resources);
}
function isExternalImage(jsonDocument, imageDef) {
  return imageDef.uri !== undefined && !(imageDef.uri in jsonDocument.resources) && imageDef.bufferView === undefined;
}
function isGLB(view) {
  if (view.byteLength < 3 * Uint32Array.BYTES_PER_ELEMENT) return false;
  const header = new Uint32Array(view.buffer, view.byteOffset, 3);
  return header[0] === 0x46546c67 && header[1] === 2;
}

/**
 * *I/O service for Web.*
 *
 * The most common use of the I/O service is to read/write a {@link Document} with a given path.
 * Methods are also available for converting in-memory representations of raw glTF files, both
 * binary (*Uint8Array*) and JSON ({@link JSONDocument}).
 *
 * Usage:
 *
 * ```typescript
 * import { WebIO } from '@gltf-transform/core';
 *
 * const io = new WebIO({credentials: 'include'});
 *
 * // Read.
 * let document;
 * document = await io.read('model.glb');  // → Document
 * document = await io.readBinary(glb);    // Uint8Array → Document
 *
 * // Write.
 * const glb = await io.writeBinary(document); // Document → Uint8Array
 * ```
 *
 * @category I/O
 */
class WebIO extends PlatformIO {
  /**
   * Constructs a new WebIO service. Instances are reusable.
   * @param fetchConfig Configuration object for Fetch API.
   */
  constructor(fetchConfig = HTTPUtils.DEFAULT_INIT) {
    super();
    this._fetchConfig = void 0;
    this._fetchConfig = fetchConfig;
  }
  async readURI(uri, type) {
    const response = await fetch(uri, this._fetchConfig);
    switch (type) {
      case 'view':
        return new Uint8Array(await response.arrayBuffer());
      case 'text':
        return response.text();
    }
  }
  resolve(base, path) {
    return HTTPUtils.resolve(base, path);
  }
  dirname(uri) {
    return HTTPUtils.dirname(uri);
  }
}

function getDefaultExportFromCjs (x) {
	return x && x.__esModule && Object.prototype.hasOwnProperty.call(x, 'default') ? x['default'] : x;
}

function iota$1(n) {
  var result = new Array(n);
  for(var i=0; i<n; ++i) {
    result[i] = i;
  }
  return result
}

var iota_1 = iota$1;

/*!
 * Determine if an object is a Buffer
 *
 * @author   Feross Aboukhadijeh <https://feross.org>
 * @license  MIT
 */

// The _isBuffer check is for Safari 5-7 support, because it's missing
// Object.prototype.constructor. Remove this eventually
var isBuffer_1 = function (obj) {
  return obj != null && (isBuffer$1(obj) || isSlowBuffer(obj) || !!obj._isBuffer)
};

function isBuffer$1 (obj) {
  return !!obj.constructor && typeof obj.constructor.isBuffer === 'function' && obj.constructor.isBuffer(obj)
}

// For Node v0.10 support. Remove this eventually.
function isSlowBuffer (obj) {
  return typeof obj.readFloatLE === 'function' && typeof obj.slice === 'function' && isBuffer$1(obj.slice(0, 0))
}

var iota = iota_1;
var isBuffer = isBuffer_1;

var hasTypedArrays  = ((typeof Float64Array) !== "undefined");

function compare1st(a, b) {
  return a[0] - b[0]
}

function order() {
  var stride = this.stride;
  var terms = new Array(stride.length);
  var i;
  for(i=0; i<terms.length; ++i) {
    terms[i] = [Math.abs(stride[i]), i];
  }
  terms.sort(compare1st);
  var result = new Array(terms.length);
  for(i=0; i<result.length; ++i) {
    result[i] = terms[i][1];
  }
  return result
}

function compileConstructor(dtype, dimension) {
  var className = ["View", dimension, "d", dtype].join("");
  if(dimension < 0) {
    className = "View_Nil" + dtype;
  }
  var useGetters = (dtype === "generic");

  if(dimension === -1) {
    //Special case for trivial arrays
    var code =
      "function "+className+"(a){this.data=a;};\
var proto="+className+".prototype;\
proto.dtype='"+dtype+"';\
proto.index=function(){return -1};\
proto.size=0;\
proto.dimension=-1;\
proto.shape=proto.stride=proto.order=[];\
proto.lo=proto.hi=proto.transpose=proto.step=\
function(){return new "+className+"(this.data);};\
proto.get=proto.set=function(){};\
proto.pick=function(){return null};\
return function construct_"+className+"(a){return new "+className+"(a);}";
    var procedure = new Function(code);
    return procedure()
  } else if(dimension === 0) {
    //Special case for 0d arrays
    var code =
      "function "+className+"(a,d) {\
this.data = a;\
this.offset = d\
};\
var proto="+className+".prototype;\
proto.dtype='"+dtype+"';\
proto.index=function(){return this.offset};\
proto.dimension=0;\
proto.size=1;\
proto.shape=\
proto.stride=\
proto.order=[];\
proto.lo=\
proto.hi=\
proto.transpose=\
proto.step=function "+className+"_copy() {\
return new "+className+"(this.data,this.offset)\
};\
proto.pick=function "+className+"_pick(){\
return TrivialArray(this.data);\
};\
proto.valueOf=proto.get=function "+className+"_get(){\
return "+(useGetters ? "this.data.get(this.offset)" : "this.data[this.offset]")+
"};\
proto.set=function "+className+"_set(v){\
return "+(useGetters ? "this.data.set(this.offset,v)" : "this.data[this.offset]=v")+"\
};\
return function construct_"+className+"(a,b,c,d){return new "+className+"(a,d)}";
    var procedure = new Function("TrivialArray", code);
    return procedure(CACHED_CONSTRUCTORS[dtype][0])
  }

  var code = ["'use strict'"];

  //Create constructor for view
  var indices = iota(dimension);
  var args = indices.map(function(i) { return "i"+i });
  var index_str = "this.offset+" + indices.map(function(i) {
        return "this.stride[" + i + "]*i" + i
      }).join("+");
  var shapeArg = indices.map(function(i) {
      return "b"+i
    }).join(",");
  var strideArg = indices.map(function(i) {
      return "c"+i
    }).join(",");
  code.push(
    "function "+className+"(a," + shapeArg + "," + strideArg + ",d){this.data=a",
      "this.shape=[" + shapeArg + "]",
      "this.stride=[" + strideArg + "]",
      "this.offset=d|0}",
    "var proto="+className+".prototype",
    "proto.dtype='"+dtype+"'",
    "proto.dimension="+dimension);

  //view.size:
  code.push("Object.defineProperty(proto,'size',{get:function "+className+"_size(){\
return "+indices.map(function(i) { return "this.shape["+i+"]" }).join("*"),
"}})");

  //view.order:
  if(dimension === 1) {
    code.push("proto.order=[0]");
  } else {
    code.push("Object.defineProperty(proto,'order',{get:");
    if(dimension < 4) {
      code.push("function "+className+"_order(){");
      if(dimension === 2) {
        code.push("return (Math.abs(this.stride[0])>Math.abs(this.stride[1]))?[1,0]:[0,1]}})");
      } else if(dimension === 3) {
        code.push(
"var s0=Math.abs(this.stride[0]),s1=Math.abs(this.stride[1]),s2=Math.abs(this.stride[2]);\
if(s0>s1){\
if(s1>s2){\
return [2,1,0];\
}else if(s0>s2){\
return [1,2,0];\
}else{\
return [1,0,2];\
}\
}else if(s0>s2){\
return [2,0,1];\
}else if(s2>s1){\
return [0,1,2];\
}else{\
return [0,2,1];\
}}})");
      }
    } else {
      code.push("ORDER})");
    }
  }

  //view.set(i0, ..., v):
  code.push(
"proto.set=function "+className+"_set("+args.join(",")+",v){");
  if(useGetters) {
    code.push("return this.data.set("+index_str+",v)}");
  } else {
    code.push("return this.data["+index_str+"]=v}");
  }

  //view.get(i0, ...):
  code.push("proto.get=function "+className+"_get("+args.join(",")+"){");
  if(useGetters) {
    code.push("return this.data.get("+index_str+")}");
  } else {
    code.push("return this.data["+index_str+"]}");
  }

  //view.index:
  code.push(
    "proto.index=function "+className+"_index(", args.join(), "){return "+index_str+"}");

  //view.hi():
  code.push("proto.hi=function "+className+"_hi("+args.join(",")+"){return new "+className+"(this.data,"+
    indices.map(function(i) {
      return ["(typeof i",i,"!=='number'||i",i,"<0)?this.shape[", i, "]:i", i,"|0"].join("")
    }).join(",")+","+
    indices.map(function(i) {
      return "this.stride["+i + "]"
    }).join(",")+",this.offset)}");

  //view.lo():
  var a_vars = indices.map(function(i) { return "a"+i+"=this.shape["+i+"]" });
  var c_vars = indices.map(function(i) { return "c"+i+"=this.stride["+i+"]" });
  code.push("proto.lo=function "+className+"_lo("+args.join(",")+"){var b=this.offset,d=0,"+a_vars.join(",")+","+c_vars.join(","));
  for(var i=0; i<dimension; ++i) {
    code.push(
"if(typeof i"+i+"==='number'&&i"+i+">=0){\
d=i"+i+"|0;\
b+=c"+i+"*d;\
a"+i+"-=d}");
  }
  code.push("return new "+className+"(this.data,"+
    indices.map(function(i) {
      return "a"+i
    }).join(",")+","+
    indices.map(function(i) {
      return "c"+i
    }).join(",")+",b)}");

  //view.step():
  code.push("proto.step=function "+className+"_step("+args.join(",")+"){var "+
    indices.map(function(i) {
      return "a"+i+"=this.shape["+i+"]"
    }).join(",")+","+
    indices.map(function(i) {
      return "b"+i+"=this.stride["+i+"]"
    }).join(",")+",c=this.offset,d=0,ceil=Math.ceil");
  for(var i=0; i<dimension; ++i) {
    code.push(
"if(typeof i"+i+"==='number'){\
d=i"+i+"|0;\
if(d<0){\
c+=b"+i+"*(a"+i+"-1);\
a"+i+"=ceil(-a"+i+"/d)\
}else{\
a"+i+"=ceil(a"+i+"/d)\
}\
b"+i+"*=d\
}");
  }
  code.push("return new "+className+"(this.data,"+
    indices.map(function(i) {
      return "a" + i
    }).join(",")+","+
    indices.map(function(i) {
      return "b" + i
    }).join(",")+",c)}");

  //view.transpose():
  var tShape = new Array(dimension);
  var tStride = new Array(dimension);
  for(var i=0; i<dimension; ++i) {
    tShape[i] = "a[i"+i+"]";
    tStride[i] = "b[i"+i+"]";
  }
  code.push("proto.transpose=function "+className+"_transpose("+args+"){"+
    args.map(function(n,idx) { return n + "=(" + n + "===undefined?" + idx + ":" + n + "|0)"}).join(";"),
    "var a=this.shape,b=this.stride;return new "+className+"(this.data,"+tShape.join(",")+","+tStride.join(",")+",this.offset)}");

  //view.pick():
  code.push("proto.pick=function "+className+"_pick("+args+"){var a=[],b=[],c=this.offset");
  for(var i=0; i<dimension; ++i) {
    code.push("if(typeof i"+i+"==='number'&&i"+i+">=0){c=(c+this.stride["+i+"]*i"+i+")|0}else{a.push(this.shape["+i+"]);b.push(this.stride["+i+"])}");
  }
  code.push("var ctor=CTOR_LIST[a.length+1];return ctor(this.data,a,b,c)}");

  //Add return statement
  code.push("return function construct_"+className+"(data,shape,stride,offset){return new "+className+"(data,"+
    indices.map(function(i) {
      return "shape["+i+"]"
    }).join(",")+","+
    indices.map(function(i) {
      return "stride["+i+"]"
    }).join(",")+",offset)}");

  //Compile procedure
  var procedure = new Function("CTOR_LIST", "ORDER", code.join("\n"));
  return procedure(CACHED_CONSTRUCTORS[dtype], order)
}

function arrayDType(data) {
  if(isBuffer(data)) {
    return "buffer"
  }
  if(hasTypedArrays) {
    switch(Object.prototype.toString.call(data)) {
      case "[object Float64Array]":
        return "float64"
      case "[object Float32Array]":
        return "float32"
      case "[object Int8Array]":
        return "int8"
      case "[object Int16Array]":
        return "int16"
      case "[object Int32Array]":
        return "int32"
      case "[object Uint8Array]":
        return "uint8"
      case "[object Uint16Array]":
        return "uint16"
      case "[object Uint32Array]":
        return "uint32"
      case "[object Uint8ClampedArray]":
        return "uint8_clamped"
      case "[object BigInt64Array]":
        return "bigint64"
      case "[object BigUint64Array]":
        return "biguint64"
    }
  }
  if(Array.isArray(data)) {
    return "array"
  }
  return "generic"
}

var CACHED_CONSTRUCTORS = {
  "float32":[],
  "float64":[],
  "int8":[],
  "int16":[],
  "int32":[],
  "uint8":[],
  "uint16":[],
  "uint32":[],
  "array":[],
  "uint8_clamped":[],
  "bigint64": [],
  "biguint64": [],
  "buffer":[],
  "generic":[]
}

;
function wrappedNDArrayCtor(data, shape, stride, offset) {
  if(data === undefined) {
    var ctor = CACHED_CONSTRUCTORS.array[0];
    return ctor([])
  } else if(typeof data === "number") {
    data = [data];
  }
  if(shape === undefined) {
    shape = [ data.length ];
  }
  var d = shape.length;
  if(stride === undefined) {
    stride = new Array(d);
    for(var i=d-1, sz=1; i>=0; --i) {
      stride[i] = sz;
      sz *= shape[i];
    }
  }
  if(offset === undefined) {
    offset = 0;
    for(var i=0; i<d; ++i) {
      if(stride[i] < 0) {
        offset -= (shape[i]-1)*stride[i];
      }
    }
  }
  var dtype = arrayDType(data);
  var ctor_list = CACHED_CONSTRUCTORS[dtype];
  while(ctor_list.length <= d+1) {
    ctor_list.push(compileConstructor(dtype, ctor_list.length-1));
  }
  var ctor = ctor_list[d+1];
  return ctor(data, shape, stride, offset)
}

var ndarray = wrappedNDArrayCtor;

var ndarray$1 = /*@__PURE__*/getDefaultExportFromCjs(ndarray);

var ndarrayOps = {};

function unique_pred(list, compare) {
  var ptr = 1
    , len = list.length
    , a=list[0], b=list[0];
  for(var i=1; i<len; ++i) {
    b = a;
    a = list[i];
    if(compare(a, b)) {
      if(i === ptr) {
        ptr++;
        continue
      }
      list[ptr++] = a;
    }
  }
  list.length = ptr;
  return list
}

function unique_eq(list) {
  var ptr = 1
    , len = list.length
    , a=list[0], b = list[0];
  for(var i=1; i<len; ++i, b=a) {
    b = a;
    a = list[i];
    if(a !== b) {
      if(i === ptr) {
        ptr++;
        continue
      }
      list[ptr++] = a;
    }
  }
  list.length = ptr;
  return list
}

function unique(list, compare, sorted) {
  if(list.length === 0) {
    return list
  }
  if(compare) {
    if(!sorted) {
      list.sort(compare);
    }
    return unique_pred(list, compare)
  }
  if(!sorted) {
    list.sort();
  }
  return unique_eq(list)
}

var uniq$1 = unique;

var uniq = uniq$1;

// This function generates very simple loops analogous to how you typically traverse arrays (the outermost loop corresponds to the slowest changing index, the innermost loop to the fastest changing index)
// TODO: If two arrays have the same strides (and offsets) there is potential for decreasing the number of "pointers" and related variables. The drawback is that the type signature would become more specific and that there would thus be less potential for caching, but it might still be worth it, especially when dealing with large numbers of arguments.
function innerFill(order, proc, body) {
  var dimension = order.length
    , nargs = proc.arrayArgs.length
    , has_index = proc.indexArgs.length>0
    , code = []
    , vars = []
    , idx=0, pidx=0, i, j;
  for(i=0; i<dimension; ++i) { // Iteration variables
    vars.push(["i",i,"=0"].join(""));
  }
  //Compute scan deltas
  for(j=0; j<nargs; ++j) {
    for(i=0; i<dimension; ++i) {
      pidx = idx;
      idx = order[i];
      if(i === 0) { // The innermost/fastest dimension's delta is simply its stride
        vars.push(["d",j,"s",i,"=t",j,"p",idx].join(""));
      } else { // For other dimensions the delta is basically the stride minus something which essentially "rewinds" the previous (more inner) dimension
        vars.push(["d",j,"s",i,"=(t",j,"p",idx,"-s",pidx,"*t",j,"p",pidx,")"].join(""));
      }
    }
  }
  if (vars.length > 0) {
    code.push("var " + vars.join(","));
  }  
  //Scan loop
  for(i=dimension-1; i>=0; --i) { // Start at largest stride and work your way inwards
    idx = order[i];
    code.push(["for(i",i,"=0;i",i,"<s",idx,";++i",i,"){"].join(""));
  }
  //Push body of inner loop
  code.push(body);
  //Advance scan pointers
  for(i=0; i<dimension; ++i) {
    pidx = idx;
    idx = order[i];
    for(j=0; j<nargs; ++j) {
      code.push(["p",j,"+=d",j,"s",i].join(""));
    }
    if(has_index) {
      if(i > 0) {
        code.push(["index[",pidx,"]-=s",pidx].join(""));
      }
      code.push(["++index[",idx,"]"].join(""));
    }
    code.push("}");
  }
  return code.join("\n")
}

// Generate "outer" loops that loop over blocks of data, applying "inner" loops to the blocks by manipulating the local variables in such a way that the inner loop only "sees" the current block.
// TODO: If this is used, then the previous declaration (done by generateCwiseOp) of s* is essentially unnecessary.
//       I believe the s* are not used elsewhere (in particular, I don't think they're used in the pre/post parts and "shape" is defined independently), so it would be possible to make defining the s* dependent on what loop method is being used.
function outerFill(matched, order, proc, body) {
  var dimension = order.length
    , nargs = proc.arrayArgs.length
    , blockSize = proc.blockSize
    , has_index = proc.indexArgs.length > 0
    , code = [];
  for(var i=0; i<nargs; ++i) {
    code.push(["var offset",i,"=p",i].join(""));
  }
  //Generate loops for unmatched dimensions
  // The order in which these dimensions are traversed is fairly arbitrary (from small stride to large stride, for the first argument)
  // TODO: It would be nice if the order in which these loops are placed would also be somehow "optimal" (at the very least we should check that it really doesn't hurt us if they're not).
  for(var i=matched; i<dimension; ++i) {
    code.push(["for(var j"+i+"=SS[", order[i], "]|0;j", i, ">0;){"].join("")); // Iterate back to front
    code.push(["if(j",i,"<",blockSize,"){"].join("")); // Either decrease j by blockSize (s = blockSize), or set it to zero (after setting s = j).
    code.push(["s",order[i],"=j",i].join(""));
    code.push(["j",i,"=0"].join(""));
    code.push(["}else{s",order[i],"=",blockSize].join(""));
    code.push(["j",i,"-=",blockSize,"}"].join(""));
    if(has_index) {
      code.push(["index[",order[i],"]=j",i].join(""));
    }
  }
  for(var i=0; i<nargs; ++i) {
    var indexStr = ["offset"+i];
    for(var j=matched; j<dimension; ++j) {
      indexStr.push(["j",j,"*t",i,"p",order[j]].join(""));
    }
    code.push(["p",i,"=(",indexStr.join("+"),")"].join(""));
  }
  code.push(innerFill(order, proc, body));
  for(var i=matched; i<dimension; ++i) {
    code.push("}");
  }
  return code.join("\n")
}

//Count the number of compatible inner orders
// This is the length of the longest common prefix of the arrays in orders.
// Each array in orders lists the dimensions of the correspond ndarray in order of increasing stride.
// This is thus the maximum number of dimensions that can be efficiently traversed by simple nested loops for all arrays.
function countMatches(orders) {
  var matched = 0, dimension = orders[0].length;
  while(matched < dimension) {
    for(var j=1; j<orders.length; ++j) {
      if(orders[j][matched] !== orders[0][matched]) {
        return matched
      }
    }
    ++matched;
  }
  return matched
}

//Processes a block according to the given data types
// Replaces variable names by different ones, either "local" ones (that are then ferried in and out of the given array) or ones matching the arguments that the function performing the ultimate loop will accept.
function processBlock(block, proc, dtypes) {
  var code = block.body;
  var pre = [];
  var post = [];
  for(var i=0; i<block.args.length; ++i) {
    var carg = block.args[i];
    if(carg.count <= 0) {
      continue
    }
    var re = new RegExp(carg.name, "g");
    var ptrStr = "";
    var arrNum = proc.arrayArgs.indexOf(i);
    switch(proc.argTypes[i]) {
      case "offset":
        var offArgIndex = proc.offsetArgIndex.indexOf(i);
        var offArg = proc.offsetArgs[offArgIndex];
        arrNum = offArg.array;
        ptrStr = "+q" + offArgIndex; // Adds offset to the "pointer" in the array
      case "array":
        ptrStr = "p" + arrNum + ptrStr;
        var localStr = "l" + i;
        var arrStr = "a" + arrNum;
        if (proc.arrayBlockIndices[arrNum] === 0) { // Argument to body is just a single value from this array
          if(carg.count === 1) { // Argument/array used only once(?)
            if(dtypes[arrNum] === "generic") {
              if(carg.lvalue) {
                pre.push(["var ", localStr, "=", arrStr, ".get(", ptrStr, ")"].join("")); // Is this necessary if the argument is ONLY used as an lvalue? (keep in mind that we can have a += something, so we would actually need to check carg.rvalue)
                code = code.replace(re, localStr);
                post.push([arrStr, ".set(", ptrStr, ",", localStr,")"].join(""));
              } else {
                code = code.replace(re, [arrStr, ".get(", ptrStr, ")"].join(""));
              }
            } else {
              code = code.replace(re, [arrStr, "[", ptrStr, "]"].join(""));
            }
          } else if(dtypes[arrNum] === "generic") {
            pre.push(["var ", localStr, "=", arrStr, ".get(", ptrStr, ")"].join("")); // TODO: Could we optimize by checking for carg.rvalue?
            code = code.replace(re, localStr);
            if(carg.lvalue) {
              post.push([arrStr, ".set(", ptrStr, ",", localStr,")"].join(""));
            }
          } else {
            pre.push(["var ", localStr, "=", arrStr, "[", ptrStr, "]"].join("")); // TODO: Could we optimize by checking for carg.rvalue?
            code = code.replace(re, localStr);
            if(carg.lvalue) {
              post.push([arrStr, "[", ptrStr, "]=", localStr].join(""));
            }
          }
        } else { // Argument to body is a "block"
          var reStrArr = [carg.name], ptrStrArr = [ptrStr];
          for(var j=0; j<Math.abs(proc.arrayBlockIndices[arrNum]); j++) {
            reStrArr.push("\\s*\\[([^\\]]+)\\]");
            ptrStrArr.push("$" + (j+1) + "*t" + arrNum + "b" + j); // Matched index times stride
          }
          re = new RegExp(reStrArr.join(""), "g");
          ptrStr = ptrStrArr.join("+");
          if(dtypes[arrNum] === "generic") {
            /*if(carg.lvalue) {
              pre.push(["var ", localStr, "=", arrStr, ".get(", ptrStr, ")"].join("")) // Is this necessary if the argument is ONLY used as an lvalue? (keep in mind that we can have a += something, so we would actually need to check carg.rvalue)
              code = code.replace(re, localStr)
              post.push([arrStr, ".set(", ptrStr, ",", localStr,")"].join(""))
            } else {
              code = code.replace(re, [arrStr, ".get(", ptrStr, ")"].join(""))
            }*/
            throw new Error("cwise: Generic arrays not supported in combination with blocks!")
          } else {
            // This does not produce any local variables, even if variables are used multiple times. It would be possible to do so, but it would complicate things quite a bit.
            code = code.replace(re, [arrStr, "[", ptrStr, "]"].join(""));
          }
        }
      break
      case "scalar":
        code = code.replace(re, "Y" + proc.scalarArgs.indexOf(i));
      break
      case "index":
        code = code.replace(re, "index");
      break
      case "shape":
        code = code.replace(re, "shape");
      break
    }
  }
  return [pre.join("\n"), code, post.join("\n")].join("\n").trim()
}

function typeSummary(dtypes) {
  var summary = new Array(dtypes.length);
  var allEqual = true;
  for(var i=0; i<dtypes.length; ++i) {
    var t = dtypes[i];
    var digits = t.match(/\d+/);
    if(!digits) {
      digits = "";
    } else {
      digits = digits[0];
    }
    if(t.charAt(0) === 0) {
      summary[i] = "u" + t.charAt(1) + digits;
    } else {
      summary[i] = t.charAt(0) + digits;
    }
    if(i > 0) {
      allEqual = allEqual && summary[i] === summary[i-1];
    }
  }
  if(allEqual) {
    return summary[0]
  }
  return summary.join("")
}

//Generates a cwise operator
function generateCWiseOp(proc, typesig) {

  //Compute dimension
  // Arrays get put first in typesig, and there are two entries per array (dtype and order), so this gets the number of dimensions in the first array arg.
  var dimension = (typesig[1].length - Math.abs(proc.arrayBlockIndices[0]))|0;
  var orders = new Array(proc.arrayArgs.length);
  var dtypes = new Array(proc.arrayArgs.length);
  for(var i=0; i<proc.arrayArgs.length; ++i) {
    dtypes[i] = typesig[2*i];
    orders[i] = typesig[2*i+1];
  }
  
  //Determine where block and loop indices start and end
  var blockBegin = [], blockEnd = []; // These indices are exposed as blocks
  var loopBegin = [], loopEnd = []; // These indices are iterated over
  var loopOrders = []; // orders restricted to the loop indices
  for(var i=0; i<proc.arrayArgs.length; ++i) {
    if (proc.arrayBlockIndices[i]<0) {
      loopBegin.push(0);
      loopEnd.push(dimension);
      blockBegin.push(dimension);
      blockEnd.push(dimension+proc.arrayBlockIndices[i]);
    } else {
      loopBegin.push(proc.arrayBlockIndices[i]); // Non-negative
      loopEnd.push(proc.arrayBlockIndices[i]+dimension);
      blockBegin.push(0);
      blockEnd.push(proc.arrayBlockIndices[i]);
    }
    var newOrder = [];
    for(var j=0; j<orders[i].length; j++) {
      if (loopBegin[i]<=orders[i][j] && orders[i][j]<loopEnd[i]) {
        newOrder.push(orders[i][j]-loopBegin[i]); // If this is a loop index, put it in newOrder, subtracting loopBegin, to make sure that all loopOrders are using a common set of indices.
      }
    }
    loopOrders.push(newOrder);
  }

  //First create arguments for procedure
  var arglist = ["SS"]; // SS is the overall shape over which we iterate
  var code = ["'use strict'"];
  var vars = [];
  
  for(var j=0; j<dimension; ++j) {
    vars.push(["s", j, "=SS[", j, "]"].join("")); // The limits for each dimension.
  }
  for(var i=0; i<proc.arrayArgs.length; ++i) {
    arglist.push("a"+i); // Actual data array
    arglist.push("t"+i); // Strides
    arglist.push("p"+i); // Offset in the array at which the data starts (also used for iterating over the data)
    
    for(var j=0; j<dimension; ++j) { // Unpack the strides into vars for looping
      vars.push(["t",i,"p",j,"=t",i,"[",loopBegin[i]+j,"]"].join(""));
    }
    
    for(var j=0; j<Math.abs(proc.arrayBlockIndices[i]); ++j) { // Unpack the strides into vars for block iteration
      vars.push(["t",i,"b",j,"=t",i,"[",blockBegin[i]+j,"]"].join(""));
    }
  }
  for(var i=0; i<proc.scalarArgs.length; ++i) {
    arglist.push("Y" + i);
  }
  if(proc.shapeArgs.length > 0) {
    vars.push("shape=SS.slice(0)"); // Makes the shape over which we iterate available to the user defined functions (so you can use width/height for example)
  }
  if(proc.indexArgs.length > 0) {
    // Prepare an array to keep track of the (logical) indices, initialized to dimension zeroes.
    var zeros = new Array(dimension);
    for(var i=0; i<dimension; ++i) {
      zeros[i] = "0";
    }
    vars.push(["index=[", zeros.join(","), "]"].join(""));
  }
  for(var i=0; i<proc.offsetArgs.length; ++i) { // Offset arguments used for stencil operations
    var off_arg = proc.offsetArgs[i];
    var init_string = [];
    for(var j=0; j<off_arg.offset.length; ++j) {
      if(off_arg.offset[j] === 0) {
        continue
      } else if(off_arg.offset[j] === 1) {
        init_string.push(["t", off_arg.array, "p", j].join(""));      
      } else {
        init_string.push([off_arg.offset[j], "*t", off_arg.array, "p", j].join(""));
      }
    }
    if(init_string.length === 0) {
      vars.push("q" + i + "=0");
    } else {
      vars.push(["q", i, "=", init_string.join("+")].join(""));
    }
  }

  //Prepare this variables
  var thisVars = uniq([].concat(proc.pre.thisVars)
                      .concat(proc.body.thisVars)
                      .concat(proc.post.thisVars));
  vars = vars.concat(thisVars);
  if (vars.length > 0) {
    code.push("var " + vars.join(","));
  }
  for(var i=0; i<proc.arrayArgs.length; ++i) {
    code.push("p"+i+"|=0");
  }
  
  //Inline prelude
  if(proc.pre.body.length > 3) {
    code.push(processBlock(proc.pre, proc, dtypes));
  }

  //Process body
  var body = processBlock(proc.body, proc, dtypes);
  var matched = countMatches(loopOrders);
  if(matched < dimension) {
    code.push(outerFill(matched, loopOrders[0], proc, body)); // TODO: Rather than passing loopOrders[0], it might be interesting to look at passing an order that represents the majority of the arguments for example.
  } else {
    code.push(innerFill(loopOrders[0], proc, body));
  }

  //Inline epilog
  if(proc.post.body.length > 3) {
    code.push(processBlock(proc.post, proc, dtypes));
  }
  
  if(proc.debug) {
    console.log("-----Generated cwise routine for ", typesig, ":\n" + code.join("\n") + "\n----------");
  }
  
  var loopName = [(proc.funcName||"unnamed"), "_cwise_loop_", orders[0].join("s"),"m",matched,typeSummary(dtypes)].join("");
  var f = new Function(["function ",loopName,"(", arglist.join(","),"){", code.join("\n"),"} return ", loopName].join(""));
  return f()
}
var compile$1 = generateCWiseOp;

// The function below is called when constructing a cwise function object, and does the following:
// A function object is constructed which accepts as argument a compilation function and returns another function.
// It is this other function that is eventually returned by createThunk, and this function is the one that actually
// checks whether a certain pattern of arguments has already been used before and compiles new loops as needed.
// The compilation passed to the first function object is used for compiling new functions.
// Once this function object is created, it is called with compile as argument, where the first argument of compile
// is bound to "proc" (essentially containing a preprocessed version of the user arguments to cwise).
// So createThunk roughly works like this:
// function createThunk(proc) {
//   var thunk = function(compileBound) {
//     var CACHED = {}
//     return function(arrays and scalars) {
//       if (dtype and order of arrays in CACHED) {
//         var func = CACHED[dtype and order of arrays]
//       } else {
//         var func = CACHED[dtype and order of arrays] = compileBound(dtype and order of arrays)
//       }
//       return func(arrays and scalars)
//     }
//   }
//   return thunk(compile.bind1(proc))
// }

var compile = compile$1;

function createThunk$1(proc) {
  var code = ["'use strict'", "var CACHED={}"];
  var vars = [];
  var thunkName = proc.funcName + "_cwise_thunk";
  
  //Build thunk
  code.push(["return function ", thunkName, "(", proc.shimArgs.join(","), "){"].join(""));
  var typesig = [];
  var string_typesig = [];
  var proc_args = [["array",proc.arrayArgs[0],".shape.slice(", // Slice shape so that we only retain the shape over which we iterate (which gets passed to the cwise operator as SS).
                    Math.max(0,proc.arrayBlockIndices[0]),proc.arrayBlockIndices[0]<0?(","+proc.arrayBlockIndices[0]+")"):")"].join("")];
  var shapeLengthConditions = [], shapeConditions = [];
  // Process array arguments
  for(var i=0; i<proc.arrayArgs.length; ++i) {
    var j = proc.arrayArgs[i];
    vars.push(["t", j, "=array", j, ".dtype,",
               "r", j, "=array", j, ".order"].join(""));
    typesig.push("t" + j);
    typesig.push("r" + j);
    string_typesig.push("t"+j);
    string_typesig.push("r"+j+".join()");
    proc_args.push("array" + j + ".data");
    proc_args.push("array" + j + ".stride");
    proc_args.push("array" + j + ".offset|0");
    if (i>0) { // Gather conditions to check for shape equality (ignoring block indices)
      shapeLengthConditions.push("array" + proc.arrayArgs[0] + ".shape.length===array" + j + ".shape.length+" + (Math.abs(proc.arrayBlockIndices[0])-Math.abs(proc.arrayBlockIndices[i])));
      shapeConditions.push("array" + proc.arrayArgs[0] + ".shape[shapeIndex+" + Math.max(0,proc.arrayBlockIndices[0]) + "]===array" + j + ".shape[shapeIndex+" + Math.max(0,proc.arrayBlockIndices[i]) + "]");
    }
  }
  // Check for shape equality
  if (proc.arrayArgs.length > 1) {
    code.push("if (!(" + shapeLengthConditions.join(" && ") + ")) throw new Error('cwise: Arrays do not all have the same dimensionality!')");
    code.push("for(var shapeIndex=array" + proc.arrayArgs[0] + ".shape.length-" + Math.abs(proc.arrayBlockIndices[0]) + "; shapeIndex-->0;) {");
    code.push("if (!(" + shapeConditions.join(" && ") + ")) throw new Error('cwise: Arrays do not all have the same shape!')");
    code.push("}");
  }
  // Process scalar arguments
  for(var i=0; i<proc.scalarArgs.length; ++i) {
    proc_args.push("scalar" + proc.scalarArgs[i]);
  }
  // Check for cached function (and if not present, generate it)
  vars.push(["type=[", string_typesig.join(","), "].join()"].join(""));
  vars.push("proc=CACHED[type]");
  code.push("var " + vars.join(","));
  
  code.push(["if(!proc){",
             "CACHED[type]=proc=compile([", typesig.join(","), "])}",
             "return proc(", proc_args.join(","), ")}"].join(""));

  if(proc.debug) {
    console.log("-----Generated thunk:\n" + code.join("\n") + "\n----------");
  }
  
  //Compile thunk
  var thunk = new Function("compile", code.join("\n"));
  return thunk(compile.bind(undefined, proc))
}

var thunk = createThunk$1;

var createThunk = thunk;

function Procedure() {
  this.argTypes = [];
  this.shimArgs = [];
  this.arrayArgs = [];
  this.arrayBlockIndices = [];
  this.scalarArgs = [];
  this.offsetArgs = [];
  this.offsetArgIndex = [];
  this.indexArgs = [];
  this.shapeArgs = [];
  this.funcName = "";
  this.pre = null;
  this.body = null;
  this.post = null;
  this.debug = false;
}

function compileCwise(user_args) {
  //Create procedure
  var proc = new Procedure();
  
  //Parse blocks
  proc.pre    = user_args.pre;
  proc.body   = user_args.body;
  proc.post   = user_args.post;

  //Parse arguments
  var proc_args = user_args.args.slice(0);
  proc.argTypes = proc_args;
  for(var i=0; i<proc_args.length; ++i) {
    var arg_type = proc_args[i];
    if(arg_type === "array" || (typeof arg_type === "object" && arg_type.blockIndices)) {
      proc.argTypes[i] = "array";
      proc.arrayArgs.push(i);
      proc.arrayBlockIndices.push(arg_type.blockIndices ? arg_type.blockIndices : 0);
      proc.shimArgs.push("array" + i);
      if(i < proc.pre.args.length && proc.pre.args[i].count>0) {
        throw new Error("cwise: pre() block may not reference array args")
      }
      if(i < proc.post.args.length && proc.post.args[i].count>0) {
        throw new Error("cwise: post() block may not reference array args")
      }
    } else if(arg_type === "scalar") {
      proc.scalarArgs.push(i);
      proc.shimArgs.push("scalar" + i);
    } else if(arg_type === "index") {
      proc.indexArgs.push(i);
      if(i < proc.pre.args.length && proc.pre.args[i].count > 0) {
        throw new Error("cwise: pre() block may not reference array index")
      }
      if(i < proc.body.args.length && proc.body.args[i].lvalue) {
        throw new Error("cwise: body() block may not write to array index")
      }
      if(i < proc.post.args.length && proc.post.args[i].count > 0) {
        throw new Error("cwise: post() block may not reference array index")
      }
    } else if(arg_type === "shape") {
      proc.shapeArgs.push(i);
      if(i < proc.pre.args.length && proc.pre.args[i].lvalue) {
        throw new Error("cwise: pre() block may not write to array shape")
      }
      if(i < proc.body.args.length && proc.body.args[i].lvalue) {
        throw new Error("cwise: body() block may not write to array shape")
      }
      if(i < proc.post.args.length && proc.post.args[i].lvalue) {
        throw new Error("cwise: post() block may not write to array shape")
      }
    } else if(typeof arg_type === "object" && arg_type.offset) {
      proc.argTypes[i] = "offset";
      proc.offsetArgs.push({ array: arg_type.array, offset:arg_type.offset });
      proc.offsetArgIndex.push(i);
    } else {
      throw new Error("cwise: Unknown argument type " + proc_args[i])
    }
  }
  
  //Make sure at least one array argument was specified
  if(proc.arrayArgs.length <= 0) {
    throw new Error("cwise: No array arguments specified")
  }
  
  //Make sure arguments are correct
  if(proc.pre.args.length > proc_args.length) {
    throw new Error("cwise: Too many arguments in pre() block")
  }
  if(proc.body.args.length > proc_args.length) {
    throw new Error("cwise: Too many arguments in body() block")
  }
  if(proc.post.args.length > proc_args.length) {
    throw new Error("cwise: Too many arguments in post() block")
  }

  //Check debug flag
  proc.debug = !!user_args.printCode || !!user_args.debug;
  
  //Retrieve name
  proc.funcName = user_args.funcName || "cwise";
  
  //Read in block size
  proc.blockSize = user_args.blockSize || 64;

  return createThunk(proc)
}

var compiler = compileCwise;

(function (exports) {

	var compile = compiler;

	var EmptyProc = {
	  body: "",
	  args: [],
	  thisVars: [],
	  localVars: []
	};

	function fixup(x) {
	  if(!x) {
	    return EmptyProc
	  }
	  for(var i=0; i<x.args.length; ++i) {
	    var a = x.args[i];
	    if(i === 0) {
	      x.args[i] = {name: a, lvalue:true, rvalue: !!x.rvalue, count:x.count||1 };
	    } else {
	      x.args[i] = {name: a, lvalue:false, rvalue:true, count: 1};
	    }
	  }
	  if(!x.thisVars) {
	    x.thisVars = [];
	  }
	  if(!x.localVars) {
	    x.localVars = [];
	  }
	  return x
	}

	function pcompile(user_args) {
	  return compile({
	    args:     user_args.args,
	    pre:      fixup(user_args.pre),
	    body:     fixup(user_args.body),
	    post:     fixup(user_args.proc),
	    funcName: user_args.funcName
	  })
	}

	function makeOp(user_args) {
	  var args = [];
	  for(var i=0; i<user_args.args.length; ++i) {
	    args.push("a"+i);
	  }
	  var wrapper = new Function("P", [
	    "return function ", user_args.funcName, "_ndarrayops(", args.join(","), ") {P(", args.join(","), ");return a0}"
	  ].join(""));
	  return wrapper(pcompile(user_args))
	}

	var assign_ops = {
	  add:  "+",
	  sub:  "-",
	  mul:  "*",
	  div:  "/",
	  mod:  "%",
	  band: "&",
	  bor:  "|",
	  bxor: "^",
	  lshift: "<<",
	  rshift: ">>",
	  rrshift: ">>>"
	}
	;(function(){
	  for(var id in assign_ops) {
	    var op = assign_ops[id];
	    exports[id] = makeOp({
	      args: ["array","array","array"],
	      body: {args:["a","b","c"],
	             body: "a=b"+op+"c"},
	      funcName: id
	    });
	    exports[id+"eq"] = makeOp({
	      args: ["array","array"],
	      body: {args:["a","b"],
	             body:"a"+op+"=b"},
	      rvalue: true,
	      funcName: id+"eq"
	    });
	    exports[id+"s"] = makeOp({
	      args: ["array", "array", "scalar"],
	      body: {args:["a","b","s"],
	             body:"a=b"+op+"s"},
	      funcName: id+"s"
	    });
	    exports[id+"seq"] = makeOp({
	      args: ["array","scalar"],
	      body: {args:["a","s"],
	             body:"a"+op+"=s"},
	      rvalue: true,
	      funcName: id+"seq"
	    });
	  }
	})();

	var unary_ops = {
	  not: "!",
	  bnot: "~",
	  neg: "-",
	  recip: "1.0/"
	}
	;(function(){
	  for(var id in unary_ops) {
	    var op = unary_ops[id];
	    exports[id] = makeOp({
	      args: ["array", "array"],
	      body: {args:["a","b"],
	             body:"a="+op+"b"},
	      funcName: id
	    });
	    exports[id+"eq"] = makeOp({
	      args: ["array"],
	      body: {args:["a"],
	             body:"a="+op+"a"},
	      rvalue: true,
	      count: 2,
	      funcName: id+"eq"
	    });
	  }
	})();

	var binary_ops = {
	  and: "&&",
	  or: "||",
	  eq: "===",
	  neq: "!==",
	  lt: "<",
	  gt: ">",
	  leq: "<=",
	  geq: ">="
	}
	;(function() {
	  for(var id in binary_ops) {
	    var op = binary_ops[id];
	    exports[id] = makeOp({
	      args: ["array","array","array"],
	      body: {args:["a", "b", "c"],
	             body:"a=b"+op+"c"},
	      funcName: id
	    });
	    exports[id+"s"] = makeOp({
	      args: ["array","array","scalar"],
	      body: {args:["a", "b", "s"],
	             body:"a=b"+op+"s"},
	      funcName: id+"s"
	    });
	    exports[id+"eq"] = makeOp({
	      args: ["array", "array"],
	      body: {args:["a", "b"],
	             body:"a=a"+op+"b"},
	      rvalue:true,
	      count:2,
	      funcName: id+"eq"
	    });
	    exports[id+"seq"] = makeOp({
	      args: ["array", "scalar"],
	      body: {args:["a","s"],
	             body:"a=a"+op+"s"},
	      rvalue:true,
	      count:2,
	      funcName: id+"seq"
	    });
	  }
	})();

	var math_unary = [
	  "abs",
	  "acos",
	  "asin",
	  "atan",
	  "ceil",
	  "cos",
	  "exp",
	  "floor",
	  "log",
	  "round",
	  "sin",
	  "sqrt",
	  "tan"
	]
	;(function() {
	  for(var i=0; i<math_unary.length; ++i) {
	    var f = math_unary[i];
	    exports[f] = makeOp({
	                    args: ["array", "array"],
	                    pre: {args:[], body:"this_f=Math."+f, thisVars:["this_f"]},
	                    body: {args:["a","b"], body:"a=this_f(b)", thisVars:["this_f"]},
	                    funcName: f
	                  });
	    exports[f+"eq"] = makeOp({
	                      args: ["array"],
	                      pre: {args:[], body:"this_f=Math."+f, thisVars:["this_f"]},
	                      body: {args: ["a"], body:"a=this_f(a)", thisVars:["this_f"]},
	                      rvalue: true,
	                      count: 2,
	                      funcName: f+"eq"
	                    });
	  }
	})();

	var math_comm = [
	  "max",
	  "min",
	  "atan2",
	  "pow"
	]
	;(function(){
	  for(var i=0; i<math_comm.length; ++i) {
	    var f= math_comm[i];
	    exports[f] = makeOp({
	                  args:["array", "array", "array"],
	                  pre: {args:[], body:"this_f=Math."+f, thisVars:["this_f"]},
	                  body: {args:["a","b","c"], body:"a=this_f(b,c)", thisVars:["this_f"]},
	                  funcName: f
	                });
	    exports[f+"s"] = makeOp({
	                  args:["array", "array", "scalar"],
	                  pre: {args:[], body:"this_f=Math."+f, thisVars:["this_f"]},
	                  body: {args:["a","b","c"], body:"a=this_f(b,c)", thisVars:["this_f"]},
	                  funcName: f+"s"
	                  });
	    exports[f+"eq"] = makeOp({ args:["array", "array"],
	                  pre: {args:[], body:"this_f=Math."+f, thisVars:["this_f"]},
	                  body: {args:["a","b"], body:"a=this_f(a,b)", thisVars:["this_f"]},
	                  rvalue: true,
	                  count: 2,
	                  funcName: f+"eq"
	                  });
	    exports[f+"seq"] = makeOp({ args:["array", "scalar"],
	                  pre: {args:[], body:"this_f=Math."+f, thisVars:["this_f"]},
	                  body: {args:["a","b"], body:"a=this_f(a,b)", thisVars:["this_f"]},
	                  rvalue:true,
	                  count:2,
	                  funcName: f+"seq"
	                  });
	  }
	})();

	var math_noncomm = [
	  "atan2",
	  "pow"
	]
	;(function(){
	  for(var i=0; i<math_noncomm.length; ++i) {
	    var f= math_noncomm[i];
	    exports[f+"op"] = makeOp({
	                  args:["array", "array", "array"],
	                  pre: {args:[], body:"this_f=Math."+f, thisVars:["this_f"]},
	                  body: {args:["a","b","c"], body:"a=this_f(c,b)", thisVars:["this_f"]},
	                  funcName: f+"op"
	                });
	    exports[f+"ops"] = makeOp({
	                  args:["array", "array", "scalar"],
	                  pre: {args:[], body:"this_f=Math."+f, thisVars:["this_f"]},
	                  body: {args:["a","b","c"], body:"a=this_f(c,b)", thisVars:["this_f"]},
	                  funcName: f+"ops"
	                  });
	    exports[f+"opeq"] = makeOp({ args:["array", "array"],
	                  pre: {args:[], body:"this_f=Math."+f, thisVars:["this_f"]},
	                  body: {args:["a","b"], body:"a=this_f(b,a)", thisVars:["this_f"]},
	                  rvalue: true,
	                  count: 2,
	                  funcName: f+"opeq"
	                  });
	    exports[f+"opseq"] = makeOp({ args:["array", "scalar"],
	                  pre: {args:[], body:"this_f=Math."+f, thisVars:["this_f"]},
	                  body: {args:["a","b"], body:"a=this_f(b,a)", thisVars:["this_f"]},
	                  rvalue:true,
	                  count:2,
	                  funcName: f+"opseq"
	                  });
	  }
	})();

	exports.any = compile({
	  args:["array"],
	  pre: EmptyProc,
	  body: {args:[{name:"a", lvalue:false, rvalue:true, count:1}], body: "if(a){return true}", localVars: [], thisVars: []},
	  post: {args:[], localVars:[], thisVars:[], body:"return false"},
	  funcName: "any"
	});

	exports.all = compile({
	  args:["array"],
	  pre: EmptyProc,
	  body: {args:[{name:"x", lvalue:false, rvalue:true, count:1}], body: "if(!x){return false}", localVars: [], thisVars: []},
	  post: {args:[], localVars:[], thisVars:[], body:"return true"},
	  funcName: "all"
	});

	exports.sum = compile({
	  args:["array"],
	  pre: {args:[], localVars:[], thisVars:["this_s"], body:"this_s=0"},
	  body: {args:[{name:"a", lvalue:false, rvalue:true, count:1}], body: "this_s+=a", localVars: [], thisVars: ["this_s"]},
	  post: {args:[], localVars:[], thisVars:["this_s"], body:"return this_s"},
	  funcName: "sum"
	});

	exports.prod = compile({
	  args:["array"],
	  pre: {args:[], localVars:[], thisVars:["this_s"], body:"this_s=1"},
	  body: {args:[{name:"a", lvalue:false, rvalue:true, count:1}], body: "this_s*=a", localVars: [], thisVars: ["this_s"]},
	  post: {args:[], localVars:[], thisVars:["this_s"], body:"return this_s"},
	  funcName: "prod"
	});

	exports.norm2squared = compile({
	  args:["array"],
	  pre: {args:[], localVars:[], thisVars:["this_s"], body:"this_s=0"},
	  body: {args:[{name:"a", lvalue:false, rvalue:true, count:2}], body: "this_s+=a*a", localVars: [], thisVars: ["this_s"]},
	  post: {args:[], localVars:[], thisVars:["this_s"], body:"return this_s"},
	  funcName: "norm2squared"
	});
	  
	exports.norm2 = compile({
	  args:["array"],
	  pre: {args:[], localVars:[], thisVars:["this_s"], body:"this_s=0"},
	  body: {args:[{name:"a", lvalue:false, rvalue:true, count:2}], body: "this_s+=a*a", localVars: [], thisVars: ["this_s"]},
	  post: {args:[], localVars:[], thisVars:["this_s"], body:"return Math.sqrt(this_s)"},
	  funcName: "norm2"
	});
	  

	exports.norminf = compile({
	  args:["array"],
	  pre: {args:[], localVars:[], thisVars:["this_s"], body:"this_s=0"},
	  body: {args:[{name:"a", lvalue:false, rvalue:true, count:4}], body:"if(-a>this_s){this_s=-a}else if(a>this_s){this_s=a}", localVars: [], thisVars: ["this_s"]},
	  post: {args:[], localVars:[], thisVars:["this_s"], body:"return this_s"},
	  funcName: "norminf"
	});

	exports.norm1 = compile({
	  args:["array"],
	  pre: {args:[], localVars:[], thisVars:["this_s"], body:"this_s=0"},
	  body: {args:[{name:"a", lvalue:false, rvalue:true, count:3}], body: "this_s+=a<0?-a:a", localVars: [], thisVars: ["this_s"]},
	  post: {args:[], localVars:[], thisVars:["this_s"], body:"return this_s"},
	  funcName: "norm1"
	});

	exports.sup = compile({
	  args: [ "array" ],
	  pre:
	   { body: "this_h=-Infinity",
	     args: [],
	     thisVars: [ "this_h" ],
	     localVars: [] },
	  body:
	   { body: "if(_inline_1_arg0_>this_h)this_h=_inline_1_arg0_",
	     args: [{"name":"_inline_1_arg0_","lvalue":false,"rvalue":true,"count":2} ],
	     thisVars: [ "this_h" ],
	     localVars: [] },
	  post:
	   { body: "return this_h",
	     args: [],
	     thisVars: [ "this_h" ],
	     localVars: [] }
	 });

	exports.inf = compile({
	  args: [ "array" ],
	  pre:
	   { body: "this_h=Infinity",
	     args: [],
	     thisVars: [ "this_h" ],
	     localVars: [] },
	  body:
	   { body: "if(_inline_1_arg0_<this_h)this_h=_inline_1_arg0_",
	     args: [{"name":"_inline_1_arg0_","lvalue":false,"rvalue":true,"count":2} ],
	     thisVars: [ "this_h" ],
	     localVars: [] },
	  post:
	   { body: "return this_h",
	     args: [],
	     thisVars: [ "this_h" ],
	     localVars: [] }
	 });

	exports.argmin = compile({
	  args:["index","array","shape"],
	  pre:{
	    body:"{this_v=Infinity;this_i=_inline_0_arg2_.slice(0)}",
	    args:[
	      {name:"_inline_0_arg0_",lvalue:false,rvalue:false,count:0},
	      {name:"_inline_0_arg1_",lvalue:false,rvalue:false,count:0},
	      {name:"_inline_0_arg2_",lvalue:false,rvalue:true,count:1}
	      ],
	    thisVars:["this_i","this_v"],
	    localVars:[]},
	  body:{
	    body:"{if(_inline_1_arg1_<this_v){this_v=_inline_1_arg1_;for(var _inline_1_k=0;_inline_1_k<_inline_1_arg0_.length;++_inline_1_k){this_i[_inline_1_k]=_inline_1_arg0_[_inline_1_k]}}}",
	    args:[
	      {name:"_inline_1_arg0_",lvalue:false,rvalue:true,count:2},
	      {name:"_inline_1_arg1_",lvalue:false,rvalue:true,count:2}],
	    thisVars:["this_i","this_v"],
	    localVars:["_inline_1_k"]},
	  post:{
	    body:"{return this_i}",
	    args:[],
	    thisVars:["this_i"],
	    localVars:[]}
	});

	exports.argmax = compile({
	  args:["index","array","shape"],
	  pre:{
	    body:"{this_v=-Infinity;this_i=_inline_0_arg2_.slice(0)}",
	    args:[
	      {name:"_inline_0_arg0_",lvalue:false,rvalue:false,count:0},
	      {name:"_inline_0_arg1_",lvalue:false,rvalue:false,count:0},
	      {name:"_inline_0_arg2_",lvalue:false,rvalue:true,count:1}
	      ],
	    thisVars:["this_i","this_v"],
	    localVars:[]},
	  body:{
	    body:"{if(_inline_1_arg1_>this_v){this_v=_inline_1_arg1_;for(var _inline_1_k=0;_inline_1_k<_inline_1_arg0_.length;++_inline_1_k){this_i[_inline_1_k]=_inline_1_arg0_[_inline_1_k]}}}",
	    args:[
	      {name:"_inline_1_arg0_",lvalue:false,rvalue:true,count:2},
	      {name:"_inline_1_arg1_",lvalue:false,rvalue:true,count:2}],
	    thisVars:["this_i","this_v"],
	    localVars:["_inline_1_k"]},
	  post:{
	    body:"{return this_i}",
	    args:[],
	    thisVars:["this_i"],
	    localVars:[]}
	});  

	exports.random = makeOp({
	  args: ["array"],
	  pre: {args:[], body:"this_f=Math.random", thisVars:["this_f"]},
	  body: {args: ["a"], body:"a=this_f()", thisVars:["this_f"]},
	  funcName: "random"
	});

	exports.assign = makeOp({
	  args:["array", "array"],
	  body: {args:["a", "b"], body:"a=b"},
	  funcName: "assign" });

	exports.assigns = makeOp({
	  args:["array", "scalar"],
	  body: {args:["a", "b"], body:"a=b"},
	  funcName: "assigns" });


	exports.equals = compile({
	  args:["array", "array"],
	  pre: EmptyProc,
	  body: {args:[{name:"x", lvalue:false, rvalue:true, count:1},
	               {name:"y", lvalue:false, rvalue:true, count:1}], 
	        body: "if(x!==y){return false}", 
	        localVars: [], 
	        thisVars: []},
	  post: {args:[], localVars:[], thisVars:[], body:"return true"},
	  funcName: "equals"
	}); 
} (ndarrayOps));

function getPixelsInternal(buffer, mimeType) {
  // Warn for Data URIs, URLs, and file paths. Support removed in v3.
  if (!(buffer instanceof Uint8Array)) {
    throw new Error('[ndarray-pixels] Input must be Uint8Array or Buffer.');
  }
  const blob = new Blob([buffer], {
    type: mimeType
  });
  const path = URL.createObjectURL(blob);
  // Decode image with Canvas API.
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = function () {
      URL.revokeObjectURL(path);
      const canvas = new OffscreenCanvas(img.width, img.height);
      const context = canvas.getContext('2d');
      context.drawImage(img, 0, 0);
      const pixels = context.getImageData(0, 0, img.width, img.height);
      resolve(ndarray$1(new Uint8Array(pixels.data), [img.width, img.height, 4], [4, 4 * img.width, 1], 0));
    };
    img.onerror = err => {
      URL.revokeObjectURL(path);
      reject(err);
    };
    img.src = path;
  });
}

/**
 * Decodes image data to an `ndarray`.
 *
 * MIME type is optional when given a path or URL, and required when given a Uint8Array.
 *
 * Accepts `image/png` or `image/jpeg` in Node.js, and additional formats on browsers with
 * the necessary support in Canvas 2D.
 *
 * @param data
 * @param mimeType `image/jpeg`, `image/png`, etc.
 * @returns
 */
async function getPixels(data, mimeType) {
  return getPixelsInternal(data, mimeType);
}

///////////////////////////////////////////////////
// KTX2 Header.
///////////////////////////////////////////////////
const KHR_SUPERCOMPRESSION_NONE = 0;
///////////////////////////////////////////////////
// Data Format Descriptor (DFD).
///////////////////////////////////////////////////
const KHR_DF_KHR_DESCRIPTORTYPE_BASICFORMAT = 0;
const KHR_DF_VENDORID_KHRONOS = 0;
const KHR_DF_VERSION = 2;
const KHR_DF_MODEL_UNSPECIFIED = 0;
const KHR_DF_MODEL_ETC1S = 163;
const KHR_DF_MODEL_UASTC = 166;
const KHR_DF_FLAG_ALPHA_STRAIGHT = 0;
const KHR_DF_TRANSFER_SRGB = 2;
const KHR_DF_PRIMARIES_BT709 = 1;
const KHR_DF_SAMPLE_DATATYPE_SIGNED = 0x40;
///////////////////////////////////////////////////
// VK FORMAT.
///////////////////////////////////////////////////
const VK_FORMAT_UNDEFINED = 0;

/**
 * Represents an unpacked KTX 2.0 texture container. Data for individual mip levels are stored in
 * the `.levels` array, typically compressed in Basis Universal formats. Additional properties
 * provide metadata required to process, transcode, and upload these textures.
 */
class KTX2Container {
  constructor() {
    /**
     * Specifies the image format using Vulkan VkFormat enum values. When using Basis Universal
     * texture formats, `vkFormat` must be VK_FORMAT_UNDEFINED.
     */
    this.vkFormat = VK_FORMAT_UNDEFINED;
    /**
     * Size of the data type in bytes used to upload the data to a graphics API. When `vkFormat` is
     * VK_FORMAT_UNDEFINED, `typeSize` must be 1.
     */
    this.typeSize = 1;
    /** Width of the texture image for level 0, in pixels. */
    this.pixelWidth = 0;
    /** Height of the texture image for level 0, in pixels. */
    this.pixelHeight = 0;
    /** Depth of the texture image for level 0, in pixels (3D textures only). */
    this.pixelDepth = 0;
    /** Number of array elements (array textures only). */
    this.layerCount = 0;
    /**
     * Number of cubemap faces. For cubemaps and cubemap arrays, `faceCount` must be 6. For all
     * other textures, `faceCount` must be 1. Cubemap faces are stored in +X, -X, +Y, -Y, +Z, -Z
     * order.
     */
    this.faceCount = 1;
    /** Indicates which supercompression scheme has been applied to mip level images, if any. */
    this.supercompressionScheme = KHR_SUPERCOMPRESSION_NONE;
    /** Mip levels, ordered largest (original) to smallest (~1px). */
    this.levels = [];
    /** Data Format Descriptor. */
    this.dataFormatDescriptor = [{
      vendorId: KHR_DF_VENDORID_KHRONOS,
      descriptorType: KHR_DF_KHR_DESCRIPTORTYPE_BASICFORMAT,
      descriptorBlockSize: 0,
      versionNumber: KHR_DF_VERSION,
      colorModel: KHR_DF_MODEL_UNSPECIFIED,
      colorPrimaries: KHR_DF_PRIMARIES_BT709,
      transferFunction: KHR_DF_TRANSFER_SRGB,
      flags: KHR_DF_FLAG_ALPHA_STRAIGHT,
      texelBlockDimension: [0, 0, 0, 0],
      bytesPlane: [0, 0, 0, 0, 0, 0, 0, 0],
      samples: []
    }];
    /** Key/Value Data. */
    this.keyValue = {};
    /** Supercompression Global Data. */
    this.globalData = null;
  }
}

class BufferReader {
  constructor(data, byteOffset, byteLength, littleEndian) {
    this._dataView = void 0;
    this._littleEndian = void 0;
    this._offset = void 0;
    this._dataView = new DataView(data.buffer, data.byteOffset + byteOffset, byteLength);
    this._littleEndian = littleEndian;
    this._offset = 0;
  }
  _nextUint8() {
    const value = this._dataView.getUint8(this._offset);
    this._offset += 1;
    return value;
  }
  _nextUint16() {
    const value = this._dataView.getUint16(this._offset, this._littleEndian);
    this._offset += 2;
    return value;
  }
  _nextUint32() {
    const value = this._dataView.getUint32(this._offset, this._littleEndian);
    this._offset += 4;
    return value;
  }
  _nextUint64() {
    const left = this._dataView.getUint32(this._offset, this._littleEndian);
    const right = this._dataView.getUint32(this._offset + 4, this._littleEndian);
    // TODO(cleanup): Just test this...
    // const value = this._littleEndian ? left + (2 ** 32 * right) : (2 ** 32 * left) + right;
    const value = left + 2 ** 32 * right;
    this._offset += 8;
    return value;
  }
  _nextInt32() {
    const value = this._dataView.getInt32(this._offset, this._littleEndian);
    this._offset += 4;
    return value;
  }
  _nextUint8Array(len) {
    const value = new Uint8Array(this._dataView.buffer, this._dataView.byteOffset + this._offset, len);
    this._offset += len;
    return value;
  }
  _skip(bytes) {
    this._offset += bytes;
    return this;
  }
  _scan(maxByteLength, term = 0x00) {
    const byteOffset = this._offset;
    let byteLength = 0;
    while (this._dataView.getUint8(this._offset) !== term && byteLength < maxByteLength) {
      byteLength++;
      this._offset++;
    }
    if (byteLength < maxByteLength) this._offset++;
    return new Uint8Array(this._dataView.buffer, this._dataView.byteOffset + byteOffset, byteLength);
  }
}
///////////////////////////////////////////////////
// KTX2 Header.
///////////////////////////////////////////////////
const KTX2_ID = [
// '´', 'K', 'T', 'X', '2', '0', 'ª', '\r', '\n', '\x1A', '\n'
0xab, 0x4b, 0x54, 0x58, 0x20, 0x32, 0x30, 0xbb, 0x0d, 0x0a, 0x1a, 0x0a];
/** Decodes an ArrayBuffer to text. */
function decodeText(buffer) {
  if (typeof TextDecoder !== 'undefined') {
    return new TextDecoder().decode(buffer);
  }
  return Buffer.from(buffer).toString('utf8');
}

/**
 * Parses a KTX 2.0 file, returning an unpacked {@link KTX2Container} instance with all associated
 * data. The container's mip levels and other binary data are pointers into the original file, not
 * copies, so the original file should not be overwritten after reading.
 *
 * @param data Bytes of KTX 2.0 file, as Uint8Array or Buffer.
 */
function read(data) {
  ///////////////////////////////////////////////////
  // KTX 2.0 Identifier.
  ///////////////////////////////////////////////////
  const id = new Uint8Array(data.buffer, data.byteOffset, KTX2_ID.length);
  if (id[0] !== KTX2_ID[0] ||
  // '´'
  id[1] !== KTX2_ID[1] ||
  // 'K'
  id[2] !== KTX2_ID[2] ||
  // 'T'
  id[3] !== KTX2_ID[3] ||
  // 'X'
  id[4] !== KTX2_ID[4] ||
  // ' '
  id[5] !== KTX2_ID[5] ||
  // '2'
  id[6] !== KTX2_ID[6] ||
  // '0'
  id[7] !== KTX2_ID[7] ||
  // 'ª'
  id[8] !== KTX2_ID[8] ||
  // '\r'
  id[9] !== KTX2_ID[9] ||
  // '\n'
  id[10] !== KTX2_ID[10] ||
  // '\x1A'
  id[11] !== KTX2_ID[11] // '\n'
  ) {
    throw new Error('Missing KTX 2.0 identifier.');
  }
  const container = new KTX2Container();
  ///////////////////////////////////////////////////
  // Header.
  ///////////////////////////////////////////////////
  const headerByteLength = 17 * Uint32Array.BYTES_PER_ELEMENT;
  const headerReader = new BufferReader(data, KTX2_ID.length, headerByteLength, true);
  container.vkFormat = headerReader._nextUint32();
  container.typeSize = headerReader._nextUint32();
  container.pixelWidth = headerReader._nextUint32();
  container.pixelHeight = headerReader._nextUint32();
  container.pixelDepth = headerReader._nextUint32();
  container.layerCount = headerReader._nextUint32();
  container.faceCount = headerReader._nextUint32();
  const levelCount = headerReader._nextUint32();
  container.supercompressionScheme = headerReader._nextUint32();
  const dfdByteOffset = headerReader._nextUint32();
  const dfdByteLength = headerReader._nextUint32();
  const kvdByteOffset = headerReader._nextUint32();
  const kvdByteLength = headerReader._nextUint32();
  const sgdByteOffset = headerReader._nextUint64();
  const sgdByteLength = headerReader._nextUint64();
  ///////////////////////////////////////////////////
  // Level Index.
  ///////////////////////////////////////////////////
  const levelByteLength = levelCount * 3 * 8;
  const levelReader = new BufferReader(data, KTX2_ID.length + headerByteLength, levelByteLength, true);
  for (let i = 0; i < levelCount; i++) {
    container.levels.push({
      levelData: new Uint8Array(data.buffer, data.byteOffset + levelReader._nextUint64(), levelReader._nextUint64()),
      uncompressedByteLength: levelReader._nextUint64()
    });
  }
  ///////////////////////////////////////////////////
  // Data Format Descriptor (DFD).
  ///////////////////////////////////////////////////
  const dfdReader = new BufferReader(data, dfdByteOffset, dfdByteLength, true);
  const dfd = {
    vendorId: dfdReader._skip(4 /* totalSize */)._nextUint16(),
    descriptorType: dfdReader._nextUint16(),
    versionNumber: dfdReader._nextUint16(),
    descriptorBlockSize: dfdReader._nextUint16(),
    colorModel: dfdReader._nextUint8(),
    colorPrimaries: dfdReader._nextUint8(),
    transferFunction: dfdReader._nextUint8(),
    flags: dfdReader._nextUint8(),
    texelBlockDimension: [dfdReader._nextUint8(), dfdReader._nextUint8(), dfdReader._nextUint8(), dfdReader._nextUint8()],
    bytesPlane: [dfdReader._nextUint8(), dfdReader._nextUint8(), dfdReader._nextUint8(), dfdReader._nextUint8(), dfdReader._nextUint8(), dfdReader._nextUint8(), dfdReader._nextUint8(), dfdReader._nextUint8()],
    samples: []
  };
  const sampleStart = 6;
  const sampleWords = 4;
  const numSamples = (dfd.descriptorBlockSize / 4 - sampleStart) / sampleWords;
  for (let i = 0; i < numSamples; i++) {
    const sample = {
      bitOffset: dfdReader._nextUint16(),
      bitLength: dfdReader._nextUint8(),
      channelType: dfdReader._nextUint8(),
      samplePosition: [dfdReader._nextUint8(), dfdReader._nextUint8(), dfdReader._nextUint8(), dfdReader._nextUint8()],
      sampleLower: -Infinity,
      sampleUpper: Infinity
    };
    if (sample.channelType & KHR_DF_SAMPLE_DATATYPE_SIGNED) {
      sample.sampleLower = dfdReader._nextInt32();
      sample.sampleUpper = dfdReader._nextInt32();
    } else {
      sample.sampleLower = dfdReader._nextUint32();
      sample.sampleUpper = dfdReader._nextUint32();
    }
    dfd.samples[i] = sample;
  }
  container.dataFormatDescriptor.length = 0;
  container.dataFormatDescriptor.push(dfd);
  ///////////////////////////////////////////////////
  // Key/Value Data (KVD).
  ///////////////////////////////////////////////////
  const kvdReader = new BufferReader(data, kvdByteOffset, kvdByteLength, true);
  while (kvdReader._offset < kvdByteLength) {
    const keyValueByteLength = kvdReader._nextUint32();
    const keyData = kvdReader._scan(keyValueByteLength);
    const key = decodeText(keyData);
    container.keyValue[key] = kvdReader._nextUint8Array(keyValueByteLength - keyData.byteLength - 1);
    if (key.match(/^ktx/i)) {
      const text = decodeText(container.keyValue[key]);
      container.keyValue[key] = text.substring(0, text.lastIndexOf('\x00'));
    }
    const kvPadding = keyValueByteLength % 4 ? 4 - keyValueByteLength % 4 : 0; // align(4)
    // 4-byte alignment.
    kvdReader._skip(kvPadding);
  }
  ///////////////////////////////////////////////////
  // Supercompression Global Data (SGD).
  ///////////////////////////////////////////////////
  if (sgdByteLength <= 0) return container;
  const sgdReader = new BufferReader(data, sgdByteOffset, sgdByteLength, true);
  const endpointCount = sgdReader._nextUint16();
  const selectorCount = sgdReader._nextUint16();
  const endpointsByteLength = sgdReader._nextUint32();
  const selectorsByteLength = sgdReader._nextUint32();
  const tablesByteLength = sgdReader._nextUint32();
  const extendedByteLength = sgdReader._nextUint32();
  const imageDescs = [];
  for (let i = 0; i < levelCount; i++) {
    imageDescs.push({
      imageFlags: sgdReader._nextUint32(),
      rgbSliceByteOffset: sgdReader._nextUint32(),
      rgbSliceByteLength: sgdReader._nextUint32(),
      alphaSliceByteOffset: sgdReader._nextUint32(),
      alphaSliceByteLength: sgdReader._nextUint32()
    });
  }
  const endpointsByteOffset = sgdByteOffset + sgdReader._offset;
  const selectorsByteOffset = endpointsByteOffset + endpointsByteLength;
  const tablesByteOffset = selectorsByteOffset + selectorsByteLength;
  const extendedByteOffset = tablesByteOffset + tablesByteLength;
  const endpointsData = new Uint8Array(data.buffer, data.byteOffset + endpointsByteOffset, endpointsByteLength);
  const selectorsData = new Uint8Array(data.buffer, data.byteOffset + selectorsByteOffset, selectorsByteLength);
  const tablesData = new Uint8Array(data.buffer, data.byteOffset + tablesByteOffset, tablesByteLength);
  const extendedData = new Uint8Array(data.buffer, data.byteOffset + extendedByteOffset, extendedByteLength);
  container.globalData = {
    endpointCount,
    selectorCount,
    imageDescs,
    endpointsData,
    selectorsData,
    tablesData,
    extendedData
  };
  return container;
}

const EXT_MESH_GPU_INSTANCING = 'EXT_mesh_gpu_instancing';
const EXT_MESHOPT_COMPRESSION = 'EXT_meshopt_compression';
const EXT_TEXTURE_WEBP = 'EXT_texture_webp';
const EXT_TEXTURE_AVIF = 'EXT_texture_avif';
const KHR_DRACO_MESH_COMPRESSION = 'KHR_draco_mesh_compression';
const KHR_LIGHTS_PUNCTUAL = 'KHR_lights_punctual';
const KHR_MATERIALS_ANISOTROPY = 'KHR_materials_anisotropy';
const KHR_MATERIALS_CLEARCOAT = 'KHR_materials_clearcoat';
const KHR_MATERIALS_DIFFUSE_TRANSMISSION = 'KHR_materials_diffuse_transmission';
const KHR_MATERIALS_DISPERSION = 'KHR_materials_dispersion';
const KHR_MATERIALS_EMISSIVE_STRENGTH = 'KHR_materials_emissive_strength';
const KHR_MATERIALS_IOR = 'KHR_materials_ior';
const KHR_MATERIALS_IRIDESCENCE = 'KHR_materials_iridescence';
const KHR_MATERIALS_PBR_SPECULAR_GLOSSINESS = 'KHR_materials_pbrSpecularGlossiness';
const KHR_MATERIALS_SHEEN = 'KHR_materials_sheen';
const KHR_MATERIALS_SPECULAR = 'KHR_materials_specular';
const KHR_MATERIALS_TRANSMISSION = 'KHR_materials_transmission';
const KHR_MATERIALS_UNLIT = 'KHR_materials_unlit';
const KHR_MATERIALS_VOLUME = 'KHR_materials_volume';
const KHR_MATERIALS_VARIANTS = 'KHR_materials_variants';
const KHR_MESH_QUANTIZATION = 'KHR_mesh_quantization';
const KHR_TEXTURE_BASISU = 'KHR_texture_basisu';
const KHR_TEXTURE_TRANSFORM = 'KHR_texture_transform';
const KHR_XMP_JSON_LD = 'KHR_xmp_json_ld';

// See BufferViewUsage in `writer-context.ts`.
const INSTANCE_ATTRIBUTE = 'INSTANCE_ATTRIBUTE';
/**
 * Defines GPU instances of a {@link Mesh} under one {@link Node}. See {@link EXTMeshGPUInstancing}.
 */
class InstancedMesh extends ExtensionProperty {
  init() {
    this.extensionName = EXT_MESH_GPU_INSTANCING;
    this.propertyType = 'InstancedMesh';
    this.parentTypes = [PropertyType.NODE];
  }
  getDefaults() {
    return Object.assign(super.getDefaults(), {
      attributes: new RefMap()
    });
  }
  /** Returns an instance attribute as an {@link Accessor}. */
  getAttribute(semantic) {
    return this.getRefMap('attributes', semantic);
  }
  /**
   * Sets an instance attribute to an {@link Accessor}. All attributes must have the same
   * instance count.
   */
  setAttribute(semantic, accessor) {
    return this.setRefMap('attributes', semantic, accessor, {
      usage: INSTANCE_ATTRIBUTE
    });
  }
  /**
   * Lists all instance attributes {@link Accessor}s associated with the InstancedMesh. Order
   * will be consistent with the order returned by {@link .listSemantics}().
   */
  listAttributes() {
    return this.listRefMapValues('attributes');
  }
  /**
   * Lists all instance attribute semantics associated with the primitive. Order will be
   * consistent with the order returned by {@link .listAttributes}().
   */
  listSemantics() {
    return this.listRefMapKeys('attributes');
  }
}
InstancedMesh.EXTENSION_NAME = EXT_MESH_GPU_INSTANCING;

const NAME$o = EXT_MESH_GPU_INSTANCING;
/**
 * [`EXT_mesh_gpu_instancing`](https://github.com/KhronosGroup/glTF/tree/master/extensions/2.0/Vendor/EXT_mesh_gpu_instancing/)
 * prepares mesh data for efficient GPU instancing.
 *
 * GPU instancing allows engines to render many copies of a single mesh at once using a small number
 * of draw calls. Instancing is particularly useful for things like trees, grass, road signs, etc.
 * Keep in mind that predefined batches, as used in this extension, may prevent frustum culling
 * within a batch. Dividing batches into collocated cells may be preferable to using a single large
 * batch.
 *
 * > _**NOTICE:** While this extension stores mesh data optimized for GPU instancing, it
 * > is important to note that (1) GPU instancing and other optimizations are possible — and
 * > encouraged — even without this extension, and (2) other common meanings of the term
 * > "instancing" exist, distinct from this extension. See
 * > [Appendix: Motivation and Purpose](https://github.com/KhronosGroup/glTF/tree/master/extensions/2.0/Vendor/EXT_mesh_gpu_instancing#appendix-motivation-and-purpose)
 * > of the `EXT_mesh_gpu_instancing` specification._
 *
 * Properties:
 * - {@link InstancedMesh}
 *
 * ### Example
 *
 * The `EXTMeshGPUInstancing` class provides a single {@link ExtensionProperty} type, `InstancedMesh`,
 * which may be attached to any {@link Node} instance. For example:
 *
 * ```typescript
 * import { EXTMeshGPUInstancing } from '@gltf-transform/extensions';
 *
 * // Create standard mesh, node, and scene hierarchy.
 * // ...
 *
 * // Assign positions for each instance.
 * const batchPositions = doc.createAccessor('instance_positions')
 * 	.setArray(new Float32Array([
 * 		0, 0, 0,
 * 		1, 0, 0,
 * 		2, 0, 0,
 * 	]))
 * 	.setType(Accessor.Type.VEC3)
 * 	.setBuffer(buffer);
 *
 * // Assign IDs for each instance.
 * const batchIDs = doc.createAccessor('instance_ids')
 * 	.setArray(new Uint8Array([0, 1, 2]))
 * 	.setType(Accessor.Type.SCALAR)
 * 	.setBuffer(buffer);
 *
 * // Create an Extension attached to the Document.
 * const batchExtension = document.createExtension(EXTMeshGPUInstancing)
 * 	.setRequired(true);
 * const batch = batchExtension.createInstancedMesh()
 * 	.setAttribute('TRANSLATION', batchPositions)
 * 	.setAttribute('_ID', batchIDs);
 *
 * node
 * 	.setMesh(mesh)
 * 	.setExtension('EXT_mesh_gpu_instancing', batch);
 * ```
 *
 * Standard instance attributes are `TRANSLATION`, `ROTATION`, and `SCALE`, and support the accessor
 * types allowed by the extension specification. Custom instance attributes are allowed, and should
 * be prefixed with an underscore (`_*`).
 */
class EXTMeshGPUInstancing extends Extension {
  constructor(...args) {
    super(...args);
    this.extensionName = NAME$o;
    /** @hidden */
    this.provideTypes = [PropertyType.NODE];
    /** @hidden */
    this.prewriteTypes = [PropertyType.ACCESSOR];
  }
  /** Creates a new InstancedMesh property for use on a {@link Node}. */
  createInstancedMesh() {
    return new InstancedMesh(this.document.getGraph());
  }
  /** @hidden */
  read(context) {
    const jsonDoc = context.jsonDoc;
    const nodeDefs = jsonDoc.json.nodes || [];
    nodeDefs.forEach((nodeDef, nodeIndex) => {
      if (!nodeDef.extensions || !nodeDef.extensions[NAME$o]) return;
      const instancedMeshDef = nodeDef.extensions[NAME$o];
      const instancedMesh = this.createInstancedMesh();
      for (const semantic in instancedMeshDef.attributes) {
        instancedMesh.setAttribute(semantic, context.accessors[instancedMeshDef.attributes[semantic]]);
      }
      context.nodes[nodeIndex].setExtension(NAME$o, instancedMesh);
    });
    return this;
  }
  /** @hidden */
  prewrite(context) {
    // Set usage for instance attribute accessors, so they are stored in separate buffer
    // views grouped by parent reference.
    context.accessorUsageGroupedByParent.add(INSTANCE_ATTRIBUTE);
    for (const prop of this.properties) {
      for (const attribute of prop.listAttributes()) {
        context.addAccessorToUsageGroup(attribute, INSTANCE_ATTRIBUTE);
      }
    }
    return this;
  }
  /** @hidden */
  write(context) {
    const jsonDoc = context.jsonDoc;
    this.document.getRoot().listNodes().forEach(node => {
      const instancedMesh = node.getExtension(NAME$o);
      if (instancedMesh) {
        const nodeIndex = context.nodeIndexMap.get(node);
        const nodeDef = jsonDoc.json.nodes[nodeIndex];
        const instancedMeshDef = {
          attributes: {}
        };
        instancedMesh.listSemantics().forEach(semantic => {
          const attribute = instancedMesh.getAttribute(semantic);
          instancedMeshDef.attributes[semantic] = context.accessorIndexMap.get(attribute);
        });
        nodeDef.extensions = nodeDef.extensions || {};
        nodeDef.extensions[NAME$o] = instancedMeshDef;
      }
    });
    return this;
  }
}
EXTMeshGPUInstancing.EXTENSION_NAME = NAME$o;

function _extends$1() {
  _extends$1 = Object.assign ? Object.assign.bind() : function (target) {
    for (var i = 1; i < arguments.length; i++) {
      var source = arguments[i];
      for (var key in source) {
        if (Object.prototype.hasOwnProperty.call(source, key)) {
          target[key] = source[key];
        }
      }
    }
    return target;
  };
  return _extends$1.apply(this, arguments);
}

var EncoderMethod$1;
(function (EncoderMethod) {
  EncoderMethod["QUANTIZE"] = "quantize";
  EncoderMethod["FILTER"] = "filter";
})(EncoderMethod$1 || (EncoderMethod$1 = {}));
var MeshoptMode;
(function (MeshoptMode) {
  MeshoptMode["ATTRIBUTES"] = "ATTRIBUTES";
  MeshoptMode["TRIANGLES"] = "TRIANGLES";
  MeshoptMode["INDICES"] = "INDICES";
})(MeshoptMode || (MeshoptMode = {}));
var MeshoptFilter;
(function (MeshoptFilter) {
  /** No filter — quantize only. */
  MeshoptFilter["NONE"] = "NONE";
  /** Four 8- or 16-bit normalized values. */
  MeshoptFilter["OCTAHEDRAL"] = "OCTAHEDRAL";
  /** Four 16-bit normalized values. */
  MeshoptFilter["QUATERNION"] = "QUATERNION";
  /** K single-precision floating point values. */
  MeshoptFilter["EXPONENTIAL"] = "EXPONENTIAL";
})(MeshoptFilter || (MeshoptFilter = {}));

const {
  BYTE,
  SHORT,
  FLOAT: FLOAT$1
} = Accessor.ComponentType;
const {
  encodeNormalizedInt,
  decodeNormalizedInt
} = MathUtils;
/** Pre-processes array with required filters or padding. */
function prepareAccessor(accessor, encoder, mode, filterOptions) {
  const {
    filter,
    bits
  } = filterOptions;
  const result = {
    array: accessor.getArray(),
    byteStride: accessor.getElementSize() * accessor.getComponentSize(),
    componentType: accessor.getComponentType(),
    normalized: accessor.getNormalized()
  };
  if (mode !== MeshoptMode.ATTRIBUTES) return result;
  if (filter !== MeshoptFilter.NONE) {
    let array = accessor.getNormalized() ? decodeNormalizedIntArray(accessor) : new Float32Array(result.array);
    switch (filter) {
      case MeshoptFilter.EXPONENTIAL:
        // → K single-precision floating point values.
        result.byteStride = accessor.getElementSize() * 4;
        result.componentType = FLOAT$1;
        result.normalized = false;
        result.array = encoder.encodeFilterExp(array, accessor.getCount(), result.byteStride, bits);
        break;
      case MeshoptFilter.OCTAHEDRAL:
        // → four 8- or 16-bit normalized values.
        result.byteStride = bits > 8 ? 8 : 4;
        result.componentType = bits > 8 ? SHORT : BYTE;
        result.normalized = true;
        array = accessor.getElementSize() === 3 ? padNormals(array) : array;
        result.array = encoder.encodeFilterOct(array, accessor.getCount(), result.byteStride, bits);
        break;
      case MeshoptFilter.QUATERNION:
        // → four 16-bit normalized values.
        result.byteStride = 8;
        result.componentType = SHORT;
        result.normalized = true;
        result.array = encoder.encodeFilterQuat(array, accessor.getCount(), result.byteStride, bits);
        break;
      default:
        throw new Error('Invalid filter.');
    }
    result.min = accessor.getMin([]);
    result.max = accessor.getMax([]);
    if (accessor.getNormalized()) {
      result.min = result.min.map(v => decodeNormalizedInt(v, accessor.getComponentType()));
      result.max = result.max.map(v => decodeNormalizedInt(v, accessor.getComponentType()));
    }
    if (result.normalized) {
      result.min = result.min.map(v => encodeNormalizedInt(v, result.componentType));
      result.max = result.max.map(v => encodeNormalizedInt(v, result.componentType));
    }
  } else if (result.byteStride % 4) {
    result.array = padArrayElements(result.array, accessor.getElementSize());
    result.byteStride = result.array.byteLength / accessor.getCount();
  }
  return result;
}
function decodeNormalizedIntArray(attribute) {
  const componentType = attribute.getComponentType();
  const srcArray = attribute.getArray();
  const dstArray = new Float32Array(srcArray.length);
  for (let i = 0; i < srcArray.length; i++) {
    dstArray[i] = decodeNormalizedInt(srcArray[i], componentType);
  }
  return dstArray;
}
/** Pads array to 4 byte alignment, required for Meshopt ATTRIBUTE buffer views. */
function padArrayElements(srcArray, elementSize) {
  const byteStride = BufferUtils.padNumber(srcArray.BYTES_PER_ELEMENT * elementSize);
  const elementStride = byteStride / srcArray.BYTES_PER_ELEMENT;
  const elementCount = srcArray.length / elementSize;
  const dstArray = new srcArray.constructor(elementCount * elementStride);
  for (let i = 0; i * elementSize < srcArray.length; i++) {
    for (let j = 0; j < elementSize; j++) {
      dstArray[i * elementStride + j] = srcArray[i * elementSize + j];
    }
  }
  return dstArray;
}
/** Pad normals with a .w component for octahedral encoding. */
function padNormals(srcArray) {
  const dstArray = new Float32Array(srcArray.length * 4 / 3);
  for (let i = 0, il = srcArray.length / 3; i < il; i++) {
    dstArray[i * 4] = srcArray[i * 3];
    dstArray[i * 4 + 1] = srcArray[i * 3 + 1];
    dstArray[i * 4 + 2] = srcArray[i * 3 + 2];
  }
  return dstArray;
}
function getMeshoptMode(accessor, usage) {
  if (usage === WriterContext.BufferViewUsage.ELEMENT_ARRAY_BUFFER) {
    const isTriangles = accessor.listParents().some(parent => {
      return parent instanceof Primitive && parent.getMode() === Primitive.Mode.TRIANGLES;
    });
    return isTriangles ? MeshoptMode.TRIANGLES : MeshoptMode.INDICES;
  }
  return MeshoptMode.ATTRIBUTES;
}
function getMeshoptFilter(accessor, doc) {
  const refs = doc.getGraph().listParentEdges(accessor).filter(edge => !(edge.getParent() instanceof Root));
  for (const ref of refs) {
    const refName = ref.getName();
    const refKey = ref.getAttributes().key || '';
    const isDelta = ref.getParent().propertyType === PropertyType.PRIMITIVE_TARGET;
    // Indices.
    if (refName === 'indices') return {
      filter: MeshoptFilter.NONE
    };
    // Attributes.
    //
    // NOTES:
    // - Vertex attributes should be filtered IFF they are _not_ quantized in
    //   'packages/cli/src/transforms/meshopt.ts'.
    // - POSITION and TEXCOORD_0 could use exponential filtering, but this produces broken
    //   output in some cases (e.g. Matilda.glb), for unknown reasons. gltfpack uses manual
    //   quantization for these attributes.
    // - NORMAL and TANGENT attributes use Octahedral filters, but deltas in morphs do not.
    // - When specifying bit depth for vertex attributes, check the defaults in `quantize.ts`
    //	 and overrides in `meshopt.ts`. Don't store deltas at higher precision than base.
    if (refName === 'attributes') {
      if (refKey === 'POSITION') return {
        filter: MeshoptFilter.NONE
      };
      if (refKey === 'TEXCOORD_0') return {
        filter: MeshoptFilter.NONE
      };
      if (refKey.startsWith('JOINTS_')) return {
        filter: MeshoptFilter.NONE
      };
      if (refKey.startsWith('WEIGHTS_')) return {
        filter: MeshoptFilter.NONE
      };
      if (refKey === 'NORMAL' || refKey === 'TANGENT') {
        return isDelta ? {
          filter: MeshoptFilter.NONE
        } : {
          filter: MeshoptFilter.OCTAHEDRAL,
          bits: 8
        };
      }
    }
    // Animation.
    if (refName === 'output') {
      const targetPath = getTargetPath(accessor);
      if (targetPath === 'rotation') return {
        filter: MeshoptFilter.QUATERNION,
        bits: 16
      };
      if (targetPath === 'translation') return {
        filter: MeshoptFilter.EXPONENTIAL,
        bits: 12
      };
      if (targetPath === 'scale') return {
        filter: MeshoptFilter.EXPONENTIAL,
        bits: 12
      };
      return {
        filter: MeshoptFilter.NONE
      };
    }
    // See: https://github.com/donmccurdy/glTF-Transform/issues/489
    if (refName === 'input') return {
      filter: MeshoptFilter.NONE
    };
    if (refName === 'inverseBindMatrices') return {
      filter: MeshoptFilter.NONE
    };
  }
  return {
    filter: MeshoptFilter.NONE
  };
}
function getTargetPath(accessor) {
  for (const sampler of accessor.listParents()) {
    if (!(sampler instanceof AnimationSampler)) continue;
    for (const channel of sampler.listParents()) {
      if (!(channel instanceof AnimationChannel)) continue;
      return channel.getTargetPath();
    }
  }
  return null;
}

/**
 * Returns true for a fallback buffer, else false.
 *
 *   - All references to the fallback buffer must come from bufferViews that
 *     have a EXT_meshopt_compression extension specified.
 *   - No references to the fallback buffer may come from
 *     EXT_meshopt_compression extension JSON.
 */
function isFallbackBuffer(bufferDef) {
  if (!bufferDef.extensions || !bufferDef.extensions[EXT_MESHOPT_COMPRESSION]) return false;
  const fallbackDef = bufferDef.extensions[EXT_MESHOPT_COMPRESSION];
  return !!fallbackDef.fallback;
}

const NAME$n$1 = EXT_MESHOPT_COMPRESSION;
const DEFAULT_ENCODER_OPTIONS$1 = {
  method: EncoderMethod$1.QUANTIZE
};
/**
 * [`EXT_meshopt_compression`](https://github.com/KhronosGroup/gltf/blob/main/extensions/2.0/Vendor/EXT_meshopt_compression/)
 * provides compression and fast decoding for geometry, morph targets, and animations.
 *
 * Meshopt compression (based on the [meshoptimizer](https://github.com/zeux/meshoptimizer)
 * library) offers a lightweight decoder with very fast runtime decompression, and is
 * appropriate for models of any size. Meshopt can reduce the transmission sizes of geometry,
 * morph targets, animation, and other numeric data stored in buffer views. When textures are
 * large, other complementary compression methods should be used as well.
 *
 * For the full benefits of meshopt compression, **apply gzip, brotli, or another lossless
 * compression method** to the resulting .glb, .gltf, or .bin files. Meshopt specifically
 * pre-optimizes assets for this purpose — without this secondary compression, the size
 * reduction is considerably less.
 *
 * Be aware that decompression happens before uploading to the GPU. While Meshopt decoding is
 * considerably faster than Draco decoding, neither compression method will improve runtime
 * performance directly. To improve framerate, you'll need to simplify the geometry by reducing
 * vertex count or draw calls — not just compress it. Finally, be aware that Meshopt compression is
 * lossy: repeatedly compressing and decompressing a model in a pipeline will lose precision, so
 * compression should generally be the last stage of an art workflow, and uncompressed original
 * files should be kept.
 *
 * The meshoptimizer library ([github](https://github.com/zeux/meshoptimizer/tree/master/js),
 * [npm](https://www.npmjs.com/package/meshoptimizer)) is a required dependency for reading or
 * writing files, and must be provided by the application. Compression may alternatively be applied
 * with the [gltfpack](https://github.com/zeux/meshoptimizer/tree/master/gltf) tool.
 *
 * ### Example
 *
 * ```typescript
 * import { NodeIO } from '@gltf-transform/core';
 * import { reorder, quantize } from '@gltf-transform/functions';
 * import { EXTMeshoptCompression } from '@gltf-transform/extensions';
 * import { MeshoptDecoder, MeshoptEncoder } from 'meshoptimizer';
 *
 * await MeshoptDecoder.ready;
 * await MeshoptEncoder.ready;
 *
 * const io = new NodeIO()
 *	.registerExtensions([EXTMeshoptCompression])
 *	.registerDependencies({
 *		'meshopt.decoder': MeshoptDecoder,
 *		'meshopt.encoder': MeshoptEncoder,
 *	});
 *
 * // Read and decode.
 * const document = await io.read('compressed.glb');
 *
 * // Write and encode. (Medium, -c)
 * await document.transform(
 * 	reorder({encoder: MeshoptEncoder}),
 * 	quantize()
 * );
 * document.createExtension(EXTMeshoptCompression)
 * 	.setRequired(true)
 * 	.setEncoderOptions({ method: EXTMeshoptCompression.EncoderMethod.QUANTIZE });
 * await io.write('compressed-medium.glb', document);
 *
 * // Write and encode. (High, -cc)
 * await document.transform(
 * 	reorder({encoder: MeshoptEncoder}),
 * 	quantize({pattern: /^(POSITION|TEXCOORD|JOINTS|WEIGHTS)(_\d+)?$/}),
 * );
 * document.createExtension(EXTMeshoptCompression)
 * 	.setRequired(true)
 * 	.setEncoderOptions({ method: EXTMeshoptCompression.EncoderMethod.FILTER });
 * await io.write('compressed-high.glb', document);
 * ```
 */
class EXTMeshoptCompression extends Extension {
  constructor(...args) {
    super(...args);
    this.extensionName = NAME$n$1;
    /** @hidden */
    this.prereadTypes = [PropertyType.BUFFER, PropertyType.PRIMITIVE];
    /** @hidden */
    this.prewriteTypes = [PropertyType.BUFFER, PropertyType.ACCESSOR];
    /** @hidden */
    this.readDependencies = ['meshopt.decoder'];
    /** @hidden */
    this.writeDependencies = ['meshopt.encoder'];
    this._decoder = null;
    this._decoderFallbackBufferMap = new Map();
    this._encoder = null;
    this._encoderOptions = DEFAULT_ENCODER_OPTIONS$1;
    this._encoderFallbackBuffer = null;
    this._encoderBufferViews = {};
    this._encoderBufferViewData = {};
    this._encoderBufferViewAccessors = {};
  }
  /** @hidden */
  install(key, dependency) {
    if (key === 'meshopt.decoder') {
      this._decoder = dependency;
    }
    if (key === 'meshopt.encoder') {
      this._encoder = dependency;
    }
    return this;
  }
  /**
   * Configures Meshopt options for quality/compression tuning. The two methods rely on different
   * pre-processing before compression, and should be compared on the basis of (a) quality/loss
   * and (b) final asset size after _also_ applying a lossless compression such as gzip or brotli.
   *
   * - QUANTIZE: Default. Pre-process with {@link quantize quantize()} (lossy to specified
   * 	precision) before applying lossless Meshopt compression. Offers a considerable compression
   * 	ratio with or without further supercompression. Equivalent to `gltfpack -c`.
   * - FILTER: Pre-process with lossy filters to improve compression, before applying lossless
   *	Meshopt compression. While output may initially be larger than with the QUANTIZE method,
   *	this method will benefit more from supercompression (e.g. gzip or brotli). Equivalent to
   * 	`gltfpack -cc`.
   *
   * Output with the FILTER method will generally be smaller after supercompression (e.g. gzip or
   * brotli) is applied, but may be larger than QUANTIZE output without it. Decoding is very fast
   * with both methods.
   *
   * Example:
   *
   * ```ts
   * import { EXTMeshoptCompression } from '@gltf-transform/extensions';
   *
   * doc.createExtension(EXTMeshoptCompression)
   * 	.setRequired(true)
   * 	.setEncoderOptions({
   * 		method: EXTMeshoptCompression.EncoderMethod.QUANTIZE
   * 	});
   * ```
   */
  setEncoderOptions(options) {
    this._encoderOptions = _extends$1({}, DEFAULT_ENCODER_OPTIONS$1, options);
    return this;
  }
  /**********************************************************************************************
   * Decoding.
   */
  /** @internal Checks preconditions, decodes buffer views, and creates decoded primitives. */
  preread(context, propertyType) {
    if (!this._decoder) {
      if (!this.isRequired()) return this;
      throw new Error(`[${NAME$n$1}] Please install extension dependency, "meshopt.decoder".`);
    }
    if (!this._decoder.supported) {
      if (!this.isRequired()) return this;
      throw new Error(`[${NAME$n$1}]: Missing WASM support.`);
    }
    if (propertyType === PropertyType.BUFFER) {
      this._prereadBuffers(context);
    } else if (propertyType === PropertyType.PRIMITIVE) {
      this._prereadPrimitives(context);
    }
    return this;
  }
  /** @internal Decode buffer views. */
  _prereadBuffers(context) {
    const jsonDoc = context.jsonDoc;
    const viewDefs = jsonDoc.json.bufferViews || [];
    viewDefs.forEach((viewDef, index) => {
      if (!viewDef.extensions || !viewDef.extensions[NAME$n$1]) return;
      const meshoptDef = viewDef.extensions[NAME$n$1];
      const byteOffset = meshoptDef.byteOffset || 0;
      const byteLength = meshoptDef.byteLength || 0;
      const count = meshoptDef.count;
      const stride = meshoptDef.byteStride;
      const result = new Uint8Array(count * stride);
      const bufferDef = jsonDoc.json.buffers[meshoptDef.buffer];
      // TODO(cleanup): Should be encapsulated in writer-context.ts.
      const resource = bufferDef.uri ? jsonDoc.resources[bufferDef.uri] : jsonDoc.resources[GLB_BUFFER];
      const source = BufferUtils.toView(resource, byteOffset, byteLength);
      this._decoder.decodeGltfBuffer(result, count, stride, source, meshoptDef.mode, meshoptDef.filter);
      context.bufferViews[index] = result;
    });
  }
  /**
   * Mark fallback buffers and replacements.
   *
   * Note: Alignment with primitives is arbitrary; this just needs to happen
   * after Buffers have been parsed.
   * @internal
   */
  _prereadPrimitives(context) {
    const jsonDoc = context.jsonDoc;
    const viewDefs = jsonDoc.json.bufferViews || [];
    //
    viewDefs.forEach(viewDef => {
      if (!viewDef.extensions || !viewDef.extensions[NAME$n$1]) return;
      const meshoptDef = viewDef.extensions[NAME$n$1];
      const buffer = context.buffers[meshoptDef.buffer];
      const fallbackBuffer = context.buffers[viewDef.buffer];
      const fallbackBufferDef = jsonDoc.json.buffers[viewDef.buffer];
      if (isFallbackBuffer(fallbackBufferDef)) {
        this._decoderFallbackBufferMap.set(fallbackBuffer, buffer);
      }
    });
  }
  /** @hidden Removes Fallback buffers, if extension is required. */
  read(_context) {
    if (!this.isRequired()) return this;
    // Replace fallback buffers.
    for (const [fallbackBuffer, buffer] of this._decoderFallbackBufferMap) {
      for (const parent of fallbackBuffer.listParents()) {
        if (parent instanceof Accessor) {
          parent.swap(fallbackBuffer, buffer);
        }
      }
      fallbackBuffer.dispose();
    }
    return this;
  }
  /**********************************************************************************************
   * Encoding.
   */
  /** @internal Claims accessors that can be compressed and writes compressed buffer views. */
  prewrite(context, propertyType) {
    if (propertyType === PropertyType.ACCESSOR) {
      this._prewriteAccessors(context);
    } else if (propertyType === PropertyType.BUFFER) {
      this._prewriteBuffers(context);
    }
    return this;
  }
  /** @internal Claims accessors that can be compressed. */
  _prewriteAccessors(context) {
    const json = context.jsonDoc.json;
    const encoder = this._encoder;
    const options = this._encoderOptions;
    const graph = this.document.getGraph();
    const fallbackBuffer = this.document.createBuffer(); // Disposed on write.
    const fallbackBufferIndex = this.document.getRoot().listBuffers().indexOf(fallbackBuffer);
    let nextID = 1;
    const parentToID = new Map();
    const getParentID = property => {
      for (const parent of graph.listParents(property)) {
        if (parent.propertyType === PropertyType.ROOT) continue;
        let id = parentToID.get(property);
        if (id === undefined) parentToID.set(property, id = nextID++);
        return id;
      }
      return -1;
    };
    this._encoderFallbackBuffer = fallbackBuffer;
    this._encoderBufferViews = {};
    this._encoderBufferViewData = {};
    this._encoderBufferViewAccessors = {};
    for (const accessor of this.document.getRoot().listAccessors()) {
      // See: https://github.com/donmccurdy/glTF-Transform/pull/323#issuecomment-898791251
      // Example: https://skfb.ly/6qAD8
      if (getTargetPath(accessor) === 'weights') continue;
      // See: https://github.com/donmccurdy/glTF-Transform/issues/289
      if (accessor.getSparse()) continue;
      const usage = context.getAccessorUsage(accessor);
      const parentID = context.accessorUsageGroupedByParent.has(usage) ? getParentID(accessor) : null;
      const mode = getMeshoptMode(accessor, usage);
      const filter = options.method === EncoderMethod$1.FILTER ? getMeshoptFilter(accessor, this.document) : {
        filter: MeshoptFilter.NONE
      };
      const preparedAccessor = prepareAccessor(accessor, encoder, mode, filter);
      const {
        array,
        byteStride
      } = preparedAccessor;
      const buffer = accessor.getBuffer();
      if (!buffer) throw new Error(`${NAME$n$1}: Missing buffer for accessor.`);
      const bufferIndex = this.document.getRoot().listBuffers().indexOf(buffer);
      // Buffer view grouping key.
      const key = [usage, parentID, mode, filter.filter, byteStride, bufferIndex].join(':');
      let bufferView = this._encoderBufferViews[key];
      let bufferViewData = this._encoderBufferViewData[key];
      let bufferViewAccessors = this._encoderBufferViewAccessors[key];
      // Write new buffer view, if needed.
      if (!bufferView || !bufferViewData) {
        bufferViewAccessors = this._encoderBufferViewAccessors[key] = [];
        bufferViewData = this._encoderBufferViewData[key] = [];
        bufferView = this._encoderBufferViews[key] = {
          buffer: fallbackBufferIndex,
          target: WriterContext.USAGE_TO_TARGET[usage],
          byteOffset: 0,
          byteLength: 0,
          byteStride: usage === WriterContext.BufferViewUsage.ARRAY_BUFFER ? byteStride : undefined,
          extensions: {
            [NAME$n$1]: {
              buffer: bufferIndex,
              byteOffset: 0,
              byteLength: 0,
              mode: mode,
              filter: filter.filter !== MeshoptFilter.NONE ? filter.filter : undefined,
              byteStride: byteStride,
              count: 0
            }
          }
        };
      }
      // Write accessor.
      const accessorDef = context.createAccessorDef(accessor);
      accessorDef.componentType = preparedAccessor.componentType;
      accessorDef.normalized = preparedAccessor.normalized;
      accessorDef.byteOffset = bufferView.byteLength;
      if (accessorDef.min && preparedAccessor.min) accessorDef.min = preparedAccessor.min;
      if (accessorDef.max && preparedAccessor.max) accessorDef.max = preparedAccessor.max;
      context.accessorIndexMap.set(accessor, json.accessors.length);
      json.accessors.push(accessorDef);
      bufferViewAccessors.push(accessorDef);
      // Update buffer view.
      bufferViewData.push(new Uint8Array(array.buffer, array.byteOffset, array.byteLength));
      bufferView.byteLength += array.byteLength;
      bufferView.extensions.EXT_meshopt_compression.count += accessor.getCount();
    }
  }
  /** @internal Writes compressed buffer views. */
  _prewriteBuffers(context) {
    const encoder = this._encoder;
    for (const key in this._encoderBufferViews) {
      const bufferView = this._encoderBufferViews[key];
      const bufferViewData = this._encoderBufferViewData[key];
      const buffer = this.document.getRoot().listBuffers()[bufferView.extensions[NAME$n$1].buffer];
      const otherBufferViews = context.otherBufferViews.get(buffer) || [];
      const {
        count,
        byteStride,
        mode
      } = bufferView.extensions[NAME$n$1];
      const srcArray = BufferUtils.concat(bufferViewData);
      const dstArray = encoder.encodeGltfBuffer(srcArray, count, byteStride, mode);
      const compressedData = BufferUtils.pad(dstArray);
      bufferView.extensions[NAME$n$1].byteLength = dstArray.byteLength;
      bufferViewData.length = 0;
      bufferViewData.push(compressedData);
      otherBufferViews.push(compressedData);
      context.otherBufferViews.set(buffer, otherBufferViews);
    }
  }
  /** @hidden Puts encoded data into glTF output. */
  write(context) {
    let fallbackBufferByteOffset = 0;
    // Write final encoded buffer view properties.
    for (const key in this._encoderBufferViews) {
      const bufferView = this._encoderBufferViews[key];
      const bufferViewData = this._encoderBufferViewData[key][0];
      const bufferViewIndex = context.otherBufferViewsIndexMap.get(bufferViewData);
      const bufferViewAccessors = this._encoderBufferViewAccessors[key];
      for (const accessorDef of bufferViewAccessors) {
        accessorDef.bufferView = bufferViewIndex;
      }
      const finalBufferViewDef = context.jsonDoc.json.bufferViews[bufferViewIndex];
      const compressedByteOffset = finalBufferViewDef.byteOffset || 0;
      Object.assign(finalBufferViewDef, bufferView);
      finalBufferViewDef.byteOffset = fallbackBufferByteOffset;
      const bufferViewExtensionDef = finalBufferViewDef.extensions[NAME$n$1];
      bufferViewExtensionDef.byteOffset = compressedByteOffset;
      fallbackBufferByteOffset += BufferUtils.padNumber(bufferView.byteLength);
    }
    // Write final fallback buffer.
    const fallbackBuffer = this._encoderFallbackBuffer;
    const fallbackBufferIndex = context.bufferIndexMap.get(fallbackBuffer);
    const fallbackBufferDef = context.jsonDoc.json.buffers[fallbackBufferIndex];
    fallbackBufferDef.byteLength = fallbackBufferByteOffset;
    fallbackBufferDef.extensions = {
      [NAME$n$1]: {
        fallback: true
      }
    };
    fallbackBuffer.dispose();
    return this;
  }
}
EXTMeshoptCompression.EXTENSION_NAME = NAME$n$1;
EXTMeshoptCompression.EncoderMethod = EncoderMethod$1;

const NAME$m$1 = EXT_TEXTURE_AVIF;
class AVIFImageUtils {
  match(array) {
    return array.length >= 12 && BufferUtils.decodeText(array.slice(4, 12)) === 'ftypavif';
  }
  /**
   * Probes size of AVIF or HEIC image. Assumes a single static image, without
   * orientation or other metadata that would affect dimensions.
   */
  getSize(array) {
    if (!this.match(array)) return null;
    // References:
    // - https://stackoverflow.com/questions/66222773/how-to-get-image-dimensions-from-an-avif-file
    // - https://github.com/nodeca/probe-image-size/blob/master/lib/parse_sync/avif.js
    const view = new DataView(array.buffer, array.byteOffset, array.byteLength);
    let box = unbox(view, 0);
    if (!box) return null;
    let offset = box.end;
    while (box = unbox(view, offset)) {
      if (box.type === 'meta') {
        offset = box.start + 4; // version + flags
      } else if (box.type === 'iprp' || box.type === 'ipco') {
        offset = box.start;
      } else if (box.type === 'ispe') {
        return [view.getUint32(box.start + 4), view.getUint32(box.start + 8)];
      } else if (box.type === 'mdat') {
        break; // mdat should be last, unlikely to find metadata past here.
      } else {
        offset = box.end;
      }
    }
    return null;
  }
  getChannels(_buffer) {
    return 4;
  }
}
/**
 * [`EXT_texture_avif`](https://github.com/KhronosGroup/glTF/tree/master/extensions/2.0/Vendor/EXT_texture_avif/)
 * enables AVIF images for any material texture.
 *
 * AVIF offers greatly reduced transmission size, but
 * [requires browser support](https://caniuse.com/avif). Like PNG and JPEG, an AVIF image is
 * *fully decompressed* when uploaded to the GPU, which increases upload time and GPU memory cost.
 * For seamless uploads and minimal GPU memory cost, it is necessary to use a GPU texture format
 * like Basis Universal, with the `KHR_texture_basisu` extension.
 *
 * Defining no {@link ExtensionProperty} types, this {@link Extension} is simply attached to the
 * {@link Document}, and affects the entire Document by allowing use of the `image/avif` MIME type
 * and passing AVIF image data to the {@link Texture.setImage} method. Without the Extension, the
 * same MIME types and image data would yield an invalid glTF document, under the stricter core glTF
 * specification.
 *
 * Properties:
 * - N/A
 *
 * ### Example
 *
 * ```typescript
 * import { TextureAVIF } from '@gltf-transform/extensions';
 *
 * // Create an Extension attached to the Document.
 * const avifExtension = document.createExtension(TextureAVIF)
 * 	.setRequired(true);
 * document.createTexture('MyAVIFTexture')
 * 	.setMimeType('image/avif')
 * 	.setImage(fs.readFileSync('my-texture.avif'));
 * ```
 *
 * AVIF conversion is not done automatically when adding the extension as shown above — you must
 * convert the image data first, then pass the `.avif` payload to {@link Texture.setImage}.
 *
 * When the `EXT_texture_avif` extension is added to a file by glTF-Transform, the extension should
 * always be required. This tool does not support writing assets that "fall back" to optional PNG or
 * JPEG image data.
 */
class EXTTextureAVIF extends Extension {
  constructor(...args) {
    super(...args);
    this.extensionName = NAME$m$1;
    /** @hidden */
    this.prereadTypes = [PropertyType.TEXTURE];
  }
  /** @hidden */
  static register() {
    ImageUtils.registerFormat('image/avif', new AVIFImageUtils());
  }
  /** @hidden */
  preread(context) {
    const textureDefs = context.jsonDoc.json.textures || [];
    textureDefs.forEach(textureDef => {
      if (textureDef.extensions && textureDef.extensions[NAME$m$1]) {
        textureDef.source = textureDef.extensions[NAME$m$1].source;
      }
    });
    return this;
  }
  /** @hidden */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  read(context) {
    return this;
  }
  /** @hidden */
  write(context) {
    const jsonDoc = context.jsonDoc;
    this.document.getRoot().listTextures().forEach(texture => {
      if (texture.getMimeType() === 'image/avif') {
        const imageIndex = context.imageIndexMap.get(texture);
        const textureDefs = jsonDoc.json.textures || [];
        textureDefs.forEach(textureDef => {
          if (textureDef.source === imageIndex) {
            textureDef.extensions = textureDef.extensions || {};
            textureDef.extensions[NAME$m$1] = {
              source: textureDef.source
            };
            delete textureDef.source;
          }
        });
      }
    });
    return this;
  }
}
EXTTextureAVIF.EXTENSION_NAME = NAME$m$1;
function unbox(data, offset) {
  if (data.byteLength < 4 + offset) return null;
  // size includes first 4 bytes (length)
  const size = data.getUint32(offset);
  if (data.byteLength < size + offset || size < 8) return null;
  return {
    type: BufferUtils.decodeText(new Uint8Array(data.buffer, data.byteOffset + offset + 4, 4)),
    start: offset + 8,
    end: offset + size
  };
}

const NAME$l$1 = EXT_TEXTURE_WEBP;
class WEBPImageUtils {
  match(array) {
    return array.length >= 12 && array[8] === 87 && array[9] === 69 && array[10] === 66 && array[11] === 80;
  }
  getSize(array) {
    // Reference: http://tools.ietf.org/html/rfc6386
    const RIFF = BufferUtils.decodeText(array.slice(0, 4));
    const WEBP = BufferUtils.decodeText(array.slice(8, 12));
    if (RIFF !== 'RIFF' || WEBP !== 'WEBP') return null;
    const view = new DataView(array.buffer, array.byteOffset);
    // Reference: https://wiki.tcl-lang.org/page/Reading+WEBP+image+dimensions
    let offset = 12;
    while (offset < view.byteLength) {
      const chunkId = BufferUtils.decodeText(new Uint8Array([view.getUint8(offset), view.getUint8(offset + 1), view.getUint8(offset + 2), view.getUint8(offset + 3)]));
      const chunkByteLength = view.getUint32(offset + 4, true);
      if (chunkId === 'VP8 ') {
        const width = view.getInt16(offset + 14, true) & 0x3fff;
        const height = view.getInt16(offset + 16, true) & 0x3fff;
        return [width, height];
      } else if (chunkId === 'VP8L') {
        const b0 = view.getUint8(offset + 9);
        const b1 = view.getUint8(offset + 10);
        const b2 = view.getUint8(offset + 11);
        const b3 = view.getUint8(offset + 12);
        const width = 1 + ((b1 & 0x3f) << 8 | b0);
        const height = 1 + ((b3 & 0xf) << 10 | b2 << 2 | (b1 & 0xc0) >> 6);
        return [width, height];
      }
      offset += 8 + chunkByteLength + chunkByteLength % 2;
    }
    return null;
  }
  getChannels(_buffer) {
    return 4;
  }
}
/**
 * [`EXT_texture_webp`](https://github.com/KhronosGroup/glTF/tree/master/extensions/2.0/Vendor/EXT_texture_webp/)
 * enables WebP images for any material texture.
 *
 * WebP offers greatly reduced transmission size, but
 * [requires browser support](https://caniuse.com/webp). Like PNG and JPEG, a WebP image is
 * *fully decompressed* when uploaded to the GPU, which increases upload time and GPU memory cost.
 * For seamless uploads and minimal GPU memory cost, it is necessary to use a GPU texture format
 * like Basis Universal, with the `KHR_texture_basisu` extension.
 *
 * Defining no {@link ExtensionProperty} types, this {@link Extension} is simply attached to the
 * {@link Document}, and affects the entire Document by allowing use of the `image/webp` MIME type
 * and passing WebP image data to the {@link Texture.setImage} method. Without the Extension, the
 * same MIME types and image data would yield an invalid glTF document, under the stricter core glTF
 * specification.
 *
 * Properties:
 * - N/A
 *
 * ### Example
 *
 * ```typescript
 * import { EXTTextureWebP } from '@gltf-transform/extensions';
 *
 * // Create an Extension attached to the Document.
 * const webpExtension = document.createExtension(EXTTextureWebP)
 * 	.setRequired(true);
 * document.createTexture('MyWebPTexture')
 * 	.setMimeType('image/webp')
 * 	.setImage(fs.readFileSync('my-texture.webp'));
 * ```
 *
 * WebP conversion is not done automatically when adding the extension as shown above — you must
 * convert the image data first, then pass the `.webp` payload to {@link Texture.setImage}.
 *
 * When the `EXT_texture_webp` extension is added to a file by glTF-Transform, the extension should
 * always be required. This tool does not support writing assets that "fall back" to optional PNG or
 * JPEG image data.
 */
class EXTTextureWebP extends Extension {
  constructor(...args) {
    super(...args);
    this.extensionName = NAME$l$1;
    /** @hidden */
    this.prereadTypes = [PropertyType.TEXTURE];
  }
  /** @hidden */
  static register() {
    ImageUtils.registerFormat('image/webp', new WEBPImageUtils());
  }
  /** @hidden */
  preread(context) {
    const textureDefs = context.jsonDoc.json.textures || [];
    textureDefs.forEach(textureDef => {
      if (textureDef.extensions && textureDef.extensions[NAME$l$1]) {
        textureDef.source = textureDef.extensions[NAME$l$1].source;
      }
    });
    return this;
  }
  /** @hidden */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  read(context) {
    return this;
  }
  /** @hidden */
  write(context) {
    const jsonDoc = context.jsonDoc;
    this.document.getRoot().listTextures().forEach(texture => {
      if (texture.getMimeType() === 'image/webp') {
        const imageIndex = context.imageIndexMap.get(texture);
        const textureDefs = jsonDoc.json.textures || [];
        textureDefs.forEach(textureDef => {
          if (textureDef.source === imageIndex) {
            textureDef.extensions = textureDef.extensions || {};
            textureDef.extensions[NAME$l$1] = {
              source: textureDef.source
            };
            delete textureDef.source;
          }
        });
      }
    });
    return this;
  }
}
EXTTextureWebP.EXTENSION_NAME = NAME$l$1;

const NAME$k = KHR_DRACO_MESH_COMPRESSION;
let decoderModule;
// Initialized when decoder module loads.
let COMPONENT_ARRAY;
let DATA_TYPE;
function decodeGeometry(decoder, data) {
  const buffer = new decoderModule.DecoderBuffer();
  try {
    buffer.Init(data, data.length);
    const geometryType = decoder.GetEncodedGeometryType(buffer);
    if (geometryType !== decoderModule.TRIANGULAR_MESH) {
      throw new Error(`[${NAME$k}] Unknown geometry type.`);
    }
    const dracoMesh = new decoderModule.Mesh();
    const status = decoder.DecodeBufferToMesh(buffer, dracoMesh);
    if (!status.ok() || dracoMesh.ptr === 0) {
      throw new Error(`[${NAME$k}] Decoding failure.`);
    }
    return dracoMesh;
  } finally {
    decoderModule.destroy(buffer);
  }
}
function decodeIndex(decoder, mesh) {
  const numFaces = mesh.num_faces();
  const numIndices = numFaces * 3;
  let ptr;
  let indices;
  if (mesh.num_points() <= 65534) {
    const byteLength = numIndices * Uint16Array.BYTES_PER_ELEMENT;
    ptr = decoderModule._malloc(byteLength);
    decoder.GetTrianglesUInt16Array(mesh, byteLength, ptr);
    indices = new Uint16Array(decoderModule.HEAPU16.buffer, ptr, numIndices).slice();
  } else {
    const byteLength = numIndices * Uint32Array.BYTES_PER_ELEMENT;
    ptr = decoderModule._malloc(byteLength);
    decoder.GetTrianglesUInt32Array(mesh, byteLength, ptr);
    indices = new Uint32Array(decoderModule.HEAPU32.buffer, ptr, numIndices).slice();
  }
  decoderModule._free(ptr);
  return indices;
}
function decodeAttribute(decoder, mesh, attribute, accessorDef) {
  const dataType = DATA_TYPE[accessorDef.componentType];
  const ArrayCtor = COMPONENT_ARRAY[accessorDef.componentType];
  const numComponents = attribute.num_components();
  const numPoints = mesh.num_points();
  const numValues = numPoints * numComponents;
  const byteLength = numValues * ArrayCtor.BYTES_PER_ELEMENT;
  const ptr = decoderModule._malloc(byteLength);
  decoder.GetAttributeDataArrayForAllPoints(mesh, attribute, dataType, byteLength, ptr);
  const array = new ArrayCtor(decoderModule.HEAPF32.buffer, ptr, numValues).slice();
  decoderModule._free(ptr);
  return array;
}
function initDecoderModule(_decoderModule) {
  decoderModule = _decoderModule;
  COMPONENT_ARRAY = {
    [Accessor.ComponentType.FLOAT]: Float32Array,
    [Accessor.ComponentType.UNSIGNED_INT]: Uint32Array,
    [Accessor.ComponentType.UNSIGNED_SHORT]: Uint16Array,
    [Accessor.ComponentType.UNSIGNED_BYTE]: Uint8Array,
    [Accessor.ComponentType.SHORT]: Int16Array,
    [Accessor.ComponentType.BYTE]: Int8Array
  };
  DATA_TYPE = {
    [Accessor.ComponentType.FLOAT]: decoderModule.DT_FLOAT32,
    [Accessor.ComponentType.UNSIGNED_INT]: decoderModule.DT_UINT32,
    [Accessor.ComponentType.UNSIGNED_SHORT]: decoderModule.DT_UINT16,
    [Accessor.ComponentType.UNSIGNED_BYTE]: decoderModule.DT_UINT8,
    [Accessor.ComponentType.SHORT]: decoderModule.DT_INT16,
    [Accessor.ComponentType.BYTE]: decoderModule.DT_INT8
  };
}

let encoderModule;
var EncoderMethod;
(function (EncoderMethod) {
  EncoderMethod[EncoderMethod["EDGEBREAKER"] = 1] = "EDGEBREAKER";
  EncoderMethod[EncoderMethod["SEQUENTIAL"] = 0] = "SEQUENTIAL";
})(EncoderMethod || (EncoderMethod = {}));
var AttributeEnum;
(function (AttributeEnum) {
  AttributeEnum["POSITION"] = "POSITION";
  AttributeEnum["NORMAL"] = "NORMAL";
  AttributeEnum["COLOR"] = "COLOR";
  AttributeEnum["TEX_COORD"] = "TEX_COORD";
  AttributeEnum["GENERIC"] = "GENERIC";
})(AttributeEnum || (AttributeEnum = {}));
const DEFAULT_QUANTIZATION_BITS = {
  [AttributeEnum.POSITION]: 14,
  [AttributeEnum.NORMAL]: 10,
  [AttributeEnum.COLOR]: 8,
  [AttributeEnum.TEX_COORD]: 12,
  [AttributeEnum.GENERIC]: 12
};
const DEFAULT_ENCODER_OPTIONS = {
  decodeSpeed: 5,
  encodeSpeed: 5,
  method: EncoderMethod.EDGEBREAKER,
  quantizationBits: DEFAULT_QUANTIZATION_BITS,
  quantizationVolume: 'mesh'
};
function initEncoderModule(_encoderModule) {
  encoderModule = _encoderModule;
}
/**
 * References:
 * - https://github.com/mrdoob/three.js/blob/dev/examples/js/exporters/DRACOExporter.js
 * - https://github.com/CesiumGS/gltf-pipeline/blob/master/lib/compressDracoMeshes.js
 */
function encodeGeometry(prim, _options = DEFAULT_ENCODER_OPTIONS) {
  const options = _extends$1({}, DEFAULT_ENCODER_OPTIONS, _options);
  options.quantizationBits = _extends$1({}, DEFAULT_QUANTIZATION_BITS, _options.quantizationBits);
  const builder = new encoderModule.MeshBuilder();
  const mesh = new encoderModule.Mesh();
  const encoder = new encoderModule.ExpertEncoder(mesh);
  const attributeIDs = {};
  const dracoBuffer = new encoderModule.DracoInt8Array();
  const hasMorphTargets = prim.listTargets().length > 0;
  let hasSparseAttributes = false;
  for (const semantic of prim.listSemantics()) {
    const attribute = prim.getAttribute(semantic);
    if (attribute.getSparse()) {
      hasSparseAttributes = true;
      continue;
    }
    const attributeEnum = getAttributeEnum(semantic);
    const attributeID = addAttribute(builder, attribute.getComponentType(), mesh, encoderModule[attributeEnum], attribute.getCount(), attribute.getElementSize(), attribute.getArray());
    if (attributeID === -1) throw new Error(`Error compressing "${semantic}" attribute.`);
    attributeIDs[semantic] = attributeID;
    if (options.quantizationVolume === 'mesh' || semantic !== 'POSITION') {
      encoder.SetAttributeQuantization(attributeID, options.quantizationBits[attributeEnum]);
    } else if (typeof options.quantizationVolume === 'object') {
      const {
        quantizationVolume
      } = options;
      const range = Math.max(quantizationVolume.max[0] - quantizationVolume.min[0], quantizationVolume.max[1] - quantizationVolume.min[1], quantizationVolume.max[2] - quantizationVolume.min[2]);
      encoder.SetAttributeExplicitQuantization(attributeID, options.quantizationBits[attributeEnum], attribute.getElementSize(), quantizationVolume.min, range);
    } else {
      throw new Error('Invalid quantization volume state.');
    }
  }
  const indices = prim.getIndices();
  if (!indices) throw new EncodingError('Primitive must have indices.');
  builder.AddFacesToMesh(mesh, indices.getCount() / 3, indices.getArray());
  encoder.SetSpeedOptions(options.encodeSpeed, options.decodeSpeed);
  encoder.SetTrackEncodedProperties(true);
  // TODO(cleanup): Use edgebreaker without deduplication if possible.
  // See https://github.com/google/draco/issues/929.
  if (options.method === EncoderMethod.SEQUENTIAL || hasMorphTargets || hasSparseAttributes) {
    encoder.SetEncodingMethod(encoderModule.MESH_SEQUENTIAL_ENCODING);
  } else {
    encoder.SetEncodingMethod(encoderModule.MESH_EDGEBREAKER_ENCODING);
  }
  // Encode, preserving vertex order for primitives with morph targets and sparse accessors.
  const byteLength = encoder.EncodeToDracoBuffer(!(hasMorphTargets || hasSparseAttributes), dracoBuffer);
  if (byteLength <= 0) throw new EncodingError('Error applying Draco compression.');
  const data = new Uint8Array(byteLength);
  for (let i = 0; i < byteLength; ++i) {
    data[i] = dracoBuffer.GetValue(i);
  }
  const numVertices = encoder.GetNumberOfEncodedPoints();
  const numIndices = encoder.GetNumberOfEncodedFaces() * 3;
  encoderModule.destroy(dracoBuffer);
  encoderModule.destroy(mesh);
  encoderModule.destroy(builder);
  encoderModule.destroy(encoder);
  return {
    numVertices,
    numIndices,
    data,
    attributeIDs
  };
}
function getAttributeEnum(semantic) {
  if (semantic === 'POSITION') {
    return AttributeEnum.POSITION;
  } else if (semantic === 'NORMAL') {
    return AttributeEnum.NORMAL;
  } else if (semantic.startsWith('COLOR_')) {
    return AttributeEnum.COLOR;
  } else if (semantic.startsWith('TEXCOORD_')) {
    return AttributeEnum.TEX_COORD;
  }
  return AttributeEnum.GENERIC;
}
function addAttribute(builder, componentType, mesh, attribute, count, itemSize, array) {
  switch (componentType) {
    case Accessor.ComponentType.UNSIGNED_BYTE:
      return builder.AddUInt8Attribute(mesh, attribute, count, itemSize, array);
    case Accessor.ComponentType.BYTE:
      return builder.AddInt8Attribute(mesh, attribute, count, itemSize, array);
    case Accessor.ComponentType.UNSIGNED_SHORT:
      return builder.AddUInt16Attribute(mesh, attribute, count, itemSize, array);
    case Accessor.ComponentType.SHORT:
      return builder.AddInt16Attribute(mesh, attribute, count, itemSize, array);
    case Accessor.ComponentType.UNSIGNED_INT:
      return builder.AddUInt32Attribute(mesh, attribute, count, itemSize, array);
    case Accessor.ComponentType.FLOAT:
      return builder.AddFloatAttribute(mesh, attribute, count, itemSize, array);
    default:
      throw new Error(`Unexpected component type, "${componentType}".`);
  }
}
class EncodingError extends Error {}

const NAME$j = KHR_DRACO_MESH_COMPRESSION;
/**
 * [`KHR_draco_mesh_compression`](https://github.com/KhronosGroup/gltf/blob/main/extensions/2.0/Khronos/KHR_draco_mesh_compression/)
 * provides advanced compression for mesh geometry.
 *
 * For models where geometry is a significant factor (>1 MB), Draco can reduce filesize by ~95%
 * in many cases. When animation or textures are large, other complementary compression methods
 * should be used as well. For geometry <1MB, the size of the WASM decoder library may outweigh
 * size savings.
 *
 * Be aware that decompression happens before uploading to the GPU — this will add some latency to
 * the parsing process, and means that compressing geometry with  Draco does _not_ affect runtime
 * performance. To improve framerate, you'll need to simplify the geometry by reducing vertex count
 * or draw calls — not just compress it. Finally, be aware that Draco compression is lossy:
 * repeatedly compressing and decompressing a model in a pipeline will lose precision, so
 * compression should generally be the last stage of an art workflow, and uncompressed original
 * files should be kept.
 *
 * A decoder or encoder from the `draco3dgltf` npm module for Node.js (or
 * [elsewhere for web](https://stackoverflow.com/a/66978236/1314762)) is required for reading and writing,
 * and must be provided by the application.
 *
 * ### Encoding options
 *
 * Two compression methods are available: 'edgebreaker' and 'sequential'. The
 * edgebreaker method will give higher compression in general, but changes the
 * order of the model's vertices. To preserve index order, use sequential
 * compression. When a mesh uses morph targets, or a high decoding speed is
 * selected, sequential compression will automatically be chosen.
 *
 * Both speed options affect the encoder's choice of algorithms. For example, a
 * requirement for fast decoding may prevent the encoder from using the best
 * compression methods even if the encoding speed is set to 0. In general, the
 * faster of the two options limits the choice of features that can be used by the
 * encoder. Setting --decodeSpeed to be faster than the --encodeSpeed may allow
 * the encoder to choose the optimal method out of the available features for the
 * given --decodeSpeed.
 *
 * ### Example
 *
 * ```typescript
 * import { NodeIO } from '@gltf-transform/core';
 * import { KHRDracoMeshCompression } from '@gltf-transform/extensions';
 *
 * import draco3d from 'draco3dgltf';
 *
 * // ...
 *
 * const io = new NodeIO()
 *	.registerExtensions([KHRDracoMeshCompression])
 *	.registerDependencies({
 *		'draco3d.decoder': await draco3d.createDecoderModule(), // Optional.
 *		'draco3d.encoder': await draco3d.createEncoderModule(), // Optional.
 *	});
 *
 * // Read and decode.
 * const document = await io.read('compressed.glb');
 *
 * // Write and encode.
 * document.createExtension(KHRDracoMeshCompression)
 * 	.setRequired(true)
 * 	.setEncoderOptions({
 * 		method: KHRDracoMeshCompression.EncoderMethod.EDGEBREAKER,
 * 		encodeSpeed: 5,
 * 		decodeSpeed: 5,
 * 	});
 * await io.write('compressed.glb', document);
 * ```
 */
class KHRDracoMeshCompression extends Extension {
  constructor(...args) {
    super(...args);
    this.extensionName = NAME$j;
    /** @hidden */
    this.prereadTypes = [PropertyType.PRIMITIVE];
    /** @hidden */
    this.prewriteTypes = [PropertyType.ACCESSOR];
    /** @hidden */
    this.readDependencies = ['draco3d.decoder'];
    /** @hidden */
    this.writeDependencies = ['draco3d.encoder'];
    this._decoderModule = null;
    this._encoderModule = null;
    this._encoderOptions = {};
  }
  /** @hidden */
  install(key, dependency) {
    if (key === 'draco3d.decoder') {
      this._decoderModule = dependency;
      initDecoderModule(this._decoderModule);
    }
    if (key === 'draco3d.encoder') {
      this._encoderModule = dependency;
      initEncoderModule(this._encoderModule);
    }
    return this;
  }
  /**
   * Sets Draco compression options. Compression does not take effect until the Document is
   * written with an I/O class.
   *
   * Defaults:
   * ```
   * decodeSpeed?: number = 5;
   * encodeSpeed?: number = 5;
   * method?: EncoderMethod = EncoderMethod.EDGEBREAKER;
   * quantizationBits?: {[ATTRIBUTE_NAME]: bits};
   * quantizationVolume?: 'mesh' | 'scene' | bbox = 'mesh';
   * ```
   */
  setEncoderOptions(options) {
    this._encoderOptions = options;
    return this;
  }
  /** @hidden */
  preread(context) {
    if (!this._decoderModule) {
      throw new Error(`[${NAME$j}] Please install extension dependency, "draco3d.decoder".`);
    }
    const logger = this.document.getLogger();
    const jsonDoc = context.jsonDoc;
    const dracoMeshes = new Map();
    try {
      const meshDefs = jsonDoc.json.meshes || [];
      for (const meshDef of meshDefs) {
        for (const primDef of meshDef.primitives) {
          if (!primDef.extensions || !primDef.extensions[NAME$j]) continue;
          const dracoDef = primDef.extensions[NAME$j];
          let [decoder, dracoMesh] = dracoMeshes.get(dracoDef.bufferView) || [];
          if (!dracoMesh || !decoder) {
            const bufferViewDef = jsonDoc.json.bufferViews[dracoDef.bufferView];
            const bufferDef = jsonDoc.json.buffers[bufferViewDef.buffer];
            // TODO(cleanup): Should be encapsulated in writer-context.ts.
            const resource = bufferDef.uri ? jsonDoc.resources[bufferDef.uri] : jsonDoc.resources[GLB_BUFFER];
            const byteOffset = bufferViewDef.byteOffset || 0;
            const byteLength = bufferViewDef.byteLength;
            const compressedData = BufferUtils.toView(resource, byteOffset, byteLength);
            decoder = new this._decoderModule.Decoder();
            dracoMesh = decodeGeometry(decoder, compressedData);
            dracoMeshes.set(dracoDef.bufferView, [decoder, dracoMesh]);
            logger.debug(`[${NAME$j}] Decompressed ${compressedData.byteLength} bytes.`);
          }
          // Attributes.
          for (const semantic in primDef.attributes) {
            const accessorDef = context.jsonDoc.json.accessors[primDef.attributes[semantic]];
            const dracoAttribute = decoder.GetAttributeByUniqueId(dracoMesh, dracoDef.attributes[semantic]);
            const attributeArray = decodeAttribute(decoder, dracoMesh, dracoAttribute, accessorDef);
            context.accessors[primDef.attributes[semantic]].setArray(attributeArray);
          }
          // Indices. Optional, see https://github.com/google/draco/issues/720.
          if (primDef.indices !== undefined) {
            context.accessors[primDef.indices].setArray(decodeIndex(decoder, dracoMesh));
          }
        }
      }
    } finally {
      for (const [decoder, dracoMesh] of Array.from(dracoMeshes.values())) {
        this._decoderModule.destroy(decoder);
        this._decoderModule.destroy(dracoMesh);
      }
    }
    return this;
  }
  /** @hidden */
  read(_context) {
    return this;
  }
  /** @hidden */
  prewrite(context, _propertyType) {
    if (!this._encoderModule) {
      throw new Error(`[${NAME$j}] Please install extension dependency, "draco3d.encoder".`);
    }
    const logger = this.document.getLogger();
    logger.debug(`[${NAME$j}] Compression options: ${JSON.stringify(this._encoderOptions)}`);
    const primitiveHashMap = listDracoPrimitives(this.document);
    const primitiveEncodingMap = new Map();
    let quantizationVolume = 'mesh';
    if (this._encoderOptions.quantizationVolume === 'scene') {
      if (this.document.getRoot().listScenes().length !== 1) {
        logger.warn(`[${NAME$j}]: quantizationVolume=scene requires exactly 1 scene.`);
      } else {
        quantizationVolume = getBounds(this.document.getRoot().listScenes().pop());
      }
    }
    for (const prim of Array.from(primitiveHashMap.keys())) {
      const primHash = primitiveHashMap.get(prim);
      if (!primHash) throw new Error('Unexpected primitive.');
      // Reuse an existing EncodedPrimitive, if possible.
      if (primitiveEncodingMap.has(primHash)) {
        primitiveEncodingMap.set(primHash, primitiveEncodingMap.get(primHash));
        continue;
      }
      const indices = prim.getIndices(); // Condition for listDracoPrimitives().
      const accessorDefs = context.jsonDoc.json.accessors;
      // Create a new EncodedPrimitive.
      let encodedPrim;
      try {
        encodedPrim = encodeGeometry(prim, _extends$1({}, this._encoderOptions, {
          quantizationVolume
        }));
      } catch (e) {
        if (e instanceof EncodingError) {
          logger.warn(`[${NAME$j}]: ${e.message} Skipping primitive compression.`);
          continue;
        }
        throw e;
      }
      primitiveEncodingMap.set(primHash, encodedPrim);
      // Create indices definition, update count.
      const indicesDef = context.createAccessorDef(indices);
      indicesDef.count = encodedPrim.numIndices;
      context.accessorIndexMap.set(indices, accessorDefs.length);
      accessorDefs.push(indicesDef);
      // In rare cases Draco increases vertex count, requiring a larger index component type.
      // https://github.com/donmccurdy/glTF-Transform/issues/1370
      if (encodedPrim.numVertices > 65534 && indicesDef.componentType !== Accessor.ComponentType.UNSIGNED_INT) {
        indicesDef.componentType = Accessor.ComponentType.UNSIGNED_INT;
      }
      // Create attribute definitions, update count.
      for (const semantic of prim.listSemantics()) {
        const attribute = prim.getAttribute(semantic);
        if (encodedPrim.attributeIDs[semantic] === undefined) continue; // sparse
        const attributeDef = context.createAccessorDef(attribute);
        attributeDef.count = encodedPrim.numVertices;
        context.accessorIndexMap.set(attribute, accessorDefs.length);
        accessorDefs.push(attributeDef);
      }
      // Map compressed buffer view to a Buffer.
      const buffer = prim.getAttribute('POSITION').getBuffer() || this.document.getRoot().listBuffers()[0];
      if (!context.otherBufferViews.has(buffer)) context.otherBufferViews.set(buffer, []);
      context.otherBufferViews.get(buffer).push(encodedPrim.data);
    }
    logger.debug(`[${NAME$j}] Compressed ${primitiveHashMap.size} primitives.`);
    context.extensionData[NAME$j] = {
      primitiveHashMap,
      primitiveEncodingMap
    };
    return this;
  }
  /** @hidden */
  write(context) {
    const dracoContext = context.extensionData[NAME$j];
    for (const mesh of this.document.getRoot().listMeshes()) {
      const meshDef = context.jsonDoc.json.meshes[context.meshIndexMap.get(mesh)];
      for (let i = 0; i < mesh.listPrimitives().length; i++) {
        const prim = mesh.listPrimitives()[i];
        const primDef = meshDef.primitives[i];
        const primHash = dracoContext.primitiveHashMap.get(prim);
        if (!primHash) continue;
        const encodedPrim = dracoContext.primitiveEncodingMap.get(primHash);
        if (!encodedPrim) continue;
        primDef.extensions = primDef.extensions || {};
        primDef.extensions[NAME$j] = {
          bufferView: context.otherBufferViewsIndexMap.get(encodedPrim.data),
          attributes: encodedPrim.attributeIDs
        };
      }
    }
    // Omit the extension if nothing was compressed.
    if (!dracoContext.primitiveHashMap.size) {
      const json = context.jsonDoc.json;
      json.extensionsUsed = (json.extensionsUsed || []).filter(name => name !== NAME$j);
      json.extensionsRequired = (json.extensionsRequired || []).filter(name => name !== NAME$j);
    }
    return this;
  }
}
/**
 * Returns a list of Primitives compatible with Draco compression. If any required preconditions
 * fail, and would break assumptions required for compression, this function will throw an error.
 */
KHRDracoMeshCompression.EXTENSION_NAME = NAME$j;
/**
 * Compression method. `EncoderMethod.EDGEBREAKER` usually provides a higher compression ratio,
 * while `EncoderMethod.SEQUENTIAL` better preserves original verter order.
 */
KHRDracoMeshCompression.EncoderMethod = EncoderMethod;
function listDracoPrimitives(doc) {
  const logger = doc.getLogger();
  const included = new Set();
  const excluded = new Set();
  let nonIndexed = 0;
  let nonTriangles = 0;
  // Support compressing only indexed, mode=TRIANGLES primitives.
  for (const mesh of doc.getRoot().listMeshes()) {
    for (const prim of mesh.listPrimitives()) {
      if (!prim.getIndices()) {
        excluded.add(prim);
        nonIndexed++;
      } else if (prim.getMode() !== Primitive.Mode.TRIANGLES) {
        excluded.add(prim);
        nonTriangles++;
      } else {
        included.add(prim);
      }
    }
  }
  if (nonIndexed > 0) {
    logger.warn(`[${NAME$j}] Skipping Draco compression of ${nonIndexed} non-indexed primitives.`);
  }
  if (nonTriangles > 0) {
    logger.warn(`[${NAME$j}] Skipping Draco compression of ${nonTriangles} non-TRIANGLES primitives.`);
  }
  // Create an Accessor->index mapping.
  const accessors = doc.getRoot().listAccessors();
  const accessorIndices = new Map();
  for (let i = 0; i < accessors.length; i++) accessorIndices.set(accessors[i], i);
  // For each compressed Primitive, create a hash key identifying its accessors. Map each
  // compressed Primitive and Accessor to this hash key.
  const includedAccessors = new Map();
  const includedHashKeys = new Set();
  const primToHashKey = new Map();
  for (const prim of Array.from(included)) {
    let hashKey = createHashKey(prim, accessorIndices);
    // If accessors of an identical primitive have already been checked, we're done.
    if (includedHashKeys.has(hashKey)) {
      primToHashKey.set(prim, hashKey);
      continue;
    }
    // If any accessors are already in use, but the same hashKey hasn't been written, then we
    // need to create copies of these accessors for the current encoded primitive. We can't
    // reuse the same compressed accessor for two encoded primitives, because Draco might
    // change the vertex count, change the vertex order, or cause other conflicts.
    if (includedAccessors.has(prim.getIndices())) {
      const indices = prim.getIndices(); // Condition for 'included' list.
      const dstIndices = indices.clone();
      accessorIndices.set(dstIndices, doc.getRoot().listAccessors().length - 1);
      prim.swap(indices, dstIndices); // TODO(cleanup): I/O should not modify Document.
    }
    for (const attribute of prim.listAttributes()) {
      if (includedAccessors.has(attribute)) {
        const dstAttribute = attribute.clone();
        accessorIndices.set(dstAttribute, doc.getRoot().listAccessors().length - 1);
        prim.swap(attribute, dstAttribute); // TODO(cleanup): I/O should not modify Document.
      }
    }
    // With conflicts resolved, compute the hash key again.
    hashKey = createHashKey(prim, accessorIndices);
    // Commit the primitive and its accessors to the hash key.
    includedHashKeys.add(hashKey);
    primToHashKey.set(prim, hashKey);
    includedAccessors.set(prim.getIndices(), hashKey);
    for (const attribute of prim.listAttributes()) {
      includedAccessors.set(attribute, hashKey);
    }
  }
  // For each compressed Accessor, ensure that it isn't used except by a Primitive.
  for (const accessor of Array.from(includedAccessors.keys())) {
    const parentTypes = new Set(accessor.listParents().map(prop => prop.propertyType));
    if (parentTypes.size !== 2 || !parentTypes.has(PropertyType.PRIMITIVE) || !parentTypes.has(PropertyType.ROOT)) {
      throw new Error(`[${NAME$j}] Compressed accessors must only be used as indices or vertex attributes.`);
    }
  }
  // For each compressed Primitive, ensure that Accessors are mapped only to the same hash key.
  for (const prim of Array.from(included)) {
    const hashKey = primToHashKey.get(prim);
    const indices = prim.getIndices(); // Condition for 'included' list.
    if (includedAccessors.get(indices) !== hashKey || prim.listAttributes().some(attr => includedAccessors.get(attr) !== hashKey)) {
      throw new Error(`[${NAME$j}] Draco primitives must share all, or no, accessors.`);
    }
  }
  // For each excluded Primitive, ensure that no Accessors are compressed.
  for (const prim of Array.from(excluded)) {
    const indices = prim.getIndices(); // Condition for 'included' list.
    if (includedAccessors.has(indices) || prim.listAttributes().some(attr => includedAccessors.has(attr))) {
      throw new Error(`[${NAME$j}] Accessor cannot be shared by compressed and uncompressed primitives.`);
    }
  }
  return primToHashKey;
}
function createHashKey(prim, indexMap) {
  const hashElements = [];
  const indices = prim.getIndices(); // Condition for 'included' list.
  hashElements.push(indexMap.get(indices));
  for (const attribute of prim.listAttributes()) {
    hashElements.push(indexMap.get(attribute));
  }
  return hashElements.sort().join('|');
}

/**
 * Defines a light attached to a {@link Node}. See {@link KHRLightsPunctual}.
 */
class Light extends ExtensionProperty {
  /**********************************************************************************************
   * INSTANCE.
   */
  init() {
    this.extensionName = KHR_LIGHTS_PUNCTUAL;
    this.propertyType = 'Light';
    this.parentTypes = [PropertyType.NODE];
  }
  getDefaults() {
    return Object.assign(super.getDefaults(), {
      color: [1, 1, 1],
      intensity: 1,
      type: Light.Type.POINT,
      range: null,
      innerConeAngle: 0,
      outerConeAngle: Math.PI / 4
    });
  }
  /**********************************************************************************************
   * COLOR.
   */
  /** Light color; Linear-sRGB components. */
  getColor() {
    return this.get('color');
  }
  /** Light color; Linear-sRGB components. */
  setColor(color) {
    return this.set('color', color);
  }
  /**********************************************************************************************
   * INTENSITY.
   */
  /**
   * Brightness of light. Units depend on the type of light: point and spot lights use luminous
   * intensity in candela (lm/sr) while directional lights use illuminance in lux (lm/m2).
   */
  getIntensity() {
    return this.get('intensity');
  }
  /**
   * Brightness of light. Units depend on the type of light: point and spot lights use luminous
   * intensity in candela (lm/sr) while directional lights use illuminance in lux (lm/m2).
   */
  setIntensity(intensity) {
    return this.set('intensity', intensity);
  }
  /**********************************************************************************************
   * TYPE.
   */
  /** Type. */
  getType() {
    return this.get('type');
  }
  /** Type. */
  setType(type) {
    return this.set('type', type);
  }
  /**********************************************************************************************
   * RANGE.
   */
  /**
   * Hint defining a distance cutoff at which the light's intensity may be considered to have
   * reached zero. Supported only for point and spot lights. Must be > 0. When undefined, range
   * is assumed to be infinite.
   */
  getRange() {
    return this.get('range');
  }
  /**
   * Hint defining a distance cutoff at which the light's intensity may be considered to have
   * reached zero. Supported only for point and spot lights. Must be > 0. When undefined, range
   * is assumed to be infinite.
   */
  setRange(range) {
    return this.set('range', range);
  }
  /**********************************************************************************************
   * SPOT LIGHT PROPERTIES
   */
  /**
   * Angle, in radians, from centre of spotlight where falloff begins. Must be >= 0 and
   * < outerConeAngle.
   */
  getInnerConeAngle() {
    return this.get('innerConeAngle');
  }
  /**
   * Angle, in radians, from centre of spotlight where falloff begins. Must be >= 0 and
   * < outerConeAngle.
   */
  setInnerConeAngle(angle) {
    return this.set('innerConeAngle', angle);
  }
  /**
   * Angle, in radians, from centre of spotlight where falloff ends. Must be > innerConeAngle and
   * <= PI / 2.0.
   */
  getOuterConeAngle() {
    return this.get('outerConeAngle');
  }
  /**
   * Angle, in radians, from centre of spotlight where falloff ends. Must be > innerConeAngle and
   * <= PI / 2.0.
   */
  setOuterConeAngle(angle) {
    return this.set('outerConeAngle', angle);
  }
}
Light.EXTENSION_NAME = KHR_LIGHTS_PUNCTUAL;
/**********************************************************************************************
 * CONSTANTS.
 */
Light.Type = {
  POINT: 'point',
  SPOT: 'spot',
  DIRECTIONAL: 'directional'
};

const NAME$i$1 = KHR_LIGHTS_PUNCTUAL;
/**
 * [`KHR_lights_punctual`](https://github.com/KhronosGroup/gltf/blob/main/extensions/2.0/Khronos/KHR_lights_punctual/) defines three "punctual" light types: directional, point and
 * spot.
 *
 * Punctual lights are parameterized, infinitely small points that emit light in
 * well-defined directions and intensities. Lights are referenced by nodes and inherit the transform
 * of that node.
 *
 * Properties:
 * - {@link Light}
 *
 * ### Example
 *
 * ```typescript
 * import { KHRLightsPunctual, Light, LightType } from '@gltf-transform/extensions';
 *
 * // Create an Extension attached to the Document.
 * const lightsExtension = document.createExtension(KHRLightsPunctual);
 *
 * // Create a Light property.
 * const light = lightsExtension.createLight()
 *	.setType(LightType.POINT)
 *	.setIntensity(2.0)
 *	.setColor([1.0, 0.0, 0.0]);
 *
 * // Attach the property to a Material.
 * node.setExtension('KHR_lights_punctual', light);
 * ```
 */
class KHRLightsPunctual extends Extension {
  constructor(...args) {
    super(...args);
    this.extensionName = NAME$i$1;
  }
  /** Creates a new punctual Light property for use on a {@link Node}. */
  createLight(name = '') {
    return new Light(this.document.getGraph(), name);
  }
  /** @hidden */
  read(context) {
    const jsonDoc = context.jsonDoc;
    if (!jsonDoc.json.extensions || !jsonDoc.json.extensions[NAME$i$1]) return this;
    const rootDef = jsonDoc.json.extensions[NAME$i$1];
    const lightDefs = rootDef.lights || [];
    const lights = lightDefs.map(lightDef => {
      var _lightDef$spot, _lightDef$spot2;
      const light = this.createLight().setName(lightDef.name || '').setType(lightDef.type);
      if (lightDef.color !== undefined) light.setColor(lightDef.color);
      if (lightDef.intensity !== undefined) light.setIntensity(lightDef.intensity);
      if (lightDef.range !== undefined) light.setRange(lightDef.range);
      if (((_lightDef$spot = lightDef.spot) == null ? void 0 : _lightDef$spot.innerConeAngle) !== undefined) {
        light.setInnerConeAngle(lightDef.spot.innerConeAngle);
      }
      if (((_lightDef$spot2 = lightDef.spot) == null ? void 0 : _lightDef$spot2.outerConeAngle) !== undefined) {
        light.setOuterConeAngle(lightDef.spot.outerConeAngle);
      }
      return light;
    });
    jsonDoc.json.nodes.forEach((nodeDef, nodeIndex) => {
      if (!nodeDef.extensions || !nodeDef.extensions[NAME$i$1]) return;
      const lightNodeDef = nodeDef.extensions[NAME$i$1];
      context.nodes[nodeIndex].setExtension(NAME$i$1, lights[lightNodeDef.light]);
    });
    return this;
  }
  /** @hidden */
  write(context) {
    const jsonDoc = context.jsonDoc;
    if (this.properties.size === 0) return this;
    const lightDefs = [];
    const lightIndexMap = new Map();
    for (const property of this.properties) {
      const light = property;
      const lightDef = {
        type: light.getType()
      };
      if (!MathUtils.eq(light.getColor(), [1, 1, 1])) lightDef.color = light.getColor();
      if (light.getIntensity() !== 1) lightDef.intensity = light.getIntensity();
      if (light.getRange() != null) lightDef.range = light.getRange();
      if (light.getName()) lightDef.name = light.getName();
      if (light.getType() === Light.Type.SPOT) {
        lightDef.spot = {
          innerConeAngle: light.getInnerConeAngle(),
          outerConeAngle: light.getOuterConeAngle()
        };
      }
      lightDefs.push(lightDef);
      lightIndexMap.set(light, lightDefs.length - 1);
    }
    this.document.getRoot().listNodes().forEach(node => {
      const light = node.getExtension(NAME$i$1);
      if (light) {
        const nodeIndex = context.nodeIndexMap.get(node);
        const nodeDef = jsonDoc.json.nodes[nodeIndex];
        nodeDef.extensions = nodeDef.extensions || {};
        nodeDef.extensions[NAME$i$1] = {
          light: lightIndexMap.get(light)
        };
      }
    });
    jsonDoc.json.extensions = jsonDoc.json.extensions || {};
    jsonDoc.json.extensions[NAME$i$1] = {
      lights: lightDefs
    };
    return this;
  }
}
KHRLightsPunctual.EXTENSION_NAME = NAME$i$1;

const {
  R: R$7,
  G: G$7,
  B: B$5
} = TextureChannel;
/**
 * Defines anisotropy (directionally-dependent reflections) on a PBR {@link Material}. See
 * {@link KHRMaterialsAnisotropy}.
 */
class Anisotropy extends ExtensionProperty {
  init() {
    this.extensionName = KHR_MATERIALS_ANISOTROPY;
    this.propertyType = 'Anisotropy';
    this.parentTypes = [PropertyType.MATERIAL];
  }
  getDefaults() {
    return Object.assign(super.getDefaults(), {
      anisotropyStrength: 0.0,
      anisotropyRotation: 0.0,
      anisotropyTexture: null,
      anisotropyTextureInfo: new TextureInfo(this.graph, 'anisotropyTextureInfo')
    });
  }
  /**********************************************************************************************
   * Anisotropy strength.
   */
  /** Anisotropy strength. */
  getAnisotropyStrength() {
    return this.get('anisotropyStrength');
  }
  /** Anisotropy strength. */
  setAnisotropyStrength(strength) {
    return this.set('anisotropyStrength', strength);
  }
  /**********************************************************************************************
   * Anisotropy rotation.
   */
  /** Anisotropy rotation; linear multiplier. */
  getAnisotropyRotation() {
    return this.get('anisotropyRotation');
  }
  /** Anisotropy rotation; linear multiplier. */
  setAnisotropyRotation(rotation) {
    return this.set('anisotropyRotation', rotation);
  }
  /**********************************************************************************************
   * Anisotropy texture.
   */
  /**
   * Anisotropy texture. Red and green channels represent the anisotropy
   * direction in [-1, 1] tangent, bitangent space, to be rotated by
   * anisotropyRotation. The blue channel contains strength as [0, 1] to be
   * multiplied by anisotropyStrength.
   */
  getAnisotropyTexture() {
    return this.getRef('anisotropyTexture');
  }
  /**
   * Settings affecting the material's use of its anisotropy texture. If no
   * texture is attached, {@link TextureInfo} is `null`.
   */
  getAnisotropyTextureInfo() {
    return this.getRef('anisotropyTexture') ? this.getRef('anisotropyTextureInfo') : null;
  }
  /** Anisotropy texture. See {@link Anisotropy.getAnisotropyTexture getAnisotropyTexture}. */
  setAnisotropyTexture(texture) {
    return this.setRef('anisotropyTexture', texture, {
      channels: R$7 | G$7 | B$5
    });
  }
}
Anisotropy.EXTENSION_NAME = KHR_MATERIALS_ANISOTROPY;

const NAME$h$1 = KHR_MATERIALS_ANISOTROPY;
/**
 * [`KHR_materials_anisotropy`](https://github.com/KhronosGroup/gltf/blob/main/extensions/2.0/Khronos/KHR_materials_anisotropy/)
 * defines anisotropy (directionally-dependent reflections) on a PBR material.
 *
 * ![Illustration](/media/extensions/khr-materials-anisotropy.jpg)
 *
 * > _**Figure:** Effect of each color channel in the anisotropyTexture. Left
 * > to right: the full anisotropy texture, filling the red channel with black,
 * > filling the green channel with black, filling the blue channel with black.
 * > Source: [Khronos Group & Wayfair](https://github.com/KhronosGroup/glTF-Sample-Assets/tree/main/Models/AnisotropyBarnLamp)._
 *
 * This extension defines the anisotropic property of a material as observable with brushed metals
 * for instance. An asymmetric specular lobe model is introduced to allow for such phenomena. The
 * visually distinct feature of that lobe is the elongated appearance of the specular reflection.
 * For a single punctual light source, the specular reflection will eventually degenerate into a
 * zero width line in the limit, that is where the material is fully anisotropic, as opposed to be
 * fully isotropic in which case the specular reflection is radially symmetric.
 *
 * Properties:
 * - {@link Anisotropy}
 *
 * ### Example
 *
 * The `KHRMaterialsAnisotropy` class provides a single {@link ExtensionProperty} type, `Anisotropy`,
 * which may be attached to any {@link Material} instance. For example:
 *
 * ```typescript
 * import { KHRMaterialsAnisotropy, Anisotropy } from '@gltf-transform/extensions';
 *
 * // Create an Extension attached to the Document.
 * const anisotropyExtension = document.createExtension(KHRMaterialsAnisotropy);
 *
 * // Create an Anisotropy property.
 * const anisotropy = anisotropyExtension.createAnisotropy()
 * 	.setAnisotropyStrength(1.0)
 * 	.setAnisotropyRotation(Math.PI / 4);
 *
 * // Attach the property to a Material.
 * material.setExtension('KHR_materials_anisotropy', anisotropy);
 * ```
 */
class KHRMaterialsAnisotropy extends Extension {
  constructor(...args) {
    super(...args);
    this.extensionName = NAME$h$1;
    this.prereadTypes = [PropertyType.MESH];
    this.prewriteTypes = [PropertyType.MESH];
  }
  /** Creates a new Anisotropy property for use on a {@link Material}. */
  createAnisotropy() {
    return new Anisotropy(this.document.getGraph());
  }
  /** @hidden */
  read(_context) {
    return this;
  }
  /** @hidden */
  write(_context) {
    return this;
  }
  /** @hidden */
  preread(context) {
    const jsonDoc = context.jsonDoc;
    const materialDefs = jsonDoc.json.materials || [];
    const textureDefs = jsonDoc.json.textures || [];
    materialDefs.forEach((materialDef, materialIndex) => {
      if (materialDef.extensions && materialDef.extensions[NAME$h$1]) {
        const anisotropy = this.createAnisotropy();
        context.materials[materialIndex].setExtension(NAME$h$1, anisotropy);
        const anisotropyDef = materialDef.extensions[NAME$h$1];
        // Factors.
        if (anisotropyDef.anisotropyStrength !== undefined) {
          anisotropy.setAnisotropyStrength(anisotropyDef.anisotropyStrength);
        }
        if (anisotropyDef.anisotropyRotation !== undefined) {
          anisotropy.setAnisotropyRotation(anisotropyDef.anisotropyRotation);
        }
        // Textures.
        if (anisotropyDef.anisotropyTexture !== undefined) {
          const textureInfoDef = anisotropyDef.anisotropyTexture;
          const texture = context.textures[textureDefs[textureInfoDef.index].source];
          anisotropy.setAnisotropyTexture(texture);
          context.setTextureInfo(anisotropy.getAnisotropyTextureInfo(), textureInfoDef);
        }
      }
    });
    return this;
  }
  /** @hidden */
  prewrite(context) {
    const jsonDoc = context.jsonDoc;
    this.document.getRoot().listMaterials().forEach(material => {
      const anisotropy = material.getExtension(NAME$h$1);
      if (anisotropy) {
        const materialIndex = context.materialIndexMap.get(material);
        const materialDef = jsonDoc.json.materials[materialIndex];
        materialDef.extensions = materialDef.extensions || {};
        // Factors.
        const anisotropyDef = materialDef.extensions[NAME$h$1] = {};
        if (anisotropy.getAnisotropyStrength() > 0) {
          anisotropyDef.anisotropyStrength = anisotropy.getAnisotropyStrength();
        }
        if (anisotropy.getAnisotropyRotation() !== 0) {
          anisotropyDef.anisotropyRotation = anisotropy.getAnisotropyRotation();
        }
        // Textures.
        if (anisotropy.getAnisotropyTexture()) {
          const texture = anisotropy.getAnisotropyTexture();
          const textureInfo = anisotropy.getAnisotropyTextureInfo();
          anisotropyDef.anisotropyTexture = context.createTextureInfoDef(texture, textureInfo);
        }
      }
    });
    return this;
  }
}
KHRMaterialsAnisotropy.EXTENSION_NAME = NAME$h$1;

const {
  R: R$6,
  G: G$6,
  B: B$4
} = TextureChannel;
/**
 * Defines clear coat for a PBR material. See {@link KHRMaterialsClearcoat}.
 */
class Clearcoat extends ExtensionProperty {
  init() {
    this.extensionName = KHR_MATERIALS_CLEARCOAT;
    this.propertyType = 'Clearcoat';
    this.parentTypes = [PropertyType.MATERIAL];
  }
  getDefaults() {
    return Object.assign(super.getDefaults(), {
      clearcoatFactor: 0,
      clearcoatTexture: null,
      clearcoatTextureInfo: new TextureInfo(this.graph, 'clearcoatTextureInfo'),
      clearcoatRoughnessFactor: 0,
      clearcoatRoughnessTexture: null,
      clearcoatRoughnessTextureInfo: new TextureInfo(this.graph, 'clearcoatRoughnessTextureInfo'),
      clearcoatNormalScale: 1,
      clearcoatNormalTexture: null,
      clearcoatNormalTextureInfo: new TextureInfo(this.graph, 'clearcoatNormalTextureInfo')
    });
  }
  /**********************************************************************************************
   * Clearcoat.
   */
  /** Clearcoat; linear multiplier. See {@link Clearcoat.getClearcoatTexture getClearcoatTexture}. */
  getClearcoatFactor() {
    return this.get('clearcoatFactor');
  }
  /** Clearcoat; linear multiplier. See {@link Clearcoat.getClearcoatTexture getClearcoatTexture}. */
  setClearcoatFactor(factor) {
    return this.set('clearcoatFactor', factor);
  }
  /**
   * Clearcoat texture; linear multiplier. The `r` channel of this texture specifies an amount
   * [0-1] of coating over the surface of the material, which may have its own roughness and
   * normal map properties.
   */
  getClearcoatTexture() {
    return this.getRef('clearcoatTexture');
  }
  /**
   * Settings affecting the material's use of its clearcoat texture. If no texture is attached,
   * {@link TextureInfo} is `null`.
   */
  getClearcoatTextureInfo() {
    return this.getRef('clearcoatTexture') ? this.getRef('clearcoatTextureInfo') : null;
  }
  /** Sets clearcoat texture. See {@link Clearcoat.getClearcoatTexture getClearcoatTexture}. */
  setClearcoatTexture(texture) {
    return this.setRef('clearcoatTexture', texture, {
      channels: R$6
    });
  }
  /**********************************************************************************************
   * Clearcoat roughness.
   */
  /**
   * Clearcoat roughness; linear multiplier.
   * See {@link Clearcoat.getClearcoatRoughnessTexture getClearcoatRoughnessTexture}.
   */
  getClearcoatRoughnessFactor() {
    return this.get('clearcoatRoughnessFactor');
  }
  /**
   * Clearcoat roughness; linear multiplier.
   * See {@link Clearcoat.getClearcoatRoughnessTexture getClearcoatRoughnessTexture}.
   */
  setClearcoatRoughnessFactor(factor) {
    return this.set('clearcoatRoughnessFactor', factor);
  }
  /**
   * Clearcoat roughness texture; linear multiplier. The `g` channel of this texture specifies
   * roughness, independent of the base layer's roughness.
   */
  getClearcoatRoughnessTexture() {
    return this.getRef('clearcoatRoughnessTexture');
  }
  /**
   * Settings affecting the material's use of its clearcoat roughness texture. If no texture is
   * attached, {@link TextureInfo} is `null`.
   */
  getClearcoatRoughnessTextureInfo() {
    return this.getRef('clearcoatRoughnessTexture') ? this.getRef('clearcoatRoughnessTextureInfo') : null;
  }
  /**
   * Sets clearcoat roughness texture.
   * See {@link Clearcoat.getClearcoatRoughnessTexture getClearcoatRoughnessTexture}.
   */
  setClearcoatRoughnessTexture(texture) {
    return this.setRef('clearcoatRoughnessTexture', texture, {
      channels: G$6
    });
  }
  /**********************************************************************************************
   * Clearcoat normals.
   */
  /** Clearcoat normal scale. See {@link Clearcoat.getClearcoatNormalTexture getClearcoatNormalTexture}. */
  getClearcoatNormalScale() {
    return this.get('clearcoatNormalScale');
  }
  /** Clearcoat normal scale. See {@link Clearcoat.getClearcoatNormalTexture getClearcoatNormalTexture}. */
  setClearcoatNormalScale(scale) {
    return this.set('clearcoatNormalScale', scale);
  }
  /**
   * Clearcoat normal map. Independent of the material base layer normal map.
   */
  getClearcoatNormalTexture() {
    return this.getRef('clearcoatNormalTexture');
  }
  /**
   * Settings affecting the material's use of its clearcoat normal texture. If no texture is
   * attached, {@link TextureInfo} is `null`.
   */
  getClearcoatNormalTextureInfo() {
    return this.getRef('clearcoatNormalTexture') ? this.getRef('clearcoatNormalTextureInfo') : null;
  }
  /** Sets clearcoat normal texture. See {@link Clearcoat.getClearcoatNormalTexture getClearcoatNormalTexture}. */
  setClearcoatNormalTexture(texture) {
    return this.setRef('clearcoatNormalTexture', texture, {
      channels: R$6 | G$6 | B$4
    });
  }
}
Clearcoat.EXTENSION_NAME = KHR_MATERIALS_CLEARCOAT;

const NAME$g$1 = KHR_MATERIALS_CLEARCOAT;
/**
 * [KHR_materials_clearcoat](https://github.com/KhronosGroup/gltf/blob/main/extensions/2.0/Khronos/KHR_materials_clearcoat/)
 * defines a clear coating on a glTF PBR material.
 *
 * ![Illustration](/media/extensions/khr-materials-clearcoat.png)
 *
 * > _**Figure:** Comparison of a carbon-fiber material without clearcoat (left) and with clearcoat
 * > (right). Source: [Filament](https://google.github.io/filament/Materials.html)._
 *
 * A clear coat is a common technique used in Physically-Based
 * Rendering for a protective layer applied to a base material.
 * Commonly used to represent car paint, carbon fiber, or thin lacquers.
 *
 * Properties:
 * - {@link Clearcoat}
 *
 * ### Example
 *
 * ```typescript
 * import { KHRMaterialsClearcoat, Clearcoat } from '@gltf-transform/extensions';
 *
 * // Create an Extension attached to the Document.
 * const clearcoatExtension = document.createExtension(KHRMaterialsClearcoat);
 *
 * // Create Clearcoat property.
 * const clearcoat = clearcoatExtension.createClearcoat()
 *	.setClearcoatFactor(1.0);
 *
 * // Assign to a Material.
 * material.setExtension('KHR_materials_clearcoat', clearcoat);
 * ```
 */
class KHRMaterialsClearcoat extends Extension {
  constructor(...args) {
    super(...args);
    this.extensionName = NAME$g$1;
    this.prereadTypes = [PropertyType.MESH];
    this.prewriteTypes = [PropertyType.MESH];
  }
  /** Creates a new Clearcoat property for use on a {@link Material}. */
  createClearcoat() {
    return new Clearcoat(this.document.getGraph());
  }
  /** @hidden */
  read(_context) {
    return this;
  }
  /** @hidden */
  write(_context) {
    return this;
  }
  /** @hidden */
  preread(context) {
    const jsonDoc = context.jsonDoc;
    const materialDefs = jsonDoc.json.materials || [];
    const textureDefs = jsonDoc.json.textures || [];
    materialDefs.forEach((materialDef, materialIndex) => {
      if (materialDef.extensions && materialDef.extensions[NAME$g$1]) {
        const clearcoat = this.createClearcoat();
        context.materials[materialIndex].setExtension(NAME$g$1, clearcoat);
        const clearcoatDef = materialDef.extensions[NAME$g$1];
        // Factors.
        if (clearcoatDef.clearcoatFactor !== undefined) {
          clearcoat.setClearcoatFactor(clearcoatDef.clearcoatFactor);
        }
        if (clearcoatDef.clearcoatRoughnessFactor !== undefined) {
          clearcoat.setClearcoatRoughnessFactor(clearcoatDef.clearcoatRoughnessFactor);
        }
        // Textures.
        if (clearcoatDef.clearcoatTexture !== undefined) {
          const textureInfoDef = clearcoatDef.clearcoatTexture;
          const texture = context.textures[textureDefs[textureInfoDef.index].source];
          clearcoat.setClearcoatTexture(texture);
          context.setTextureInfo(clearcoat.getClearcoatTextureInfo(), textureInfoDef);
        }
        if (clearcoatDef.clearcoatRoughnessTexture !== undefined) {
          const textureInfoDef = clearcoatDef.clearcoatRoughnessTexture;
          const texture = context.textures[textureDefs[textureInfoDef.index].source];
          clearcoat.setClearcoatRoughnessTexture(texture);
          context.setTextureInfo(clearcoat.getClearcoatRoughnessTextureInfo(), textureInfoDef);
        }
        if (clearcoatDef.clearcoatNormalTexture !== undefined) {
          const textureInfoDef = clearcoatDef.clearcoatNormalTexture;
          const texture = context.textures[textureDefs[textureInfoDef.index].source];
          clearcoat.setClearcoatNormalTexture(texture);
          context.setTextureInfo(clearcoat.getClearcoatNormalTextureInfo(), textureInfoDef);
          if (textureInfoDef.scale !== undefined) {
            clearcoat.setClearcoatNormalScale(textureInfoDef.scale);
          }
        }
      }
    });
    return this;
  }
  /** @hidden */
  prewrite(context) {
    const jsonDoc = context.jsonDoc;
    this.document.getRoot().listMaterials().forEach(material => {
      const clearcoat = material.getExtension(NAME$g$1);
      if (clearcoat) {
        const materialIndex = context.materialIndexMap.get(material);
        const materialDef = jsonDoc.json.materials[materialIndex];
        materialDef.extensions = materialDef.extensions || {};
        // Factors.
        const clearcoatDef = materialDef.extensions[NAME$g$1] = {
          clearcoatFactor: clearcoat.getClearcoatFactor(),
          clearcoatRoughnessFactor: clearcoat.getClearcoatRoughnessFactor()
        };
        // Textures.
        if (clearcoat.getClearcoatTexture()) {
          const texture = clearcoat.getClearcoatTexture();
          const textureInfo = clearcoat.getClearcoatTextureInfo();
          clearcoatDef.clearcoatTexture = context.createTextureInfoDef(texture, textureInfo);
        }
        if (clearcoat.getClearcoatRoughnessTexture()) {
          const texture = clearcoat.getClearcoatRoughnessTexture();
          const textureInfo = clearcoat.getClearcoatRoughnessTextureInfo();
          clearcoatDef.clearcoatRoughnessTexture = context.createTextureInfoDef(texture, textureInfo);
        }
        if (clearcoat.getClearcoatNormalTexture()) {
          const texture = clearcoat.getClearcoatNormalTexture();
          const textureInfo = clearcoat.getClearcoatNormalTextureInfo();
          clearcoatDef.clearcoatNormalTexture = context.createTextureInfoDef(texture, textureInfo);
          if (clearcoat.getClearcoatNormalScale() !== 1) {
            clearcoatDef.clearcoatNormalTexture.scale = clearcoat.getClearcoatNormalScale();
          }
        }
      }
    });
    return this;
  }
}
KHRMaterialsClearcoat.EXTENSION_NAME = NAME$g$1;

const {
  R: R$5,
  G: G$5,
  B: B$3,
  A: A$3
} = TextureChannel;
/**
 * Defines diffuse transmission on a PBR {@link Material}. See {@link KHRMaterialsDiffuseTransmission}.
 *
 * @experimental KHR_materials_diffuse_transmission is not yet ratified by the Khronos Group.
 */
class DiffuseTransmission extends ExtensionProperty {
  init() {
    this.extensionName = KHR_MATERIALS_DIFFUSE_TRANSMISSION;
    this.propertyType = 'DiffuseTransmission';
    this.parentTypes = [PropertyType.MATERIAL];
  }
  getDefaults() {
    return Object.assign(super.getDefaults(), {
      diffuseTransmissionFactor: 0.0,
      diffuseTransmissionTexture: null,
      diffuseTransmissionTextureInfo: new TextureInfo(this.graph, 'diffuseTransmissionTextureInfo'),
      diffuseTransmissionColorFactor: [1.0, 1.0, 1.0],
      diffuseTransmissionColorTexture: null,
      diffuseTransmissionColorTextureInfo: new TextureInfo(this.graph, 'diffuseTransmissionColorTextureInfo')
    });
  }
  /**********************************************************************************************
   * Diffuse transmission.
   */
  /**
   * Percentage of reflected, non-specularly reflected light that is transmitted through the
   * surface via the Lambertian diffuse transmission, i.e., the strength of the diffuse
   * transmission effect.
   */
  getDiffuseTransmissionFactor() {
    return this.get('diffuseTransmissionFactor');
  }
  /**
   * Percentage of reflected, non-specularly reflected light that is transmitted through the
   * surface via the Lambertian diffuse transmission, i.e., the strength of the diffuse
   * transmission effect.
   */
  setDiffuseTransmissionFactor(factor) {
    return this.set('diffuseTransmissionFactor', factor);
  }
  /**
   * Texture that defines the strength of the diffuse transmission effect, stored in the alpha (A)
   * channel. Will be multiplied by the diffuseTransmissionFactor.
   */
  getDiffuseTransmissionTexture() {
    return this.getRef('diffuseTransmissionTexture');
  }
  /**
   * Settings affecting the material's use of its diffuse transmission texture. If no texture is attached,
   * {@link TextureInfo} is `null`.
   */
  getDiffuseTransmissionTextureInfo() {
    return this.getRef('diffuseTransmissionTexture') ? this.getRef('diffuseTransmissionTextureInfo') : null;
  }
  /**
   * Texture that defines the strength of the diffuse transmission effect, stored in the alpha (A)
   * channel. Will be multiplied by the diffuseTransmissionFactor.
   */
  setDiffuseTransmissionTexture(texture) {
    return this.setRef('diffuseTransmissionTexture', texture, {
      channels: A$3
    });
  }
  /**********************************************************************************************
   * Diffuse transmission color.
   */
  /** Color of the transmitted light; Linear-sRGB components. */
  getDiffuseTransmissionColorFactor() {
    return this.get('diffuseTransmissionColorFactor');
  }
  /** Color of the transmitted light; Linear-sRGB components. */
  setDiffuseTransmissionColorFactor(factor) {
    return this.set('diffuseTransmissionColorFactor', factor);
  }
  /**
   * Texture that defines the color of the transmitted light, stored in the RGB channels and
   * encoded in sRGB. This texture will be multiplied by diffuseTransmissionColorFactor.
   */
  getDiffuseTransmissionColorTexture() {
    return this.getRef('diffuseTransmissionColorTexture');
  }
  /**
   * Settings affecting the material's use of its diffuse transmission color texture. If no
   * texture is attached, {@link TextureInfo} is `null`.
   */
  getDiffuseTransmissionColorTextureInfo() {
    return this.getRef('diffuseTransmissionColorTexture') ? this.getRef('diffuseTransmissionColorTextureInfo') : null;
  }
  /**
   * Texture that defines the color of the transmitted light, stored in the RGB channels and
   * encoded in sRGB. This texture will be multiplied by diffuseTransmissionColorFactor.
   */
  setDiffuseTransmissionColorTexture(texture) {
    return this.setRef('diffuseTransmissionColorTexture', texture, {
      channels: R$5 | G$5 | B$3
    });
  }
}
DiffuseTransmission.EXTENSION_NAME = KHR_MATERIALS_DIFFUSE_TRANSMISSION;

const NAME$f = KHR_MATERIALS_DIFFUSE_TRANSMISSION;
/**
 * [KHR_materials_diffuse_transmission](https://github.com/KhronosGroup/gltf/blob/main/extensions/2.0/Khronos/KHR_materials_diffuse_transmission/)
 * defines diffuse transmission on a glTF PBR material.
 *
 * ![Illustration](/media/extensions/khr-materials-diffuse-transmission.png)
 *
 * > _**Figure:** Sphere using `KHR_materials_diffuse_transmission` with varying roughness (0.0, 0.2, 0.4).
 * > Source: Khronos Group._
 *
 * Adds a Lambertian diffuse transmission BSDF to the metallic-roughness
 * material. Thin, dielectric objects like leaves or paper diffusely transmit
 * incoming light to the opposite side of the surface. For optically thick
 * media (volumes) with short scattering distances and therefore dense
 * scattering behavior, a diffuse transmission lobe is a phenomenological
 * plausible and cheap approximation.
 *
 * Properties:
 * - {@link DiffuseTransmission}
 *
 * ### Example
 *
 * ```typescript
 * import { KHRMaterialsDiffuseTransmission, DiffuseTransmission } from '@gltf-transform/extensions';
 *
 * // Create an Extension attached to the Document.
 * const diffuseTransmissionExtension = document.createExtension(KHRMaterialsDiffuseTransmission);
 *
 * // Create DiffuseTransmission property.
 * const diffuseTransmission = diffuseTransmission.createDiffuseTransmission()
 *	.setDiffuseTransmissionFactor(1.0);
 *
 * // Assign to a Material.
 * material.setExtension('KHR_materials_diffuse_transmission', diffuseTransmission);
 * ```
 *
 * @experimental KHR_materials_diffuse_transmission is not yet ratified by the Khronos Group.
 */
class KHRMaterialsDiffuseTransmission extends Extension {
  constructor(...args) {
    super(...args);
    this.extensionName = NAME$f;
  }
  /** Creates a new DiffuseTransmission property for use on a {@link Material}. */
  createDiffuseTransmission() {
    return new DiffuseTransmission(this.document.getGraph());
  }
  /** @hidden */
  read(context) {
    const jsonDoc = context.jsonDoc;
    const materialDefs = jsonDoc.json.materials || [];
    const textureDefs = jsonDoc.json.textures || [];
    materialDefs.forEach((materialDef, materialIndex) => {
      if (materialDef.extensions && materialDef.extensions[NAME$f]) {
        const transmission = this.createDiffuseTransmission();
        context.materials[materialIndex].setExtension(NAME$f, transmission);
        const transmissionDef = materialDef.extensions[NAME$f];
        // Factors.
        if (transmissionDef.diffuseTransmissionFactor !== undefined) {
          transmission.setDiffuseTransmissionFactor(transmissionDef.diffuseTransmissionFactor);
        }
        if (transmissionDef.diffuseTransmissionColorFactor !== undefined) {
          transmission.setDiffuseTransmissionColorFactor(transmissionDef.diffuseTransmissionColorFactor);
        }
        // Textures.
        if (transmissionDef.diffuseTransmissionTexture !== undefined) {
          const textureInfoDef = transmissionDef.diffuseTransmissionTexture;
          const texture = context.textures[textureDefs[textureInfoDef.index].source];
          transmission.setDiffuseTransmissionTexture(texture);
          context.setTextureInfo(transmission.getDiffuseTransmissionTextureInfo(), textureInfoDef);
        }
        if (transmissionDef.diffuseTransmissionColorTexture !== undefined) {
          const textureInfoDef = transmissionDef.diffuseTransmissionColorTexture;
          const texture = context.textures[textureDefs[textureInfoDef.index].source];
          transmission.setDiffuseTransmissionColorTexture(texture);
          context.setTextureInfo(transmission.getDiffuseTransmissionColorTextureInfo(), textureInfoDef);
        }
      }
    });
    return this;
  }
  /** @hidden */
  write(context) {
    const jsonDoc = context.jsonDoc;
    for (const material of this.document.getRoot().listMaterials()) {
      const transmission = material.getExtension(NAME$f);
      if (!transmission) continue;
      const materialIndex = context.materialIndexMap.get(material);
      const materialDef = jsonDoc.json.materials[materialIndex];
      materialDef.extensions = materialDef.extensions || {};
      // Factors.
      const transmissionDef = materialDef.extensions[NAME$f] = {
        diffuseTransmissionFactor: transmission.getDiffuseTransmissionFactor(),
        diffuseTransmissionColorFactor: transmission.getDiffuseTransmissionColorFactor()
      };
      // Textures.
      if (transmission.getDiffuseTransmissionTexture()) {
        const texture = transmission.getDiffuseTransmissionTexture();
        const textureInfo = transmission.getDiffuseTransmissionTextureInfo();
        transmissionDef.diffuseTransmissionTexture = context.createTextureInfoDef(texture, textureInfo);
      }
      if (transmission.getDiffuseTransmissionColorTexture()) {
        const texture = transmission.getDiffuseTransmissionColorTexture();
        const textureInfo = transmission.getDiffuseTransmissionColorTextureInfo();
        transmissionDef.diffuseTransmissionColorTexture = context.createTextureInfoDef(texture, textureInfo);
      }
    }
    return this;
  }
}
KHRMaterialsDiffuseTransmission.EXTENSION_NAME = NAME$f;

/**
 * Defines dispersion for a PBR {@link Material}. See {@link KHRMaterialsDispersion}.
 */
class Dispersion extends ExtensionProperty {
  init() {
    this.extensionName = KHR_MATERIALS_DISPERSION;
    this.propertyType = 'Dispersion';
    this.parentTypes = [PropertyType.MATERIAL];
  }
  getDefaults() {
    return Object.assign(super.getDefaults(), {
      dispersion: 0
    });
  }
  /**********************************************************************************************
   * Dispersion.
   */
  /** Dispersion. */
  getDispersion() {
    return this.get('dispersion');
  }
  /** Dispersion. */
  setDispersion(dispersion) {
    return this.set('dispersion', dispersion);
  }
}
Dispersion.EXTENSION_NAME = KHR_MATERIALS_DISPERSION;

const NAME$e = KHR_MATERIALS_DISPERSION;
/**
 * [KHR_materials_dispersion](https://github.com/KhronosGroup/gltf/blob/main/extensions/2.0/Khronos/KHR_materials_dispersion/)
 * defines dispersion on a glTF PBR material.
 *
 * ![illustration](/media/extensions/khr-materials-dispersion.jpg)
 *
 * > _**Figure:** Prisms demonstrating volumetric refraction and dispersion, for varying
 * > values of dispersion and IOR. Source: Khronos Group, rendered in Adobe Stager._
 *
 * Dispersion enables configuring the strength of the angular separation of colors (chromatic
 * aberration) transmitting through a relatively clear volume.  It is an enhancement to the
 * default `KHR_materials_volume` transmission model which assumes no dispersion.
 *
 * Properties:
 * - {@link Dispersion}
 *
 * ### Example
 *
 * ```typescript
 * import { KHRMaterialsDispersion, Dispersion } from '@gltf-transform/extensions';
 *
 * // Create an Extension attached to the Document.
 * const dispersionExtension = document.createExtension(KHRMaterialsDispersion);
 *
 * // Create Dispersion property.
 * const dispersion = dispersionExtension.createDispersion().setDispersion(1.0);
 *
 * // Assign to a Material.
 * material.setExtension('KHR_materials_dispersion', dispersion);
 * ```
 */
class KHRMaterialsDispersion extends Extension {
  constructor(...args) {
    super(...args);
    this.extensionName = NAME$e;
    this.prereadTypes = [PropertyType.MESH];
    this.prewriteTypes = [PropertyType.MESH];
  }
  /** Creates a new Dispersion property for use on a {@link Material}. */
  createDispersion() {
    return new Dispersion(this.document.getGraph());
  }
  /** @hidden */
  read(_context) {
    return this;
  }
  /** @hidden */
  write(_context) {
    return this;
  }
  /** @hidden */
  preread(context) {
    const jsonDoc = context.jsonDoc;
    const materialDefs = jsonDoc.json.materials || [];
    materialDefs.forEach((materialDef, materialIndex) => {
      if (materialDef.extensions && materialDef.extensions[NAME$e]) {
        const dispersion = this.createDispersion();
        context.materials[materialIndex].setExtension(NAME$e, dispersion);
        const dispersionDef = materialDef.extensions[NAME$e];
        // Factors.
        if (dispersionDef.dispersion !== undefined) {
          dispersion.setDispersion(dispersionDef.dispersion);
        }
      }
    });
    return this;
  }
  /** @hidden */
  prewrite(context) {
    const jsonDoc = context.jsonDoc;
    this.document.getRoot().listMaterials().forEach(material => {
      const dispersion = material.getExtension(NAME$e);
      if (dispersion) {
        const materialIndex = context.materialIndexMap.get(material);
        const materialDef = jsonDoc.json.materials[materialIndex];
        materialDef.extensions = materialDef.extensions || {};
        // Factors.
        materialDef.extensions[NAME$e] = {
          dispersion: dispersion.getDispersion()
        };
      }
    });
    return this;
  }
}
KHRMaterialsDispersion.EXTENSION_NAME = NAME$e;

/**
 * Defines emissive strength for a PBR {@link Material}, allowing high-dynamic-range
 * (HDR) emissive materials. See {@link KHRMaterialsEmissiveStrength}.
 */
class EmissiveStrength extends ExtensionProperty {
  init() {
    this.extensionName = KHR_MATERIALS_EMISSIVE_STRENGTH;
    this.propertyType = 'EmissiveStrength';
    this.parentTypes = [PropertyType.MATERIAL];
  }
  getDefaults() {
    return Object.assign(super.getDefaults(), {
      emissiveStrength: 1.0
    });
  }
  /**********************************************************************************************
   * EmissiveStrength.
   */
  /** EmissiveStrength. */
  getEmissiveStrength() {
    return this.get('emissiveStrength');
  }
  /** EmissiveStrength. */
  setEmissiveStrength(strength) {
    return this.set('emissiveStrength', strength);
  }
}
EmissiveStrength.EXTENSION_NAME = KHR_MATERIALS_EMISSIVE_STRENGTH;

const NAME$d = KHR_MATERIALS_EMISSIVE_STRENGTH;
/**
 * [KHR_materials_emissive_strength](https://github.com/KhronosGroup/gltf/blob/main/extensions/2.0/Khronos/KHR_materials_emissive_strength/)
 * defines emissive strength and enables high-dynamic-range (HDR) emissive materials.
 *
 * ![Illustration](/media/extensions/khr-materials-emissive-strength.jpg)
 *
 * > _**Figure:** Cubes with emissive color #59BCF3 and emissive strength
 * > increasing from 1 to 256 nits, left to right. Rendered in [three.js](https://threejs.org/),
 * > with independent point lighting and a bloom effect.
 * > Source: [Don McCurdy](https://www.donmccurdy.com/2024/04/27/emission-and-bloom/)._
 *
 * The core glTF 2.0 material model includes {@link Material.setEmissiveFactor `emissiveFactor`}
 * and {@link Material.setEmissiveTexture `emissiveTexture`} to control the color and intensity
 * of the light being emitted by the material, clamped to the range [0.0, 1.0]. However, in
 * PBR environments with HDR reflections and lighting, stronger emission effects may be desirable.
 *
 * In this extension, a new {@link EmissiveStrength.setEmissiveStrength `emissiveStrength`} scalar
 * factor is supplied, which governs the upper limit of emissive strength per material and may be
 * given arbitrarily high values.
 *
 * For implementations where a physical light unit is needed, the units for the multiplicative
 * product of the emissive texture and factor are candela per square meter (cd / m2), sometimes
 * called _nits_. Many realtime rendering engines simplify this calculation by assuming that an
 * emissive factor of 1.0 results in a fully exposed pixel.
 *
 * Properties:
 * - {@link EmissiveStrength}
 *
 * ### Example
 *
 * ```typescript
 * import { KHRMaterialsEmissiveStrength, EmissiveStrength } from '@gltf-transform/extensions';
 *
 * // Create an Extension attached to the Document.
 * const emissiveStrengthExtension = document.createExtension(KHRMaterialsEmissiveStrength);
 *
 * // Create EmissiveStrength property.
 * const emissiveStrength = emissiveStrengthExtension
 * 	.createEmissiveStrength().setEmissiveStrength(5.0);
 *
 * // Assign to a Material.
 * material.setExtension('KHR_materials_emissive_strength', emissiveStrength);
 * ```
 */
class KHRMaterialsEmissiveStrength extends Extension {
  constructor(...args) {
    super(...args);
    this.extensionName = NAME$d;
    this.prereadTypes = [PropertyType.MESH];
    this.prewriteTypes = [PropertyType.MESH];
  }
  /** Creates a new EmissiveStrength property for use on a {@link Material}. */
  createEmissiveStrength() {
    return new EmissiveStrength(this.document.getGraph());
  }
  /** @hidden */
  read(_context) {
    return this;
  }
  /** @hidden */
  write(_context) {
    return this;
  }
  /** @hidden */
  preread(context) {
    const jsonDoc = context.jsonDoc;
    const materialDefs = jsonDoc.json.materials || [];
    materialDefs.forEach((materialDef, materialIndex) => {
      if (materialDef.extensions && materialDef.extensions[NAME$d]) {
        const emissiveStrength = this.createEmissiveStrength();
        context.materials[materialIndex].setExtension(NAME$d, emissiveStrength);
        const emissiveStrengthDef = materialDef.extensions[NAME$d];
        // Factors.
        if (emissiveStrengthDef.emissiveStrength !== undefined) {
          emissiveStrength.setEmissiveStrength(emissiveStrengthDef.emissiveStrength);
        }
      }
    });
    return this;
  }
  /** @hidden */
  prewrite(context) {
    const jsonDoc = context.jsonDoc;
    this.document.getRoot().listMaterials().forEach(material => {
      const emissiveStrength = material.getExtension(NAME$d);
      if (emissiveStrength) {
        const materialIndex = context.materialIndexMap.get(material);
        const materialDef = jsonDoc.json.materials[materialIndex];
        materialDef.extensions = materialDef.extensions || {};
        // Factors.
        materialDef.extensions[NAME$d] = {
          emissiveStrength: emissiveStrength.getEmissiveStrength()
        };
      }
    });
    return this;
  }
}
KHRMaterialsEmissiveStrength.EXTENSION_NAME = NAME$d;

/**
 * Defines index of refraction for a PBR {@link Material}. See {@link KHRMaterialsIOR}.
 */
class IOR extends ExtensionProperty {
  init() {
    this.extensionName = KHR_MATERIALS_IOR;
    this.propertyType = 'IOR';
    this.parentTypes = [PropertyType.MATERIAL];
  }
  getDefaults() {
    return Object.assign(super.getDefaults(), {
      ior: 1.5
    });
  }
  /**********************************************************************************************
   * IOR.
   */
  /** IOR. */
  getIOR() {
    return this.get('ior');
  }
  /** IOR. */
  setIOR(ior) {
    return this.set('ior', ior);
  }
}
IOR.EXTENSION_NAME = KHR_MATERIALS_IOR;

const NAME$c = KHR_MATERIALS_IOR;
/**
 * [KHR_materials_ior](https://github.com/KhronosGroup/gltf/blob/main/extensions/2.0/Khronos/KHR_materials_ior/)
 * defines index of refraction on a glTF PBR material.
 *
 * The dielectric BRDF of the metallic-roughness material in glTF uses a fixed value of 1.5 for the
 * index of refraction. This is a good fit for many plastics and glass, but not for other materials
 * like water or asphalt, sapphire or diamond. `KHR_materials_ior` allows users to set the index of
 * refraction to a certain value.
 *
 * Properties:
 * - {@link IOR}
 *
 * ### Example
 *
 * ```typescript
 * import { KHRMaterialsIOR, IOR } from '@gltf-transform/extensions';
 *
 * // Create an Extension attached to the Document.
 * const iorExtension = document.createExtension(KHRMaterialsIOR);
 *
 * // Create IOR property.
 * const ior = iorExtension.createIOR().setIOR(1.0);
 *
 * // Assign to a Material.
 * material.setExtension('KHR_materials_ior', ior);
 * ```
 */
class KHRMaterialsIOR extends Extension {
  constructor(...args) {
    super(...args);
    this.extensionName = NAME$c;
    this.prereadTypes = [PropertyType.MESH];
    this.prewriteTypes = [PropertyType.MESH];
  }
  /** Creates a new IOR property for use on a {@link Material}. */
  createIOR() {
    return new IOR(this.document.getGraph());
  }
  /** @hidden */
  read(_context) {
    return this;
  }
  /** @hidden */
  write(_context) {
    return this;
  }
  /** @hidden */
  preread(context) {
    const jsonDoc = context.jsonDoc;
    const materialDefs = jsonDoc.json.materials || [];
    materialDefs.forEach((materialDef, materialIndex) => {
      if (materialDef.extensions && materialDef.extensions[NAME$c]) {
        const ior = this.createIOR();
        context.materials[materialIndex].setExtension(NAME$c, ior);
        const iorDef = materialDef.extensions[NAME$c];
        // Factors.
        if (iorDef.ior !== undefined) {
          ior.setIOR(iorDef.ior);
        }
      }
    });
    return this;
  }
  /** @hidden */
  prewrite(context) {
    const jsonDoc = context.jsonDoc;
    this.document.getRoot().listMaterials().forEach(material => {
      const ior = material.getExtension(NAME$c);
      if (ior) {
        const materialIndex = context.materialIndexMap.get(material);
        const materialDef = jsonDoc.json.materials[materialIndex];
        materialDef.extensions = materialDef.extensions || {};
        // Factors.
        materialDef.extensions[NAME$c] = {
          ior: ior.getIOR()
        };
      }
    });
    return this;
  }
}
KHRMaterialsIOR.EXTENSION_NAME = NAME$c;

const {
  R: R$4,
  G: G$4
} = TextureChannel;
/**
 * Defines iridescence (thin film interference) on a PBR {@link Material}. See {@link KHRMaterialsIridescence}.
 */
class Iridescence extends ExtensionProperty {
  init() {
    this.extensionName = KHR_MATERIALS_IRIDESCENCE;
    this.propertyType = 'Iridescence';
    this.parentTypes = [PropertyType.MATERIAL];
  }
  getDefaults() {
    return Object.assign(super.getDefaults(), {
      iridescenceFactor: 0.0,
      iridescenceTexture: null,
      iridescenceTextureInfo: new TextureInfo(this.graph, 'iridescenceTextureInfo'),
      iridescenceIOR: 1.3,
      iridescenceThicknessMinimum: 100,
      iridescenceThicknessMaximum: 400,
      iridescenceThicknessTexture: null,
      iridescenceThicknessTextureInfo: new TextureInfo(this.graph, 'iridescenceThicknessTextureInfo')
    });
  }
  /**********************************************************************************************
   * Iridescence.
   */
  /** Iridescence; linear multiplier. See {@link Iridescence.getIridescenceTexture getIridescenceTexture}. */
  getIridescenceFactor() {
    return this.get('iridescenceFactor');
  }
  /** Iridescence; linear multiplier. See {@link Iridescence.getIridescenceTexture getIridescenceTexture}. */
  setIridescenceFactor(factor) {
    return this.set('iridescenceFactor', factor);
  }
  /**
   * Iridescence intensity.
   *
   * Only the red (R) channel is used for iridescence intensity, but this texture may optionally
   * be packed with additional data in the other channels.
   */
  getIridescenceTexture() {
    return this.getRef('iridescenceTexture');
  }
  /**
   * Settings affecting the material's use of its iridescence texture. If no texture is attached,
   * {@link TextureInfo} is `null`.
   */
  getIridescenceTextureInfo() {
    return this.getRef('iridescenceTexture') ? this.getRef('iridescenceTextureInfo') : null;
  }
  /** Iridescence intensity. See {@link Iridescence.getIridescenceTexture getIridescenceTexture}. */
  setIridescenceTexture(texture) {
    return this.setRef('iridescenceTexture', texture, {
      channels: R$4
    });
  }
  /**********************************************************************************************
   * Iridescence IOR.
   */
  /** Index of refraction of the dielectric thin-film layer. */
  getIridescenceIOR() {
    return this.get('iridescenceIOR');
  }
  /** Index of refraction of the dielectric thin-film layer. */
  setIridescenceIOR(ior) {
    return this.set('iridescenceIOR', ior);
  }
  /**********************************************************************************************
   * Iridescence thickness.
   */
  /** Minimum thickness of the thin-film layer, in nanometers (nm). */
  getIridescenceThicknessMinimum() {
    return this.get('iridescenceThicknessMinimum');
  }
  /** Minimum thickness of the thin-film layer, in nanometers (nm). */
  setIridescenceThicknessMinimum(thickness) {
    return this.set('iridescenceThicknessMinimum', thickness);
  }
  /** Maximum thickness of the thin-film layer, in nanometers (nm). */
  getIridescenceThicknessMaximum() {
    return this.get('iridescenceThicknessMaximum');
  }
  /** Maximum thickness of the thin-film layer, in nanometers (nm). */
  setIridescenceThicknessMaximum(thickness) {
    return this.set('iridescenceThicknessMaximum', thickness);
  }
  /**
   * The green channel of this texture defines the thickness of the
   * thin-film layer by blending between the minimum and maximum thickness.
   */
  getIridescenceThicknessTexture() {
    return this.getRef('iridescenceThicknessTexture');
  }
  /**
   * Settings affecting the material's use of its iridescence thickness texture.
   * If no texture is attached, {@link TextureInfo} is `null`.
   */
  getIridescenceThicknessTextureInfo() {
    return this.getRef('iridescenceThicknessTexture') ? this.getRef('iridescenceThicknessTextureInfo') : null;
  }
  /**
   * Sets iridescence thickness texture.
   * See {@link Iridescence.getIridescenceThicknessTexture getIridescenceThicknessTexture}.
   */
  setIridescenceThicknessTexture(texture) {
    return this.setRef('iridescenceThicknessTexture', texture, {
      channels: G$4
    });
  }
}
Iridescence.EXTENSION_NAME = KHR_MATERIALS_IRIDESCENCE;

const NAME$b = KHR_MATERIALS_IRIDESCENCE;
/**
 * [`KHR_materials_iridescence`](https://github.com/KhronosGroup/gltf/blob/main/extensions/2.0/Khronos/KHR_materials_iridescence/)
 * defines iridescence (thin film interference) on a PBR material.
 *
 * ![Illustration](/media/extensions/khr-materials-iridescence.png)
 *
 * > _**Figure:** Varying levels of iridescence IOR values.
 * > Source: [Khronos Group](https://github.com/KhronosGroup/gltf/tree/main/extensions/2.0/Khronos/KHR_materials_iridescence)._
 *
 * Iridescence describes an effect where hue varies depending on the viewing
 * angle and illumination angle: A thin-film of a semi-transparent layer
 * results in inter-reflections and due to thin-film interference, certain
 * wavelengths get absorbed or amplified. Iridescence can be seen on soap
 * bubbles, oil films, or on the wings of many insects. With this extension,
 * thickness and index of refraction (IOR) of the thin-film can be specified,
 * enabling iridescent materials.
 *
 * Properties:
 * - {@link Iridescence}
 *
 * ### Example
 *
 * The `KHRMaterialsIridescence` class provides a single {@link ExtensionProperty} type, `Iridescence`,
 * which may be attached to any {@link Material} instance. For example:
 *
 * ```typescript
 * import { KHRMaterialsIridescence, Iridescence } from '@gltf-transform/extensions';
 *
 * // Create an Extension attached to the Document.
 * const iridescenceExtension = document.createExtension(KHRMaterialsIridescence);
 *
 * // Create an Iridescence property.
 * const iridescence = iridescenceExtension.createIridescence()
 * 	.setIridescenceFactor(1.0)
 * 	.setIridescenceIOR(1.8);
 *
 * // Attach the property to a Material.
 * material.setExtension('KHR_materials_iridescence', iridescence);
 * ```
 */
class KHRMaterialsIridescence extends Extension {
  constructor(...args) {
    super(...args);
    this.extensionName = NAME$b;
    this.prereadTypes = [PropertyType.MESH];
    this.prewriteTypes = [PropertyType.MESH];
  }
  /** Creates a new Iridescence property for use on a {@link Material}. */
  createIridescence() {
    return new Iridescence(this.document.getGraph());
  }
  /** @hidden */
  read(_context) {
    return this;
  }
  /** @hidden */
  write(_context) {
    return this;
  }
  /** @hidden */
  preread(context) {
    const jsonDoc = context.jsonDoc;
    const materialDefs = jsonDoc.json.materials || [];
    const textureDefs = jsonDoc.json.textures || [];
    materialDefs.forEach((materialDef, materialIndex) => {
      if (materialDef.extensions && materialDef.extensions[NAME$b]) {
        const iridescence = this.createIridescence();
        context.materials[materialIndex].setExtension(NAME$b, iridescence);
        const iridescenceDef = materialDef.extensions[NAME$b];
        // Factors.
        if (iridescenceDef.iridescenceFactor !== undefined) {
          iridescence.setIridescenceFactor(iridescenceDef.iridescenceFactor);
        }
        if (iridescenceDef.iridescenceIor !== undefined) {
          iridescence.setIridescenceIOR(iridescenceDef.iridescenceIor);
        }
        if (iridescenceDef.iridescenceThicknessMinimum !== undefined) {
          iridescence.setIridescenceThicknessMinimum(iridescenceDef.iridescenceThicknessMinimum);
        }
        if (iridescenceDef.iridescenceThicknessMaximum !== undefined) {
          iridescence.setIridescenceThicknessMaximum(iridescenceDef.iridescenceThicknessMaximum);
        }
        // Textures.
        if (iridescenceDef.iridescenceTexture !== undefined) {
          const textureInfoDef = iridescenceDef.iridescenceTexture;
          const texture = context.textures[textureDefs[textureInfoDef.index].source];
          iridescence.setIridescenceTexture(texture);
          context.setTextureInfo(iridescence.getIridescenceTextureInfo(), textureInfoDef);
        }
        if (iridescenceDef.iridescenceThicknessTexture !== undefined) {
          const textureInfoDef = iridescenceDef.iridescenceThicknessTexture;
          const texture = context.textures[textureDefs[textureInfoDef.index].source];
          iridescence.setIridescenceThicknessTexture(texture);
          context.setTextureInfo(iridescence.getIridescenceThicknessTextureInfo(), textureInfoDef);
        }
      }
    });
    return this;
  }
  /** @hidden */
  prewrite(context) {
    const jsonDoc = context.jsonDoc;
    this.document.getRoot().listMaterials().forEach(material => {
      const iridescence = material.getExtension(NAME$b);
      if (iridescence) {
        const materialIndex = context.materialIndexMap.get(material);
        const materialDef = jsonDoc.json.materials[materialIndex];
        materialDef.extensions = materialDef.extensions || {};
        // Factors.
        const iridescenceDef = materialDef.extensions[NAME$b] = {};
        if (iridescence.getIridescenceFactor() > 0) {
          iridescenceDef.iridescenceFactor = iridescence.getIridescenceFactor();
        }
        if (iridescence.getIridescenceIOR() !== 1.3) {
          iridescenceDef.iridescenceIor = iridescence.getIridescenceIOR();
        }
        if (iridescence.getIridescenceThicknessMinimum() !== 100) {
          iridescenceDef.iridescenceThicknessMinimum = iridescence.getIridescenceThicknessMinimum();
        }
        if (iridescence.getIridescenceThicknessMaximum() !== 400) {
          iridescenceDef.iridescenceThicknessMaximum = iridescence.getIridescenceThicknessMaximum();
        }
        // Textures.
        if (iridescence.getIridescenceTexture()) {
          const texture = iridescence.getIridescenceTexture();
          const textureInfo = iridescence.getIridescenceTextureInfo();
          iridescenceDef.iridescenceTexture = context.createTextureInfoDef(texture, textureInfo);
        }
        if (iridescence.getIridescenceThicknessTexture()) {
          const texture = iridescence.getIridescenceThicknessTexture();
          const textureInfo = iridescence.getIridescenceThicknessTextureInfo();
          iridescenceDef.iridescenceThicknessTexture = context.createTextureInfoDef(texture, textureInfo);
        }
      }
    });
    return this;
  }
}
KHRMaterialsIridescence.EXTENSION_NAME = NAME$b;

const {
  R: R$3,
  G: G$3,
  B: B$2,
  A: A$2
} = TextureChannel;
/**
 * Converts a {@link Material} to a spec/gloss workflow. See {@link KHRMaterialsPBRSpecularGlossiness}.
 */
class PBRSpecularGlossiness extends ExtensionProperty {
  init() {
    this.extensionName = KHR_MATERIALS_PBR_SPECULAR_GLOSSINESS;
    this.propertyType = 'PBRSpecularGlossiness';
    this.parentTypes = [PropertyType.MATERIAL];
  }
  getDefaults() {
    return Object.assign(super.getDefaults(), {
      diffuseFactor: [1.0, 1.0, 1.0, 1.0],
      diffuseTexture: null,
      diffuseTextureInfo: new TextureInfo(this.graph, 'diffuseTextureInfo'),
      specularFactor: [1.0, 1.0, 1.0],
      glossinessFactor: 1.0,
      specularGlossinessTexture: null,
      specularGlossinessTextureInfo: new TextureInfo(this.graph, 'specularGlossinessTextureInfo')
    });
  }
  /**********************************************************************************************
   * Diffuse.
   */
  /** Diffuse; Linear-sRGB components. See {@link PBRSpecularGlossiness.getDiffuseTexture getDiffuseTexture}. */
  getDiffuseFactor() {
    return this.get('diffuseFactor');
  }
  /** Diffuse; Linear-sRGB components. See {@link PBRSpecularGlossiness.getDiffuseTexture getDiffuseTexture}. */
  setDiffuseFactor(factor) {
    return this.set('diffuseFactor', factor);
  }
  /**
   * Diffuse texture; sRGB. Alternative to baseColorTexture, used within the
   * spec/gloss PBR workflow.
   */
  getDiffuseTexture() {
    return this.getRef('diffuseTexture');
  }
  /**
   * Settings affecting the material's use of its diffuse texture. If no texture is attached,
   * {@link TextureInfo} is `null`.
   */
  getDiffuseTextureInfo() {
    return this.getRef('diffuseTexture') ? this.getRef('diffuseTextureInfo') : null;
  }
  /** Sets diffuse texture. See {@link PBRSpecularGlossiness.getDiffuseTexture getDiffuseTexture}. */
  setDiffuseTexture(texture) {
    return this.setRef('diffuseTexture', texture, {
      channels: R$3 | G$3 | B$2 | A$2,
      isColor: true
    });
  }
  /**********************************************************************************************
   * Specular.
   */
  /** Specular; linear multiplier. */
  getSpecularFactor() {
    return this.get('specularFactor');
  }
  /** Specular; linear multiplier. */
  setSpecularFactor(factor) {
    return this.set('specularFactor', factor);
  }
  /**********************************************************************************************
   * Glossiness.
   */
  /** Glossiness; linear multiplier. */
  getGlossinessFactor() {
    return this.get('glossinessFactor');
  }
  /** Glossiness; linear multiplier. */
  setGlossinessFactor(factor) {
    return this.set('glossinessFactor', factor);
  }
  /**********************************************************************************************
   * Specular/Glossiness.
   */
  /** Spec/gloss texture; linear multiplier. */
  getSpecularGlossinessTexture() {
    return this.getRef('specularGlossinessTexture');
  }
  /**
   * Settings affecting the material's use of its spec/gloss texture. If no texture is attached,
   * {@link TextureInfo} is `null`.
   */
  getSpecularGlossinessTextureInfo() {
    return this.getRef('specularGlossinessTexture') ? this.getRef('specularGlossinessTextureInfo') : null;
  }
  /** Spec/gloss texture; linear multiplier. */
  setSpecularGlossinessTexture(texture) {
    return this.setRef('specularGlossinessTexture', texture, {
      channels: R$3 | G$3 | B$2 | A$2
    });
  }
}
PBRSpecularGlossiness.EXTENSION_NAME = KHR_MATERIALS_PBR_SPECULAR_GLOSSINESS;

const NAME$a = KHR_MATERIALS_PBR_SPECULAR_GLOSSINESS;
/**
 * [`KHR_materials_pbrSpecularGlossiness`](https://github.com/KhronosGroup/gltf/blob/main/extensions/2.0/Khronos/KHR_materials_pbrSpecularGlossiness/)
 * converts a PBR material from the default metal/rough workflow to a spec/gloss workflow.
 *
 * > _**NOTICE:** The spec/gloss workflow does _not_ support other PBR extensions such as clearcoat,
 * > transmission, IOR, etc. For the complete PBR feature set and specular data, use the
 * > {@link KHRMaterialsSpecular} extension instead, which provides specular data within a metal/rough
 * > workflow._
 *
 * ![Illustration](/media/extensions/khr-material-pbr-specular-glossiness.png)
 *
 * > _**Figure:** Components of a PBR spec/gloss material. Source: Khronos Group._
 *
 * Properties:
 * - {@link PBRSpecularGlossiness}
 *
 * ### Example
 *
 * ```typescript
 * import { KHRMaterialsPBRSpecularGlossiness } from '@gltf-transform/extensions';
 *
 * // Create an Extension attached to the Document.
 * const specGlossExtension = document.createExtension(KHRMaterialsPBRSpecularGlossiness);
 *
 * // Create a PBRSpecularGlossiness property.
 * const specGloss = specGlossExtension.createPBRSpecularGlossiness()
 * 	.setSpecularFactor(1.0);
 *
 * // // Assign to a Material.
 * material.setExtension('KHR_materials_pbrSpecularGlossiness', specGloss);
 * ```
 */
class KHRMaterialsPBRSpecularGlossiness extends Extension {
  constructor(...args) {
    super(...args);
    this.extensionName = NAME$a;
    this.prereadTypes = [PropertyType.MESH];
    this.prewriteTypes = [PropertyType.MESH];
  }
  /** Creates a new PBRSpecularGlossiness property for use on a {@link Material}. */
  createPBRSpecularGlossiness() {
    return new PBRSpecularGlossiness(this.document.getGraph());
  }
  /** @hidden */
  read(_context) {
    return this;
  }
  /** @hidden */
  write(_context) {
    return this;
  }
  /** @hidden */
  preread(context) {
    const jsonDoc = context.jsonDoc;
    const materialDefs = jsonDoc.json.materials || [];
    const textureDefs = jsonDoc.json.textures || [];
    materialDefs.forEach((materialDef, materialIndex) => {
      if (materialDef.extensions && materialDef.extensions[NAME$a]) {
        const specGloss = this.createPBRSpecularGlossiness();
        context.materials[materialIndex].setExtension(NAME$a, specGloss);
        const specGlossDef = materialDef.extensions[NAME$a];
        // Factors.
        if (specGlossDef.diffuseFactor !== undefined) {
          specGloss.setDiffuseFactor(specGlossDef.diffuseFactor);
        }
        if (specGlossDef.specularFactor !== undefined) {
          specGloss.setSpecularFactor(specGlossDef.specularFactor);
        }
        if (specGlossDef.glossinessFactor !== undefined) {
          specGloss.setGlossinessFactor(specGlossDef.glossinessFactor);
        }
        // Textures.
        if (specGlossDef.diffuseTexture !== undefined) {
          const textureInfoDef = specGlossDef.diffuseTexture;
          const texture = context.textures[textureDefs[textureInfoDef.index].source];
          specGloss.setDiffuseTexture(texture);
          context.setTextureInfo(specGloss.getDiffuseTextureInfo(), textureInfoDef);
        }
        if (specGlossDef.specularGlossinessTexture !== undefined) {
          const textureInfoDef = specGlossDef.specularGlossinessTexture;
          const texture = context.textures[textureDefs[textureInfoDef.index].source];
          specGloss.setSpecularGlossinessTexture(texture);
          context.setTextureInfo(specGloss.getSpecularGlossinessTextureInfo(), textureInfoDef);
        }
      }
    });
    return this;
  }
  /** @hidden */
  prewrite(context) {
    const jsonDoc = context.jsonDoc;
    this.document.getRoot().listMaterials().forEach(material => {
      const specGloss = material.getExtension(NAME$a);
      if (specGloss) {
        const materialIndex = context.materialIndexMap.get(material);
        const materialDef = jsonDoc.json.materials[materialIndex];
        materialDef.extensions = materialDef.extensions || {};
        // Factors.
        const specGlossDef = materialDef.extensions[NAME$a] = {
          diffuseFactor: specGloss.getDiffuseFactor(),
          specularFactor: specGloss.getSpecularFactor(),
          glossinessFactor: specGloss.getGlossinessFactor()
        };
        // Textures.
        if (specGloss.getDiffuseTexture()) {
          const texture = specGloss.getDiffuseTexture();
          const textureInfo = specGloss.getDiffuseTextureInfo();
          specGlossDef.diffuseTexture = context.createTextureInfoDef(texture, textureInfo);
        }
        if (specGloss.getSpecularGlossinessTexture()) {
          const texture = specGloss.getSpecularGlossinessTexture();
          const textureInfo = specGloss.getSpecularGlossinessTextureInfo();
          specGlossDef.specularGlossinessTexture = context.createTextureInfoDef(texture, textureInfo);
        }
      }
    });
    return this;
  }
}
KHRMaterialsPBRSpecularGlossiness.EXTENSION_NAME = NAME$a;

const {
  R: R$2,
  G: G$2,
  B: B$1,
  A: A$1
} = TextureChannel;
/**
 * Defines sheen on a PBR {@link Material}. See {@link KHRMaterialsSheen}.
 */
class Sheen extends ExtensionProperty {
  init() {
    this.extensionName = KHR_MATERIALS_SHEEN;
    this.propertyType = 'Sheen';
    this.parentTypes = [PropertyType.MATERIAL];
  }
  getDefaults() {
    return Object.assign(super.getDefaults(), {
      sheenColorFactor: [0.0, 0.0, 0.0],
      sheenColorTexture: null,
      sheenColorTextureInfo: new TextureInfo(this.graph, 'sheenColorTextureInfo'),
      sheenRoughnessFactor: 0.0,
      sheenRoughnessTexture: null,
      sheenRoughnessTextureInfo: new TextureInfo(this.graph, 'sheenRoughnessTextureInfo')
    });
  }
  /**********************************************************************************************
   * Sheen color.
   */
  /** Sheen; linear multiplier. */
  getSheenColorFactor() {
    return this.get('sheenColorFactor');
  }
  /** Sheen; linear multiplier. */
  setSheenColorFactor(factor) {
    return this.set('sheenColorFactor', factor);
  }
  /**
   * Sheen color texture, in sRGB colorspace.
   */
  getSheenColorTexture() {
    return this.getRef('sheenColorTexture');
  }
  /**
   * Settings affecting the material's use of its sheen color texture. If no texture is attached,
   * {@link TextureInfo} is `null`.
   */
  getSheenColorTextureInfo() {
    return this.getRef('sheenColorTexture') ? this.getRef('sheenColorTextureInfo') : null;
  }
  /** Sets sheen color texture. See {@link Sheen.getSheenColorTexture getSheenColorTexture}. */
  setSheenColorTexture(texture) {
    return this.setRef('sheenColorTexture', texture, {
      channels: R$2 | G$2 | B$1,
      isColor: true
    });
  }
  /**********************************************************************************************
   * Sheen roughness.
   */
  /** Sheen roughness; linear multiplier. See {@link Sheen.getSheenRoughnessTexture getSheenRoughnessTexture}. */
  getSheenRoughnessFactor() {
    return this.get('sheenRoughnessFactor');
  }
  /** Sheen roughness; linear multiplier. See {@link Sheen.getSheenRoughnessTexture getSheenRoughnessTexture}. */
  setSheenRoughnessFactor(factor) {
    return this.set('sheenRoughnessFactor', factor);
  }
  /**
   * Sheen roughness texture; linear multiplier. The `a` channel of this texture specifies
   * roughness, independent of the base layer's roughness.
   */
  getSheenRoughnessTexture() {
    return this.getRef('sheenRoughnessTexture');
  }
  /**
   * Settings affecting the material's use of its sheen roughness texture. If no texture is
   * attached, {@link TextureInfo} is `null`.
   */
  getSheenRoughnessTextureInfo() {
    return this.getRef('sheenRoughnessTexture') ? this.getRef('sheenRoughnessTextureInfo') : null;
  }
  /**
   * Sets sheen roughness texture.  The `a` channel of this texture specifies
   * roughness, independent of the base layer's roughness.
   */
  setSheenRoughnessTexture(texture) {
    return this.setRef('sheenRoughnessTexture', texture, {
      channels: A$1
    });
  }
}
Sheen.EXTENSION_NAME = KHR_MATERIALS_SHEEN;

const NAME$9 = KHR_MATERIALS_SHEEN;
/**
 * [`KHR_materials_sheen`](https://github.com/KhronosGroup/glTF/tree/master/extensions/2.0/Khronos/KHR_materials_sheen/)
 * defines a velvet-like sheen layered on a glTF PBR material.
 *
 * ![Illustration](/media/extensions/khr-materials-sheen.png)
 *
 * > _**Figure:** A cushion, showing high material roughness and low sheen roughness. Soft
 * > highlights at edges of the material show backscattering from microfibers. Source: Khronos
 * > Group._
 *
 * A sheen layer is a common technique used in Physically-Based Rendering to represent
 * cloth and fabric materials.
 *
 * Properties:
 * - {@link Sheen}
 *
 * ### Example
 *
 * The `KHRMaterialsSheen` class provides a single {@link ExtensionProperty} type, `Sheen`,
 * which may be attached to any {@link Material} instance. For example:
 *
 * ```typescript
 * import { KHRMaterialsSheen, Sheen } from '@gltf-transform/extensions';
 *
 * // Create an Extension attached to the Document.
 * const sheenExtension = document.createExtension(KHRMaterialsSheen);
 *
 * // Create a Sheen property.
 * const sheen = sheenExtension.createSheen()
 * 	.setSheenColorFactor([1.0, 1.0, 1.0]);
 *
 * // Attach the property to a Material.
 * material.setExtension('KHR_materials_sheen', sheen);
 * ```
 */
class KHRMaterialsSheen extends Extension {
  constructor(...args) {
    super(...args);
    this.extensionName = NAME$9;
    this.prereadTypes = [PropertyType.MESH];
    this.prewriteTypes = [PropertyType.MESH];
  }
  /** Creates a new Sheen property for use on a {@link Material}. */
  createSheen() {
    return new Sheen(this.document.getGraph());
  }
  /** @hidden */
  read(_context) {
    return this;
  }
  /** @hidden */
  write(_context) {
    return this;
  }
  /** @hidden */
  preread(context) {
    const jsonDoc = context.jsonDoc;
    const materialDefs = jsonDoc.json.materials || [];
    const textureDefs = jsonDoc.json.textures || [];
    materialDefs.forEach((materialDef, materialIndex) => {
      if (materialDef.extensions && materialDef.extensions[NAME$9]) {
        const sheen = this.createSheen();
        context.materials[materialIndex].setExtension(NAME$9, sheen);
        const sheenDef = materialDef.extensions[NAME$9];
        // Factors.
        if (sheenDef.sheenColorFactor !== undefined) {
          sheen.setSheenColorFactor(sheenDef.sheenColorFactor);
        }
        if (sheenDef.sheenRoughnessFactor !== undefined) {
          sheen.setSheenRoughnessFactor(sheenDef.sheenRoughnessFactor);
        }
        // Textures.
        if (sheenDef.sheenColorTexture !== undefined) {
          const textureInfoDef = sheenDef.sheenColorTexture;
          const texture = context.textures[textureDefs[textureInfoDef.index].source];
          sheen.setSheenColorTexture(texture);
          context.setTextureInfo(sheen.getSheenColorTextureInfo(), textureInfoDef);
        }
        if (sheenDef.sheenRoughnessTexture !== undefined) {
          const textureInfoDef = sheenDef.sheenRoughnessTexture;
          const texture = context.textures[textureDefs[textureInfoDef.index].source];
          sheen.setSheenRoughnessTexture(texture);
          context.setTextureInfo(sheen.getSheenRoughnessTextureInfo(), textureInfoDef);
        }
      }
    });
    return this;
  }
  /** @hidden */
  prewrite(context) {
    const jsonDoc = context.jsonDoc;
    this.document.getRoot().listMaterials().forEach(material => {
      const sheen = material.getExtension(NAME$9);
      if (sheen) {
        const materialIndex = context.materialIndexMap.get(material);
        const materialDef = jsonDoc.json.materials[materialIndex];
        materialDef.extensions = materialDef.extensions || {};
        // Factors.
        const sheenDef = materialDef.extensions[NAME$9] = {
          sheenColorFactor: sheen.getSheenColorFactor(),
          sheenRoughnessFactor: sheen.getSheenRoughnessFactor()
        };
        // Textures.
        if (sheen.getSheenColorTexture()) {
          const texture = sheen.getSheenColorTexture();
          const textureInfo = sheen.getSheenColorTextureInfo();
          sheenDef.sheenColorTexture = context.createTextureInfoDef(texture, textureInfo);
        }
        if (sheen.getSheenRoughnessTexture()) {
          const texture = sheen.getSheenRoughnessTexture();
          const textureInfo = sheen.getSheenRoughnessTextureInfo();
          sheenDef.sheenRoughnessTexture = context.createTextureInfoDef(texture, textureInfo);
        }
      }
    });
    return this;
  }
}
KHRMaterialsSheen.EXTENSION_NAME = NAME$9;

const {
  R: R$1,
  G: G$1,
  B,
  A
} = TextureChannel;
/**
 * Defines specular reflectivity on a PBR {@link Material}. See {@link KHRMaterialsSpecular}.
 */
class Specular extends ExtensionProperty {
  init() {
    this.extensionName = KHR_MATERIALS_SPECULAR;
    this.propertyType = 'Specular';
    this.parentTypes = [PropertyType.MATERIAL];
  }
  getDefaults() {
    return Object.assign(super.getDefaults(), {
      specularFactor: 1.0,
      specularTexture: null,
      specularTextureInfo: new TextureInfo(this.graph, 'specularTextureInfo'),
      specularColorFactor: [1.0, 1.0, 1.0],
      specularColorTexture: null,
      specularColorTextureInfo: new TextureInfo(this.graph, 'specularColorTextureInfo')
    });
  }
  /**********************************************************************************************
   * Specular.
   */
  /** Specular; linear multiplier. See {@link Specular.getSpecularTexture getSpecularTexture}. */
  getSpecularFactor() {
    return this.get('specularFactor');
  }
  /** Specular; linear multiplier. See {@link Specular.getSpecularTexture getSpecularTexture}. */
  setSpecularFactor(factor) {
    return this.set('specularFactor', factor);
  }
  /** Specular color; Linear-sRGB components. See {@link Specular.getSpecularTexture getSpecularTexture}. */
  getSpecularColorFactor() {
    return this.get('specularColorFactor');
  }
  /** Specular color; Linear-sRGB components. See {@link Specular.getSpecularTexture getSpecularTexture}. */
  setSpecularColorFactor(factor) {
    return this.set('specularColorFactor', factor);
  }
  /**
   * Specular texture; linear multiplier. Configures the strength of the specular reflection in
   * the dielectric BRDF. A value of zero disables the specular reflection, resulting in a pure
   * diffuse material.
   *
   * Only the alpha (A) channel is used for specular strength, but this texture may optionally
   * be packed with specular color (RGB) into a single texture.
   */
  getSpecularTexture() {
    return this.getRef('specularTexture');
  }
  /**
   * Settings affecting the material's use of its specular texture. If no texture is attached,
   * {@link TextureInfo} is `null`.
   */
  getSpecularTextureInfo() {
    return this.getRef('specularTexture') ? this.getRef('specularTextureInfo') : null;
  }
  /** Sets specular texture. See {@link Specular.getSpecularTexture getSpecularTexture}. */
  setSpecularTexture(texture) {
    return this.setRef('specularTexture', texture, {
      channels: A
    });
  }
  /**
   * Specular color texture; linear multiplier. Defines the F0 color of the specular reflection
   * (RGB channels, encoded in sRGB) in the the dielectric BRDF.
   *
   * Only RGB channels are used here, but this texture may optionally be packed with a specular
   * factor (A) into a single texture.
   */
  getSpecularColorTexture() {
    return this.getRef('specularColorTexture');
  }
  /**
   * Settings affecting the material's use of its specular color texture. If no texture is
   * attached, {@link TextureInfo} is `null`.
   */
  getSpecularColorTextureInfo() {
    return this.getRef('specularColorTexture') ? this.getRef('specularColorTextureInfo') : null;
  }
  /** Sets specular color texture. See {@link Specular.getSpecularColorTexture getSpecularColorTexture}. */
  setSpecularColorTexture(texture) {
    return this.setRef('specularColorTexture', texture, {
      channels: R$1 | G$1 | B,
      isColor: true
    });
  }
}
Specular.EXTENSION_NAME = KHR_MATERIALS_SPECULAR;

const NAME$8 = KHR_MATERIALS_SPECULAR;
/**
 * [`KHR_materials_specular`](https://github.com/KhronosGroup/gltf/blob/main/extensions/2.0/Khronos/KHR_materials_specular/)
 * adjusts the strength of the specular reflection in the dielectric BRDF.
 *
 * KHRMaterialsSpecular is a better alternative to the older
 * {@link KHRMaterialsPBRSpecularGlossiness KHR_materials_pbrSpecularGlossiness} extension, and
 * provides specular information while remaining within a metal/rough PBR workflow. A
 * value of zero disables the specular reflection, resulting in a pure diffuse material.
 *
 * Properties:
 * - {@link Specular}
 *
 * ### Example
 *
 * The `KHRMaterialsSpecular` class provides a single {@link ExtensionProperty} type, `Specular`,
 * which may be attached to any {@link Material} instance. For example:
 *
 * ```typescript
 * import { KHRMaterialsSpecular, Specular } from '@gltf-transform/extensions';
 *
 * // Create an Extension attached to the Document.
 * const specularExtension = document.createExtension(KHRMaterialsSpecular);
 *
 * // Create a Specular property.
 * const specular = specularExtension.createSpecular()
 * 	.setSpecularFactor(1.0);
 *
 * // Attach the property to a Material.
 * material.setExtension('KHR_materials_specular', specular);
 * ```
 */
class KHRMaterialsSpecular extends Extension {
  constructor(...args) {
    super(...args);
    this.extensionName = NAME$8;
    this.prereadTypes = [PropertyType.MESH];
    this.prewriteTypes = [PropertyType.MESH];
  }
  /** Creates a new Specular property for use on a {@link Material}. */
  createSpecular() {
    return new Specular(this.document.getGraph());
  }
  /** @hidden */
  read(_context) {
    return this;
  }
  /** @hidden */
  write(_context) {
    return this;
  }
  /** @hidden */
  preread(context) {
    const jsonDoc = context.jsonDoc;
    const materialDefs = jsonDoc.json.materials || [];
    const textureDefs = jsonDoc.json.textures || [];
    materialDefs.forEach((materialDef, materialIndex) => {
      if (materialDef.extensions && materialDef.extensions[NAME$8]) {
        const specular = this.createSpecular();
        context.materials[materialIndex].setExtension(NAME$8, specular);
        const specularDef = materialDef.extensions[NAME$8];
        // Factors.
        if (specularDef.specularFactor !== undefined) {
          specular.setSpecularFactor(specularDef.specularFactor);
        }
        if (specularDef.specularColorFactor !== undefined) {
          specular.setSpecularColorFactor(specularDef.specularColorFactor);
        }
        // Textures.
        if (specularDef.specularTexture !== undefined) {
          const textureInfoDef = specularDef.specularTexture;
          const texture = context.textures[textureDefs[textureInfoDef.index].source];
          specular.setSpecularTexture(texture);
          context.setTextureInfo(specular.getSpecularTextureInfo(), textureInfoDef);
        }
        if (specularDef.specularColorTexture !== undefined) {
          const textureInfoDef = specularDef.specularColorTexture;
          const texture = context.textures[textureDefs[textureInfoDef.index].source];
          specular.setSpecularColorTexture(texture);
          context.setTextureInfo(specular.getSpecularColorTextureInfo(), textureInfoDef);
        }
      }
    });
    return this;
  }
  /** @hidden */
  prewrite(context) {
    const jsonDoc = context.jsonDoc;
    this.document.getRoot().listMaterials().forEach(material => {
      const specular = material.getExtension(NAME$8);
      if (specular) {
        const materialIndex = context.materialIndexMap.get(material);
        const materialDef = jsonDoc.json.materials[materialIndex];
        materialDef.extensions = materialDef.extensions || {};
        // Factors.
        const specularDef = materialDef.extensions[NAME$8] = {};
        if (specular.getSpecularFactor() !== 1) {
          specularDef.specularFactor = specular.getSpecularFactor();
        }
        if (!MathUtils.eq(specular.getSpecularColorFactor(), [1, 1, 1])) {
          specularDef.specularColorFactor = specular.getSpecularColorFactor();
        }
        // Textures.
        if (specular.getSpecularTexture()) {
          const texture = specular.getSpecularTexture();
          const textureInfo = specular.getSpecularTextureInfo();
          specularDef.specularTexture = context.createTextureInfoDef(texture, textureInfo);
        }
        if (specular.getSpecularColorTexture()) {
          const texture = specular.getSpecularColorTexture();
          const textureInfo = specular.getSpecularColorTextureInfo();
          specularDef.specularColorTexture = context.createTextureInfoDef(texture, textureInfo);
        }
      }
    });
    return this;
  }
}
KHRMaterialsSpecular.EXTENSION_NAME = NAME$8;

const {
  R
} = TextureChannel;
/**
 * Defines optical transmission on a PBR {@link Material}. See {@link KHRMaterialsTransmission}.
 */
class Transmission extends ExtensionProperty {
  init() {
    this.extensionName = KHR_MATERIALS_TRANSMISSION;
    this.propertyType = 'Transmission';
    this.parentTypes = [PropertyType.MATERIAL];
  }
  getDefaults() {
    return Object.assign(super.getDefaults(), {
      transmissionFactor: 0.0,
      transmissionTexture: null,
      transmissionTextureInfo: new TextureInfo(this.graph, 'transmissionTextureInfo')
    });
  }
  /**********************************************************************************************
   * Transmission.
   */
  /** Transmission; linear multiplier. See {@link Transmission.getTransmissionTexture getTransmissionTexture}. */
  getTransmissionFactor() {
    return this.get('transmissionFactor');
  }
  /** Transmission; linear multiplier. See {@link Transmission.getTransmissionTexture getTransmissionTexture}. */
  setTransmissionFactor(factor) {
    return this.set('transmissionFactor', factor);
  }
  /**
   * Transmission texture; linear multiplier. The `r` channel of this texture specifies
   * transmission [0-1] of the material's surface. By default this is a thin transparency
   * effect, but volume effects (refraction, subsurface scattering) may be introduced with the
   * addition of the `KHR_materials_volume` extension.
   */
  getTransmissionTexture() {
    return this.getRef('transmissionTexture');
  }
  /**
   * Settings affecting the material's use of its transmission texture. If no texture is attached,
   * {@link TextureInfo} is `null`.
   */
  getTransmissionTextureInfo() {
    return this.getRef('transmissionTexture') ? this.getRef('transmissionTextureInfo') : null;
  }
  /** Sets transmission texture. See {@link Transmission.getTransmissionTexture getTransmissionTexture}. */
  setTransmissionTexture(texture) {
    return this.setRef('transmissionTexture', texture, {
      channels: R
    });
  }
}
Transmission.EXTENSION_NAME = KHR_MATERIALS_TRANSMISSION;

const NAME$7 = KHR_MATERIALS_TRANSMISSION;
/**
 * [`KHR_materials_transmission`](https://github.com/KhronosGroup/gltf/blob/main/extensions/2.0/Khronos/KHR_materials_transmission/)
 * provides a common type of optical transparency: infinitely-thin materials with no refraction,
 * scattering, or dispersion.
 *
 * ![Illustration](/media/extensions/khr-materials-transmission.png)
 *
 * > _**Figure:** Sphere using `KHR_materials_transmission` with varying roughness (0.0, 0.2, 0.4).
 * > Source: Khronos Group._
 *
 * While default PBR materials using alpha blending become invisible as their opacity approaches
 * zero, a transmissive material continues to reflect light in a glass-like manner, even at low
 * transmission values. When combined with {@link KHRMaterialsVolume}, transmission may be used for
 * thicker materials and refractive effects.
 *
 * Properties:
 * - {@link Transmission}
 *
 * ### Example
 *
 * The `KHRMaterialsTransmission` class provides a single {@link ExtensionProperty} type,
 * `Transmission`, which may be attached to any {@link Material} instance. For example:
 *
 * ```typescript
 * import { KHRMaterialsTransmission, Transmission } from '@gltf-transform/extensions';
 *
 * // Create an Extension attached to the Document.
 * const transmissionExtension = document.createExtension(KHRMaterialsTransmission);
 *
 * // Create a Transmission property.
 * const transmission = transmissionExtension.createTransmission()
 * 	.setTransmissionFactor(1.0);
 *
 * // Attach the property to a Material.
 * material.setExtension('KHR_materials_transmission', transmission);
 * ```
 */
class KHRMaterialsTransmission extends Extension {
  constructor(...args) {
    super(...args);
    this.extensionName = NAME$7;
    this.prereadTypes = [PropertyType.MESH];
    this.prewriteTypes = [PropertyType.MESH];
  }
  /** Creates a new Transmission property for use on a {@link Material}. */
  createTransmission() {
    return new Transmission(this.document.getGraph());
  }
  /** @hidden */
  read(_context) {
    return this;
  }
  /** @hidden */
  write(_context) {
    return this;
  }
  /** @hidden */
  preread(context) {
    const jsonDoc = context.jsonDoc;
    const materialDefs = jsonDoc.json.materials || [];
    const textureDefs = jsonDoc.json.textures || [];
    materialDefs.forEach((materialDef, materialIndex) => {
      if (materialDef.extensions && materialDef.extensions[NAME$7]) {
        const transmission = this.createTransmission();
        context.materials[materialIndex].setExtension(NAME$7, transmission);
        const transmissionDef = materialDef.extensions[NAME$7];
        // Factors.
        if (transmissionDef.transmissionFactor !== undefined) {
          transmission.setTransmissionFactor(transmissionDef.transmissionFactor);
        }
        // Textures.
        if (transmissionDef.transmissionTexture !== undefined) {
          const textureInfoDef = transmissionDef.transmissionTexture;
          const texture = context.textures[textureDefs[textureInfoDef.index].source];
          transmission.setTransmissionTexture(texture);
          context.setTextureInfo(transmission.getTransmissionTextureInfo(), textureInfoDef);
        }
      }
    });
    return this;
  }
  /** @hidden */
  prewrite(context) {
    const jsonDoc = context.jsonDoc;
    this.document.getRoot().listMaterials().forEach(material => {
      const transmission = material.getExtension(NAME$7);
      if (transmission) {
        const materialIndex = context.materialIndexMap.get(material);
        const materialDef = jsonDoc.json.materials[materialIndex];
        materialDef.extensions = materialDef.extensions || {};
        // Factors.
        const transmissionDef = materialDef.extensions[NAME$7] = {
          transmissionFactor: transmission.getTransmissionFactor()
        };
        // Textures.
        if (transmission.getTransmissionTexture()) {
          const texture = transmission.getTransmissionTexture();
          const textureInfo = transmission.getTransmissionTextureInfo();
          transmissionDef.transmissionTexture = context.createTextureInfoDef(texture, textureInfo);
        }
      }
    });
    return this;
  }
}
KHRMaterialsTransmission.EXTENSION_NAME = NAME$7;

/**
 * Converts a PBR {@link Material} to an unlit shading model. See {@link KHRMaterialsUnlit}.
 */
class Unlit extends ExtensionProperty {
  init() {
    this.extensionName = KHR_MATERIALS_UNLIT;
    this.propertyType = 'Unlit';
    this.parentTypes = [PropertyType.MATERIAL];
  }
}
Unlit.EXTENSION_NAME = KHR_MATERIALS_UNLIT;

const NAME$6 = KHR_MATERIALS_UNLIT;
/**
 * [`KHR_materials_unlit`](https://github.com/KhronosGroup/gltf/blob/main/extensions/2.0/Khronos/KHR_materials_unlit/)
 * defines an unlit shading model for use in glTF 2.0 materials.
 *
 * ![Illustration](/media/extensions/khr-materials-unlit.png)
 *
 * > _**Figure:** Unlit materials are useful for flat shading, stylized effects, and for improving
 * > performance on mobile devices. Source: [Model by Hayden VanEarden](https://sketchfab.com/3d-models/summertime-kirby-c5711316103a4d67a62c34cfe8710938)._
 *
 * Unlit (also "Shadeless" or "Constant") materials provide a simple alternative to the Physically
 * Based Rendering (PBR) shading models provided by the core specification. Unlit materials are
 * often useful for cheaper rendering on performance-contrained devices, e.g. mobile phones.
 * Additionally, unlit materials can be very useful in achieving stylized, non-photo-realistic
 * effects like hand painted illustrative styles or baked toon shaders.
 *
 * Properties:
 * - {@link Unlit}
 *
 * ### Example
 *
 * The `KHRMaterialsUnlit` class provides a single {@link ExtensionProperty} type, `Unlit`, which may
 * be attached to any {@link Material} instance. For example:
 *
 * ```typescript
 * import { KHRMaterialsUnlit, Unlit } from '@gltf-transform/extensions';
 *
 * // Create an Extension attached to the Document.
 * const unlitExtension = document.createExtension(KHRMaterialsUnlit);
 *
 * // Create an Unlit property.
 * const unlit = unlitExtension.createUnlit();
 *
 * // Attach the property to a Material.
 * material.setExtension('KHR_materials_unlit', unlit);
 * ```
 */
class KHRMaterialsUnlit extends Extension {
  constructor(...args) {
    super(...args);
    this.extensionName = NAME$6;
    this.prereadTypes = [PropertyType.MESH];
    this.prewriteTypes = [PropertyType.MESH];
  }
  /** Creates a new Unlit property for use on a {@link Material}. */
  createUnlit() {
    return new Unlit(this.document.getGraph());
  }
  /** @hidden */
  read(_context) {
    return this;
  }
  /** @hidden */
  write(_context) {
    return this;
  }
  /** @hidden */
  preread(context) {
    const materialDefs = context.jsonDoc.json.materials || [];
    materialDefs.forEach((materialDef, materialIndex) => {
      if (materialDef.extensions && materialDef.extensions[NAME$6]) {
        context.materials[materialIndex].setExtension(NAME$6, this.createUnlit());
      }
    });
    return this;
  }
  /** @hidden */
  prewrite(context) {
    const jsonDoc = context.jsonDoc;
    this.document.getRoot().listMaterials().forEach(material => {
      if (material.getExtension(NAME$6)) {
        const materialIndex = context.materialIndexMap.get(material);
        const materialDef = jsonDoc.json.materials[materialIndex];
        materialDef.extensions = materialDef.extensions || {};
        materialDef.extensions[NAME$6] = {};
      }
    });
    return this;
  }
}
KHRMaterialsUnlit.EXTENSION_NAME = NAME$6;

/**
 * Maps {@link Variant}s to {@link Material}s. See {@link KHRMaterialsVariants}.
 */
class Mapping extends ExtensionProperty {
  init() {
    this.extensionName = KHR_MATERIALS_VARIANTS;
    this.propertyType = 'Mapping';
    this.parentTypes = ['MappingList'];
  }
  getDefaults() {
    return Object.assign(super.getDefaults(), {
      material: null,
      variants: new RefSet()
    });
  }
  /** The {@link Material} designated for this {@link Primitive}, under the given variants. */
  getMaterial() {
    return this.getRef('material');
  }
  /** The {@link Material} designated for this {@link Primitive}, under the given variants. */
  setMaterial(material) {
    return this.setRef('material', material);
  }
  /** Adds a {@link Variant} to this mapping. */
  addVariant(variant) {
    return this.addRef('variants', variant);
  }
  /** Removes a {@link Variant} from this mapping. */
  removeVariant(variant) {
    return this.removeRef('variants', variant);
  }
  /** Lists {@link Variant}s in this mapping. */
  listVariants() {
    return this.listRefs('variants');
  }
}
Mapping.EXTENSION_NAME = KHR_MATERIALS_VARIANTS;

/**
 * List of material variant {@link Mapping}s. See {@link KHRMaterialsVariants}.
 */
class MappingList extends ExtensionProperty {
  init() {
    this.extensionName = KHR_MATERIALS_VARIANTS;
    this.propertyType = 'MappingList';
    this.parentTypes = [PropertyType.PRIMITIVE];
  }
  getDefaults() {
    return Object.assign(super.getDefaults(), {
      mappings: new RefSet()
    });
  }
  /** Adds a {@link Mapping} to this mapping. */
  addMapping(mapping) {
    return this.addRef('mappings', mapping);
  }
  /** Removes a {@link Mapping} from the list for this {@link Primitive}. */
  removeMapping(mapping) {
    return this.removeRef('mappings', mapping);
  }
  /** Lists {@link Mapping}s in this {@link Primitive}. */
  listMappings() {
    return this.listRefs('mappings');
  }
}
MappingList.EXTENSION_NAME = KHR_MATERIALS_VARIANTS;

/**
 * Defines a variant of a {@link Material}. See {@link KHRMaterialsVariants}.
 */
class Variant extends ExtensionProperty {
  init() {
    this.extensionName = KHR_MATERIALS_VARIANTS;
    this.propertyType = 'Variant';
    this.parentTypes = ['MappingList'];
  }
}
Variant.EXTENSION_NAME = KHR_MATERIALS_VARIANTS;

const NAME$5 = KHR_MATERIALS_VARIANTS;
/**
 * [`KHR_materials_variants`](https://github.com/KhronosGroup/glTF/tree/master/extensions/2.0/Khronos/KHR_materials_variants/)
 * defines alternate {@link Material} states for any {@link Primitive} in the scene.
 *
 * ![Illustration](/media/extensions/khr-materials-variants.jpg)
 *
 * > _**Figure:** A sneaker, in three material variants. Source: Khronos Group._
 *
 * Uses include product configurators, night/day states, healthy/damaged states, etc. The
 * `KHRMaterialsVariants` class provides three {@link ExtensionProperty} types: `Variant`, `Mapping`,
 * and `MappingList`. When attached to {@link Primitive} properties, these offer flexible ways of
 * defining the variants available to an application. Triggering a variant is out of scope of this
 * extension, but could be handled in the application with a UI dropdown, particular game states,
 * and so on.
 *
 * Mesh geometry cannot be changed by this extension, although another extension
 * (tentative: `KHR_mesh_variants`) is under consideration by the Khronos Group, for that purpose.
 *
 * Properties:
 * - {@link Variant}
 * - {@link Mapping}
 * - {@link MappingList}
 *
 * ### Example
 *
 * ```typescript
 * import { KHRMaterialsVariants } from '@gltf-transform/extensions';
 *
 * // Create an Extension attached to the Document.
 * const variantExtension = document.createExtension(KHRMaterialsVariants);
 *
 * // Create some Variant states.
 * const healthyVariant = variantExtension.createVariant('Healthy');
 * const damagedVariant = variantExtension.createVariant('Damaged');
 *
 * // Create mappings from a Variant state to a Material.
 * const healthyMapping = variantExtension.createMapping()
 * 	.addVariant(healthyVariant)
 * 	.setMaterial(healthyMat);
 * const damagedMapping = variantExtension.createMapping()
 * 	.addVariant(damagedVariant)
 * 	.setMaterial(damagedMat);
 *
 * // Attach the mappings to a Primitive.
 * primitive.setExtension(
 * 	'KHR_materials_variants',
 * 	variantExtension.createMappingList()
 * 		.addMapping(healthyMapping)
 * 		.addMapping(damagedMapping)
 * );
 * ```
 *
 * A few notes about this extension:
 *
 * 1. Viewers that don't recognized this extension will show the default material for each primitive
 * 	 instead, so assign that material accordingly. This material can be — but doesn't have to be —
 * 	 associated with one of the available variants.
 * 2. Mappings can list multiple Variants. In that case, the first Mapping containing an active
 * 	 Variant will be chosen by the viewer.
 * 3. Variant names are how these states are identified, so choose informative names.
 * 4. When writing the file to an unpacked `.gltf`, instead of an embedded `.glb`, viewers will have
 * 	 the option of downloading only textures associated with the default state, and lazy-loading
 * 	 any textures for inactive Variants only when they are needed.
 */
class KHRMaterialsVariants extends Extension {
  constructor(...args) {
    super(...args);
    this.extensionName = NAME$5;
  }
  /** Creates a new MappingList property. */
  createMappingList() {
    return new MappingList(this.document.getGraph());
  }
  /** Creates a new Variant property. */
  createVariant(name = '') {
    return new Variant(this.document.getGraph(), name);
  }
  /** Creates a new Mapping property. */
  createMapping() {
    return new Mapping(this.document.getGraph());
  }
  /** Lists all Variants on the current Document. */
  listVariants() {
    return Array.from(this.properties).filter(prop => prop instanceof Variant);
  }
  /** @hidden */
  read(context) {
    const jsonDoc = context.jsonDoc;
    if (!jsonDoc.json.extensions || !jsonDoc.json.extensions[NAME$5]) return this;
    // Read all top-level variant names.
    const variantsRootDef = jsonDoc.json.extensions[NAME$5];
    const variantDefs = variantsRootDef.variants || [];
    const variants = variantDefs.map(variantDef => this.createVariant().setName(variantDef.name || ''));
    // For each mesh primitive, read its material/variant mappings.
    const meshDefs = jsonDoc.json.meshes || [];
    meshDefs.forEach((meshDef, meshIndex) => {
      const mesh = context.meshes[meshIndex];
      const primDefs = meshDef.primitives || [];
      primDefs.forEach((primDef, primIndex) => {
        if (!primDef.extensions || !primDef.extensions[NAME$5]) {
          return;
        }
        const mappingList = this.createMappingList();
        const variantPrimDef = primDef.extensions[NAME$5];
        for (const mappingDef of variantPrimDef.mappings) {
          const mapping = this.createMapping();
          if (mappingDef.material !== undefined) {
            mapping.setMaterial(context.materials[mappingDef.material]);
          }
          for (const variantIndex of mappingDef.variants || []) {
            mapping.addVariant(variants[variantIndex]);
          }
          mappingList.addMapping(mapping);
        }
        mesh.listPrimitives()[primIndex].setExtension(NAME$5, mappingList);
      });
    });
    return this;
  }
  /** @hidden */
  write(context) {
    const jsonDoc = context.jsonDoc;
    const variants = this.listVariants();
    if (!variants.length) return this;
    // Write all top-level variant names.
    const variantDefs = [];
    const variantIndexMap = new Map();
    for (const variant of variants) {
      variantIndexMap.set(variant, variantDefs.length);
      variantDefs.push(context.createPropertyDef(variant));
    }
    // For each mesh primitive, write its material/variant mappings.
    for (const mesh of this.document.getRoot().listMeshes()) {
      const meshIndex = context.meshIndexMap.get(mesh);
      mesh.listPrimitives().forEach((prim, primIndex) => {
        const mappingList = prim.getExtension(NAME$5);
        if (!mappingList) return;
        const primDef = context.jsonDoc.json.meshes[meshIndex].primitives[primIndex];
        const mappingDefs = mappingList.listMappings().map(mapping => {
          const mappingDef = context.createPropertyDef(mapping);
          const material = mapping.getMaterial();
          if (material) {
            mappingDef.material = context.materialIndexMap.get(material);
          }
          mappingDef.variants = mapping.listVariants().map(variant => variantIndexMap.get(variant));
          return mappingDef;
        });
        primDef.extensions = primDef.extensions || {};
        primDef.extensions[NAME$5] = {
          mappings: mappingDefs
        };
      });
    }
    jsonDoc.json.extensions = jsonDoc.json.extensions || {};
    jsonDoc.json.extensions[NAME$5] = {
      variants: variantDefs
    };
    return this;
  }
}
KHRMaterialsVariants.EXTENSION_NAME = NAME$5;

const {
  G
} = TextureChannel;
/**
 * Defines volume on a PBR {@link Material}. See {@link KHRMaterialsVolume}.
 */
class Volume extends ExtensionProperty {
  init() {
    this.extensionName = KHR_MATERIALS_VOLUME;
    this.propertyType = 'Volume';
    this.parentTypes = [PropertyType.MATERIAL];
  }
  getDefaults() {
    return Object.assign(super.getDefaults(), {
      thicknessFactor: 0.0,
      thicknessTexture: null,
      thicknessTextureInfo: new TextureInfo(this.graph, 'thicknessTexture'),
      attenuationDistance: Infinity,
      attenuationColor: [1.0, 1.0, 1.0]
    });
  }
  /**********************************************************************************************
   * Thickness.
   */
  /**
   * Thickness of the volume beneath the surface in meters in the local coordinate system of the
   * node. If the value is 0 the material is thin-walled. Otherwise the material is a volume
   * boundary. The doubleSided property has no effect on volume boundaries.
   */
  getThicknessFactor() {
    return this.get('thicknessFactor');
  }
  /**
   * Thickness of the volume beneath the surface in meters in the local coordinate system of the
   * node. If the value is 0 the material is thin-walled. Otherwise the material is a volume
   * boundary. The doubleSided property has no effect on volume boundaries.
   */
  setThicknessFactor(factor) {
    return this.set('thicknessFactor', factor);
  }
  /**
   * Texture that defines the thickness, stored in the G channel. This will be multiplied by
   * thicknessFactor.
   */
  getThicknessTexture() {
    return this.getRef('thicknessTexture');
  }
  /**
   * Settings affecting the material's use of its thickness texture. If no texture is attached,
   * {@link TextureInfo} is `null`.
   */
  getThicknessTextureInfo() {
    return this.getRef('thicknessTexture') ? this.getRef('thicknessTextureInfo') : null;
  }
  /**
   * Texture that defines the thickness, stored in the G channel. This will be multiplied by
   * thicknessFactor.
   */
  setThicknessTexture(texture) {
    return this.setRef('thicknessTexture', texture, {
      channels: G
    });
  }
  /**********************************************************************************************
   * Attenuation.
   */
  /**
   * Density of the medium given as the average distance in meters that light travels in the
   * medium before interacting with a particle.
   */
  getAttenuationDistance() {
    return this.get('attenuationDistance');
  }
  /**
   * Density of the medium given as the average distance in meters that light travels in the
   * medium before interacting with a particle.
   */
  setAttenuationDistance(distance) {
    return this.set('attenuationDistance', distance);
  }
  /**
   * Color (linear) that white light turns into due to absorption when reaching the attenuation
   * distance.
   */
  getAttenuationColor() {
    return this.get('attenuationColor');
  }
  /**
   * Color (linear) that white light turns into due to absorption when reaching the attenuation
   * distance.
   */
  setAttenuationColor(color) {
    return this.set('attenuationColor', color);
  }
}
Volume.EXTENSION_NAME = KHR_MATERIALS_VOLUME;

const NAME$4 = KHR_MATERIALS_VOLUME;
/**
 * [KHR_materials_volume](https://github.com/KhronosGroup/gltf/blob/main/extensions/2.0/Khronos/KHR_materials_volume/)
 * adds refraction, absorption, or scattering to a glTF PBR material already using transmission or
 * translucency.
 *
 * ![Illustration](/media/extensions/khr-materials-volume.png)
 *
 * > _**Figure:** Base color changes the amount of light passing through the volume boundary
 * > (left). The overall color of the object is the same everywhere, as if the object is covered
 * > with a colored, transparent foil. Absorption changes the amount of light traveling through the
 * > volume (right). The overall color depends on the distance the light traveled through it; at
 * > small distances (tail of the dragon) less light is absorbed and the color is brighter than at
 * > large distances. Source: Khronos Group._
 *
 * By default, a glTF 2.0 material describes the scattering properties of a surface enclosing an
 * infinitely thin volume. The surface defined by the mesh represents a thin wall. The volume
 * extension makes it possible to turn the surface into an interface between volumes. The mesh to
 * which the material is attached defines the boundaries of an homogeneous medium and therefore must
 * be manifold. Volumes provide effects like refraction, absorption and scattering. Scattering
 * effects will require future (TBD) extensions.
 *
 * The volume extension must be combined with {@link KHRMaterialsTransmission} or
 * `KHR_materials_translucency` in order to define entry of light into the volume.
 *
 * Properties:
 * - {@link Volume}
 *
 * ### Example
 *
 * The `KHRMaterialsVolume` class provides a single {@link ExtensionProperty} type, `Volume`, which
 * may be attached to any {@link Material} instance. For example:
 *
 * ```typescript
 * import { KHRMaterialsVolume, Volume } from '@gltf-transform/extensions';
 *
 * // Create an Extension attached to the Document.
 * const volumeExtension = document.createExtension(KHRMaterialsVolume);
 *
 * // Create a Volume property.
 * const volume = volumeExtension.createVolume()
 * 	.setThicknessFactor(1.0)
 * 	.setThicknessTexture(texture)
 * 	.setAttenuationDistance(1.0)
 * 	.setAttenuationColorFactor([1, 0.5, 0.5]);
 *
 * // Attach the property to a Material.
 * material.setExtension('KHR_materials_volume', volume);
 * ```
 *
 * A thickness texture is required in most realtime renderers, and can be baked in software such as
 * Blender or Substance Painter. When `thicknessFactor = 0`, all volumetric effects are disabled.
 */
class KHRMaterialsVolume extends Extension {
  constructor(...args) {
    super(...args);
    this.extensionName = NAME$4;
    this.prereadTypes = [PropertyType.MESH];
    this.prewriteTypes = [PropertyType.MESH];
  }
  /** Creates a new Volume property for use on a {@link Material}. */
  createVolume() {
    return new Volume(this.document.getGraph());
  }
  /** @hidden */
  read(_context) {
    return this;
  }
  /** @hidden */
  write(_context) {
    return this;
  }
  /** @hidden */
  preread(context) {
    const jsonDoc = context.jsonDoc;
    const materialDefs = jsonDoc.json.materials || [];
    const textureDefs = jsonDoc.json.textures || [];
    materialDefs.forEach((materialDef, materialIndex) => {
      if (materialDef.extensions && materialDef.extensions[NAME$4]) {
        const volume = this.createVolume();
        context.materials[materialIndex].setExtension(NAME$4, volume);
        const volumeDef = materialDef.extensions[NAME$4];
        // Factors.
        if (volumeDef.thicknessFactor !== undefined) {
          volume.setThicknessFactor(volumeDef.thicknessFactor);
        }
        if (volumeDef.attenuationDistance !== undefined) {
          volume.setAttenuationDistance(volumeDef.attenuationDistance);
        }
        if (volumeDef.attenuationColor !== undefined) {
          volume.setAttenuationColor(volumeDef.attenuationColor);
        }
        // Textures.
        if (volumeDef.thicknessTexture !== undefined) {
          const textureInfoDef = volumeDef.thicknessTexture;
          const texture = context.textures[textureDefs[textureInfoDef.index].source];
          volume.setThicknessTexture(texture);
          context.setTextureInfo(volume.getThicknessTextureInfo(), textureInfoDef);
        }
      }
    });
    return this;
  }
  /** @hidden */
  prewrite(context) {
    const jsonDoc = context.jsonDoc;
    this.document.getRoot().listMaterials().forEach(material => {
      const volume = material.getExtension(NAME$4);
      if (volume) {
        const materialIndex = context.materialIndexMap.get(material);
        const materialDef = jsonDoc.json.materials[materialIndex];
        materialDef.extensions = materialDef.extensions || {};
        // Factors.
        const volumeDef = materialDef.extensions[NAME$4] = {};
        if (volume.getThicknessFactor() > 0) {
          volumeDef.thicknessFactor = volume.getThicknessFactor();
        }
        if (Number.isFinite(volume.getAttenuationDistance())) {
          volumeDef.attenuationDistance = volume.getAttenuationDistance();
        }
        if (!MathUtils.eq(volume.getAttenuationColor(), [1, 1, 1])) {
          volumeDef.attenuationColor = volume.getAttenuationColor();
        }
        // Textures.
        if (volume.getThicknessTexture()) {
          const texture = volume.getThicknessTexture();
          const textureInfo = volume.getThicknessTextureInfo();
          volumeDef.thicknessTexture = context.createTextureInfoDef(texture, textureInfo);
        }
      }
    });
    return this;
  }
}
KHRMaterialsVolume.EXTENSION_NAME = NAME$4;

const NAME$3 = KHR_MESH_QUANTIZATION;
/**
 * [`KHR_mesh_quantization`](https://github.com/KhronosGroup/gltf/blob/main/extensions/2.0/Khronos/KHR_mesh_quantization/)
 * expands allowed component types for vertex attributes to include 16- and 8-bit storage.
 *
 * Quantization provides a memory/precision tradeoff — depending on the application needs, 16-bit or
 * 8-bit storage can be sufficient for mesh geometry, at 1/2 or 1/4 the size. For example, a 10x10
 * mesh might be written to a uint16 {@link Accessor}, with values `0–65536`, normalized to be
 * interpreted as `0–1`. With an additional 10x scale on any node {@link Node} instantiating the
 * quantized {@link Mesh}, the model retains its original scale with a minimal quality loss and
 * up to 50% file size reduction.
 *
 * Defining no {@link ExtensionProperty} types, this {@link Extension} is simply attached to the
 * {@link Document}, and affects the entire Document by allowing more flexible use of
 * {@link Accessor} types for vertex attributes. Without the Extension, the same use of these data
 * types would yield an invalid glTF document, under the stricter core glTF specification.
 *
 * Properties:
 * - N/A
 *
 * ### Example
 *
 * ```typescript
 * import { KHRMeshQuantization } from '@gltf-transform/extensions';
 * import { quantize } from '@gltf-transform/functions';
 *
 * // Create an Extension attached to the Document.
 * const quantizationExtension = document.createExtension(KHRMeshQuantization).setRequired(true);
 *
 * // Use Uint16Array, Uint8Array, Int16Array, and Int8Array in vertex accessors manually,
 * // or apply the provided quantize() function to compute quantized accessors automatically:
 * await document.transform(quantize({
 * 	quantizePosition: 16,
 * 	quantizeNormal: 12,
 * 	quantizeTexcoord: 14
 * }));
 * ```
 *
 * For more documentation about automatic quantization, see the {@link quantize} function.
 */
class KHRMeshQuantization extends Extension {
  constructor(...args) {
    super(...args);
    this.extensionName = NAME$3;
  }
  /** @hidden */
  read(_) {
    return this;
  }
  /** @hidden */
  write(_) {
    return this;
  }
}
KHRMeshQuantization.EXTENSION_NAME = NAME$3;

const NAME$2 = KHR_TEXTURE_BASISU;
class KTX2ImageUtils {
  match(array) {
    return array[0] === 0xab && array[1] === 0x4b && array[2] === 0x54 && array[3] === 0x58 && array[4] === 0x20 && array[5] === 0x32 && array[6] === 0x30 && array[7] === 0xbb && array[8] === 0x0d && array[9] === 0x0a && array[10] === 0x1a && array[11] === 0x0a;
  }
  getSize(array) {
    const container = read(array);
    return [container.pixelWidth, container.pixelHeight];
  }
  getChannels(array) {
    const container = read(array);
    const dfd = container.dataFormatDescriptor[0];
    if (dfd.colorModel === KHR_DF_MODEL_ETC1S) {
      return dfd.samples.length === 2 && (dfd.samples[1].channelType & 0xf) === 15 ? 4 : 3;
    } else if (dfd.colorModel === KHR_DF_MODEL_UASTC) {
      return (dfd.samples[0].channelType & 0xf) === 3 ? 4 : 3;
    }
    throw new Error(`Unexpected KTX2 colorModel, "${dfd.colorModel}".`);
  }
  getVRAMByteLength(array) {
    const container = read(array);
    const hasAlpha = this.getChannels(array) > 3;
    let uncompressedBytes = 0;
    for (let i = 0; i < container.levels.length; i++) {
      const level = container.levels[i];
      // Use level.uncompressedByteLength for UASTC; for ETC1S it's 0.
      if (level.uncompressedByteLength) {
        uncompressedBytes += level.uncompressedByteLength;
      } else {
        const levelWidth = Math.max(1, Math.floor(container.pixelWidth / Math.pow(2, i)));
        const levelHeight = Math.max(1, Math.floor(container.pixelHeight / Math.pow(2, i)));
        const blockSize = hasAlpha ? 16 : 8;
        uncompressedBytes += levelWidth / 4 * (levelHeight / 4) * blockSize;
      }
    }
    return uncompressedBytes;
  }
}
/**
 * [`KHR_texture_basisu`](https://github.com/KhronosGroup/glTF/tree/master/extensions/2.0/Khronos/KHR_texture_basisu)
 * enables KTX2 GPU textures with Basis Universal supercompression for any material texture.
 *
 * GPU texture formats, unlike traditional image formats, remain compressed in GPU memory. As a
 * result, they (1) upload to the GPU much more quickly, and (2) require much less GPU memory. In
 * certain cases they may also have smaller filesizes than PNG or JPEG textures, but this is not
 * guaranteed. GPU textures often require more careful tuning during compression to maintain image
 * quality, but this extra effort is worthwhile for applications that need to maintain a smooth
 * framerate while uploading images, or where GPU memory is limited.
 *
 * Defining no {@link ExtensionProperty} types, this {@link Extension} is simply attached to the
 * {@link Document}, and affects the entire Document by allowing use of the `image/ktx2` MIME type
 * and passing KTX2 image data to the {@link Texture.setImage} method. Without the Extension, the
 * same MIME types and image data would yield an invalid glTF document, under the stricter core glTF
 * specification.
 *
 * Properties:
 * - N/A
 *
 * ### Example
 *
 * ```typescript
 * import { KHRTextureBasisu } from '@gltf-transform/extensions';
 *
 * // Create an Extension attached to the Document.
 * const basisuExtension = document.createExtension(KHRTextureBasisu)
 * 	.setRequired(true);
 * document.createTexture('MyCompressedTexture')
 * 	.setMimeType('image/ktx2')
 * 	.setImage(fs.readFileSync('my-texture.ktx2'));
 * ```
 *
 * Compression is not done automatically when adding the extension as shown above — you must
 * compress the image data first, then pass the `.ktx2` payload to {@link Texture.setImage}. The
 * glTF Transform CLI has functions to help with this, or any similar KTX2-capable
 * utility will work.
 *
 * When the `KHR_texture_basisu` extension is added to a file by glTF Transform, the extension
 * should always be required. This tool does not support writing assets that "fall back" to optional
 * PNG or JPEG image data.
 *
 * > _**NOTICE:** Compressing some textures — particularly 3-component (RGB) normal maps, and
 * > occlusion/roughness/metalness maps, may give poor results with the ETC1S compression option.
 * > These issues can often be avoided with the larger UASTC compression option, or by upscaling the
 * > texture before compressing it.
 * >
 * > For best results when authoring new textures, use
 * > [texture dilation](https://docs.substance3d.com/spdoc/padding-134643719.html) and minimize
 * > prominent UV seams._
 */
class KHRTextureBasisu extends Extension {
  constructor(...args) {
    super(...args);
    this.extensionName = NAME$2;
    /** @hidden */
    this.prereadTypes = [PropertyType.TEXTURE];
  }
  /** @hidden */
  static register() {
    ImageUtils.registerFormat('image/ktx2', new KTX2ImageUtils());
  }
  /** @hidden */
  preread(context) {
    context.jsonDoc.json.textures.forEach(textureDef => {
      if (textureDef.extensions && textureDef.extensions[NAME$2]) {
        const basisuDef = textureDef.extensions[NAME$2];
        textureDef.source = basisuDef.source;
      }
    });
    return this;
  }
  /** @hidden */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  read(context) {
    return this;
  }
  /** @hidden */
  write(context) {
    const jsonDoc = context.jsonDoc;
    this.document.getRoot().listTextures().forEach(texture => {
      if (texture.getMimeType() === 'image/ktx2') {
        const imageIndex = context.imageIndexMap.get(texture);
        jsonDoc.json.textures.forEach(textureDef => {
          if (textureDef.source === imageIndex) {
            textureDef.extensions = textureDef.extensions || {};
            textureDef.extensions[NAME$2] = {
              source: textureDef.source
            };
            delete textureDef.source;
          }
        });
      }
    });
    return this;
  }
}
KHRTextureBasisu.EXTENSION_NAME = NAME$2;

/**
 * Defines UV transform for a {@link TextureInfo}. See {@link KHRTextureTransform}.
 */
class Transform extends ExtensionProperty {
  init() {
    this.extensionName = KHR_TEXTURE_TRANSFORM;
    this.propertyType = 'Transform';
    this.parentTypes = [PropertyType.TEXTURE_INFO];
  }
  getDefaults() {
    return Object.assign(super.getDefaults(), {
      offset: [0.0, 0.0],
      rotation: 0,
      scale: [1.0, 1.0],
      texCoord: null
    });
  }
  getOffset() {
    return this.get('offset');
  }
  setOffset(offset) {
    return this.set('offset', offset);
  }
  getRotation() {
    return this.get('rotation');
  }
  setRotation(rotation) {
    return this.set('rotation', rotation);
  }
  getScale() {
    return this.get('scale');
  }
  setScale(scale) {
    return this.set('scale', scale);
  }
  getTexCoord() {
    return this.get('texCoord');
  }
  setTexCoord(texCoord) {
    return this.set('texCoord', texCoord);
  }
}
Transform.EXTENSION_NAME = KHR_TEXTURE_TRANSFORM;

const NAME$1 = KHR_TEXTURE_TRANSFORM;
/**
 * [`KHR_texture_transform`](https://github.com/KhronosGroup/gltf/blob/main/extensions/2.0/Khronos/KHR_texture_transform/)
 * adds offset, rotation, and scale to {@link TextureInfo} properties.
 *
 * Affine UV transforms are useful for reducing the number of textures the GPU must load, improving
 * performance when used in techniques like texture atlases. UV transforms cannot be animated at
 * this time.
 *
 * Properties:
 * - {@link Transform}
 *
 * ### Example
 *
 * The `KHRTextureTransform` class provides a single {@link ExtensionProperty} type, `Transform`, which
 * may be attached to any {@link TextureInfo} instance. For example:
 *
 * ```typescript
 * import { KHRTextureTransform } from '@gltf-transform/extensions';
 *
 * // Create an Extension attached to the Document.
 * const transformExtension = document.createExtension(KHRTextureTransform)
 * 	.setRequired(true);
 *
 * // Create a reusable Transform.
 * const transform = transformExtension.createTransform()
 * 	.setScale([100, 100]);
 *
 * // Apply the Transform to a Material's baseColorTexture.
 * document.createMaterial()
 * 	.setBaseColorTexture(myTexture)
 * 	.getBaseColorTextureInfo()
 * 	.setExtension('KHR_texture_transform', transform);
 * ```
 */
class KHRTextureTransform extends Extension {
  constructor(...args) {
    super(...args);
    this.extensionName = NAME$1;
  }
  /** Creates a new Transform property for use on a {@link TextureInfo}. */
  createTransform() {
    return new Transform(this.document.getGraph());
  }
  /** @hidden */
  read(context) {
    for (const [textureInfo, textureInfoDef] of Array.from(context.textureInfos.entries())) {
      if (!textureInfoDef.extensions || !textureInfoDef.extensions[NAME$1]) continue;
      const transform = this.createTransform();
      const transformDef = textureInfoDef.extensions[NAME$1];
      if (transformDef.offset !== undefined) transform.setOffset(transformDef.offset);
      if (transformDef.rotation !== undefined) transform.setRotation(transformDef.rotation);
      if (transformDef.scale !== undefined) transform.setScale(transformDef.scale);
      if (transformDef.texCoord !== undefined) transform.setTexCoord(transformDef.texCoord);
      textureInfo.setExtension(NAME$1, transform);
    }
    return this;
  }
  /** @hidden */
  write(context) {
    const textureInfoEntries = Array.from(context.textureInfoDefMap.entries());
    for (const [textureInfo, textureInfoDef] of textureInfoEntries) {
      const transform = textureInfo.getExtension(NAME$1);
      if (!transform) continue;
      textureInfoDef.extensions = textureInfoDef.extensions || {};
      const transformDef = {};
      const eq = MathUtils.eq;
      if (!eq(transform.getOffset(), [0, 0])) transformDef.offset = transform.getOffset();
      if (transform.getRotation() !== 0) transformDef.rotation = transform.getRotation();
      if (!eq(transform.getScale(), [1, 1])) transformDef.scale = transform.getScale();
      if (transform.getTexCoord() != null) transformDef.texCoord = transform.getTexCoord();
      textureInfoDef.extensions[NAME$1] = transformDef;
    }
    return this;
  }
}
KHRTextureTransform.EXTENSION_NAME = NAME$1;

const PARENT_TYPES = [PropertyType.ROOT, PropertyType.SCENE, PropertyType.NODE, PropertyType.MESH, PropertyType.MATERIAL, PropertyType.TEXTURE, PropertyType.ANIMATION];
/**
 * Defines an XMP packet associated with a Document or Property. See {@link KHRXMP}.
 */
class Packet extends ExtensionProperty {
  init() {
    this.extensionName = KHR_XMP_JSON_LD;
    this.propertyType = 'Packet';
    this.parentTypes = PARENT_TYPES;
  }
  getDefaults() {
    return Object.assign(super.getDefaults(), {
      context: {},
      properties: {}
    });
  }
  /**********************************************************************************************
   * Context.
   */
  /**
   * Returns the XMP context definition URL for the given term.
   * See: https://json-ld.org/spec/latest/json-ld/#the-context
   * @param term Case-sensitive term. Usually a concise, lowercase, alphanumeric identifier.
   */
  getContext() {
    return this.get('context');
  }
  /**
   * Sets the XMP context definition URL for the given term.
   * See: https://json-ld.org/spec/latest/json-ld/#the-context
   *
   * Example:
   *
   * ```typescript
   * packet.setContext({
   *   dc: 'http://purl.org/dc/elements/1.1/',
   *   model3d: 'https://schema.khronos.org/model3d/xsd/1.0/',
   * });
   * ```
   *
   * @param term Case-sensitive term. Usually a concise, lowercase, alphanumeric identifier.
   * @param definition URI for XMP namespace.
   */
  setContext(context) {
    return this.set('context', _extends$1({}, context));
  }
  /**********************************************************************************************
   * Properties.
   */
  /**
   * Lists properties defined in this packet.
   *
   * Example:
   *
   * ```typescript
   * packet.listProperties(); // → ['dc:Language', 'dc:Creator', 'xmp:CreateDate']
   * ```
   */
  listProperties() {
    return Object.keys(this.get('properties'));
  }
  /**
   * Returns the value of a property, as a literal or JSONLD object.
   *
   * Example:
   *
   * ```typescript
   * packet.getProperty('dc:Creator'); // → {"@list": ["Acme, Inc."]}
   * packet.getProperty('dc:Title'); // → {"@type": "rdf:Alt", "rdf:_1": {"@language": "en-US", "@value": "Lamp"}}
   * packet.getProperty('xmp:CreateDate'); // → "2022-01-01"
   * ```
   */
  getProperty(name) {
    const properties = this.get('properties');
    return name in properties ? properties[name] : null;
  }
  /**
   * Sets the value of a property, as a literal or JSONLD object.
   *
   * Example:
   *
   * ```typescript
   * packet.setProperty('dc:Creator', {'@list': ['Acme, Inc.']});
   * packet.setProperty('dc:Title', {
   * 	'@type': 'rdf:Alt',
   * 	'rdf:_1': {'@language': 'en-US', '@value': 'Lamp'}
   * });
   * packet.setProperty('model3d:preferredSurfaces', {'@list': ['vertical']});
   * ```
   */
  setProperty(name, value) {
    this._assertContext(name);
    const properties = _extends$1({}, this.get('properties'));
    if (value) {
      properties[name] = value;
    } else {
      delete properties[name];
    }
    return this.set('properties', properties);
  }
  /**********************************************************************************************
   * Serialize / Deserialize.
   */
  /**
   * Serializes the packet context and properties to a JSONLD object.
   */
  toJSONLD() {
    const context = copyJSON(this.get('context'));
    const properties = copyJSON(this.get('properties'));
    return _extends$1({
      '@context': context
    }, properties);
  }
  /**
   * Deserializes a JSONLD packet, then overwrites existing context and properties with
   * the new values.
   */
  fromJSONLD(jsonld) {
    jsonld = copyJSON(jsonld);
    // Context.
    const context = jsonld['@context'];
    if (context) this.set('context', context);
    delete jsonld['@context'];
    // Properties.
    return this.set('properties', jsonld);
  }
  /**********************************************************************************************
   * Validation.
   */
  /** @hidden */
  _assertContext(name) {
    const prefix = name.split(':')[0];
    if (!(prefix in this.get('context'))) {
      throw new Error(`${KHR_XMP_JSON_LD}: Missing context for term, "${name}".`);
    }
  }
}
Packet.EXTENSION_NAME = KHR_XMP_JSON_LD;
function copyJSON(object) {
  return JSON.parse(JSON.stringify(object));
}

const NAME = KHR_XMP_JSON_LD;
/**
 * [KHR_xmp_json_ld](https://github.com/KhronosGroup/gltf/blob/main/extensions/2.0/Khronos/KHR_xmp_json_ld/)
 * defines XMP metadata associated with a glTF asset.
 *
 * XMP metadata provides standardized fields describing the content, provenance, usage
 * restrictions, or other attributes of a 3D model. XMP metadata does not generally affect the
 * parsing or runtime behavior of the content — for that, use custom extensions, custom vertex
 * attributes, or extras. Similarly, storage mechanisms other than XMP should be preferred
 * for binary content like mesh data, animations, or textures.
 *
 * Generally XMP metadata is associated with the entire glTF asset by attaching an XMP {@link Packet}
 * to the document {@link Root}. In less common cases where metadata must be associated with
 * specific subsets of a document, XMP Packets may be attached to {@link Scene}, {@link Node},
 * {@link Mesh}, {@link Material}, {@link Texture}, or {@link Animation} properties.
 *
 * Within each packet, XMP properties become available when an
 * [XMP namespace](https://www.adobe.io/xmp/docs/XMPNamespaces/) is registered
 * with {@link Packet.setContext}. Packets cannot use properties whose namespaces are not
 * registered as context. While not all XMP namespaces are relevant to 3D assets, some common
 * namespaces provide useful metadata about authorship and provenance. Additionally, the `model3d`
 * namespace provides certain properties specific to 3D content, such as Augmented Reality (AR)
 * orientation data.
 *
 * Common XMP contexts for 3D models include:
 *
 * | Prefix      | URI                                         | Name                           |
 * |:------------|:--------------------------------------------|:-------------------------------|
 * | `dc`        | http://purl.org/dc/elements/1.1/            | Dublin Core                    |
 * | `model3d`   | https://schema.khronos.org/model3d/xsd/1.0/ | Model 3D                       |
 * | `rdf`       | http://www.w3.org/1999/02/22-rdf-syntax-ns# | Resource Description Framework |
 * | `xmp`       | http://ns.adobe.com/xap/1.0/                | XMP                            |
 * | `xmpRights` | http://ns.adobe.com/xap/1.0/rights/         | XMP Rights Management          |
 *
 * Only the XMP contexts required for a packet should be assigned, and different packets
 * in the same asset may use different contexts. For greater detail on available XMP
 * contexts and how to use them in glTF assets, see the
 * [3DC Metadata Recommendations](https://github.com/KhronosGroup/3DC-Metadata-Recommendations/blob/main/model3d.md).
 *
 * Properties:
 * - {@link Packet}
 *
 * ### Example
 *
 * ```typescript
 * import { KHRXMP, Packet } from '@gltf-transform/extensions';
 *
 * // Create an Extension attached to the Document.
 * const xmpExtension = document.createExtension(KHRXMP);
 *
 * // Create Packet property.
 * const packet = xmpExtension.createPacket()
 * 	.setContext({
 * 		dc: 'http://purl.org/dc/elements/1.1/',
 * 	})
 *	.setProperty('dc:Creator', {"@list": ["Acme, Inc."]});
 *
 * // Option 1: Assign to Document Root.
 * document.getRoot().setExtension('KHR_xmp_json_ld', packet);
 *
 * // Option 2: Assign to a specific Property.
 * texture.setExtension('KHR_xmp_json_ld', packet);
 * ```
 */
class KHRXMP extends Extension {
  constructor(...args) {
    super(...args);
    this.extensionName = NAME;
  }
  /** Creates a new XMP packet, to be linked with a {@link Document} or {@link Property Properties}. */
  createPacket() {
    return new Packet(this.document.getGraph());
  }
  /** Lists XMP packets currently defined in a {@link Document}. */
  listPackets() {
    return Array.from(this.properties);
  }
  /** @hidden */
  read(context) {
    var _context$jsonDoc$json;
    const extensionDef = (_context$jsonDoc$json = context.jsonDoc.json.extensions) == null ? void 0 : _context$jsonDoc$json[NAME];
    if (!extensionDef || !extensionDef.packets) return this;
    // Deserialize packets.
    const json = context.jsonDoc.json;
    const root = this.document.getRoot();
    const packets = extensionDef.packets.map(packetDef => this.createPacket().fromJSONLD(packetDef));
    const defLists = [[json.asset], json.scenes, json.nodes, json.meshes, json.materials, json.images, json.animations];
    const propertyLists = [[root], root.listScenes(), root.listNodes(), root.listMeshes(), root.listMaterials(), root.listTextures(), root.listAnimations()];
    // Assign packets.
    for (let i = 0; i < defLists.length; i++) {
      const defs = defLists[i] || [];
      for (let j = 0; j < defs.length; j++) {
        const def = defs[j];
        if (def.extensions && def.extensions[NAME]) {
          const xmpDef = def.extensions[NAME];
          propertyLists[i][j].setExtension(NAME, packets[xmpDef.packet]);
        }
      }
    }
    return this;
  }
  /** @hidden */
  write(context) {
    const {
      json
    } = context.jsonDoc;
    const packetDefs = [];
    for (const packet of this.properties) {
      // Serialize packets.
      packetDefs.push(packet.toJSONLD());
      // Assign packets.
      for (const parent of packet.listParents()) {
        let parentDef;
        switch (parent.propertyType) {
          case PropertyType.ROOT:
            parentDef = json.asset;
            break;
          case PropertyType.SCENE:
            parentDef = json.scenes[context.sceneIndexMap.get(parent)];
            break;
          case PropertyType.NODE:
            parentDef = json.nodes[context.nodeIndexMap.get(parent)];
            break;
          case PropertyType.MESH:
            parentDef = json.meshes[context.meshIndexMap.get(parent)];
            break;
          case PropertyType.MATERIAL:
            parentDef = json.materials[context.materialIndexMap.get(parent)];
            break;
          case PropertyType.TEXTURE:
            parentDef = json.images[context.imageIndexMap.get(parent)];
            break;
          case PropertyType.ANIMATION:
            parentDef = json.animations[context.animationIndexMap.get(parent)];
            break;
          default:
            parentDef = null;
            this.document.getLogger().warn(`[${NAME}]: Unsupported parent property, "${parent.propertyType}"`);
            break;
        }
        if (!parentDef) continue;
        parentDef.extensions = parentDef.extensions || {};
        parentDef.extensions[NAME] = {
          packet: packetDefs.length - 1
        };
      }
    }
    if (packetDefs.length > 0) {
      json.extensions = json.extensions || {};
      json.extensions[NAME] = {
        packets: packetDefs
      };
    }
    return this;
  }
}
KHRXMP.EXTENSION_NAME = NAME;

const KHRONOS_EXTENSIONS = [KHRDracoMeshCompression, KHRLightsPunctual, KHRMaterialsAnisotropy, KHRMaterialsClearcoat, KHRMaterialsDiffuseTransmission, KHRMaterialsDispersion, KHRMaterialsEmissiveStrength, KHRMaterialsIOR, KHRMaterialsIridescence, KHRMaterialsPBRSpecularGlossiness, KHRMaterialsSpecular, KHRMaterialsSheen, KHRMaterialsTransmission, KHRMaterialsUnlit, KHRMaterialsVariants, KHRMaterialsVolume, KHRMeshQuantization, KHRTextureBasisu, KHRTextureTransform, KHRXMP];

function _extends() {
  _extends = Object.assign ? Object.assign.bind() : function (target) {
    for (var i = 1; i < arguments.length; i++) {
      var source = arguments[i];
      for (var key in source) {
        if (Object.prototype.hasOwnProperty.call(source, key)) {
          target[key] = source[key];
        }
      }
    }
    return target;
  };
  return _extends.apply(this, arguments);
}

const {
  POINTS: POINTS$1,
  LINES: LINES$2,
  LINE_STRIP: LINE_STRIP$3,
  LINE_LOOP: LINE_LOOP$3,
  TRIANGLES: TRIANGLES$2,
  TRIANGLE_STRIP: TRIANGLE_STRIP$3,
  TRIANGLE_FAN: TRIANGLE_FAN$3
} = Primitive.Mode;
/**
 * Prepares a function used in an {@link Document#transform} pipeline. Use of this wrapper is
 * optional, and plain functions may be used in transform pipelines just as well. The wrapper is
 * used internally so earlier pipeline stages can detect and optimize based on later stages.
 * @hidden
 */
function createTransform(name, fn) {
  Object.defineProperty(fn, 'name', {
    value: name
  });
  return fn;
}
/**
 * Performs a shallow merge on an 'options' object and a 'defaults' object.
 * Equivalent to `{...defaults, ...options}` _except_ that `undefined` values
 * in the 'options' object are ignored.
 *
 * @hidden
 */
function assignDefaults(defaults, options) {
  const result = _extends({}, defaults);
  for (const key in options) {
    if (options[key] !== undefined) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      result[key] = options[key];
    }
  }
  return result;
}
/** @hidden */
function getGLPrimitiveCount(prim) {
  const indices = prim.getIndices();
  const position = prim.getAttribute('POSITION');
  // Reference: https://www.khronos.org/opengl/wiki/Primitive
  switch (prim.getMode()) {
    case Primitive.Mode.POINTS:
      return indices ? indices.getCount() : position.getCount();
    case Primitive.Mode.LINES:
      return indices ? indices.getCount() / 2 : position.getCount() / 2;
    case Primitive.Mode.LINE_LOOP:
      return indices ? indices.getCount() : position.getCount();
    case Primitive.Mode.LINE_STRIP:
      return indices ? indices.getCount() - 1 : position.getCount() - 1;
    case Primitive.Mode.TRIANGLES:
      return indices ? indices.getCount() / 3 : position.getCount() / 3;
    case Primitive.Mode.TRIANGLE_STRIP:
    case Primitive.Mode.TRIANGLE_FAN:
      return indices ? indices.getCount() - 2 : position.getCount() - 2;
    default:
      throw new Error('Unexpected mode: ' + prim.getMode());
  }
}
/** @hidden */
function formatLong(x) {
  return x.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}
/** @hidden */
function formatDelta(a, b, decimals = 2) {
  const prefix = a > b ? '–' : '+';
  const suffix = '%';
  return prefix + (Math.abs(a - b) / a * 100).toFixed(decimals) + suffix;
}
/** @hidden */
function formatDeltaOp(a, b) {
  return `${formatLong(a)} → ${formatLong(b)} (${formatDelta(a, b)})`;
}
/**
 * Returns a list of all unique vertex attributes on the given primitive and
 * its morph targets.
 * @hidden
 */
function deepListAttributes(prim) {
  const accessors = [];
  for (const attribute of prim.listAttributes()) {
    accessors.push(attribute);
  }
  for (const target of prim.listTargets()) {
    for (const attribute of target.listAttributes()) {
      accessors.push(attribute);
    }
  }
  return Array.from(new Set(accessors));
}
/** @hidden */
function shallowEqualsArray(a, b) {
  if (a == null && b == null) return true;
  if (a == null || b == null) return false;
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) return false;
  }
  return true;
}
/** Clones an {@link Accessor} without creating a copy of its underlying TypedArray data. */
function shallowCloneAccessor(document, accessor) {
  return document.createAccessor(accessor.getName()).setArray(accessor.getArray()).setType(accessor.getType()).setBuffer(accessor.getBuffer()).setNormalized(accessor.getNormalized()).setSparse(accessor.getSparse());
}
/** @hidden */
function createIndices(count, maxIndex = count) {
  const array = createIndicesEmpty(count, maxIndex);
  for (let i = 0; i < array.length; i++) array[i] = i;
  return array;
}
/** @hidden */
function createIndicesEmpty(count, maxIndex = count) {
  return maxIndex <= 65534 ? new Uint16Array(count) : new Uint32Array(count);
}
/** @hidden */
function isUsed(prop) {
  return prop.listParents().some(parent => parent.propertyType !== PropertyType.ROOT);
}
/** @hidden */
function isEmptyObject(object) {
  for (const key in object) return false;
  return true;
}
/**
 * Creates a unique key associated with the structure and draw call characteristics of
 * a {@link Primitive}, independent of its vertex content. Helper method, used to
 * identify candidate Primitives for joining.
 * @hidden
 */
function createPrimGroupKey(prim) {
  const document = Document.fromGraph(prim.getGraph());
  const material = prim.getMaterial();
  const materialIndex = document.getRoot().listMaterials().indexOf(material);
  const mode = BASIC_MODE_MAPPING[prim.getMode()];
  const indices = !!prim.getIndices();
  const attributes = prim.listSemantics().sort().map(semantic => {
    const attribute = prim.getAttribute(semantic);
    const elementSize = attribute.getElementSize();
    const componentType = attribute.getComponentType();
    return `${semantic}:${elementSize}:${componentType}`;
  }).join('+');
  const targets = prim.listTargets().map(target => {
    return target.listSemantics().sort().map(semantic => {
      const attribute = prim.getAttribute(semantic);
      const elementSize = attribute.getElementSize();
      const componentType = attribute.getComponentType();
      return `${semantic}:${elementSize}:${componentType}`;
    }).join('+');
  }).join('~');
  return `${materialIndex}|${mode}|${indices}|${attributes}|${targets}`;
}
function ceilPowerOfTwo$1(value) {
  return Math.pow(2, Math.ceil(Math.log(value) / Math.LN2));
}
/**
 * Mapping from any glTF primitive mode to its equivalent basic mode, as returned by
 * {@link convertPrimitiveMode}.
 * @hidden
 */
const BASIC_MODE_MAPPING = {
  [POINTS$1]: POINTS$1,
  [LINES$2]: LINES$2,
  [LINE_STRIP$3]: LINES$2,
  [LINE_LOOP$3]: LINES$2,
  [TRIANGLES$2]: TRIANGLES$2,
  [TRIANGLE_STRIP$3]: TRIANGLES$2,
  [TRIANGLE_FAN$3]: TRIANGLES$2
};

/**
 * Finds the parent {@link Scene Scenes} associated with the given {@link Node}.
 * In most cases a Node is associated with only one Scene, but it is possible
 * for a Node to be located in two or more Scenes, or none at all.
 *
 * Example:
 *
 * ```typescript
 * import { listNodeScenes } from '@gltf-transform/functions';
 *
 * const node = document.getRoot().listNodes()
 *  .find((node) => node.getName() === 'MyNode');
 *
 * const scenes = listNodeScenes(node);
 * ```
 */
function listNodeScenes(node) {
  const visited = new Set();
  let child = node;
  let parent;
  while (parent = child.getParentNode()) {
    if (visited.has(parent)) {
      throw new Error('Circular dependency in scene graph.');
    }
    visited.add(parent);
    child = parent;
  }
  return child.listParents().filter(parent => parent instanceof Scene);
}

/**
 * Clears the parent of the given {@link Node}, leaving it attached
 * directly to its {@link Scene}. Inherited transforms will be applied
 * to the Node. This operation changes the Node's local transform,
 * but leaves its world transform unchanged.
 *
 * Example:
 *
 * ```typescript
 * import { clearNodeParent } from '@gltf-transform/functions';
 *
 * scene.traverse((node) => { ... }); // Scene → … → Node
 *
 * clearNodeParent(node);
 *
 * scene.traverse((node) => { ... }); // Scene → Node
 * ```
 *
 * To clear _all_ transforms of a Node, first clear its inherited transforms with
 * {@link clearNodeParent}, then clear the local transform with {@link clearNodeTransform}.
 */
function clearNodeParent(node) {
  const scenes = listNodeScenes(node);
  const parent = node.getParentNode();
  if (!parent) return node;
  // Apply inherited transforms to local matrix. Skinned meshes are not affected
  // by the node parent's transform, and can be ignored. Updates to IBMs and TRS
  // animations are out of scope in this context.
  node.setMatrix(node.getWorldMatrix());
  // Add to Scene roots.
  parent.removeChild(node);
  for (const scene of scenes) scene.addChild(node);
  return node;
}

/**
 * Common utilities
 * @module glMatrix
 */
var ARRAY_TYPE = typeof Float32Array !== 'undefined' ? Float32Array : Array;
if (!Math.hypot) Math.hypot = function () {
  var y = 0,
      i = arguments.length;

  while (i--) {
    y += arguments[i] * arguments[i];
  }

  return Math.sqrt(y);
};

/**
 * Inverts a mat4
 *
 * @param {mat4} out the receiving matrix
 * @param {ReadonlyMat4} a the source matrix
 * @returns {mat4} out
 */

function invert$1(out, a) {
  var a00 = a[0],
      a01 = a[1],
      a02 = a[2],
      a03 = a[3];
  var a10 = a[4],
      a11 = a[5],
      a12 = a[6],
      a13 = a[7];
  var a20 = a[8],
      a21 = a[9],
      a22 = a[10],
      a23 = a[11];
  var a30 = a[12],
      a31 = a[13],
      a32 = a[14],
      a33 = a[15];
  var b00 = a00 * a11 - a01 * a10;
  var b01 = a00 * a12 - a02 * a10;
  var b02 = a00 * a13 - a03 * a10;
  var b03 = a01 * a12 - a02 * a11;
  var b04 = a01 * a13 - a03 * a11;
  var b05 = a02 * a13 - a03 * a12;
  var b06 = a20 * a31 - a21 * a30;
  var b07 = a20 * a32 - a22 * a30;
  var b08 = a20 * a33 - a23 * a30;
  var b09 = a21 * a32 - a22 * a31;
  var b10 = a21 * a33 - a23 * a31;
  var b11 = a22 * a33 - a23 * a32; // Calculate the determinant

  var det = b00 * b11 - b01 * b10 + b02 * b09 + b03 * b08 - b04 * b07 + b05 * b06;

  if (!det) {
    return null;
  }

  det = 1.0 / det;
  out[0] = (a11 * b11 - a12 * b10 + a13 * b09) * det;
  out[1] = (a02 * b10 - a01 * b11 - a03 * b09) * det;
  out[2] = (a31 * b05 - a32 * b04 + a33 * b03) * det;
  out[3] = (a22 * b04 - a21 * b05 - a23 * b03) * det;
  out[4] = (a12 * b08 - a10 * b11 - a13 * b07) * det;
  out[5] = (a00 * b11 - a02 * b08 + a03 * b07) * det;
  out[6] = (a32 * b02 - a30 * b05 - a33 * b01) * det;
  out[7] = (a20 * b05 - a22 * b02 + a23 * b01) * det;
  out[8] = (a10 * b10 - a11 * b08 + a13 * b06) * det;
  out[9] = (a01 * b08 - a00 * b10 - a03 * b06) * det;
  out[10] = (a30 * b04 - a31 * b02 + a33 * b00) * det;
  out[11] = (a21 * b02 - a20 * b04 - a23 * b00) * det;
  out[12] = (a11 * b07 - a10 * b09 - a12 * b06) * det;
  out[13] = (a00 * b09 - a01 * b07 + a02 * b06) * det;
  out[14] = (a31 * b01 - a30 * b03 - a32 * b00) * det;
  out[15] = (a20 * b03 - a21 * b01 + a22 * b00) * det;
  return out;
}
/**
 * Calculates the determinant of a mat4
 *
 * @param {ReadonlyMat4} a the source matrix
 * @returns {Number} determinant of a
 */

function determinant(a) {
  var a00 = a[0],
      a01 = a[1],
      a02 = a[2],
      a03 = a[3];
  var a10 = a[4],
      a11 = a[5],
      a12 = a[6],
      a13 = a[7];
  var a20 = a[8],
      a21 = a[9],
      a22 = a[10],
      a23 = a[11];
  var a30 = a[12],
      a31 = a[13],
      a32 = a[14],
      a33 = a[15];
  var b00 = a00 * a11 - a01 * a10;
  var b01 = a00 * a12 - a02 * a10;
  var b02 = a00 * a13 - a03 * a10;
  var b03 = a01 * a12 - a02 * a11;
  var b04 = a01 * a13 - a03 * a11;
  var b05 = a02 * a13 - a03 * a12;
  var b06 = a20 * a31 - a21 * a30;
  var b07 = a20 * a32 - a22 * a30;
  var b08 = a20 * a33 - a23 * a30;
  var b09 = a21 * a32 - a22 * a31;
  var b10 = a21 * a33 - a23 * a31;
  var b11 = a22 * a33 - a23 * a32; // Calculate the determinant

  return b00 * b11 - b01 * b10 + b02 * b09 + b03 * b08 - b04 * b07 + b05 * b06;
}
/**
 * Multiplies two mat4s
 *
 * @param {mat4} out the receiving matrix
 * @param {ReadonlyMat4} a the first operand
 * @param {ReadonlyMat4} b the second operand
 * @returns {mat4} out
 */

function multiply$2(out, a, b) {
  var a00 = a[0],
      a01 = a[1],
      a02 = a[2],
      a03 = a[3];
  var a10 = a[4],
      a11 = a[5],
      a12 = a[6],
      a13 = a[7];
  var a20 = a[8],
      a21 = a[9],
      a22 = a[10],
      a23 = a[11];
  var a30 = a[12],
      a31 = a[13],
      a32 = a[14],
      a33 = a[15]; // Cache only the current line of the second matrix

  var b0 = b[0],
      b1 = b[1],
      b2 = b[2],
      b3 = b[3];
  out[0] = b0 * a00 + b1 * a10 + b2 * a20 + b3 * a30;
  out[1] = b0 * a01 + b1 * a11 + b2 * a21 + b3 * a31;
  out[2] = b0 * a02 + b1 * a12 + b2 * a22 + b3 * a32;
  out[3] = b0 * a03 + b1 * a13 + b2 * a23 + b3 * a33;
  b0 = b[4];
  b1 = b[5];
  b2 = b[6];
  b3 = b[7];
  out[4] = b0 * a00 + b1 * a10 + b2 * a20 + b3 * a30;
  out[5] = b0 * a01 + b1 * a11 + b2 * a21 + b3 * a31;
  out[6] = b0 * a02 + b1 * a12 + b2 * a22 + b3 * a32;
  out[7] = b0 * a03 + b1 * a13 + b2 * a23 + b3 * a33;
  b0 = b[8];
  b1 = b[9];
  b2 = b[10];
  b3 = b[11];
  out[8] = b0 * a00 + b1 * a10 + b2 * a20 + b3 * a30;
  out[9] = b0 * a01 + b1 * a11 + b2 * a21 + b3 * a31;
  out[10] = b0 * a02 + b1 * a12 + b2 * a22 + b3 * a32;
  out[11] = b0 * a03 + b1 * a13 + b2 * a23 + b3 * a33;
  b0 = b[12];
  b1 = b[13];
  b2 = b[14];
  b3 = b[15];
  out[12] = b0 * a00 + b1 * a10 + b2 * a20 + b3 * a30;
  out[13] = b0 * a01 + b1 * a11 + b2 * a21 + b3 * a31;
  out[14] = b0 * a02 + b1 * a12 + b2 * a22 + b3 * a32;
  out[15] = b0 * a03 + b1 * a13 + b2 * a23 + b3 * a33;
  return out;
}

/**
 * 3x3 Matrix
 * @module mat3
 */

/**
 * Creates a new identity mat3
 *
 * @returns {mat3} a new 3x3 matrix
 */

function create$2() {
  var out = new ARRAY_TYPE(9);

  if (ARRAY_TYPE != Float32Array) {
    out[1] = 0;
    out[2] = 0;
    out[3] = 0;
    out[5] = 0;
    out[6] = 0;
    out[7] = 0;
  }

  out[0] = 1;
  out[4] = 1;
  out[8] = 1;
  return out;
}
/**
 * Copies the upper-left 3x3 values into the given mat3.
 *
 * @param {mat3} out the receiving 3x3 matrix
 * @param {ReadonlyMat4} a   the source 4x4 matrix
 * @returns {mat3} out
 */

function fromMat4(out, a) {
  out[0] = a[0];
  out[1] = a[1];
  out[2] = a[2];
  out[3] = a[4];
  out[4] = a[5];
  out[5] = a[6];
  out[6] = a[8];
  out[7] = a[9];
  out[8] = a[10];
  return out;
}
/**
 * Transpose the values of a mat3
 *
 * @param {mat3} out the receiving matrix
 * @param {ReadonlyMat3} a the source matrix
 * @returns {mat3} out
 */

function transpose(out, a) {
  // If we are transposing ourselves we can skip a few steps but have to cache some values
  if (out === a) {
    var a01 = a[1],
        a02 = a[2],
        a12 = a[5];
    out[1] = a[3];
    out[2] = a[6];
    out[3] = a01;
    out[5] = a[7];
    out[6] = a02;
    out[7] = a12;
  } else {
    out[0] = a[0];
    out[1] = a[3];
    out[2] = a[6];
    out[3] = a[1];
    out[4] = a[4];
    out[5] = a[7];
    out[6] = a[2];
    out[7] = a[5];
    out[8] = a[8];
  }

  return out;
}
/**
 * Inverts a mat3
 *
 * @param {mat3} out the receiving matrix
 * @param {ReadonlyMat3} a the source matrix
 * @returns {mat3} out
 */

function invert(out, a) {
  var a00 = a[0],
      a01 = a[1],
      a02 = a[2];
  var a10 = a[3],
      a11 = a[4],
      a12 = a[5];
  var a20 = a[6],
      a21 = a[7],
      a22 = a[8];
  var b01 = a22 * a11 - a12 * a21;
  var b11 = -a22 * a10 + a12 * a20;
  var b21 = a21 * a10 - a11 * a20; // Calculate the determinant

  var det = a00 * b01 + a01 * b11 + a02 * b21;

  if (!det) {
    return null;
  }

  det = 1.0 / det;
  out[0] = b01 * det;
  out[1] = (-a22 * a01 + a02 * a21) * det;
  out[2] = (a12 * a01 - a02 * a11) * det;
  out[3] = b11 * det;
  out[4] = (a22 * a00 - a02 * a20) * det;
  out[5] = (-a12 * a00 + a02 * a10) * det;
  out[6] = b21 * det;
  out[7] = (-a21 * a00 + a01 * a20) * det;
  out[8] = (a11 * a00 - a01 * a10) * det;
  return out;
}

/**
 * 3 Dimensional Vector
 * @module vec3
 */

/**
 * Creates a new, empty vec3
 *
 * @returns {vec3} a new 3D vector
 */

function create$1() {
  var out = new ARRAY_TYPE(3);

  if (ARRAY_TYPE != Float32Array) {
    out[0] = 0;
    out[1] = 0;
    out[2] = 0;
  }

  return out;
}
/**
 * Multiplies two vec3's
 *
 * @param {vec3} out the receiving vector
 * @param {ReadonlyVec3} a the first operand
 * @param {ReadonlyVec3} b the second operand
 * @returns {vec3} out
 */

function multiply$1(out, a, b) {
  out[0] = a[0] * b[0];
  out[1] = a[1] * b[1];
  out[2] = a[2] * b[2];
  return out;
}
/**
 * Normalize a vec3
 *
 * @param {vec3} out the receiving vector
 * @param {ReadonlyVec3} a vector to normalize
 * @returns {vec3} out
 */

function normalize(out, a) {
  var x = a[0];
  var y = a[1];
  var z = a[2];
  var len = x * x + y * y + z * z;

  if (len > 0) {
    //TODO: evaluate use of glm_invsqrt here?
    len = 1 / Math.sqrt(len);
  }

  out[0] = a[0] * len;
  out[1] = a[1] * len;
  out[2] = a[2] * len;
  return out;
}
/**
 * Transforms the vec3 with a mat4.
 * 4th vector component is implicitly '1'
 *
 * @param {vec3} out the receiving vector
 * @param {ReadonlyVec3} a the vector to transform
 * @param {ReadonlyMat4} m matrix to transform with
 * @returns {vec3} out
 */

function transformMat4(out, a, m) {
  var x = a[0],
      y = a[1],
      z = a[2];
  var w = m[3] * x + m[7] * y + m[11] * z + m[15];
  w = w || 1.0;
  out[0] = (m[0] * x + m[4] * y + m[8] * z + m[12]) / w;
  out[1] = (m[1] * x + m[5] * y + m[9] * z + m[13]) / w;
  out[2] = (m[2] * x + m[6] * y + m[10] * z + m[14]) / w;
  return out;
}
/**
 * Transforms the vec3 with a mat3.
 *
 * @param {vec3} out the receiving vector
 * @param {ReadonlyVec3} a the vector to transform
 * @param {ReadonlyMat3} m the 3x3 matrix to transform with
 * @returns {vec3} out
 */

function transformMat3(out, a, m) {
  var x = a[0],
      y = a[1],
      z = a[2];
  out[0] = x * m[0] + y * m[3] + z * m[6];
  out[1] = x * m[1] + y * m[4] + z * m[7];
  out[2] = x * m[2] + y * m[5] + z * m[8];
  return out;
}
/**
 * Alias for {@link vec3.multiply}
 * @function
 */

var mul$1 = multiply$1;
/**
 * Perform some operation over an array of vec3s.
 *
 * @param {Array} a the array of vectors to iterate over
 * @param {Number} stride Number of elements between the start of each vec3. If 0 assumes tightly packed
 * @param {Number} offset Number of elements to skip at the beginning of the array
 * @param {Number} count Number of vec3s to iterate over. If 0 iterates over entire array
 * @param {Function} fn Function to call for each vector in the array
 * @param {Object} [arg] additional argument to pass to fn
 * @returns {Array} a
 * @function
 */

(function () {
  var vec = create$1();
  return function (a, stride, offset, count, fn, arg) {
    var i, l;

    if (!stride) {
      stride = 3;
    }

    if (!offset) {
      offset = 0;
    }

    if (count) {
      l = Math.min(count * stride + offset, a.length);
    } else {
      l = a.length;
    }

    for (i = offset; i < l; i += stride) {
      vec[0] = a[i];
      vec[1] = a[i + 1];
      vec[2] = a[i + 2];
      fn(vec, vec, arg);
      a[i] = vec[0];
      a[i + 1] = vec[1];
      a[i + 2] = vec[2];
    }

    return a;
  };
})();

const NAME$n = 'dedup';
const DEDUP_DEFAULTS = {
  keepUniqueNames: false,
  propertyTypes: [PropertyType.ACCESSOR, PropertyType.MESH, PropertyType.TEXTURE, PropertyType.MATERIAL, PropertyType.SKIN]
};
/**
 * Removes duplicate {@link Accessor}, {@link Mesh}, {@link Texture}, and {@link Material}
 * properties. Partially based on a
 * [gist by mattdesl](https://gist.github.com/mattdesl/aea40285e2d73916b6b9101b36d84da8). Only
 * accessors in mesh primitives, morph targets, and animation samplers are processed.
 *
 * Example:
 *
 * ```ts
 * document.getRoot().listMeshes(); // → [Mesh, Mesh, Mesh]
 *
 * await document.transform(dedup({propertyTypes: [PropertyType.MESH]}));
 *
 * document.getRoot().listMeshes(); // → [Mesh]
 * ```
 *
 * @category Transforms
 */
function dedup(_options = DEDUP_DEFAULTS) {
  const options = assignDefaults(DEDUP_DEFAULTS, _options);
  const propertyTypes = new Set(options.propertyTypes);
  for (const propertyType of options.propertyTypes) {
    if (!DEDUP_DEFAULTS.propertyTypes.includes(propertyType)) {
      throw new Error(`${NAME$n}: Unsupported deduplication on type "${propertyType}".`);
    }
  }
  return createTransform(NAME$n, document => {
    const logger = document.getLogger();
    if (propertyTypes.has(PropertyType.ACCESSOR)) dedupAccessors(document);
    if (propertyTypes.has(PropertyType.TEXTURE)) dedupImages(document, options);
    if (propertyTypes.has(PropertyType.MATERIAL)) dedupMaterials(document, options);
    if (propertyTypes.has(PropertyType.MESH)) dedupMeshes(document, options);
    if (propertyTypes.has(PropertyType.SKIN)) dedupSkins(document, options);
    logger.debug(`${NAME$n}: Complete.`);
  });
}
function dedupAccessors(document) {
  const logger = document.getLogger();
  // Find all accessors used for mesh and animation data.
  const indicesMap = new Map();
  const attributeMap = new Map();
  const inputMap = new Map();
  const outputMap = new Map();
  const meshes = document.getRoot().listMeshes();
  meshes.forEach(mesh => {
    mesh.listPrimitives().forEach(primitive => {
      primitive.listAttributes().forEach(accessor => hashAccessor(accessor, attributeMap));
      hashAccessor(primitive.getIndices(), indicesMap);
    });
  });
  for (const animation of document.getRoot().listAnimations()) {
    for (const sampler of animation.listSamplers()) {
      hashAccessor(sampler.getInput(), inputMap);
      hashAccessor(sampler.getOutput(), outputMap);
    }
  }
  // Add accessor to the appropriate hash group. Hashes are _non-unique_,
  // intended to quickly compare everything accept the underlying array.
  function hashAccessor(accessor, group) {
    if (!accessor) return;
    const hash = [accessor.getCount(), accessor.getType(), accessor.getComponentType(), accessor.getNormalized(), accessor.getSparse()].join(':');
    let hashSet = group.get(hash);
    if (!hashSet) group.set(hash, hashSet = new Set());
    hashSet.add(accessor);
  }
  // Find duplicate accessors of a given type.
  function detectDuplicates(accessors, duplicates) {
    for (let i = 0; i < accessors.length; i++) {
      const a = accessors[i];
      const aData = BufferUtils.toView(a.getArray());
      if (duplicates.has(a)) continue;
      for (let j = i + 1; j < accessors.length; j++) {
        const b = accessors[j];
        if (duplicates.has(b)) continue;
        // Just compare the arrays — everything else was covered by the
        // hash. Comparing uint8 views is faster than comparing the
        // original typed arrays.
        if (BufferUtils.equals(aData, BufferUtils.toView(b.getArray()))) {
          duplicates.set(b, a);
        }
      }
    }
  }
  let total = 0;
  const duplicates = new Map();
  for (const group of [attributeMap, indicesMap, inputMap, outputMap]) {
    for (const hashGroup of group.values()) {
      total += hashGroup.size;
      detectDuplicates(Array.from(hashGroup), duplicates);
    }
  }
  logger.debug(`${NAME$n}: Merged ${duplicates.size} of ${total} accessors.`);
  // Dissolve duplicate vertex attributes and indices.
  meshes.forEach(mesh => {
    mesh.listPrimitives().forEach(primitive => {
      primitive.listAttributes().forEach(accessor => {
        if (duplicates.has(accessor)) {
          primitive.swap(accessor, duplicates.get(accessor));
        }
      });
      const indices = primitive.getIndices();
      if (indices && duplicates.has(indices)) {
        primitive.swap(indices, duplicates.get(indices));
      }
    });
  });
  // Dissolve duplicate animation sampler inputs and outputs.
  for (const animation of document.getRoot().listAnimations()) {
    for (const sampler of animation.listSamplers()) {
      const input = sampler.getInput();
      const output = sampler.getOutput();
      if (input && duplicates.has(input)) {
        sampler.swap(input, duplicates.get(input));
      }
      if (output && duplicates.has(output)) {
        sampler.swap(output, duplicates.get(output));
      }
    }
  }
  Array.from(duplicates.keys()).forEach(accessor => accessor.dispose());
}
function dedupMeshes(document, options) {
  const logger = document.getLogger();
  const root = document.getRoot();
  // Create Reference -> ID lookup table.
  const refs = new Map();
  root.listAccessors().forEach((accessor, index) => refs.set(accessor, index));
  root.listMaterials().forEach((material, index) => refs.set(material, index));
  // For each mesh, create a hashkey.
  const numMeshes = root.listMeshes().length;
  const uniqueMeshes = new Map();
  for (const src of root.listMeshes()) {
    // For each mesh, create a hashkey.
    const srcKeyItems = [];
    for (const prim of src.listPrimitives()) {
      srcKeyItems.push(createPrimitiveKey(prim, refs));
    }
    // If another mesh exists with the same key, replace all instances with that, and dispose
    // of the duplicate. If not, just cache it.
    let meshKey = '';
    if (options.keepUniqueNames) meshKey += src.getName() + ';';
    meshKey += srcKeyItems.join(';');
    if (uniqueMeshes.has(meshKey)) {
      const targetMesh = uniqueMeshes.get(meshKey);
      src.listParents().forEach(parent => {
        if (parent.propertyType !== PropertyType.ROOT) {
          parent.swap(src, targetMesh);
        }
      });
      src.dispose();
    } else {
      uniqueMeshes.set(meshKey, src);
    }
  }
  logger.debug(`${NAME$n}: Merged ${numMeshes - uniqueMeshes.size} of ${numMeshes} meshes.`);
}
function dedupImages(document, options) {
  const logger = document.getLogger();
  const root = document.getRoot();
  const textures = root.listTextures();
  const duplicates = new Map();
  // Compare each texture to every other texture — O(n²) — and mark duplicates for replacement.
  for (let i = 0; i < textures.length; i++) {
    const a = textures[i];
    const aData = a.getImage();
    if (duplicates.has(a)) continue;
    for (let j = i + 1; j < textures.length; j++) {
      const b = textures[j];
      const bData = b.getImage();
      if (duplicates.has(b)) continue;
      // URIs are intentionally not compared.
      if (a.getMimeType() !== b.getMimeType()) continue;
      if (options.keepUniqueNames && a.getName() !== b.getName()) continue;
      const aSize = a.getSize();
      const bSize = b.getSize();
      if (!aSize || !bSize) continue;
      if (aSize[0] !== bSize[0]) continue;
      if (aSize[1] !== bSize[1]) continue;
      if (!aData || !bData) continue;
      if (BufferUtils.equals(aData, bData)) {
        duplicates.set(b, a);
      }
    }
  }
  logger.debug(`${NAME$n}: Merged ${duplicates.size} of ${root.listTextures().length} textures.`);
  Array.from(duplicates.entries()).forEach(([src, dst]) => {
    src.listParents().forEach(property => {
      if (!(property instanceof Root)) property.swap(src, dst);
    });
    src.dispose();
  });
}
function dedupMaterials(document, options) {
  const logger = document.getLogger();
  const root = document.getRoot();
  const materials = root.listMaterials();
  const duplicates = new Map();
  const modifierCache = new Map();
  const skip = new Set();
  if (!options.keepUniqueNames) {
    skip.add('name');
  }
  // Compare each material to every other material — O(n²) — and mark duplicates for replacement.
  for (let i = 0; i < materials.length; i++) {
    const a = materials[i];
    if (duplicates.has(a)) continue;
    if (hasModifier(a, modifierCache)) continue;
    for (let j = i + 1; j < materials.length; j++) {
      const b = materials[j];
      if (duplicates.has(b)) continue;
      if (hasModifier(b, modifierCache)) continue;
      if (a.equals(b, skip)) {
        duplicates.set(b, a);
      }
    }
  }
  logger.debug(`${NAME$n}: Merged ${duplicates.size} of ${materials.length} materials.`);
  Array.from(duplicates.entries()).forEach(([src, dst]) => {
    src.listParents().forEach(property => {
      if (!(property instanceof Root)) property.swap(src, dst);
    });
    src.dispose();
  });
}
function dedupSkins(document, options) {
  const logger = document.getLogger();
  const root = document.getRoot();
  const skins = root.listSkins();
  const duplicates = new Map();
  const skip = new Set(['joints']);
  if (!options.keepUniqueNames) {
    skip.add('name');
  }
  for (let i = 0; i < skins.length; i++) {
    const a = skins[i];
    if (duplicates.has(a)) continue;
    for (let j = i + 1; j < skins.length; j++) {
      const b = skins[j];
      if (duplicates.has(b)) continue;
      // Check joints with shallow equality, not deep equality.
      // See: https://github.com/KhronosGroup/glTF-Sample-Models/tree/master/2.0/RecursiveSkeletons
      if (a.equals(b, skip) && shallowEqualsArray(a.listJoints(), b.listJoints())) {
        duplicates.set(b, a);
      }
    }
  }
  logger.debug(`${NAME$n}: Merged ${duplicates.size} of ${skins.length} skins.`);
  Array.from(duplicates.entries()).forEach(([src, dst]) => {
    src.listParents().forEach(property => {
      if (!(property instanceof Root)) property.swap(src, dst);
    });
    src.dispose();
  });
}
/** Generates a key unique to the content of a primitive or target. */
function createPrimitiveKey(prim, refs) {
  const primKeyItems = [];
  for (const semantic of prim.listSemantics()) {
    const attribute = prim.getAttribute(semantic);
    primKeyItems.push(semantic + ':' + refs.get(attribute));
  }
  if (prim instanceof Primitive) {
    const indices = prim.getIndices();
    if (indices) {
      primKeyItems.push('indices:' + refs.get(indices));
    }
    const material = prim.getMaterial();
    if (material) {
      primKeyItems.push('material:' + refs.get(material));
    }
    primKeyItems.push('mode:' + prim.getMode());
    for (const target of prim.listTargets()) {
      primKeyItems.push('target:' + createPrimitiveKey(target, refs));
    }
  }
  return primKeyItems.join(',');
}
/**
 * Detects dependencies modified by a parent reference, to conservatively prevent merging. When
 * implementing extensions like KHR_animation_pointer, the 'modifyChild' attribute should be added
 * to graph edges connecting the animation channel to the animated target property.
 *
 * NOTICE: Implementation is conservative, and could prevent merging two materials sharing the
 * same animated "Clearcoat" ExtensionProperty. While that scenario is possible for an in-memory
 * glTF Transform graph, valid glTF input files do not have that risk.
 */
function hasModifier(prop, cache) {
  if (cache.has(prop)) return cache.get(prop);
  const graph = prop.getGraph();
  const visitedNodes = new Set();
  const edgeQueue = graph.listParentEdges(prop);
  // Search dependency subtree for 'modifyChild' attribute.
  while (edgeQueue.length > 0) {
    const edge = edgeQueue.pop();
    if (edge.getAttributes().modifyChild === true) {
      cache.set(prop, true);
      return true;
    }
    const child = edge.getChild();
    if (visitedNodes.has(child)) continue;
    for (const childEdge of graph.listChildEdges(child)) {
      edgeQueue.push(childEdge);
    }
  }
  cache.set(prop, false);
  return false;
}

/**
 * 4 Dimensional Vector
 * @module vec4
 */

/**
 * Creates a new, empty vec4
 *
 * @returns {vec4} a new 4D vector
 */

function create() {
  var out = new ARRAY_TYPE(4);

  if (ARRAY_TYPE != Float32Array) {
    out[0] = 0;
    out[1] = 0;
    out[2] = 0;
    out[3] = 0;
  }

  return out;
}
/**
 * Adds two vec4's
 *
 * @param {vec4} out the receiving vector
 * @param {ReadonlyVec4} a the first operand
 * @param {ReadonlyVec4} b the second operand
 * @returns {vec4} out
 */

function add(out, a, b) {
  out[0] = a[0] + b[0];
  out[1] = a[1] + b[1];
  out[2] = a[2] + b[2];
  out[3] = a[3] + b[3];
  return out;
}
/**
 * Subtracts vector b from vector a
 *
 * @param {vec4} out the receiving vector
 * @param {ReadonlyVec4} a the first operand
 * @param {ReadonlyVec4} b the second operand
 * @returns {vec4} out
 */

function subtract(out, a, b) {
  out[0] = a[0] - b[0];
  out[1] = a[1] - b[1];
  out[2] = a[2] - b[2];
  out[3] = a[3] - b[3];
  return out;
}
/**
 * Multiplies two vec4's
 *
 * @param {vec4} out the receiving vector
 * @param {ReadonlyVec4} a the first operand
 * @param {ReadonlyVec4} b the second operand
 * @returns {vec4} out
 */

function multiply(out, a, b) {
  out[0] = a[0] * b[0];
  out[1] = a[1] * b[1];
  out[2] = a[2] * b[2];
  out[3] = a[3] * b[3];
  return out;
}
/**
 * Scales a vec4 by a scalar number
 *
 * @param {vec4} out the receiving vector
 * @param {ReadonlyVec4} a the vector to scale
 * @param {Number} b amount to scale the vector by
 * @returns {vec4} out
 */

function scale(out, a, b) {
  out[0] = a[0] * b;
  out[1] = a[1] * b;
  out[2] = a[2] * b;
  out[3] = a[3] * b;
  return out;
}
/**
 * Calculates the length of a vec4
 *
 * @param {ReadonlyVec4} a vector to calculate length of
 * @returns {Number} length of a
 */

function length(a) {
  var x = a[0];
  var y = a[1];
  var z = a[2];
  var w = a[3];
  return Math.hypot(x, y, z, w);
}
/**
 * Alias for {@link vec4.subtract}
 * @function
 */

var sub = subtract;
/**
 * Alias for {@link vec4.multiply}
 * @function
 */

var mul = multiply;
/**
 * Alias for {@link vec4.length}
 * @function
 */

var len = length;
/**
 * Perform some operation over an array of vec4s.
 *
 * @param {Array} a the array of vectors to iterate over
 * @param {Number} stride Number of elements between the start of each vec4. If 0 assumes tightly packed
 * @param {Number} offset Number of elements to skip at the beginning of the array
 * @param {Number} count Number of vec4s to iterate over. If 0 iterates over entire array
 * @param {Function} fn Function to call for each vector in the array
 * @param {Object} [arg] additional argument to pass to fn
 * @returns {Array} a
 * @function
 */

(function () {
  var vec = create();
  return function (a, stride, offset, count, fn, arg) {
    var i, l;

    if (!stride) {
      stride = 4;
    }

    if (!offset) {
      offset = 0;
    }

    if (count) {
      l = Math.min(count * stride + offset, a.length);
    } else {
      l = a.length;
    }

    for (i = offset; i < l; i += stride) {
      vec[0] = a[i];
      vec[1] = a[i + 1];
      vec[2] = a[i + 2];
      vec[3] = a[i + 3];
      fn(vec, vec, arg);
      a[i] = vec[0];
      a[i + 1] = vec[1];
      a[i + 2] = vec[2];
      a[i + 3] = vec[3];
    }

    return a;
  };
})();

const SRGB_PATTERN = /color|emissive|diffuse/i;
/**
 * Returns the color space (if any) implied by the {@link Material} slots to
 * which a texture is assigned, or null for non-color textures. If the texture
 * is not connected to any {@link Material}, this function will also return
 * null — any metadata in the image file will be ignored.
 *
 * Under current glTF specifications, only 'srgb' and non-color (null) textures
 * are used.
 *
 * Example:
 *
 * ```typescript
 * import { getTextureColorSpace } from '@gltf-transform/functions';
 *
 * const baseColorTexture = material.getBaseColorTexture();
 * const normalTexture = material.getNormalTexture();
 *
 * getTextureColorSpace(baseColorTexture); // → 'srgb'
 * getTextureColorSpace(normalTexture); // → null
 * ```
 */
function getTextureColorSpace(texture) {
  const graph = texture.getGraph();
  const edges = graph.listParentEdges(texture);
  const isSRGB = edges.some(edge => {
    return edge.getAttributes().isColor || SRGB_PATTERN.test(edge.getName());
  });
  return isSRGB ? 'srgb' : null;
}
/**
 * Lists all {@link TextureInfo} definitions associated with any {@link Texture}
 * on the given {@link Material}. May be used to determine which UV transforms
 * and texCoord indices are applied to the material, without explicitly
 * checking the material properties and extensions.
 *
 * Example:
 *
 * ```typescript
 * const results = listTextureInfoByMaterial(material);
 *
 * const texCoords = results.map((info) => info.getTexCoord());
 * // → [0, 1]
 * ```
 */
function listTextureInfoByMaterial(material) {
  const graph = material.getGraph();
  const visited = new Set();
  const results = new Set();
  function traverse(prop) {
    const textureInfoNames = new Set();
    for (const edge of graph.listChildEdges(prop)) {
      if (edge.getChild() instanceof Texture) {
        textureInfoNames.add(edge.getName() + 'Info');
      }
    }
    for (const edge of graph.listChildEdges(prop)) {
      const child = edge.getChild();
      if (visited.has(child)) continue;
      visited.add(child);
      if (child instanceof TextureInfo && textureInfoNames.has(edge.getName())) {
        results.add(child);
      } else if (child instanceof ExtensionProperty) {
        traverse(child);
      }
    }
  }
  traverse(material);
  return Array.from(results);
}

/**
 * Returns names of all texture slots using the given texture.
 *
 * Example:
 *
 * ```js
 * const slots = listTextureSlots(texture);
 * // → ['occlusionTexture', 'metallicRoughnesTexture']
 * ```
 */
function listTextureSlots(texture) {
  const document = Document.fromGraph(texture.getGraph());
  const root = document.getRoot();
  const slots = texture.getGraph().listParentEdges(texture).filter(edge => edge.getParent() !== root).map(edge => edge.getName());
  return Array.from(new Set(slots));
}

const NAME$m = 'prune';
const EPS = 3 / 255;
const PRUNE_DEFAULTS = {
  propertyTypes: [PropertyType.NODE, PropertyType.SKIN, PropertyType.MESH, PropertyType.CAMERA, PropertyType.PRIMITIVE, PropertyType.PRIMITIVE_TARGET, PropertyType.ANIMATION, PropertyType.MATERIAL, PropertyType.TEXTURE, PropertyType.ACCESSOR, PropertyType.BUFFER],
  keepLeaves: false,
  keepAttributes: false,
  keepIndices: false,
  keepSolidTextures: false,
  keepExtras: false
};
/**
 * Removes properties from the file if they are not referenced by a {@link Scene}. Commonly helpful
 * for cleaning up after other operations, e.g. allowing a node to be detached and any unused
 * meshes, materials, or other resources to be removed automatically.
 *
 * Example:
 *
 * ```javascript
 * import { PropertyType } from '@gltf-transform/core';
 * import { prune } from '@gltf-transform/functions';
 *
 * document.getRoot().listMaterials(); // → [Material, Material]
 *
 * await document.transform(
 * 	prune({
 * 		propertyTypes: [PropertyType.MATERIAL],
 * 		keepExtras: true
 * 	})
 * );
 *
 * document.getRoot().listMaterials(); // → [Material]
 * ```
 *
 * By default, pruning will aggressively remove most unused resources. Use
 * {@link PruneOptions} to limit what is considered for pruning.
 *
 * @category Transforms
 */
function prune(_options = PRUNE_DEFAULTS) {
  const options = assignDefaults(PRUNE_DEFAULTS, _options);
  const propertyTypes = new Set(options.propertyTypes);
  const keepExtras = options.keepExtras;
  return createTransform(NAME$m, async document => {
    const logger = document.getLogger();
    const root = document.getRoot();
    const graph = document.getGraph();
    const counter = new DisposeCounter();
    const onDispose = event => counter.dispose(event.target);
    // TODO(cleanup): Publish GraphEvent / GraphEventListener types from 'property-graph'.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    graph.addEventListener('node:dispose', onDispose);
    // Prune top-down, so that low-level properties like accessors can be removed if the
    // properties referencing them are removed.
    // Prune empty Meshes.
    if (propertyTypes.has(PropertyType.MESH)) {
      for (const mesh of root.listMeshes()) {
        if (mesh.listPrimitives().length > 0) continue;
        mesh.dispose();
      }
    }
    if (propertyTypes.has(PropertyType.NODE)) {
      if (!options.keepLeaves) {
        for (const scene of root.listScenes()) {
          nodeTreeShake(graph, scene, keepExtras);
        }
      }
      for (const node of root.listNodes()) {
        treeShake(node, keepExtras);
      }
    }
    if (propertyTypes.has(PropertyType.SKIN)) {
      for (const skin of root.listSkins()) {
        treeShake(skin, keepExtras);
      }
    }
    if (propertyTypes.has(PropertyType.MESH)) {
      for (const mesh of root.listMeshes()) {
        treeShake(mesh, keepExtras);
      }
    }
    if (propertyTypes.has(PropertyType.CAMERA)) {
      for (const camera of root.listCameras()) {
        treeShake(camera, keepExtras);
      }
    }
    if (propertyTypes.has(PropertyType.PRIMITIVE)) {
      indirectTreeShake(graph, PropertyType.PRIMITIVE, keepExtras);
    }
    if (propertyTypes.has(PropertyType.PRIMITIVE_TARGET)) {
      indirectTreeShake(graph, PropertyType.PRIMITIVE_TARGET, keepExtras);
    }
    // Prune unused vertex attributes.
    if (!options.keepAttributes && propertyTypes.has(PropertyType.ACCESSOR)) {
      const materialPrims = new Map();
      for (const mesh of root.listMeshes()) {
        for (const prim of mesh.listPrimitives()) {
          const material = prim.getMaterial();
          if (!material) continue;
          const required = listRequiredSemantics(document, prim, material);
          const unused = listUnusedSemantics(prim, required);
          pruneAttributes(prim, unused);
          prim.listTargets().forEach(target => pruneAttributes(target, unused));
          materialPrims.has(material) ? materialPrims.get(material).add(prim) : materialPrims.set(material, new Set([prim]));
        }
      }
      for (const [material, prims] of materialPrims) {
        shiftTexCoords(material, Array.from(prims));
      }
    }
    // Prune unused mesh indices.
    if (!options.keepIndices && propertyTypes.has(PropertyType.ACCESSOR)) {
      for (const mesh of root.listMeshes()) {
        for (const prim of mesh.listPrimitives()) {
          pruneIndices(prim);
        }
      }
    }
    // Pruning animations is a bit more complicated:
    // (1) Remove channels without target nodes.
    // (2) Remove animations without channels.
    // (3) Remove samplers orphaned in the process.
    if (propertyTypes.has(PropertyType.ANIMATION)) {
      for (const anim of root.listAnimations()) {
        for (const channel of anim.listChannels()) {
          if (!channel.getTargetNode()) {
            channel.dispose();
          }
        }
        if (!anim.listChannels().length) {
          const samplers = anim.listSamplers();
          treeShake(anim, keepExtras);
          samplers.forEach(sampler => treeShake(sampler, keepExtras));
        } else {
          anim.listSamplers().forEach(sampler => treeShake(sampler, keepExtras));
        }
      }
    }
    if (propertyTypes.has(PropertyType.MATERIAL)) {
      root.listMaterials().forEach(material => treeShake(material, keepExtras));
    }
    if (propertyTypes.has(PropertyType.TEXTURE)) {
      root.listTextures().forEach(texture => treeShake(texture, keepExtras));
      if (!options.keepSolidTextures) {
        await pruneSolidTextures(document);
      }
    }
    if (propertyTypes.has(PropertyType.ACCESSOR)) {
      root.listAccessors().forEach(accessor => treeShake(accessor, keepExtras));
    }
    if (propertyTypes.has(PropertyType.BUFFER)) {
      root.listBuffers().forEach(buffer => treeShake(buffer, keepExtras));
    }
    // TODO(bug): This process does not identify unused ExtensionProperty instances. That could
    // be a future enhancement, either tracking unlinked properties as if they were connected
    // to the Graph, or iterating over a property list provided by the Extension. Properties in
    // use by an Extension are correctly preserved, in the meantime.
    // TODO(cleanup): Publish GraphEvent / GraphEventListener types from 'property-graph'.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    graph.removeEventListener('node:dispose', onDispose);
    if (!counter.empty()) {
      const str = counter.entries().map(([type, count]) => `${type} (${count})`).join(', ');
      logger.info(`${NAME$m}: Removed types... ${str}`);
    } else {
      logger.debug(`${NAME$m}: No unused properties found.`);
    }
    logger.debug(`${NAME$m}: Complete.`);
  });
}
/**********************************************************************************************
 * Utility for disposing properties and reporting statistics afterward.
 */
class DisposeCounter {
  constructor() {
    this.disposed = {};
  }
  empty() {
    for (const key in this.disposed) return false;
    return true;
  }
  entries() {
    return Object.entries(this.disposed);
  }
  /** Records properties disposed by type. */
  dispose(prop) {
    this.disposed[prop.propertyType] = this.disposed[prop.propertyType] || 0;
    this.disposed[prop.propertyType]++;
  }
}
/**********************************************************************************************
 * Helper functions for the {@link prune} transform.
 *
 * IMPORTANT: These functions were previously declared in function scope, but
 * broke in the CommonJS build due to a buggy Babel transform. See:
 * https://github.com/donmccurdy/glTF-Transform/issues/1140
 */
/** Disposes of the given property if it is unused. */
function treeShake(prop, keepExtras) {
  // Consider a property unused if it has no references from another property, excluding
  // types Root and AnimationChannel.
  const parents = prop.listParents().filter(p => !(p instanceof Root || p instanceof AnimationChannel));
  const needsExtras = keepExtras && !isEmptyObject(prop.getExtras());
  if (!parents.length && !needsExtras) {
    prop.dispose();
  }
}
/**
 * For property types the Root does not maintain references to, we'll need to search the
 * graph. It's possible that objects may have been constructed without any outbound links,
 * but since they're not on the graph they don't need to be tree-shaken.
 */
function indirectTreeShake(graph, propertyType, keepExtras) {
  for (const edge of graph.listEdges()) {
    const parent = edge.getParent();
    if (parent.propertyType === propertyType) {
      treeShake(parent, keepExtras);
    }
  }
}
/** Iteratively prunes leaf Nodes without contents. */
function nodeTreeShake(graph, prop, keepExtras) {
  prop.listChildren().forEach(child => nodeTreeShake(graph, child, keepExtras));
  if (prop instanceof Scene) return;
  const isUsed = graph.listParentEdges(prop).some(e => {
    const ptype = e.getParent().propertyType;
    return ptype !== PropertyType.ROOT && ptype !== PropertyType.SCENE && ptype !== PropertyType.NODE;
  });
  const isEmpty = graph.listChildren(prop).length === 0;
  const needsExtras = keepExtras && !isEmptyObject(prop.getExtras());
  if (isEmpty && !isUsed && !needsExtras) {
    prop.dispose();
  }
}
function pruneAttributes(prim, unused) {
  for (const semantic of unused) {
    prim.setAttribute(semantic, null);
  }
}
function pruneIndices(prim) {
  const indices = prim.getIndices();
  const indicesArray = indices && indices.getArray();
  const attribute = prim.listAttributes()[0];
  if (!indicesArray || !attribute) {
    return;
  }
  if (indices.getCount() !== attribute.getCount()) {
    return;
  }
  for (let i = 0, il = indicesArray.length; i < il; i++) {
    if (i !== indicesArray[i]) {
      return;
    }
  }
  prim.setIndices(null);
}
/**
 * Lists vertex attribute semantics that are unused when rendering a given primitive.
 */
function listUnusedSemantics(prim, required) {
  const unused = [];
  for (const semantic of prim.listSemantics()) {
    if (semantic === 'NORMAL' && !required.has(semantic)) {
      unused.push(semantic);
    } else if (semantic === 'TANGENT' && !required.has(semantic)) {
      unused.push(semantic);
    } else if (semantic.startsWith('TEXCOORD_') && !required.has(semantic)) {
      unused.push(semantic);
    } else if (semantic.startsWith('COLOR_') && semantic !== 'COLOR_0') {
      unused.push(semantic);
    }
  }
  return unused;
}
/**
 * Lists vertex attribute semantics required by a material. Does not include
 * attributes that would be used unconditionally, like POSITION or NORMAL.
 */
function listRequiredSemantics(document, prim, material, semantics = new Set()) {
  const graph = document.getGraph();
  const edges = graph.listChildEdges(material);
  const textureNames = new Set();
  for (const edge of edges) {
    if (edge.getChild() instanceof Texture) {
      textureNames.add(edge.getName());
    }
  }
  for (const edge of edges) {
    const name = edge.getName();
    const child = edge.getChild();
    if (child instanceof TextureInfo) {
      if (textureNames.has(name.replace(/Info$/, ''))) {
        semantics.add(`TEXCOORD_${child.getTexCoord()}`);
      }
    }
    if (child instanceof Texture && name.match(/normalTexture/i)) {
      semantics.add('TANGENT');
    }
    if (child instanceof ExtensionProperty) {
      listRequiredSemantics(document, prim, child, semantics);
    }
    // TODO(#748): Does KHR_materials_anisotropy imply required vertex attributes?
  }
  const isLit = material instanceof Material && !material.getExtension('KHR_materials_unlit');
  const isPoints = prim.getMode() === Primitive.Mode.POINTS;
  if (isLit && !isPoints) {
    semantics.add('NORMAL');
  }
  return semantics;
}
/**
 * Shifts texCoord indices on the given material and primitives assigned to
 * that material, such that indices start at zero and ascend without gaps.
 * Prior to calling this function, the implementation must ensure that:
 * - All TEXCOORD_n attributes on these prims are used by the material.
 * - Material does not require any unavailable TEXCOORD_n attributes.
 *
 * TEXCOORD_n attributes on morph targets are shifted alongside the parent
 * prim, but gaps may remain in their semantic lists.
 */
function shiftTexCoords(material, prims) {
  // Create map from srcTexCoord → dstTexCoord.
  const textureInfoList = listTextureInfoByMaterial(material);
  const texCoordSet = new Set(textureInfoList.map(info => info.getTexCoord()));
  const texCoordList = Array.from(texCoordSet).sort();
  const texCoordMap = new Map(texCoordList.map((texCoord, index) => [texCoord, index]));
  const semanticMap = new Map(texCoordList.map((texCoord, index) => [`TEXCOORD_${texCoord}`, `TEXCOORD_${index}`]));
  // Update material.
  for (const textureInfo of textureInfoList) {
    const texCoord = textureInfo.getTexCoord();
    textureInfo.setTexCoord(texCoordMap.get(texCoord));
  }
  // Update prims.
  for (const prim of prims) {
    const semantics = prim.listSemantics().filter(semantic => semantic.startsWith('TEXCOORD_')).sort();
    updatePrim(prim, semantics);
    prim.listTargets().forEach(target => updatePrim(target, semantics));
  }
  function updatePrim(prim, srcSemantics) {
    for (const srcSemantic of srcSemantics) {
      const uv = prim.getAttribute(srcSemantic);
      if (!uv) continue;
      const dstSemantic = semanticMap.get(srcSemantic);
      if (dstSemantic === srcSemantic) continue;
      prim.setAttribute(dstSemantic, uv);
      prim.setAttribute(srcSemantic, null);
    }
  }
}
/**********************************************************************************************
 * Prune solid (single-color) textures.
 */
async function pruneSolidTextures(document) {
  const root = document.getRoot();
  const graph = document.getGraph();
  const logger = document.getLogger();
  const textures = root.listTextures();
  const pending = textures.map(async texture => {
    var _texture$getSize;
    const factor = await getTextureFactor(texture);
    if (!factor) return;
    if (getTextureColorSpace(texture) === 'srgb') {
      ColorUtils.convertSRGBToLinear(factor, factor);
    }
    const name = texture.getName() || texture.getURI();
    const size = (_texture$getSize = texture.getSize()) == null ? void 0 : _texture$getSize.join('x');
    const slots = listTextureSlots(texture);
    for (const edge of graph.listParentEdges(texture)) {
      const parent = edge.getParent();
      if (parent !== root && applyMaterialFactor(parent, factor, edge.getName(), logger)) {
        edge.dispose();
      }
    }
    if (texture.listParents().length === 1) {
      texture.dispose();
      logger.debug(`${NAME$m}: Removed solid-color texture "${name}" (${size}px ${slots.join(', ')})`);
    }
  });
  await Promise.all(pending);
}
function applyMaterialFactor(material, factor, slot, logger) {
  if (material instanceof Material) {
    switch (slot) {
      case 'baseColorTexture':
        material.setBaseColorFactor(mul(factor, factor, material.getBaseColorFactor()));
        return true;
      case 'emissiveTexture':
        material.setEmissiveFactor(mul$1([0, 0, 0], factor.slice(0, 3), material.getEmissiveFactor()));
        return true;
      case 'occlusionTexture':
        return Math.abs(factor[0] - 1) <= EPS;
      case 'metallicRoughnessTexture':
        material.setRoughnessFactor(factor[1] * material.getRoughnessFactor());
        material.setMetallicFactor(factor[2] * material.getMetallicFactor());
        return true;
      case 'normalTexture':
        return len(sub(create(), factor, [0.5, 0.5, 1, 1])) <= EPS;
    }
  }
  logger.warn(`${NAME$m}: Detected single-color ${slot} texture. Pruning ${slot} not yet supported.`);
  return false;
}
async function getTextureFactor(texture) {
  const pixels = await maybeGetPixels(texture);
  if (!pixels) return null;
  const min = [Infinity, Infinity, Infinity, Infinity];
  const max = [-Infinity, -Infinity, -Infinity, -Infinity];
  const target = [0, 0, 0, 0];
  const [width, height] = pixels.shape;
  for (let i = 0; i < width; i++) {
    for (let j = 0; j < height; j++) {
      for (let k = 0; k < 4; k++) {
        min[k] = Math.min(min[k], pixels.get(i, j, k));
        max[k] = Math.max(max[k], pixels.get(i, j, k));
      }
    }
    if (len(sub(target, max, min)) / 255 > EPS) {
      return null;
    }
  }
  return scale(target, add(target, max, min), 0.5 / 255);
}
async function maybeGetPixels(texture) {
  try {
    return await getPixels(texture.getImage(), texture.getMimeType());
  } catch (e) {
    return null;
  }
}

/** Flags 'empty' values in a Uint32Array index. */
const EMPTY_U32$1 = 2 ** 32 - 1;
class VertexStream {
  constructor(prim) {
    this.attributes = [];
    /** Temporary vertex views in 4-byte-aligned memory. */
    this.u8 = void 0;
    this.u32 = void 0;
    let byteStride = 0;
    for (const attribute of deepListAttributes(prim)) {
      byteStride += this._initAttribute(attribute);
    }
    this.u8 = new Uint8Array(byteStride);
    this.u32 = new Uint32Array(this.u8.buffer);
  }
  _initAttribute(attribute) {
    const array = attribute.getArray();
    const u8 = new Uint8Array(array.buffer, array.byteOffset, array.byteLength);
    const byteStride = attribute.getElementSize() * attribute.getComponentSize();
    const paddedByteStride = BufferUtils.padNumber(byteStride);
    this.attributes.push({
      u8,
      byteStride,
      paddedByteStride
    });
    return paddedByteStride;
  }
  hash(index) {
    // Load vertex into 4-byte-aligned view.
    let byteOffset = 0;
    for (const {
      u8,
      byteStride,
      paddedByteStride
    } of this.attributes) {
      for (let i = 0; i < paddedByteStride; i++) {
        if (i < byteStride) {
          this.u8[byteOffset + i] = u8[index * byteStride + i];
        } else {
          this.u8[byteOffset + i] = 0;
        }
      }
      byteOffset += paddedByteStride;
    }
    // Compute hash.
    return murmurHash2(0, this.u32);
  }
  equal(a, b) {
    for (const {
      u8,
      byteStride
    } of this.attributes) {
      for (let j = 0; j < byteStride; j++) {
        if (u8[a * byteStride + j] !== u8[b * byteStride + j]) {
          return false;
        }
      }
    }
    return true;
  }
}
/**
 * References:
 * - https://github.com/mikolalysenko/murmurhash-js/blob/f19136e9f9c17f8cddc216ca3d44ec7c5c502f60/murmurhash2_gc.js#L14
 * - https://github.com/zeux/meshoptimizer/blob/e47e1be6d3d9513153188216455bdbed40a206ef/src/indexgenerator.cpp#L12
 */
function murmurHash2(h, key) {
  // MurmurHash2
  const m = 0x5bd1e995;
  const r = 24;
  for (let i = 0, il = key.length; i < il; i++) {
    let k = key[i];
    k = Math.imul(k, m) >>> 0;
    k = (k ^ k >> r) >>> 0;
    k = Math.imul(k, m) >>> 0;
    h = Math.imul(h, m) >>> 0;
    h = (h ^ k) >>> 0;
  }
  return h;
}
function hashLookup(table, buckets, stream, key, empty = EMPTY_U32$1) {
  const hashmod = buckets - 1;
  const hashval = stream.hash(key);
  let bucket = hashval & hashmod;
  for (let probe = 0; probe <= hashmod; probe++) {
    const item = table[bucket];
    if (item === empty || stream.equal(item, key)) {
      return bucket;
    }
    bucket = bucket + probe + 1 & hashmod; // Hash collision.
  }
  throw new Error('Hash table full.');
}

/**
 * Various methods of estimating a vertex count. For some background on why
 * multiple definitions of a vertex count should exist, see [_Vertex Count
 * Higher in Engine than in 3D Software_](https://shahriyarshahrabi.medium.com/vertex-count-higher-in-engine-than-in-3d-software-badc348ada66).
 * Totals for a {@link Scene}, {@link Node}, or {@link Mesh} will not
 * necessarily match the sum of the totals for each {@link Primitive}. Choose
 * the appropriate method for a relevant total or estimate:
 *
 * - {@link getSceneVertexCount}
 * - {@link getNodeVertexCount}
 * - {@link getMeshVertexCount}
 * - {@link getPrimitiveVertexCount}
 *
 * Many rendering features, such as volumetric transmission, may lead
 * to additional passes over some or all vertices. These tradeoffs are
 * implementation-dependent, and not considered here.
 */
var VertexCountMethod;
(function (VertexCountMethod) {
  /**
   * Expected number of vertices processed by the vertex shader for one render
   * pass, without considering the vertex cache.
   */
  VertexCountMethod["RENDER"] = "render";
  /**
   * Expected number of vertices processed by the vertex shader for one render
   * pass, assuming an Average Transform to Vertex Ratio (ATVR) of 1. Approaching
   * this result requires optimizing for locality of vertex references (see
   * {@link reorder}).
   *
   * References:
   * - [ACMR and ATVR](https://www.realtimerendering.com/blog/acmr-and-atvr/), Real-Time Rendering
   */
  VertexCountMethod["RENDER_CACHED"] = "render-cached";
  /**
   * Expected number of vertices uploaded to the GPU, assuming that a client
   * uploads each unique {@link Accessor} only once. Unless glTF vertex
   * attributes are pre-processed to a known buffer layout, and the client is
   * optimized for that buffer layout, this total will be optimistic.
   */
  VertexCountMethod["UPLOAD"] = "upload";
  /**
   * Expected number of vertices uploaded to the GPU, assuming that a client
   * uploads each unique {@link Primitive} individually, duplicating vertex
   * attribute {@link Accessor Accessors} shared by multiple primitives, but
   * never uploading the same Mesh or Primitive to GPU memory more than once.
   */
  VertexCountMethod["UPLOAD_NAIVE"] = "upload-naive";
  /**
   * Total number of unique vertices represented, considering all attributes of
   * each vertex, and removing any duplicates. Has no direct relationship to
   * runtime characteristics, but may be helpful in identifying asset
   * optimization opportunities.
   *
   * @hidden TODO(feat): Not yet implemented.
   * @internal
   */
  VertexCountMethod["DISTINCT"] = "distinct";
  /**
   * Total number of unique vertices represented, considering only vertex
   * positions, and removing any duplicates. Has no direct relationship to
   * runtime characteristics, but may be helpful in identifying asset
   * optimization opportunities.
   *
   * @hidden TODO(feat): Not yet implemented.
   * @internal
   */
  VertexCountMethod["DISTINCT_POSITION"] = "distinct-position";
  /**
   * Number of vertex positions never used by any {@link Primitive}. If all
   * vertices are unused, this total will match `UPLOAD`.
   */
  VertexCountMethod["UNUSED"] = "unused";
})(VertexCountMethod || (VertexCountMethod = {}));
/**
 * Computes total number of vertices in a {@link Primitive}, by the
 * specified method. See {@link VertexCountMethod} for available methods.
 */
function getPrimitiveVertexCount(prim, method) {
  const position = prim.getAttribute('POSITION');
  const indices = prim.getIndices();
  switch (method) {
    case VertexCountMethod.RENDER:
      return indices ? indices.getCount() : position.getCount();
    case VertexCountMethod.RENDER_CACHED:
      return indices ? new Set(indices.getArray()).size : position.getCount();
    case VertexCountMethod.UPLOAD_NAIVE:
    case VertexCountMethod.UPLOAD:
      return position.getCount();
    case VertexCountMethod.DISTINCT:
    case VertexCountMethod.DISTINCT_POSITION:
      return _assertNotImplemented(method);
    case VertexCountMethod.UNUSED:
      return indices ? position.getCount() - new Set(indices.getArray()).size : 0;
    default:
      return _assertUnreachable(method);
  }
}
function _assertNotImplemented(x) {
  throw new Error(`Not implemented: ${x}`);
}
function _assertUnreachable(x) {
  throw new Error(`Unexpected value: ${x}`);
}

/**
 * Rewrites a {@link Primitive} such that all unused vertices in its vertex
 * attributes are removed. When multiple Primitives share vertex attributes,
 * each indexing only a few, compaction can be used to produce Primitives
 * each having smaller, independent vertex streams instead.
 *
 * Regardless of whether the Primitive is indexed or contains unused vertices,
 * compaction will clone every {@link Accessor}. The resulting Primitive will
 * share no Accessors with other Primitives, allowing later changes to
 * the vertex stream to be applied in isolation.
 *
 * Example:
 *
 * ```javascript
 * import { compactPrimitive, transformMesh } from '@gltf-transform/functions';
 * import { fromTranslation } from 'gl-matrix/mat4';
 *
 * const mesh = document.getRoot().listMeshes().find((mesh) => mesh.getName() === 'MyMesh');
 * const prim = mesh.listPrimitives().find((prim) => { ... });
 *
 * // Compact primitive, removing unused vertices and detaching shared vertex
 * // attributes. Without compaction, `transformPrimitive` might affect other
 * // primitives sharing the same vertex attributes.
 * compactPrimitive(prim);
 *
 * // Transform primitive vertices, y += 10.
 * transformPrimitive(prim, fromTranslation([], [0, 10, 0]));
 * ```
 *
 * Parameters 'remap' and 'dstVertexCount' are optional. When either is
 * provided, the other must be provided as well. If one or both are missing,
 * both will be computed from the mesh indices.
 *
 * @param remap - Mapping. Array index represents vertex index in the source
 *		attributes, array value represents index in the resulting compacted
 *		primitive. When omitted, calculated from indices.
 * @param dstVertexcount - Number of unique vertices in compacted primitive.
 *		When omitted, calculated from indices.
 */
// TODO(cleanup): Additional signatures currently break greendoc/parse.
// export function compactPrimitive(prim: Primitive): Primitive;
// export function compactPrimitive(prim: Primitive, remap: TypedArray, dstVertexCount: number): Primitive;
function compactPrimitive(prim, remap, dstVertexCount) {
  const document = Document.fromGraph(prim.getGraph());
  if (!remap || !dstVertexCount) {
    [remap, dstVertexCount] = createCompactPlan(prim);
  }
  // Remap indices.
  const srcIndices = prim.getIndices();
  const srcIndicesArray = srcIndices ? srcIndices.getArray() : null;
  const srcIndicesCount = getPrimitiveVertexCount(prim, VertexCountMethod.RENDER);
  const dstIndices = document.createAccessor();
  const dstIndicesCount = srcIndicesCount; // primitive count does not change.
  const dstIndicesArray = createIndicesEmpty(dstIndicesCount, dstVertexCount);
  for (let i = 0; i < dstIndicesCount; i++) {
    dstIndicesArray[i] = remap[srcIndicesArray ? srcIndicesArray[i] : i];
  }
  prim.setIndices(dstIndices.setArray(dstIndicesArray));
  // Remap vertices.
  const srcAttributesPrev = deepListAttributes(prim);
  for (const srcAttribute of prim.listAttributes()) {
    const dstAttribute = shallowCloneAccessor(document, srcAttribute);
    compactAttribute(srcAttribute, srcIndices, remap, dstAttribute, dstVertexCount);
    prim.swap(srcAttribute, dstAttribute);
  }
  for (const target of prim.listTargets()) {
    for (const srcAttribute of target.listAttributes()) {
      const dstAttribute = shallowCloneAccessor(document, srcAttribute);
      compactAttribute(srcAttribute, srcIndices, remap, dstAttribute, dstVertexCount);
      target.swap(srcAttribute, dstAttribute);
    }
  }
  // Clean up accessors.
  if (srcIndices && srcIndices.listParents().length === 1) {
    srcIndices.dispose();
  }
  for (const srcAttribute of srcAttributesPrev) {
    if (srcAttribute.listParents().length === 1) {
      srcAttribute.dispose();
    }
  }
  return prim;
}
/**
 * Copies srcAttribute to dstAttribute, using the given indices and remap (srcIndex -> dstIndex).
 * Any existing array in dstAttribute is replaced. Vertices not used by the index are eliminated,
 * leaving a compact attribute.
 * @hidden
 * @internal
 */
function compactAttribute(srcAttribute, srcIndices, remap, dstAttribute, dstVertexCount) {
  const elementSize = srcAttribute.getElementSize();
  const srcArray = srcAttribute.getArray();
  const srcIndicesArray = srcIndices ? srcIndices.getArray() : null;
  const srcIndicesCount = srcIndices ? srcIndices.getCount() : srcAttribute.getCount();
  const dstArray = new srcArray.constructor(dstVertexCount * elementSize);
  const dstDone = new Uint8Array(dstVertexCount);
  for (let i = 0; i < srcIndicesCount; i++) {
    const srcIndex = srcIndicesArray ? srcIndicesArray[i] : i;
    const dstIndex = remap[srcIndex];
    if (dstDone[dstIndex]) continue;
    for (let j = 0; j < elementSize; j++) {
      dstArray[dstIndex * elementSize + j] = srcArray[srcIndex * elementSize + j];
    }
    dstDone[dstIndex] = 1;
  }
  return dstAttribute.setArray(dstArray);
}
/**
 * Creates a 'remap' and 'dstVertexCount' plan for indexed primitives,
 * such that they can be rewritten with {@link compactPrimitive} removing
 * any non-rendered vertices.
 * @hidden
 * @internal
 */
function createCompactPlan(prim) {
  const srcVertexCount = getPrimitiveVertexCount(prim, VertexCountMethod.UPLOAD);
  const indices = prim.getIndices();
  const indicesArray = indices ? indices.getArray() : null;
  if (!indices || !indicesArray) {
    return [createIndices(srcVertexCount, 1000000), srcVertexCount];
  }
  const remap = new Uint32Array(srcVertexCount).fill(EMPTY_U32$1);
  let dstVertexCount = 0;
  for (let i = 0; i < indicesArray.length; i++) {
    const srcIndex = indicesArray[i];
    if (remap[srcIndex] === EMPTY_U32$1) {
      remap[srcIndex] = dstVertexCount++;
    }
  }
  return [remap, dstVertexCount];
}

/**
 * CONTRIBUTOR NOTES
 *
 * Ideally a weld() implementation should be fast, robust, and tunable. The
 * writeup below tracks my attempts to solve for these constraints.
 *
 * (Approach #1) Follow the mergeVertices() implementation of three.js,
 * hashing vertices with a string concatenation of all vertex attributes.
 * The approach does not allow per-attribute tolerance in local units.
 *
 * (Approach #2) Sort points along the X axis, then make cheaper
 * searches up/down the sorted list for merge candidates. While this allows
 * simpler comparison based on specified tolerance, it's much slower, even
 * for cases where choice of the X vs. Y or Z axes is reasonable.
 *
 * (Approach #3) Attempted a Delaunay triangulation in three dimensions,
 * expecting it would be an n * log(n) algorithm, but the only implementation
 * I found (with delaunay-triangulate) appeared to be much slower than that,
 * and was notably slower than the sort-based approach, just building the
 * Delaunay triangulation alone.
 *
 * (Approach #4) Hybrid of (1) and (2), assigning vertices to a spatial
 * grid, then searching the local neighborhood (27 cells) for weld candidates.
 *
 * (Approach #5) Based on Meshoptimizer's implementation, when tolerance=0
 * use a hashtable to find bitwise-equal vertices quickly. Vastly faster than
 * previous approaches, but without tolerance options.
 *
 * RESULTS: For the "Lovecraftian" sample model linked below, after joining,
 * a primitive with 873,000 vertices can be welded down to 230,000 vertices.
 * https://sketchfab.com/3d-models/sculpt-january-day-19-lovecraftian-34ad2501108e4fceb9394f5b816b9f42
 *
 * - (1) Not tested, but prior results suggest not robust enough.
 * - (2) 30s
 * - (3) 660s
 * - (4) 5s exhaustive, 1.5s non-exhaustive
 * - (5) 0.2s
 *
 * As of April 2024, the lossy weld was removed, leaving only approach #5. An
 * upcoming Meshoptimizer release will include a simplifyWithAttributes
 * function allowing simplification with weighted consideration of vertex
 * attributes, which I hope to support. With that, weld() may remain faster,
 * simpler, and more maintainable.
 */
const NAME$l = 'weld';
const WELD_DEFAULTS = {
  overwrite: true,
  cleanup: true
};
/**
 * Welds {@link Primitive Primitives}, merging bitwise identical vertices. When
 * merged and indexed, data is shared more efficiently between vertices. File size
 * can be reduced, and the GPU uses the vertex cache more efficiently.
 *
 * Example:
 *
 * ```javascript
 * import { weld, getSceneVertexCount, VertexCountMethod } from '@gltf-transform/functions';
 *
 * const scene = document.getDefaultScene();
 * const srcVertexCount = getSceneVertexCount(scene, VertexCountMethod.GPU);
 * await document.transform(weld());
 * const dstVertexCount = getSceneVertexCount(scene, VertexCountMethod.GPU);
 * ```
 *
 * @category Transforms
 */
function weld(_options = WELD_DEFAULTS) {
  const options = assignDefaults(WELD_DEFAULTS, _options);
  return createTransform(NAME$l, async doc => {
    const logger = doc.getLogger();
    for (const mesh of doc.getRoot().listMeshes()) {
      for (const prim of mesh.listPrimitives()) {
        weldPrimitive(prim, options);
        if (getPrimitiveVertexCount(prim, VertexCountMethod.RENDER) === 0) {
          prim.dispose();
        }
      }
      if (mesh.listPrimitives().length === 0) mesh.dispose();
    }
    // Welding removes degenerate meshes; prune leaf nodes afterward.
    if (options.cleanup) {
      await doc.transform(prune({
        propertyTypes: [PropertyType.ACCESSOR, PropertyType.NODE],
        keepAttributes: true,
        keepIndices: true,
        keepLeaves: false
      }), dedup({
        propertyTypes: [PropertyType.ACCESSOR]
      }));
    }
    logger.debug(`${NAME$l}: Complete.`);
  });
}
/**
 * Welds a {@link Primitive}, merging bitwise identical vertices. When merged
 * and indexed, data is shared more efficiently between vertices. File size can
 * be reduced, and the GPU uses the vertex cache more efficiently.
 *
 * Example:
 *
 * ```javascript
 * import { weldPrimitive, getMeshVertexCount, VertexCountMethod } from '@gltf-transform/functions';
 *
 * const mesh = document.getRoot().listMeshes()
 * 	.find((mesh) => mesh.getName() === 'Gizmo');
 *
 * const srcVertexCount = getMeshVertexCount(mesh, VertexCountMethod.GPU);
 *
 * for (const prim of mesh.listPrimitives()) {
 *   weldPrimitive(prim);
 * }
 *
 * const dstVertexCount = getMeshVertexCount(mesh, VertexCountMethod.GPU);
 * ```
 */
function weldPrimitive(prim, _options = WELD_DEFAULTS) {
  const graph = prim.getGraph();
  const document = Document.fromGraph(graph);
  const logger = document.getLogger();
  const options = _extends({}, WELD_DEFAULTS, _options);
  if (prim.getIndices() && !options.overwrite) return;
  if (prim.getMode() === Primitive.Mode.POINTS) return;
  const srcVertexCount = prim.getAttribute('POSITION').getCount();
  const srcIndices = prim.getIndices();
  const srcIndicesArray = srcIndices == null ? void 0 : srcIndices.getArray();
  const srcIndicesCount = srcIndices ? srcIndices.getCount() : srcVertexCount;
  const stream = new VertexStream(prim);
  const tableSize = ceilPowerOfTwo$1(srcVertexCount + srcVertexCount / 4);
  const table = new Uint32Array(tableSize).fill(EMPTY_U32$1);
  const writeMap = new Uint32Array(srcVertexCount).fill(EMPTY_U32$1); // oldIndex → newIndex
  // (1) Compare and identify indices to weld.
  let dstVertexCount = 0;
  for (let i = 0; i < srcIndicesCount; i++) {
    const srcIndex = srcIndicesArray ? srcIndicesArray[i] : i;
    if (writeMap[srcIndex] !== EMPTY_U32$1) continue;
    const hashIndex = hashLookup(table, tableSize, stream, srcIndex, EMPTY_U32$1);
    const dstIndex = table[hashIndex];
    if (dstIndex === EMPTY_U32$1) {
      table[hashIndex] = srcIndex;
      writeMap[srcIndex] = dstVertexCount++;
    } else {
      writeMap[srcIndex] = writeMap[dstIndex];
    }
  }
  logger.debug(`${NAME$l}: ${formatDeltaOp(srcVertexCount, dstVertexCount)} vertices.`);
  compactPrimitive(prim, writeMap, dstVertexCount);
}

const {
  FLOAT
} = Accessor.ComponentType;
/**
 * Applies a transform matrix to a {@link Primitive}.
 *
 * All vertex attributes on the Primitive and its
 * {@link PrimitiveTarget PrimitiveTargets} are modified in place. If vertex
 * streams are shared with other Primitives, and overwriting the shared vertex
 * attributes is not desired, use {@link compactPrimitive} to pre-process
 * the Primitive or call {@link transformMesh} instead.
 *
 * Example:
 *
 * ```javascript
 * import { fromTranslation } from 'gl-matrix/mat4';
 * import { transformPrimitive } from '@gltf-transform/functions';
 *
 * // offset vertices, y += 10.
 * transformPrimitive(prim, fromTranslation([], [0, 10, 0]));
 * ```
 *
 * @param prim
 * @param matrix
 */
function transformPrimitive(prim, matrix) {
  // Apply transform to base attributes.
  const position = prim.getAttribute('POSITION');
  if (position) {
    applyMatrix(matrix, position);
  }
  const normal = prim.getAttribute('NORMAL');
  if (normal) {
    applyNormalMatrix(matrix, normal);
  }
  const tangent = prim.getAttribute('TANGENT');
  if (tangent) {
    applyTangentMatrix(matrix, tangent);
  }
  // Apply transform to morph attributes.
  for (const target of prim.listTargets()) {
    const _position = target.getAttribute('POSITION');
    if (_position) {
      applyMatrix(matrix, _position);
    }
    const _normal = target.getAttribute('NORMAL');
    if (_normal) {
      applyNormalMatrix(matrix, _normal);
    }
    const _tangent = target.getAttribute('TANGENT');
    if (_tangent) {
      applyTangentMatrix(matrix, _tangent);
    }
  }
  // Reverse winding order if scale is negative.
  // See: https://github.com/KhronosGroup/glTF-Sample-Models/tree/master/2.0/NegativeScaleTest
  if (determinant(matrix) < 0) {
    reversePrimitiveWindingOrder(prim);
  }
}
function applyMatrix(matrix, attribute) {
  const componentType = attribute.getComponentType();
  const normalized = attribute.getNormalized();
  const srcArray = attribute.getArray();
  const dstArray = componentType === FLOAT ? srcArray : new Float32Array(srcArray.length);
  const vector = create$1();
  for (let i = 0, il = attribute.getCount(); i < il; i++) {
    if (normalized) {
      vector[0] = MathUtils.decodeNormalizedInt(srcArray[i * 3], componentType);
      vector[1] = MathUtils.decodeNormalizedInt(srcArray[i * 3 + 1], componentType);
      vector[2] = MathUtils.decodeNormalizedInt(srcArray[i * 3 + 2], componentType);
    } else {
      vector[0] = srcArray[i * 3];
      vector[1] = srcArray[i * 3 + 1];
      vector[2] = srcArray[i * 3 + 2];
    }
    transformMat4(vector, vector, matrix);
    dstArray[i * 3] = vector[0];
    dstArray[i * 3 + 1] = vector[1];
    dstArray[i * 3 + 2] = vector[2];
  }
  attribute.setArray(dstArray).setNormalized(false);
}
function applyNormalMatrix(matrix, attribute) {
  const array = attribute.getArray();
  const normalized = attribute.getNormalized();
  const componentType = attribute.getComponentType();
  const normalMatrix = create$2();
  fromMat4(normalMatrix, matrix);
  invert(normalMatrix, normalMatrix);
  transpose(normalMatrix, normalMatrix);
  const vector = create$1();
  for (let i = 0, il = attribute.getCount(); i < il; i++) {
    if (normalized) {
      vector[0] = MathUtils.decodeNormalizedInt(array[i * 3], componentType);
      vector[1] = MathUtils.decodeNormalizedInt(array[i * 3 + 1], componentType);
      vector[2] = MathUtils.decodeNormalizedInt(array[i * 3 + 2], componentType);
    } else {
      vector[0] = array[i * 3];
      vector[1] = array[i * 3 + 1];
      vector[2] = array[i * 3 + 2];
    }
    transformMat3(vector, vector, normalMatrix);
    normalize(vector, vector);
    if (normalized) {
      array[i * 3] = MathUtils.decodeNormalizedInt(vector[0], componentType);
      array[i * 3 + 1] = MathUtils.decodeNormalizedInt(vector[1], componentType);
      array[i * 3 + 2] = MathUtils.decodeNormalizedInt(vector[2], componentType);
    } else {
      array[i * 3] = vector[0];
      array[i * 3 + 1] = vector[1];
      array[i * 3 + 2] = vector[2];
    }
  }
}
function applyTangentMatrix(matrix, attribute) {
  const array = attribute.getArray();
  const normalized = attribute.getNormalized();
  const componentType = attribute.getComponentType();
  const v3 = create$1();
  for (let i = 0, il = attribute.getCount(); i < il; i++) {
    if (normalized) {
      v3[0] = MathUtils.decodeNormalizedInt(array[i * 4], componentType);
      v3[1] = MathUtils.decodeNormalizedInt(array[i * 4 + 1], componentType);
      v3[2] = MathUtils.decodeNormalizedInt(array[i * 4 + 2], componentType);
    } else {
      v3[0] = array[i * 4];
      v3[1] = array[i * 4 + 1];
      v3[2] = array[i * 4 + 2];
    }
    // mat4 affine matrix applied to vector, vector interpreted as a direction.
    // Reference: https://github.com/mrdoob/three.js/blob/9f4de99828c05e71c47e6de0beb4c6e7652e486a/src/math/Vector3.js#L286-L300
    v3[0] = matrix[0] * v3[0] + matrix[4] * v3[1] + matrix[8] * v3[2];
    v3[1] = matrix[1] * v3[0] + matrix[5] * v3[1] + matrix[9] * v3[2];
    v3[2] = matrix[2] * v3[0] + matrix[6] * v3[1] + matrix[10] * v3[2];
    normalize(v3, v3);
    if (normalized) {
      array[i * 4] = MathUtils.decodeNormalizedInt(v3[0], componentType);
      array[i * 4 + 1] = MathUtils.decodeNormalizedInt(v3[1], componentType);
      array[i * 4 + 2] = MathUtils.decodeNormalizedInt(v3[2], componentType);
    } else {
      array[i * 4] = v3[0];
      array[i * 4 + 1] = v3[1];
      array[i * 4 + 2] = v3[2];
    }
  }
}
function reversePrimitiveWindingOrder(prim) {
  if (prim.getMode() !== Primitive.Mode.TRIANGLES) return;
  if (!prim.getIndices()) weldPrimitive(prim);
  const indices = prim.getIndices();
  for (let i = 0, il = indices.getCount(); i < il; i += 3) {
    const a = indices.getScalar(i);
    const c = indices.getScalar(i + 2);
    indices.setScalar(i, c);
    indices.setScalar(i + 2, a);
  }
}

const {
  LINES: LINES$1,
  LINE_STRIP: LINE_STRIP$2,
  LINE_LOOP: LINE_LOOP$2,
  TRIANGLES: TRIANGLES$1,
  TRIANGLE_STRIP: TRIANGLE_STRIP$2,
  TRIANGLE_FAN: TRIANGLE_FAN$2
} = Primitive.Mode;
/**
 * Converts a LINE_STRIP or LINE_LOOP {@link Primitive} to LINES, which is
 * more widely supported. Any other topology given as input (points or
 * triangles) will throw an error.
 *
 * Example:
 *
 * ```javascript
 * import { convertPrimitiveToLines } from '@gltf-transform/functions';
 *
 * console.log(prim.getMode()); // 2 (LINE_LOOP)
 * convertPrimitiveToLines(prim);
 * console.log(prim.getMode()); // 1 (LINES)
 * ```
 */
function convertPrimitiveToLines(prim) {
  const graph = prim.getGraph();
  const document = Document.fromGraph(graph);
  // Ensure indexed primitive.
  if (!prim.getIndices()) {
    weldPrimitive(prim);
  }
  // Allocate indices new GL primitives.
  const srcIndices = prim.getIndices();
  const srcIndicesArray = srcIndices.getArray();
  const dstGLPrimitiveCount = getGLPrimitiveCount(prim);
  const IndicesArray = ComponentTypeToTypedArray[srcIndices.getComponentType()];
  const dstIndicesArray = new IndicesArray(dstGLPrimitiveCount * 2);
  // Generate GL primitives.
  const srcMode = prim.getMode();
  if (srcMode === LINE_STRIP$2) {
    // https://glasnost.itcarlow.ie/~powerk/opengl/primitives/primitives.htm
    for (let i = 0; i < dstGLPrimitiveCount; i++) {
      dstIndicesArray[i * 2] = srcIndicesArray[i];
      dstIndicesArray[i * 2 + 1] = srcIndicesArray[i + 1];
    }
  } else if (srcMode === LINE_LOOP$2) {
    // https://glasnost.itcarlow.ie/~powerk/opengl/primitives/primitives.htm
    for (let i = 0; i < dstGLPrimitiveCount; i++) {
      if (i < dstGLPrimitiveCount - 1) {
        dstIndicesArray[i * 2] = srcIndicesArray[i];
        dstIndicesArray[i * 2 + 1] = srcIndicesArray[i + 1];
      } else {
        dstIndicesArray[i * 2] = srcIndicesArray[i];
        dstIndicesArray[i * 2 + 1] = srcIndicesArray[0];
      }
    }
  } else {
    throw new Error('Only LINE_STRIP and LINE_LOOP may be converted to LINES.');
  }
  // Update prim mode and indices.
  prim.setMode(LINES$1);
  const root = document.getRoot();
  if (srcIndices.listParents().some(parent => parent !== root && parent !== prim)) {
    prim.setIndices(shallowCloneAccessor(document, srcIndices).setArray(dstIndicesArray));
  } else {
    srcIndices.setArray(dstIndicesArray);
  }
}
/**
 * Converts a TRIANGLE_STRIP or TRIANGLE_LOOP {@link Primitive} to TRIANGLES,
 * which is more widely supported. Any other topology given as input (points or
 * lines) will throw an error.
 *
 * Example:
 *
 * ```javascript
 * import { convertPrimitiveToTriangles } from '@gltf-transform/functions';
 *
 * console.log(prim.getMode()); // 5 (TRIANGLE_STRIP)
 * convertPrimitiveToTriangles(prim);
 * console.log(prim.getMode()); // 4 (TRIANGLES)
 * ```
 */
function convertPrimitiveToTriangles(prim) {
  const graph = prim.getGraph();
  const document = Document.fromGraph(graph);
  // Ensure indexed primitive.
  if (!prim.getIndices()) {
    weldPrimitive(prim);
  }
  // Allocate indices new GL primitives.
  const srcIndices = prim.getIndices();
  const srcIndicesArray = srcIndices.getArray();
  const dstGLPrimitiveCount = getGLPrimitiveCount(prim);
  const IndicesArray = ComponentTypeToTypedArray[srcIndices.getComponentType()];
  const dstIndicesArray = new IndicesArray(dstGLPrimitiveCount * 3);
  // Generate GL primitives.
  const srcMode = prim.getMode();
  if (srcMode === TRIANGLE_STRIP$2) {
    // https://en.wikipedia.org/wiki/Triangle_strip
    for (let i = 0, il = srcIndicesArray.length; i < il - 2; i++) {
      if (i % 2) {
        dstIndicesArray[i * 3] = srcIndicesArray[i + 1];
        dstIndicesArray[i * 3 + 1] = srcIndicesArray[i];
        dstIndicesArray[i * 3 + 2] = srcIndicesArray[i + 2];
      } else {
        dstIndicesArray[i * 3] = srcIndicesArray[i];
        dstIndicesArray[i * 3 + 1] = srcIndicesArray[i + 1];
        dstIndicesArray[i * 3 + 2] = srcIndicesArray[i + 2];
      }
    }
  } else if (srcMode === TRIANGLE_FAN$2) {
    // https://en.wikipedia.org/wiki/Triangle_fan
    for (let i = 0; i < dstGLPrimitiveCount; i++) {
      dstIndicesArray[i * 3] = srcIndicesArray[0];
      dstIndicesArray[i * 3 + 1] = srcIndicesArray[i + 1];
      dstIndicesArray[i * 3 + 2] = srcIndicesArray[i + 2];
    }
  } else {
    throw new Error('Only TRIANGLE_STRIP and TRIANGLE_FAN may be converted to TRIANGLES.');
  }
  // Update prim mode and indices.
  prim.setMode(TRIANGLES$1);
  const root = document.getRoot();
  if (srcIndices.listParents().some(parent => parent !== root && parent !== prim)) {
    prim.setIndices(shallowCloneAccessor(document, srcIndices).setArray(dstIndicesArray));
  } else {
    srcIndices.setArray(dstIndicesArray);
  }
}
function dequantizeAttribute(attribute) {
  const srcArray = attribute.getArray();
  if (!srcArray) return;
  const dstArray = dequantizeAttributeArray(srcArray, attribute.getComponentType(), attribute.getNormalized());
  attribute.setArray(dstArray).setNormalized(false);
}
function dequantizeAttributeArray(srcArray, componentType, normalized) {
  const dstArray = new Float32Array(srcArray.length);
  for (let i = 0, il = srcArray.length; i < il; i++) {
    if (normalized) {
      dstArray[i] = MathUtils.decodeNormalizedInt(srcArray[i], componentType);
    } else {
      dstArray[i] = srcArray[i];
    }
  }
  return dstArray;
}

const NAME$i = 'flatten';
const FLATTEN_DEFAULTS = {
  cleanup: true
};
/**
 * Flattens the scene graph, leaving {@link Node Nodes} with
 * {@link Mesh Meshes}, {@link Camera Cameras}, and other attachments
 * as direct children of the {@link Scene}. Skeletons and their
 * descendants are left in their original Node structure.
 *
 * {@link Animation} targeting a Node or its parents will
 * prevent that Node from being moved.
 *
 * Example:
 *
 * ```ts
 * import { flatten } from '@gltf-transform/functions';
 *
 * await document.transform(flatten());
 * ```
 *
 * @category Transforms
 */
function flatten(_options = FLATTEN_DEFAULTS) {
  const options = assignDefaults(FLATTEN_DEFAULTS, _options);
  return createTransform(NAME$i, async document => {
    const root = document.getRoot();
    const logger = document.getLogger();
    // (1) Mark joints.
    const joints = new Set();
    for (const skin of root.listSkins()) {
      for (const joint of skin.listJoints()) {
        joints.add(joint);
      }
    }
    // (2) Mark nodes with TRS animation.
    const animated = new Set();
    for (const animation of root.listAnimations()) {
      for (const channel of animation.listChannels()) {
        const node = channel.getTargetNode();
        if (node && channel.getTargetPath() !== 'weights') {
          animated.add(node);
        }
      }
    }
    // (3) Mark descendants of joints and animated nodes.
    const hasJointParent = new Set();
    const hasAnimatedParent = new Set();
    for (const scene of root.listScenes()) {
      scene.traverse(node => {
        const parent = node.getParentNode();
        if (!parent) return;
        if (joints.has(parent) || hasJointParent.has(parent)) {
          hasJointParent.add(node);
        }
        if (animated.has(parent) || hasAnimatedParent.has(parent)) {
          hasAnimatedParent.add(node);
        }
      });
    }
    // (4) For each affected node, in top-down order, clear parents.
    for (const scene of root.listScenes()) {
      scene.traverse(node => {
        if (animated.has(node)) return;
        if (hasJointParent.has(node)) return;
        if (hasAnimatedParent.has(node)) return;
        clearNodeParent(node);
      });
    }
    // TODO(feat): Transform animation channels, accounting for previously inherited transforms.
    if (animated.size) {
      logger.debug(`${NAME$i}: Flattening node hierarchies with TRS animation not yet supported.`);
    }
    // (5) Clean up leaf nodes.
    if (options.cleanup) {
      await document.transform(prune({
        propertyTypes: [PropertyType.NODE],
        keepLeaves: false
      }));
    }
    logger.debug(`${NAME$i}: Complete.`);
  });
}

const NAME$h = 'instance';
const INSTANCE_DEFAULTS = {
  min: 5
};
/**
 * Creates GPU instances (with `EXT_mesh_gpu_instancing`) for shared {@link Mesh} references. In
 * engines supporting the extension, reused Meshes will be drawn with GPU instancing, greatly
 * reducing draw calls and improving performance in many cases. If you're not sure that identical
 * Meshes share vertex data and materials ("linked duplicates"), run {@link dedup} first to link them.
 *
 * Example:
 *
 * ```javascript
 * import { dedup, instance } from '@gltf-transform/functions';
 *
 * await document.transform(
 * 	dedup(),
 * 	instance({min: 5}),
 * );
 * ```
 *
 * @category Transforms
 */
function instance(_options = INSTANCE_DEFAULTS) {
  const options = assignDefaults(INSTANCE_DEFAULTS, _options);
  return createTransform(NAME$h, doc => {
    const logger = doc.getLogger();
    const root = doc.getRoot();
    if (root.listAnimations().length) {
      logger.warn(`${NAME$h}: Instancing is not currently supported for animated models.`);
      logger.debug(`${NAME$h}: Complete.`);
      return;
    }
    const batchExtension = doc.createExtension(EXTMeshGPUInstancing);
    let numBatches = 0;
    let numInstances = 0;
    for (const scene of root.listScenes()) {
      // Gather a one-to-many Mesh/Node mapping, identifying what we can instance.
      const meshInstances = new Map();
      scene.traverse(node => {
        const mesh = node.getMesh();
        if (!mesh) return;
        meshInstances.set(mesh, (meshInstances.get(mesh) || new Set()).add(node));
      });
      // For each Mesh, create an InstancedMesh and collect transforms.
      const modifiedNodes = [];
      for (const mesh of Array.from(meshInstances.keys())) {
        const nodes = Array.from(meshInstances.get(mesh));
        if (nodes.length < options.min) continue;
        if (nodes.some(node => node.getSkin())) continue;
        // Cannot preserve volumetric effects when instancing with varying scale.
        // See: https://github.com/KhronosGroup/glTF-Sample-Models/tree/master/2.0/AttenuationTest
        if (mesh.listPrimitives().some(hasVolume) && nodes.some(hasScale)) continue;
        const batch = createBatch(doc, batchExtension, mesh, nodes.length);
        const batchTranslation = batch.getAttribute('TRANSLATION');
        const batchRotation = batch.getAttribute('ROTATION');
        const batchScale = batch.getAttribute('SCALE');
        const batchNode = doc.createNode().setMesh(mesh).setExtension('EXT_mesh_gpu_instancing', batch);
        scene.addChild(batchNode);
        let needsTranslation = false;
        let needsRotation = false;
        let needsScale = false;
        // For each Node, write TRS properties into instance attributes.
        for (let i = 0; i < nodes.length; i++) {
          let t, r, s;
          const node = nodes[i];
          batchTranslation.setElement(i, t = node.getWorldTranslation());
          batchRotation.setElement(i, r = node.getWorldRotation());
          batchScale.setElement(i, s = node.getWorldScale());
          if (!MathUtils.eq(t, [0, 0, 0])) needsTranslation = true;
          if (!MathUtils.eq(r, [0, 0, 0, 1])) needsRotation = true;
          if (!MathUtils.eq(s, [1, 1, 1])) needsScale = true;
        }
        if (!needsTranslation) batchTranslation.dispose();
        if (!needsRotation) batchRotation.dispose();
        if (!needsScale) batchScale.dispose();
        if (!needsTranslation && !needsRotation && !needsScale) {
          batchNode.dispose();
          batch.dispose();
          continue;
        }
        // Mark nodes for cleanup.
        for (const node of nodes) {
          node.setMesh(null);
          modifiedNodes.push(node);
        }
        numBatches++;
        numInstances += nodes.length;
      }
      pruneUnusedNodes(modifiedNodes, logger);
    }
    if (numBatches > 0) {
      logger.info(`${NAME$h}: Created ${numBatches} batches, with ${numInstances} total instances.`);
    } else {
      logger.info(`${NAME$h}: No meshes with >=${options.min} parent nodes were found.`);
    }
    if (batchExtension.listProperties().length === 0) {
      batchExtension.dispose();
    }
    logger.debug(`${NAME$h}: Complete.`);
  });
}
function pruneUnusedNodes(nodes, logger) {
  let node;
  let unusedNodes = 0;
  while (node = nodes.pop()) {
    if (node.listChildren().length || node.getCamera() || node.getMesh() || node.getSkin() || node.listExtensions().length) {
      continue;
    }
    const nodeParent = node.getParentNode();
    if (nodeParent) nodes.push(nodeParent);
    node.dispose();
    unusedNodes++;
  }
  logger.debug(`${NAME$h}: Removed ${unusedNodes} unused nodes.`);
}
function hasVolume(prim) {
  const material = prim.getMaterial();
  return !!(material && material.getExtension('KHR_materials_volume'));
}
function hasScale(node) {
  const scale = node.getWorldScale();
  return !MathUtils.eq(scale, [1, 1, 1]);
}
function createBatch(doc, batchExtension, mesh, count) {
  const buffer = mesh.listPrimitives()[0].getAttribute('POSITION').getBuffer();
  const batchTranslation = doc.createAccessor().setType('VEC3').setArray(new Float32Array(3 * count)).setBuffer(buffer);
  const batchRotation = doc.createAccessor().setType('VEC4').setArray(new Float32Array(4 * count)).setBuffer(buffer);
  const batchScale = doc.createAccessor().setType('VEC3').setArray(new Float32Array(3 * count)).setBuffer(buffer);
  return batchExtension.createInstancedMesh().setAttribute('TRANSLATION', batchTranslation).setAttribute('ROTATION', batchRotation).setAttribute('SCALE', batchScale);
}

const JOIN_PRIMITIVE_DEFAULTS = {
  skipValidation: false
};
const EMPTY_U32 = 2 ** 32 - 1;
const {
  LINE_STRIP: LINE_STRIP$1,
  LINE_LOOP: LINE_LOOP$1,
  TRIANGLE_STRIP: TRIANGLE_STRIP$1,
  TRIANGLE_FAN: TRIANGLE_FAN$1
} = Primitive.Mode;
/**
 * Given a list of compatible Mesh {@link Primitive Primitives}, returns new Primitive
 * containing their vertex data. Compatibility requires that all Primitives share the
 * same {@link Material Materials}, draw mode, and vertex attribute types. Primitives
 * using morph targets cannot currently be joined.
 *
 * Example:
 *
 * ```javascript
 * import { joinPrimitives } from '@gltf-transform/functions';
 *
 * // Succeeds if Primitives are compatible, or throws an error.
 * const result = joinPrimitives(mesh.listPrimitives());
 *
 * for (const prim of mesh.listPrimitives()) {
 * 	prim.dispose();
 * }
 *
 * mesh.addPrimitive(result);
 * ```
 */
function joinPrimitives(prims, _options = {}) {
  const options = assignDefaults(JOIN_PRIMITIVE_DEFAULTS, _options);
  const templatePrim = prims[0];
  const document = Document.fromGraph(templatePrim.getGraph());
  // (1) Validation.
  if (!options.skipValidation && new Set(prims.map(createPrimGroupKey)).size > 1) {
    throw new Error('' + 'Requires >=2 Primitives, sharing the same Material ' + 'and Mode, with compatible vertex attributes and indices.');
  }
  // (2) Convert all prims to POINTS, LINES, or TRIANGLES.
  for (const prim of prims) {
    switch (prim.getMode()) {
      case LINE_STRIP$1:
      case LINE_LOOP$1:
        convertPrimitiveToLines(prim);
        break;
      case TRIANGLE_STRIP$1:
      case TRIANGLE_FAN$1:
        convertPrimitiveToTriangles(prim);
        break;
    }
  }
  const primRemaps = []; // remap[srcIndex] → dstIndex, by prim
  const primVertexCounts = new Uint32Array(prims.length); // vertex count, by prim
  let dstVertexCount = 0;
  let dstIndicesCount = 0;
  // (3) Build remap lists.
  for (let primIndex = 0; primIndex < prims.length; primIndex++) {
    const srcPrim = prims[primIndex];
    const srcIndices = srcPrim.getIndices();
    const srcVertexCount = srcPrim.getAttribute('POSITION').getCount();
    const srcIndicesArray = srcIndices ? srcIndices.getArray() : null;
    const srcIndicesCount = srcIndices ? srcIndices.getCount() : srcVertexCount;
    const remap = new Uint32Array(srcVertexCount).fill(EMPTY_U32);
    for (let i = 0; i < srcIndicesCount; i++) {
      const index = srcIndicesArray ? srcIndicesArray[i] : i;
      if (remap[index] === EMPTY_U32) {
        remap[index] = dstVertexCount++;
        primVertexCounts[primIndex]++;
      }
    }
    primRemaps.push(remap);
    dstIndicesCount += srcIndicesCount;
  }
  // (4) Allocate joined attributes.
  const dstPrim = document.createPrimitive().setMode(templatePrim.getMode()).setMaterial(templatePrim.getMaterial());
  for (const semantic of templatePrim.listSemantics()) {
    const tplAttribute = templatePrim.getAttribute(semantic);
    const AttributeArray = ComponentTypeToTypedArray[tplAttribute.getComponentType()];
    const dstAttribute = shallowCloneAccessor(document, tplAttribute).setArray(new AttributeArray(dstVertexCount * tplAttribute.getElementSize()));
    dstPrim.setAttribute(semantic, dstAttribute);
  }
  // (5) Allocate joined indices.
  const tplIndices = templatePrim.getIndices();
  const dstIndices = tplIndices ? shallowCloneAccessor(document, tplIndices).setArray(createIndicesEmpty(dstIndicesCount, dstVertexCount)) : null;
  dstPrim.setIndices(dstIndices);
  // (6) Remap attributes into joined Primitive.
  let dstIndicesOffset = 0;
  for (let primIndex = 0; primIndex < primRemaps.length; primIndex++) {
    const srcPrim = prims[primIndex];
    const srcIndices = srcPrim.getIndices();
    const srcIndicesCount = srcIndices ? srcIndices.getCount() : -1;
    const remap = primRemaps[primIndex];
    if (srcIndices && dstIndices) {
      remapIndices(srcIndices, remap, dstIndices, dstIndicesOffset);
      dstIndicesOffset += srcIndicesCount;
    }
    for (const semantic of dstPrim.listSemantics()) {
      const srcAttribute = srcPrim.getAttribute(semantic);
      const dstAttribute = dstPrim.getAttribute(semantic);
      remapAttribute(srcAttribute, srcIndices, remap, dstAttribute);
    }
  }
  return dstPrim;
}
/**
 * Internal variant of {@link compactAttribute}. Unlike compactAttribute,
 * assumes the vertex count cannot change, and avoids cloning attributes.
 * @hidden
 * @internal
 */
function remapAttribute(srcAttribute, srcIndices, remap, dstAttribute) {
  const elementSize = srcAttribute.getElementSize();
  const srcIndicesArray = srcIndices ? srcIndices.getArray() : null;
  const srcVertexCount = srcAttribute.getCount();
  const srcArray = srcAttribute.getArray();
  const dstArray = dstAttribute.getArray();
  const done = new Uint8Array(srcAttribute.getCount());
  for (let i = 0, il = srcIndices ? srcIndices.getCount() : srcVertexCount; i < il; i++) {
    const srcIndex = srcIndicesArray ? srcIndicesArray[i] : i;
    const dstIndex = remap[srcIndex];
    if (done[dstIndex]) continue;
    for (let j = 0; j < elementSize; j++) {
      dstArray[dstIndex * elementSize + j] = srcArray[srcIndex * elementSize + j];
    }
    done[dstIndex] = 1;
  }
}
/**
 * Internal variant of {@link compactPrimitive}'s index remapping. Avoids
 * cloning indices; writes directly to `dstIndices`.
 * @hidden
 * @internal
 */
function remapIndices(srcIndices, remap, dstIndices, dstOffset) {
  const srcCount = srcIndices.getCount();
  const srcArray = srcIndices.getArray();
  const dstArray = dstIndices.getArray();
  for (let i = 0; i < srcCount; i++) {
    const srcIndex = srcArray[i];
    const dstIndex = remap[srcIndex];
    dstArray[dstOffset + i] = dstIndex;
  }
}

const NAME$g = 'join';
const {
  ROOT,
  NODE,
  MESH,
  PRIMITIVE,
  ACCESSOR
} = PropertyType;
// prettier-ignore
const _matrix = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
const JOIN_DEFAULTS = {
  keepMeshes: false,
  keepNamed: false,
  cleanup: true
};
/**
 * Joins compatible {@link Primitive Primitives} and reduces draw calls.
 * Primitives are eligible for joining if they are members of the same
 * {@link Mesh} or, optionally, attached to sibling {@link Node Nodes}
 * in the scene hierarchy. For best results, apply {@link dedup} and
 * {@link flatten} first to maximize the number of Primitives that
 * can be joined.
 *
 * NOTE: In a Scene that heavily reuses the same Mesh data, joining may
 * increase vertex count. Consider alternatives, like
 * {@link instance instancing} with {@link EXTMeshGPUInstancing}.
 *
 * Example:
 *
 * ```ts
 * import { PropertyType } from '@gltf-transform/core';
 * import { join, flatten, dedup } from '@gltf-transform/functions';
 *
 * await document.transform(
 * 	dedup({ propertyTypes: [PropertyType.MATERIAL] }),
 * 	flatten(),
 * 	join({ keepNamed: false }),
 * );
 * ```
 *
 * @category Transforms
 */
function join(_options = JOIN_DEFAULTS) {
  const options = assignDefaults(JOIN_DEFAULTS, _options);
  return createTransform(NAME$g, async document => {
    const root = document.getRoot();
    const logger = document.getLogger();
    // Join.
    for (const scene of root.listScenes()) {
      _joinLevel(document, scene, options);
      scene.traverse(node => _joinLevel(document, node, options));
    }
    // Clean up.
    if (options.cleanup) {
      await document.transform(prune({
        propertyTypes: [NODE, MESH, PRIMITIVE, ACCESSOR],
        keepAttributes: true,
        keepIndices: true,
        keepLeaves: false
      }));
    }
    logger.debug(`${NAME$g}: Complete.`);
  });
}
function _joinLevel(document, parent, options) {
  const logger = document.getLogger();
  const groups = {};
  // Scan for compatible Primitives.
  const children = parent.listChildren();
  for (let nodeIndex = 0; nodeIndex < children.length; nodeIndex++) {
    const node = children[nodeIndex];
    // Skip animated nodes.
    const isAnimated = node.listParents().some(p => p instanceof AnimationChannel);
    if (isAnimated) continue;
    // Skip nodes without meshes.
    const mesh = node.getMesh();
    if (!mesh) continue;
    // Skip nodes with instancing; unsupported.
    if (node.getExtension('EXT_mesh_gpu_instancing')) continue;
    // Skip nodes with skinning; unsupported.
    if (node.getSkin()) continue;
    for (const prim of mesh.listPrimitives()) {
      // Skip prims with morph targets; unsupported.
      if (prim.listTargets().length > 0) continue;
      // Skip prims with volumetric materials; unsupported.
      const material = prim.getMaterial();
      if (material && material.getExtension('KHR_materials_volume')) continue;
      compactPrimitive(prim);
      dequantizeTransformableAttributes(prim);
      let key = createPrimGroupKey(prim);
      const isNamed = mesh.getName() || node.getName();
      if (options.keepMeshes || options.keepNamed && isNamed) {
        key += `|${nodeIndex}`;
      }
      if (!(key in groups)) {
        groups[key] = {
          prims: [],
          primMeshes: [],
          primNodes: [],
          dstNode: node,
          dstMesh: undefined
        };
      }
      const group = groups[key];
      group.prims.push(prim);
      group.primNodes.push(node);
    }
  }
  // Discard single-Primitive groups.
  const joinGroups = Object.values(groups).filter(({
    prims
  }) => prims.length > 1);
  // Unlink all affected Meshes at current level, before modifying Primitives.
  const srcNodes = new Set(joinGroups.flatMap(group => group.primNodes));
  for (const node of srcNodes) {
    const mesh = node.getMesh();
    const isSharedMesh = mesh.listParents().some(parent => {
      return parent.propertyType !== ROOT && node !== parent;
    });
    if (isSharedMesh) {
      node.setMesh(mesh.clone());
    }
  }
  // Update Meshes in groups.
  for (const group of joinGroups) {
    const {
      dstNode,
      primNodes
    } = group;
    group.dstMesh = dstNode.getMesh();
    group.primMeshes = primNodes.map(node => node.getMesh());
  }
  // Join Primitives.
  for (const group of joinGroups) {
    const {
      prims,
      primNodes,
      primMeshes,
      dstNode,
      dstMesh
    } = group;
    const dstMatrix = dstNode.getMatrix();
    for (let i = 0; i < prims.length; i++) {
      const primNode = primNodes[i];
      const primMesh = primMeshes[i];
      let prim = prims[i];
      primMesh.removePrimitive(prim);
      // If Primitive is still in use after being removed from the
      // current mesh, above, make a deep copy. Because compactPrimitive()
      // was applied earlier in join(), we know the full vertex streams are
      // used, and no accessors are shared.
      if (isUsed(prim)) {
        prim = prims[i] = _deepClonePrimitive(prims[i]);
      }
      // Transform Primitive into new local coordinate space.
      if (primNode !== dstNode) {
        multiply$2(_matrix, invert$1(_matrix, dstMatrix), primNode.getMatrix());
        transformPrimitive(prim, _matrix);
      }
    }
    const dstPrim = joinPrimitives(prims);
    const dstVertexCount = dstPrim.listAttributes()[0].getCount();
    dstMesh.addPrimitive(dstPrim);
    logger.debug(`${NAME$g}: Joined Primitives (${prims.length}) containing ` + `${formatLong(dstVertexCount)} vertices under Node "${dstNode.getName()}".`);
  }
}
function _deepClonePrimitive(src) {
  // compactPrimitive already applied; no vertices are unused.
  const dst = src.clone();
  for (const semantic of dst.listSemantics()) {
    dst.setAttribute(semantic, dst.getAttribute(semantic).clone());
  }
  const indices = dst.getIndices();
  if (indices) dst.setIndices(indices.clone());
  return dst;
}
/**
 * Dequantize attributes that would be affected by {@link transformPrimitive},
 * to avoid invalidating our primitive group keys.
 *
 * See: https://github.com/donmccurdy/glTF-Transform/issues/844
 */
function dequantizeTransformableAttributes(prim) {
  for (const semantic of ['POSITION', 'NORMAL', 'TANGENT']) {
    const attribute = prim.getAttribute(semantic);
    if (attribute) dequantizeAttribute(attribute);
  }
}
AnimationChannel.TargetPath;
const QUANTIZE_DEFAULTS = {
  pattern: /.*/,
  quantizationVolume: 'mesh',
  quantizePosition: 14,
  quantizeNormal: 10,
  quantizeTexcoord: 12,
  quantizeColor: 8,
  quantizeWeight: 8,
  quantizeGeneric: 12,
  normalizeWeights: true,
  cleanup: true
};

_extends({
  level: 'high'
}, QUANTIZE_DEFAULTS);

var InterpolationInternal;

(function (InterpolationInternal) {
  InterpolationInternal[InterpolationInternal["STEP"] = 0] = "STEP";
  InterpolationInternal[InterpolationInternal["LERP"] = 1] = "LERP";
  InterpolationInternal[InterpolationInternal["SLERP"] = 2] = "SLERP";
})(InterpolationInternal || (InterpolationInternal = {}));
const EPSILON = 0.000001;

/* Implementation */

function resampleDebug(input, output, interpolation, tolerance = 1e-4) {
  const elementSize = output.length / input.length;
  const tmp = new Array(elementSize).fill(0);
  const value = new Array(elementSize).fill(0);
  const valueNext = new Array(elementSize).fill(0);
  const valuePrev = new Array(elementSize).fill(0);
  const lastIndex = input.length - 1;
  let writeIndex = 1;

  for (let i = 1; i < lastIndex; ++i) {
    const timePrev = input[writeIndex - 1];
    const time = input[i];
    const timeNext = input[i + 1];
    const t = (time - timePrev) / (timeNext - timePrev);
    let keep = false; // Remove unnecessary adjacent keyframes.

    if (time !== timeNext && (i !== 1 || time !== input[0])) {
      getElement(output, writeIndex - 1, valuePrev);
      getElement(output, i, value);
      getElement(output, i + 1, valueNext);

      if (interpolation === 'slerp') {
        // Prune keyframes colinear with prev/next keyframes.
        const sample = slerp(tmp, valuePrev, valueNext, t);
        const angle = getAngle(valuePrev, value) + getAngle(value, valueNext);
        keep = !eq(value, sample, tolerance) || angle + Number.EPSILON >= Math.PI;
      } else if (interpolation === 'lerp') {
        // Prune keyframes colinear with prev/next keyframes.
        const sample = vlerp(tmp, valuePrev, valueNext, t);
        keep = !eq(value, sample, tolerance);
      } else if (interpolation === 'step') {
        // Prune keyframes identical to prev/next keyframes.
        keep = !eq(value, valuePrev) || !eq(value, valueNext);
      }
    } // In-place compaction.


    if (keep) {
      if (i !== writeIndex) {
        input[writeIndex] = input[i];
        setElement(output, writeIndex, getElement(output, i, tmp));
      }

      writeIndex++;
    }
  } // Flush last keyframe (compaction looks ahead).


  if (lastIndex > 0) {
    input[writeIndex] = input[lastIndex];
    setElement(output, writeIndex, getElement(output, lastIndex, tmp));
    writeIndex++;
  }

  return writeIndex;
}
/* Utilities */

function getElement(array, index, target) {
  for (let i = 0, elementSize = target.length; i < elementSize; i++) {
    target[i] = array[index * elementSize + i];
  }

  return target;
}

function setElement(array, index, value) {
  for (let i = 0, elementSize = value.length; i < elementSize; i++) {
    array[index * elementSize + i] = value[i];
  }
}

function eq(a, b, tolerance = 0) {
  if (a.length !== b.length) {
    return false;
  }

  for (let i = 0; i < a.length; i++) {
    if (Math.abs(a[i] - b[i]) > tolerance) {
      return false;
    }
  }

  return true;
}

function lerp(v0, v1, t) {
  return v0 * (1 - t) + v1 * t;
}

function vlerp(out, a, b, t) {
  for (let i = 0; i < a.length; i++) out[i] = lerp(a[i], b[i], t);

  return out;
} // From gl-matrix.


function slerp(out, a, b, t) {
  // benchmarks:
  //    http://jsperf.com/quaternion-slerp-implementations
  let ax = a[0],
      ay = a[1],
      az = a[2],
      aw = a[3];
  let bx = b[0],
      by = b[1],
      bz = b[2],
      bw = b[3];
  let omega, cosom, sinom, scale0, scale1; // calc cosine

  cosom = ax * bx + ay * by + az * bz + aw * bw; // adjust signs (if necessary)

  if (cosom < 0.0) {
    cosom = -cosom;
    bx = -bx;
    by = -by;
    bz = -bz;
    bw = -bw;
  } // calculate coefficients


  if (1.0 - cosom > EPSILON) {
    // standard case (slerp)
    omega = Math.acos(cosom);
    sinom = Math.sin(omega);
    scale0 = Math.sin((1.0 - t) * omega) / sinom;
    scale1 = Math.sin(t * omega) / sinom;
  } else {
    // "from" and "to" quaternions are very close
    //  ... so we can do a linear interpolation
    scale0 = 1.0 - t;
    scale1 = t;
  } // calculate final values


  out[0] = scale0 * ax + scale1 * bx;
  out[1] = scale0 * ay + scale1 * by;
  out[2] = scale0 * az + scale1 * bz;
  out[3] = scale0 * aw + scale1 * bw;
  return out;
}

function getAngle(a, b) {
  const dotproduct = dot(a, b);
  return Math.acos(2 * dotproduct * dotproduct - 1);
}

function dot(a, b) {
  return a[0] * b[0] + a[1] * b[1] + a[2] * b[2] + a[3] * b[3];
}
({
  ready: Promise.resolve(),
  resample: resampleDebug,
  tolerance: 1e-4,
  cleanup: true
});
Primitive.Mode;
/** Resampling filter methods. LANCZOS3 is sharper, LANCZOS2 is smoother. */
var TextureResizeFilter;
(function (TextureResizeFilter) {
  /** Lanczos3 (sharp) */
  TextureResizeFilter["LANCZOS3"] = "lanczos3";
  /** Lanczos2 (smooth) */
  TextureResizeFilter["LANCZOS2"] = "lanczos2";
})(TextureResizeFilter || (TextureResizeFilter = {}));
// IMPORTANT: No defaults for quality flags, see https://github.com/donmccurdy/glTF-Transform/issues/969.
({
  resizeFilter: TextureResizeFilter.LANCZOS3,
  pattern: undefined,
  formats: undefined,
  slots: undefined,
  quality: undefined,
  effort: undefined,
  lossless: false,
  nearLossless: false,
  limitInputPixels: true
});

class LoadingManager {
  constructor(onLoad, onProgress, onError) {
    const scope = this;

    let isLoading = false;
    let itemsLoaded = 0;
    let itemsTotal = 0;
    let urlModifier = undefined;
    const handlers = [];

    // Refer to #5689 for the reason why we don't set .onStart
    // in the constructor

    this.onStart = undefined;
    this.onLoad = onLoad;
    this.onProgress = onProgress;
    this.onError = onError;

    this.itemStart = function (url) {
      itemsTotal++;

      if (isLoading === false) {
        if (scope.onStart !== undefined) {
          scope.onStart(url, itemsLoaded, itemsTotal);
        }
      }

      isLoading = true;
    };

    this.itemEnd = function (url) {
      itemsLoaded++;

      if (scope.onProgress !== undefined) {
        scope.onProgress(url, itemsLoaded, itemsTotal);
      }

      if (itemsLoaded === itemsTotal) {
        isLoading = false;

        if (scope.onLoad !== undefined) {
          scope.onLoad();
        }
      }
    };

    this.itemError = function (url) {
      if (scope.onError !== undefined) {
        scope.onError(url);
      }
    };

    this.resolveURL = function (url) {
      if (urlModifier) {
        return urlModifier(url);
      }

      return url;
    };

    this.setURLModifier = function (transform) {
      urlModifier = transform;

      return this;
    };

    this.addHandler = function (regex, loader) {
      handlers.push(regex, loader);

      return this;
    };

    this.removeHandler = function (regex) {
      const index = handlers.indexOf(regex);

      if (index !== -1) {
        handlers.splice(index, 2);
      }

      return this;
    };

    this.getHandler = function (file) {
      for (let i = 0, l = handlers.length; i < l; i += 2) {
        const regex = handlers[i];
        const loader = handlers[i + 1];

        if (regex.global) regex.lastIndex = 0; // see #17920

        if (regex.test(file)) {
          return loader;
        }
      }

      return null;
    };
  }
}

const DefaultLoadingManager = /*@__PURE__*/ new LoadingManager();

class Loader {

	constructor( manager ) {

		this.manager = ( manager !== undefined ) ? manager : DefaultLoadingManager;

		this.crossOrigin = 'anonymous';
		this.withCredentials = false;
		this.path = '';
		this.resourcePath = '';
		this.requestHeader = {};

	}

	load( /* url, onLoad, onProgress, onError */ ) {}

	loadAsync( url, onProgress ) {

		const scope = this;

		return new Promise( function ( resolve, reject ) {

			scope.load( url, resolve, onProgress, reject );

		} );

	}

	parse( /* data */ ) {}

	setCrossOrigin( crossOrigin ) {

		this.crossOrigin = crossOrigin;
		return this;

	}

	setWithCredentials( value ) {

		this.withCredentials = value;
		return this;

	}

	setPath( path ) {

		this.path = path;
		return this;

	}

	setResourcePath( resourcePath ) {

		this.resourcePath = resourcePath;
		return this;

	}

	setRequestHeader( requestHeader ) {

		this.requestHeader = requestHeader;
		return this;

	}

}

Loader.DEFAULT_MATERIAL_NAME = '__DEFAULT';

const loading = {};

class HttpError extends Error {
  constructor(message, response) {
    super(message);
    this.response = response;
  }
}

class FileLoader extends Loader {
  constructor(manager) {
    super(manager);
  }

  load(url, onLoad, onProgress, onError) {
    if (url === undefined) url = "";

    if (this.path !== undefined) url = this.path + url;

    url = this.manager.resolveURL(url);

    // Check if request is duplicate

    if (loading[url] !== undefined) {
      loading[url].push({
        onLoad: onLoad,
        onProgress: onProgress,
        onError: onError,
      });

      return;
    }

    // Initialise array for duplicate requests
    loading[url] = [];

    loading[url].push({
      onLoad: onLoad,
      onProgress: onProgress,
      onError: onError,
    });

    // create request
    const req = new Request(url, {
      headers: new Headers(this.requestHeader),
      credentials: this.withCredentials ? "include" : "same-origin",
      // An abort controller could be added within a future PR
    });

    // record states ( avoid data race )
    const mimeType = this.mimeType;
    const responseType = this.responseType;

    // start the fetch
    fetch(req)
      .then((response) => {
        if (response.status === 200 || response.status === 0) {
          // Some browsers return HTTP Status 0 when using non-http protocol
          // e.g. 'file://' or 'data://'. Handle as success.

          if (response.status === 0) {
            console.warn("THREE.FileLoader: HTTP Status 0 received.");
          }

          // Workaround: Checking if response.body === undefined for Alipay browser #23548

          if (
            typeof ReadableStream === "undefined" ||
            response.body === undefined ||
            response.body.getReader === undefined
          ) {
            return response;
          }

          const callbacks = loading[url];
          const reader = response.body.getReader();

          // Nginx needs X-File-Size check
          // https://serverfault.com/questions/482875/why-does-nginx-remove-content-length-header-for-chunked-content
          const contentLength =
            response.headers.get("Content-Length") ||
            response.headers.get("X-File-Size");
          const total = contentLength ? parseInt(contentLength) : 0;
          const lengthComputable = total !== 0;
          let loaded = 0;

          // periodically read data into the new stream tracking while download progress
          const stream = new ReadableStream({
            start(controller) {
              readData();

              function readData() {
                reader.read().then(({ done, value }) => {
                  if (done) {
                    controller.close();
                  } else {
                    loaded += value.byteLength;

                    const event = new ProgressEvent("progress", {
                      lengthComputable,
                      loaded,
                      total,
                    });
                    for (let i = 0, il = callbacks.length; i < il; i++) {
                      const callback = callbacks[i];
                      if (callback.onProgress) callback.onProgress(event);
                    }

                    controller.enqueue(value);
                    readData();
                  }
                });
              }
            },
          });

          return new Response(stream);
        } else {
          throw new HttpError(
            `fetch for "${response.url}" responded with ${response.status}: ${response.statusText}`,
            response
          );
        }
      })
      .then((response) => {
        switch (responseType) {
          case "arraybuffer":
            return response.arrayBuffer();

          case "blob":
            return response.blob();

          case "document":
            return response.text().then((text) => {
              const parser = new DOMParser();
              return parser.parseFromString(text, mimeType);
            });

          case "json":
            return response.json();

          default:
            if (mimeType === undefined) {
              return response.text();
            } else {
              // sniff encoding
              const re = /charset="?([^;"\s]*)"?/i;
              const exec = re.exec(mimeType);
              const label = exec && exec[1] ? exec[1].toLowerCase() : undefined;
              const decoder = new TextDecoder(label);
              return response.arrayBuffer().then((ab) => decoder.decode(ab));
            }
        }
      })
      .then((data) => {
        // Add to cache only on HTTP success, so that we do not cache
        // error response bodies as proper responses to requests.

        const callbacks = loading[url];
        delete loading[url];

        for (let i = 0, il = callbacks.length; i < il; i++) {
          const callback = callbacks[i];
          if (callback.onLoad) callback.onLoad(data);
        }
      })
      .catch((err) => {
        // Abort errors and other errors are handled the same

        const callbacks = loading[url];

        if (callbacks === undefined) {
          // When onLoad was called and url was deleted in `loading`
          this.manager.itemError(url);
          throw err;
        }

        delete loading[url];

        for (let i = 0, il = callbacks.length; i < il; i++) {
          const callback = callbacks[i];
          if (callback.onError) callback.onError(err);
        }

        this.manager.itemError(url);
      })
      .finally(() => {
        this.manager.itemEnd(url);
      });

    this.manager.itemStart(url);
  }

  setResponseType(value) {
    this.responseType = value;
    return this;
  }

  setMimeType(value) {
    this.mimeType = value;
    return this;
  }
}

function DRACOWorker() {
  let decoderConfig;
  let decoderPending;

  onmessage = function (e) {
    const message = e.data;

    switch (message.type) {
      case "init":
        decoderConfig = message.decoderConfig;
        decoderPending = new Promise(function (resolve /*, reject*/) {
          decoderConfig.onModuleLoaded = function (draco) {
            // Module is Promise-like. Wrap before resolving to avoid loop.
            resolve({ draco: draco });
          };

          DracoDecoderModule(decoderConfig); // eslint-disable-line no-undef
        });
        break;

      case "decode":
        const buffer = message.buffer;
        const taskConfig = message.taskConfig;
        decoderPending.then((module) => {
          const draco = module.draco;
          const decoder = new draco.Decoder();

          try {
            const geometry = decodeGeometry(
              draco,
              decoder,
              new Int8Array(buffer),
              taskConfig
            );

            const buffers = geometry.attributes.map(
              (attr) => attr.array.buffer
            );

            if (geometry.index) buffers.push(geometry.index.array.buffer);

            self.postMessage(
              { type: "decode", id: message.id, geometry },
              buffers
            );
          } catch (error) {
            console.error(error);

            self.postMessage({
              type: "error",
              id: message.id,
              error: error.message,
            });
          } finally {
            draco.destroy(decoder);
          }
        });
        break;
    }
  };

  function decodeGeometry(draco, decoder, array, taskConfig) {
    const attributeIDs = taskConfig.attributeIDs;
    const attributeTypes = taskConfig.attributeTypes;

    let dracoGeometry;
    let decodingStatus;

    const geometryType = decoder.GetEncodedGeometryType(array);

    if (geometryType === draco.TRIANGULAR_MESH) {
      dracoGeometry = new draco.Mesh();
      decodingStatus = decoder.DecodeArrayToMesh(
        array,
        array.byteLength,
        dracoGeometry
      );
    } else if (geometryType === draco.POINT_CLOUD) {
      dracoGeometry = new draco.PointCloud();
      decodingStatus = decoder.DecodeArrayToPointCloud(
        array,
        array.byteLength,
        dracoGeometry
      );
    } else {
      throw new Error("THREE.DRACOLoader: Unexpected geometry type.");
    }

    if (!decodingStatus.ok() || dracoGeometry.ptr === 0) {
      throw new Error(
        "THREE.DRACOLoader: Decoding failed: " + decodingStatus.error_msg()
      );
    }

    const geometry = { index: null, attributes: [] };

    // Gather all vertex attributes.
    for (const attributeName in attributeIDs) {
      const attributeType = self[attributeTypes[attributeName]];

      let attribute;
      let attributeID;

      // A Draco file may be created with default vertex attributes, whose attribute IDs
      // are mapped 1:1 from their semantic name (POSITION, NORMAL, ...). Alternatively,
      // a Draco file may contain a custom set of attributes, identified by known unique
      // IDs. glTF files always do the latter, and `.drc` files typically do the former.
      if (taskConfig.useUniqueIDs) {
        attributeID = attributeIDs[attributeName];
        attribute = decoder.GetAttributeByUniqueId(dracoGeometry, attributeID);
      } else {
        attributeID = decoder.GetAttributeId(
          dracoGeometry,
          draco[attributeIDs[attributeName]]
        );

        if (attributeID === -1) continue;

        attribute = decoder.GetAttribute(dracoGeometry, attributeID);
      }

      const attributeResult = decodeAttribute(
        draco,
        decoder,
        dracoGeometry,
        attributeName,
        attributeType,
        attribute
      );

      if (attributeName === "color") {
        attributeResult.vertexColorSpace = taskConfig.vertexColorSpace;
      }

      geometry.attributes.push(attributeResult);
    }

    // Add index.
    if (geometryType === draco.TRIANGULAR_MESH) {
      geometry.index = decodeIndex(draco, decoder, dracoGeometry);
    }

    draco.destroy(dracoGeometry);

    return geometry;
  }

  function decodeIndex(draco, decoder, dracoGeometry) {
    const numFaces = dracoGeometry.num_faces();
    const numIndices = numFaces * 3;
    const byteLength = numIndices * 4;

    const ptr = draco._malloc(byteLength);
    decoder.GetTrianglesUInt32Array(dracoGeometry, byteLength, ptr);
    const index = new Uint32Array(
      draco.HEAPF32.buffer,
      ptr,
      numIndices
    ).slice();
    draco._free(ptr);

    return { array: index, itemSize: 1 };
  }

  function decodeAttribute(
    draco,
    decoder,
    dracoGeometry,
    attributeName,
    attributeType,
    attribute
  ) {
    const numComponents = attribute.num_components();
    const numPoints = dracoGeometry.num_points();
    const numValues = numPoints * numComponents;
    const byteLength = numValues * attributeType.BYTES_PER_ELEMENT;
    const dataType = getDracoDataType(draco, attributeType);

    const ptr = draco._malloc(byteLength);
    decoder.GetAttributeDataArrayForAllPoints(
      dracoGeometry,
      attribute,
      dataType,
      byteLength,
      ptr
    );
    const array = new attributeType(
      draco.HEAPF32.buffer,
      ptr,
      numValues
    ).slice();
    draco._free(ptr);

    return {
      name: attributeName,
      array: array,
      itemSize: numComponents,
    };
  }

  function getDracoDataType(draco, attributeType) {
    switch (attributeType) {
      case Float32Array:
        return draco.DT_FLOAT32;
      case Int8Array:
        return draco.DT_INT8;
      case Int16Array:
        return draco.DT_INT16;
      case Int32Array:
        return draco.DT_INT32;
      case Uint8Array:
        return draco.DT_UINT8;
      case Uint16Array:
        return draco.DT_UINT16;
      case Uint32Array:
        return draco.DT_UINT32;
    }
  }
}

class DRACOLoader2 extends Loader {
    constructor() {
        super();
        this.decoderConfig = { type: "wasm" };
        this.encoderPending = null;
        this.encoderConfig = { type: "wasm" };
        this.decoderPath = "";
        this.workerSourceURL = "";
        this.decoderPending = null;
        this.setDecoderPath(DRACOLoader2.DRACO_LIBRARY_PATH);
        // this.setDecoderConfig({ type: "js" }); // todo: hack for now, encoder works with wasm, maybe not decoder.
    }
    setDecoderPath(path) {
        this.decoderPath = path;
        return this;
    }
    preload(decoder = true, encoder = false) {
        if (decoder)
            this._initDecoder();
        if (encoder)
            this.initEncoder();
        return this;
    }
    setDecoderConfig(config) {
        this.decoderConfig = config;
        return this;
    }
    _loadLibrary(url, responseType) {
        const loader = new FileLoader();
        loader.setPath(this.decoderPath);
        loader.setResponseType(responseType);
        loader.setWithCredentials(this.withCredentials);
        return new Promise((resolve, reject) => {
            loader.load(url, resolve, undefined, reject);
        });
    }
    async initEncoder() {
        if (this.encoderPending)
            return this.encoderPending;
        const useJS = typeof WebAssembly !== "object" || this.encoderConfig.type === "js";
        const librariesPending = [];
        if (useJS) {
            librariesPending.push(this._loadLibrary("draco_encoder.js", "text"));
        }
        else {
            // todo: not tested
            librariesPending.push(this._loadLibrary("draco_wasm_wrapper.js", "text"));
            librariesPending.push(this._loadLibrary("draco_encoder.wasm", "arraybuffer"));
        }
        this.encoderPending = Promise.all(librariesPending).then((libraries) => {
            const jsContent = libraries[0];
            if (!useJS) {
                this.encoderConfig.wasmBinary = libraries[1];
            }
            const eval2 = eval;
            return eval2(jsContent + "\nDracoEncoderModule;")?.();
        });
        return this.encoderPending;
    }
    _initDecoder() {
        if (this.decoderPending)
            return this.decoderPending;
        const useJS = typeof WebAssembly !== "object" || this.decoderConfig.type === "js";
        const librariesPending = [];
        if (useJS) {
            librariesPending.push(this._loadLibrary("draco_decoder.js", "text"));
        }
        else {
            librariesPending.push(this._loadLibrary("draco_wasm_wrapper.js", "text"));
            librariesPending.push(this._loadLibrary("draco_decoder.wasm", "arraybuffer"));
        }
        this.decoderPending = Promise.all(librariesPending).then((libraries) => {
            const jsContent = libraries[0];
            if (!useJS) {
                this.decoderConfig.wasmBinary = libraries[1];
            }
            const fn = DRACOWorker.toString();
            const body = [
                "/* draco decoder */",
                jsContent,
                "",
                "/* worker */",
                fn.substring(fn.indexOf("{") + 1, fn.lastIndexOf("}")),
            ].join("\n");
            this.workerSourceURL = URL.createObjectURL(new Blob([body]));
        });
        return this.decoderPending;
    }
    async initDecoder() {
        await this._initDecoder();
        const jsContent = await fetch(this.workerSourceURL)
            .then(async (response) => response.text())
            .then((text) => {
            const i = text.indexOf("/* worker */");
            if (i < 1)
                throw new Error("unable to load decoder module");
            return text.substring(0, i - 1);
        });
        const eval2 = eval;
        return eval2(jsContent + "\nDracoDecoderModule;")?.();
    }
}
DRACOLoader2.DRACO_LIBRARY_PATH = "./libs/";

async function processModel(data, dracoPath) {
    let loader = new DRACOLoader2();
    loader.decoderConfig = {
        type: "js",
    };
    loader.encoderConfig = {
        type: "js",
    };
    loader.setDecoderPath(dracoPath);
    let encoder = await loader.initEncoder();
    let decoder = await loader.initDecoder();
    // loader.preload(true, true);
    const io = new WebIO()
        .registerExtensions([...KHRONOS_EXTENSIONS, EXTTextureWebP, EXTTextureAVIF, EXTMeshGPUInstancing])
        .registerDependencies({
        "draco3d.encoder": encoder,
        "draco3d.decoder": decoder,
    });
    const document = await io.readBinary(new Uint8Array(data)); // read GLB from ArrayBuffer
    await document.transform(weld(), dedup({ propertyTypes: [PropertyType.MATERIAL] }),  flatten(), join({ keepNamed: false }));
    const array = await io.writeBinary(document); // write GLB to ArrayBuffer
    // debugger;
    return array.buffer;
}
 