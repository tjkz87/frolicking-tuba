//import { combineReducers } from 'redux';
import assign from 'object.assign';
//import loggedin from './loggedin';
import { auth } from '../utils/auth';
import { CHANGE_FORM, SET_AUTH } from '../utils/AppConstants';
//const assign = Object.assign || require('object.assign');

// The initial application state
const initialState = {
  formState: {
    username: '',
    password: ''
    // company: ''
  },
  loggedIn: auth.loggedIn(),
  keys: [],
  repos: []
};


// Takes care of changing the application state
export const homeReducer = (state = initialState, action) => {
  switch (action.type) {
  case CHANGE_FORM:
    return assign({}, state, { formState: action.newState });
    // break;
  case SET_AUTH:
    return assign({}, state, { loggedIn: action.newState });
    // break;
  default:
    return state;
  }
};

//export default homeReducer;

// const myApp = combineReducers({ loggedin });
// export default myApp;
