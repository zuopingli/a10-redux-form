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
import plainExpectations from '../structure/plain/expectations'
import addExpectations from './addExpectations'
// import { formatCondName } from '../util/formatConditionalName'
import { ipv4 } from '../validators'

const describeField = (name, structure, combineReducers, expect) => {
  const reduxForm = createReduxForm(structure)
  const Field = createField(structure)
  const reducer = createReducer(structure)
  const { fromJS } = structure
  const makeStore = (initial) => createStore(
    combineReducers({ form: reducer }), fromJS({ form: initial }))

  describe(name, () => {


    it('Should Support Short and Long Config Style', () => {
      const store = makeStore({
        testForm: {
          values: {
            'virtual-server': {
              wildcard: false,
              ipv4: 'aaaa',
              netmask: '/24',
              ipv6: '::123'
            }
          }          
        }
      })
      const wildcardInput = createSpy(props => <input {...props.input}/>).andCallThrough()
      const ipv4Input = createSpy(props => <input {...props.input}/>).andCallThrough()
      const ipv6Input = createSpy(props => <input {...props.input}/>).andCallThrough()
      const netmaskInput = createSpy(props => <input {...props.input}/>).andCallThrough()
      class Form extends Component {
        render() {
          return (
            <div>
              <Field name="virtual-server.wildcard" component={wildcardInput}  />
              <Field name="virtual-server.ipv4" component={ipv4Input} validation={[ { func: 'required', msg: 'Required' }, { func: ipv4, msg: 'Must IPv4' } ] } />
              <Field name="virtual-server.ipv6" component={ipv6Input} validation={[ 'required', 'ipv6' ] } />
              <Field name="virtual-server.netmask" component={netmaskInput} validation={[ 'required', { func: 'netmask', msg: 'Could be /24 or 255.255.x.x' } ] } />
            </div>
          )
        }
      }
      const TestForm = reduxForm({ 
        form: 'testForm'
        // validate: () => {
        //   console.log('test .................')
        //   return {
        //     'virtual-server': {
        //       ipv4: 'IPv4'
        //     }
        //   }
        // }
      })(Form)
      TestUtils.renderIntoDocument(
        <Provider store={store}>
          <TestForm/>
        </Provider>
      )
      expect(ipv4Input.calls[ 0 ].arguments[ 0 ].meta.error).toBe('Must IPv4')     

      ipv4Input.calls[ 0 ].arguments[ 0 ].input.onChange('4.4.4.4.5')
      expect(ipv4Input.calls[ 1 ].arguments[ 0 ].meta.error).toBe('Must IPv4')  

      ipv4Input.calls[ 1 ].arguments[ 0 ].input.onChange('')
      expect(ipv4Input.calls[ 2 ].arguments[ 0 ].meta.error).toBe('Required')     

      ipv4Input.calls[ 2 ].arguments[ 0 ].input.onChange('1.2.3.4')
      // console.log(ipv4Input.calls[ 3 ].arguments[ 0 ].meta)

      expect(ipv4Input.calls[ 3 ].arguments[ 0 ].meta.error).toNotExist()

  
    })

    // it('Should support none validation case', () => {
    //   const store = makeStore({
    //     testForm: {
    //       values: {
    //         'virtual-server': {
    //           wildcard: false,
    //           ipv4: 'aaaa',
    //           netmask: '/24',
    //           ipv6: '::123'
    //         }
    //       }
    //     }
    //   })
    //   const wildcardInput = createSpy(props => <input {...props.input}/>).andCallThrough()
    //   const ipv4Input = createSpy(props => <input {...props.input}/>).andCallThrough()
    //   const ipv6Input = createSpy(props => <input {...props.input}/>).andCallThrough()
    //   const netmaskInput = createSpy(props => <input {...props.input}/>).andCallThrough()
    //   class Form extends Component {
    //     render() {
    //       return (
    //         <div>
    //           <Field name="virtual-server.wildcard" component={wildcardInput}  />
    //           <Field name="virtual-server.ipv4" component={ipv4Input} />
    //           <Field name="virtual-server.ipv6" component={ipv6Input} />
    //           <Field name="virtual-server.netmask" component={netmaskInput}  />
    //         </div>
    //       )
    //     }
    //   }
    //   const TestForm = reduxForm({ 
    //     form: 'testForm'
    //   })(Form)
    //   TestUtils.renderIntoDocument(
    //     <Provider store={store}>
    //       <TestForm/>
    //     </Provider>
    //   )

    //   ipv4Input.calls[ 0 ].arguments[ 0 ].input.onChange('4.4.4.4')
    //   expect(ipv4Input.calls[ 1 ].arguments[ 0 ].input.value).toBe('4.4.4.4')
    // })
 

  
  })
}

// describeField('Field.plain', plain, plainCombineReducers, addExpectations(plainExpectations))
describeField('Field.immutable', immutable, immutableCombineReducers, addExpectations(immutableExpectations))
