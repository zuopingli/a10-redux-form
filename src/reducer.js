import {
  ARRAY_INSERT,
  ARRAY_MOVE,
  ARRAY_POP,
  ARRAY_PUSH,
  ARRAY_REMOVE,
  ARRAY_REMOVE_ALL,
  ARRAY_SHIFT,
  ARRAY_SPLICE,
  ARRAY_SWAP,
  ARRAY_UNSHIFT,
  AUTOFILL,
  BLUR,
  CHANGE,
  DESTROY,
  FOCUS,
  INITIALIZE,
  REGISTER_CONDITIONAL,
  REGISTER_FIELD,
  REGISTER_VALIDATION,
  RESET,
  SET_SUBMIT_FAILED,
  SET_SUBMIT_SUCCEEDED,
  START_ASYNC_VALIDATION,
  START_SUBMIT,
  STOP_ASYNC_VALIDATION,
  STOP_SUBMIT,
  TOUCH,
  UNREGISTER_FIELD,
  UNTOUCH,
  UPDATE_SYNC_ERRORS
} from './actionTypes'
import 'array-findindex-polyfill'
import createDeleteInWithCleanUp from './deleteInWithCleanUp'
import { formatCondName, unformatCondName } from './util/formatConditionalName'
import * as validators from './validators'
import { merge } from 'lodash'

