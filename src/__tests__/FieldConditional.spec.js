/* eslint react/no-multi-comp:0 */
import React, { Component } from 'react'
import { createSpy } from 'expect'
import { Provider } from 'react-redux'
import { combineReducers as plainCombineReducers, createStore } from 'redux'
import { combineReducers as immutableCombineReducers } from 'redux-immutablejs'
import TestUtils from 'react-addons-test-utils'
import createReduxForm from '../reduxForm'
import createReducer from '../reducer'
import createField from '../Field'
import plain from '../structure/plain'
import immutable from '../structure/immutable'
import immutableExpectations from '../structure/immutable/expectations'
import addExpectations from './addExpectations'
import { formatCondName } from '../util/formatConditionalName'

const describeField = (name, structure, combineReducers, expect) => {
  const reduxForm = createReduxForm(structure)
  const Field = createField(structure)
  const reducer = createReducer(structure)
  const { fromJS, getIn } = structure
  const makeStore = (initial) => createStore(
    combineReducers({ form: reducer }), fromJS({ form: initial }))

  describe(name, () => {
    // it('should throw an error if not in ReduxForm', () => {
    //   expect(() => {
    //     TestUtils.renderIntoDocument(<div>
    //         <Field name="foo" component={TestInput}/>
    //       </div>
    //     )
    //   }).toThrow(/must be inside a component decorated with reduxForm/)
    // })

    const getConditionsVisible = (state, field) => getIn(state, `form.testForm.conditions.${formatCondName(field)}.visible`)
    const getFieldValue = (state, field) => getIn(state, `form.testForm.values.${formatCondName(field)}`)

    it('Should get right initial conditions ', () => {
      const store = makeStore({
        testForm: {
          values: {
            male: true,
            money: 1000,
            rich: false
          }
        }
      })
      const maleInput = createSpy(props => <input {...props.input}/>).andCallThrough()
      const moneyInput = createSpy(props => <input {...props.input}/>).andCallThrough()
      const richInput = createSpy(props => <input {...props.input}/>).andCallThrough()
      class Form extends Component {
        render() {
          return (
            <div>
              <Field name="male" component={maleInput} type="text"/>
              <Field name="money" component={moneyInput} conditional={{ male: true }}/>
              <Field name="rich" component={richInput} conditional={{ money: 1000 }}/>
            </div>
          )
        }
      }
      const TestForm = reduxForm({ form: 'testForm' })(Form)
      TestUtils.renderIntoDocument(
        <Provider store={store}>
          <TestForm/>
        </Provider>
      )

      expect(maleInput.calls.length).toBe(1)
      expect(maleInput.calls[ 0 ].arguments[ 0 ].input.value).toBe(true)      
      expect(moneyInput.calls.length).toBe(1)
      expect(moneyInput.calls[ 0 ].arguments[ 0 ].input.value).toBe(1000)
      expect(richInput.calls.length).toBe(1)
      expect(richInput.calls[ 0 ].arguments[ 0 ].input.value).toBe(false)

      // console.log(store.getState())
      expect(getConditionsVisible(store.getState(), 'male')).toBe(true)
      expect(getConditionsVisible(store.getState(), 'money')).toBe(true)
      expect(getConditionsVisible(store.getState(), 'rich')).toBe(true)      
    })

    it('should get right condition when changing itself value', () => {
      const store = makeStore({
        testForm: {
          values: {
            male: true,
            money: 1000
          }
        }
      })
      const maleInput = createSpy(props => <input {...props.input}/>).andCallThrough()
      const moneyInput = createSpy(props => <input {...props.input}/>).andCallThrough()
      class Form extends Component {
        render() {
          return (
            <div>
              <Field name="male" component={maleInput} type="text"/>
              <Field name="money" component={moneyInput} conditional={{ male: true }}/>
            </div>
          )
        }
      }
      const TestForm = reduxForm({ form: 'testForm' })(Form)
      TestUtils.renderIntoDocument(
        <Provider store={store}>
          <TestForm/>
        </Provider>
      )

      // change money to see if money hide
      moneyInput.calls[ 0 ].arguments[ 0 ].input.onBlur(10000)
      expect(moneyInput.calls[ 1 ].arguments[ 0 ].input.value).toBe(10000)
      expect(moneyInput.calls.length).toBe(2)
      expect(getConditionsVisible(store.getState(), 'money')).toBe(true)
    })


    it('should set children element and grand children visible right', () => {
      const store = makeStore({
        testForm: {
          values: {
            male: true,
            money: 1000,
            rich: false
          }
        }
      })
      const maleInput = createSpy(props => <input {...props.input}/>).andCallThrough()
      const moneyInput = createSpy(props => <input {...props.input}/>).andCallThrough()
      const richInput = createSpy(props => <input {...props.input}/>).andCallThrough()
      class Form extends Component {
        render() {
          return (
            <div>
              <Field name="male" component={maleInput} type="text"/>
              <Field name="money" component={moneyInput} conditional={{ male: true }}/>
              <Field name="rich" component={richInput} conditional={{ money: 1000 }}/>
            </div>
          )
        }
      }
      const TestForm = reduxForm({ form: 'testForm' })(Form)
      TestUtils.renderIntoDocument(
        <Provider store={store}>
          <TestForm/>
        </Provider>
      )      
      // change male to see if all subs are hidden
      maleInput.calls[ 0 ].arguments[ 0 ].input.onBlur(false)
      expect(maleInput.calls[ 1 ].arguments[ 0 ].input.value).toBe(false)
      // expect(moneyInput.calls.length).toBe(1)
      // expect(richInput.calls.length).toBe(1) 
      expect(getConditionsVisible(store.getState(), 'money')).toBe(false)
      expect(getConditionsVisible(store.getState(), 'rich')).toBe(false)   

      // change male to see if all subs are visible
      // maleInput.calls[ 0 ].arguments[ 0 ].input.onBlur(true)
      // expect(maleInput.calls[ 2 ].arguments[ 0 ].input.value).toBe(true)
      // expect(getConditionsVisible(store.getState(), 'money')).toBe(true)
      // expect(getConditionsVisible(store.getState(), 'rich')).toBe(true)   

    })

    it('should not change grand children visible if grand children value not equal children element vlaue', () => {
      const store = makeStore({
        testForm: {
          values: {
            male: false,
            money: 10000,
            rich: false
          }
        }
      })
      const maleInput = createSpy(props => <input {...props.input}/>).andCallThrough()
      const moneyInput = createSpy(props => <input {...props.input}/>).andCallThrough()
      const richInput = createSpy(props => <input {...props.input}/>).andCallThrough()
      class Form extends Component {
        render() {
          return (
            <div>
              <Field name="male" component={maleInput} type="text"/>
              <Field name="money" component={moneyInput} conditional={{ male: true }}/>
              <Field name="rich" component={richInput} conditional={{ money: 1000 }}/>
            </div>
          )
        }
      }
      const TestForm = reduxForm({ form: 'testForm' })(Form)
      TestUtils.renderIntoDocument(
        <Provider store={store}>
          <TestForm/>
        </Provider>
      )      
      // if switch visible on, some kids visible on
      maleInput.calls[ 0 ].arguments[ 0 ].input.onBlur(true)
      expect(getConditionsVisible(store.getState(), 'money')).toBe(true)
      expect(getConditionsVisible(store.getState(), 'rich')).toBe(false)

      // if switch visible off, all kids visible are off
      maleInput.calls[ 0 ].arguments[ 0 ].input.onBlur(false)
      expect(getConditionsVisible(store.getState(), 'money')).toBe(false)
      expect(getConditionsVisible(store.getState(), 'rich')).toBe(false)

      // if switch visible back to on, some kids on
      maleInput.calls[ 0 ].arguments[ 0 ].input.onBlur(true)
      moneyInput.calls[ 0 ].arguments[ 0 ].input.onBlur(1000)
      expect(getConditionsVisible(store.getState(), 'money')).toBe(true)
      expect(getConditionsVisible(store.getState(), 'rich')).toBe(true)

    })

    it('should not show the hidden field\'s value', () => {
      const store = makeStore({
        testForm: {
          values: {
            male: false,
            money: 1000,
            rich: false
          }
        }
      })
      const maleInput = createSpy(props => <input {...props.input}/>).andCallThrough()
      const moneyInput = createSpy(props => <input {...props.input}/>).andCallThrough()
      const richInput = createSpy(props => <input {...props.input}/>).andCallThrough()
      class Form extends Component {
        render() {
          return (
            <div>
              <Field name="male" component={maleInput} type="text"/>
              <Field name="money" component={moneyInput} conditional={{ male: true }}/>
              <Field name="rich" component={richInput} conditional={{ money: 1000 }}/>
            </div>
          )
        }
      }
      const Decorated = reduxForm({ form: 'testForm' })(Form)
      TestUtils.renderIntoDocument(
        <Provider store={store}>
          <Decorated/>
        </Provider>
      )      
      // console.log('check show value.....................................................')

      // if switch visible on, some kids visible on
      expect(getConditionsVisible(store.getState(), 'male')).toBe(true)
      expect(getConditionsVisible(store.getState(), 'money')).toBe(false)
      expect(getConditionsVisible(store.getState(), 'rich')).toBe(false)

      // then check values, if all right, means initial values are right
      expect(getFieldValue(store.getState(), 'male')).toBe(false)
      expect(getFieldValue(store.getState(), 'money')).toBe(undefined)
      expect(getFieldValue(store.getState(), 'rich')).toBe(undefined)


      // then change main value to see if sub values changed
      // if sub not changed, please fix [CHANGE] action
      maleInput.calls[ 0 ].arguments[ 0 ].input.onBlur(true)
      expect(getFieldValue(store.getState(), 'male')).toBe(true)
      expect(getFieldValue(store.getState(), 'money')).toBe(1000)
      expect(getFieldValue(store.getState(), 'rich')).toBe(false)

      // change it back to initial
      maleInput.calls[ 0 ].arguments[ 0 ].input.onBlur(false)      
      expect(getFieldValue(store.getState(), 'male')).toBe(false)
      expect(getFieldValue(store.getState(), 'money')).toBe(undefined)
      expect(getFieldValue(store.getState(), 'rich')).toBe(undefined)
    })

    it('should show right visible by expression', () => {
      const store = makeStore({
        testForm: {
          values: {
            money: 1000          
          }
        }
      })
      const moneyInput = createSpy(props => <input {...props.input}/>).andCallThrough()
      const richInput = createSpy(props => <input {...props.input}/>).andCallThrough()
      class Form extends Component {
        render() {
          return (
            <div>
              <Field name="money" component={moneyInput} />
              <Field name="rich" component={richInput} conditional={{ money: value => value > 1000 }}/>
            </div>
          )
        }
      }
      const Decorated = reduxForm({ form: 'testForm' })(Form)
      TestUtils.renderIntoDocument(
        <Provider store={store}>
          <Decorated/>
        </Provider>
      )      
      // console.log('check expression.....................................................')

      // if switch visible on, some kids visible on
      expect(getConditionsVisible(store.getState(), 'rich')).toBe(false)
    })

    it('should support dot splitted name', () => {
      const store = makeStore({
        testForm: {
          values: {
            global: {
              'china': { 
                'male': true,
                'money': 1000,
                'rich': false
              }
            }
          }
        }
      })
      const maleInput = createSpy(props => <input {...props.input}/>).andCallThrough()
      const moneyInput = createSpy(props => <input {...props.input}/>).andCallThrough()
      const richInput = createSpy(props => <input {...props.input}/>).andCallThrough()
      class Form extends Component {
        render() {
          return (
            <div>
              <Field name="global.china.male" component={maleInput} type="text"/>
              <Field name="global.china.money" component={moneyInput} conditional={{ 'global.china.male': true }}/>
              <Field name="global.china.rich" component={richInput} conditional={{ 'global.china.money': 1000 }}/>
            </div>
          )
        }
      }
      const TestForm = reduxForm({ form: 'testForm' })(Form)
      TestUtils.renderIntoDocument(
        <Provider store={store}>
          <TestForm/>
        </Provider>
      )      

      // console.log('check dot.....................................................')
      // if switch visible on, some kids visible on
      expect(getConditionsVisible(store.getState(), 'global.china.male')).toBe(true)
      expect(getConditionsVisible(store.getState(), 'global.china.money')).toBe(true)
      expect(getConditionsVisible(store.getState(), 'global.china.rich')).toBe(true)

      // if switch visible off, all kids visible are off
      maleInput.calls[ 0 ].arguments[ 0 ].input.onBlur(false)
      expect(getConditionsVisible(store.getState(), 'global.china.money')).toBe(false)
      expect(getConditionsVisible(store.getState(), 'global.china.rich')).toBe(false)

      // if switch visible back to on, some kids on
      maleInput.calls[ 0 ].arguments[ 0 ].input.onBlur(true)
      moneyInput.calls[ 0 ].arguments[ 0 ].input.onBlur(1000)
      expect(getConditionsVisible(store.getState(), 'global.china.money')).toBe(true)
      expect(getConditionsVisible(store.getState(), 'global.china.rich')).toBe(true)

    })

  
  })
}

// describeField('Field.plain', plain, plainCombineReducers, addExpectations(plainExpectations))
describeField('Field.immutable', immutable, immutableCombineReducers, addExpectations(immutableExpectations))
