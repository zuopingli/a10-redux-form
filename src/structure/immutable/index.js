import { Map, Iterable, List, fromJS } from 'immutable'
import { toPath } from 'lodash'
import deepEqual from './deepEqual'
import splice from './splice'
import plainGetIn from '../plain/getIn'

const structure = {
  empty: Map(),
  emptyList: List(),
  getIn: (state, field) =>
    Map.isMap(state) || List.isList(state) ? state.getIn(toPath(field)) : plainGetIn(state, field),
  setIn: (state, field, value) => state.setIn(toPath(field), value),
  deepEqual,
  deleteIn: (state, field) => state.deleteIn(toPath(field)),
  forIn: (state, callback) => state.forEach(callback),
  fromJS: jsValue => fromJS(jsValue, (key, value) =>
    Iterable.isIndexed(value) ? value.toList() : value.toMap()),
  merge: (object1, object2) => object1.mergeDeep(object2),
  toJS: jsValue => jsValue ? jsValue.toJS() : jsValue,
  size: list => list ? list.size : 0,
  some: (iterable, callback) => Iterable.isIterable(iterable) ? iterable.some(callback) : false,
  splice
}

export default structure
