import React from 'react';
import ReactDOM from 'react-dom';

import {BrowserRouter, Route, Switch} from 'react-router-dom'

import './index.css';
import App from './App';
import Fun from './fun'
import registerServiceWorker from './registerServiceWorker';

const Routes = (props) => (
	<BrowserRouter>
		<Switch>
			<Route exact path="/" component={App} />
			<Route exact path="/fun" component={Fun} />
		</Switch>
	</BrowserRouter>
)

ReactDOM.render(<Routes />, document.getElementById('root'));
registerServiceWorker();
