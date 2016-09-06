import { Component, PropTypes, createElement } from 'react'
import invariant from 'invariant'
import createConnectedField from './ConnectedField'
import shallowCompare from './util/shallowCompare'


const createField = ({ deepEqual, getIn, setIn }) => {

  class Field extends Component {
    constructor(props, context) {
      super(props, context)
      if (!context._reduxForm) {
        throw new Error('Field must be inside a component decorated with reduxForm()')
      }
      this.ConnectedField = createConnectedField(context._reduxForm, {
        deepEqual,
        getIn
      }, props.name)
      this.normalize = this.normalize.bind(this)
      // console.log(context._reduxForm, 'console at Field')
    }

    shouldComponentUpdate(nextProps, nextState) {
      return shallowCompare(this, nextProps, nextState)
    }

    componentWillMount() {
      this.context._reduxForm.register(this.name, 'Field')
      this.context._reduxForm.registerConditional(this.name, this.conditional)  
    }

    componentWillReceiveProps(nextProps) {
      if (this.props.name !== nextProps.name) {
        // name changed, regenerate connected field
        this.ConnectedField =
          createConnectedField(this.context._reduxForm, { deepEqual, getIn }, nextProps.name)
        // unregister old name
        this.context._reduxForm.unregister(this.props.name)
        // register new name
        this.context._reduxForm.register(nextProps.name, 'Field')
      }
    }

    componentWillUnmount() {
      // unregister conditional
      this.context._reduxForm.registerConditional(this.name)
      this.context._reduxForm.unregister(this.name)
    }

    getRenderedComponent() {
      invariant(this.props.withRef,
        'If you want to access getRenderedComponent(), ' +
        'you must specify a withRef prop to Field')
      return this.refs.connected.getWrappedInstance().getRenderedComponent()
    }

    get conditional() {
      return this.props.conditional
    }

    get name() {
      return this.props.name
    }

    get dirty() {
      return !this.pristine
    }

    get pristine() {
      return this.refs.connected.getWrappedInstance().isPristine()
    }

    get value() {
      return this.refs.connected && this.refs.connected.getWrappedInstance().getValue()
    }

    normalize(name, value) {
      const { normalize } = this.props
      if (!normalize) {
        return value
      }
      const previousValues = this.context._reduxForm.getValues()
      const previousValue = this.value
      const nextValues = setIn(previousValues, name, value)
      return normalize(
        value,
        previousValue,
        nextValues,
        previousValues
      )
    }

    render() {
      const visible = getIn(this.context._reduxForm.conditions, `${this.name}.visible`)
      return visible === undefined || visible ? createElement(this.ConnectedField, {
        ...this.props,
        normalize: this.normalize,
        ref: 'connected'
      }) : null

    }
  }

  Field.propTypes = {
    name: PropTypes.string.isRequired,
    component: PropTypes.oneOfType([ PropTypes.func, PropTypes.string ]).isRequired,
    format: PropTypes.func,
    normalize: PropTypes.func,
    parse: PropTypes.func,
    props: PropTypes.object
  }
  Field.contextTypes = {
    _reduxForm: PropTypes.object
  }

  return Field
}

export default createField