const createReducer = structure => {
  const {
    deepEqual,
    empty,
    getIn,
    setIn,
    deleteIn,
    forIn,
    fromJS,
    toJS,
    size,
    some,
    splice
  } = structure
  const deleteInWithCleanUp = createDeleteInWithCleanUp(structure)
  const doSplice = (state, key, field, index, removeNum, value, force) => {
    const existing = getIn(state, `${key}.${field}`)
    return existing || force ?
      setIn(state, `${key}.${field}`, splice(existing, index, removeNum, value)) :
      state
  }
  const rootKeys = [ 'values', 'fields', 'submitErrors', 'asyncErrors' ]
  const arraySplice = (state, field, index, removeNum, value) => {
    let result = state
    const nonValuesValue = value != null ? empty : undefined
    result = doSplice(result, 'values', field, index, removeNum, value, true)
    result = doSplice(result, 'fields', field, index, removeNum, nonValuesValue)
    result = doSplice(result, 'submitErrors', field, index, removeNum, nonValuesValue)
    result = doSplice(result, 'asyncErrors', field, index, removeNum, nonValuesValue)
    return result
  }

  const validate = (result, field) => {
    const formatedName = formatCondName(field)
    const value = getIn(result, `values.${field}`)

    const validations = getIn(result, `validations.${formatedName}`)
    let syncErrors = fromJS(getIn(result, 'syncErrors') || {})
    // use field validations
    if (validations) {
      syncErrors = deleteInWithCleanUp(syncErrors, field)
      forIn(fromJS(validations), (val) => {
        if (!getIn(syncErrors, field)) {
          const func = getIn(val, 'func')
          const msg = getIn(val, 'msg')
          const retMsg = func(value)
          const finalMsg = retMsg && msg ? msg : retMsg

          if (finalMsg) {
            syncErrors = setIn(syncErrors, field, finalMsg)
          }
        }
      })
    }
    return setIn(result, 'syncErrors', toJS(syncErrors))
  }

  const clearSyncError = (result, field) => {
    let syncErrors = fromJS(getIn(result, 'syncErrors'))
    syncErrors = deleteInWithCleanUp(syncErrors, field)

    result = setIn(result, 'syncErrors', toJS(syncErrors))
    return result
  }

  const registerConditional = (state, name, conditional, cachedValue) => {
    let result = state
    const fieldName = formatCondName(name)

    // conditional set and get attribute visible 
    const getElementValue = (name) => {
      const formState = state
      // const initial = getIn(formState, `initial.${name}`)
      const value = getIn(formState, `values.${name}`)
      return value
    } 

    // conditional format {key:value} or {dependOn: key, dependValue: value} or "key" only to treat
    // value as not empty
    // finally we will parse conditional as that
    const parseConditional = (conditional) => {
      let result = { dependOn: undefined, dependValue: false }
      if (typeof conditional === 'string') {
        // only a key with not empty value
        result = { dependOn: conditional, dependValue: (dependValue) => !!dependValue }
      } else {
        if (conditional && typeof conditional == 'object') {
          if (!conditional.dependOn) {
            // key:value pair
            const firstEntryKey = Object.keys(conditional)[0]
            result = { dependOn: firstEntryKey, dependValue: conditional[firstEntryKey] }
          } else {
            result = conditional
          }
        }
      }
      return fromJS(result)
    }

    const parsedCond = parseConditional(conditional)
    const registeredCondition = getIn(result, `conditions.${fieldName}`)
    if (conditional !== undefined && deepEqual(registeredCondition, parsedCond)) {
      return state
    }

    let isVisible = true               
    if (conditional) {
      const depName = getIn(parsedCond, 'dependOn')
      const depValue = getIn(parsedCond, 'dependValue')
      const depOnObjVisible = getIn(state, `conditions.${formatCondName(depName)}.visible`)
      if (depOnObjVisible) {
        const conditionalObjValue = getElementValue(depName)

        if (typeof depValue == 'function') {
          isVisible = isVisible && depValue.call(null, conditionalObjValue, result)
        } else {
          isVisible = isVisible && depValue === conditionalObjValue
        }
      } else {
        isVisible = false
      }
    }

    const mapData = fromJS({ visible: isVisible, cachedValue: cachedValue, ...toJS(parsedCond) })
    // for iterating, we changed name 
    result = setIn(result, `conditions.${fieldName}`, mapData)

    if (!isVisible) {
      result = deleteInWithCleanUp(result, `values.${name}`)
      result = clearSyncError(result, name)
    } else {
      result = validate(result, name)
    }

    return result
  }

  const behaviors = {
    [ARRAY_INSERT](state, { meta: { field, index }, payload }) {
      return arraySplice(state, field, index, 0, payload)
    },
    [ARRAY_MOVE](state, { meta: { field, from, to } }) {
      const array = getIn(state, `values.${field}`)
      const length = array ? size(array) : 0
      let result = state
      if (length) {
        rootKeys.forEach(key => {
          const path = `${key}.${field}`
          if (getIn(result, path)) {
            const value = getIn(result, `${path}[${from}]`)
            result = setIn(result, path, splice(getIn(result, path), from, 1))      // remove
            result = setIn(result, path, splice(getIn(result, path), to, 0, value)) // insert
          }
        })
      }
      return result
    },
    [ARRAY_POP](state, { meta: { field } }) {
      const array = getIn(state, `values.${field}`)
      const length = array ? size(array) : 0
      return length ? arraySplice(state, field, length - 1, 1) : state
    },
    [ARRAY_PUSH](state, { meta: { field }, payload }) {
      const array = getIn(state, `values.${field}`)
      const length = array ? size(array) : 0
      return arraySplice(state, field, length, 0, payload)
    },
    [ARRAY_REMOVE](state, { meta: { field, index } }) {
      return arraySplice(state, field, index, 1)
    },
    [ARRAY_REMOVE_ALL](state, { meta: { field } }) {
      const array = getIn(state, `values.${field}`)
      const length = array ? size(array) : 0
      return length ? arraySplice(state, field, 0, length) : state
    },
    [ARRAY_SHIFT](state, { meta: { field } }) {
      return arraySplice(state, field, 0, 1)
    },
    [ARRAY_SPLICE](state, { meta: { field, index, removeNum }, payload }) {
      return arraySplice(state, field, index, removeNum, payload)
    },
    [ARRAY_SWAP](state, { meta: { field, indexA, indexB } }) {
      let result = state
      rootKeys.forEach(key => {
        const valueA = getIn(result, `${key}.${field}[${indexA}]`)
        const valueB = getIn(result, `${key}.${field}[${indexB}]`)
        if (valueA !== undefined || valueB !== undefined) {
          result = setIn(result, `${key}.${field}[${indexA}]`, valueB)
          result = setIn(result, `${key}.${field}[${indexB}]`, valueA)
        }
      })
      return result
    },
    [ARRAY_UNSHIFT](state, { meta: { field }, payload }) {
      return arraySplice(state, field, 0, 0, payload)
    },
    [AUTOFILL](state, { meta: { field }, payload }) {
      let result = state
      result = deleteInWithCleanUp(result, `asyncErrors.${field}`)
      result = deleteInWithCleanUp(result, `submitErrors.${field}`)
      result = setIn(result, `fields.${field}.autofilled`, true)
      result = setIn(result, `values.${field}`, payload)
      return result
    },
    [BLUR](state, { meta: { field, touch }, payload }) {
      let result = state
      const initial = getIn(result, `initial.${field}`)
      if (initial === undefined && payload === '') {
        result = deleteInWithCleanUp(result, `values.${field}`)
      } else if (payload !== undefined) {
        result = setIn(result, `values.${field}`, payload)
      }
      if (field === getIn(result, 'active')) {
        result = deleteIn(result, 'active')
      }
      result = deleteIn(result, `fields.${field}.active`)
      if (touch) {
        result = setIn(result, `fields.${field}.touched`, true)
        result = setIn(result, 'anyTouched', true)
      }

      // result = validate(result, field)
      return result
    },
    [CHANGE](state, { meta: { field, touch }, payload }) {
      let result = state
      const formatedName = formatCondName(field)
      const initial = getIn(result, `initial.${field}`)
      if (initial === undefined && payload === '') {
        result = deleteInWithCleanUp(result, `values.${field}`)
      } else if (payload !== undefined) {
        result = setIn(result, `values.${field}`, payload)
      }
      result = setIn(result, `conditions.${formatedName}.cachedValue`, payload)
      result = deleteInWithCleanUp(result, `asyncErrors.${field}`)
      result = deleteInWithCleanUp(result, `submitErrors.${field}`)
      result = deleteInWithCleanUp(result, `fields.${field}.autofilled`)
      result = deleteInWithCleanUp(result, 'error')
      if (touch) {
        result = setIn(result, `fields.${field}.touched`, true)
        result = setIn(result, 'anyTouched', true)
      }

      // Search all conditional which depends on this field and update visible
      const conditions = getIn(result, 'conditions')
      const setVisible = (conditions, parentFieldName, parentIsVisible) => {
        forIn(conditions, (elementValue, formatedElementName) => {
          const elementName = unformatCondName(formatedElementName)          
          const dependOn = getIn(conditions, `${formatedElementName}.dependOn`)
          const dependValue = getIn(conditions, `${formatedElementName}.dependValue`)

          // only find those field name depend on current changing field name          
          if (dependOn === parentFieldName) {
            const elementValue = getIn(result, `values.${parentFieldName}`)
            let isNewVisible = parentIsVisible
            if (typeof dependValue == 'function') {
              isNewVisible = isNewVisible && dependValue.call(null, elementValue, result)
            } else {
              isNewVisible = isNewVisible && deepEqual(dependValue, elementValue)
            }
            result = setIn(result, `conditions.${formatedElementName}.visible`, isNewVisible )
            if (!isNewVisible) {             
              result = deleteInWithCleanUp(result, `values.${elementName}`)
              result = clearSyncError(result, elementName)
            } else {
              const cachedValue = getIn(result, `conditions.${formatedElementName}.cachedValue`)
              result = setIn(result, `values.${elementName}`, cachedValue)
              result = validate(result, elementName)
            }
            // find it's child and also set invisible
            setVisible(conditions, elementName, isNewVisible)
            return true
          }
        })
      }

      setVisible(conditions, field, getIn(result, `conditions.${formatedName}.visible`))
      result = validate(result, field)

      return result
    },
    [FOCUS](state, { meta: { field } }) {
      let result = state
      const previouslyActive = getIn(state, 'active')
      result = deleteIn(result, `fields.${previouslyActive}.active`)
      result = setIn(result, `fields.${field}.visited`, true)
      result = setIn(result, `fields.${field}.active`, true)
      result = setIn(result, 'active', field)
      return result
    },
    [INITIALIZE](state, { payload, meta: { keepDirty } }) {
      const mapData = fromJS(payload)
      let result = empty // clean all field state
      const registeredFields = getIn(state, 'registeredFields')
      if (registeredFields) {
        result = setIn(result, 'registeredFields', registeredFields)
      }
      const registeredConditions = getIn(state, 'conditions')
      if (registeredConditions) {
        result = setIn(result, 'conditions', registeredConditions)
      }
      const registeredValidations = getIn(state, 'validations')
      if (registeredValidations) {
        result = setIn(result, 'validations', registeredValidations)
      }
      let newValues = mapData
      if (keepDirty && registeredFields) {
        //
        // Keep the value of dirty fields while updating the value of
        // pristine fields. This way, apps can reinitialize forms while
        // avoiding stomping on user edits.
        //
        // Note 1: The initialize action replaces all initial values
        // regardless of keepDirty.
        //
        // Note 2: When a field is dirty, keepDirty is enabled, and the field
        // value is the same as the new initial value for the field, the
        // initialize action causes the field to become pristine. That effect
        // is what we want.
        //
        const previousValues = getIn(state, 'values')
        const previousInitialValues = getIn(state, 'initial')
        registeredFields.forEach(field => {
          const name = field.name
          const previousInitialValue = getIn(previousInitialValues, name)
          const previousValue = getIn(previousValues, name)
          if (!deepEqual(previousValue, previousInitialValue)) {
            // This field was dirty. Restore the dirty value.
            newValues = setIn(newValues, name, previousValue)
          }
        })
      }
      result = setIn(result, 'values', newValues)
      result = setIn(result, 'initial', mapData)
      return result
    },
    [REGISTER_CONDITIONAL](state, { payload: { name, conditional } }) {
      const initialValue = getIn(state, `values.${name}`)
      return registerConditional(state, name, conditional, initialValue)
    },
    [REGISTER_FIELD](state, { payload: { name, type } }) {
      let result = state
      const registeredFields = getIn(result, 'registeredFields')
      if (some(registeredFields, (field) => getIn(field, 'name') === name)) {
        return state
      }

      const mapData = fromJS({ name, type })
      result = setIn(state, 'registeredFields', splice(registeredFields, size(registeredFields), 0, mapData))
      return result
    },    
    [REGISTER_VALIDATION](state, { payload: { name, validation } }) {
      let result = state
      let validator = []
      // validations format
      if (validation && typeof validation === 'object') {
        forIn(validation, (v) => {
          let funcStr = '', func = null
          if (typeof v === 'string') {
            funcStr = v
          } else {
            funcStr = v.func
          }

          if (funcStr) {
            if (typeof funcStr === 'string') {
              if (validators[funcStr]) {
                func = validators[funcStr]
              } else {
                func = validators['foo']
              }
            } else {
              func = funcStr
            }
          } else {
            func = validators['foo']
          }

          validator.push({ func: func, msg: v.msg })
        })        
      } 

      const formatedName = formatCondName(name)
      if (validation) {
        result = setIn(result, `validations.${formatedName}`, fromJS(validator))
      } else {
        result = deleteInWithCleanUp(result, `validations.${formatedName}`)
      }

      // result = validate(result, name)
      return result
    },
    [RESET](state) {      
      let result = empty
      const registeredFields = getIn(state, 'registeredFields')
      if (registeredFields) {
        result = setIn(result, 'registeredFields', registeredFields)
      }
      const values = getIn(state, 'initial')
      if (values) {
        result = setIn(result, 'values', values)
        result = setIn(result, 'initial', values)
      }

      // initial all conditions
      const conditions = toJS(getIn(state, 'conditions'))
      for (let fieldName in conditions) {
        const initialValue = getIn(result, `values.${fieldName}`)
        if (conditions[fieldName].conditional === undefined) {
          const mapData = fromJS({ conditional: getIn(state, `conditions.${fieldName}.conditional`), visible: true, cachedValue: initialValue })
          result = setIn(result, `conditions.${fieldName}`, mapData)
          // setVisible(conditions, fieldName, true)          
        } else {
          result = registerConditional(result, fieldName, getIn(state, `conditions.${fieldName}.conditional`), initialValue)
        }
      }

      return result
    },
    [START_ASYNC_VALIDATION](state, { meta: { field } }) {
      return setIn(state, 'asyncValidating', field || true)
    },
    [START_SUBMIT](state) {
      return setIn(state, 'submitting', true)
    },
    [STOP_ASYNC_VALIDATION](state, { payload }) {
      let result = state
      result = deleteIn(result, 'asyncValidating')
      if (payload && Object.keys(payload).length) {
        const { _error, ...fieldErrors } = payload
        if (_error) {
          result = setIn(result, 'error', _error)
        }
        if (Object.keys(fieldErrors).length) {
          result = setIn(result, 'asyncErrors', fromJS(fieldErrors))
        } else {
          result = deleteIn(result, 'asyncErrors')
        }
      } else {
        result = deleteIn(result, 'error')
        result = deleteIn(result, 'asyncErrors')
      }
      return result
    },
    [STOP_SUBMIT](state, { payload }) {
      let result = state
      result = deleteIn(result, 'submitting')
      result = deleteIn(result, 'submitFailed')
      result = deleteIn(result, 'submitSucceeded')
      if (payload && Object.keys(payload).length) {
        const { _error, ...fieldErrors } = payload
        if (_error) {
          result = setIn(result, 'error', _error)
        }
        if (Object.keys(fieldErrors).length) {
          result = setIn(result, 'submitErrors', fromJS(fieldErrors))
        } else {
          result = deleteIn(result, 'submitErrors')
        }
        result = setIn(result, 'submitFailed', true)
      } else {
        result = setIn(result, 'submitSucceeded', true)
        result = deleteIn(result, 'error')
        result = deleteIn(result, 'submitErrors')
      }
      return result
    },
    [SET_SUBMIT_FAILED](state, { meta: { fields } }) {
      let result = state
      result = setIn(result, 'submitFailed', true)
      result = deleteIn(result, 'submitSucceeded')
      result = deleteIn(result, 'submitting')
      fields.forEach(field => result = setIn(result, `fields.${field}.touched`, true))
      if (fields.length) {
        result = setIn(result, 'anyTouched', true)
      }
      return result
    },
    [SET_SUBMIT_SUCCEEDED](state) {
      let result = state
      result = deleteIn(result, 'submitFailed')
      result = setIn(result, 'submitSucceeded', true)
      result = deleteIn(result, 'submitting')
      return result
    },
    [TOUCH](state, { meta: { fields } }) {
      let result = state
      fields.forEach(field => result = setIn(result, `fields.${field}.touched`, true))
      result = setIn(result, 'anyTouched', true)
      return result
    },
    [UNREGISTER_FIELD](state, { payload: { name } }) {
      const registeredFields = getIn(state, 'registeredFields')

      // in case the form was destroyed and registeredFields no longer exists
      if (!registeredFields) {
        return state
      }

      const fieldIndex = registeredFields.findIndex((value) => {
        return getIn(value, 'name') === name
      })
      if (size(registeredFields) <= 1 && fieldIndex >= 0) {
        return deleteInWithCleanUp(state, 'registeredFields')
      }
      if (fieldIndex < 0) {
        return state
      }
      return setIn(state, 'registeredFields', splice(registeredFields, fieldIndex, 1))
    },
    [UNTOUCH](state, { meta: { fields } }) {
      let result = state
      fields.forEach(field => result = deleteIn(result, `fields.${field}.touched`))
      return result
    },
    [UPDATE_SYNC_ERRORS](state, { payload: { syncErrors, error } }) {
      let result = state
      if (error) {
        result = setIn(result, 'error', error)
      } else {
        result = deleteIn(result, 'error')
      }
      if (Object.keys(syncErrors).length) {
        const _syncErrors = getIn(result, 'syncErrors')
        result = setIn(result, 'syncErrors', merge(_syncErrors || {}, syncErrors))
      } else {
        result = setIn(result, 'syncErrors', {})
      }
      return result
    }
  }

  const reducer = (state = empty, action) => {
    const behavior = behaviors[ action.type ]
    return behavior ? behavior(state, action) : state
  }

  const byForm = (reducer) =>
    (state = empty, action = {}) => {
      const form = action && action.meta && action.meta.form
      if (!form) {
        return state
      }
      if (action.type === DESTROY) {
        return deleteInWithCleanUp(state, action.meta.form)
      }
      const formState = getIn(state, form)
      const result = reducer(formState, action)
      return result === formState ? state : setIn(state, form, result)
    }

  /**
   * Adds additional functionality to the reducer
   */
  function decorate(target) {
    target.plugin = function plugin(reducers) { // use 'function' keyword to enable 'this'
      return decorate((state = empty, action = {}) =>
        Object
          .keys(reducers)
          .reduce((accumulator, key) => {
            const previousState = getIn(accumulator, key)
            const nextState = reducers[ key ](previousState, action)
            return nextState === previousState ?
              accumulator :
              setIn(accumulator, key, nextState)
          },
          this(state, action)))
    }

    return target
  }

  return decorate(byForm(reducer))
}

export default createReducer
