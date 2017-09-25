import React from 'react';
import ReactDOM from 'react-dom';

import {BrowserRouter, Route, Switch} from 'react-router-dom'

import './index.css';
import App from './App';
import registerServiceWorker from './registerServiceWorker';

const Routes = (props) => (
	<BrowserRouter>
		<Switch>
			<Route exact path="/" component={App} />
		</Switch>
	</BrowserRouter>
)

ReactDOM.render(<Routes />, document.getElementById('root'));
registerServiceWorker();
