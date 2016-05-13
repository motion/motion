/* @flow */

import React from 'react'
import ReactDOM from 'react-dom'
import Main from './main'

if (typeof Main === 'function') {
  ReactDOM.render(React.createElement(Main), document.getElementById('app'))
} else {
  console.error('No default view exported from the main file')
}

if (process.env.NODE_ENV === 'development' && module.hot) {
  module.hot.accept()
}
