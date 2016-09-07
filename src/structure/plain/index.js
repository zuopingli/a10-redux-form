import splice from './splice'
import getIn from './getIn'
import setIn from './setIn'
import deepEqual from './deepEqual'
import deleteIn from './deleteIn'
import { some, merge } from 'lodash'

const structure = {
  empty: {},
  emptyList: [],
  getIn,
  setIn,
  deepEqual,
  deleteIn,
  fromJS: value => value,
  merge, 
  toJS: value => value, 
  size: array => array ? array.length : 0,
  some,
  splice
}

export default structure
